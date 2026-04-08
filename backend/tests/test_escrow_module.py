"""
OTC Escrow Module Tests for KBEX Exchange
Tests: Dashboard KPIs, Deal CRUD, State Machine, Fee Engine, Compliance, Disputes
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carlos@kbex.io"
TEST_PASSWORD = "senha123"


class TestEscrowAuth:
    """Authentication for escrow tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestEscrowDashboard(TestEscrowAuth):
    """Escrow Dashboard KPI tests"""
    
    def test_dashboard_returns_kpis(self, auth_headers):
        """GET /api/escrow/dashboard returns KPI data"""
        response = requests.get(f"{BASE_URL}/api/escrow/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        # Verify all required KPI fields
        assert "active_deals" in data, "Missing active_deals"
        assert "funds_under_escrow" in data, "Missing funds_under_escrow"
        assert "total_fees_collected" in data, "Missing total_fees_collected"
        assert "disputed_deals" in data, "Missing disputed_deals"
        assert "status_breakdown" in data, "Missing status_breakdown"
        assert "recent_deals" in data, "Missing recent_deals"
        assert "total_deals" in data, "Missing total_deals"
        assert "settled_deals" in data, "Missing settled_deals"
        assert "avg_settlement_hours" in data, "Missing avg_settlement_hours"
        
        # Verify types
        assert isinstance(data["active_deals"], int)
        assert isinstance(data["funds_under_escrow"], (int, float))
        assert isinstance(data["total_fees_collected"], (int, float))
        assert isinstance(data["disputed_deals"], int)
        assert isinstance(data["status_breakdown"], dict)
        assert isinstance(data["recent_deals"], list)
        
        print(f"Dashboard KPIs: active={data['active_deals']}, funds=${data['funds_under_escrow']}, fees=${data['total_fees_collected']}")


class TestEscrowFeeCalculator(TestEscrowAuth):
    """Fee Engine calculation tests"""
    
    def test_standard_fee_calculation(self, auth_headers):
        """POST /api/escrow/calculate-fee with standard schedule"""
        params = "ticket_size=100000&schedule=standard&payer=split"
        response = requests.post(f"{BASE_URL}/api/escrow/calculate-fee?{params}", headers=auth_headers)
        assert response.status_code == 200, f"Fee calc failed: {response.text}"
        
        data = response.json()
        # Standard: 0.5% rate, $50 min
        assert data["fee_rate"] == 0.005, f"Expected 0.005, got {data['fee_rate']}"
        assert data["fee_total"] == 500.0, f"Expected $500, got {data['fee_total']}"  # 100000 * 0.005 = 500
        assert data["fee_buyer"] == 250.0, f"Expected $250 buyer, got {data['fee_buyer']}"  # split
        assert data["fee_seller"] == 250.0, f"Expected $250 seller, got {data['fee_seller']}"
        print(f"Standard fee: ${data['fee_total']} (buyer: ${data['fee_buyer']}, seller: ${data['fee_seller']})")
    
    def test_premium_fee_calculation(self, auth_headers):
        """POST /api/escrow/calculate-fee with premium schedule"""
        params = "ticket_size=100000&schedule=premium&payer=buyer"
        response = requests.post(f"{BASE_URL}/api/escrow/calculate-fee?{params}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Premium: 0.3% rate, $100 min
        assert data["fee_rate"] == 0.003
        assert data["fee_total"] == 300.0  # 100000 * 0.003 = 300
        assert data["fee_buyer"] == 300.0  # buyer pays all
        assert data["fee_seller"] == 0.0
        print(f"Premium fee: ${data['fee_total']} (buyer pays all)")
    
    def test_institutional_fee_calculation(self, auth_headers):
        """POST /api/escrow/calculate-fee with institutional schedule"""
        params = "ticket_size=1000000&schedule=institutional&payer=seller"
        response = requests.post(f"{BASE_URL}/api/escrow/calculate-fee?{params}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Institutional: 0.1% rate, $250 min
        assert data["fee_rate"] == 0.001
        assert data["fee_total"] == 1000.0  # 1000000 * 0.001 = 1000
        assert data["fee_buyer"] == 0.0
        assert data["fee_seller"] == 1000.0  # seller pays all
        print(f"Institutional fee: ${data['fee_total']} (seller pays all)")
    
    def test_minimum_fee_applied(self, auth_headers):
        """Fee minimum is applied when calculated fee is lower"""
        params = "ticket_size=1000&schedule=standard&payer=split"
        response = requests.post(f"{BASE_URL}/api/escrow/calculate-fee?{params}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # 1000 * 0.005 = 5, but min is $50
        assert data["fee_total"] == 50.0, f"Expected min $50, got {data['fee_total']}"
        print(f"Minimum fee applied: ${data['fee_total']}")
    
    def test_custom_fee_calculation(self, auth_headers):
        """POST /api/escrow/calculate-fee with custom rate"""
        params = "ticket_size=500000&schedule=custom&payer=split&custom_rate=0.002&custom_min=75"
        response = requests.post(f"{BASE_URL}/api/escrow/calculate-fee?{params}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Custom: 0.2% rate, $75 min
        assert data["fee_rate"] == 0.002
        assert data["fee_total"] == 1000.0  # 500000 * 0.002 = 1000
        print(f"Custom fee: ${data['fee_total']}")


class TestEscrowDealCRUD(TestEscrowAuth):
    """Escrow Deal CRUD operations"""
    
    @pytest.fixture(scope="class")
    def created_deal_id(self, auth_headers):
        """Create a test deal and return its ID"""
        payload = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "ETH",
            "asset_b": "USDC",
            "quantity_a": 5.0,
            "quantity_b": 15000.0,
            "agreed_price": 3000.0,
            "buyer": {"name": "TEST_Buyer Corp", "email": "buyer@test.com", "phone": "+1234567890"},
            "seller": {"name": "TEST_Seller Ltd", "email": "seller@test.com", "phone": "+0987654321"},
            "fee_schedule": "standard",
            "fee_payer": "split",
            "settlement_deadline_hours": 48,
            "settlement_type": "crypto_crypto",
            "notes": "Test deal for pytest"
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create deal failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "deal" in data
        deal = data["deal"]
        assert "id" in deal
        assert "deal_id" in deal
        assert deal["deal_id"].startswith("ESC-")
        
        print(f"Created test deal: {deal['deal_id']}")
        return deal["id"]
    
    def test_create_escrow_deal(self, auth_headers):
        """POST /api/escrow/deals creates a new deal"""
        payload = {
            "deal_type": "block_trade",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 2.5,
            "quantity_b": 162500.0,
            "agreed_price": 65000.0,
            "buyer": {"name": "TEST_Alpha Fund", "email": "alpha@test.com"},
            "seller": {"name": "TEST_Beta Holdings", "email": "beta@test.com"},
            "fee_schedule": "premium",
            "fee_payer": "buyer",
            "settlement_deadline_hours": 24,
            "settlement_type": "crypto_crypto",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        deal = data["deal"]
        
        # Verify deal fields
        assert deal["deal_type"] == "block_trade"
        assert deal["asset_a"] == "BTC"
        assert deal["asset_b"] == "USDT"
        assert deal["quantity_a"] == 2.5
        assert deal["quantity_b"] == 162500.0
        assert deal["agreed_price"] == 65000.0
        assert deal["ticket_size"] == 162500.0  # 2.5 * 65000
        assert deal["status"] == "draft"
        assert deal["fee_schedule"] == "premium"
        assert deal["fee_payer"] == "buyer"
        assert deal["buyer"]["name"] == "TEST_Alpha Fund"
        assert deal["seller"]["name"] == "TEST_Beta Holdings"
        
        # Verify fee calculation (premium: 0.3%)
        assert deal["fee_rate"] == 0.003
        assert deal["fee_total"] == 487.5  # 162500 * 0.003
        assert deal["fee_buyer"] == 487.5  # buyer pays all
        assert deal["fee_seller"] == 0.0
        
        # Verify compliance initialized
        assert deal["compliance"]["buyer_kyc"] == "pending"
        assert deal["compliance"]["seller_kyc"] == "pending"
        assert deal["compliance"]["aml_check"] == "pending"
        
        # Verify timeline
        assert len(deal["timeline"]) == 1
        assert deal["timeline"][0]["status"] == "draft"
        
        print(f"Created deal {deal['deal_id']}: {deal['asset_a']}/{deal['asset_b']} @ ${deal['ticket_size']}")
    
    def test_list_escrow_deals(self, auth_headers):
        """GET /api/escrow/deals lists deals"""
        response = requests.get(f"{BASE_URL}/api/escrow/deals?limit=50", headers=auth_headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert "deals" in data
        assert "total" in data
        assert isinstance(data["deals"], list)
        print(f"Listed {len(data['deals'])} deals (total: {data['total']})")
    
    def test_list_deals_with_status_filter(self, auth_headers):
        """GET /api/escrow/deals with status filter"""
        response = requests.get(f"{BASE_URL}/api/escrow/deals?status=draft&limit=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        for deal in data["deals"]:
            assert deal["status"] == "draft", f"Expected draft, got {deal['status']}"
        print(f"Filtered {len(data['deals'])} draft deals")
    
    def test_list_deals_with_search(self, auth_headers):
        """GET /api/escrow/deals with search"""
        response = requests.get(f"{BASE_URL}/api/escrow/deals?search=BTC&limit=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"Search 'BTC' returned {len(data['deals'])} deals")
    
    def test_get_single_deal(self, auth_headers, created_deal_id):
        """GET /api/escrow/deals/{deal_id} returns single deal"""
        response = requests.get(f"{BASE_URL}/api/escrow/deals/{created_deal_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get deal failed: {response.text}"
        
        deal = response.json()
        assert deal["id"] == created_deal_id
        assert "deal_id" in deal
        assert "status" in deal
        assert "buyer" in deal
        assert "seller" in deal
        assert "compliance" in deal
        assert "custody" in deal
        assert "timeline" in deal
        print(f"Retrieved deal: {deal['deal_id']}")
    
    def test_get_nonexistent_deal_returns_404(self, auth_headers):
        """GET /api/escrow/deals/{invalid_id} returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/escrow/deals/{fake_id}", headers=auth_headers)
        assert response.status_code == 404


class TestEscrowStateMachine(TestEscrowAuth):
    """Escrow status transition tests"""
    
    @pytest.fixture
    def fresh_deal_id(self, auth_headers):
        """Create a fresh deal for state machine tests"""
        payload = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "SOL",
            "asset_b": "USDT",
            "quantity_a": 100.0,
            "quantity_b": 15000.0,
            "agreed_price": 150.0,
            "buyer": {"name": "TEST_StateMachine Buyer"},
            "seller": {"name": "TEST_StateMachine Seller"},
            "fee_schedule": "standard",
            "fee_payer": "split",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        assert response.status_code == 200
        return response.json()["deal"]["id"]
    
    def test_advance_draft_to_awaiting_deposit(self, auth_headers, fresh_deal_id):
        """Advance from draft to awaiting_deposit"""
        response = requests.post(
            f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}/advance",
            json={"new_status": "awaiting_deposit", "notes": "Ready for deposits"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Advance failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["status"] == "awaiting_deposit"
        print("Transitioned: draft -> awaiting_deposit")
    
    def test_advance_awaiting_to_funded(self, auth_headers, fresh_deal_id):
        """Advance from awaiting_deposit to funded"""
        # First advance to awaiting_deposit
        requests.post(
            f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}/advance",
            json={"new_status": "awaiting_deposit"},
            headers=auth_headers
        )
        
        # Then advance to funded
        response = requests.post(
            f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}/advance",
            json={"new_status": "funded", "notes": "Both parties deposited"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["deal"]["status"] == "funded"
        assert data["deal"]["custody"]["locked"] is True  # Funds should be locked
        print("Transitioned: awaiting_deposit -> funded (custody locked)")
    
    def test_full_happy_path_transitions(self, auth_headers, fresh_deal_id):
        """Test full state machine: draft -> ... -> closed"""
        transitions = [
            ("awaiting_deposit", "Ready for deposits"),
            ("funded", "Both parties deposited"),
            ("in_verification", "Starting verification"),
            ("ready_for_settlement", "Verification complete"),
            ("settled", "Settlement executed"),
            ("closed", "Deal closed"),
        ]
        
        for new_status, notes in transitions:
            response = requests.post(
                f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}/advance",
                json={"new_status": new_status, "notes": notes},
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed at {new_status}: {response.text}"
            assert response.json()["deal"]["status"] == new_status
            print(f"Transitioned to: {new_status}")
        
        # Verify final state
        response = requests.get(f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}", headers=auth_headers)
        deal = response.json()
        assert deal["status"] == "closed"
        assert deal["settled_at"] is not None
        assert len(deal["timeline"]) == 7  # 1 create + 6 transitions
        print("Full happy path completed: draft -> closed")
    
    def test_invalid_transition_rejected(self, auth_headers, fresh_deal_id):
        """Invalid transitions are rejected"""
        # Try to jump from draft directly to funded (invalid)
        response = requests.post(
            f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}/advance",
            json={"new_status": "funded"},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Cannot transition" in response.json()["detail"]
        print("Invalid transition correctly rejected")
    
    def test_override_allows_invalid_transition(self, auth_headers, fresh_deal_id):
        """Override flag allows invalid transitions"""
        response = requests.post(
            f"{BASE_URL}/api/escrow/deals/{fresh_deal_id}/advance",
            json={"new_status": "funded", "override": True, "notes": "Admin override"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["deal"]["status"] == "funded"
        print("Override allowed invalid transition")


class TestEscrowCompliance(TestEscrowAuth):
    """Compliance check tests"""
    
    @pytest.fixture
    def compliance_deal_id(self, auth_headers):
        """Create a deal for compliance tests"""
        payload = {
            "deal_type": "crypto_fiat",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USD",
            "quantity_a": 1.0,
            "quantity_b": 65000.0,
            "agreed_price": 65000.0,
            "buyer": {"name": "TEST_Compliance Buyer"},
            "seller": {"name": "TEST_Compliance Seller"},
            "fee_schedule": "standard",
            "fee_payer": "split",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        return response.json()["deal"]["id"]
    
    def test_update_compliance_checks(self, auth_headers, compliance_deal_id):
        """PUT /api/escrow/deals/{id}/compliance updates checks"""
        response = requests.put(
            f"{BASE_URL}/api/escrow/deals/{compliance_deal_id}/compliance",
            json={"buyer_kyc": "approved", "aml_check": "approved"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Compliance update failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["compliance"]["buyer_kyc"] == "approved"
        assert data["compliance"]["aml_check"] == "approved"
        print("Compliance checks updated")
    
    def test_all_compliance_approved_sets_approver(self, auth_headers, compliance_deal_id):
        """When all checks approved, approver is set"""
        # Approve all checks
        response = requests.put(
            f"{BASE_URL}/api/escrow/deals/{compliance_deal_id}/compliance",
            json={
                "buyer_kyc": "approved",
                "seller_kyc": "approved",
                "aml_check": "approved",
                "source_of_funds": "approved"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["compliance"]["approved_by"] is not None
        assert data["compliance"]["approved_at"] is not None
        print(f"All compliance approved by: {data['compliance']['approved_by']}")


class TestEscrowDisputes(TestEscrowAuth):
    """Dispute management tests"""
    
    @pytest.fixture
    def dispute_deal_id(self, auth_headers):
        """Create a funded deal for dispute tests"""
        payload = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "AVAX",
            "asset_b": "USDC",
            "quantity_a": 500.0,
            "quantity_b": 17500.0,
            "agreed_price": 35.0,
            "buyer": {"name": "TEST_Dispute Buyer"},
            "seller": {"name": "TEST_Dispute Seller"},
            "fee_schedule": "standard",
            "fee_payer": "split",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        deal_id = response.json()["deal"]["id"]
        
        # Advance to funded status
        requests.post(
            f"{BASE_URL}/api/escrow/deals/{deal_id}/advance",
            json={"new_status": "awaiting_deposit"},
            headers=auth_headers
        )
        requests.post(
            f"{BASE_URL}/api/escrow/deals/{deal_id}/advance",
            json={"new_status": "funded"},
            headers=auth_headers
        )
        return deal_id
    
    def test_open_dispute(self, auth_headers, dispute_deal_id):
        """POST /api/escrow/deals/{id}/dispute opens a dispute"""
        response = requests.post(
            f"{BASE_URL}/api/escrow/deals/{dispute_deal_id}/dispute",
            json={"reason": "Seller claims funds not received"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Open dispute failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        deal = data["deal"]
        assert deal["status"] == "disputed"
        assert deal["dispute"] is not None
        assert deal["dispute"]["reason"] == "Seller claims funds not received"
        assert deal["dispute"]["status"] == "open"
        assert deal["dispute"]["opened_by"] is not None
        print(f"Dispute opened: {deal['dispute']['reason']}")
    
    def test_cannot_dispute_closed_deal(self, auth_headers):
        """Cannot open dispute on closed/cancelled deal"""
        # Create and close a deal
        payload = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "DOT",
            "asset_b": "USDT",
            "quantity_a": 100.0,
            "quantity_b": 700.0,
            "agreed_price": 7.0,
            "buyer": {"name": "TEST_Closed Buyer"},
            "seller": {"name": "TEST_Closed Seller"},
            "fee_schedule": "standard",
            "fee_payer": "split",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        deal_id = response.json()["deal"]["id"]
        
        # Cancel the deal
        requests.post(
            f"{BASE_URL}/api/escrow/deals/{deal_id}/advance",
            json={"new_status": "cancelled", "override": True},
            headers=auth_headers
        )
        
        # Try to dispute
        response = requests.post(
            f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute",
            json={"reason": "Test dispute"},
            headers=auth_headers
        )
        assert response.status_code == 400
        print("Cannot dispute cancelled deal - correctly rejected")


class TestEscrowDelete(TestEscrowAuth):
    """Delete deal tests"""
    
    def test_delete_draft_deal(self, auth_headers):
        """DELETE /api/escrow/deals/{id} works for draft deals"""
        # Create a draft deal
        payload = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "LINK",
            "asset_b": "USDT",
            "quantity_a": 50.0,
            "quantity_b": 750.0,
            "agreed_price": 15.0,
            "buyer": {"name": "TEST_Delete Buyer"},
            "seller": {"name": "TEST_Delete Seller"},
            "fee_schedule": "standard",
            "fee_payer": "split",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        deal_id = response.json()["deal"]["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/escrow/deals/{deal_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        assert response.json()["success"] is True
        
        # Verify it's gone
        response = requests.get(f"{BASE_URL}/api/escrow/deals/{deal_id}", headers=auth_headers)
        assert response.status_code == 404
        print("Draft deal deleted successfully")
    
    def test_cannot_delete_non_draft_deal(self, auth_headers):
        """Cannot delete deals that are not in draft status"""
        # Create and advance a deal
        payload = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "UNI",
            "asset_b": "USDT",
            "quantity_a": 100.0,
            "quantity_b": 1000.0,
            "agreed_price": 10.0,
            "buyer": {"name": "TEST_NoDelete Buyer"},
            "seller": {"name": "TEST_NoDelete Seller"},
            "fee_schedule": "standard",
            "fee_payer": "split",
        }
        response = requests.post(f"{BASE_URL}/api/escrow/deals", json=payload, headers=auth_headers)
        deal_id = response.json()["deal"]["id"]
        
        # Advance to awaiting_deposit
        requests.post(
            f"{BASE_URL}/api/escrow/deals/{deal_id}/advance",
            json={"new_status": "awaiting_deposit"},
            headers=auth_headers
        )
        
        # Try to delete
        response = requests.delete(f"{BASE_URL}/api/escrow/deals/{deal_id}", headers=auth_headers)
        assert response.status_code == 400
        assert "DRAFT" in response.json()["detail"]
        print("Cannot delete non-draft deal - correctly rejected")


# Cleanup fixture to remove test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_deals():
    """Cleanup TEST_ prefixed deals after all tests"""
    yield
    # Note: In production, you'd want to clean up test data
    # For now, we leave them as they don't affect other tests
    print("\nTest session complete. TEST_ prefixed deals may remain in database.")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
