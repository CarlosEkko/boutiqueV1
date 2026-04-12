"""
Test CRM Public Leads and OTC Conversion Features
Tests:
1. POST /api/crm/leads/public - Create CRM lead (no auth)
2. POST /api/crm/leads/public - Duplicate email handling
3. POST /api/crm/leads/{id}/convert-to-otc - Convert CRM lead to OTC (auth required)
4. POST /api/crm/leads/{id}/convert-to-otc - Reject duplicate OTC conversion
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestCRMPublicLeads:
    """Test public CRM lead creation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.unique_email = f"test_crm_{uuid.uuid4().hex[:8]}@example.com"
    
    def test_create_public_lead_success(self):
        """POST /api/crm/leads/public creates CRM lead without auth"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test CRM Lead",
                "email": self.unique_email,
                "phone": "+351912345678",
                "message": "Test message from website"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Expected success=true"
        assert data.get("already_exists") == False, "Expected already_exists=false for new lead"
        assert "message" in data, "Expected message in response"
        print(f"✓ Created CRM lead with email: {self.unique_email}")
    
    def test_create_public_lead_duplicate_email(self):
        """POST /api/crm/leads/public with duplicate email returns already_exists=true"""
        # First create a lead
        first_response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "First Lead",
                "email": self.unique_email,
                "phone": "+351912345678"
            }
        )
        assert first_response.status_code == 200
        
        # Try to create another lead with same email
        second_response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Second Lead",
                "email": self.unique_email,
                "phone": "+351987654321"
            }
        )
        
        assert second_response.status_code == 200, f"Expected 200, got {second_response.status_code}"
        data = second_response.json()
        
        assert data.get("success") == True, "Expected success=true"
        assert data.get("already_exists") == True, "Expected already_exists=true for duplicate"
        print(f"✓ Duplicate email correctly returns already_exists=true")
    
    def test_create_public_lead_minimal_fields(self):
        """POST /api/crm/leads/public works with only name and email"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Minimal Lead",
                "email": f"minimal_{uuid.uuid4().hex[:8]}@example.com"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        print("✓ Minimal fields (name, email) work correctly")
    
    def test_create_public_lead_missing_name(self):
        """POST /api/crm/leads/public without name returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "email": "noname@example.com"
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Missing name correctly returns 422 validation error")
    
    def test_create_public_lead_missing_email(self):
        """POST /api/crm/leads/public without email returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "No Email Lead"
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("✓ Missing email correctly returns 422 validation error")


class TestCRMLeadToOTCConversion:
    """Test CRM lead to OTC lead conversion"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        
        data = response.json()
        # Use access_token (not token)
        token = data.get("access_token")
        if not token:
            pytest.skip("No access_token in login response")
        return token
    
    @pytest.fixture
    def crm_lead_id(self, auth_token):
        """Create a CRM lead and return its ID"""
        unique_email = f"otc_convert_{uuid.uuid4().hex[:8]}@example.com"
        
        # Create via public endpoint
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "OTC Conversion Test Lead",
                "email": unique_email,
                "phone": "+351912345678",
                "message": "Test lead for OTC conversion"
            }
        )
        assert response.status_code == 200
        
        # Get the lead ID by fetching leads
        leads_response = requests.get(
            f"{BASE_URL}/api/crm/leads?search={unique_email}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert leads_response.status_code == 200
        leads = leads_response.json()
        
        if not leads:
            pytest.skip("Could not find created lead")
        
        return leads[0]["id"]
    
    def test_convert_to_otc_requires_auth(self):
        """POST /api/crm/leads/{id}/convert-to-otc requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/fake-id/convert-to-otc"
        )
        
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Convert to OTC requires authentication")
    
    def test_convert_to_otc_success(self, auth_token, crm_lead_id):
        """POST /api/crm/leads/{id}/convert-to-otc converts CRM lead to OTC lead"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/{crm_lead_id}/convert-to-otc",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=true"
        assert "message" in data, "Expected message in response"
        print(f"✓ Successfully converted CRM lead {crm_lead_id} to OTC lead")
    
    def test_convert_to_otc_duplicate_rejected(self, auth_token, crm_lead_id):
        """POST /api/crm/leads/{id}/convert-to-otc rejects duplicate OTC conversion"""
        # First conversion
        first_response = requests.post(
            f"{BASE_URL}/api/crm/leads/{crm_lead_id}/convert-to-otc",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # If first conversion fails, skip this test
        if first_response.status_code != 200:
            pytest.skip("First conversion failed, cannot test duplicate")
        
        # Second conversion should fail
        second_response = requests.post(
            f"{BASE_URL}/api/crm/leads/{crm_lead_id}/convert-to-otc",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert second_response.status_code == 400, f"Expected 400, got {second_response.status_code}"
        print("✓ Duplicate OTC conversion correctly rejected")
    
    def test_convert_nonexistent_lead(self, auth_token):
        """POST /api/crm/leads/{id}/convert-to-otc with invalid ID returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/000000000000000000000000/convert-to-otc",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Nonexistent lead returns 404")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """POST /api/auth/login with valid credentials returns access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "access_token" in data, "Expected access_token in response"
        assert "user" in data, "Expected user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly return 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
