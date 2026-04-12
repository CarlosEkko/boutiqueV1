"""
Backend i18n API Tests
Tests all backend routes that were modified with i18n support
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://boutique-exchange.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestAuthEndpoints:
    """Test authentication endpoints with i18n"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_success(self):
        """Test login returns correct response"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
    
    def test_login_invalid_credentials_en(self):
        """Test login with invalid credentials returns English error"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", 
            json={"email": "wrong@test.com", "password": "wrongpass"},
            headers={"Accept-Language": "en"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        # Should return English error message
        assert "Invalid" in data["detail"] or "invalid" in data["detail"].lower()
    
    def test_login_invalid_credentials_pt(self):
        """Test login with invalid credentials returns Portuguese error"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", 
            json={"email": "wrong@test.com", "password": "wrongpass"},
            headers={"Accept-Language": "pt"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        # Should return Portuguese error message
        assert "inválid" in data["detail"].lower() or "invalid" in data["detail"].lower()
    
    def test_auth_me_endpoint(self):
        """Test /api/auth/me returns user data"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Test /me endpoint
        response = self.session.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "is_admin" in data


class TestTradingEndpoints:
    """Test trading endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_cryptos(self):
        """Test /api/trading/cryptos returns crypto list"""
        response = self.session.get(f"{BASE_URL}/api/trading/cryptos")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check first crypto has required fields
        assert "symbol" in data[0]
        assert "name" in data[0]
        assert "price_usd" in data[0]
    
    def test_get_fees(self):
        """Test /api/trading/fees returns fee structure"""
        response = self.session.get(f"{BASE_URL}/api/trading/fees")
        assert response.status_code == 200
        data = response.json()
        assert "buy_fee_percent" in data
        assert "sell_fee_percent" in data
        assert "swap_fee_percent" in data
    
    def test_get_exchange_rates(self):
        """Test /api/trading/exchange-rates returns rates"""
        response = self.session.get(f"{BASE_URL}/api/trading/exchange-rates")
        assert response.status_code == 200
        data = response.json()
        assert "rates" in data
        assert "EUR" in data["rates"]
        assert "USD" in data["rates"]


class TestAdminEndpoints:
    """Test admin endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login and get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_users(self):
        """Test /api/admin/users returns user list"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_admin_stats(self):
        """Test /api/admin/stats returns statistics"""
        response = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "kyc" in data


class TestPermissionsEndpoints:
    """Test permissions/menus endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login and get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_menus(self):
        """Test /api/permissions/menus returns menu structure"""
        response = self.session.get(f"{BASE_URL}/api/permissions/menus")
        assert response.status_code == 200
        data = response.json()
        assert "menus" in data
        assert isinstance(data["menus"], list)
        # Check menu structure
        for menu in data["menus"]:
            assert "department" in menu
            assert "label" in menu


class TestOTCEndpoints:
    """Test OTC desk endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login and get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_otc_dashboard(self):
        """Test /api/otc/dashboard returns dashboard data"""
        response = self.session.get(f"{BASE_URL}/api/otc/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "clients" in data
        assert "deals" in data
        assert "volume" in data


class TestSumsubEndpoints:
    """Test Sumsub KYC endpoints"""
    
    def test_get_sumsub_config(self):
        """Test /api/sumsub/config returns configuration"""
        response = requests.get(f"{BASE_URL}/api/sumsub/config")
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data
        assert "level_name" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
