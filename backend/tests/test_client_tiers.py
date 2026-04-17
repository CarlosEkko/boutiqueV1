"""
Test Client Tiers & Features API
Tests for:
- GET /api/client-tiers - returns seeded config with 5 tiers and 10 sections
- PUT /api/client-tiers - admin only, persists changes
- POST /api/client-tiers/reset - admin only, restores defaults
- POST /api/client-tiers/upgrade-request - any authed user, validates target_tier
- GET /api/client-tiers/upgrade-requests - admin only, returns pending requests
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def non_admin_token():
    """Create a non-admin user and get token for testing 403 responses"""
    # First try to register a test user
    test_email = "test_nonadmin_tiers@example.com"
    test_password = "TestPass123!"
    
    # Try to login first (user might already exist)
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    
    if login_resp.status_code == 200:
        data = login_resp.json()
        return data.get("access_token") or data.get("token")
    
    # Try to register
    register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": test_password,
        "name": "Test Non-Admin User",
        "user_type": "client"
    })
    
    if register_resp.status_code in [200, 201]:
        data = register_resp.json()
        return data.get("access_token") or data.get("token")
    
    # If registration failed, try login again (might have been created)
    login_resp2 = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    
    if login_resp2.status_code == 200:
        data = login_resp2.json()
        return data.get("access_token") or data.get("token")
    
    pytest.skip(f"Could not create non-admin user for testing: {register_resp.text}")


class TestGetClientTiers:
    """Tests for GET /api/client-tiers endpoint"""
    
    def test_get_tiers_returns_200(self, admin_token):
        """GET /api/client-tiers returns 200 with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_tiers_returns_5_tiers(self, admin_token):
        """Response contains exactly 5 tiers: broker, standard, premium, vip, institucional"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "tiers" in data, "Response missing 'tiers' field"
        assert len(data["tiers"]) == 5, f"Expected 5 tiers, got {len(data['tiers'])}"
        
        tier_ids = [t["id"] for t in data["tiers"]]
        expected_ids = ["broker", "standard", "premium", "vip", "institucional"]
        assert tier_ids == expected_ids, f"Tier IDs mismatch: {tier_ids} != {expected_ids}"
    
    def test_get_tiers_returns_10_sections(self, admin_token):
        """Response contains 10 section groups"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "sections" in data, "Response missing 'sections' field"
        assert len(data["sections"]) == 10, f"Expected 10 sections, got {len(data['sections'])}"
        
        section_ids = [s["id"] for s in data["sections"]]
        expected_sections = [
            "profile", "portfolio", "trading", "cold_wallet", "investments",
            "launchpad", "otc_portal", "forensic", "escrow", "multi_sign"
        ]
        assert section_ids == expected_sections, f"Section IDs mismatch: {section_ids}"
    
    def test_get_tiers_returns_current_tier(self, admin_token):
        """Response includes current_tier field"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        assert "current_tier" in data, "Response missing 'current_tier' field"
        assert data["current_tier"] in ["broker", "standard", "premium", "vip", "institucional"], \
            f"Invalid current_tier: {data['current_tier']}"
    
    def test_get_tiers_tier_has_min_allocation(self, admin_token):
        """Each tier has min_allocation field"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        for tier in data["tiers"]:
            assert "min_allocation" in tier, f"Tier {tier['id']} missing min_allocation"
            assert isinstance(tier["min_allocation"], (int, float)), \
                f"Tier {tier['id']} min_allocation should be numeric"
    
    def test_get_tiers_features_have_values(self, admin_token):
        """Each feature has values dict with all tier IDs"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        tier_ids = ["broker", "standard", "premium", "vip", "institucional"]
        
        for section in data["sections"]:
            for feature in section["features"]:
                assert "values" in feature, f"Feature {feature['id']} missing values"
                for tier_id in tier_ids:
                    assert tier_id in feature["values"], \
                        f"Feature {feature['id']} missing value for tier {tier_id}"
    
    def test_get_tiers_unauthorized(self):
        """GET /api/client-tiers without token returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/client-tiers")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"


