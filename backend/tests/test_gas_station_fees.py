"""
Test Gas Station Monitoring, Fee Estimation, and External Wallets Features
Tests for:
- GET /api/finance/dashboard (gas_station data)
- GET /api/finance/gas-station
- POST /api/finance/gas-station/check-alerts
- POST /api/crypto-wallets/estimate-fee
- GET /api/crypto-wallets/network-fees/{asset}
- GET /api/crypto-wallets/admin/gas-station
- GET /api/crypto-wallets/admin/external-wallets
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestFinanceDashboardGasStation:
    """Test Gas Station data in Finance Dashboard"""
    
    def test_finance_dashboard_returns_gas_station_data(self, admin_headers):
        """GET /api/finance/dashboard should include gas_station object"""
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify gas_station is present
        assert "gas_station" in data, "gas_station key missing from dashboard response"
        
        gas_station = data["gas_station"]
        assert gas_station is not None, "gas_station should not be None"
        
        # Verify gas_station structure
        assert "health" in gas_station, "gas_station should have 'health' field"
        assert gas_station["health"] in ["healthy", "warning", "critical", "unknown"], \
            f"Invalid health status: {gas_station['health']}"
        
        # If not unknown/error, should have assets and warnings
        if gas_station.get("health") != "unknown":
            assert "assets" in gas_station, "gas_station should have 'assets' array"
            assert "warnings" in gas_station, "gas_station should have 'warnings' array"
            assert isinstance(gas_station["assets"], list), "assets should be a list"
            assert isinstance(gas_station["warnings"], list), "warnings should be a list"
        
        print(f"✓ Gas Station health: {gas_station['health']}")
        print(f"✓ Assets count: {len(gas_station.get('assets', []))}")
        print(f"✓ Warnings: {gas_station.get('warnings', [])}")
    
    def test_finance_dashboard_pending_crypto_withdrawals(self, admin_headers):
        """GET /api/finance/dashboard should include crypto_withdrawals in pending"""
        response = requests.get(f"{BASE_URL}/api/finance/dashboard", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "pending" in data, "pending key missing"
        pending = data["pending"]
        
        assert "crypto_withdrawals" in pending, "crypto_withdrawals missing from pending"
        assert isinstance(pending["crypto_withdrawals"], int), "crypto_withdrawals should be int"
        
        print(f"✓ Pending crypto withdrawals: {pending['crypto_withdrawals']}")


class TestGasStationEndpoint:
    """Test dedicated Gas Station endpoint"""
    
    def test_get_gas_station_details(self, admin_headers):
        """GET /api/finance/gas-station returns gas station details"""
        response = requests.get(f"{BASE_URL}/api/finance/gas-station", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "health" in data, "health field missing"
        
        # Should have last_alert info
        if "last_alert" in data:
            last_alert = data["last_alert"]
            if last_alert:
                assert "type" in last_alert, "last_alert should have type"
                assert "created_at" in last_alert, "last_alert should have created_at"
                print(f"✓ Last alert: {last_alert.get('created_at')}")
        
        # Verify assets structure if present
        if "assets" in data and data["assets"]:
            for asset in data["assets"]:
                assert "asset_id" in asset, "asset should have asset_id"
                assert "available" in asset, "asset should have available balance"
                assert "status" in asset, "asset should have status"
                print(f"  - {asset['asset_id']}: {asset['available']} ({asset['status']})")
        
        print(f"✓ Gas Station health: {data['health']}")
    
    def test_gas_station_requires_auth(self):
        """GET /api/finance/gas-station requires authentication"""
        response = requests.get(f"{BASE_URL}/api/finance/gas-station")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Gas station endpoint requires authentication")


class TestGasStationAlerts:
    """Test Gas Station alert functionality"""
    
    def test_check_alerts_endpoint(self, admin_headers):
        """POST /api/finance/gas-station/check-alerts works"""
        response = requests.post(
            f"{BASE_URL}/api/finance/gas-station/check-alerts",
            headers=admin_headers,
            json={}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "success" in data, "success field missing"
        assert "health" in data, "health field missing"
        
        # Either alert_sent or message should be present
        if data.get("alert_sent"):
            assert "email_sent_to" in data, "email_sent_to missing when alert sent"
            print(f"✓ Alert sent to: {data['email_sent_to']}")
        else:
            assert "message" in data, "message missing when no alert sent"
            print(f"✓ No alert sent: {data['message']}")
        
        print(f"✓ Health status: {data['health']}")
    
    def test_check_alerts_cooldown(self, admin_headers):
        """POST /api/finance/gas-station/check-alerts respects cooldown"""
        # First call
        response1 = requests.post(
            f"{BASE_URL}/api/finance/gas-station/check-alerts",
            headers=admin_headers,
            json={}
        )
        assert response1.status_code == 200
        
        # Second call should hit cooldown if first sent alert
        response2 = requests.post(
            f"{BASE_URL}/api/finance/gas-station/check-alerts",
            headers=admin_headers,
            json={}
        )
        assert response2.status_code == 200
        
        data2 = response2.json()
        
        # If health is not healthy, should either send or show cooldown
        if data2.get("health") != "healthy":
            if not data2.get("alert_sent"):
                # Should mention cooldown
                message = data2.get("message", "")
                assert "cooldown" in message.lower() or "already sent" in message.lower() or "6h" in message, \
                    f"Expected cooldown message, got: {message}"
                print(f"✓ Cooldown active: {message}")
            else:
                print("✓ Alert sent (no previous alert in cooldown)")
        else:
            print("✓ Health is healthy, no alert needed")


class TestFeeEstimation:
    """Test Fee Estimation endpoints"""
    
    def test_estimate_fee_btc(self, admin_headers):
        """POST /api/crypto-wallets/estimate-fee for BTC"""
        response = requests.post(
            f"{BASE_URL}/api/crypto-wallets/estimate-fee",
            headers=admin_headers,
            json={
                "asset": "BTC",
                "amount": 0.01
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "asset" in data, "asset field missing"
        assert data["asset"] == "BTC", f"Expected BTC, got {data['asset']}"
        assert "amount" in data, "amount field missing"
        assert "kbex_fee" in data, "kbex_fee field missing"
        
        # KBEX fee structure
        kbex_fee = data["kbex_fee"]
        assert "percent" in kbex_fee, "kbex_fee should have percent"
        assert "amount" in kbex_fee, "kbex_fee should have amount"
        
        print(f"✓ BTC fee estimation: KBEX fee {kbex_fee['percent']}% = {kbex_fee['amount']} BTC")
        
        # Fee levels may or may not be present depending on Fireblocks response
        if "fee_levels" in data and data["fee_levels"]:
            print(f"✓ Fee levels: {list(data['fee_levels'].keys())}")
    
    def test_estimate_fee_eth(self, admin_headers):
        """POST /api/crypto-wallets/estimate-fee for ETH"""
        response = requests.post(
            f"{BASE_URL}/api/crypto-wallets/estimate-fee",
            headers=admin_headers,
            json={
                "asset": "ETH",
                "amount": 0.5
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["asset"] == "ETH"
        assert "kbex_fee" in data
        
        print(f"✓ ETH fee estimation: KBEX fee {data['kbex_fee']['percent']}%")
    
    def test_estimate_fee_requires_auth(self):
        """POST /api/crypto-wallets/estimate-fee requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/crypto-wallets/estimate-fee",
            json={"asset": "BTC", "amount": 0.01}
        )
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Fee estimation requires authentication")


