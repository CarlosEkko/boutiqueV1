"""
Backend API Tests for KBEX.io RBAC (Role-Based Access Control) System
Tests: Login RBAC fields, Internal user management, Region filtering, Ticket system

Test credentials:
- Admin: carlos@kryptobox.io / senha123
- Local Manager (Europe): manager_europe@kbex.io / senha123
- Support (LATAM): support_latam@kbex.io / senha123
- Client (LATAM): maria@teste.com / senha123
- Client (Europe): sandra@kryptobox.io / senha123
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ==================== TEST CREDENTIALS ====================
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

LOCAL_MANAGER_EUROPE_EMAIL = "manager_europe@kbex.io"
LOCAL_MANAGER_EUROPE_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

SUPPORT_LATAM_EMAIL = "support_latam@kbex.io"
SUPPORT_LATAM_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

CLIENT_LATAM_EMAIL = "maria@teste.com"
CLIENT_LATAM_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

CLIENT_EUROPE_EMAIL = "sandra@kryptobox.io"
CLIENT_EUROPE_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# ==================== STORE TOKENS ====================
admin_token = None
local_manager_europe_token = None
support_latam_token = None
client_latam_token = None
client_europe_token = None

# Store user info
admin_user = None
local_manager_user = None
support_user = None

# Store test data
created_internal_user_id = None
latam_ticket_id = None
europe_ticket_id = None


class TestHealthCheck:
    """Basic API health checks"""
    
    def test_api_root_endpoint(self):
        """Test the root API endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"API is up: {response.json()}")


# ==================== LOGIN RBAC TESTS ====================

