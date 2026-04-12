"""
Tests for Crypto-specific Trading Fees Feature
- Tests for GET /api/trading/admin/crypto-fees (list all 50 cryptos)
- Tests for GET /api/trading/admin/crypto-fees/{symbol} (get single crypto fees)
- Tests for PUT /api/trading/admin/crypto-fees/{symbol} (update crypto fees)
- Tests for get_fees_for_crypto helper function behavior
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://boutique-exchange.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in login response"
    return data["access_token"]


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestCryptoFeesListEndpoint:
    """Tests for GET /api/trading/admin/crypto-fees"""

    def test_list_crypto_fees_returns_50_cryptos(self, admin_client):
        """Verify endpoint returns exactly 50 supported cryptocurrencies"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 50, f"Expected 50 cryptos, got {len(data)}"

    def test_list_crypto_fees_contains_top_cryptos(self, admin_client):
        """Verify BTC, ETH, SOL are in the list"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees")
        assert response.status_code == 200
        data = response.json()
        symbols = [c["symbol"] for c in data]
        assert "BTC" in symbols, "BTC not in crypto list"
        assert "ETH" in symbols, "ETH not in crypto list"
        assert "SOL" in symbols, "SOL not in crypto list"

    def test_list_crypto_fees_structure(self, admin_client):
        """Verify each crypto has required fee fields"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees")
        assert response.status_code == 200
        data = response.json()
        
        # Check first crypto has all required fields
        crypto = data[0]
        required_fields = [
            "symbol", "name", "buy_fee_percent", "buy_spread_percent",
            "sell_fee_percent", "sell_spread_percent", "swap_fee_percent",
            "swap_spread_percent", "min_buy_fee", "min_sell_fee", "min_swap_fee"
        ]
        for field in required_fields:
            assert field in crypto, f"Missing field: {field}"

    def test_unauthenticated_access_denied(self, api_client):
        """Verify unauthenticated access is denied"""
        # Create new session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.get(f"{BASE_URL}/api/trading/admin/crypto-fees")
        assert response.status_code == 403 or response.status_code == 401


class TestSingleCryptoFeesEndpoint:
    """Tests for GET /api/trading/admin/crypto-fees/{symbol}"""

    def test_get_btc_fees(self, admin_client):
        """Get BTC fees and verify structure"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/BTC")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "BTC"
        assert data["name"] == "Bitcoin"
        assert "buy_fee_percent" in data
        assert "sell_fee_percent" in data

    def test_get_eth_fees(self, admin_client):
        """Get ETH fees and verify structure"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/ETH")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "ETH"
        assert data["name"] == "Ethereum"

    def test_get_sol_fees(self, admin_client):
        """Get SOL fees and verify structure"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/SOL")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "SOL"
        assert data["name"] == "Solana"

    def test_get_fees_case_insensitive(self, admin_client):
        """Verify symbol lookup is case-insensitive"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/eth")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == "ETH"


class TestUpdateCryptoFeesEndpoint:
    """Tests for PUT /api/trading/admin/crypto-fees/{symbol}"""

    def test_update_btc_buy_fee(self, admin_client):
        """Update BTC buy_fee_percent and verify persistence"""
        # Update fee
        new_fee = 3.0
        response = admin_client.put(f"{BASE_URL}/api/trading/admin/crypto-fees/BTC", json={
            "buy_fee_percent": new_fee
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify persistence
        get_response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/BTC")
        assert get_response.status_code == 200
        assert get_response.json()["buy_fee_percent"] == new_fee

    def test_update_eth_multiple_fields(self, admin_client):
        """Update multiple fee fields for ETH"""
        update_data = {
            "buy_fee_percent": 2.8,
            "sell_fee_percent": 2.6,
            "swap_fee_percent": 1.8,
            "min_buy_fee": 7.0
        }
        response = admin_client.put(f"{BASE_URL}/api/trading/admin/crypto-fees/ETH", json=update_data)
        assert response.status_code == 200

        # Verify all fields updated
        get_response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/ETH")
        data = get_response.json()
        assert data["buy_fee_percent"] == 2.8
        assert data["sell_fee_percent"] == 2.6
        assert data["swap_fee_percent"] == 1.8
        assert data["min_buy_fee"] == 7.0

    def test_update_sol_spread(self, admin_client):
        """Update SOL spread percentages"""
        response = admin_client.put(f"{BASE_URL}/api/trading/admin/crypto-fees/SOL", json={
            "buy_spread_percent": 1.5,
            "sell_spread_percent": 1.3
        })
        assert response.status_code == 200

        get_response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/SOL")
        data = get_response.json()
        assert data["buy_spread_percent"] == 1.5
        assert data["sell_spread_percent"] == 1.3

    def test_partial_update_preserves_other_fields(self, admin_client):
        """Verify partial update doesn't reset other fields"""
        # First get current values
        initial = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/DOGE").json()
        
        # Update only one field
        admin_client.put(f"{BASE_URL}/api/trading/admin/crypto-fees/DOGE", json={
            "swap_fee_percent": 2.0
        })
        
        # Check other fields preserved
        updated = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees/DOGE").json()
        assert updated["swap_fee_percent"] == 2.0
        assert updated["buy_fee_percent"] == initial["buy_fee_percent"]
        assert updated["sell_fee_percent"] == initial["sell_fee_percent"]


class TestPublicFeesEndpoint:
    """Tests for GET /api/trading/fees?crypto={symbol}"""

    def test_get_public_fees_for_btc(self, api_client):
        """Verify public endpoint can fetch crypto-specific fees"""
        response = api_client.get(f"{BASE_URL}/api/trading/fees?crypto=BTC")
        assert response.status_code == 200
        data = response.json()
        assert data.get("crypto") == "BTC"
        assert "buy_fee_percent" in data
        assert "sell_fee_percent" in data

    def test_get_public_fees_without_crypto(self, api_client):
        """Verify endpoint returns currency-based fees when no crypto specified"""
        response = api_client.get(f"{BASE_URL}/api/trading/fees")
        assert response.status_code == 200
        data = response.json()
        assert "currency" in data  # Returns currency-based fees


class TestCryptoFeesDataValidation:
    """Validate fee values and model structure"""

    def test_all_cryptos_have_default_fees(self, admin_client):
        """Verify all 50 cryptos have proper default fee values"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees")
        data = response.json()
        
        for crypto in data:
            assert crypto["buy_fee_percent"] >= 0, f"{crypto['symbol']} has negative buy fee"
            assert crypto["sell_fee_percent"] >= 0, f"{crypto['symbol']} has negative sell fee"
            assert crypto["swap_fee_percent"] >= 0, f"{crypto['symbol']} has negative swap fee"

    def test_crypto_symbols_list(self, admin_client):
        """Verify expected top 50 cryptos are present"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/crypto-fees")
        data = response.json()
        symbols = set(c["symbol"] for c in data)
        
        expected_cryptos = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "LINK", "AVAX", "DOT", "SHIB"]
        for symbol in expected_cryptos:
            assert symbol in symbols, f"Expected {symbol} in crypto list"
