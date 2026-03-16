"""
Test suite for Crypto Networks UI Corrections:
- Network selector with logos for deposits/withdrawals
- USDT TRC20 mapping validation (TRX_USDT_S2UZ)
- Wallet modal with Buy/Sell buttons
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_session():
    """Create an authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "carlos@kryptobox.io",
        "password": "senha123"
    })
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    token = login_response.json().get("access_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session


class TestNetworksEndpoint:
    """Tests for GET /api/crypto-wallets/networks/{asset}"""
    
    def test_usdt_networks_returns_multi_network(self, api_session):
        """Test USDT returns multiple network options"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/networks/USDT")
        assert response.status_code == 200
        
        data = response.json()
        assert data["asset"] == "USDT"
        assert data["is_multi_network"] == True
        assert len(data["networks"]) >= 5, "USDT should have multiple networks"
        
    def test_usdt_trc20_has_correct_fireblocks_id(self, api_session):
        """Test TRC20 network has correct fireblocks_id = TRX_USDT_S2UZ"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/networks/USDT")
        assert response.status_code == 200
        
        data = response.json()
        networks = data["networks"]
        
        # Find TRC20 network
        trc20_network = next((n for n in networks if n["network"] == "TRC20"), None)
        assert trc20_network is not None, "TRC20 network not found"
        
        # Verify fireblocks_id
        assert trc20_network["fireblocks_id"] == "TRX_USDT_S2UZ", \
            f"TRC20 fireblocks_id should be TRX_USDT_S2UZ, got {trc20_network['fireblocks_id']}"
        
        # Verify name
        assert "Tron" in trc20_network["name"], "TRC20 should mention Tron"
        
    def test_usdt_all_networks_have_required_fields(self, api_session):
        """Test all USDT networks have required fields for UI display"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/networks/USDT")
        assert response.status_code == 200
        
        data = response.json()
        networks = data["networks"]
        
        required_fields = ["network", "fireblocks_id", "name", "explorer"]
        
        for network in networks:
            for field in required_fields:
                assert field in network, f"Network missing required field: {field}"
                assert network[field], f"Network field {field} is empty"
                
    def test_usdc_networks_returns_multi_network(self, api_session):
        """Test USDC also returns multiple network options"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/networks/USDC")
        assert response.status_code == 200
        
        data = response.json()
        assert data["asset"] == "USDC"
        assert data["is_multi_network"] == True
        assert len(data["networks"]) >= 4
        
    def test_btc_returns_single_network(self, api_session):
        """Test BTC returns single native network"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/networks/BTC")
        assert response.status_code == 200
        
        data = response.json()
        assert data["asset"] == "BTC"
        assert data["is_multi_network"] == False
        assert len(data["networks"]) == 1
        assert data["networks"][0]["network"] == "native"


class TestDepositAddressEndpoint:
    """Tests for GET /api/crypto-wallets/deposit-address/{asset}/{network}"""
    
    def test_usdt_trc20_deposit_address(self, api_session):
        """Test getting deposit address for USDT on TRC20 network"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/deposit-address/USDT/TRC20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["asset"] == "USDT"
        assert data["network"] == "TRC20"
        assert data["fireblocks_asset_id"] == "TRX_USDT_S2UZ"
        assert data.get("address"), "Address should be returned"
        assert data["network_name"] == "Tron (TRC20)"
        
    def test_usdt_erc20_deposit_address(self, api_session):
        """Test getting deposit address for USDT on ERC20 network"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/deposit-address/USDT/ERC20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["asset"] == "USDT"
        assert data["network"] == "ERC20"
        assert data["fireblocks_asset_id"] == "USDT_ERC20"
        
    def test_usdt_bep20_deposit_address(self, api_session):
        """Test getting deposit address for USDT on BEP20 network"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/deposit-address/USDT/BEP20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["asset"] == "USDT"
        assert data["network"] == "BEP20"
        assert data["fireblocks_asset_id"] == "USDT_BSC"


class TestWalletEndpoints:
    """Tests for wallet-related endpoints used by the wallets page"""
    
    def test_dashboard_wallets_returns_crypto(self, api_session):
        """Test dashboard wallets endpoint returns crypto wallets"""
        response = api_session.get(f"{BASE_URL}/api/dashboard/wallets")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Check for crypto wallets presence
        crypto_symbols = ["BTC", "ETH", "USDT", "USDC"]
        wallet_assets = [w.get("asset_id") for w in data]
        
        for symbol in crypto_symbols:
            assert symbol in wallet_assets, f"{symbol} wallet should be available"
            
    def test_my_vault_endpoint(self, api_session):
        """Test crypto vault status endpoint"""
        response = api_session.get(f"{BASE_URL}/api/crypto-wallets/my-vault")
        assert response.status_code == 200
        
        data = response.json()
        assert "has_vault" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
