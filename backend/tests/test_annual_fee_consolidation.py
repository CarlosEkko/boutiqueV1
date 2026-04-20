"""
Test Annual Fee Consolidation - Single Source of Truth
=======================================================
Tests the consolidation of annual fee management from 3 duplicate pages
into a single source: platform_settings.annual_fee

Key endpoints tested:
- GET /api/kbex-rates/config → tier_fees should match platform_settings.annual_fee
- PUT /api/kbex-rates/tier-fees → should return 404 (endpoint removed)
- PUT /api/billing/annual-fee → canonical writer, updates should reflect everywhere
- GET /api/billing/config → returns annual_fee config
- GET /api/kbex-rates/renewal-alerts → should still work
- POST /api/kbex-rates/upgrade-tier → should use platform_settings.annual_fee for fee deduction
- GET /api/billing/run-cycle, /api/billing/renewals-health, /api/billing/my-status → no regressions
- GET /api/referrals/settings → admission_fee and referral_fees should still work
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Expected tier fees from DB (as per problem statement)
EXPECTED_TIER_FEES = {
    "broker": 0.0,
    "standard": 250.0,
    "premium": 1000.0,
    "vip": 5000.0,
    "institucional": 15000.0,
}

TIERS = ["broker", "standard", "premium", "vip", "institucional"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "carlos@kbex.io", "password": "senha123"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestKbexRatesConfigTierFees:
    """Test GET /api/kbex-rates/config returns tier_fees from platform_settings.annual_fee"""

    def test_kbex_rates_config_returns_200(self, admin_headers):
        """GET /api/kbex-rates/config should return 200"""
        response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_kbex_rates_config_has_tier_fees(self, admin_headers):
        """GET /api/kbex-rates/config should include tier_fees field"""
        response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tier_fees" in data, f"tier_fees missing from response: {data.keys()}"

    def test_kbex_rates_config_tier_fees_has_all_tiers(self, admin_headers):
        """tier_fees should have all 5 tiers"""
        response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        assert response.status_code == 200
        tier_fees = response.json().get("tier_fees", {})
        for tier in TIERS:
            assert tier in tier_fees, f"Tier '{tier}' missing from tier_fees: {tier_fees}"

    def test_kbex_rates_config_tier_fees_values_match_expected(self, admin_headers):
        """tier_fees values should match expected annual_fee values"""
        response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        assert response.status_code == 200
        tier_fees = response.json().get("tier_fees", {})
        for tier, expected_value in EXPECTED_TIER_FEES.items():
            actual = tier_fees.get(tier)
            assert actual == expected_value, f"Tier '{tier}': expected {expected_value}, got {actual}"


class TestKbexRatesTierFeesEndpointRemoved:
    """Test PUT /api/kbex-rates/tier-fees returns 404 (endpoint removed)"""

    def test_put_tier_fees_returns_404(self, admin_headers):
        """PUT /api/kbex-rates/tier-fees should return 404 or 405 (endpoint removed)"""
        response = requests.put(
            f"{BASE_URL}/api/kbex-rates/tier-fees",
            headers=admin_headers,
            json={"standard": 300}
        )
        # Endpoint removed - should return 404 (Not Found) or 405 (Method Not Allowed)
        assert response.status_code in [404, 405], f"Expected 404/405, got {response.status_code}: {response.text}"


class TestBillingAnnualFeeCanonicalWriter:
    """Test PUT /api/billing/annual-fee as the canonical writer"""

    def test_billing_config_returns_200(self, admin_headers):
        """GET /api/billing/config should return 200"""
        response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_billing_config_has_annual_fee(self, admin_headers):
        """GET /api/billing/config should include annual_fee field"""
        response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "annual_fee" in data, f"annual_fee missing from response: {data.keys()}"

    def test_billing_config_annual_fee_has_all_tiers(self, admin_headers):
        """annual_fee should have all 5 tier fields"""
        response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        assert response.status_code == 200
        annual_fee = response.json().get("annual_fee", {})
        for tier in TIERS:
            key = f"{tier}_eur"
            assert key in annual_fee, f"Key '{key}' missing from annual_fee: {annual_fee}"

    def test_put_annual_fee_updates_successfully(self, admin_headers):
        """PUT /api/billing/annual-fee should update successfully"""
        # First get current values to restore later
        get_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        original_annual_fee = get_response.json().get("annual_fee", {})

        # Update with test value
        test_config = {
            "broker_eur": 0.0,
            "standard_eur": 251.0,  # Changed from 250 to 251
            "premium_eur": 1000.0,
            "vip_eur": 5000.0,
            "institucional_eur": 15000.0,
            "is_active": True,
            "grace_days": 15,
            "suspend_after_days": 30,
            "notify_days_before": 30
        }

        put_response = requests.put(
            f"{BASE_URL}/api/billing/annual-fee",
            headers=admin_headers,
            json={"config": test_config}
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.status_code}: {put_response.text}"
        assert put_response.json().get("success") is True

        # Verify the update via GET /api/billing/config
        verify_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        updated_annual_fee = verify_response.json().get("annual_fee", {})
        assert updated_annual_fee.get("standard_eur") == 251.0, f"Update not reflected: {updated_annual_fee}"

        # Restore original values
        restore_config = {
            "broker_eur": original_annual_fee.get("broker_eur", 0.0),
            "standard_eur": original_annual_fee.get("standard_eur", 250.0),
            "premium_eur": original_annual_fee.get("premium_eur", 1000.0),
            "vip_eur": original_annual_fee.get("vip_eur", 5000.0),
            "institucional_eur": original_annual_fee.get("institucional_eur", 15000.0),
            "is_active": original_annual_fee.get("is_active", True),
            "grace_days": original_annual_fee.get("grace_days", 15),
            "suspend_after_days": original_annual_fee.get("suspend_after_days", 30),
            "notify_days_before": original_annual_fee.get("notify_days_before", 30)
        }
        requests.put(
            f"{BASE_URL}/api/billing/annual-fee",
            headers=admin_headers,
            json={"config": restore_config}
        )


class TestSingleSourceOfTruth:
    """Test that PUT /api/billing/annual-fee reflects in GET /api/kbex-rates/config"""

    def test_annual_fee_update_reflects_in_kbex_rates_config(self, admin_headers):
        """Update via billing/annual-fee should reflect in kbex-rates/config tier_fees"""
        # Get original values
        billing_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        original_annual_fee = billing_response.json().get("annual_fee", {})

        # Update standard_eur to a test value
        test_value = 275.0
        test_config = {
            "broker_eur": original_annual_fee.get("broker_eur", 0.0),
            "standard_eur": test_value,
            "premium_eur": original_annual_fee.get("premium_eur", 1000.0),
            "vip_eur": original_annual_fee.get("vip_eur", 5000.0),
            "institucional_eur": original_annual_fee.get("institucional_eur", 15000.0),
            "is_active": original_annual_fee.get("is_active", True),
            "grace_days": original_annual_fee.get("grace_days", 15),
            "suspend_after_days": original_annual_fee.get("suspend_after_days", 30),
            "notify_days_before": original_annual_fee.get("notify_days_before", 30)
        }

        # PUT to billing/annual-fee
        put_response = requests.put(
            f"{BASE_URL}/api/billing/annual-fee",
            headers=admin_headers,
            json={"config": test_config}
        )
        assert put_response.status_code == 200

        # GET from kbex-rates/config and verify tier_fees.standard matches
        kbex_response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        assert kbex_response.status_code == 200
        tier_fees = kbex_response.json().get("tier_fees", {})
        assert tier_fees.get("standard") == test_value, f"Expected {test_value}, got {tier_fees.get('standard')}"

        # Also verify via billing/config
        billing_verify = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        annual_fee = billing_verify.json().get("annual_fee", {})
        assert annual_fee.get("standard_eur") == test_value

        # Restore original values
        restore_config = {
            "broker_eur": original_annual_fee.get("broker_eur", 0.0),
            "standard_eur": original_annual_fee.get("standard_eur", 250.0),
            "premium_eur": original_annual_fee.get("premium_eur", 1000.0),
            "vip_eur": original_annual_fee.get("vip_eur", 5000.0),
            "institucional_eur": original_annual_fee.get("institucional_eur", 15000.0),
            "is_active": original_annual_fee.get("is_active", True),
            "grace_days": original_annual_fee.get("grace_days", 15),
            "suspend_after_days": original_annual_fee.get("suspend_after_days", 30),
            "notify_days_before": original_annual_fee.get("notify_days_before", 30)
        }
        requests.put(
            f"{BASE_URL}/api/billing/annual-fee",
            headers=admin_headers,
            json={"config": restore_config}
        )


class TestKbexRatesRenewalAlerts:
    """Test GET /api/kbex-rates/renewal-alerts still works"""

    def test_renewal_alerts_returns_200(self, admin_headers):
        """GET /api/kbex-rates/renewal-alerts should return 200"""
        response = requests.get(f"{BASE_URL}/api/kbex-rates/renewal-alerts", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_renewal_alerts_has_expected_fields(self, admin_headers):
        """renewal-alerts should return alerts and threshold_days"""
        response = requests.get(f"{BASE_URL}/api/kbex-rates/renewal-alerts", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data, f"alerts missing from response: {data.keys()}"
        assert "threshold_days" in data, f"threshold_days missing from response: {data.keys()}"


class TestKbexRatesUpgradeTier:
    """Test POST /api/kbex-rates/upgrade-tier uses platform_settings.annual_fee"""

    def test_upgrade_tier_endpoint_exists(self, admin_headers):
        """POST /api/kbex-rates/upgrade-tier should exist (may return 400/404 for invalid user)"""
        response = requests.post(
            f"{BASE_URL}/api/kbex-rates/upgrade-tier",
            headers=admin_headers,
            json={
                "user_id": "nonexistent-user-id",
                "new_tier": "vip",
                "deduct_from_balance": False
            }
        )
        # Should return 404 for nonexistent user, not 405 (method not allowed)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}: {response.text}"


class TestBillingNoRegressions:
    """Test no regressions in billing endpoints"""

    def test_billing_run_cycle_returns_200(self, admin_headers):
        """POST /api/billing/run-cycle should return 200"""
        response = requests.post(f"{BASE_URL}/api/billing/run-cycle", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_billing_run_cycle_returns_success(self, admin_headers):
        """POST /api/billing/run-cycle should return success=True"""
        response = requests.post(f"{BASE_URL}/api/billing/run-cycle", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True, f"Expected success=True: {data}"

    def test_billing_renewals_health_returns_200(self, admin_headers):
        """GET /api/billing/renewals-health should return 200"""
        response = requests.get(f"{BASE_URL}/api/billing/renewals-health", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_billing_renewals_health_has_expected_fields(self, admin_headers):
        """renewals-health should return expected KPI fields"""
        response = requests.get(f"{BASE_URL}/api/billing/renewals-health", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        expected_fields = [
            "projected_annual_revenue_eur",
            "active_clients_total",
            "active_clients_by_tier",
            "collected_12m_eur"
        ]
        for field in expected_fields:
            assert field in data, f"Field '{field}' missing from renewals-health: {data.keys()}"

    def test_billing_my_status_returns_200(self, admin_headers):
        """GET /api/billing/my-status should return 200"""
        response = requests.get(f"{BASE_URL}/api/billing/my-status", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_billing_my_status_has_expected_fields(self, admin_headers):
        """my-status should return tier and billing info"""
        response = requests.get(f"{BASE_URL}/api/billing/my-status", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        expected_fields = ["tier", "annual_fee_amount_eur", "billing_status"]
        for field in expected_fields:
            assert field in data, f"Field '{field}' missing from my-status: {data.keys()}"


class TestReferralsSettingsNoRegression:
    """Test GET /api/referrals/settings still works (admission_fee and referral_fees)"""

    def test_referrals_settings_returns_200(self, admin_headers):
        """GET /api/referrals/settings should return 200"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_referrals_settings_has_admission_fee(self, admin_headers):
        """referrals/settings should include admission_fee"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "admission_fee" in data, f"admission_fee missing from response: {data.keys()}"

    def test_referrals_settings_has_referral_fees(self, admin_headers):
        """referrals/settings should include referral_fees"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "referral_fees" in data, f"referral_fees missing from response: {data.keys()}"


