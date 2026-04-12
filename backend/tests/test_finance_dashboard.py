import os
"""
Test Finance Dashboard API
Tests the new GET /api/finance/dashboard endpoint for admin financial metrics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestFinanceDashboardAPI:
    """Finance Dashboard endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Note: Login response uses 'access_token' not 'token'
        token = data.get("access_token")
        assert token, f"No access_token in response: {data}"
        return token
    
    def test_finance_dashboard_requires_auth(self):
        """Test that finance dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/finance/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Finance dashboard requires authentication")
    
    def test_finance_dashboard_returns_data(self, auth_token):
        """Test that finance dashboard returns correct data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify top-level keys exist
        required_keys = ["aum", "revenue", "volume", "pending", "revenue_trend", 
                        "asset_distribution", "fiat_vs_crypto", "top_clients", 
                        "recent_orders", "recent_deposits"]
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"PASS: Finance dashboard returns all required keys: {required_keys}")
    
    def test_finance_dashboard_aum_structure(self, auth_token):
        """Test AUM (Assets Under Management) data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        aum = data.get("aum", {})
        assert "total_usd" in aum, "Missing aum.total_usd"
        assert "fiat_usd" in aum, "Missing aum.fiat_usd"
        assert "crypto_usd" in aum, "Missing aum.crypto_usd"
        
        # Verify values are numeric
        assert isinstance(aum["total_usd"], (int, float)), "aum.total_usd should be numeric"
        assert isinstance(aum["fiat_usd"], (int, float)), "aum.fiat_usd should be numeric"
        assert isinstance(aum["crypto_usd"], (int, float)), "aum.crypto_usd should be numeric"
        
        print(f"PASS: AUM structure correct - Total: ${aum['total_usd']}, Fiat: ${aum['fiat_usd']}, Crypto: ${aum['crypto_usd']}")
    
    def test_finance_dashboard_revenue_structure(self, auth_token):
        """Test Revenue data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        revenue = data.get("revenue", {})
        assert "total" in revenue, "Missing revenue.total"
        assert "admission_fees" in revenue, "Missing revenue.admission_fees"
        assert "trading_fees" in revenue, "Missing revenue.trading_fees"
        assert "admission_count" in revenue, "Missing revenue.admission_count"
        assert "trading_count" in revenue, "Missing revenue.trading_count"
        
        print(f"PASS: Revenue structure correct - Total: ${revenue['total']}, Admission: ${revenue['admission_fees']}, Trading: ${revenue['trading_fees']}")
    
    def test_finance_dashboard_volume_structure(self, auth_token):
        """Test Volume data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        volume = data.get("volume", {})
        assert "h24" in volume, "Missing volume.h24"
        assert "d7" in volume, "Missing volume.d7"
        assert "d30" in volume, "Missing volume.d30"
        assert "all_time" in volume, "Missing volume.all_time"
        
        # h24, d7, d30 should have volume and count
        for period in ["h24", "d7", "d30"]:
            assert "volume" in volume[period], f"Missing volume.{period}.volume"
            assert "count" in volume[period], f"Missing volume.{period}.count"
        
        print(f"PASS: Volume structure correct - 24h: ${volume['h24']['volume']}, 7d: ${volume['d7']['volume']}, 30d: ${volume['d30']['volume']}")
    
    def test_finance_dashboard_pending_structure(self, auth_token):
        """Test Pending operations data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        pending = data.get("pending", {})
        assert "deposits" in pending, "Missing pending.deposits"
        assert "withdrawals" in pending, "Missing pending.withdrawals"
        assert "orders" in pending, "Missing pending.orders"
        
        # Values should be integers
        assert isinstance(pending["deposits"], int), "pending.deposits should be int"
        assert isinstance(pending["withdrawals"], int), "pending.withdrawals should be int"
        assert isinstance(pending["orders"], int), "pending.orders should be int"
        
        print(f"PASS: Pending structure correct - Deposits: {pending['deposits']}, Withdrawals: {pending['withdrawals']}, Orders: {pending['orders']}")
    
    def test_finance_dashboard_revenue_trend(self, auth_token):
        """Test Revenue trend data (30 days)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        revenue_trend = data.get("revenue_trend", [])
        assert isinstance(revenue_trend, list), "revenue_trend should be a list"
        assert len(revenue_trend) == 31, f"Expected 31 days of data, got {len(revenue_trend)}"
        
        # Check structure of each entry
        for entry in revenue_trend[:3]:  # Check first 3
            assert "date" in entry, "Missing date in revenue_trend entry"
            assert "revenue" in entry, "Missing revenue in revenue_trend entry"
        
        print(f"PASS: Revenue trend has {len(revenue_trend)} days of data")
    
    def test_finance_dashboard_asset_distribution(self, auth_token):
        """Test Asset distribution data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        asset_distribution = data.get("asset_distribution", [])
        assert isinstance(asset_distribution, list), "asset_distribution should be a list"
        
        # Check structure if there's data
        for entry in asset_distribution[:3]:
            assert "asset" in entry, "Missing asset in asset_distribution entry"
            assert "value" in entry, "Missing value in asset_distribution entry"
        
        print(f"PASS: Asset distribution has {len(asset_distribution)} assets")
    
    def test_finance_dashboard_fiat_vs_crypto(self, auth_token):
        """Test Fiat vs Crypto breakdown"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        fiat_vs_crypto = data.get("fiat_vs_crypto", {})
        assert "fiat" in fiat_vs_crypto, "Missing fiat_vs_crypto.fiat"
        assert "crypto" in fiat_vs_crypto, "Missing fiat_vs_crypto.crypto"
        
        print(f"PASS: Fiat vs Crypto - Fiat: ${fiat_vs_crypto['fiat']}, Crypto: ${fiat_vs_crypto['crypto']}")
    
    def test_finance_dashboard_top_clients(self, auth_token):
        """Test Top clients by AUM"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        top_clients = data.get("top_clients", [])
        assert isinstance(top_clients, list), "top_clients should be a list"
        
        # Check structure if there's data
        for client in top_clients[:3]:
            assert "name" in client, "Missing name in top_clients entry"
            assert "email" in client, "Missing email in top_clients entry"
            assert "aum_usd" in client, "Missing aum_usd in top_clients entry"
        
        print(f"PASS: Top clients has {len(top_clients)} entries")
    
    def test_finance_dashboard_recent_orders(self, auth_token):
        """Test Recent orders data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        recent_orders = data.get("recent_orders", [])
        assert isinstance(recent_orders, list), "recent_orders should be a list"
        
        # Check structure if there's data
        for order in recent_orders[:3]:
            assert "id" in order, "Missing id in recent_orders entry"
            assert "status" in order, "Missing status in recent_orders entry"
        
        print(f"PASS: Recent orders has {len(recent_orders)} entries")
    
    def test_finance_dashboard_recent_deposits(self, auth_token):
        """Test Recent deposits data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        recent_deposits = data.get("recent_deposits", [])
        assert isinstance(recent_deposits, list), "recent_deposits should be a list"
        
        # Check structure if there's data
        for deposit in recent_deposits[:3]:
            assert "id" in deposit, "Missing id in recent_deposits entry"
            assert "status" in deposit, "Missing status in recent_deposits entry"
        
        print(f"PASS: Recent deposits has {len(recent_deposits)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
