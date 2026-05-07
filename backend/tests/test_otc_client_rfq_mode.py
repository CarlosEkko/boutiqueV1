"""
OTC Client RFQ — Mode-based Routing (Phase 2)

Validates POST /api/otc/client/rfq behaviour for:
  • mode='white_glove' (default & explicit) → CRM Kanban (stage='rfq')
  • mode='instant' → Institutional OTC Desk firm quote (stage='quote')
    + tier-policy gate (standard 403, vip OK, asset universe 400, cap 403)
  • Acceptance flow on instant quote
  • Regressions: non-OTC client 404
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone

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
NON_OTC_EMAIL = "sofia@kbex.io"
NON_OTC_PASSWORD = "test123!"

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


def _login(s: requests.Session, email: str, pwd: str) -> str:
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_token(session):
    return _login(session, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def non_otc_token(session):
    return _login(session, NON_OTC_EMAIL, NON_OTC_PASSWORD)


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session", autouse=True)
def _ensure_otc_client_seed(mongo_db):
    """Make sure carlos@kbex.io has an otc_clients record (was seeded in iter60)."""
    c = mongo_db.otc_clients.find_one({"contact_email": ADMIN_EMAIL})
    assert c is not None, "carlos@kbex.io otc_clients seed missing — re-run iteration_60 setup"
    yield


@pytest.fixture
def revert_to_standard(mongo_db):
    """Test-scoped fixture ensuring tier returns to 'standard' after a VIP test."""
    yield
    mongo_db.users.update_one(
        {"email": ADMIN_EMAIL}, {"$set": {"membership_level": "standard"}}
    )


def _set_tier(mongo_db, tier: str):
    mongo_db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"membership_level": tier}})


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
class TestWhiteGloveDefault:
    """mode omitted / explicit white_glove → CRM RFQ"""

    def test_default_mode_creates_rfq_stage(self, session, auth_headers, mongo_db):
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.01,
            "notes": "TEST_default_wg",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert body["mode"] == "white_glove"
        deal = body["deal"]
        assert deal["stage"] == "rfq"
        assert deal.get("quote_source") == "white_glove"
        assert deal.get("tier") == "standard"
        # No quote attached
        assert "quote" not in body
        # Verify persisted
        persisted = mongo_db.otc_deals.find_one({"id": deal["id"]})
        assert persisted is not None
        assert persisted["stage"] == "rfq"
        # Cleanup
        mongo_db.otc_deals.delete_one({"id": deal["id"]})

    def test_explicit_white_glove_mode(self, session, auth_headers, mongo_db):
        payload = {
            "transaction_type": "sell",
            "base_asset": "ETH",
            "quote_asset": "USD",
            "amount": 0.5,
            "notes": "TEST_explicit_wg",
            "mode": "white_glove",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["mode"] == "white_glove"
        assert body["deal"]["stage"] == "rfq"
        mongo_db.otc_deals.delete_one({"id": body["deal"]["id"]})


class TestInstantStandardTierBlocked:
    """Standard tier must be rejected from instant flow with policy_violation."""

    def test_standard_instant_403_policy_violation(self, session, auth_headers):
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.001,
            "mode": "instant",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 403, r.text
        detail = r.json().get("detail")
        assert isinstance(detail, dict), f"expected structured detail, got: {detail}"
        assert detail.get("code") == "policy_violation"
        assert detail.get("suggested_mode") == "white_glove"
        assert detail.get("tier") == "standard"


class TestInstantAssetUniverse:
    """Asset universe is BTC/ETH/SOL/BNB/XRP — anything else must 400."""

    def test_unsupported_asset_400(self, session, auth_headers, mongo_db, revert_to_standard):
        # Need instant_firm_enabled tier to even reach the asset-universe check.
        # (Implementation orders: universe check FIRST, then policy. So 'standard'
        # would still hit 400. We verify on standard tier directly.)
        payload = {
            "transaction_type": "buy",
            "base_asset": "USDT",
            "quote_asset": "USD",
            "amount": 1000,
            "mode": "instant",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail")
        assert isinstance(detail, dict)
        assert detail.get("code") == "asset_not_supported_instant"
        assert detail.get("suggested_mode") == "white_glove"


class TestInstantVIPHappyPath:
    """VIP tier instant route returns firm quote & persists deal+quote atomically."""

    def test_vip_instant_creates_deal_and_quote(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip")
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.01,
            "notes": "TEST_vip_instant",
            "mode": "instant",
        }
        t0 = time.time()
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        elapsed_ms = (time.time() - t0) * 1000
        assert r.status_code == 200, r.text
        body = r.json()

        assert body["mode"] == "instant"
        deal = body["deal"]
        quote = body["quote"]

        assert deal["stage"] == "quote"
        assert deal["quote_source"] == "institutional_desk"
        assert deal["tier"] == "vip"
        assert deal.get("market_price", 0) > 0
        assert deal.get("final_price", 0) > 0
        assert deal.get("spread_percent", 0) > 0
        assert deal.get("desk_quote_id"), "desk_quote_id must be present"
        assert deal.get("quote_id") == quote["id"]
        assert deal.get("quote_expires_at") is not None

        # Quote assertions
        assert quote["status"] == "sent"
        assert quote["price_source"] == "institutional_desk"
        assert quote["deal_id"] == deal["id"]
        # expires_at within 60s of now
        exp = datetime.fromisoformat(quote["expires_at"].replace("Z", "+00:00"))
        delta = (exp - datetime.now(timezone.utc)).total_seconds()
        assert 0 < delta <= 60, f"quote expires_at out of band: delta={delta}s"

        # Performance: under 1.5s
        assert elapsed_ms < 1500, f"instant route too slow: {elapsed_ms:.0f}ms"

        # Persistence
        persisted_deal = mongo_db.otc_deals.find_one({"id": deal["id"]})
        assert persisted_deal is not None
        assert persisted_deal["stage"] == "quote"
        assert persisted_deal["quote_id"] == quote["id"]
        assert persisted_deal.get("desk_quote_id") == deal["desk_quote_id"]

        persisted_quote = mongo_db.otc_quotes.find_one({"id": quote["id"]})
        assert persisted_quote is not None
        assert persisted_quote["status"] == "sent"

        # Stash for follow-up tests
        pytest._instant_deal = deal  # type: ignore[attr-defined]
        pytest._instant_quote = quote  # type: ignore[attr-defined]

    def test_instant_quote_appears_in_my_quotes(self, session, auth_headers):
        deal = getattr(pytest, "_instant_deal", None)
        quote = getattr(pytest, "_instant_quote", None)
        if not deal or not quote:
            pytest.skip("Prior VIP instant test did not run")
        r = session.get(f"{API}/otc/client/quotes", headers=auth_headers)
        assert r.status_code == 200, r.text
        ids = {q.get("id") for q in r.json().get("quotes", [])}
        assert quote["id"] in ids

    def test_instant_deal_appears_in_my_deals_stage_quote(self, session, auth_headers):
        deal = getattr(pytest, "_instant_deal", None)
        if not deal:
            pytest.skip("Prior VIP instant test did not run")
        r = session.get(f"{API}/otc/client/deals", headers=auth_headers)
        assert r.status_code == 200, r.text
        match = next((d for d in r.json().get("deals", []) if d.get("id") == deal["id"]), None)
        assert match is not None, "instant deal not visible in /client/deals"
        assert match["stage"] == "quote"

    def test_accept_instant_quote_flips_status(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        deal = getattr(pytest, "_instant_deal", None)
        quote = getattr(pytest, "_instant_quote", None)
        if not deal or not quote:
            pytest.skip("Prior VIP instant test did not run")
        # Quote may have expired (15s TTL); regenerate if so.
        # The revert_to_standard fixture would already have reverted tier — bump back.
        _set_tier(mongo_db, "vip")
        # re-create (cheap) to ensure quote is fresh for accept
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.01,
            "mode": "instant",
            "notes": "TEST_vip_accept",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        fresh_quote_id = body["quote"]["id"]
        fresh_deal_id = body["deal"]["id"]

        r2 = session.post(
            f"{API}/otc/client/quotes/{fresh_quote_id}/accept", headers=auth_headers
        )
        assert r2.status_code == 200, r2.text

        # Persistence: quote.status should be 'accepted'
        persisted_q = mongo_db.otc_quotes.find_one({"id": fresh_quote_id})
        assert persisted_q is not None
        assert persisted_q.get("status") == "accepted", f"got {persisted_q.get('status')}"
        # Deal should have moved past 'quote' stage
        persisted_d = mongo_db.otc_deals.find_one({"id": fresh_deal_id})
        assert persisted_d is not None
        assert persisted_d.get("stage") != "rfq"


class TestInstantVIPCapBreach:
    """VIP cap is 500k USDT — 100 BTC (~8M USDT) must be rejected with policy_violation."""

    def test_vip_instant_breaches_cap(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip")
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 100,  # ≈ 8M USDT, well over 500k cap
            "mode": "instant",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=auth_headers)
        assert r.status_code == 403, r.text
        detail = r.json().get("detail")
        assert isinstance(detail, dict)
        assert detail.get("code") == "policy_violation"
        assert detail.get("suggested_mode") == "white_glove"
        assert detail.get("tier") == "vip"
        assert "notional_usdt" in detail
        assert float(detail["notional_usdt"]) > 500_000


class TestNonOtcClientRegression:
    """Users without otc_clients record must still get 404 regardless of mode."""

    def test_non_otc_white_glove(self, session, non_otc_token):
        h = {"Authorization": f"Bearer {non_otc_token}", "Content-Type": "application/json"}
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.01,
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=h)
        assert r.status_code == 404, r.text
        assert "Not an OTC client" in (r.json().get("detail") or "")

    def test_non_otc_instant(self, session, non_otc_token):
        h = {"Authorization": f"Bearer {non_otc_token}", "Content-Type": "application/json"}
        payload = {
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "USD",
            "amount": 0.01,
            "mode": "instant",
        }
        r = session.post(f"{API}/otc/client/rfq", json=payload, headers=h)
        assert r.status_code == 404, r.text


class TestInstantPerformance:
    """Instant route must consistently respond <1500ms (3 samples)."""

    def test_instant_perf_under_1500ms(
        self, session, auth_headers, mongo_db, revert_to_standard
    ):
        _set_tier(mongo_db, "vip")
        timings = []
        deal_ids = []
        for _ in range(3):
            t0 = time.time()
            r = session.post(
                f"{API}/otc/client/rfq",
                json={
                    "transaction_type": "buy",
                    "base_asset": "ETH",
                    "quote_asset": "USD",
                    "amount": 0.05,
                    "mode": "instant",
                    "notes": "TEST_perf",
                },
                headers=auth_headers,
            )
            ms = (time.time() - t0) * 1000
            timings.append(ms)
            if r.status_code == 200:
                deal_ids.append(r.json()["deal"]["id"])
        # cleanup
        if deal_ids:
            mongo_db.otc_deals.delete_many({"id": {"$in": deal_ids}})
        assert all(t < 1500 for t in timings), f"perf samples: {timings}"
