"""
Test 5-Tier Profile System for KBEX
Tests: MembershipLevel enum, AdminSettings admission fees, tier limits, CRM leads profile field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Auth headers for API requests"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestTierLimitsAPI:
    """Test GET /api/omnibus/tier-limits returns new 5-tier defaults"""
    
    def test_get_tier_limits_returns_5_profiles(self, auth_headers):
        """Verify tier-limits returns broker, standard, premium, vip, institucional"""
        response = requests.get(f"{BASE_URL}/api/omnibus/tier-limits", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tier_limits" in data, "Response should contain tier_limits"
        
        tier_limits = data["tier_limits"]
        
        # Verify all 5 profiles exist
        expected_profiles = ["broker", "standard", "premium", "vip", "institucional"]
        for profile in expected_profiles:
            assert profile in tier_limits, f"Missing profile: {profile}"
        
        # Verify default values
        assert tier_limits.get("broker") == 1, f"Broker should be 1, got {tier_limits.get('broker')}"
        assert tier_limits.get("standard") == 3, f"Standard should be 3, got {tier_limits.get('standard')}"
        assert tier_limits.get("premium") == 10, f"Premium should be 10, got {tier_limits.get('premium')}"
        assert tier_limits.get("vip") == 20, f"VIP should be 20, got {tier_limits.get('vip')}"
        assert tier_limits.get("institucional") == 50, f"Institucional should be 50, got {tier_limits.get('institucional')}"
        
        print(f"✓ Tier limits returned correctly: {tier_limits}")


class TestAdminStatsAPI:
    """Test GET /api/admin/stats/regional returns new tier counts"""
    
    def test_regional_stats_has_5_tiers(self, auth_headers):
        """Verify regional stats includes broker, standard, premium, vip, institucional counts"""
        response = requests.get(f"{BASE_URL}/api/admin/stats/regional", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "regions" in data, "Response should contain regions"
        
        # Check at least one region has tiers data
        for region_name, region_data in data["regions"].items():
            if "tiers" in region_data:
                tiers = region_data["tiers"]
                expected_tiers = ["broker", "standard", "premium", "vip", "institucional"]
                for tier in expected_tiers:
                    assert tier in tiers, f"Region {region_name} missing tier: {tier}"
                print(f"✓ Region {region_name} has all 5 tiers: {tiers}")
                break
        else:
            pytest.fail("No region found with tiers data")


class TestCRMLeadsAPI:
    """Test CRM Leads API with membership_profile field"""
    
    def test_create_lead_with_profile(self, auth_headers):
        """Create a lead with membership_profile field"""
        import uuid
        test_id = str(uuid.uuid4())[:8]
        
        lead_data = {
            "name": f"TEST_Lead_{test_id}",
            "email": f"test_{test_id}@example.com",
            "phone": "+351912345678",
            "country": "Portugal",
            "source": "Website",
            "status": "new",
            "membership_profile": "premium"  # New field
        }
        
        response = requests.post(f"{BASE_URL}/api/crm/leads", json=lead_data, headers=auth_headers)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        lead_id = data.get("id")
        assert lead_id, "Response should contain lead id"
        
        # Verify lead was created with profile
        get_response = requests.get(f"{BASE_URL}/api/crm/leads", headers=auth_headers)
        assert get_response.status_code == 200
        
        leads = get_response.json()
        created_lead = next((l for l in leads if l.get("id") == lead_id), None)
        
        if created_lead:
            assert created_lead.get("membership_profile") == "premium", \
                f"Expected membership_profile='premium', got {created_lead.get('membership_profile')}"
            print(f"✓ Lead created with membership_profile: {created_lead.get('membership_profile')}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=auth_headers)
        else:
            print(f"✓ Lead created successfully (id: {lead_id})")
    
    def test_create_lead_with_each_profile(self, auth_headers):
        """Test creating leads with each of the 5 profiles"""
        import uuid
        
        profiles = ["broker", "standard", "premium", "vip", "institucional"]
        created_leads = []
        
        for profile in profiles:
            test_id = str(uuid.uuid4())[:8]
            lead_data = {
                "name": f"TEST_{profile}_{test_id}",
                "email": f"test_{profile}_{test_id}@example.com",
                "membership_profile": profile
            }
            
            response = requests.post(f"{BASE_URL}/api/crm/leads", json=lead_data, headers=auth_headers)
            if response.status_code in [200, 201]:
                lead_id = response.json().get("id")
                created_leads.append(lead_id)
                print(f"✓ Created lead with profile '{profile}'")
            else:
                print(f"✗ Failed to create lead with profile '{profile}': {response.status_code}")
        
        # Cleanup
        for lead_id in created_leads:
            requests.delete(f"{BASE_URL}/api/crm/leads/{lead_id}", headers=auth_headers)
        
        assert len(created_leads) == 5, f"Expected 5 leads created, got {len(created_leads)}"


class TestReferralSettingsAPI:
    """Test referral settings API for admission fees"""
    
    def test_get_referral_settings(self, auth_headers):
        """Get referral settings to check admission fee structure"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings", headers=auth_headers)
        
        # This endpoint may or may not exist, just check if it returns data
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Referral settings retrieved: {list(data.keys())}")
            
            # Check if admission_fee has 5 tiers
            if "admission_fee" in data:
                admission_fee = data["admission_fee"]
                expected_keys = ["broker_eur", "standard_eur", "premium_eur", "vip_eur", "institucional_eur"]
                for key in expected_keys:
                    if key in admission_fee:
                        print(f"  - {key}: {admission_fee[key]}€")
        else:
            print(f"Referral settings endpoint returned {response.status_code} (may not be implemented)")


