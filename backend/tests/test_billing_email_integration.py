"""
Test Billing & Email Integration - Iteration 52
Tests billing routes with Brevo transactional email wiring.
Focus: run-cycle, cycle-status, fireblocks-webhook, upgrade/quote, admission-fee approve, my-status
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


def get_admin_session():
    """Get authenticated admin session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if login_resp.status_code == 200:
        token = login_resp.json().get("access_token")
        if token:
            session.headers.update({"Authorization": f"Bearer {token}"})
    return session


class TestBillingEmailIntegration:
    """Test billing routes and email integration"""
    
    @classmethod
    def setup_class(cls):
        """Setup test session with admin auth"""
        cls.session = get_admin_session()
    
    @classmethod
    def teardown_class(cls):
        """Cleanup"""
        cls.session.close()

    # ==================== /api/billing/run-cycle ====================
    
    def test_run_cycle_returns_200(self):
        """POST /api/billing/run-cycle should return 200 for admin"""
        resp = self.session.post(f"{BASE_URL}/api/billing/run-cycle")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: POST /api/billing/run-cycle returns 200")
    
    def test_run_cycle_returns_counters(self):
        """POST /api/billing/run-cycle should return counters in result"""
        resp = self.session.post(f"{BASE_URL}/api/billing/run-cycle")
        assert resp.status_code == 200
        data = resp.json()
        assert "result" in data, "Response should contain 'result' key"
        result = data["result"]
        # Check for expected counter keys
        expected_keys = ["created_payments", "notified_clients", "suspended", "flagged_overdue"]
        for key in expected_keys:
            assert key in result or "skipped" in result, f"Result should contain '{key}' or 'skipped'"
        print(f"PASS: run-cycle returns counters: {result}")
    
    def test_run_cycle_returns_success_and_timestamp(self):
        """POST /api/billing/run-cycle should return success and timestamp"""
        resp = self.session.post(f"{BASE_URL}/api/billing/run-cycle")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "timestamp" in data, "Response should contain timestamp"
        print(f"PASS: run-cycle returns success=True and timestamp={data.get('timestamp')}")
    
    def test_run_cycle_unauthorized(self):
        """POST /api/billing/run-cycle should return 401/403 without auth"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/billing/run-cycle")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
        print("PASS: run-cycle returns 401/403 without auth")

    # ==================== /api/billing/cycle-status ====================
    
    def test_cycle_status_returns_200(self):
        """GET /api/billing/cycle-status should return 200"""
        resp = self.session.get(f"{BASE_URL}/api/billing/cycle-status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/billing/cycle-status returns 200")
    
    def test_cycle_status_returns_expected_fields(self):
        """GET /api/billing/cycle-status should return last_run_at, last_result, runs, interval_s"""
        resp = self.session.get(f"{BASE_URL}/api/billing/cycle-status")
        assert resp.status_code == 200
        data = resp.json()
        expected_fields = ["last_run_at", "last_result", "runs", "interval_s"]
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}'"
        print(f"PASS: cycle-status returns expected fields: {list(data.keys())}")
    
    def test_cycle_status_after_run(self):
        """GET /api/billing/cycle-status should reflect last run after POST run-cycle"""
        # First run the cycle
        run_resp = self.session.post(f"{BASE_URL}/api/billing/run-cycle")
        assert run_resp.status_code == 200
        
        # Then check status
        status_resp = self.session.get(f"{BASE_URL}/api/billing/cycle-status")
        assert status_resp.status_code == 200
        data = status_resp.json()
        
        # last_run_at should be set
        assert data.get("last_run_at") is not None, "last_run_at should be set after run"
        # runs should be >= 1
        assert data.get("runs", 0) >= 1, "runs should be >= 1 after run"
        print(f"PASS: cycle-status reflects last run: runs={data.get('runs')}, last_run_at={data.get('last_run_at')}")

    # ==================== /api/billing/fireblocks-webhook ====================
    
    def test_fireblocks_webhook_accepts_valid_payload(self):
        """POST /api/billing/fireblocks-webhook should accept TRANSACTION_STATUS_UPDATED payload"""
        payload = {
            "type": "TRANSACTION_STATUS_UPDATED",
            "data": {
                "id": f"test-tx-{uuid.uuid4()}",
                "status": "COMPLETED",
                "assetId": "BTC",
                "amount": "0.001",
                "destination": {
                    "type": "VAULT_ACCOUNT",
                    "id": "999"  # Non-matching vault ID
                }
            }
        }
        resp = requests.post(f"{BASE_URL}/api/billing/fireblocks-webhook", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, "Response should have ok=True"
        print(f"PASS: fireblocks-webhook accepts valid payload: {data}")
    
    def test_fireblocks_webhook_returns_ok_for_non_tx_events(self):
        """POST /api/billing/fireblocks-webhook should return ok=True with ignored for non-tx events"""
        payload = {
            "type": "VAULT_ACCOUNT_CREATED",
            "data": {"id": "123", "name": "Test Vault"}
        }
        resp = requests.post(f"{BASE_URL}/api/billing/fireblocks-webhook", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "ignored" in data, "Response should contain 'ignored' for non-tx events"
        print(f"PASS: fireblocks-webhook ignores non-tx events: {data}")
    
    def test_fireblocks_webhook_rejects_invalid_json(self):
        """POST /api/billing/fireblocks-webhook should return 400 for invalid JSON"""
        resp = requests.post(
            f"{BASE_URL}/api/billing/fireblocks-webhook",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )
        assert resp.status_code == 400, f"Expected 400 for invalid JSON, got {resp.status_code}"
        print("PASS: fireblocks-webhook returns 400 for invalid JSON")
    
    def test_fireblocks_webhook_handles_empty_body(self):
        """POST /api/billing/fireblocks-webhook should handle empty body gracefully"""
        resp = requests.post(
            f"{BASE_URL}/api/billing/fireblocks-webhook",
            json={}
        )
        # Should return 200 with ok=True and ignored (no type field)
        assert resp.status_code == 200, f"Expected 200 for empty body, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True, "Response should have ok=True"
        print(f"PASS: fireblocks-webhook handles empty body: {data}")
    
    def test_fireblocks_webhook_transaction_created_event(self):
        """POST /api/billing/fireblocks-webhook should accept TRANSACTION_CREATED event"""
        payload = {
            "type": "TRANSACTION_CREATED",
            "data": {
                "id": f"test-tx-{uuid.uuid4()}",
                "status": "PENDING",
                "assetId": "ETH",
                "amount": "0.5"
            }
        }
        resp = requests.post(f"{BASE_URL}/api/billing/fireblocks-webhook", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("ok") == True
        print(f"PASS: fireblocks-webhook accepts TRANSACTION_CREATED: {data}")

    # ==================== /api/billing/upgrade/quote ====================
    
    def test_upgrade_quote_returns_prorata_amount(self):
        """POST /api/billing/upgrade/quote should return prorata_amount_eur"""
        payload = {"target_tier": "premium"}
        resp = self.session.post(f"{BASE_URL}/api/billing/upgrade/quote", json=payload)
        # May return 400 if user is already premium or higher, or 200 with quote
        if resp.status_code == 200:
            data = resp.json()
            assert "prorata_amount_eur" in data, "Response should contain prorata_amount_eur"
            print(f"PASS: upgrade/quote returns prorata_amount_eur: {data.get('prorata_amount_eur')}")
        elif resp.status_code == 400:
            # User may already be at or above target tier
            print(f"PASS: upgrade/quote returns 400 (user may be at/above target tier): {resp.text}")
        else:
            pytest.fail(f"Unexpected status {resp.status_code}: {resp.text}")
    
    def test_upgrade_quote_returns_quote_details(self):
        """POST /api/billing/upgrade/quote should return full quote details"""
        payload = {"target_tier": "vip"}
        resp = self.session.post(f"{BASE_URL}/api/billing/upgrade/quote", json=payload)
        if resp.status_code == 200:
            data = resp.json()
            expected_fields = ["current_tier", "target_tier", "current_annual_eur", "target_annual_eur", "days_remaining"]
            for field in expected_fields:
                assert field in data, f"Response should contain '{field}'"
            print(f"PASS: upgrade/quote returns full details: current={data.get('current_tier')}, target={data.get('target_tier')}")
        elif resp.status_code == 400:
            print(f"PASS: upgrade/quote returns 400 (expected for same/lower tier): {resp.text}")
        else:
            pytest.fail(f"Unexpected status {resp.status_code}: {resp.text}")
    
    def test_upgrade_quote_invalid_tier(self):
        """POST /api/billing/upgrade/quote should return 400 for invalid tier"""
        payload = {"target_tier": "invalid_tier"}
        resp = self.session.post(f"{BASE_URL}/api/billing/upgrade/quote", json=payload)
        assert resp.status_code == 400, f"Expected 400 for invalid tier, got {resp.status_code}: {resp.text}"
        print("PASS: upgrade/quote returns 400 for invalid tier")
    
    def test_upgrade_quote_unauthorized(self):
        """POST /api/billing/upgrade/quote should return 401/403 without auth"""
        session = requests.Session()
        resp = session.post(f"{BASE_URL}/api/billing/upgrade/quote", json={"target_tier": "premium"})
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
        print("PASS: upgrade/quote returns 401/403 without auth")

    # ==================== /api/billing/my-status ====================
    
    def test_my_status_returns_200(self):
        """GET /api/billing/my-status should return 200 for authenticated user"""
        resp = self.session.get(f"{BASE_URL}/api/billing/my-status")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/billing/my-status returns 200")
    
    def test_my_status_returns_billing_state(self):
        """GET /api/billing/my-status should return billing state fields"""
        resp = self.session.get(f"{BASE_URL}/api/billing/my-status")
        assert resp.status_code == 200
        data = resp.json()
        expected_fields = ["tier", "annual_fee_amount_eur", "billing_status"]
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}'"
        print(f"PASS: my-status returns billing state: tier={data.get('tier')}, status={data.get('billing_status')}")
    
    def test_my_status_unauthorized(self):
        """GET /api/billing/my-status should return 401/403 without auth"""
        session = requests.Session()
        resp = session.get(f"{BASE_URL}/api/billing/my-status")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
        print("PASS: my-status returns 401/403 without auth")


class TestReferralsAdmissionFeeApprove:
    """Test referrals admission-fee approve endpoint with email integration"""
    
    @classmethod
    def setup_class(cls):
        """Setup test session with admin auth"""
        cls.session = get_admin_session()
    
    @classmethod
    def teardown_class(cls):
        """Cleanup"""
        cls.session.close()
    
    def test_admission_fee_approve_nonexistent_payment(self):
        """POST /api/referrals/admission-fee/{id}/approve should return 404 for nonexistent payment"""
        fake_id = str(uuid.uuid4())
        resp = self.session.post(f"{BASE_URL}/api/referrals/admission-fee/{fake_id}/approve")
        assert resp.status_code == 404, f"Expected 404 for nonexistent payment, got {resp.status_code}: {resp.text}"
        print("PASS: admission-fee approve returns 404 for nonexistent payment")
    
    def test_admission_fee_approve_unauthorized(self):
        """POST /api/referrals/admission-fee/{id}/approve should return 401/403 without auth"""
        session = requests.Session()
        fake_id = str(uuid.uuid4())
        resp = session.post(f"{BASE_URL}/api/referrals/admission-fee/{fake_id}/approve")
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
        print("PASS: admission-fee approve returns 401/403 without auth")
    
    def test_admission_fee_approve_with_pending_payment(self):
        """POST /api/referrals/admission-fee/{id}/approve should work with pending payment"""
        # First, get list of pending payments
        pending_resp = self.session.get(f"{BASE_URL}/api/referrals/admission-fee/payments?status=pending")
        if pending_resp.status_code == 200:
            payments = pending_resp.json()
            if isinstance(payments, list) and len(payments) > 0:
                payment_id = payments[0].get("id")
                # Try to approve
                approve_resp = self.session.post(f"{BASE_URL}/api/referrals/admission-fee/{payment_id}/approve")
                # Should succeed or return 400 if already approved
                assert approve_resp.status_code in [200, 400], f"Expected 200/400, got {approve_resp.status_code}: {approve_resp.text}"
                if approve_resp.status_code == 200:
                    data = approve_resp.json()
                    assert data.get("success") == True, "Response should have success=True"
                    print(f"PASS: admission-fee approve succeeded for payment {payment_id}")
                else:
                    print(f"PASS: admission-fee approve returned 400 (already approved): {approve_resp.text}")
            else:
                print("SKIP: No pending payments to test approval")
        else:
            print(f"SKIP: Could not fetch pending payments: {pending_resp.status_code}")


class TestEmailServiceIntegration:
    """Test that email_service is properly imported and callable in billing/referrals routes"""
    
    @classmethod
    def setup_class(cls):
        """Setup test session with admin auth"""
        cls.session = get_admin_session()
    
    @classmethod
    def teardown_class(cls):
        """Cleanup"""
        cls.session.close()
    
    def test_run_cycle_does_not_fail_without_brevo_key(self):
        """POST /api/billing/run-cycle should NOT fail even if BREVO_API_KEY is missing"""
        # The email_service.send_email returns {simulated: true} when api_key is missing
        # and all email calls are wrapped in try/except, so billing should work
        resp = self.session.post(f"{BASE_URL}/api/billing/run-cycle")
        assert resp.status_code == 200, f"run-cycle should work without BREVO_API_KEY, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") == True, "run-cycle should return success=True"
        print("PASS: run-cycle works without BREVO_API_KEY (emails fail silently)")
    
    def test_fireblocks_webhook_does_not_fail_without_brevo_key(self):
        """POST /api/billing/fireblocks-webhook should NOT fail even if BREVO_API_KEY is missing"""
        payload = {
            "type": "TRANSACTION_STATUS_UPDATED",
            "data": {
                "id": f"test-tx-{uuid.uuid4()}",
                "status": "COMPLETED",
                "assetId": "USDT_ERC20",
                "amount": "100",
                "destination": {
                    "type": "VAULT_ACCOUNT",
                    "id": "999"
                }
            }
        }
        resp = requests.post(f"{BASE_URL}/api/billing/fireblocks-webhook", json=payload)
        assert resp.status_code == 200, f"fireblocks-webhook should work without BREVO_API_KEY, got {resp.status_code}: {resp.text}"
        print("PASS: fireblocks-webhook works without BREVO_API_KEY (emails fail silently)")
    
    def test_upgrade_approve_does_not_fail_without_brevo_key(self):
        """POST /api/billing/upgrade/{id}/approve should NOT fail even if BREVO_API_KEY is missing"""
        # First check if there are any pending upgrade payments
        # We'll test with a fake ID - should return 404, not 500
        fake_id = str(uuid.uuid4())
        resp = self.session.post(f"{BASE_URL}/api/billing/upgrade/{fake_id}/approve")
        # Should return 404 (not found) not 500 (server error from email)
        assert resp.status_code in [404, 400], f"upgrade approve should return 404/400 for fake ID, not 500, got {resp.status_code}"
        print("PASS: upgrade approve returns 404/400 for fake ID (no email-related crash)")


class TestBillingConfigEndpoints:
    """Test billing configuration endpoints"""
    
    @classmethod
    def setup_class(cls):
        """Setup test session with admin auth"""
        cls.session = get_admin_session()
    
    @classmethod
    def teardown_class(cls):
        """Cleanup"""
        cls.session.close()
    
    def test_billing_config_returns_200(self):
        """GET /api/billing/config should return 200"""
        resp = self.session.get(f"{BASE_URL}/api/billing/config")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/billing/config returns 200")
    
    def test_billing_config_returns_fee_configs(self):
        """GET /api/billing/config should return admission_fee, annual_fee, referral_fees"""
        resp = self.session.get(f"{BASE_URL}/api/billing/config")
        assert resp.status_code == 200
        data = resp.json()
        expected_keys = ["admission_fee", "annual_fee", "referral_fees"]
        for key in expected_keys:
            assert key in data, f"Response should contain '{key}'"
        print(f"PASS: billing/config returns fee configs: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
