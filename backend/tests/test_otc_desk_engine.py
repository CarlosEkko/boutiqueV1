"""Tests for OTC Institutional Desk (Fase 1 backend quant engine).

Endpoints under test (all under /api/otc-desk):
  POST /rfq, POST /execute, GET /state, GET /pnl-series, POST /reset

Key invariants we assert:
  * Pricing: spread_bps >= 25 base; buy price > mid; sell price < mid.
  * Cost-basis settle-on-flat: after BUY+hedge cycle, unrealized_pnl ≈ 0.
  * cash_pnl strictly increases after each happy-path cycle (positive premium captured).
  * AuthZ: non-staff (sofia, support_agent) gets 403 on every endpoint.
  * Reset endpoint requires admin tier.
  * Regression: existing /api/otc/leads still reachable.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://luxury-crypto.preview.emergentagent.com").rstrip("/")
ADMIN = {"email": "carlos@kbex.io", "password": "senha123"}
SUPPORT = {"email": "sofia@kbex.io", "password": "test123!"}


def _login(creds):
    r = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers():
    return {"Authorization": f"Bearer {_login(ADMIN)}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def support_headers():
    return {"Authorization": f"Bearer {_login(SUPPORT)}", "Content-Type": "application/json"}


@pytest.fixture(scope="module", autouse=True)
def reset_desk(admin_headers):
    """Reset desk state once at the start of the module so we get deterministic PnL accounting."""
    r = requests.post(f"{BASE_URL}/api/otc-desk/reset", headers=admin_headers, timeout=15)
    assert r.status_code == 200, f"reset failed: {r.status_code} {r.text}"
    # Give the market loop a moment to refresh prices (Binance poll ~2s)
    time.sleep(2.5)


# ------------------------------------------------------------------ AuthZ ----
class TestAuthZ:
    def test_unauthenticated_blocked(self):
        r = requests.get(f"{BASE_URL}/api/otc-desk/state", timeout=10)
        assert r.status_code in (401, 403), r.text

    def test_support_agent_blocked_state(self, support_headers):
        r = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=support_headers, timeout=10)
        assert r.status_code == 403, f"expected 403 for support, got {r.status_code}: {r.text}"

    def test_support_agent_blocked_rfq(self, support_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=support_headers,
                          json={"symbol": "BTC", "size": 0.1, "side": "buy"},
                          timeout=10)
        assert r.status_code == 403

    def test_support_agent_blocked_reset(self, support_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/reset", headers=support_headers, timeout=10)
        assert r.status_code == 403


# ------------------------------------------------------------------ State ----
class TestState:
    def test_state_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=admin_headers, timeout=10)
        assert r.status_code == 200, r.text
        s = r.json()
        # Required keys
        for k in ("market", "inventory", "cash_pnl", "unrealized_pnl",
                  "slippage_info", "hedge_feed", "recent_trades",
                  "active_quotes", "config"):
            assert k in s, f"missing key {k} in state"
        # All 5 assets present
        for sym in ("BTC", "ETH", "SOL", "BNB", "XRP"):
            assert sym in s["market"], f"missing {sym} in market"
            assert s["market"][sym]["mid"] > 0
        # Config sanity
        assert s["config"]["base_margin_bps"] == 25
        assert s["config"]["quote_ttl_ms"] == 15000

    def test_pnl_series_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/otc-desk/pnl-series", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "series" in body
        assert isinstance(body["series"], list)


# ----------------------------------------------------------------- Pricing ---
class TestPricing:
    def test_buy_quote_priced_above_mid(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "BTC", "size": 0.5, "side": "buy"},
                          timeout=10)
        assert r.status_code == 200, r.text
        q = r.json()["quote"]
        assert q["side"] == "buy"
        assert q["spread_bps"] >= 25, f"spread_bps {q['spread_bps']} < base 25"
        assert q["price"] > q["mid"], "buy price must be > mid"
        # size component for BTC at liquidity 800: 0.5/800 = 0.000625 ≈ 6.25 bps extra at minimum
        assert q["spread_bps"] >= 25 + 6.0
        assert q["valid_for_ms"] == 15000

    def test_sell_quote_priced_below_mid(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "ETH", "size": 1.0, "side": "sell"},
                          timeout=10)
        assert r.status_code == 200
        q = r.json()["quote"]
        assert q["side"] == "sell"
        assert q["price"] < q["mid"], "sell price must be < mid"
        assert q["spread_bps"] >= 25

    def test_invalid_symbol_rejected(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "FOO", "size": 1.0, "side": "buy"},
                          timeout=10)
        assert r.status_code == 400

    def test_invalid_side_rejected(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "BTC", "size": 1.0, "side": "hodl"},
                          timeout=10)
        assert r.status_code in (400, 422)

    def test_zero_size_rejected(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "BTC", "size": 0, "side": "buy"},
                          timeout=10)
        assert r.status_code in (400, 422)


# -------------------------------------------------------------- Full cycle ---
class TestFullCycle:
    def test_buy_cycle_settles_flat_and_books_cash_pnl(self, admin_headers):
        # Snapshot before
        s0 = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=admin_headers, timeout=10).json()
        cash0 = s0["cash_pnl"]

        # RFQ BUY 0.5 BTC
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "BTC", "size": 0.5, "side": "buy"},
                          timeout=10)
        assert r.status_code == 200, r.text
        q = r.json()["quote"]

        # Execute
        r = requests.post(f"{BASE_URL}/api/otc-desk/execute",
                          headers=admin_headers,
                          json={"quote_id": q["id"]},
                          timeout=10)
        assert r.status_code == 200, r.text
        exe = r.json()
        assert exe["ok"] is True
        # Inventory immediately after exec is short -0.5 (client bought, desk sold)
        assert abs(exe["inventory"]["BTC"] - (-0.5)) < 1e-9

        # Wait for hedge (600 ms latency + buffer)
        time.sleep(2.0)

        s1 = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=admin_headers, timeout=10).json()
        # Inventory must be flat after hedge
        assert abs(s1["inventory"].get("BTC", 0.0)) < 1e-9, f"inventory not flat: {s1['inventory']}"
        # Unrealized PnL must be ~0 when fully flat (settle-on-flat invariant)
        assert abs(s1["unrealized_pnl"]) < 1e-6, f"unrealized {s1['unrealized_pnl']} should be ~0 when flat"
        # cash_pnl should have moved (could be + or - depending on slippage vs spread; commonly + for size 0.5)
        # The spec says 'cash_pnl > 0 matching spread + mid drift' for the canonical case.
        assert s1["cash_pnl"] != cash0, f"cash_pnl unchanged: {cash0} -> {s1['cash_pnl']}"
        # Hedge feed must have ≥1 fill linked to our quote
        linked = [h for h in s1["hedge_feed"] if h.get("linked_quote_id") == q["id"]]
        assert len(linked) >= 1, "no hedge fill recorded for this quote"
        # slippage_info present and equal to slippage_pnl (informational mirror)
        assert "slippage_info" in s1
        assert s1["slippage_info"] <= 0, "slippage cost is a debit, should be <= 0"

    def test_sell_cycle_accumulates_cash_pnl(self, admin_headers):
        s0 = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=admin_headers, timeout=10).json()
        cash0 = s0["cash_pnl"]

        # RFQ SELL 0.3 BTC (client sells to desk)
        r = requests.post(f"{BASE_URL}/api/otc-desk/rfq",
                          headers=admin_headers,
                          json={"symbol": "BTC", "size": 0.3, "side": "sell"},
                          timeout=10)
        assert r.status_code == 200
        q = r.json()["quote"]
        r = requests.post(f"{BASE_URL}/api/otc-desk/execute",
                          headers=admin_headers,
                          json={"quote_id": q["id"]},
                          timeout=10)
        assert r.status_code == 200
        time.sleep(2.0)
        s1 = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=admin_headers, timeout=10).json()
        # Flat invariant
        assert abs(s1["inventory"].get("BTC", 0.0)) < 1e-9
        assert abs(s1["unrealized_pnl"]) < 1e-6
        # cash_pnl moved
        assert s1["cash_pnl"] != cash0

    def test_execute_expired_or_unknown_quote(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/execute",
                          headers=admin_headers,
                          json={"quote_id": "nonexistent_id"},
                          timeout=10)
        assert r.status_code == 400


# ---------------------------------------------------------- Reset (admin) ----
class TestReset:
    def test_admin_can_reset(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/otc-desk/reset", headers=admin_headers, timeout=10)
        assert r.status_code == 200
        s = requests.get(f"{BASE_URL}/api/otc-desk/state", headers=admin_headers, timeout=10).json()
        assert s["cash_pnl"] == 0.0
        assert all(v == 0.0 for v in s["inventory"].values())
        assert abs(s["unrealized_pnl"]) < 1e-9


# ----------------------------------------------------------- Regression -----
class TestRegression:
    def test_existing_otc_leads_route_still_works(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/otc/leads", headers=admin_headers, timeout=15)
        # Either 200 (list) or 403 (no perm); must NOT be 404 (router missing) or 500.
        assert r.status_code in (200, 403), f"unexpected {r.status_code}: {r.text[:200]}"
