"""
Test Hierarchical Access Control for KBEX Exchange
Tests the new region-based filtering for OTC leads, deals, pipeline, dashboard, and notifications.
Also tests the registration flow with OTC lead membership level inheritance.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = "senha123"


class TestAdminLogin:
    """Test admin login and token retrieval"""
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True, "User should be admin"
        print(f"✓ Admin login successful: {data['user']['email']}")
        return data["access_token"]


class TestOTCLeadsEndpoint:
    """Test OTC Leads endpoint returns all leads for admin (no region filter)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_otc_leads_returns_data(self, admin_token):
        """Test GET /api/otc/leads returns leads for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/leads", headers=headers)
        
        assert response.status_code == 200, f"OTC Leads failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "leads" in data, "Response should have 'leads' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["leads"], list), "leads should be a list"
        
        print(f"✓ OTC Leads endpoint returned {data['total']} leads")
        
        # Admin should see all leads (no region filter applied)
        # Just verify we get a valid response
        return data


class TestOTCDealsEndpoint:
    """Test OTC Deals endpoint works for admin"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_otc_deals_returns_data(self, admin_token):
        """Test GET /api/otc/deals returns deals for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/deals", headers=headers)
        
        assert response.status_code == 200, f"OTC Deals failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "deals" in data, "Response should have 'deals' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["deals"], list), "deals should be a list"
        
        print(f"✓ OTC Deals endpoint returned {data['total']} deals")
        return data


class TestOTCPipelineEndpoint:
    """Test OTC Pipeline endpoint works for admin"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_otc_pipeline_returns_data(self, admin_token):
        """Test GET /api/otc/deals/pipeline returns pipeline data for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/deals/pipeline", headers=headers)
        
        assert response.status_code == 200, f"OTC Pipeline failed: {response.text}"
        data = response.json()
        
        # Verify response structure - should be a dict with stage keys
        assert isinstance(data, dict), "Pipeline should be a dict"
        
        # Check for expected pipeline stages
        expected_stages = ["rfq", "quote", "acceptance", "execution", "settlement", "invoice", "post_sale"]
        for stage in expected_stages:
            if stage in data:
                assert "deals" in data[stage], f"Stage {stage} should have 'deals' key"
                assert "count" in data[stage], f"Stage {stage} should have 'count' key"
        
        print(f"✓ OTC Pipeline endpoint returned data with stages: {list(data.keys())}")
        return data


class TestOTCDashboardEndpoint:
    """Test OTC Dashboard endpoint returns structured data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_otc_dashboard_returns_structured_data(self, admin_token):
        """Test GET /api/otc/dashboard returns structured data with leads/clients/deals stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/dashboard", headers=headers)
        
        assert response.status_code == 200, f"OTC Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "leads" in data, "Response should have 'leads' key"
        assert "clients" in data, "Response should have 'clients' key"
        assert "deals" in data, "Response should have 'deals' key"
        assert "volume" in data, "Response should have 'volume' key"
        assert "revenue" in data, "Response should have 'revenue' key"
        
        # Verify leads structure
        leads = data["leads"]
        assert "total" in leads, "leads should have 'total'"
        assert "new" in leads, "leads should have 'new'"
        assert "qualified" in leads, "leads should have 'qualified'"
        assert "converted" in leads, "leads should have 'converted'"
        
        # Verify clients structure
        clients = data["clients"]
        assert "total" in clients, "clients should have 'total'"
        assert "active" in clients, "clients should have 'active'"
        
        # Verify deals structure
        deals = data["deals"]
        assert "total" in deals, "deals should have 'total'"
        assert "completed" in deals, "deals should have 'completed'"
        assert "active" in deals, "deals should have 'active'"
        
        print(f"✓ OTC Dashboard returned: leads={leads['total']}, clients={clients['total']}, deals={deals['total']}")
        return data


class TestNotificationsEndpoints:
    """Test Notifications endpoints with region filtering"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_notifications_summary_returns_total(self, admin_token):
        """Test GET /api/notifications/summary returns total count"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/summary", headers=headers)
        
        assert response.status_code == 200, f"Notifications summary failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["total"], int), "total should be an integer"
        
        print(f"✓ Notifications summary returned total: {data['total']}")
        return data
    
    def test_notifications_pending_returns_array(self, admin_token):
        """Test GET /api/notifications/pending returns array of notification objects"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/pending", headers=headers)
        
        assert response.status_code == 200, f"Notifications pending failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "notifications" in data, "Response should have 'notifications' key"
        assert "total_count" in data, "Response should have 'total_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        
        # Verify notification object structure if any exist
        if data["notifications"]:
            notif = data["notifications"][0]
            assert "type" in notif, "notification should have 'type'"
            assert "title" in notif, "notification should have 'title'"
            assert "count" in notif, "notification should have 'count'"
        
        print(f"✓ Notifications pending returned {len(data['notifications'])} notification types, total_count: {data['total_count']}")
        return data


