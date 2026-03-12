"""
Permissions System API Tests
Tests for accordion menu with department-based permissions system
Features tested:
- Roles API (10 roles: Admin, Global Manager, Manager, Sales Manager, Sales, etc.)
- Departments API (6 departments: Portfolio, Admin, Management, Finance, CRM, Support)
- Menus API (returns menus based on user's role and custom permissions)
- Staff Permissions API (list and edit staff department access)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = "senha123"


class TestPermissionsAPI:
    """Test suite for permissions endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for requests"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    # ==================== Roles API ====================
    
    def test_get_roles_returns_all_10_roles(self, headers):
        """GET /api/permissions/roles returns all 10 staff roles"""
        response = requests.get(f"{BASE_URL}/api/permissions/roles", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "roles" in data
        roles = data["roles"]
        assert len(roles) == 10, f"Expected 10 roles, got {len(roles)}"
        
        # Check role values
        role_values = [r["value"] for r in roles]
        expected_roles = [
            "admin", "global_manager", "manager", "sales_manager", "sales",
            "finance_general", "finance_local", "finance", 
            "support_manager", "support_agent"
        ]
        for expected in expected_roles:
            assert expected in role_values, f"Role '{expected}' not found"
    
    def test_roles_have_labels_and_descriptions(self, headers):
        """Each role has label and description"""
        response = requests.get(f"{BASE_URL}/api/permissions/roles", headers=headers)
        assert response.status_code == 200
        roles = response.json()["roles"]
        
        for role in roles:
            assert "value" in role
            assert "label" in role, f"Role {role['value']} missing label"
            assert "description" in role, f"Role {role['value']} missing description"
            assert len(role["label"]) > 0
            assert len(role["description"]) > 0
    
    # ==================== Departments API ====================
    
    def test_get_departments_returns_all_6(self, headers):
        """GET /api/permissions/departments returns all 6 departments"""
        response = requests.get(f"{BASE_URL}/api/permissions/departments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "departments" in data
        depts = data["departments"]
        assert len(depts) == 6, f"Expected 6 departments, got {len(depts)}"
        
        dept_values = [d["value"] for d in depts]
        expected_depts = ["portfolio", "admin", "management", "finance", "crm", "support"]
        for expected in expected_depts:
            assert expected in dept_values, f"Department '{expected}' not found"
    
    def test_departments_have_labels_and_icons(self, headers):
        """Each department has label and icon"""
        response = requests.get(f"{BASE_URL}/api/permissions/departments", headers=headers)
        assert response.status_code == 200
        depts = response.json()["departments"]
        
        for dept in depts:
            assert "value" in dept
            assert "label" in dept, f"Department {dept['value']} missing label"
            assert "icon" in dept, f"Department {dept['value']} missing icon"
    
    # ==================== Menus API ====================
    
    def test_admin_gets_all_department_menus(self, headers):
        """Admin user gets menus for all 6 departments"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "menus" in data
        menus = data["menus"]
        assert len(menus) == 6, f"Admin should have 6 menus, got {len(menus)}"
        
        # Check menu structure
        menu_depts = [m["department"] for m in menus]
        expected_depts = ["portfolio", "admin", "management", "finance", "crm", "support"]
        for expected in expected_depts:
            assert expected in menu_depts, f"Menu for '{expected}' not found"
    
    def test_menus_have_correct_structure(self, headers):
        """Each menu has department, label, icon and items"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus", headers=headers)
        assert response.status_code == 200
        menus = response.json()["menus"]
        
        for menu in menus:
            assert "department" in menu
            assert "label" in menu
            assert "icon" in menu
            assert "items" in menu
            assert isinstance(menu["items"], list)
            assert len(menu["items"]) > 0, f"Menu {menu['department']} has no items"
    
    def test_menu_items_have_path_label_icon(self, headers):
        """Each menu item has path, label and icon"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus", headers=headers)
        assert response.status_code == 200
        menus = response.json()["menus"]
        
        for menu in menus:
            for item in menu["items"]:
                assert "path" in item, f"Item missing path in {menu['department']}"
                assert "label" in item, f"Item missing label in {menu['department']}"
                assert "icon" in item, f"Item missing icon in {menu['department']}"
                assert item["path"].startswith("/"), f"Path should start with /"
    
    def test_portfolio_menu_items(self, headers):
        """Portfolio department has expected items"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus", headers=headers)
        assert response.status_code == 200
        menus = response.json()["menus"]
        
        portfolio = next(m for m in menus if m["department"] == "portfolio")
        item_paths = [i["path"] for i in portfolio["items"]]
        
        # Check essential portfolio paths
        essential_paths = ["/dashboard", "/dashboard/wallets", "/dashboard/transactions"]
        for path in essential_paths:
            assert path in item_paths, f"Portfolio missing {path}"
    
    def test_finance_menu_items(self, headers):
        """Finance department has expected items"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus", headers=headers)
        assert response.status_code == 200
        menus = response.json()["menus"]
        
        finance = next(m for m in menus if m["department"] == "finance")
        item_paths = [i["path"] for i in finance["items"]]
        
        # Check finance paths
        assert "/dashboard/admin/orders" in item_paths
        assert "/dashboard/admin/fiat-deposits" in item_paths
        assert "/dashboard/admin/fiat-withdrawals" in item_paths
    
    def test_management_menu_has_permissions_page(self, headers):
        """Management department has permissions page"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus", headers=headers)
        assert response.status_code == 200
        menus = response.json()["menus"]
        
        management = next(m for m in menus if m["department"] == "management")
        item_paths = [i["path"] for i in management["items"]]
        
        assert "/dashboard/admin/permissions" in item_paths, "Missing permissions page"
    
    # ==================== Staff Permissions API ====================
    
    def test_get_staff_with_permissions(self, headers):
        """GET /api/permissions/staff-with-permissions returns staff list"""
        response = requests.get(f"{BASE_URL}/api/permissions/staff-with-permissions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one staff member"
    
    def test_staff_have_required_fields(self, headers):
        """Staff members have all required permission fields"""
        response = requests.get(f"{BASE_URL}/api/permissions/staff-with-permissions", headers=headers)
        assert response.status_code == 200
        staff = response.json()
        
        required_fields = [
            "id", "name", "email", "role", "region", "is_active",
            "role_departments", "custom_departments", "effective_departments",
            "has_custom_permissions"
        ]
        
        for member in staff:
            for field in required_fields:
                assert field in member, f"Staff member missing field: {field}"
    
    def test_admin_has_all_departments(self, headers):
        """Admin user has access to all 6 departments"""
        response = requests.get(f"{BASE_URL}/api/permissions/staff-with-permissions", headers=headers)
        assert response.status_code == 200
        staff = response.json()
        
        admin = next((s for s in staff if s["email"] == ADMIN_EMAIL), None)
        assert admin is not None, "Admin user not found in staff list"
        
        assert len(admin["effective_departments"]) == 6, "Admin should have all 6 departments"
        assert "portfolio" in admin["effective_departments"]
        assert "admin" in admin["effective_departments"]
        assert "management" in admin["effective_departments"]
        assert "finance" in admin["effective_departments"]
        assert "crm" in admin["effective_departments"]
        assert "support" in admin["effective_departments"]
    
    # ==================== Get User Permissions API ====================
    
    def test_get_admin_permissions(self, headers, auth_token):
        """GET /api/permissions/user/{id} returns user's permissions"""
        # First get admin's ID
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_id = login_resp.json()["user"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/permissions/user/{admin_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["user_id"] == admin_id
        assert data["role"] == "admin"
        assert len(data["effective_departments"]) == 6
    
    def test_get_nonexistent_user_permissions(self, headers):
        """GET /api/permissions/user/{id} returns 404 for invalid user"""
        response = requests.get(f"{BASE_URL}/api/permissions/user/nonexistent-id-123", headers=headers)
        assert response.status_code == 404
    
    # ==================== Unauthorized Access ====================
    
    def test_menus_requires_auth(self):
        """Menus endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/permissions/menus")
        assert response.status_code in [401, 403]
    
    def test_staff_permissions_requires_admin(self):
        """Staff permissions endpoint requires admin access"""
        response = requests.get(f"{BASE_URL}/api/permissions/staff-with-permissions")
        assert response.status_code in [401, 403]


class TestFiatDepositsAPI:
    """Test suite for Fiat Deposits (bank transfers) admin endpoint"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        """Auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_bank_transfers(self, headers):
        """GET /api/trading/admin/bank-transfers returns deposits"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/bank-transfers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_bank_transfers_have_required_fields(self, headers):
        """Bank transfers have all required fields"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/bank-transfers", headers=headers)
        assert response.status_code == 200
        transfers = response.json()
        
        if len(transfers) > 0:
            transfer = transfers[0]
            required = ["id", "user_id", "user_email", "amount", "currency", "status"]
            for field in required:
                assert field in transfer, f"Transfer missing field: {field}"


class TestFiatWithdrawalsAPI:
    """Test suite for Fiat Withdrawals admin endpoint"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        """Auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_fiat_withdrawals(self, headers):
        """GET /api/trading/admin/fiat-withdrawals returns withdrawals"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/fiat-withdrawals", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTradingOrdersAPI:
    """Test suite for Trading Orders admin endpoint"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        """Auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_trading_orders(self, headers):
        """GET /api/trading/admin/orders returns orders"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_orders_have_required_fields(self, headers):
        """Orders have all required fields"""
        response = requests.get(f"{BASE_URL}/api/trading/admin/orders", headers=headers)
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) > 0:
            order = orders[0]
            required = ["id", "user_id", "order_type", "status", "crypto_symbol"]
            for field in required:
                assert field in order, f"Order missing field: {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
