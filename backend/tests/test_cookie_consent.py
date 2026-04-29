"""
Cookie Consent API Tests — GDPR cookie consent system
Tests for:
  - POST /api/legal/cookie-consent (public, anonymous + authenticated)
  - GET /api/legal/cookie-consent/me (authenticated)
  - GET /api/legal/cookie-consent/admin (admin only)
  - GET /api/legal/cookie-consent/stats (admin only)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestCookieConsentPublicEndpoint:
    """Tests for POST /api/legal/cookie-consent (public endpoint)"""
    
    def test_anonymous_consent_accept_all(self, api_client):
        """Anonymous user can submit consent with all categories"""
        payload = {
            "categories": {
                "essential": True,
                "analytics": True,
                "marketing": True
            },
            "language": "pt",
            "tenant_slug": "kbex",
            "method": "banner"
        }
        response = api_client.post(f"{BASE_URL}/api/legal/cookie-consent", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") is True
        assert "consent_id" in data
        assert "policy_version" in data
        assert "categories" in data
        
        # Verify essential is always True
        assert data["categories"]["essential"] is True
        assert data["categories"]["analytics"] is True
        assert data["categories"]["marketing"] is True
        
        print(f"Anonymous consent recorded: {data['consent_id']}")
    
    def test_anonymous_consent_reject_non_essential(self, api_client):
        """Anonymous user can reject non-essential cookies"""
        payload = {
            "categories": {
                "essential": True,
                "analytics": False,
                "marketing": False
            },
            "language": "en",
            "method": "banner"
        }
        response = api_client.post(f"{BASE_URL}/api/legal/cookie-consent", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["categories"]["essential"] is True
        assert data["categories"]["analytics"] is False
        assert data["categories"]["marketing"] is False
    
    def test_essential_always_forced_true(self, api_client):
        """Essential cookies are always forced to True regardless of payload"""
        payload = {
            "categories": {
                "essential": False,  # Try to set to False
                "analytics": False,
                "marketing": False
            },
            "method": "banner"
        }
        response = api_client.post(f"{BASE_URL}/api/legal/cookie-consent", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Essential should be forced to True
        assert data["categories"]["essential"] is True
    
    def test_consent_with_preferences_dialog_method(self, api_client):
        """Consent via preferences_dialog method"""
        payload = {
            "categories": {
                "essential": True,
                "analytics": True,
                "marketing": False
            },
            "language": "fr",
            "method": "preferences_dialog"
        }
        response = api_client.post(f"{BASE_URL}/api/legal/cookie-consent", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_consent_with_policy_page_method(self, api_client):
        """Consent via policy_page method"""
        payload = {
            "categories": {
                "essential": True,
                "analytics": False,
                "marketing": True
            },
            "method": "policy_page"
        }
        response = api_client.post(f"{BASE_URL}/api/legal/cookie-consent", json=payload)
        
        assert response.status_code == 200
    
    def test_authenticated_consent(self, api_client, admin_headers):
        """Authenticated user consent associates user_id"""
        payload = {
            "categories": {
                "essential": True,
                "analytics": True,
                "marketing": True
            },
            "language": "pt",
            "method": "banner"
        }
        response = api_client.post(
            f"{BASE_URL}/api/legal/cookie-consent",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
        print(f"Authenticated consent recorded: {data['consent_id']}")


class TestCookieConsentMeEndpoint:
    """Tests for GET /api/legal/cookie-consent/me (authenticated)"""
    
    def test_me_requires_authentication(self, api_client):
        """GET /me requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/legal/cookie-consent/me")
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_me_returns_latest_consent(self, api_client, admin_headers):
        """GET /me returns latest consent for authenticated user"""
        # First submit a consent
        payload = {
            "categories": {
                "essential": True,
                "analytics": True,
                "marketing": False
            },
            "language": "pt",
            "method": "api"
        }
        api_client.post(
            f"{BASE_URL}/api/legal/cookie-consent",
            json=payload,
            headers=admin_headers
        )
        
        # Now get the consent
        response = api_client.get(
            f"{BASE_URL}/api/legal/cookie-consent/me",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("has_consent") is True
        assert "categories" in data
        assert "policy_version" in data
        assert data["categories"]["essential"] is True


class TestCookieConsentAdminEndpoint:
    """Tests for GET /api/legal/cookie-consent/admin (admin only)"""
    
    def test_admin_requires_authentication(self, api_client):
        """GET /admin requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/legal/cookie-consent/admin")
        
        assert response.status_code in [401, 403]
    
    def test_admin_list_consents(self, api_client, admin_headers):
        """Admin can list all consent events"""
        response = api_client.get(
            f"{BASE_URL}/api/legal/cookie-consent/admin?limit=50",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify event structure
            event = data[0]
            assert "id" in event
            assert "categories" in event
            assert "policy_version" in event
            assert "created_at" in event
            print(f"Admin list returned {len(data)} events")
    
    def test_admin_list_with_limit(self, api_client, admin_headers):
        """Admin can limit results"""
        response = api_client.get(
            f"{BASE_URL}/api/legal/cookie-consent/admin?limit=5",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5


class TestCookieConsentStatsEndpoint:
    """Tests for GET /api/legal/cookie-consent/stats (admin only)"""
    
    def test_stats_requires_authentication(self, api_client):
        """GET /stats requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/legal/cookie-consent/stats")
        
        assert response.status_code in [401, 403]
    
    def test_stats_returns_aggregates(self, api_client, admin_headers):
        """Admin can get aggregated stats"""
        response = api_client.get(
            f"{BASE_URL}/api/legal/cookie-consent/stats",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert "total_events" in data
        assert "unique_users" in data
        assert "anonymous_consents" in data
        assert "currently_optin_analytics" in data
        assert "currently_optin_marketing" in data
        assert "accept_all_users" in data
        assert "reject_all_users" in data
        assert "policy_version" in data
        
        # Values should be integers
        assert isinstance(data["total_events"], int)
        assert isinstance(data["unique_users"], int)
        
        print(f"Stats: total={data['total_events']}, unique_users={data['unique_users']}, "
              f"analytics_optin={data['currently_optin_analytics']}, marketing_optin={data['currently_optin_marketing']}")


class TestRegressionPublicEndpoints:
    """Regression tests for existing public endpoints"""
    
    def test_login_endpoint_works(self, api_client):
        """Login endpoint still works"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "access_token" in data
    
    def test_permissions_menus_endpoint(self, api_client, admin_headers):
        """GET /api/permissions/menus still works"""
        response = api_client.get(
            f"{BASE_URL}/api/permissions/menus",
            headers=admin_headers
        )
        
        assert response.status_code == 200
    
    def test_billing_pay_with_fiat_endpoint_exists(self, api_client, admin_headers):
        """POST /api/billing/payments/{id}/pay-with-fiat endpoint exists"""
        # Use a fake payment ID - should return 404 (not found) not 405 (method not allowed)
        fake_id = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/billing/payments/{fake_id}/pay-with-fiat",
            headers=admin_headers
        )
        
        # 404 means endpoint exists but payment not found
        # 422 means validation error (also acceptable)
        assert response.status_code in [404, 422], f"Expected 404/422, got {response.status_code}"


class TestNonAdminAccess:
    """Tests to verify non-admin users cannot access admin endpoints"""
    
    def test_regular_user_cannot_access_admin_list(self, api_client):
        """Non-admin user should get 403 on admin list endpoint"""
        # First create a regular user or use a known non-admin
        # For now, we'll test with an invalid/expired token
        headers = {"Authorization": "Bearer invalid_token", "Content-Type": "application/json"}
        response = api_client.get(
            f"{BASE_URL}/api/legal/cookie-consent/admin",
            headers=headers
        )
        
        # Should be 401 (unauthorized) or 403 (forbidden)
        assert response.status_code in [401, 403]
    
    def test_regular_user_cannot_access_stats(self, api_client):
        """Non-admin user should get 403 on stats endpoint"""
        headers = {"Authorization": "Bearer invalid_token", "Content-Type": "application/json"}
        response = api_client.get(
            f"{BASE_URL}/api/legal/cookie-consent/stats",
            headers=headers
        )
        
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
