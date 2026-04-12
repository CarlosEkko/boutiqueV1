"""
Cold Wallet API Tests
Tests for Trezor cold wallet endpoints: fee estimates, ETH params, UTXOs, broadcast, transactions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# Test addresses for blockchain data
# Using a known active BTC address (Bitfinex cold wallet)
BTC_TEST_ADDRESS = "3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5"
ETH_TEST_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # Vitalik's address
LTC_TEST_ADDRESS = "LTC1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"  # Example LTC address


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for admin user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        # Auth response uses 'access_token' field
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ============================================================
# Authentication Tests
# ============================================================

class TestAuthRequired:
    """Test that endpoints require authentication"""
    
    def test_fee_estimate_requires_auth(self, api_client):
        """GET /api/cold-wallet/fee-estimate/BTC should return 401/403 without token"""
        response = api_client.get(f"{BASE_URL}/api/cold-wallet/fee-estimate/BTC")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: fee-estimate requires authentication")
    
    def test_eth_params_requires_auth(self, api_client):
        """GET /api/cold-wallet/eth-params/{address} should return 401/403 without token"""
        response = api_client.get(f"{BASE_URL}/api/cold-wallet/eth-params/{ETH_TEST_ADDRESS}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: eth-params requires authentication")
    
    def test_utxos_requires_auth(self, api_client):
        """GET /api/cold-wallet/utxos/{address} should return 401/403 without token"""
        response = api_client.get(f"{BASE_URL}/api/cold-wallet/utxos/{BTC_TEST_ADDRESS}?coin=BTC")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: utxos requires authentication")
    
    def test_transactions_requires_auth(self, api_client):
        """GET /api/cold-wallet/transactions should return 401/403 without token"""
        response = api_client.get(f"{BASE_URL}/api/cold-wallet/transactions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: transactions requires authentication")
    
    def test_broadcast_requires_auth(self, api_client):
        """POST /api/cold-wallet/broadcast should return 401/403 without token"""
        response = api_client.post(f"{BASE_URL}/api/cold-wallet/broadcast", json={
            "coin": "BTC",
            "hex_tx": "0100000001"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: broadcast requires authentication")


# ============================================================
# Fee Estimate Tests (Client Endpoints)
# ============================================================

class TestFeeEstimates:
    """Test fee estimate endpoints for BTC, ETH, LTC"""
    
    def test_btc_fee_estimate(self, authenticated_client):
        """GET /api/cold-wallet/fee-estimate/BTC returns fee estimate with fast/medium/slow"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/fee-estimate/BTC")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coin") == "BTC", f"Expected coin=BTC, got {data.get('coin')}"
        assert "fast" in data, "Missing 'fast' fee field"
        assert "medium" in data, "Missing 'medium' fee field"
        assert "slow" in data, "Missing 'slow' fee field"
        
        # Validate fee values are non-negative integers (sat/vB) - slow can be 0 during low congestion
        assert isinstance(data["fast"], int) and data["fast"] >= 0, f"Invalid fast fee: {data['fast']}"
        assert isinstance(data["medium"], int) and data["medium"] >= 0, f"Invalid medium fee: {data['medium']}"
        assert isinstance(data["slow"], int) and data["slow"] >= 0, f"Invalid slow fee: {data['slow']}"
        
        print(f"PASS: BTC fee estimate - fast={data['fast']}, medium={data['medium']}, slow={data['slow']} sat/vB")
    
    def test_eth_fee_estimate(self, authenticated_client):
        """GET /api/cold-wallet/fee-estimate/ETH returns fee estimate with gas_price_gwei"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/fee-estimate/ETH")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coin") == "ETH", f"Expected coin=ETH, got {data.get('coin')}"
        assert "gas_price_gwei" in data, "Missing 'gas_price_gwei' field"
        
        # Validate gas price is a positive number
        gas_price = data["gas_price_gwei"]
        assert isinstance(gas_price, (int, float)) and gas_price > 0, f"Invalid gas_price_gwei: {gas_price}"
        
        print(f"PASS: ETH fee estimate - gas_price_gwei={gas_price}")
    
    def test_ltc_fee_estimate(self, authenticated_client):
        """GET /api/cold-wallet/fee-estimate/LTC returns fee estimate object"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/fee-estimate/LTC")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coin") == "LTC", f"Expected coin=LTC, got {data.get('coin')}"
        assert "fast" in data, "Missing 'fast' fee field"
        assert "medium" in data, "Missing 'medium' fee field"
        assert "slow" in data, "Missing 'slow' fee field"
        
        print(f"PASS: LTC fee estimate - fast={data['fast']}, medium={data['medium']}, slow={data['slow']}")
    
    def test_unsupported_coin_fee_estimate(self, authenticated_client):
        """GET /api/cold-wallet/fee-estimate/DOGE returns 400 for unsupported coin"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/fee-estimate/DOGE")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Unsupported coin returns 400")


# ============================================================
# ETH Params Tests
# ============================================================

class TestEthParams:
    """Test ETH params endpoint"""
    
    def test_eth_params_valid_address(self, authenticated_client):
        """GET /api/cold-wallet/eth-params/{address} returns nonce, gas_price, balance"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/eth-params/{ETH_TEST_ADDRESS}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate required fields
        assert "nonce" in data, "Missing 'nonce' field"
        assert "gas_price" in data, "Missing 'gas_price' field"
        assert "gas_price_gwei" in data, "Missing 'gas_price_gwei' field"
        assert "balance_wei" in data, "Missing 'balance_wei' field"
        assert "balance_eth" in data, "Missing 'balance_eth' field"
        
        # Validate data types
        assert isinstance(data["nonce"], int), f"nonce should be int, got {type(data['nonce'])}"
        assert isinstance(data["gas_price"], int), f"gas_price should be int, got {type(data['gas_price'])}"
        assert isinstance(data["gas_price_gwei"], (int, float)), f"gas_price_gwei should be number"
        assert isinstance(data["balance_wei"], str), f"balance_wei should be string"
        assert isinstance(data["balance_eth"], (int, float)), f"balance_eth should be number"
        
        print(f"PASS: ETH params - nonce={data['nonce']}, gas_price_gwei={data['gas_price_gwei']}, balance_eth={data['balance_eth']}")


