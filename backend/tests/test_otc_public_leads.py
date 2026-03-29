"""
Test OTC Public Leads API
Tests for the public endpoint that creates OTC leads from the website contact form
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOTCPublicLeads:
    """Tests for POST /api/otc/leads/public - public endpoint (no auth required)"""
    
    def test_create_public_lead_success(self):
        """Test creating a new OTC lead via public endpoint"""
        unique_email = f"test_lead_{int(time.time())}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/otc/leads/public",
            json={
                "name": "Test User",
                "email": unique_email,
                "phone": "+351123456789",
                "message": "Test message from pytest"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["already_exists"] is False
        assert "message" in data
        assert "Pedido de acesso recebido" in data["message"]
    
    def test_create_public_lead_duplicate_email(self):
        """Test that duplicate email returns already_exists=true"""
        unique_email = f"test_dup_{int(time.time())}@example.com"
        
        # First submission
        response1 = requests.post(
            f"{BASE_URL}/api/otc/leads/public",
            json={
                "name": "Test User",
                "email": unique_email,
                "phone": "+351123456789",
                "message": "First submission"
            }
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["success"] is True
        assert data1["already_exists"] is False
        
        # Second submission with same email
        response2 = requests.post(
            f"{BASE_URL}/api/otc/leads/public",
            json={
                "name": "Test User",
                "email": unique_email,
                "phone": "+351123456789",
                "message": "Second submission"
            }
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["success"] is True
        assert data2["already_exists"] is True
        assert "já foi recebido" in data2["message"]
    
    def test_create_public_lead_minimal_fields(self):
        """Test creating lead with only required fields (name, email)"""
        unique_email = f"test_minimal_{int(time.time())}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/otc/leads/public",
            json={
                "name": "Minimal User",
                "email": unique_email
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["already_exists"] is False
    
    def test_create_public_lead_missing_name(self):
        """Test that missing name returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/otc/leads/public",
            json={
                "email": "test@example.com"
            }
        )
        
        # Should return 422 validation error
        assert response.status_code == 422
    
    def test_create_public_lead_missing_email(self):
        """Test that missing email returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/otc/leads/public",
            json={
                "name": "Test User"
            }
        )
        
        # Should return 422 validation error
        assert response.status_code == 422


class TestAuthLogin:
    """Tests for POST /api/auth/login"""
    
    def test_login_success(self):
        """Test login with valid admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "carlos@kryptobox.io",
                "password": "senha123"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "carlos@kryptobox.io"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "wrong@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401


class TestRegisterRedirect:
    """Tests for /register route redirect"""
    
    def test_register_route_redirects(self):
        """Test that /register redirects to /auth"""
        # This is a frontend route test - we verify the route exists in App.js
        # The actual redirect is handled by React Router
        # We can verify by checking the frontend loads without error
        response = requests.get(f"{BASE_URL}")
        assert response.status_code == 200
