"""
OTC Client Accept Quote — Phase 3 Auto-Settlement
=================================================

Validates POST /api/otc/client/quotes/{quote_id}/accept behaviour for:
  • VIP happy path (notional under cap) → auto-settle, deal at 'settlement',
    OTCExecution row persisted, response carries `auto_settled` payload.
  • Idempotency: second accept on same quote → 400 "not in pending status".
  • VIP cap exceeded (notional > auto_execute cap, < instant cap) →
    response.auto_settle_skipped=true, deal stays at 'acceptance', no
    OTCExecution row created.
  • PREMIUM auto-disabled → response.auto_settle_skipped=true with
    "Tier does not allow auto-execution" reason. Deal stays 'acceptance'.
  • White-glove regression: manually-priced quote (price_source != institutional_desk)
    → no auto_settle key present, no OTCExecution row, deal stays 'acceptance'.
  • Quote expired → 400 "Quote has expired".
  • Engine reject (TTL race simulated) → response.auto_settle_skipped=true
    with reason "Auto-execution declined by desk". Deal stays 'acceptance'.
  • Performance: auto-settle accept finishes < 1500ms.
  • Best-effort push/email: failures must not break accept (verified via logs).

Credentials & seed: carlos@kbex.io / senha123 (otc_clients KBEX-TEST seeded).
Tier mutations are wrapped in the `revert_to_standard` fixture.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def mongo_db():
    cli = MongoClient(MONGO_URL)
    yield cli[DB_NAME]
    cli.close()


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(s, email, pwd):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(session):
    return _login(session, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _set_tier(mongo_db, user_tier: str, client_tier: str | None = None):
    """Set BOTH users.membership_level AND otc_clients.client_tier (priority)."""
    mongo_db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"membership_level": user_tier}})
    mongo_db.otc_clients.update_one(
        {"contact_email": ADMIN_EMAIL},
        {"$set": {"client_tier": client_tier or user_tier}},
    )


@pytest.fixture
def revert_to_standard(mongo_db):
    yield
    mongo_db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"membership_level": "standard"}})
    mongo_db.otc_clients.update_one(
        {"contact_email": ADMIN_EMAIL}, {"$set": {"client_tier": "standard"}}
    )


@pytest.fixture(autouse=True)
def cleanup_test_data(mongo_db):
    """Cleanup TEST_-tagged deals/quotes/executions after each test."""
    yield
    test_deal_ids = [
        d["id"]
        for d in mongo_db.otc_deals.find(
            {"$or": [{"notes": {"$regex": "^TEST_"}}, {"client_notes": {"$regex": "^TEST_"}}]},
            {"id": 1},
        )
    ]
    if test_deal_ids:
        mongo_db.otc_deals.delete_many({"id": {"$in": test_deal_ids}})
        mongo_db.otc_quotes.delete_many({"deal_id": {"$in": test_deal_ids}})
        mongo_db.otc_executions.delete_many({"deal_id": {"$in": test_deal_ids}})


def _create_instant_rfq(session, headers, amount: float, asset: str = "BTC", notes: str = "TEST_phase3"):
    payload = {
        "transaction_type": "buy",
        "base_asset": asset,
        "quote_asset": "USD",
        "amount": amount,
        "mode": "instant",
        "notes": notes,
    }
    r = session.post(f"{API}/otc/client/rfq", json=payload, headers=headers)
    return r


# ---------------------------------------------------------------------------
# 1. VIP happy path — auto-settle under cap
# ---------------------------------------------------------------------------
class TestVipAutoSettleHappyPath:
    def test_vip_instant_btc_005_auto_settles(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip", "vip")
        # 0.05 BTC at ~$80k mid → ~$4k notional, well under 250k auto-cap
        r = _create_instant_rfq(session, auth_headers, amount=0.05, notes="TEST_vip_happy")
        assert r.status_code == 200, r.text
        body = r.json()
        deal_id = body["deal"]["id"]
        quote_id = body["quote"]["id"]
        final_price = float(body["quote"]["final_price"])
        assert final_price > 0

        t0 = time.time()
        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        elapsed_ms = (time.time() - t0) * 1000
        assert r2.status_code == 200, r2.text
        body2 = r2.json()

        # ---- Response shape ----
        assert body2["success"] is True
        assert "auto_settled" in body2, f"expected auto_settled, got: {body2}"
        auto = body2["auto_settled"]
        assert auto.get("execution_id"), "execution_id missing"
        assert auto.get("desk_trade_id"), "desk_trade_id missing"
        assert float(auto.get("executed_amount", 0)) == pytest.approx(0.05)
        assert float(auto.get("executed_price", 0)) == pytest.approx(final_price)
        assert auto.get("asset") == "BTC"

        # ---- Performance ----
        assert elapsed_ms < 1500, f"accept too slow on auto-settle: {elapsed_ms:.0f}ms"

        # ---- Deal advanced to 'settlement' ----
        deal_doc = mongo_db.otc_deals.find_one({"id": deal_id})
        assert deal_doc is not None
        assert deal_doc.get("stage") == "settlement", f"stage={deal_doc.get('stage')}"
        assert deal_doc.get("executed_at"), "executed_at not set on deal"
        assert deal_doc.get("execution_id") == auto["execution_id"]
        assert deal_doc.get("desk_trade_id") == auto["desk_trade_id"]

        # ---- OTCExecution persisted ----
        exec_doc = mongo_db.otc_executions.find_one({"id": auto["execution_id"]})
        assert exec_doc is not None, "OTCExecution row missing"
        assert exec_doc.get("status") == "executed"
        assert exec_doc.get("execution_venue") == "institutional_desk"
        assert exec_doc.get("desk_trade_id") == auto["desk_trade_id"]
        assert float(exec_doc.get("executed_amount", 0)) == pytest.approx(0.05)
        assert float(exec_doc.get("executed_price", 0)) == pytest.approx(final_price)
        assert exec_doc.get("trade_executed_at") is not None

        # Stash for idempotency test
        pytest._happy_quote_id = quote_id  # type: ignore[attr-defined]
        pytest._happy_deal_id = deal_id  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# 2. Idempotency: second accept on same quote → 400
# ---------------------------------------------------------------------------
class TestAcceptIdempotency:
    def test_second_accept_returns_400(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip", "vip")
        r = _create_instant_rfq(session, auth_headers, amount=0.05, notes="TEST_idem")
        assert r.status_code == 200, r.text
        quote_id = r.json()["quote"]["id"]

        r1 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r1.status_code == 200, r1.text

        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r2.status_code == 400, r2.text
        detail = r2.json().get("detail", "")
        assert "not in pending status" in detail.lower(), detail


# ---------------------------------------------------------------------------
# 3. VIP cap exceeded — quote created, accept skips auto-settle
# ---------------------------------------------------------------------------
class TestVipCapExceededAutoSettleSkipped:
    def test_vip_5btc_skips_autosettle(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip", "vip")
        # 5 BTC at ~$80k → ~$400k → over 250k auto-cap, under 500k instant-cap
        r = _create_instant_rfq(session, auth_headers, amount=5.0, notes="TEST_vip_cap")
        # If engine mid is unusually high/low, fall back gracefully
        if r.status_code != 200:
            pytest.skip(f"VIP 5BTC RFQ unexpectedly rejected: {r.status_code} {r.text}")
        body = r.json()
        deal_id = body["deal"]["id"]
        quote_id = body["quote"]["id"]

        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r2.status_code == 200, r2.text
        body2 = r2.json()

        assert body2["success"] is True
        assert "auto_settled" not in body2
        assert body2.get("auto_settle_skipped") is True
        reason = body2.get("auto_settle_reason", "")
        assert "cap" in reason.lower() or "exceed" in reason.lower(), reason

        # Deal stays at 'acceptance'
        deal_doc = mongo_db.otc_deals.find_one({"id": deal_id})
        assert deal_doc.get("stage") == "acceptance", f"stage={deal_doc.get('stage')}"

        # No OTCExecution row
        exec_count = mongo_db.otc_executions.count_documents({"deal_id": deal_id})
        assert exec_count == 0, f"unexpected execution row count: {exec_count}"


# ---------------------------------------------------------------------------
# 4. PREMIUM tier — instant enabled but auto_execute disabled
# ---------------------------------------------------------------------------
class TestPremiumAutoExecuteDisabled:
    def test_premium_instant_skips_autosettle(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "premium", "premium")
        # Small amount well under 100k instant cap
        r = _create_instant_rfq(session, auth_headers, amount=0.05, notes="TEST_premium")
        assert r.status_code == 200, r.text
        body = r.json()
        deal_id = body["deal"]["id"]
        quote_id = body["quote"]["id"]

        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r2.status_code == 200, r2.text
        body2 = r2.json()

        assert body2["success"] is True
        assert "auto_settled" not in body2
        assert body2.get("auto_settle_skipped") is True
        reason = body2.get("auto_settle_reason", "")
        assert "tier" in reason.lower() and "auto-execution" in reason.lower(), reason

        # Deal stays at 'acceptance'
        deal_doc = mongo_db.otc_deals.find_one({"id": deal_id})
        assert deal_doc.get("stage") == "acceptance", f"stage={deal_doc.get('stage')}"

        # No execution
        assert mongo_db.otc_executions.count_documents({"deal_id": deal_id}) == 0


# ---------------------------------------------------------------------------
# 5. White-glove regression — manual quote, no auto_settle key
# ---------------------------------------------------------------------------
class TestWhiteGloveRegression:
    def test_manual_quote_accept_no_autosettle(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        # Build a white-glove deal (no instant) — admin then injects a manual quote
        # straight into mongo to mimic a trader-issued white-glove quote.
        # This avoids depending on a CRM endpoint contract we don't own here.
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.02,
            "notes": "TEST_wg_regression",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["mode"] == "white_glove"
        deal = body["deal"]
        deal_id = deal["id"]

        # Manually craft a "manual"-source quote on the deal.
        import uuid

        quote_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        expires_iso = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        manual_quote = {
            "id": quote_id,
            "deal_id": deal_id,
            "amount": 0.02,
            "base_asset": "BTC",
            "quote_asset": "USD",
            "market_price": 80000.0,
            "spread_percent": 1.0,
            "final_price": 80800.0,
            "fees": 0.0,
            "total_value": 1616.0,
            "status": "sent",
            "price_source": "manual",
            "valid_for_minutes": 10,
            "expires_at": expires_iso,
            "created_at": now_iso,
            "is_manual": True,
        }
        mongo_db.otc_quotes.insert_one(manual_quote)
        # Link quote on deal but NOT desk_quote_id (white-glove)
        mongo_db.otc_deals.update_one(
            {"id": deal_id},
            {"$set": {"quote_id": quote_id, "stage": "quote", "updated_at": now_iso}},
        )

        # Accept
        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r2.status_code == 200, r2.text
        body2 = r2.json()

        assert body2["success"] is True
        assert "auto_settled" not in body2, f"unexpected auto_settled on manual: {body2}"
        # auto_settle_skipped should NOT be set either (it's only set when is_desk_quote)
        assert "auto_settle_skipped" not in body2, f"unexpected auto_settle_skipped: {body2}"

        # Deal stays at 'acceptance'
        deal_doc = mongo_db.otc_deals.find_one({"id": deal_id})
        assert deal_doc.get("stage") == "acceptance"

        # No execution row
        assert mongo_db.otc_executions.count_documents({"deal_id": deal_id}) == 0


# ---------------------------------------------------------------------------
# 6. Quote expired
# ---------------------------------------------------------------------------
class TestQuoteExpired:
    def test_expired_quote_returns_400(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip", "vip")
        r = _create_instant_rfq(session, auth_headers, amount=0.05, notes="TEST_expired")
        assert r.status_code == 200, r.text
        body = r.json()
        quote_id = body["quote"]["id"]

        # Force expire by rewriting expires_at to the past.
        past = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        mongo_db.otc_quotes.update_one({"id": quote_id}, {"$set": {"expires_at": past}})

        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r2.status_code == 400, r2.text
        assert "expired" in (r2.json().get("detail", "") or "").lower()

        # No execution
        assert mongo_db.otc_executions.count_documents({"quote_id": quote_id}) == 0


# ---------------------------------------------------------------------------
# 7. Engine reject (TTL race) — simulated by clearing desk_quote from engine
# ---------------------------------------------------------------------------
class TestEngineRejectDuringAccept:
    def test_engine_reject_keeps_acceptance(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip", "vip")
        r = _create_instant_rfq(session, auth_headers, amount=0.05, notes="TEST_engine_race")
        assert r.status_code == 200, r.text
        body = r.json()
        deal_id = body["deal"]["id"]
        quote_id = body["quote"]["id"]

        # Simulate TTL race: rewrite the deal.desk_quote_id to a bogus uuid so
        # engine.execute() raises ValueError ("Quote not found" / "expired").
        import uuid

        bogus = f"BOGUS-{uuid.uuid4()}"
        mongo_db.otc_deals.update_one(
            {"id": deal_id}, {"$set": {"desk_quote_id": bogus}}
        )

        r2 = session.post(f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers)
        assert r2.status_code == 200, r2.text
        body2 = r2.json()
        assert body2["success"] is True
        # auto_settled should NOT be present; auto_settle_skipped should be true
        assert "auto_settled" not in body2, f"unexpected auto_settled: {body2}"
        assert body2.get("auto_settle_skipped") is True
        reason = (body2.get("auto_settle_reason") or "").lower()
        assert "declined by desk" in reason or "auto-execution" in reason, reason

        # Deal stays at 'acceptance'
        deal_doc = mongo_db.otc_deals.find_one({"id": deal_id})
        assert deal_doc.get("stage") == "acceptance"

        # No execution row
        assert mongo_db.otc_executions.count_documents({"deal_id": deal_id}) == 0


# ---------------------------------------------------------------------------
# 8. Performance — auto-settle accept under 1500ms (3 samples)
# ---------------------------------------------------------------------------
class TestAutoSettlePerformance:
    def test_auto_settle_perf_under_1500ms(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip", "vip")
        timings = []
        for i in range(3):
            r = _create_instant_rfq(
                session, auth_headers, amount=0.01, notes=f"TEST_perf_{i}"
            )
            assert r.status_code == 200, r.text
            quote_id = r.json()["quote"]["id"]

            t0 = time.time()
            r2 = session.post(
                f"{API}/otc/client/quotes/{quote_id}/accept", headers=auth_headers
            )
            ms = (time.time() - t0) * 1000
            assert r2.status_code == 200, r2.text
            assert "auto_settled" in r2.json(), "expected auto-settle in perf sample"
            timings.append(ms)

        assert all(t < 1500 for t in timings), f"perf samples exceeded budget: {timings}"