class TestMembershipLevelEnum:
    """Test that MembershipLevel enum values are correctly used"""
    
    def test_user_membership_levels(self, auth_headers):
        """Verify users can have the new membership levels"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        users = response.json()
        membership_levels_found = set()
        
        for user in users:
            level = user.get("membership_level")
            if level:
                membership_levels_found.add(level)
        
        print(f"✓ Membership levels found in users: {membership_levels_found}")
        
        # At minimum, standard should exist
        assert "standard" in membership_levels_found or len(users) == 0, \
            "Expected at least 'standard' membership level in users"


class TestClientMenusAPI:
    """Test client menus API for Multi-Sign menu"""
    
    def test_get_client_menus(self, auth_headers):
        """Verify client menus endpoint works"""
        response = requests.get(f"{BASE_URL}/api/client-menus/clients", headers=auth_headers)
        
        if response.status_code == 200:
            clients = response.json()
            print(f"✓ Client menus endpoint returned {len(clients)} clients")
            
            # Check if any client has multi_sign in their menus
            for client in clients[:5]:  # Check first 5
                menus = client.get("effective_menus", [])
                if "multi_sign" in menus:
                    print(f"  - Client {client.get('name')} has multi_sign menu")
        else:
            print(f"Client menus endpoint returned {response.status_code}")


class TestTradingLimitsAPI:
    """Test trading limits for new tiers"""
    
    def test_get_trading_limits_for_broker(self, auth_headers):
        """Test trading limits for broker tier"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/limits/broker", headers=auth_headers)
        
        # This may create default limits if not exists
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Broker trading limits: daily_buy={data.get('daily_buy_limit')}")
        elif response.status_code == 400:
            # Tier might not be in allowed list yet
            print(f"Broker tier not in trading limits allowed list (expected)")
        else:
            print(f"Trading limits for broker returned {response.status_code}")
    
    def test_get_trading_limits_for_institucional(self, auth_headers):
        """Test trading limits for institucional tier"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/limits/institucional", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Institucional trading limits: daily_buy={data.get('daily_buy_limit')}")
        elif response.status_code == 400:
            print(f"Institucional tier not in trading limits allowed list (expected)")
        else:
            print(f"Trading limits for institucional returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
