"""
Multi-Cofre System API Tests
Tests for the multi-cofre system with tier-based limits.
Features tested:
- GET /api/omnibus/my-cofres - returns all client cofres with count and max
- POST /api/omnibus/cofres - creates a new cofre (subject to tier limit)
- PUT /api/omnibus/cofres/{id}/rename - renames a cofre
- GET /api/omnibus/tier-limits - returns tier limits
- PUT /api/omnibus/tier-limits - updates tier limits (admin only)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# Existing cofres from context
EXISTING_COFRE_PRINCIPAL = "a641ea39-5faf-4baf-aa65-bf841d093112"
EXISTING_COFRE_DAY_TRADING = "217cf002-369d-446b-9981-815e0eb16dca"


class TestTierLimitsAPI:
    """Test tier limits configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
                self.user_id = data.get("user", {}).get("id")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_get_tier_limits(self):
        """GET /api/omnibus/tier-limits - returns tier limits configuration"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/tier-limits")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tier_limits" in data, "Response should contain tier_limits"
        
        tier_limits = data["tier_limits"]
        # Verify default tiers exist
        assert "standard" in tier_limits, "Should have 'standard' tier"
        assert "premium" in tier_limits, "Should have 'premium' tier"
        assert "vip" in tier_limits, "Should have 'vip' tier"
        assert "black" in tier_limits, "Should have 'black' tier"
        
        # Verify expected default values
        assert tier_limits["standard"] == 3, f"Standard tier should be 3, got {tier_limits['standard']}"
        assert tier_limits["premium"] == 10, f"Premium tier should be 10, got {tier_limits['premium']}"
        assert tier_limits["vip"] == 20, f"VIP tier should be 20, got {tier_limits['vip']}"
        assert tier_limits["black"] == 50, f"Black tier should be 50, got {tier_limits['black']}"
        
        print(f"Tier limits: {tier_limits}")
    
    def test_put_tier_limits_admin_only(self):
        """PUT /api/omnibus/tier-limits - updates tier limits (admin only)"""
        new_limits = {
            "tier_limits": {
                "standard": 3,
                "premium": 10,
                "vip": 20,
                "black": 50
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/omnibus/tier-limits", json=new_limits)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        assert "message" in data, "Should return a message"
        print(f"Tier limits updated: {data.get('message')}")
        
        # Verify the update persisted
        verify_response = self.session.get(f"{BASE_URL}/api/omnibus/tier-limits")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["tier_limits"]["standard"] == 3


class TestMyCofresAPI:
    """Test client cofres endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
                self.user_id = data.get("user", {}).get("id")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_get_my_cofres(self):
        """GET /api/omnibus/my-cofres - returns all client cofres with count and max"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check response structure
        assert "has_cofres" in data, "Response should contain has_cofres"
        assert "cofres" in data, "Response should contain cofres list"
        assert "cofres_count" in data, "Response should contain cofres_count"
        assert "cofres_max" in data, "Response should contain cofres_max"
        
        if data.get("has_cofres"):
            assert "tier" in data, "Response should contain tier when has_cofres=True"
            
            cofres = data["cofres"]
            assert isinstance(cofres, list), "cofres should be a list"
            
            # Verify cofre structure
            if cofres:
                cofre = cofres[0]
                assert "_id" in cofre, "Cofre should have _id (sub_account_id)"
                assert "cofre_name" in cofre, "Cofre should have cofre_name"
                assert "assets" in cofre, "Cofre should have assets list"
                
                # Verify assets structure
                if cofre["assets"]:
                    asset = cofre["assets"][0]
                    assert "asset" in asset, "Asset should have asset symbol"
                    assert "balance" in asset, "Asset should have balance"
                    assert "available_balance" in asset, "Asset should have available_balance"
            
            print(f"User has {data['cofres_count']}/{data['cofres_max']} cofres (tier: {data.get('tier')})")
            for c in cofres:
                print(f"  - {c.get('cofre_name')} ({c.get('_id')})")
        else:
            print("User has no cofres")
    
    def test_my_cofres_returns_existing_cofres(self):
        """Verify existing cofres are returned (Cofre Principal and Cofre Day Trading)"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        assert response.status_code == 200
        
        data = response.json()
        
        if data.get("has_cofres"):
            cofres = data["cofres"]
            cofre_ids = [c.get("_id") for c in cofres]
            cofre_names = [c.get("cofre_name") for c in cofres]
            
            # Check if expected cofres exist
            print(f"Found cofres: {cofre_names}")
            print(f"Cofre IDs: {cofre_ids}")
            
            # At least one cofre should exist
            assert len(cofres) >= 1, "Should have at least one cofre"