# ============================================================
# UTXO Tests
# ============================================================

class TestUtxos:
    """Test UTXO endpoint for BTC addresses"""
    
    def test_btc_utxos_valid_address(self, authenticated_client):
        """GET /api/cold-wallet/utxos/{address}?coin=BTC returns utxos array"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/utxos/{BTC_TEST_ADDRESS}?coin=BTC")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coin") == "BTC", f"Expected coin=BTC, got {data.get('coin')}"
        assert data.get("address") == BTC_TEST_ADDRESS, f"Address mismatch"
        assert "utxos" in data, "Missing 'utxos' field"
        assert isinstance(data["utxos"], list), f"utxos should be list, got {type(data['utxos'])}"
        
        # Satoshi's address should have UTXOs (it receives donations)
        if len(data["utxos"]) > 0:
            utxo = data["utxos"][0]
            assert "txid" in utxo, "UTXO missing 'txid'"
            assert "vout" in utxo, "UTXO missing 'vout'"
            assert "value" in utxo, "UTXO missing 'value'"
            print(f"PASS: BTC UTXOs - found {len(data['utxos'])} UTXOs for Satoshi's address")
        else:
            print(f"PASS: BTC UTXOs - returned empty array (address may have no unspent outputs)")


# ============================================================
# Transaction History Tests
# ============================================================

class TestTransactions:
    """Test transaction history endpoint"""
    
    def test_get_transactions(self, authenticated_client):
        """GET /api/cold-wallet/transactions returns transaction history (may be empty)"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/transactions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        print(f"PASS: Transactions endpoint - returned {len(data)} transactions")


# ============================================================
# Broadcast Tests
# ============================================================

class TestBroadcast:
    """Test broadcast endpoint validation"""
    
    def test_broadcast_validates_required_fields(self, authenticated_client):
        """POST /api/cold-wallet/broadcast validates coin and hex_tx are required"""
        # Missing hex_tx
        response = authenticated_client.post(f"{BASE_URL}/api/cold-wallet/broadcast", json={
            "coin": "BTC"
        })
        assert response.status_code == 422, f"Expected 422 for missing hex_tx, got {response.status_code}"
        
        # Missing coin
        response = authenticated_client.post(f"{BASE_URL}/api/cold-wallet/broadcast", json={
            "hex_tx": "0100000001"
        })
        assert response.status_code == 422, f"Expected 422 for missing coin, got {response.status_code}"
        
        print("PASS: Broadcast validates required fields (coin, hex_tx)")
    
    def test_broadcast_invalid_tx_returns_error(self, authenticated_client):
        """POST /api/cold-wallet/broadcast with invalid tx returns 502"""
        response = authenticated_client.post(f"{BASE_URL}/api/cold-wallet/broadcast", json={
            "coin": "BTC",
            "hex_tx": "invalid_hex_transaction"
        })
        # Should return 502 (bad gateway) because blockchain API will reject invalid tx
        assert response.status_code == 502, f"Expected 502 for invalid tx, got {response.status_code}"
        print("PASS: Broadcast returns 502 for invalid transaction")


# ============================================================
# Admin Endpoint Tests
# ============================================================

class TestAdminEndpoints:
    """Test admin cold wallet endpoints"""
    
    def test_admin_fee_estimate_btc(self, authenticated_client):
        """GET /api/cold-wallet/admin/fee-estimate/BTC returns fee estimate"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/admin/fee-estimate/BTC")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coin") == "BTC"
        assert "fast" in data
        assert "medium" in data
        assert "slow" in data
        
        print(f"PASS: Admin BTC fee estimate - fast={data['fast']}, medium={data['medium']}, slow={data['slow']}")
    
    def test_admin_eth_params(self, authenticated_client):
        """GET /api/cold-wallet/admin/eth-params/{address} returns ETH params"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/admin/eth-params/{ETH_TEST_ADDRESS}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "nonce" in data
        assert "gas_price" in data
        assert "gas_price_gwei" in data
        assert "balance_wei" in data
        assert "balance_eth" in data
        
        print(f"PASS: Admin ETH params - nonce={data['nonce']}, balance_eth={data['balance_eth']}")
    
    def test_admin_utxos(self, authenticated_client):
        """GET /api/cold-wallet/admin/utxos/{address}?coin=BTC returns UTXOs"""
        response = authenticated_client.get(f"{BASE_URL}/api/cold-wallet/admin/utxos/{BTC_TEST_ADDRESS}?coin=BTC")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coin") == "BTC"
        assert "utxos" in data
        assert isinstance(data["utxos"], list)
        
        print(f"PASS: Admin UTXOs - found {len(data['utxos'])} UTXOs")


# ============================================================
# Run tests
# ============================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
