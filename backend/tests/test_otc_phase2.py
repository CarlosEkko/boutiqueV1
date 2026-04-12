"""
OTC Phase 2 Tests - Quotes & Execution
Tests for: market-price, quotes list, create quote, accept/reject quote, executions
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carlos@kryptobox.io"
TEST_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestOTCPhase2:
    """OTC Phase 2 - Quotes & Execution Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data.get("access_token")
        assert self.token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    # ==================== MARKET PRICE TESTS ====================
    
    def test_market_price_btc_eur(self):
        """Test GET /api/otc/market-price for BTC/EUR"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/market-price",
            params={"base_asset": "BTC", "quote_asset": "EUR"}
        )
        
        assert response.status_code == 200, f"Market price failed: {response.text}"
        
        data = response.json()
        assert "price" in data, "No price in response"
        assert "base_asset" in data, "No base_asset in response"
        assert "quote_asset" in data, "No quote_asset in response"
        assert "source" in data, "No source in response"
        
        assert data["base_asset"] == "BTC"
        assert data["quote_asset"] == "EUR"
        assert data["price"] > 0, "Price should be positive"
        assert data["source"] == "binance"
        
        print(f"BTC/EUR price: {data['price']}")
    
    def test_market_price_btc_usd(self):
        """Test GET /api/otc/market-price for BTC/USD"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/market-price",
            params={"base_asset": "BTC", "quote_asset": "USD"}
        )
        
        assert response.status_code == 200, f"Market price failed: {response.text}"
        
        data = response.json()
        assert data["price"] > 0
        assert data["base_asset"] == "BTC"
        assert data["quote_asset"] == "USD"
        
        print(f"BTC/USD price: {data['price']}")
    
    def test_market_price_eth_eur(self):
        """Test GET /api/otc/market-price for ETH/EUR"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/market-price",
            params={"base_asset": "ETH", "quote_asset": "EUR"}
        )
        
        assert response.status_code == 200, f"Market price failed: {response.text}"
        
        data = response.json()
        assert data["price"] > 0
        assert data["base_asset"] == "ETH"
        
        print(f"ETH/EUR price: {data['price']}")
    
    def test_market_price_btc_brl(self):
        """Test GET /api/otc/market-price for BTC/BRL (Brazilian Real)"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/market-price",
            params={"base_asset": "BTC", "quote_asset": "BRL"}
        )
        
        assert response.status_code == 200, f"Market price failed: {response.text}"
        
        data = response.json()
        assert data["price"] > 0
        assert data["quote_asset"] == "BRL"
        
        print(f"BTC/BRL price: {data['price']}")
    
    # ==================== QUOTES LIST TESTS ====================
    
    def test_get_quotes_list(self):
        """Test GET /api/otc/quotes - List all quotes"""
        response = self.session.get(f"{BASE_URL}/api/otc/quotes")
        
        assert response.status_code == 200, f"Get quotes failed: {response.text}"
        
        data = response.json()
        assert "quotes" in data, "No quotes array in response"
        assert "total" in data, "No total count in response"
        assert isinstance(data["quotes"], list)
        
        print(f"Total quotes: {data['total']}")
        
        # Check quote structure if any exist
        if data["quotes"]:
            quote = data["quotes"][0]
            assert "id" in quote
            assert "deal_id" in quote
            assert "status" in quote
            print(f"First quote status: {quote['status']}")
    
    def test_get_quotes_by_status(self):
        """Test GET /api/otc/quotes with status filter"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/quotes",
            params={"status": "sent"}
        )
        
        assert response.status_code == 200, f"Get quotes by status failed: {response.text}"
        
        data = response.json()
        assert "quotes" in data
        
        # All returned quotes should have status 'sent'
        for quote in data["quotes"]:
            assert quote["status"] == "sent", f"Quote has wrong status: {quote['status']}"
    
    # ==================== DEALS TESTS ====================
    
    def test_get_deals_rfq_stage(self):
        """Test GET /api/otc/deals?stage=rfq - Get deals in RFQ stage"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/deals",
            params={"stage": "rfq"}
        )
        
        assert response.status_code == 200, f"Get RFQ deals failed: {response.text}"
        
        data = response.json()
        assert "deals" in data
        assert "total" in data
        
        print(f"RFQ deals: {data['total']}")
    
    def test_get_deals_acceptance_stage(self):
        """Test GET /api/otc/deals?stage=acceptance - Get deals in acceptance stage"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/deals",
            params={"stage": "acceptance"}
        )
        
        assert response.status_code == 200, f"Get acceptance deals failed: {response.text}"
        
        data = response.json()
        assert "deals" in data
        
        print(f"Acceptance deals: {data['total']}")
    
    def test_get_deals_execution_stage(self):
        """Test GET /api/otc/deals?stage=execution - Get deals in execution stage"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/deals",
            params={"stage": "execution"}
        )
        
        assert response.status_code == 200, f"Get execution deals failed: {response.text}"
        
        data = response.json()
        assert "deals" in data
        
        print(f"Execution deals: {data['total']}")
    
    # ==================== QUOTE CREATION FLOW TEST ====================
    
    def test_full_quote_flow(self):
        """Test full quote creation flow: Create client -> Create deal -> Create quote"""
        
        # Step 1: Create a test lead
        lead_response = self.session.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": "TEST_OTC_Phase2_Company",
            "contact_name": "Test Contact",
            "contact_email": "test_otc_phase2@example.com",
            "contact_phone": "+351999888777",
            "country": "PT",
            "source": "referral",
            "estimated_volume": 100000,
            "notes": "Test lead for OTC Phase 2 testing"
        })
        
        assert lead_response.status_code == 200, f"Create lead failed: {lead_response.text}"
        lead_data = lead_response.json()
        lead_id = lead_data["lead"]["id"]
        print(f"Created lead: {lead_id}")
        
        # Step 2: Pre-qualify the lead
        prequal_response = self.session.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify",
            params={"qualified": True, "volume_per_operation": 50000}
        )
        assert prequal_response.status_code == 200, f"Pre-qualify failed: {prequal_response.text}"
        
        # Step 3: Convert lead to client
        convert_response = self.session.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/convert-to-client",
            params={"daily_limit_usd": 100000, "monthly_limit_usd": 500000}
        )
        assert convert_response.status_code == 200, f"Convert to client failed: {convert_response.text}"
        client_data = convert_response.json()
        client_id = client_data["client"]["id"]
        print(f"Created client: {client_id}")
        
        # Step 4: Create a deal (RFQ)
        deal_response = self.session.post(f"{BASE_URL}/api/otc/deals", json={
            "client_id": client_id,
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "EUR",
            "amount": 0.5,
            "settlement_method": "sepa",
            "notes": "Test deal for Phase 2"
        })
        
        assert deal_response.status_code == 200, f"Create deal failed: {deal_response.text}"
        deal_data = deal_response.json()
        deal_id = deal_data["deal"]["id"]
        deal_number = deal_data["deal"]["deal_number"]
        print(f"Created deal: {deal_number}")
        
        # Step 5: Create a quote for the deal
        quote_response = self.session.post(f"{BASE_URL}/api/otc/quotes", json={
            "deal_id": deal_id,
            "spread_percent": 1.5,
            "fees": 50,
            "valid_for_minutes": 10,
            "is_manual": False
        })
        
        assert quote_response.status_code == 200, f"Create quote failed: {quote_response.text}"
        quote_data = quote_response.json()
        quote = quote_data["quote"]
        
        # Verify quote structure
        assert "id" in quote
        assert "market_price" in quote
        assert "final_price" in quote
        assert "total_value" in quote
        assert "spread_percent" in quote
        assert quote["spread_percent"] == 1.5
        assert quote["status"] == "sent"
        assert quote["price_source"] == "binance"
        
        print(f"Created quote: {quote['id']}")
        print(f"Market price: {quote['market_price']}")
        print(f"Final price: {quote['final_price']}")
        print(f"Total value: {quote['total_value']}")
        
        # Store quote_id for further tests
        self.test_quote_id = quote["id"]
        self.test_deal_id = deal_id
        
        return quote["id"], deal_id
    
    # ==================== QUOTE ACCEPT/REJECT TESTS ====================
    
    def test_accept_quote(self):
        """Test POST /api/otc/quotes/{id}/accept"""
        # First create a quote
        quote_id, deal_id = self.test_full_quote_flow()
        
        # Accept the quote
        response = self.session.post(f"{BASE_URL}/api/otc/quotes/{quote_id}/accept")
        
        assert response.status_code == 200, f"Accept quote failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "Quote accepted" in data["message"]
        
        # Verify deal moved to acceptance stage
        deal_response = self.session.get(f"{BASE_URL}/api/otc/deals/{deal_id}")
        assert deal_response.status_code == 200
        deal_data = deal_response.json()
        assert deal_data["deal"]["stage"] == "acceptance"
        
        print(f"Quote {quote_id} accepted, deal moved to acceptance stage")
        
        return deal_id
    
    def test_reject_quote(self):
        """Test POST /api/otc/quotes/{id}/reject"""
        # First create a quote
        quote_id, deal_id = self.test_full_quote_flow()
        
        # Reject the quote
        response = self.session.post(
            f"{BASE_URL}/api/otc/quotes/{quote_id}/reject",
            params={"reason": "Price too high"}
        )
        
        assert response.status_code == 200, f"Reject quote failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        
        # Verify deal moved back to RFQ stage
        deal_response = self.session.get(f"{BASE_URL}/api/otc/deals/{deal_id}")
        assert deal_response.status_code == 200
        deal_data = deal_response.json()
        assert deal_data["deal"]["stage"] == "rfq"
        
        print(f"Quote {quote_id} rejected, deal moved back to RFQ stage")
    
    # ==================== EXECUTION TESTS ====================
    
    def test_start_execution(self):
        """Test POST /api/otc/deals/{id}/start-execution"""
        # First accept a quote to get deal in acceptance stage
        deal_id = self.test_accept_quote()
        
        # Start execution
        response = self.session.post(f"{BASE_URL}/api/otc/deals/{deal_id}/start-execution")
        
        assert response.status_code == 200, f"Start execution failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "execution" in data
        
        execution = data["execution"]
        assert "id" in execution
        assert "status" in execution
        assert execution["status"] == "pending_funds"
        assert "funds_expected" in execution
        assert "delivery_amount" in execution
        
        print(f"Execution started: {execution['id']}")
        print(f"Funds expected: {execution['funds_expected']} {execution['funds_expected_asset']}")
        print(f"Delivery: {execution['delivery_amount']} {execution['delivery_asset']}")
        
        return execution["id"], deal_id
    
    def test_confirm_funds(self):
        """Test POST /api/otc/executions/{id}/confirm-funds"""
        # First start execution
        execution_id, deal_id = self.test_start_execution()
        
        # Get execution details to know expected amount
        exec_response = self.session.get(f"{BASE_URL}/api/otc/executions/{execution_id}")
        assert exec_response.status_code == 200
        exec_data = exec_response.json()
        expected_amount = exec_data["funds_expected"]
        
        # Confirm funds received
        response = self.session.post(
            f"{BASE_URL}/api/otc/executions/{execution_id}/confirm-funds",
            params={"amount": expected_amount, "tx_hash": "0xTEST_TX_HASH_123"}
        )
        
        assert response.status_code == 200, f"Confirm funds failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        
        # Verify execution status updated
        exec_response = self.session.get(f"{BASE_URL}/api/otc/executions/{execution_id}")
        assert exec_response.status_code == 200
        exec_data = exec_response.json()
        assert exec_data["status"] == "funds_received"
        
        print(f"Funds confirmed for execution {execution_id}")
        
        return execution_id, deal_id
    
    def test_complete_execution(self):
        """Test POST /api/otc/executions/{id}/complete"""
        # First confirm funds
        execution_id, deal_id = self.test_confirm_funds()
        
        # Complete execution
        response = self.session.post(
            f"{BASE_URL}/api/otc/executions/{execution_id}/complete",
            params={
                "executed_price": 60000.00,
                "delivery_tx_hash": "0xDELIVERY_TX_HASH_456",
                "delivery_address": "bc1qtest123456789"
            }
        )
        
        assert response.status_code == 200, f"Complete execution failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        
        # Verify deal moved to settlement
        deal_response = self.session.get(f"{BASE_URL}/api/otc/deals/{deal_id}")
        assert deal_response.status_code == 200
        deal_data = deal_response.json()
        assert deal_data["deal"]["stage"] == "settlement"
        
        print(f"Execution {execution_id} completed, deal moved to settlement")
    
    # ==================== ERROR HANDLING TESTS ====================
    
    def test_reject_already_accepted_quote(self):
        """Test rejecting an already accepted quote should fail"""
        # Accept a quote first
        quote_id, deal_id = self.test_full_quote_flow()
        
        # Accept it
        self.session.post(f"{BASE_URL}/api/otc/quotes/{quote_id}/accept")
        
        # Try to reject it
        response = self.session.post(f"{BASE_URL}/api/otc/quotes/{quote_id}/reject")
        
        assert response.status_code == 400, f"Should fail but got: {response.status_code}"
        print("Correctly rejected attempt to reject already accepted quote")
    
    def test_start_execution_wrong_stage(self):
        """Test starting execution on deal not in acceptance stage should fail"""
        # Create a deal but don't accept quote
        quote_id, deal_id = self.test_full_quote_flow()
        
        # Try to start execution (deal is in quote stage, not acceptance)
        response = self.session.post(f"{BASE_URL}/api/otc/deals/{deal_id}/start-execution")
        
        # Should fail because deal is not in acceptance stage
        assert response.status_code == 400, f"Should fail but got: {response.status_code}"
        print("Correctly rejected execution start for deal not in acceptance stage")
    
    def test_market_price_invalid_pair(self):
        """Test market price with invalid trading pair"""
        response = self.session.get(
            f"{BASE_URL}/api/otc/market-price",
            params={"base_asset": "INVALID", "quote_asset": "EUR"}
        )
        
        # Should return error
        assert response.status_code in [400, 404], f"Expected error but got: {response.status_code}"
        print("Correctly handled invalid trading pair")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    
    # Login and cleanup
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Note: In production, we'd delete TEST_ prefixed data
        # For now, test data remains for inspection
        print("Test cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