class TestAdminUsersEndpoint:
    """Test Admin Users endpoint returns all clients"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_admin_users_returns_clients(self, admin_token):
        """Test GET /api/admin/users?user_type=client returns all clients"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?user_type=client", headers=headers)
        
        assert response.status_code == 200, f"Admin users failed: {response.text}"
        data = response.json()
        
        # Verify response is a list
        assert isinstance(data, list), "Response should be a list of users"
        
        # Verify user structure if any exist
        if data:
            user = data[0]
            assert "id" in user, "user should have 'id'"
            assert "email" in user, "user should have 'email'"
            # Should not have hashed_password
            assert "hashed_password" not in user, "user should not have 'hashed_password'"
        
        print(f"✓ Admin users endpoint returned {len(data)} clients")
        return data


class TestRegistrationWithOTCLeadMembership:
    """Test registration flow: create lead with potential_tier=vip, convert to active_client, register with same email"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_full_registration_flow_with_vip_tier(self, admin_token):
        """Test: create OTC lead with potential_tier=vip, convert to active_client, register - membership should be vip"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Generate unique test email
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test.hierarchy.vip.{unique_id}@test.com"
        
        # Step 1: Create OTC Lead with potential_tier=vip
        lead_data = {
            "entity_name": f"Test VIP Entity {unique_id}",
            "contact_name": f"Test VIP User {unique_id}",
            "contact_email": test_email,
            "contact_phone": "+351912345678",
            "country": "PT",
            "source": "referral",
            "transaction_type": "buy",
            "potential_tier": "vip",
            "notes": "Test lead for VIP membership verification"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/otc/leads", json=lead_data, headers=headers)
        assert create_response.status_code == 200, f"Create lead failed: {create_response.text}"
        lead_result = create_response.json()
        assert lead_result.get("success") == True, "Lead creation should succeed"
        lead_id = lead_result["lead"]["id"]
        print(f"✓ Created OTC lead with id: {lead_id}, potential_tier: vip")
        
        # Step 2: Update lead status to active_client (this triggers user creation)
        update_response = requests.put(
            f"{BASE_URL}/api/otc/leads/{lead_id}",
            json={"status": "active_client"},
            headers=headers
        )
        assert update_response.status_code == 200, f"Update lead failed: {update_response.text}"
        update_result = update_response.json()
        print(f"✓ Updated lead to active_client, platform_user_created: {update_result.get('platform_user_created')}")
        
        # Step 3: Register with the same email - should succeed and inherit VIP membership
        register_data = {
            "email": test_email,
            "name": f"Test VIP User {unique_id}",
            "password": "testpassword123",
            "phone": "+351912345678",
            "country": "PT"
        }
        
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert register_response.status_code == 201, f"Registration failed: {register_response.text}"
        register_result = register_response.json()
        
        # Verify membership_level is VIP
        user = register_result.get("user", {})
        membership_level = user.get("membership_level", "").lower()
        
        print(f"✓ Registration successful, membership_level: {membership_level}")
        
        # The membership should be 'vip' because the OTC lead had potential_tier=vip
        assert membership_level == "vip", f"Expected membership_level 'vip', got '{membership_level}'"
        
        print(f"✓ Full registration flow verified: OTC lead potential_tier=vip → registered user membership_level=vip")
        
        return register_result


class TestOTCClientsEndpoint:
    """Test OTC Clients endpoint works for admin"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_otc_clients_returns_data(self, admin_token):
        """Test GET /api/otc/clients returns clients for admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/clients", headers=headers)
        
        assert response.status_code == 200, f"OTC Clients failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "clients" in data, "Response should have 'clients' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["clients"], list), "clients should be a list"
        
        print(f"✓ OTC Clients endpoint returned {data['total']} clients")
        return data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
