import os
"""
Backend API Tests for Kryptobox Dashboard System
Tests: Dashboard Overview, Wallets, Transactions, Investments, ROI, Transparency
Admin: User approval, Investment opportunities, Public wallets
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from main agent
APPROVED_USER_EMAIL = "joao@teste.com"
APPROVED_USER_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# New user for testing non-approved flow
NEW_USER_EMAIL = f"novo_test_{uuid.uuid4().hex[:8]}@teste.com"
NEW_USER_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")
NEW_USER_NAME = "Novo User Test"

# Store tokens
approved_token = None
new_user_token = None
new_user_id = None


class TestHealthCheck:
    """Basic API health checks"""
    
    def test_api_root_endpoint(self):
        """Test the root API endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Root endpoint response: {response.json()}")


class TestLoginApprovedUser:
    """Login with the pre-approved test user joao@teste.com"""
    
    def test_login_approved_user(self):
        """Test login with approved user"""
        global approved_token
        
        payload = {
            "email": APPROVED_USER_EMAIL,
            "password": APPROVED_USER_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        approved_token = data["access_token"]
        
        print(f"Approved user login successful: {data['user']['email']}")
        print(f"User is_approved: {data['user'].get('is_approved')}")


class TestDashboardForApprovedUser:
    """Test dashboard endpoints for approved user"""
    
    def test_dashboard_overview_approved(self):
        """Test GET /api/dashboard/overview for approved user"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "total_portfolio_value" in data, "total_portfolio_value should be in response"
        assert "wallet_value" in data, "wallet_value should be in response"
        assert "invested_value" in data, "invested_value should be in response"
        assert "expected_returns" in data, "expected_returns should be in response"
        assert "wallet_allocation" in data, "wallet_allocation should be in response"
        assert "recent_transactions" in data, "recent_transactions should be in response"
        assert "kyc_status" in data, "kyc_status should be in response"
        assert "membership_level" in data, "membership_level should be in response"
        
        print(f"Dashboard Overview: Portfolio={data['total_portfolio_value']}, KYC={data['kyc_status']}")
    
    def test_wallets_endpoint_approved(self):
        """Test GET /api/dashboard/wallets for approved user"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/wallets", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of wallets"
        
        # Approved users should have wallets created
        if len(data) > 0:
            wallet = data[0]
            assert "id" in wallet
            assert "asset_id" in wallet
            assert "asset_name" in wallet
            assert "address" in wallet
            assert "balance" in wallet
            print(f"Found {len(data)} wallets: {[w['asset_id'] for w in data]}")
        else:
            print("No wallets found for user")
    
    def test_wallet_details_btc(self):
        """Test GET /api/dashboard/wallets/{asset_id} for BTC wallet"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/wallets/BTC", headers=headers)
        
        # May be 200 or 404 depending on if user has BTC wallet
        if response.status_code == 200:
            data = response.json()
            assert data["asset_id"] == "BTC"
            assert "address" in data
            assert "transactions" in data
            print(f"BTC wallet details: address={data['address']}")
        else:
            assert response.status_code == 404, f"Expected 200 or 404, got {response.status_code}"
            print("BTC wallet not found (expected if user not approved initially)")
    
    def test_transactions_endpoint(self):
        """Test GET /api/dashboard/transactions"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/transactions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "transactions key should be in response"
        assert "total" in data, "total should be in response"
        assert "limit" in data
        assert "offset" in data
        
        print(f"Transactions: total={data['total']}, returned={len(data['transactions'])}")
    
    def test_transactions_with_type_filter(self):
        """Test GET /api/dashboard/transactions with type filter"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/transactions?type=deposit", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("Transaction type filter working")
    
    def test_investment_opportunities(self):
        """Test GET /api/dashboard/investments/opportunities"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/investments/opportunities", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of opportunities"
        
        if len(data) > 0:
            opp = data[0]
            assert "id" in opp
            assert "name" in opp
            assert "expected_roi" in opp
            assert "duration_days" in opp
            assert "min_investment" in opp
            assert "max_investment" in opp
            assert "risk_level" in opp
            assert "status" in opp
            assert "total_pool" in opp
            print(f"Found {len(data)} opportunities: {[o['name'] for o in data]}")
        else:
            print("No investment opportunities found")
    
    def test_my_investments(self):
        """Test GET /api/dashboard/investments/my"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/investments/my", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of investments"
        
        print(f"User has {len(data)} investments")
    
    def test_roi_endpoint(self):
        """Test GET /api/dashboard/roi"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/roi", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify ROI response structure
        assert "total_invested" in data
        assert "total_expected_returns" in data
        assert "total_actual_returns" in data
        assert "overall_roi_percentage" in data
        assert "realized_roi_percentage" in data
        assert "active_investments" in data
        assert "completed_investments" in data
        assert "investments" in data
        
        print(f"ROI Summary: Total invested={data['total_invested']}, ROI%={data['overall_roi_percentage']}")
    
    def test_transparency_reports(self):
        """Test GET /api/dashboard/transparency/reports"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/transparency/reports", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of reports"
        
        print(f"Found {len(data)} transparency reports")
    
    def test_proof_of_reserves(self):
        """Test GET /api/dashboard/transparency/reserves"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/transparency/reserves", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "wallets" in data, "wallets key should be in response"
        assert "totals_by_asset" in data, "totals_by_asset key should be in response"
        assert "last_updated" in data, "last_updated key should be in response"
        
        print(f"Reserves: {len(data['wallets'])} public wallets, totals: {data['totals_by_asset']}")


class TestRegisterNewUser:
    """Register a new user for testing non-approved flow"""
    
    def test_register_new_user(self):
        """Register a new user"""
        global new_user_token, new_user_id
        
        payload = {
            "email": NEW_USER_EMAIL,
            "password": NEW_USER_PASSWORD,
            "name": NEW_USER_NAME
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        new_user_token = data["access_token"]
        new_user_id = data["user"]["id"]
        
        # New users should NOT be approved by default
        assert data["user"]["is_approved"] == False, "New user should not be approved by default"
        
        print(f"New user registered: {data['user']['email']}, is_approved={data['user']['is_approved']}")


class TestDashboardForNonApprovedUser:
    """Test dashboard access is denied for non-approved users"""
    
    def test_dashboard_overview_denied_for_non_approved(self):
        """Test GET /api/dashboard/overview returns 403 for non-approved user"""
        global new_user_token
        
        if not new_user_token:
            pytest.skip("No new user token available")
        
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        data = response.json()
        assert "pending approval" in data.get("detail", "").lower() or "access denied" in data.get("detail", "").lower()
        
        print(f"Non-approved user correctly denied: {data['detail']}")
    
    def test_wallets_denied_for_non_approved(self):
        """Test GET /api/dashboard/wallets returns 403 for non-approved user"""
        global new_user_token
        
        if not new_user_token:
            pytest.skip("No new user token available")
        
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/wallets", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Wallets correctly denied for non-approved user")
    
    def test_investments_denied_for_non_approved(self):
        """Test investments endpoints denied for non-approved user"""
        global new_user_token
        
        if not new_user_token:
            pytest.skip("No new user token available")
        
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/investments/opportunities", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Investments correctly denied for non-approved user")


