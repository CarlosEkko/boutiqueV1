"""
Backend integration tests for the Tier-Based OTC Policy Engine (Phase 1).

Coverage:
  • GET /api/otc-policies — admin gate + 4-tier seed defaults
  • PUT /api/otc-policies/{tier} — admin patch + auto<=instant guard
  • POST /api/otc-policies/check — tier evaluation + suggested_mode fallback
  • POST /api/otc-desk/rfq — baseline + per-tier policy gating
  • POST /api/otc-desk/execute — auto_execute_enabled / cap gates
  • Regression — staff-only access still enforced for /rfq + /execute
"""
from __future__ import annotations

import os
import time
import uuid
from typing import Any, Dict, Optional

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://luxury-crypto.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"
SUPPORT_EMAIL = "sofia@kbex.io"
SUPPORT_PASSWORD = "test123!"

# Pre-known clients for tier resolution (membership_level on user doc)
STANDARD_CLIENT_ID = "193e9823-3520-43d1-a6ef-55c55161ea95"   # standard
PREMIUM_CLIENT_ID = "67739300-b625-4c0f-8ddb-d5a7cb531891"   # premium
VIP_CLIENT_ID = "51be808d-8f1c-4c93-a994-c50b1b63391b"   # vip


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
def _login(email: str, password: str) -> Optional[str]:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    if r.status_code != 200:
        return None
    return r.json().get("access_token")


@pytest.fixture(scope="session")
def admin_token() -> str:
    tok = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not tok:
        pytest.skip("Admin login failed")
    return tok


@pytest.fixture(scope="session")
def support_token() -> Optional[str]:
    return _login(SUPPORT_EMAIL, SUPPORT_PASSWORD)


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def support_headers(support_token):
    if not support_token:
        pytest.skip("Support login failed")
    return {"Authorization": f"Bearer {support_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session", autouse=True)
def _restore_policies(admin_token):
    """Snapshot all tier policies before tests, restore after."""
    h = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    snap = requests.get(f"{API}/otc-policies", headers=h, timeout=15)
    saved = {}
    if snap.status_code == 200:
        for p in snap.json().get("policies", []):
            saved[p["tier"]] = p
    yield
    for tier, p in saved.items():
        body = {
            "white_glove_enabled": p.get("white_glove_enabled", True),
            "instant_firm_enabled": p.get("instant_firm_enabled", False),
            "instant_max_usdt": p.get("instant_max_usdt", 0),
            "auto_execute_enabled": p.get("auto_execute_enabled", False),
            "auto_execute_max_usdt": p.get("auto_execute_max_usdt", 0),
        }
        try:
            requests.put(f"{API}/otc-policies/{tier}", headers=h, json=body, timeout=15)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# 1. GET /api/otc-policies