class TestUpdateClientTiers:
    """Tests for PUT /api/client-tiers endpoint (admin only)"""
    
    def test_update_tiers_admin_success(self, admin_token):
        """Admin can update tier config"""
        # First get current config
        get_resp = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current = get_resp.json()
        
        # Modify min_allocation for broker tier
        modified_tiers = current["tiers"].copy()
        original_broker_min = modified_tiers[0]["min_allocation"]
        modified_tiers[0]["min_allocation"] = 999  # Test value
        
        # Update
        update_resp = requests.put(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"tiers": modified_tiers, "sections": current["sections"]}
        )
        
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        assert update_resp.json().get("success") == True
        
        # Verify persistence
        verify_resp = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        verify_data = verify_resp.json()
        assert verify_data["tiers"][0]["min_allocation"] == 999, "Change was not persisted"
        
        # Restore original value
        modified_tiers[0]["min_allocation"] = original_broker_min
        requests.put(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"tiers": modified_tiers, "sections": current["sections"]}
        )
    
    def test_update_tiers_non_admin_403(self, non_admin_token):
        """Non-admin user gets 403 when trying to update tiers"""
        response = requests.put(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {non_admin_token}"},
            json={"tiers": [], "sections": []}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"


class TestResetClientTiers:
    """Tests for POST /api/client-tiers/reset endpoint (admin only)"""
    
    def test_reset_tiers_admin_success(self, admin_token):
        """Admin can reset tiers to defaults"""
        response = requests.post(
            f"{BASE_URL}/api/client-tiers/reset",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json().get("success") == True
        
        # Verify defaults are restored
        verify_resp = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = verify_resp.json()
        
        # Check default broker min_allocation is 190
        broker_tier = next((t for t in data["tiers"] if t["id"] == "broker"), None)
        assert broker_tier is not None
        assert broker_tier["min_allocation"] == 190, \
            f"Expected broker min_allocation 190, got {broker_tier['min_allocation']}"
    
    def test_reset_tiers_non_admin_403(self, non_admin_token):
        """Non-admin user gets 403 when trying to reset tiers"""
        response = requests.post(
            f"{BASE_URL}/api/client-tiers/reset",
            headers={"Authorization": f"Bearer {non_admin_token}"},
            json={}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"


class TestUpgradeRequest:
    """Tests for POST /api/client-tiers/upgrade-request endpoint"""
    
    def test_upgrade_request_valid_tier(self, admin_token):
        """User can submit upgrade request with valid tier"""
        response = requests.post(
            f"{BASE_URL}/api/client-tiers/upgrade-request",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"target_tier": "vip", "message": "Test upgrade request from pytest"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "request" in data
        assert data["request"]["target_tier"] == "vip"
        assert data["request"]["status"] == "pending"
    
    def test_upgrade_request_all_valid_tiers(self, admin_token):
        """All 5 tier values are accepted"""
        valid_tiers = ["broker", "standard", "premium", "vip", "institucional"]
        
        for tier in valid_tiers:
            response = requests.post(
                f"{BASE_URL}/api/client-tiers/upgrade-request",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"target_tier": tier, "message": f"Test for {tier}"}
            )
            assert response.status_code == 200, \
                f"Tier '{tier}' should be valid, got {response.status_code}: {response.text}"
    
    def test_upgrade_request_invalid_tier(self, admin_token):
        """Invalid tier value returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/client-tiers/upgrade-request",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"target_tier": "invalid_tier", "message": "Test"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_upgrade_request_creates_notification(self, admin_token):
        """Upgrade request creates a notification for admins"""
        # Submit upgrade request
        requests.post(
            f"{BASE_URL}/api/client-tiers/upgrade-request",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"target_tier": "institucional", "message": "Notification test"}
        )
        
        # Check notifications (admin endpoint)
        notif_resp = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if notif_resp.status_code == 200:
            notifications = notif_resp.json().get("notifications", [])
            tier_notifs = [n for n in notifications if n.get("type") == "tier_upgrade_request"]
            assert len(tier_notifs) > 0, "No tier upgrade notification found"


class TestGetUpgradeRequests:
    """Tests for GET /api/client-tiers/upgrade-requests endpoint (admin only)"""
    
    def test_get_upgrade_requests_admin(self, admin_token):
        """Admin can list upgrade requests"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers/upgrade-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
    
    def test_get_upgrade_requests_non_admin_403(self, non_admin_token):
        """Non-admin user gets 403 when trying to list upgrade requests"""
        response = requests.get(
            f"{BASE_URL}/api/client-tiers/upgrade-requests",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
    
    def test_upgrade_requests_contain_required_fields(self, admin_token):
        """Upgrade requests have required fields"""
        # First create a request
        requests.post(
            f"{BASE_URL}/api/client-tiers/upgrade-request",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"target_tier": "premium", "message": "Field test"}
        )
        
        # Get requests
        response = requests.get(
            f"{BASE_URL}/api/client-tiers/upgrade-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        if len(data["requests"]) > 0:
            req = data["requests"][0]
            required_fields = ["user_id", "target_tier", "status", "created_at"]
            for field in required_fields:
                assert field in req, f"Request missing required field: {field}"


class TestDataIntegrity:
    """Tests for data integrity and persistence"""
    
    def test_update_feature_value_persists(self, admin_token):
        """Updating a feature value persists correctly"""
        # Get current config
        get_resp = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current = get_resp.json()
        
        # Modify a feature value (change support response time for VIP)
        modified_sections = current["sections"].copy()
        profile_section = next((s for s in modified_sections if s["id"] == "profile"), None)
        support_feature = next((f for f in profile_section["features"] if f["id"] == "support"), None)
        original_value = support_feature["values"]["vip"]
        support_feature["values"]["vip"] = "1h"  # Change from "até 8h" to "1h"
        
        # Update
        update_resp = requests.put(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"tiers": current["tiers"], "sections": modified_sections}
        )
        assert update_resp.status_code == 200
        
        # Verify
        verify_resp = requests.get(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        verify_data = verify_resp.json()
        profile_verify = next((s for s in verify_data["sections"] if s["id"] == "profile"), None)
        support_verify = next((f for f in profile_verify["features"] if f["id"] == "support"), None)
        
        assert support_verify["values"]["vip"] == "1h", "Feature value change was not persisted"
        
        # Restore
        support_feature["values"]["vip"] = original_value
        requests.put(
            f"{BASE_URL}/api/client-tiers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"tiers": current["tiers"], "sections": modified_sections}
        )