class TestAdminEndpoints:
    """Test admin endpoints with approved admin user (joao@teste.com)"""
    
    def test_admin_list_users(self):
        """Test GET /api/admin/users - list all users"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of users"
        
        print(f"Admin can see {len(data)} users")
    
    def test_admin_list_users_filter_not_approved(self):
        """Test GET /api/admin/users?is_approved=false"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users?is_approved=false", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned users should be not approved
        for user in data:
            assert user.get("is_approved") == False, "Filtered users should not be approved"
        
        print(f"Found {len(data)} non-approved users")
    
    def test_admin_get_user_details(self):
        """Test GET /api/admin/users/{user_id}"""
        global approved_token, new_user_id
        
        if not approved_token or not new_user_id:
            pytest.skip("Required tokens/ids not available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users/{new_user_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == new_user_id
        assert "wallets" in data
        assert "investments" in data
        assert "transactions" in data
        
        print(f"Admin got user details: {data['email']}")
    
    def test_admin_approve_user(self):
        """Test POST /api/admin/users/{id}/approve"""
        global approved_token, new_user_id
        
        if not approved_token or not new_user_id:
            pytest.skip("Required tokens/ids not available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/users/{new_user_id}/approve", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        
        print(f"User approved: {data.get('message')}")
        
        # Verify user can now access dashboard
        global new_user_token
        if new_user_token:
            headers2 = {"Authorization": f"Bearer {new_user_token}"}
            response2 = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=headers2)
            assert response2.status_code == 200, "Approved user should now have access"
            print("Verified approved user can access dashboard")
    
    def test_admin_list_invite_codes(self):
        """Test GET /api/admin/invites"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/invites", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return list of invite codes"
        
        print(f"Found {len(data)} invite codes")
    
    def test_admin_create_invite_code(self):
        """Test POST /api/admin/invites"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/invites?max_uses=5", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "code" in data
        assert data["max_uses"] == 5
        
        print(f"Created invite code: {data['code']}")
    
    def test_admin_create_investment_opportunity(self):
        """Test POST /api/admin/opportunities"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        params = {
            "name": f"Test Opportunity {uuid.uuid4().hex[:6]}",
            "description": "Test lending pool for automated tests",
            "expected_roi": 10.5,
            "duration_days": 30,
            "min_investment": 100,
            "max_investment": 10000,
            "total_pool": 50000,
            "risk_level": "low",
            "currency": "USDT"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/opportunities", params=params, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "opportunity_id" in data
        
        print(f"Created investment opportunity: {data['opportunity_id']}")
    
    def test_admin_add_public_wallet(self):
        """Test POST /api/admin/transparency/wallets"""
        global approved_token
        
        if not approved_token:
            pytest.skip("No approved token available")
        
        headers = {"Authorization": f"Bearer {approved_token}"}
        params = {
            "asset_id": "BTC",
            "asset_name": "Bitcoin",
            "address": f"bc1test{uuid.uuid4().hex[:16]}",
            "balance": 10.5,
            "label": "Test Cold Storage"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/transparency/wallets", params=params, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "wallet_id" in data
        
        print(f"Created public wallet: {data['wallet_id']}")


class TestNonAdminAccessDenied:
    """Test that non-admin users cannot access admin endpoints"""
    
    def test_non_admin_cannot_list_users(self):
        """Regular users cannot access /api/admin/users"""
        global new_user_token
        
        if not new_user_token:
            pytest.skip("No new user token available")
        
        headers = {"Authorization": f"Bearer {new_user_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Non-admin correctly denied access to admin endpoints")


class TestUnauthenticatedAccess:
    """Test endpoints require authentication"""
    
    def test_dashboard_requires_auth(self):
        """Dashboard overview requires authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard/overview")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_admin_requires_auth(self):
        """Admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
