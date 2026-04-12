"""
Trading API Tests - Tests for the cryptocurrency exchange functionality
Covers: Public endpoints (cryptos, fees), authenticated endpoints (limits, buy, sell, swap, orders),
and admin endpoints (fees management, limits management, bank transfers, orders management)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# ==================== FIXTURES ====================

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
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


# ==================== PUBLIC ENDPOINTS ====================

class TestPublicEndpoints:
    """Tests for public trading endpoints (no authentication required)"""
    
    def test_get_cryptos_list(self, api_client):
        """GET /api/trading/cryptos - should return list of cryptocurrencies with prices"""
        response = api_client.get(f"{BASE_URL}/api/trading/cryptos")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one cryptocurrency"
        
        # Verify structure of first crypto
        crypto = data[0]
        assert "symbol" in crypto, "Crypto should have symbol"
        assert "name" in crypto, "Crypto should have name"
        assert "price_usd" in crypto, "Crypto should have price_usd"
        print(f"✓ Found {len(data)} cryptocurrencies. First: {crypto['symbol']} at ${crypto['price_usd']:.2f}")
    
    def test_get_public_fees(self, api_client):
        """GET /api/trading/fees - should return public trading fees"""
        response = api_client.get(f"{BASE_URL}/api/trading/fees")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "buy_fee_percent" in data, "Should have buy_fee_percent"
        assert "sell_fee_percent" in data, "Should have sell_fee_percent"
        assert "swap_fee_percent" in data, "Should have swap_fee_percent"
        assert "network_fees" in data, "Should have network_fees"
        
        # Verify fees are reasonable percentages
        assert 0 <= data["buy_fee_percent"] <= 10, "Buy fee should be between 0-10%"
        assert 0 <= data["sell_fee_percent"] <= 10, "Sell fee should be between 0-10%"
        assert 0 <= data["swap_fee_percent"] <= 10, "Swap fee should be between 0-10%"
        
        print(f"✓ Fees: Buy={data['buy_fee_percent']}%, Sell={data['sell_fee_percent']}%, Swap={data['swap_fee_percent']}%")
    
    def test_get_single_crypto_price(self, api_client):
        """GET /api/trading/price/{symbol} - should return price for single crypto"""
        response = api_client.get(f"{BASE_URL}/api/trading/price/BTC")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "symbol" in data, "Should have symbol"
        assert "price_usd" in data, "Should have price_usd"
        assert data["symbol"] == "BTC", "Symbol should be BTC"
        assert data["price_usd"] > 0, "Price should be positive"
        
        print(f"✓ BTC price: ${data['price_usd']:.2f}")


# ==================== AUTHENTICATED USER ENDPOINTS ====================

class TestAuthenticatedUserEndpoints:
    """Tests for authenticated user trading endpoints"""
    
    def test_get_user_limits(self, admin_client):
        """GET /api/trading/limits - should return user's trading limits"""
        response = admin_client.get(f"{BASE_URL}/api/trading/limits")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tier" in data, "Should have tier"
        assert "limits" in data, "Should have limits"
        assert "usage" in data, "Should have usage"
        
        limits = data["limits"]
        assert "daily_buy_limit" in limits, "Should have daily_buy_limit"
        assert "daily_sell_limit" in limits, "Should have daily_sell_limit"
        assert "monthly_buy_limit" in limits, "Should have monthly_buy_limit"
        
        print(f"✓ User tier: {data['tier']}, Daily buy limit: ${limits['daily_buy_limit']}")
    
    def test_get_user_orders(self, admin_client):
        """GET /api/trading/orders - should return user's trading orders"""
        response = admin_client.get(f"{BASE_URL}/api/trading/orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Found {len(data)} orders for user")
    
    def test_get_user_bank_accounts(self, admin_client):
        """GET /api/trading/bank-accounts - should return user's bank accounts"""
        response = admin_client.get(f"{BASE_URL}/api/trading/bank-accounts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Found {len(data)} bank accounts for user")
    
    def test_get_user_bank_transfers(self, admin_client):
        """GET /api/trading/bank-transfers - should return user's bank transfers"""
        response = admin_client.get(f"{BASE_URL}/api/trading/bank-transfers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Found {len(data)} bank transfers for user")


# ==================== BUY ORDER TESTS ====================