class TestTierFeesConversionLogic:
    """Test the conversion logic from annual_fee._eur to tier_fees plain keys"""

    def test_tier_fees_conversion_broker(self, admin_headers):
        """tier_fees.broker should equal annual_fee.broker_eur"""
        billing_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        kbex_response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        
        annual_fee = billing_response.json().get("annual_fee", {})
        tier_fees = kbex_response.json().get("tier_fees", {})
        
        assert tier_fees.get("broker") == float(annual_fee.get("broker_eur", 0))

    def test_tier_fees_conversion_standard(self, admin_headers):
        """tier_fees.standard should equal annual_fee.standard_eur"""
        billing_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        kbex_response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        
        annual_fee = billing_response.json().get("annual_fee", {})
        tier_fees = kbex_response.json().get("tier_fees", {})
        
        assert tier_fees.get("standard") == float(annual_fee.get("standard_eur", 0))

    def test_tier_fees_conversion_premium(self, admin_headers):
        """tier_fees.premium should equal annual_fee.premium_eur"""
        billing_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        kbex_response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        
        annual_fee = billing_response.json().get("annual_fee", {})
        tier_fees = kbex_response.json().get("tier_fees", {})
        
        assert tier_fees.get("premium") == float(annual_fee.get("premium_eur", 0))

    def test_tier_fees_conversion_vip(self, admin_headers):
        """tier_fees.vip should equal annual_fee.vip_eur"""
        billing_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        kbex_response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        
        annual_fee = billing_response.json().get("annual_fee", {})
        tier_fees = kbex_response.json().get("tier_fees", {})
        
        assert tier_fees.get("vip") == float(annual_fee.get("vip_eur", 0))

    def test_tier_fees_conversion_institucional(self, admin_headers):
        """tier_fees.institucional should equal annual_fee.institucional_eur"""
        billing_response = requests.get(f"{BASE_URL}/api/billing/config", headers=admin_headers)
        kbex_response = requests.get(f"{BASE_URL}/api/kbex-rates/config", headers=admin_headers)
        
        annual_fee = billing_response.json().get("annual_fee", {})
        tier_fees = kbex_response.json().get("tier_fees", {})
        
        assert tier_fees.get("institucional") == float(annual_fee.get("institucional_eur", 0))