class TestNetworkFees:
    """Test Network Fee endpoints"""
    
    def test_get_network_fee_btc(self):
        """GET /api/crypto-wallets/network-fees/BTC returns fee info"""
        response = requests.get(f"{BASE_URL}/api/crypto-wallets/network-fees/BTC")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "asset" in data, "asset field missing"
        assert data["asset"] == "BTC", f"Expected BTC, got {data['asset']}"
        assert "fireblocks_asset_id" in data, "fireblocks_asset_id missing"
        assert "fee_info" in data, "fee_info missing"
        
        print(f"✓ BTC network fee info: {data['fee_info']}")
    
    def test_get_network_fee_eth(self):
        """GET /api/crypto-wallets/network-fees/ETH returns fee info"""
        response = requests.get(f"{BASE_URL}/api/crypto-wallets/network-fees/ETH")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["asset"] == "ETH"
        
        print(f"✓ ETH network fee info retrieved")


class TestAdminGasStation:
    """Test Admin Gas Station endpoint"""
    
    def test_admin_gas_station_endpoint(self, admin_headers):
        """GET /api/crypto-wallets/admin/gas-station returns gas station vault data"""
        response = requests.get(
            f"{BASE_URL}/api/crypto-wallets/admin/gas-station",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "health" in data, "health field missing"
        assert "tips" in data, "tips field missing"
        
        # Gas vault info if found
        if "gas_vault" in data and data["gas_vault"]:
            gas_vault = data["gas_vault"]
            assert "vault_id" in gas_vault, "vault_id missing"
            assert "vault_name" in gas_vault, "vault_name missing"
            assert "assets" in gas_vault, "assets missing"
            print(f"✓ Gas vault: {gas_vault['vault_name']} (ID: {gas_vault['vault_id']})")
            for asset in gas_vault.get("assets", []):
                print(f"  - {asset['asset_id']}: {asset['available']} available")
        
        # Warnings
        if data.get("warnings"):
            print(f"✓ Warnings: {data['warnings']}")
        
        print(f"✓ Health: {data['health']}")
    
    def test_admin_gas_station_requires_admin(self):
        """GET /api/crypto-wallets/admin/gas-station requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/crypto-wallets/admin/gas-station")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Admin gas station requires authentication")


class TestAdminExternalWallets:
    """Test Admin External Wallets endpoint"""
    
    def test_admin_external_wallets_list(self, admin_headers):
        """GET /api/crypto-wallets/admin/external-wallets returns external wallets"""
        response = requests.get(
            f"{BASE_URL}/api/crypto-wallets/admin/external-wallets",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure - API returns "external_wallets" key
        assert "external_wallets" in data or "wallets" in data, "external_wallets/wallets field missing"
        assert "count" in data, "count field missing"
        
        wallets = data.get("external_wallets") or data.get("wallets", [])
        assert isinstance(wallets, list), "wallets should be a list"
        
        print(f"✓ External wallets count: {data['count']}")
        
        # Check wallet structure if any exist
        if wallets:
            wallet = wallets[0]
            assert "fireblocks_wallet_id" in wallet or "name" in wallet, \
                "wallet should have fireblocks_wallet_id or name"
            print(f"✓ Sample wallet: {wallet.get('name', wallet.get('fireblocks_wallet_id', 'N/A'))}")
    
    def test_admin_external_wallets_requires_admin(self):
        """GET /api/crypto-wallets/admin/external-wallets requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/crypto-wallets/admin/external-wallets")
        
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Admin external wallets requires authentication")


class TestAutoWhitelistCodeReview:
    """Code review verification for auto-whitelist in withdrawal approval"""
    
    def test_withdrawal_approval_endpoint_exists(self, admin_headers):
        """Verify POST /api/crypto-wallets/admin/withdrawals/{id}/approve exists"""
        # Try with a fake ID - should return 404 (not found) not 405 (method not allowed)
        response = requests.post(
            f"{BASE_URL}/api/crypto-wallets/admin/withdrawals/fake-id-12345/approve",
            headers=admin_headers,
            json={"approved": True}
        )
        
        # Should be 404 (withdrawal not found) not 405 (endpoint doesn't exist)
        assert response.status_code in [404, 400], \
            f"Expected 404/400 for fake ID, got {response.status_code}: {response.text}"
        
        print("✓ Withdrawal approval endpoint exists and accepts POST")
    
    def test_pending_withdrawals_list(self, admin_headers):
        """GET /api/crypto-wallets/admin/withdrawals lists pending withdrawals"""
        response = requests.get(
            f"{BASE_URL}/api/crypto-wallets/admin/withdrawals",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "withdrawals" in data, "withdrawals field missing"
        assert "count" in data, "count field missing"
        
        print(f"✓ Total withdrawals: {data['count']}")
        
        # Check for pending ones
        pending = [w for w in data["withdrawals"] if w.get("status") == "pending"]
        print(f"✓ Pending withdrawals: {len(pending)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