class TestLoginRBACFields:
    """Test that login endpoint returns proper RBAC fields: user_type, internal_role, region"""
    
    def test_admin_login_returns_rbac_fields(self):
        """Test admin login returns user_type=internal, internal_role=admin, region"""
        global admin_token, admin_user
        
        payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        admin_token = data["access_token"]
        admin_user = data["user"]
        
        # Verify RBAC fields
        assert "user_type" in admin_user, "user_type field missing in login response"
        assert "internal_role" in admin_user, "internal_role field missing in login response"
        assert "region" in admin_user, "region field missing in login response"
        
        # For admin: user_type should be 'internal' OR is_admin=True, internal_role should be 'admin'
        assert admin_user.get("is_admin") == True or admin_user.get("user_type") == "internal", "Admin should be internal or is_admin=True"
        
        print(f"Admin login: user_type={admin_user.get('user_type')}, internal_role={admin_user.get('internal_role')}, region={admin_user.get('region')}, is_admin={admin_user.get('is_admin')}")
    
    def test_local_manager_login_returns_rbac_fields(self):
        """Test local manager login returns proper RBAC fields with region"""
        global local_manager_europe_token, local_manager_user
        
        payload = {"email": LOCAL_MANAGER_EUROPE_EMAIL, "password": LOCAL_MANAGER_EUROPE_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Local Manager login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        local_manager_europe_token = data["access_token"]
        local_manager_user = data["user"]
        
        # Verify RBAC fields
        assert "user_type" in local_manager_user, "user_type field missing"
        assert "internal_role" in local_manager_user, "internal_role field missing"
        assert "region" in local_manager_user, "region field missing"
        
        # Local Manager should be internal with local_manager role
        assert local_manager_user.get("user_type") == "internal", "Local Manager should be internal user"
        assert local_manager_user.get("internal_role") == "local_manager", f"Expected local_manager role, got {local_manager_user.get('internal_role')}"
        assert local_manager_user.get("region") == "europe", f"Expected europe region, got {local_manager_user.get('region')}"
        
        print(f"Local Manager login: user_type={local_manager_user.get('user_type')}, internal_role={local_manager_user.get('internal_role')}, region={local_manager_user.get('region')}")
    
    def test_support_login_returns_rbac_fields(self):
        """Test support staff login returns proper RBAC fields with region"""
        global support_latam_token, support_user
        
        payload = {"email": SUPPORT_LATAM_EMAIL, "password": SUPPORT_LATAM_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Support login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        support_latam_token = data["access_token"]
        support_user = data["user"]
        
        # Verify RBAC fields
        assert "user_type" in support_user, "user_type field missing"
        assert "internal_role" in support_user, "internal_role field missing"
        assert "region" in support_user, "region field missing"
        
        # Support should be internal with support role
        assert support_user.get("user_type") == "internal", "Support should be internal user"
        assert support_user.get("internal_role") == "support", f"Expected support role, got {support_user.get('internal_role')}"
        assert support_user.get("region") == "latam", f"Expected latam region, got {support_user.get('region')}"
        
        print(f"Support login: user_type={support_user.get('user_type')}, internal_role={support_user.get('internal_role')}, region={support_user.get('region')}")
    
    def test_client_login_returns_rbac_fields(self):
        """Test client login returns proper RBAC fields"""
        global client_latam_token
        
        # LATAM client
        payload = {"email": CLIENT_LATAM_EMAIL, "password": CLIENT_LATAM_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Client LATAM login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        client_latam_token = data["access_token"]
        client_user = data["user"]
        
        assert "user_type" in client_user, "user_type field missing"
        assert "region" in client_user, "region field missing"
        
        # Client should have user_type=client
        assert client_user.get("user_type") == "client", f"Expected client user_type, got {client_user.get('user_type')}"
        
        print(f"Client LATAM login: user_type={client_user.get('user_type')}, region={client_user.get('region')}")


# ==================== INTERNAL USER MANAGEMENT ====================

class TestInternalUserManagement:
    """Test admin can create, list, update, delete internal users"""
    
    def test_admin_can_create_internal_user(self):
        """Admin can create internal users with roles and regions"""
        global admin_token, created_internal_user_id
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        test_email = f"test_internal_{uuid.uuid4().hex[:8]}@kbex.io"
        payload = {
            "email": test_email,
            "name": "Test Internal User",
            "password": "testpass123",
            "internal_role": "support",
            "region": "mena",
            "phone": "+1234567890"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/internal-users", json=payload, headers=headers)
        
        assert response.status_code == 200, f"Create internal user failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Success should be True"
        assert "user_id" in data, "user_id should be in response"
        
        created_internal_user_id = data["user_id"]
        print(f"Created internal user: {test_email}, role=support, region=mena")
    
    def test_admin_can_list_all_internal_users(self):
        """Admin can list all internal users"""
        global admin_token
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/internal-users", headers=headers)
        
        assert response.status_code == 200, f"List internal users failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of internal users"
        
        # Verify structure of returned users
        if len(data) > 0:
            user = data[0]
            assert "user_type" in user or user.get("user_type") == "internal", "Internal users should have user_type=internal"
            assert "internal_role" in user, "internal_role should be present"
            assert "region" in user, "region should be present"
        
        print(f"Admin can see {len(data)} internal users")
        
        # Print roles found
        roles = set(u.get("internal_role") for u in data if u.get("internal_role"))
        print(f"Roles found: {roles}")
    
    def test_admin_can_list_internal_users_by_role(self):
        """Admin can filter internal users by role"""
        global admin_token
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/internal-users?role=support", headers=headers)
        
        assert response.status_code == 200, f"Filter by role failed: {response.status_code}"
        
        data = response.json()
        # All returned should be support role
        for user in data:
            assert user.get("internal_role") == "support", f"Expected support role, got {user.get('internal_role')}"
        
        print(f"Found {len(data)} support users")
    
    def test_admin_can_list_internal_users_by_region(self):
        """Admin can filter internal users by region"""
        global admin_token
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/internal-users?region=europe", headers=headers)
        
        assert response.status_code == 200, f"Filter by region failed: {response.status_code}"
        
        data = response.json()
        # All returned should be europe region
        for user in data:
            assert user.get("region") == "europe", f"Expected europe region, got {user.get('region')}"
        
        print(f"Found {len(data)} Europe internal users")
    
    def test_non_admin_cannot_create_internal_user(self):
        """Local Manager and Support cannot create internal users"""
        global local_manager_europe_token
        
        if not local_manager_europe_token:
            pytest.skip("Local Manager token not available")
        
        headers = {"Authorization": f"Bearer {local_manager_europe_token}"}
        payload = {
            "email": f"unauthorized_{uuid.uuid4().hex[:8]}@kbex.io",
            "name": "Unauthorized User",
            "password": "test123",
            "internal_role": "support",
            "region": "europe"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/internal-users", json=payload, headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("Non-admin correctly denied from creating internal users")


# ==================== USER LIST REGION FILTERING ====================

class TestUserListRegionFiltering:
    """Test that users can only see users from their region (except Admin/Manager)"""
    
    def test_admin_can_see_all_users_globally(self):
        """Admin can see all users regardless of region"""
        global admin_token
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Admin list users failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of users"
        
        # Admin should see users from multiple regions
        regions = set(u.get("region") for u in data if u.get("region"))
        print(f"Admin sees users from regions: {regions}")
        print(f"Total users visible to admin: {len(data)}")
    
    def test_local_manager_only_sees_their_region_users(self):
        """Local Manager (Europe) can only see Europe users"""
        global local_manager_europe_token
        
        if not local_manager_europe_token:
            pytest.skip("Local Manager token not available")
        
        headers = {"Authorization": f"Bearer {local_manager_europe_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Local Manager list users failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # All users returned should be from Europe (their region)
        for user in data:
            user_region = user.get("region")
            if user_region:  # Some users might not have region set
                assert user_region == "europe", f"Local Manager Europe should only see Europe users, found {user_region}"
        
        print(f"Local Manager Europe sees {len(data)} users (all should be Europe)")
    
    def test_support_only_sees_their_region_users(self):
        """Support (LATAM) can only see LATAM users"""
        global support_latam_token
        
        if not support_latam_token:
            pytest.skip("Support token not available")
        
        headers = {"Authorization": f"Bearer {support_latam_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Support list users failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # All users returned should be from LATAM (their region)
        for user in data:
            user_region = user.get("region")
            if user_region:
                assert user_region == "latam", f"Support LATAM should only see LATAM users, found {user_region}"
        
        print(f"Support LATAM sees {len(data)} users (all should be LATAM)")
    
    def test_local_manager_cannot_access_other_region(self):
        """Local Manager cannot filter to see other regions"""
        global local_manager_europe_token
        
        if not local_manager_europe_token:
            pytest.skip("Local Manager token not available")
        
        headers = {"Authorization": f"Bearer {local_manager_europe_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?region=latam", headers=headers)
        
        # Should either return 403 or return empty/only their region
        if response.status_code == 403:
            print("Local Manager correctly denied access to LATAM region")
        elif response.status_code == 200:
            data = response.json()
            # Even if request succeeds, should only show their region
            for user in data:
                assert user.get("region") != "latam", "Local Manager should not see LATAM users"
            print("Local Manager request filtered to only show their region")


# ==================== TICKET SYSTEM TESTS ====================

class TestTicketSystemClientCreate:
    """Test that clients can create tickets and tickets inherit region"""
    
    def test_latam_client_can_create_ticket(self):
        """LATAM client creates ticket - should inherit LATAM region"""
        global client_latam_token, latam_ticket_id
        
        if not client_latam_token:
            pytest.skip("Client LATAM token not available")
        
        headers = {"Authorization": f"Bearer {client_latam_token}"}
        payload = {
            "subject": "Test LATAM Ticket",
            "message": "This is a test ticket from LATAM client",
            "category": "general",
            "priority": "medium"
        }
        
        response = requests.post(f"{BASE_URL}/api/tickets/", json=payload, headers=headers)
        
        assert response.status_code == 200, f"Create ticket failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Ticket creation should succeed"
        assert "ticket_id" in data, "ticket_id should be returned"
        
        latam_ticket_id = data["ticket_id"]
        print(f"LATAM client created ticket: {latam_ticket_id}")
    
    def test_europe_client_can_create_ticket(self):
        """Europe client creates ticket - should inherit Europe region"""
        global client_europe_token, europe_ticket_id
        
        if not client_europe_token:
            pytest.skip("Client Europe token not available")
        
        headers = {"Authorization": f"Bearer {client_europe_token}"}
        payload = {
            "subject": "Test Europe Ticket",
            "message": "This is a test ticket from Europe client",
            "category": "account",
            "priority": "high"
        }
        
        response = requests.post(f"{BASE_URL}/api/tickets/", json=payload, headers=headers)
        
        assert response.status_code == 200, f"Create ticket failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        europe_ticket_id = data["ticket_id"]
        print(f"Europe client created ticket: {europe_ticket_id}")
    
    def test_ticket_inherits_client_region(self):
        """Verify tickets inherit client's region"""
        global admin_token, latam_ticket_id
        
        if not admin_token or not latam_ticket_id:
            pytest.skip("Admin token or ticket not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/{latam_ticket_id}", headers=headers)
        
        assert response.status_code == 200, f"Get ticket failed: {response.status_code}"
        
        data = response.json()
        assert data.get("region") == "latam", f"Expected latam region, got {data.get('region')}"
        
        print(f"Ticket region correctly inherited: {data.get('region')}")


class TestTicketSystemRegionFiltering:
    """Test regional staff only see their region's tickets"""
    
    def test_admin_sees_all_tickets(self):
        """Admin can see all tickets from all regions"""
        global admin_token
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/internal/all", headers=headers)
        
        assert response.status_code == 200, f"Admin get all tickets failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of tickets"
        
        # Admin should see tickets from multiple regions
        regions = set(t.get("region") for t in data if t.get("region"))
        print(f"Admin sees tickets from regions: {regions}")
        print(f"Total tickets visible to admin: {len(data)}")
    
    def test_local_manager_only_sees_their_region_tickets(self):
        """Local Manager (Europe) can only see Europe tickets"""
        global local_manager_europe_token
        
        if not local_manager_europe_token:
            pytest.skip("Local Manager token not available")
        
        headers = {"Authorization": f"Bearer {local_manager_europe_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/internal/all", headers=headers)
        
        assert response.status_code == 200, f"Local Manager get tickets failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # All tickets should be from Europe
        for ticket in data:
            ticket_region = ticket.get("region")
            if ticket_region:
                assert ticket_region == "europe", f"Local Manager Europe should only see Europe tickets, found {ticket_region}"
        
        print(f"Local Manager Europe sees {len(data)} tickets (all Europe)")
    
    def test_support_only_sees_their_region_tickets(self):
        """Support (LATAM) can only see LATAM tickets"""
        global support_latam_token
        
        if not support_latam_token:
            pytest.skip("Support token not available")
        
        headers = {"Authorization": f"Bearer {support_latam_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/internal/all", headers=headers)
        
        assert response.status_code == 200, f"Support get tickets failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # All tickets should be from LATAM
        for ticket in data:
            ticket_region = ticket.get("region")
            if ticket_region:
                assert ticket_region == "latam", f"Support LATAM should only see LATAM tickets, found {ticket_region}"
        
        print(f"Support LATAM sees {len(data)} tickets (all LATAM)")
    
    def test_regional_staff_cannot_access_other_region_ticket(self):
        """Support LATAM cannot access Europe ticket"""
        global support_latam_token, europe_ticket_id
        
        if not support_latam_token or not europe_ticket_id:
            pytest.skip("Support token or Europe ticket not available")
        
        headers = {"Authorization": f"Bearer {support_latam_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/{europe_ticket_id}", headers=headers)
        
        # Should be denied
        assert response.status_code == 403, f"Expected 403 for cross-region access, got {response.status_code}"
        print("Support LATAM correctly denied access to Europe ticket")
    
    def test_local_manager_cannot_access_other_region_ticket(self):
        """Local Manager Europe cannot access LATAM ticket"""
        global local_manager_europe_token, latam_ticket_id
        
        if not local_manager_europe_token or not latam_ticket_id:
            pytest.skip("Local Manager token or LATAM ticket not available")
        
        headers = {"Authorization": f"Bearer {local_manager_europe_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/{latam_ticket_id}", headers=headers)
        
        # Should be denied
        assert response.status_code == 403, f"Expected 403 for cross-region access, got {response.status_code}"
        print("Local Manager Europe correctly denied access to LATAM ticket")


class TestTicketStats:
    """Test ticket statistics endpoint with region filtering"""
    
    def test_admin_sees_global_stats(self):
        """Admin sees stats for all regions"""
        global admin_token
        
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/internal/stats", headers=headers)
        
        assert response.status_code == 200, f"Get stats failed: {response.status_code}"
        
        data = response.json()
        assert "by_status" in data, "by_status should be in stats"
        assert "by_region" in data, "by_region should be in stats for admin"
        
        print(f"Admin ticket stats: {data}")
    
    def test_regional_staff_sees_their_region_stats(self):
        """Regional staff sees stats only for their region"""
        global support_latam_token
        
        if not support_latam_token:
            pytest.skip("Support token not available")
        
        headers = {"Authorization": f"Bearer {support_latam_token}"}
        response = requests.get(f"{BASE_URL}/api/tickets/internal/stats", headers=headers)
        
        assert response.status_code == 200, f"Get stats failed: {response.status_code}"
        
        data = response.json()
        assert "by_status" in data, "by_status should be in stats"
        
        print(f"Support LATAM ticket stats: {data}")


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_created_internal_user(self):
        """Delete the internal user we created"""
        global admin_token, created_internal_user_id
        
        if not admin_token or not created_internal_user_id:
            pytest.skip("No data to cleanup")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/internal-users/{created_internal_user_id}", headers=headers)
        
        # Accept 200 or 404 (already deleted)
        assert response.status_code in [200, 404], f"Cleanup failed: {response.status_code}"
        print(f"Cleaned up internal user: {created_internal_user_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
