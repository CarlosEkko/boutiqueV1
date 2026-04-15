"""
P0 Onboarding/Registration Bug Fixes Tests
Tests for 5 P0 bugs fixed in the onboarding/registration flow:
1. CRM Lead membership_profile maps to user membership_level on registration
2. Country dropdown on RegisterPage (already present)
3. Admission fee shows dynamic crypto conversion (BTC, ETH, USDT, USDC) from EUR reference
4. Removed 'Período de carência' from admin and onboarding
5. Fixed admin admission fees not saving (Pydantic model mismatch - now has 5 EUR fields)
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCRMLeadMembershipInheritance:
    """Test that registration inherits membership_level from CRM lead's membership_profile"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_register_inherits_vip_from_crm_lead(self, admin_token):
        """Test that registering with email matching a VIP CRM lead inherits VIP membership"""
        # First, create a CRM lead with VIP profile
        unique_email = f"test_vip_{uuid.uuid4().hex[:8]}@test.com"
        
        lead_data = {
            "name": "Test VIP Lead",
            "email": unique_email,
            "phone": "+351912345678",
            "source": "test",
            "membership_profile": "vip"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201], f"Failed to create lead: {create_response.text}"
        
        # Now register a user with the same email
        register_data = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test VIP User",
            "phone": "+351912345678",
            "country": "PT"
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data
        )
        assert register_response.status_code == 201, f"Registration failed: {register_response.text}"
        
        # Verify the user has VIP membership level
        user_data = register_response.json()
        assert "user" in user_data
        assert user_data["user"]["membership_level"] == "vip", \
            f"Expected membership_level 'vip', got '{user_data['user'].get('membership_level')}'"
        
        # Cleanup - delete the user
        user_id = user_data["user"]["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_register_inherits_premium_from_crm_lead(self, admin_token):
        """Test that registering with email matching a Premium CRM lead inherits Premium membership"""
        unique_email = f"test_premium_{uuid.uuid4().hex[:8]}@test.com"
        
        lead_data = {
            "name": "Test Premium Lead",
            "email": unique_email,
            "phone": "+351912345679",
            "source": "test",
            "membership_profile": "premium"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/crm/leads",
            json=lead_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code in [200, 201], f"Failed to create lead: {create_response.text}"
        
        register_data = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Premium User",
            "phone": "+351912345679",
            "country": "PT"
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data
        )
        assert register_response.status_code == 201, f"Registration failed: {register_response.text}"
        
        user_data = register_response.json()
        assert user_data["user"]["membership_level"] == "premium", \
            f"Expected membership_level 'premium', got '{user_data['user'].get('membership_level')}'"
        
        # Cleanup
        user_id = user_data["user"]["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_register_defaults_to_standard_without_crm_lead(self, admin_token):
        """Test that registering without a CRM lead defaults to standard membership"""
        unique_email = f"test_no_lead_{uuid.uuid4().hex[:8]}@test.com"
        
        register_data = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test No Lead User",
            "phone": "+351912345680",
            "country": "PT"
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data
        )
        assert register_response.status_code == 201, f"Registration failed: {register_response.text}"
        
        user_data = register_response.json()
        assert user_data["user"]["membership_level"] == "standard", \
            f"Expected membership_level 'standard', got '{user_data['user'].get('membership_level')}'"
        
        # Cleanup
        user_id = user_data["user"]["id"]
        requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestAdmissionFeeStatusWithCrypto:
    """Test admission fee status endpoint returns EUR amount and crypto conversions"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def test_user(self, admin_token):
        """Create a test user for admission fee testing"""
        unique_email = f"test_admission_{uuid.uuid4().hex[:8]}@test.com"
        
        register_data = {
            "email": unique_email,
            "password": "testpass123",
            "name": "Test Admission User",
            "phone": "+351912345681",
            "country": "PT"
        }
        
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=register_data
        )
        
        if register_response.status_code == 201:
            user_data = register_response.json()
            yield {
                "id": user_data["user"]["id"],
                "token": user_data["access_token"],
                "email": unique_email
            }
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/admin/users/{user_data['user']['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        else:
            pytest.skip(f"Failed to create test user: {register_response.text}")
    
    def test_admission_fee_status_returns_eur_amount(self, test_user):
        """Test that admission fee status returns eur_amount field"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/admission-fee/status/{test_user['id']}",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        assert response.status_code == 200, f"Failed to get admission fee status: {response.text}"
        data = response.json()
        
        # Should have eur_amount field
        assert "eur_amount" in data, f"Missing 'eur_amount' field in response: {data}"
        assert isinstance(data["eur_amount"], (int, float)), f"eur_amount should be numeric: {data['eur_amount']}"
    
    def test_admission_fee_status_returns_crypto_amounts(self, test_user):
        """Test that admission fee status returns crypto_amounts with BTC, ETH, USDT, USDC"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/admission-fee/status/{test_user['id']}",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        assert response.status_code == 200, f"Failed to get admission fee status: {response.text}"
        data = response.json()
        
        # Should have crypto_amounts field
        assert "crypto_amounts" in data, f"Missing 'crypto_amounts' field in response: {data}"
        
        crypto_amounts = data["crypto_amounts"]
        assert isinstance(crypto_amounts, dict), f"crypto_amounts should be a dict: {crypto_amounts}"
        
        # Should have all 4 crypto currencies
        expected_cryptos = ["BTC", "ETH", "USDT", "USDC"]
        for crypto in expected_cryptos:
            assert crypto in crypto_amounts, f"Missing '{crypto}' in crypto_amounts: {crypto_amounts}"
            assert isinstance(crypto_amounts[crypto], (int, float)), \
                f"{crypto} amount should be numeric: {crypto_amounts[crypto]}"
    
    def test_admission_fee_status_returns_membership_level(self, test_user):
        """Test that admission fee status returns membership_level"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/admission-fee/status/{test_user['id']}",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        assert response.status_code == 200, f"Failed to get admission fee status: {response.text}"
        data = response.json()
        
        assert "membership_level" in data, f"Missing 'membership_level' field in response: {data}"


class TestAdminAdmissionFeeSettings:
    """Test admin admission fee settings with 5 EUR-only profiles"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_admission_fee_settings_has_5_profiles(self, admin_token):
        """Test that GET settings returns 5 EUR profile fields"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        assert "admission_fee" in data, f"Missing 'admission_fee' in response: {data}"
        admission_fee = data["admission_fee"]
        
        # Should have 5 EUR fields
        expected_fields = ["broker_eur", "standard_eur", "premium_eur", "vip_eur", "institucional_eur"]
        for field in expected_fields:
            assert field in admission_fee, f"Missing '{field}' in admission_fee: {admission_fee}"
            assert isinstance(admission_fee[field], (int, float)), \
                f"{field} should be numeric: {admission_fee[field]}"
        
        # Should have is_active field
        assert "is_active" in admission_fee, f"Missing 'is_active' in admission_fee: {admission_fee}"
    
    def test_update_admission_fee_settings_accepts_5_profiles(self, admin_token):
        """Test that PUT admission-fee accepts 5 EUR profile fields"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/referrals/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_settings = get_response.json().get("admission_fee", {})
        
        # Update with new values
        new_settings = {
            "broker_eur": 0,
            "standard_eur": 600,  # Changed from default
            "premium_eur": 2600,  # Changed from default
            "vip_eur": 10100,     # Changed from default
            "institucional_eur": 25100,  # Changed from default
            "is_active": True
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/referrals/settings/admission-fee",
            json=new_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert update_response.status_code == 200, f"Failed to update admission fee: {update_response.text}"
        
        # Verify the update was saved
        verify_response = requests.get(
            f"{BASE_URL}/api/referrals/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert verify_response.status_code == 200
        updated_settings = verify_response.json().get("admission_fee", {})
        
        assert updated_settings["standard_eur"] == 600, \
            f"standard_eur not updated: {updated_settings['standard_eur']}"
        assert updated_settings["premium_eur"] == 2600, \
            f"premium_eur not updated: {updated_settings['premium_eur']}"
        
        # Restore original settings
        restore_settings = {
            "broker_eur": original_settings.get("broker_eur", 0),
            "standard_eur": original_settings.get("standard_eur", 500),
            "premium_eur": original_settings.get("premium_eur", 2500),
            "vip_eur": original_settings.get("vip_eur", 10000),
            "institucional_eur": original_settings.get("institucional_eur", 25000),
            "is_active": original_settings.get("is_active", True)
        }
        requests.put(
            f"{BASE_URL}/api/referrals/settings/admission-fee",
            json=restore_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admission_fee_settings_no_grace_period_field(self, admin_token):
        """Test that admission fee settings do NOT have grace_period field"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        admission_fee = data.get("admission_fee", {})
        
        # Should NOT have grace_period or periodo_carencia fields
        assert "grace_period" not in admission_fee, \
            f"grace_period should be removed from admission_fee: {admission_fee}"
        assert "grace_period_days" not in admission_fee, \
            f"grace_period_days should be removed from admission_fee: {admission_fee}"
        assert "periodo_carencia" not in admission_fee, \
            f"periodo_carencia should be removed from admission_fee: {admission_fee}"


class TestExistingVIPUser:
    """Test the existing testvip@test.com user created during backend testing"""
    
    def test_testvip_user_has_vip_membership(self):
        """Test that testvip@test.com has VIP membership level"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvip@test.com",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        
        # User may or may not exist, skip if not found
        if response.status_code != 200:
            pytest.skip("testvip@test.com user not found or login failed")
        
        data = response.json()
        assert "user" in data
        assert data["user"]["membership_level"] == "vip", \
            f"Expected membership_level 'vip', got '{data['user'].get('membership_level')}'"
    
    def test_testvip_admission_fee_status(self):
        """Test admission fee status for VIP user shows VIP tier amount"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvip@test.com",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        
        if login_response.status_code != 200:
            pytest.skip("testvip@test.com user not found or login failed")
        
        data = login_response.json()
        user_id = data["user"]["id"]
        token = data["access_token"]
        
        # Get admission fee status
        fee_response = requests.get(
            f"{BASE_URL}/api/referrals/admission-fee/status/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert fee_response.status_code == 200, f"Failed to get admission fee status: {fee_response.text}"
        fee_data = fee_response.json()
        
        # Should show VIP membership level
        assert fee_data.get("membership_level") == "vip", \
            f"Expected membership_level 'vip', got '{fee_data.get('membership_level')}'"
        
        # Should have crypto amounts
        if not fee_data.get("paid", False):
            assert "crypto_amounts" in fee_data, f"Missing crypto_amounts: {fee_data}"
            assert "eur_amount" in fee_data, f"Missing eur_amount: {fee_data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
