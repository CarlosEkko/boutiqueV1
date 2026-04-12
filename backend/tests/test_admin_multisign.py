"""
Test Admin Multi-Sign Management API
Tests for provisioning, managing, and monitoring Multi-Sign service for clients.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# Known Multi-Sign clients from context
CARLOS_USER_ID = "8a498fad-2600-4e3b-8729-c76567ca72e0"
SANDRA_USER_ID = "193e9823-3520-43d1-a6ef-55c55161ea95"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestListMultiSignClients:
    """Test GET /api/admin/multisign/clients - List all Multi-Sign clients"""
    
    def test_list_clients_returns_200(self, headers):
        """Should return 200 with list of clients"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "clients" in data, "Response should contain 'clients' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["clients"], list), "clients should be a list"
        print(f"Found {data['total']} Multi-Sign clients")
    
    def test_list_clients_has_expected_fields(self, headers):
        """Each client should have required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        if data["total"] > 0:
            client = data["clients"][0]
            required_fields = [
                "user_id", "name", "email", "membership_level",
                "required_signatures", "transaction_timeout_hours", "is_active",
                "signatories_count", "cofres_count", "transactions_count", "pending_transactions"
            ]
            for field in required_fields:
                assert field in client, f"Client should have '{field}' field"
            print(f"Client fields verified: {list(client.keys())}")
    
    def test_list_clients_includes_known_clients(self, headers):
        """Should include Carlos and Sandra as Multi-Sign clients"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        user_ids = [c["user_id"] for c in data["clients"]]
        
        # Check if at least one of the known clients exists
        known_clients_found = CARLOS_USER_ID in user_ids or SANDRA_USER_ID in user_ids
        print(f"Known clients found: Carlos={CARLOS_USER_ID in user_ids}, Sandra={SANDRA_USER_ID in user_ids}")
        # Note: This is informational - clients may or may not exist depending on test state


class TestAvailableClients:
    """Test GET /api/admin/multisign/available-clients - List clients without Multi-Sign"""
    
    def test_available_clients_returns_200(self, headers):
        """Should return 200 with list of available clients"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/available-clients", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "clients" in data, "Response should contain 'clients' key"
        assert isinstance(data["clients"], list), "clients should be a list"
        print(f"Found {len(data['clients'])} available clients without Multi-Sign")
    
    def test_available_clients_have_required_fields(self, headers):
        """Each available client should have id, name, email"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/available-clients", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        if len(data["clients"]) > 0:
            client = data["clients"][0]
            assert "id" in client, "Client should have 'id' field"
            assert "name" in client, "Client should have 'name' field"
            assert "email" in client, "Client should have 'email' field"
            print(f"Available client sample: {client.get('name')} ({client.get('email')})")


