"""
Iteration 38: Testing KBEX.io features
- Public lead creation endpoint POST /api/crm/leads/public
- Auth page has no register form (login only)
- Register page gate (requires ?email= param)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicLeadCreation:
    """Test public lead creation endpoint for OTC leads"""
    
    def test_public_lead_creation_success(self):
        """POST /api/crm/leads/public should create an OTC lead"""
        unique_email = f"test_lead_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Test Lead User",
            "email": unique_email,
            "phone": "+351 912 345 678",
            "country": "PT",
            "message": "I want to trade OTC"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Should return 200 or 201 on success
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have success flag
        assert data.get("success") == True, f"Expected success=True, got {data}"
        
    def test_public_lead_creation_missing_required_fields(self):
        """POST /api/crm/leads/public should fail without required fields"""
        payload = {
            "name": "Test Lead"
            # Missing email and phone
        }
        
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"

    def test_public_lead_creation_duplicate_email(self):
        """POST /api/crm/leads/public with duplicate email should handle gracefully"""
        unique_email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Test Lead User",
            "email": unique_email,
            "phone": "+351 912 345 678",
            "country": "PT"
        }
        
        # First request
        response1 = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"First request status: {response1.status_code}")
        
        # Second request with same email
        response2 = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        print(f"Second request status: {response2.status_code}")
        print(f"Second request body: {response2.text}")
        
        # Should either succeed (update existing) or return appropriate error
        # Not a 500 error
        assert response2.status_code < 500, f"Server error on duplicate: {response2.text}"


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health check status: {response.status_code}")
        assert response.status_code == 200


class TestAuthEndpoints:
    """Test auth-related endpoints"""
    
    def test_login_endpoint_exists(self):
        """POST /api/auth/login should exist"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "wrong"},
            headers={"Content-Type": "application/json"}
        )
        print(f"Login endpoint status: {response.status_code}")
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code != 404, "Login endpoint not found"
        
    def test_register_endpoint_exists(self):
        """POST /api/auth/register should exist"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test User",
                "email": "test_reg@test.com",
                "password": "test123"
            },
            headers={"Content-Type": "application/json"}
        )
        print(f"Register endpoint status: {response.status_code}")
        # Should not return 404
        assert response.status_code != 404, "Register endpoint not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