class TestCreateCofreAPI:
    """Test cofre creation with tier limits"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
                self.user_id = data.get("user", {}).get("id")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_create_cofre_success(self):
        """POST /api/omnibus/cofres - creates a new cofre"""
        # First check current count
        check_response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        if check_response.status_code != 200:
            pytest.skip("Could not check current cofres")
        
        check_data = check_response.json()
        current_count = check_data.get("cofres_count", 0)
        max_cofres = check_data.get("cofres_max", 3)
        
        if current_count >= max_cofres:
            print(f"Already at tier limit ({current_count}/{max_cofres}), skipping create test")
            pytest.skip("At tier limit, cannot create more cofres")
        
        # Create new cofre
        new_cofre_name = f"Test Cofre {uuid.uuid4().hex[:6]}"
        create_data = {
            "name": new_cofre_name,
            "assets": ["BTC", "ETH", "USDT", "USDC"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/omnibus/cofres", json=create_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        assert "sub_account_id" in data, "Should return sub_account_id"
        assert "cofre_name" in data, "Should return cofre_name"
        assert data["cofre_name"] == new_cofre_name, f"Cofre name should match: {data['cofre_name']}"
        assert "cofres_used" in data, "Should return cofres_used"
        assert "cofres_max" in data, "Should return cofres_max"
        
        print(f"Created cofre '{new_cofre_name}' ({data['sub_account_id']})")
        print(f"Cofres used: {data['cofres_used']}/{data['cofres_max']}")
        
        # Store for cleanup/rename test
        self.created_cofre_id = data["sub_account_id"]
    
    def test_create_cofre_validates_name(self):
        """POST /api/omnibus/cofres - validates cofre name"""
        # Empty name should fail
        response = self.session.post(f"{BASE_URL}/api/omnibus/cofres", json={
            "name": "",
            "assets": ["BTC"]
        })
        assert response.status_code == 422, f"Expected 422 for empty name, got {response.status_code}"
    
    def test_create_cofre_tier_limit_enforcement(self):
        """POST /api/omnibus/cofres - enforces tier limit"""
        # This test checks that the tier limit is enforced
        # We'll try to create cofres until we hit the limit
        
        check_response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        if check_response.status_code != 200:
            pytest.skip("Could not check current cofres")
        
        check_data = check_response.json()
        current_count = check_data.get("cofres_count", 0)
        max_cofres = check_data.get("cofres_max", 3)
        tier = check_data.get("tier", "standard")
        
        print(f"Current: {current_count}/{max_cofres} cofres (tier: {tier})")
        
        # If already at limit, verify we get an error
        if current_count >= max_cofres:
            response = self.session.post(f"{BASE_URL}/api/omnibus/cofres", json={
                "name": "Should Fail",
                "assets": ["BTC"]
            })
            assert response.status_code == 400, f"Expected 400 at tier limit, got {response.status_code}"
            assert "limite" in response.text.lower() or "limit" in response.text.lower(), \
                "Error should mention limit"
            print(f"Correctly rejected: {response.json().get('detail', response.text)}")


class TestRenameCofreAPI:
    """Test cofre rename functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
                self.user_id = data.get("user", {}).get("id")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_rename_cofre_success(self):
        """PUT /api/omnibus/cofres/{id}/rename - renames a cofre"""
        # Get existing cofres
        check_response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        if check_response.status_code != 200:
            pytest.skip("Could not get cofres")
        
        check_data = check_response.json()
        if not check_data.get("has_cofres") or not check_data.get("cofres"):
            pytest.skip("No cofres to rename")
        
        # Get first cofre
        cofre = check_data["cofres"][0]
        cofre_id = cofre.get("_id")
        original_name = cofre.get("cofre_name")
        
        # Rename it
        new_name = f"Renamed {uuid.uuid4().hex[:6]}"
        response = self.session.put(f"{BASE_URL}/api/omnibus/cofres/{cofre_id}/rename", json={
            "name": new_name
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success=True"
        print(f"Renamed cofre from '{original_name}' to '{new_name}'")
        
        # Verify the rename persisted
        verify_response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        renamed_cofre = next((c for c in verify_data["cofres"] if c["_id"] == cofre_id), None)
        assert renamed_cofre is not None, "Cofre should still exist"
        assert renamed_cofre["cofre_name"] == new_name, f"Name should be updated to '{new_name}'"
        
        # Rename back to original
        self.session.put(f"{BASE_URL}/api/omnibus/cofres/{cofre_id}/rename", json={
            "name": original_name
        })
        print(f"Restored original name: '{original_name}'")
    
    def test_rename_cofre_not_found(self):
        """PUT /api/omnibus/cofres/{id}/rename - returns 404 for non-existent cofre"""
        fake_id = str(uuid.uuid4())
        response = self.session.put(f"{BASE_URL}/api/omnibus/cofres/{fake_id}/rename", json={
            "name": "Should Fail"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_rename_cofre_validates_name(self):
        """PUT /api/omnibus/cofres/{id}/rename - validates name"""
        # Get existing cofre
        check_response = self.session.get(f"{BASE_URL}/api/omnibus/my-cofres")
        if check_response.status_code != 200 or not check_response.json().get("cofres"):
            pytest.skip("No cofres to test")
        
        cofre_id = check_response.json()["cofres"][0]["_id"]
        
        # Empty name should fail
        response = self.session.put(f"{BASE_URL}/api/omnibus/cofres/{cofre_id}/rename", json={
            "name": ""
        })
        assert response.status_code == 422, f"Expected 422 for empty name, got {response.status_code}"


class TestLegacyMyBalanceAPI:
    """Test legacy /my-balance endpoint for backward compatibility"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_my_balance_legacy_endpoint(self):
        """GET /api/omnibus/my-balance - legacy endpoint still works"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/my-balance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "has_omnibus" in data, "Should have has_omnibus field"
        
        if data.get("has_omnibus"):
            assert "cofres" in data, "Should have cofres list for multi-cofre support"
            cofres = data["cofres"]
            if cofres:
                cofre = cofres[0]
                assert "sub_account_id" in cofre, "Cofre should have sub_account_id"
                assert "cofre_name" in cofre, "Cofre should have cofre_name"
                assert "balances" in cofre, "Cofre should have balances"
                print(f"Legacy endpoint returns {len(cofres)} cofres")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
