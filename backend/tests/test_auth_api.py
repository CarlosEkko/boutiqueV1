import os
"""
Backend API Tests for Kryptobox Authentication System
Tests: Registration, Login, Get Profile (me), Update Profile
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_USER_EMAIL = f"test_user_{uuid.uuid4().hex[:8]}@kryptobox.io"
TEST_USER_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "TestPassword123")
TEST_USER_NAME = "Test User"
TEST_USER_PHONE = "+351987654321"
TEST_USER_COUNTRY = "PT"

# Store token for authenticated tests
auth_token = None
user_id = None


class TestHealthCheck:
    """Basic API health checks"""
    
    def test_api_root_endpoint(self):
        """Test the root API endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"Root endpoint response: {data}")


class TestUserRegistration:
    """Test user registration flow"""
    
    def test_register_new_user(self):
        """Test registering a new user - POST /api/auth/register"""
        global auth_token, user_id
        
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME,
            "phone": TEST_USER_PHONE,
            "country": TEST_USER_COUNTRY
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify token is returned
        assert "access_token" in data, "access_token should be in response"
        assert data["token_type"] == "bearer", "token_type should be bearer"
        
        # Verify user data
        assert "user" in data, "user object should be in response"
        user = data["user"]
        assert user["email"] == TEST_USER_EMAIL
        assert user["name"] == TEST_USER_NAME
        assert user["phone"] == TEST_USER_PHONE
        assert user["country"] == TEST_USER_COUNTRY
        assert "id" in user
        assert user["is_active"] == True
        
        # Store for later tests
        auth_token = data["access_token"]
        user_id = user["id"]
        
        print(f"User registered successfully: {user['email']}")
    
    def test_register_duplicate_email(self):
        """Test that duplicate email registration fails"""
        payload = {
            "email": TEST_USER_EMAIL,  # Same email as before
            "password": "AnotherPassword123",
            "name": "Another User",
            "phone": "+351111111111",
            "country": "BR"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400, f"Expected 400 for duplicate email, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"Duplicate email rejection message: {data['detail']}")
    
    def test_register_missing_fields(self):
        """Test registration with missing required fields"""
        payload = {
            "email": "incomplete@test.com"
            # Missing password and name
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("Missing fields validation passed")


class TestUserLogin:
    """Test user login flow"""
    
    def test_login_success(self):
        """Test successful login - POST /api/auth/login"""
        global auth_token
        
        payload = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify token is returned
        assert "access_token" in data, "access_token should be in response"
        assert data["token_type"] == "bearer"
        
        # Verify user data
        assert "user" in data
        user = data["user"]
        assert user["email"] == TEST_USER_EMAIL
        assert user["name"] == TEST_USER_NAME
        
        # Update token for subsequent tests
        auth_token = data["access_token"]
        
        print(f"Login successful for: {user['email']}")
    
    def test_login_wrong_password(self):
        """Test login with wrong password"""
        payload = {
            "email": TEST_USER_EMAIL,
            "password": "WrongPassword123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"Wrong password rejection: {data['detail']}")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        payload = {
            "email": "nonexistent@kryptobox.io",
            "password": "SomePassword123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Non-existent user login correctly rejected")


class TestGetUserProfile:
    """Test get current user profile - GET /api/auth/me"""
    
    def test_get_profile_authenticated(self):
        """Test getting profile with valid token"""
        global auth_token
        
        if not auth_token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        assert data["name"] == TEST_USER_NAME
        assert data["phone"] == TEST_USER_PHONE
        assert data["country"] == TEST_USER_COUNTRY
        assert "created_at" in data
        assert "updated_at" in data
        assert data["is_active"] == True
        
        print(f"Profile retrieved successfully: {data['email']}")
    
    def test_get_profile_no_token(self):
        """Test getting profile without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthenticated profile access correctly rejected")
    
    def test_get_profile_invalid_token(self):
        """Test getting profile with invalid token"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid token correctly rejected")


class TestUpdateUserProfile:
    """Test update user profile - PUT /api/auth/me"""
    
    def test_update_profile_name(self):
        """Test updating user's name"""
        global auth_token
        
        if not auth_token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_payload = {"name": "Updated Test User"}
        
        response = requests.put(f"{BASE_URL}/api/auth/me", json=update_payload, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "Updated Test User", "Name should be updated"
        assert data["email"] == TEST_USER_EMAIL, "Email should remain unchanged"
        
        # Verify update persisted with GET
        get_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        get_data = get_response.json()
        assert get_data["name"] == "Updated Test User", "Name update should persist"
        
        print("Name update successful and verified")
    
    def test_update_profile_phone_and_country(self):
        """Test updating phone and country"""
        global auth_token
        
        if not auth_token:
            pytest.skip("No auth token available")
        
        headers = {"Authorization": f"Bearer {auth_token}"}
        update_payload = {
            "phone": "+1234567890",
            "country": "US"
        }
        
        response = requests.put(f"{BASE_URL}/api/auth/me", json=update_payload, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["phone"] == "+1234567890"
        assert data["country"] == "US"
        
        print("Phone and country update successful")
    
    def test_update_profile_no_token(self):
        """Test updating profile without authentication"""
        update_payload = {"name": "Hacker Name"}
        
        response = requests.put(f"{BASE_URL}/api/auth/me", json=update_payload)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Unauthenticated update correctly rejected")


class TestCryptoPrices:
    """Test crypto prices endpoint"""
    
    def test_get_crypto_prices(self):
        """Test GET /api/crypto-prices"""
        response = requests.get(f"{BASE_URL}/api/crypto-prices")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "prices" in data
        assert "last_updated" in data
        assert "source" in data
        
        # Verify we get crypto prices
        assert len(data["prices"]) > 0, "Should have at least one crypto price"
        
        # Check structure of a price entry
        first_price = data["prices"][0]
        assert "symbol" in first_price
        assert "name" in first_price
        assert "price" in first_price
        assert "change_24h" in first_price
        
        print(f"Crypto prices retrieved: {len(data['prices'])} currencies")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