class TestBuyOrders:
    """Tests for buy order creation"""
    
    def test_buy_with_card_payment(self, admin_client):
        """POST /api/trading/buy - should create buy order with card payment"""
        response = admin_client.post(f"{BASE_URL}/api/trading/buy", json={
            "crypto_symbol": "BTC",
            "fiat_amount": 100.0,
            "payment_method": "card",
            "network": "bitcoin"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should be successful"
        assert "order_id" in data, "Should have order_id"
        assert "checkout_url" in data, "Should have checkout_url for Stripe"
        assert "session_id" in data, "Should have session_id"
        assert "summary" in data, "Should have summary"
        
        summary = data["summary"]
        assert "crypto_amount" in summary, "Summary should have crypto_amount"
        assert "fee" in summary, "Summary should have fee"
        assert "total" in summary, "Summary should have total"
        
        print(f"✓ Buy order created: {summary['crypto_amount']:.8f} BTC, total: ${summary['total']:.2f}")
    
    def test_buy_with_bank_transfer(self, admin_client):
        """POST /api/trading/buy - should create buy order with bank transfer"""
        response = admin_client.post(f"{BASE_URL}/api/trading/buy", json={
            "crypto_symbol": "ETH",
            "fiat_amount": 150.0,
            "payment_method": "bank_transfer",
            "network": "ethereum"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should be successful"
        assert "order_id" in data, "Should have order_id"
        assert "bank_transfer" in data, "Should have bank_transfer details"
        
        bank_transfer = data["bank_transfer"]
        assert "recipient_iban" in bank_transfer, "Should have recipient_iban"
        assert "reference_code" in bank_transfer, "Should have reference_code"
        assert "amount" in bank_transfer, "Should have amount"
        
        print(f"✓ Bank transfer order created, reference: {bank_transfer['reference_code']}")
    
    def test_buy_below_minimum(self, admin_client):
        """POST /api/trading/buy - should reject order below minimum amount"""
        response = admin_client.post(f"{BASE_URL}/api/trading/buy", json={
            "crypto_symbol": "BTC",
            "fiat_amount": 1.0,  # Below minimum
            "payment_method": "card"
        })
        
        # Should be rejected due to minimum limit
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        assert "minimum" in data["detail"].lower() or "min" in data["detail"].lower(), \
            f"Error should mention minimum: {data['detail']}"
        
        print(f"✓ Below minimum correctly rejected: {data['detail']}")


# ==================== SELL ORDER TESTS ====================

class TestSellOrders:
    """Tests for sell order creation"""
    
    def test_sell_without_balance(self, admin_client):
        """POST /api/trading/sell - should reject sell without sufficient balance"""
        response = admin_client.post(f"{BASE_URL}/api/trading/sell", json={
            "crypto_symbol": "BTC",
            "crypto_amount": 100.0,  # Large amount user likely doesn't have
            "payment_method": "bank_transfer"
        })
        
        # Should be rejected due to insufficient balance
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        
        print(f"✓ Sell without balance correctly rejected: {data['detail']}")


# ==================== SWAP ORDER TESTS ====================

class TestSwapOrders:
    """Tests for swap/convert order creation"""
    
    def test_swap_without_balance(self, admin_client):
        """POST /api/trading/swap - should reject swap without sufficient balance"""
        response = admin_client.post(f"{BASE_URL}/api/trading/swap", json={
            "from_crypto": "BTC",
            "to_crypto": "ETH",
            "from_amount": 10.0  # Large amount user likely doesn't have
        })
        
        # Should be rejected due to insufficient balance
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        
        print(f"✓ Swap without balance correctly rejected: {data['detail']}")


# ==================== ADMIN FEES ENDPOINTS ====================

class TestAdminFees:
    """Tests for admin fee management endpoints"""
    
    def test_get_admin_fees(self, admin_client):
        """GET /api/trading/admin/fees - should return full fee configuration"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/fees")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Should have all fee fields
        assert "buy_fee_percent" in data, "Should have buy_fee_percent"
        assert "sell_fee_percent" in data, "Should have sell_fee_percent"
        assert "swap_fee_percent" in data, "Should have swap_fee_percent"
        assert "buy_spread_percent" in data, "Should have buy_spread_percent"
        assert "sell_spread_percent" in data, "Should have sell_spread_percent"
        assert "min_buy_fee_usd" in data, "Should have min_buy_fee_usd"
        assert "min_sell_fee_usd" in data, "Should have min_sell_fee_usd"
        assert "min_swap_fee_usd" in data, "Should have min_swap_fee_usd"
        
        print(f"✓ Admin fees retrieved: Buy fee={data['buy_fee_percent']}%, Spread={data['buy_spread_percent']}%")
    
    def test_update_admin_fees(self, admin_client):
        """PUT /api/trading/admin/fees - should update fee configuration"""
        # First get current fees
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/fees")
        original_fees = response.json()
        
        # Update fees
        response = admin_client.put(f"{BASE_URL}/api/trading/admin/fees", json={
            "buy_fee_percent": 2.5
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should be successful"
        
        # Verify update
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/fees")
        updated_fees = response.json()
        assert updated_fees["buy_fee_percent"] == 2.5, "Fee should be updated"
        
        # Restore original fee
        admin_client.put(f"{BASE_URL}/api/trading/admin/fees", json={
            "buy_fee_percent": original_fees["buy_fee_percent"]
        })
        
        print(f"✓ Admin fees updated and restored successfully")


# ==================== ADMIN LIMITS ENDPOINTS ====================

class TestAdminLimits:
    """Tests for admin limits management endpoints"""
    
    def test_get_all_limits(self, admin_client):
        """GET /api/trading/admin/limits - should return limits for all tiers"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/limits")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 3, "Should have 3 tiers (standard, premium, vip)"
        
        tiers = [item["tier"] for item in data]
        assert "standard" in tiers, "Should have standard tier"
        assert "premium" in tiers, "Should have premium tier"
        assert "vip" in tiers, "Should have vip tier"
        
        print(f"✓ All tier limits retrieved: {tiers}")
    
    def test_get_tier_limits(self, admin_client):
        """GET /api/trading/admin/limits/{tier} - should return limits for specific tier"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/limits/standard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["tier"] == "standard", "Should be standard tier"
        assert "daily_buy_limit" in data, "Should have daily_buy_limit"
        assert "monthly_buy_limit" in data, "Should have monthly_buy_limit"
        
        print(f"✓ Standard tier limits: Daily buy=${data['daily_buy_limit']}")
    
    def test_update_tier_limits(self, admin_client):
        """PUT /api/trading/admin/limits/{tier} - should update tier limits"""
        # First get current limits
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/limits/standard")
        original_limits = response.json()
        
        # Update limits
        response = admin_client.put(f"{BASE_URL}/api/trading/admin/limits/standard", json={
            "daily_buy_limit": 6000.0
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should be successful"
        
        # Verify update
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/limits/standard")
        updated_limits = response.json()
        assert updated_limits["daily_buy_limit"] == 6000.0, "Limit should be updated"
        
        # Restore original limit
        admin_client.put(f"{BASE_URL}/api/trading/admin/limits/standard", json={
            "daily_buy_limit": original_limits["daily_buy_limit"]
        })
        
        print(f"✓ Standard tier limits updated and restored successfully")
    
    def test_invalid_tier_returns_400(self, admin_client):
        """PUT /api/trading/admin/limits/{tier} - should reject invalid tier"""
        response = admin_client.put(f"{BASE_URL}/api/trading/admin/limits/invalid_tier", json={
            "daily_buy_limit": 1000.0
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print(f"✓ Invalid tier correctly rejected")


# ==================== ADMIN ORDERS ENDPOINTS ====================

class TestAdminOrders:
    """Tests for admin order management endpoints"""
    
    def test_list_all_orders(self, admin_client):
        """GET /api/trading/admin/orders - should list all trading orders"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Admin can see {len(data)} orders")
    
    def test_filter_orders_by_status(self, admin_client):
        """GET /api/trading/admin/orders?status=pending - should filter by status"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/orders?status=pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All orders should have pending status (if any)
        for order in data:
            assert order["status"] == "pending", f"Order should be pending, got {order['status']}"
        
        print(f"✓ Found {len(data)} pending orders")
    
    def test_filter_orders_by_type(self, admin_client):
        """GET /api/trading/admin/orders?order_type=buy - should filter by type"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/orders?order_type=buy")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All orders should be buy type (if any)
        for order in data:
            assert order["order_type"] == "buy", f"Order should be buy, got {order['order_type']}"
        
        print(f"✓ Found {len(data)} buy orders")


# ==================== ADMIN BANK TRANSFERS ENDPOINTS ====================

class TestAdminBankTransfers:
    """Tests for admin bank transfer management endpoints"""
    
    def test_list_all_bank_transfers(self, admin_client):
        """GET /api/trading/admin/bank-transfers - should list all bank transfers"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/bank-transfers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Admin can see {len(data)} bank transfers")
    
    def test_filter_transfers_by_status(self, admin_client):
        """GET /api/trading/admin/bank-transfers?status=pending - should filter by status"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/bank-transfers?status=pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Found {len(data)} pending bank transfers")
    
    def test_filter_transfers_by_type(self, admin_client):
        """GET /api/trading/admin/bank-transfers?transfer_type=deposit - should filter by type"""
        response = admin_client.get(f"{BASE_URL}/api/trading/admin/bank-transfers?transfer_type=deposit")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All transfers should be deposit type (if any)
        for transfer in data:
            assert transfer["transfer_type"] == "deposit", f"Transfer should be deposit, got {transfer['transfer_type']}"
        
        print(f"✓ Found {len(data)} deposit transfers")


# ==================== NON-ADMIN ACCESS TESTS ====================

class TestNonAdminAccess:
    """Tests for non-admin access to admin endpoints"""
    
    def test_unauthenticated_access_to_admin_fees(self, api_client):
        """GET /api/trading/admin/fees - should require authentication"""
        # Remove auth header if present
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/trading/admin/fees")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print(f"✓ Admin fees endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
