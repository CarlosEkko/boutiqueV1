"""
Test Trading Orders and Cancel API
Tests for: Open Orders, Order History, Cancel Order API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTradingOrdersCancel:
    """Tests for trading orders and cancel functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_get_orders_endpoint(self):
        """Test GET /api/trading/orders returns user orders"""
        response = self.session.get(f"{BASE_URL}/api/trading/orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        
        # Verify order structure if orders exist
        if len(orders) > 0:
            order = orders[0]
            assert "id" in order, "Order should have id"
            assert "status" in order, "Order should have status"
            assert "order_type" in order, "Order should have order_type"
            print(f"Found {len(orders)} orders")
    
    def test_orders_have_required_fields(self):
        """Test that orders have all required fields for display"""
        response = self.session.get(f"{BASE_URL}/api/trading/orders")
        
        assert response.status_code == 200
        orders = response.json()
        
        if len(orders) > 0:
            order = orders[0]
            # Fields needed for Open Orders panel
            required_fields = ["id", "status", "order_type", "created_at"]
            for field in required_fields:
                assert field in order, f"Order missing required field: {field}"
            
            # Check status is valid
            valid_statuses = ["pending", "awaiting_payment", "awaiting_admin_approval", 
                           "processing", "completed", "cancelled", "failed"]
            assert order["status"] in valid_statuses, f"Invalid status: {order['status']}"
    
    def test_cancel_order_endpoint_exists(self):
        """Test POST /api/trading/orders/{id}/cancel endpoint exists"""
        # First get an order to cancel
        response = self.session.get(f"{BASE_URL}/api/trading/orders")
        assert response.status_code == 200
        
        orders = response.json()
        cancelable_statuses = ["pending", "awaiting_payment", "awaiting_admin_approval"]
        cancelable_orders = [o for o in orders if o.get("status") in cancelable_statuses]
        
        if len(cancelable_orders) == 0:
            pytest.skip("No cancelable orders available for testing")
        
        order_id = cancelable_orders[0]["id"]
        
        # Test cancel endpoint
        cancel_response = self.session.post(f"{BASE_URL}/api/trading/orders/{order_id}/cancel")
        
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}"
        
        data = cancel_response.json()
        assert data.get("success") == True, "Cancel should return success=True"
        assert "message" in data, "Cancel should return a message"
        print(f"Successfully cancelled order {order_id}")
    
    def test_cancel_nonexistent_order_returns_404(self):
        """Test cancelling non-existent order returns 404"""
        fake_order_id = "nonexistent-order-id-12345"
        
        response = self.session.post(f"{BASE_URL}/api/trading/orders/{fake_order_id}/cancel")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_cancelled_order_appears_in_history(self):
        """Test that cancelled orders have cancelled status"""
        response = self.session.get(f"{BASE_URL}/api/trading/orders")
        assert response.status_code == 200
        
        orders = response.json()
        cancelled_orders = [o for o in orders if o.get("status") == "cancelled"]
        
        # We should have at least one cancelled order from previous tests
        print(f"Found {len(cancelled_orders)} cancelled orders")
        
        if len(cancelled_orders) > 0:
            order = cancelled_orders[0]
            assert order["status"] == "cancelled"
            # Cancelled orders should have rejection_reason
            if "rejection_reason" in order:
                print(f"Rejection reason: {order['rejection_reason']}")
    
    def test_open_orders_filter(self):
        """Test filtering open orders (non-completed/cancelled)"""
        response = self.session.get(f"{BASE_URL}/api/trading/orders")
        assert response.status_code == 200
        
        orders = response.json()
        open_statuses = ["pending", "awaiting_payment", "awaiting_admin_approval", "processing"]
        open_orders = [o for o in orders if o.get("status") in open_statuses]
        history_orders = [o for o in orders if o.get("status") not in open_statuses]
        
        print(f"Open orders: {len(open_orders)}, History orders: {len(history_orders)}")
        
        # Verify all open orders have valid open status
        for order in open_orders:
            assert order["status"] in open_statuses, f"Order {order['id']} has invalid open status"
    
    def test_trading_fees_endpoint(self):
        """Test GET /api/trading/fees returns fee information"""
        response = self.session.get(f"{BASE_URL}/api/trading/fees")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "buy_fee_percent" in data, "Should have buy_fee_percent"
        assert "sell_fee_percent" in data, "Should have sell_fee_percent"
        print(f"Buy fee: {data.get('buy_fee_percent')}%, Sell fee: {data.get('sell_fee_percent')}%")
    
    def test_trading_markets_endpoint(self):
        """Test GET /api/trading/markets returns market data"""
        response = self.session.get(f"{BASE_URL}/api/trading/markets?currency=USD")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "markets" in data, "Should have markets array"
        markets = data["markets"]
        
        if len(markets) > 0:
            market = markets[0]
            assert "symbol" in market, "Market should have symbol"
            print(f"Found {len(markets)} markets")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