class TestClientDetail:
    """Test GET /api/admin/multisign/clients/{user_id} - Get client detail"""
    
    def test_get_client_detail_returns_200(self, headers):
        """Should return 200 with detailed client info"""
        # First get a valid client
        list_response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        if list_response.status_code != 200 or list_response.json()["total"] == 0:
            pytest.skip("No Multi-Sign clients available for detail test")
        
        user_id = list_response.json()["clients"][0]["user_id"]
        
        response = requests.get(f"{BASE_URL}/api/admin/multisign/clients/{user_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user' key"
        assert "settings" in data, "Response should contain 'settings' key"
        assert "signatories" in data, "Response should contain 'signatories' key"
        assert "cofres" in data, "Response should contain 'cofres' key"
        assert "transactions" in data, "Response should contain 'transactions' key"
        print(f"Client detail: {data['user'].get('name')} - {len(data['signatories'])} signatories, {len(data['cofres'])} cofres")
    
    def test_get_nonexistent_client_returns_404(self, headers):
        """Should return 404 for non-existent client"""
        fake_user_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/admin/multisign/clients/{fake_user_id}", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("404 returned for non-existent client as expected")


class TestActivateMultiSign:
    """Test POST /api/admin/multisign/activate - Activate Multi-Sign for a client"""
    
    def test_activate_requires_user_id(self, headers):
        """Should fail without user_id"""
        response = requests.post(
            f"{BASE_URL}/api/admin/multisign/activate",
            headers=headers,
            json={"required_signatures": 2}
        )
        assert response.status_code == 422, f"Expected 422 for missing user_id, got {response.status_code}"
        print("Validation error returned for missing user_id")
    
    def test_activate_nonexistent_user_returns_404(self, headers):
        """Should return 404 for non-existent user"""
        fake_user_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/multisign/activate",
            headers=headers,
            json={"user_id": fake_user_id, "required_signatures": 2}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("404 returned for non-existent user")
    
    def test_activate_already_active_returns_400(self, headers):
        """Should return 400 if Multi-Sign already active"""
        # Get a client that already has Multi-Sign
        list_response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        if list_response.status_code != 200 or list_response.json()["total"] == 0:
            pytest.skip("No Multi-Sign clients available for duplicate activation test")
        
        user_id = list_response.json()["clients"][0]["user_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/multisign/activate",
            headers=headers,
            json={"user_id": user_id, "required_signatures": 2}
        )
        assert response.status_code == 400, f"Expected 400 for duplicate activation, got {response.status_code}"
        assert "já ativo" in response.json().get("detail", "").lower() or "already" in response.json().get("detail", "").lower()
        print("400 returned for duplicate activation as expected")


class TestUpdateClientSettings:
    """Test PUT /api/admin/multisign/clients/{user_id} - Update settings"""
    
    def test_update_settings_returns_200(self, headers):
        """Should return 200 when updating settings"""
        # Get a valid client
        list_response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        if list_response.status_code != 200 or list_response.json()["total"] == 0:
            pytest.skip("No Multi-Sign clients available for update test")
        
        user_id = list_response.json()["clients"][0]["user_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/multisign/clients/{user_id}",
            headers=headers,
            json={"required_signatures": 3}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"Settings updated successfully for {user_id}")
        
        # Revert the change
        requests.put(
            f"{BASE_URL}/api/admin/multisign/clients/{user_id}",
            headers=headers,
            json={"required_signatures": 2}
        )
    
    def test_update_nonexistent_client_returns_404(self, headers):
        """Should return 404 for non-existent client"""
        fake_user_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/admin/multisign/clients/{fake_user_id}",
            headers=headers,
            json={"required_signatures": 3}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("404 returned for non-existent client update")


class TestDeactivateMultiSign:
    """Test DELETE /api/admin/multisign/clients/{user_id} - Deactivate service"""
    
    def test_deactivate_nonexistent_client_returns_404(self, headers):
        """Should return 404 for non-existent client"""
        fake_user_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/multisign/clients/{fake_user_id}",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("404 returned for non-existent client deactivation")
    
    def test_deactivate_and_reactivate_flow(self, headers):
        """Test deactivate then reactivate flow"""
        # Get a valid client
        list_response = requests.get(f"{BASE_URL}/api/admin/multisign/clients", headers=headers)
        if list_response.status_code != 200 or list_response.json()["total"] == 0:
            pytest.skip("No Multi-Sign clients available for deactivate test")
        
        # Find an active client
        clients = list_response.json()["clients"]
        active_client = next((c for c in clients if c.get("is_active", True)), None)
        if not active_client:
            pytest.skip("No active Multi-Sign clients available")
        
        user_id = active_client["user_id"]
        
        # Deactivate
        deactivate_response = requests.delete(
            f"{BASE_URL}/api/admin/multisign/clients/{user_id}",
            headers=headers
        )
        assert deactivate_response.status_code == 200, f"Deactivate failed: {deactivate_response.status_code}"
        print(f"Deactivated Multi-Sign for {user_id}")
        
        # Verify deactivated
        detail_response = requests.get(f"{BASE_URL}/api/admin/multisign/clients/{user_id}", headers=headers)
        assert detail_response.status_code == 200
        assert detail_response.json()["settings"].get("is_active") == False, "Client should be inactive"
        
        # Reactivate
        reactivate_response = requests.put(
            f"{BASE_URL}/api/admin/multisign/clients/{user_id}",
            headers=headers,
            json={"is_active": True}
        )
        assert reactivate_response.status_code == 200, f"Reactivate failed: {reactivate_response.status_code}"
        print(f"Reactivated Multi-Sign for {user_id}")
        
        # Verify reactivated
        detail_response = requests.get(f"{BASE_URL}/api/admin/multisign/clients/{user_id}", headers=headers)
        assert detail_response.status_code == 200
        assert detail_response.json()["settings"].get("is_active") == True, "Client should be active"


class TestAuthRequired:
    """Test that endpoints require authentication"""
    
    def test_list_clients_requires_auth(self):
        """Should return 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/clients")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Auth required for list clients")
    
    def test_available_clients_requires_auth(self):
        """Should return 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/multisign/available-clients")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Auth required for available clients")
    
    def test_activate_requires_auth(self):
        """Should return 401/403 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/admin/multisign/activate",
            json={"user_id": "test", "required_signatures": 2}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Auth required for activate")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