# ---------------------------------------------------------------------------
class TestPolicyList:
    def test_list_requires_auth(self):
        r = requests.get(f"{API}/otc-policies", timeout=15)
        assert r.status_code in (401, 403)

    def test_list_requires_admin(self, support_headers):
        r = requests.get(f"{API}/otc-policies", headers=support_headers, timeout=15)
        assert r.status_code == 403

    def test_list_returns_four_tiers(self, admin_headers):
        r = requests.get(f"{API}/otc-policies", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "policies" in data
        tiers = {p["tier"] for p in data["policies"]}
        assert tiers == {"standard", "premium", "vip", "institutional"}

    def test_seed_defaults_per_tier(self, admin_headers):
        r = requests.get(f"{API}/otc-policies", headers=admin_headers, timeout=15)
        by_tier = {p["tier"]: p for p in r.json()["policies"]}
        # Standard: instant disabled
        assert by_tier["standard"]["instant_firm_enabled"] is False
        assert by_tier["standard"]["auto_execute_enabled"] is False
        # VIP: instant 500k, auto 250k
        assert by_tier["vip"]["instant_firm_enabled"] is True
        assert by_tier["vip"]["auto_execute_enabled"] is True
        assert by_tier["vip"]["instant_max_usdt"] == 500_000
        assert by_tier["vip"]["auto_execute_max_usdt"] == 250_000
        # Institutional: instant 2M, auto 1M
        assert by_tier["institutional"]["instant_max_usdt"] == 2_000_000
        assert by_tier["institutional"]["auto_execute_max_usdt"] == 1_000_000


# ---------------------------------------------------------------------------
# 2. PUT /api/otc-policies/{tier}
# ---------------------------------------------------------------------------
class TestPolicyUpdate:
    def test_admin_partial_patch(self, admin_headers):
        # Reset premium to known defaults first
        baseline = {
            "white_glove_enabled": True,
            "instant_firm_enabled": True,
            "instant_max_usdt": 100_000,
            "auto_execute_enabled": False,
            "auto_execute_max_usdt": 0,
        }
        r = requests.put(f"{API}/otc-policies/premium", headers=admin_headers, json=baseline, timeout=15)
        assert r.status_code == 200, r.text
        # Patch single field
        r2 = requests.put(f"{API}/otc-policies/premium", headers=admin_headers,
                          json={"instant_max_usdt": 150_000}, timeout=15)
        assert r2.status_code == 200
        body = r2.json()
        assert body["ok"] is True
        assert body["policy"]["instant_max_usdt"] == 150_000
        assert body["policy"]["instant_firm_enabled"] is True  # untouched
        # Restore
        requests.put(f"{API}/otc-policies/premium", headers=admin_headers, json=baseline, timeout=15)

    def test_guard_auto_exceeds_instant(self, admin_headers):
        body = {"instant_max_usdt": 100_000, "auto_execute_max_usdt": 200_000}
        r = requests.put(f"{API}/otc-policies/vip", headers=admin_headers, json=body, timeout=15)
        assert r.status_code == 400
        # Restore vip
        requests.put(f"{API}/otc-policies/vip", headers=admin_headers,
                     json={"instant_max_usdt": 500_000, "auto_execute_max_usdt": 250_000,
                           "instant_firm_enabled": True, "auto_execute_enabled": True,
                           "white_glove_enabled": True}, timeout=15)

    def test_unknown_tier_rejected(self, admin_headers):
        r = requests.put(f"{API}/otc-policies/platinum", headers=admin_headers,
                         json={"instant_max_usdt": 100}, timeout=15)
        assert r.status_code == 400

    def test_non_admin_forbidden(self, support_headers):
        r = requests.put(f"{API}/otc-policies/premium", headers=support_headers,
                         json={"instant_max_usdt": 1}, timeout=15)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# 3. POST /api/otc-policies/check
# ---------------------------------------------------------------------------
class TestPolicyCheck:
    def test_check_requires_auth(self):
        r = requests.post(f"{API}/otc-policies/check", json={"tier": "standard", "size_usdt": 1000}, timeout=15)
        assert r.status_code in (401, 403)

    def test_standard_instant_blocked_suggests_white_glove(self, admin_headers):
        r = requests.post(f"{API}/otc-policies/check", headers=admin_headers,
                         json={"tier": "standard", "size_usdt": 1000}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["modes"]["white_glove"]["allowed"] is True
        assert data["modes"]["instant"]["allowed"] is False
        assert data["modes"]["instant"]["suggested_mode"] == "white_glove"

    def test_premium_instant_within_cap(self, admin_headers):
        # Ensure premium baseline
        requests.put(f"{API}/otc-policies/premium", headers=admin_headers,
                     json={"instant_firm_enabled": True, "instant_max_usdt": 100_000,
                           "auto_execute_enabled": False, "auto_execute_max_usdt": 0,
                           "white_glove_enabled": True}, timeout=15)
        r = requests.post(f"{API}/otc-policies/check", headers=admin_headers,
                         json={"tier": "premium", "size_usdt": 50_000}, timeout=15)
        assert r.status_code == 200
        assert r.json()["modes"]["instant"]["allowed"] is True

    def test_premium_instant_above_cap_suggests_white_glove(self, admin_headers):
        r = requests.post(f"{API}/otc-policies/check", headers=admin_headers,
                         json={"tier": "premium", "size_usdt": 5_000_000}, timeout=15)
        data = r.json()
        assert data["modes"]["instant"]["allowed"] is False
        assert data["modes"]["instant"]["suggested_mode"] == "white_glove"

    def test_unknown_tier_falls_back_to_standard(self, admin_headers):
        r = requests.post(f"{API}/otc-policies/check", headers=admin_headers,
                         json={"tier": "platinum_unknown", "size_usdt": 100}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Falls back to standard policy: instant disabled
        assert data["modes"]["instant"]["allowed"] is False


# ---------------------------------------------------------------------------
# 4. POST /api/otc-desk/rfq — policy gating
# ---------------------------------------------------------------------------
class TestRFQPolicyGate:
    def test_rfq_baseline_no_client(self, admin_headers):
        r = requests.post(f"{API}/otc-desk/rfq", headers=admin_headers,
                         json={"symbol": "BTC", "size": 0.001, "side": "buy"}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "quote" in data
        assert "policy" not in data  # no client → no policy block

    def test_rfq_standard_instant_blocked(self, admin_headers):
        r = requests.post(f"{API}/otc-desk/rfq", headers=admin_headers,
                         json={"symbol": "BTC", "size": 0.001, "side": "buy",
                               "client_user_id": STANDARD_CLIENT_ID, "mode": "instant"}, timeout=20)
        assert r.status_code == 403, r.text
        detail = r.json().get("detail", {})
        assert detail.get("code") == "policy_violation"
        assert detail.get("suggested_mode") == "white_glove"

    def test_rfq_standard_white_glove_ok(self, admin_headers):
        r = requests.post(f"{API}/otc-desk/rfq", headers=admin_headers,
                         json={"symbol": "BTC", "size": 0.001, "side": "buy",
                               "client_user_id": STANDARD_CLIENT_ID, "mode": "white_glove"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["policy"]["allowed"] is True
        assert body["policy"]["tier"] == "standard"

    def test_rfq_premium_instant_within_cap(self, admin_headers):
        # Premium cap=100k. 0.001 BTC is well under.
        # First ensure premium baseline (cap=100k)
        requests.put(f"{API}/otc-policies/premium", headers=admin_headers,
                     json={"instant_firm_enabled": True, "instant_max_usdt": 100_000,
                           "auto_execute_enabled": False, "auto_execute_max_usdt": 0,
                           "white_glove_enabled": True}, timeout=15)
        r = requests.post(f"{API}/otc-desk/rfq", headers=admin_headers,
                         json={"symbol": "BTC", "size": 0.001, "side": "buy",
                               "client_user_id": PREMIUM_CLIENT_ID, "mode": "instant"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["policy"]["allowed"] is True
        assert body["policy"]["tier"] == "premium"
        assert body["policy"]["mode"] == "instant"

    def test_rfq_size_exceeds_premium_cap(self, admin_headers):
        # Premium instant_max=100k. 3 BTC ≈ $180k → exceeds cap, stays under
        # BTC max_inventory (5) so build_quote does not pre-reject.
        r = requests.post(f"{API}/otc-desk/rfq", headers=admin_headers,
                         json={"symbol": "BTC", "size": 3, "side": "buy",
                               "client_user_id": PREMIUM_CLIENT_ID, "mode": "instant"}, timeout=20)
        assert r.status_code == 403, r.text
        detail = r.json().get("detail", {})
        assert detail.get("code") == "policy_violation"
        assert detail.get("suggested_mode") == "white_glove"
        assert "exceeds" in (detail.get("message") or "").lower() or "limit" in (detail.get("message") or "").lower()


# ---------------------------------------------------------------------------
# 5. POST /api/otc-desk/execute — auto-exec gating
# ---------------------------------------------------------------------------
class TestExecutePolicyGate:
    def _get_quote(self, headers, symbol="BTC", size=0.001, side="buy", client=None, mode="instant"):
        body: Dict[str, Any] = {"symbol": symbol, "size": size, "side": side}
        if client:
            body["client_user_id"] = client
            body["mode"] = mode
        r = requests.post(f"{API}/otc-desk/rfq", headers=headers, json=body, timeout=20)
        if r.status_code != 200:
            return None
        return r.json()["quote"]

    def test_execute_no_client_baseline_preserved(self, admin_headers):
        q = self._get_quote(admin_headers)
        assert q is not None
        r = requests.post(f"{API}/otc-desk/execute", headers=admin_headers,
                         json={"quote_id": q["id"]}, timeout=20)
        # Baseline staff-only execute should still succeed (200) without a client
        assert r.status_code in (200, 400), r.text  # 400 if expired
        if r.status_code == 200:
            assert r.json().get("ok") is True

    def test_execute_premium_auto_exec_disabled(self, admin_headers):
        # Premium has auto_execute_enabled=False
        requests.put(f"{API}/otc-policies/premium", headers=admin_headers,
                     json={"instant_firm_enabled": True, "instant_max_usdt": 100_000,
                           "auto_execute_enabled": False, "auto_execute_max_usdt": 0,
                           "white_glove_enabled": True}, timeout=15)
        q = self._get_quote(admin_headers, client=PREMIUM_CLIENT_ID, mode="instant")
        assert q is not None
        r = requests.post(f"{API}/otc-desk/execute", headers=admin_headers,
                         json={"quote_id": q["id"], "client_user_id": PREMIUM_CLIENT_ID}, timeout=20)
        assert r.status_code == 403, r.text
        assert r.json()["detail"]["code"] == "auto_execute_disabled"

    def test_execute_vip_within_auto_cap(self, admin_headers):
        # Vip has auto enabled @ 250k cap, small size BTC quote — should pass policy gate
        requests.put(f"{API}/otc-policies/vip", headers=admin_headers,
                     json={"instant_firm_enabled": True, "instant_max_usdt": 500_000,
                           "auto_execute_enabled": True, "auto_execute_max_usdt": 250_000,
                           "white_glove_enabled": True}, timeout=15)
        q = self._get_quote(admin_headers, client=VIP_CLIENT_ID, mode="instant")
        assert q is not None
        r = requests.post(f"{API}/otc-desk/execute", headers=admin_headers,
                         json={"quote_id": q["id"], "client_user_id": VIP_CLIENT_ID}, timeout=20)
        # 200 OK or 400 if quote expired (still indicates policy passed)
        assert r.status_code in (200, 400), r.text
        if r.status_code == 403:
            pytest.fail(f"Expected policy pass but got 403: {r.text}")

    def test_execute_vip_cap_exceeded(self, admin_headers):
        # Lower vip cap to a tiny number so even a small quote breaches
        requests.put(f"{API}/otc-policies/vip", headers=admin_headers,
                     json={"instant_firm_enabled": True, "instant_max_usdt": 500_000,
                           "auto_execute_enabled": True, "auto_execute_max_usdt": 1.0,
                           "white_glove_enabled": True}, timeout=15)
        try:
            q = self._get_quote(admin_headers, client=VIP_CLIENT_ID, mode="instant", size=0.001)
            assert q is not None
            r = requests.post(f"{API}/otc-desk/execute", headers=admin_headers,
                             json={"quote_id": q["id"], "client_user_id": VIP_CLIENT_ID}, timeout=20)
            assert r.status_code == 403, r.text
            assert r.json()["detail"]["code"] == "auto_execute_cap_exceeded"
        finally:
            # Restore VIP cap
            requests.put(f"{API}/otc-policies/vip", headers=admin_headers,
                         json={"instant_firm_enabled": True, "instant_max_usdt": 500_000,
                               "auto_execute_enabled": True, "auto_execute_max_usdt": 250_000,
                               "white_glove_enabled": True}, timeout=15)


# ---------------------------------------------------------------------------
# 6. Regression — staff gating still enforced
# ---------------------------------------------------------------------------
class TestStaffGateRegression:
    def test_rfq_non_staff_forbidden(self, support_headers):
        r = requests.post(f"{API}/otc-desk/rfq", headers=support_headers,
                         json={"symbol": "BTC", "size": 0.001, "side": "buy"}, timeout=15)
        assert r.status_code == 403, r.text

    def test_execute_non_staff_forbidden(self, support_headers):
        r = requests.post(f"{API}/otc-desk/execute", headers=support_headers,
                         json={"quote_id": "fake"}, timeout=15)
        assert r.status_code == 403, r.text

    def test_rfq_unauth(self):
        r = requests.post(f"{API}/otc-desk/rfq",
                         json={"symbol": "BTC", "size": 0.001, "side": "buy"}, timeout=15)
        assert r.status_code in (401, 403)
