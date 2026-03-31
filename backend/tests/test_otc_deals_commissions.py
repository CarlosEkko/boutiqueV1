"""
OTC Deals, Commissions & Compliance API Tests
Tests for the full OTC Deals Management System:
- Deals CRUD with calculated values
- Status transitions through all stages
- Auto-generated commissions on settlement
- Commission approval/payment workflow
- Compliance records (wallets, KYT, satoshi test, proofs)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOTCDealsAPI:
    """OTC Deals CRUD and workflow tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        self.created_deal_id = None
        yield
        # Cleanup: delete test deal if created
        if self.created_deal_id:
            try:
                self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{self.created_deal_id}")
            except:
                pass
    
    def test_01_get_reference_price_btc(self):
        """GET /api/otc-deals/reference-price/BTC - Get KBEX reference price"""
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/reference-price/BTC")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert 'asset' in data
        assert data['asset'] == 'BTC'
        assert 'price_usd' in data
        assert 'price_eur' in data
        assert 'source' in data
        print(f"BTC Reference Price: USD {data['price_usd']}, EUR {data['price_eur']}")
    
    def test_02_get_team_members(self):
        """GET /api/otc-deals/team-members - Get team members for dropdowns"""
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/team-members")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"Team members count: {len(data)}")
        if data:
            assert 'id' in data[0]
            assert 'name' in data[0]
    
    def test_03_create_deal_with_calculations(self):
        """POST /api/otc-deals/deals - Create deal and verify calculated values"""
        deal_payload = {
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 10,
            "reference_price": 50000,
            "reference_currency": "EUR",
            "condition": "premium",
            "condition_pct": 2,
            "gross_pct": 4,
            "net_pct": 2,
            "broker_id": None,
            "broker_name": "TEST_Broker",
            "broker_type": "internal",
            "member_id": None,
            "member_name": "TEST_Member",
            "broker_share_pct": 50,
            "commission_currency": "EUR",
            "client_name": "TEST_Client OTC",
            "client_email": "test_otc@test.com",
            "notes": "Test deal for automated testing"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json=deal_payload)
        assert resp.status_code == 200, f"Failed to create deal: {resp.text}"
        data = resp.json()
        
        # Store for cleanup
        self.created_deal_id = data['id']
        
        # Verify calculated values
        # adjusted_price = 50000 * 1.02 = 51000
        assert data['adjusted_price'] == 51000, f"Expected adjusted_price 51000, got {data['adjusted_price']}"
        
        # total_value = 10 * 51000 = 510000
        assert data['total_value'] == 510000, f"Expected total_value 510000, got {data['total_value']}"
        
        # gross_amount = 510000 * 0.04 = 20400
        assert data['gross_amount'] == 20400, f"Expected gross_amount 20400, got {data['gross_amount']}"
        
        # net_amount = 510000 * 0.02 = 10200
        assert data['net_amount'] == 10200, f"Expected net_amount 10200, got {data['net_amount']}"
        
        # kbex_margin = 20400 - 10200 = 10200
        assert data['kbex_margin'] == 10200, f"Expected kbex_margin 10200, got {data['kbex_margin']}"
        
        # broker_commission = 10200 * 0.5 = 5100
        assert data['broker_commission'] == 5100, f"Expected broker_commission 5100, got {data['broker_commission']}"
        
        # member_commission = 10200 - 5100 = 5100
        assert data['member_commission'] == 5100, f"Expected member_commission 5100, got {data['member_commission']}"
        
        assert data['status'] == 'draft'
        assert 'deal_number' in data
        print(f"Created deal: {data['deal_number']} with margin €{data['kbex_margin']}")
    
    def test_04_list_deals(self):
        """GET /api/otc-deals/deals - List all deals"""
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"Total deals: {len(data)}")
    
    def test_05_update_deal(self):
        """PUT /api/otc-deals/deals/{id} - Update a deal"""
        # First create a deal
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "sell",
            "asset": "ETH",
            "quantity": 50,
            "reference_price": 2000,
            "reference_currency": "EUR",
            "condition": "discount",
            "condition_pct": 1,
            "gross_pct": 3,
            "net_pct": 1.5,
            "broker_share_pct": 60,
            "client_name": "TEST_Update Client"
        })
        assert create_resp.status_code == 200
        deal = create_resp.json()
        deal_id = deal['id']
        self.created_deal_id = deal_id
        
        # Update the deal
        update_resp = self.session.put(f"{BASE_URL}/api/otc-deals/deals/{deal_id}", json={
            "quantity": 100,
            "client_name": "TEST_Updated Client Name"
        })
        assert update_resp.status_code == 200, f"Failed to update: {update_resp.text}"
        updated = update_resp.json()
        
        assert updated['quantity'] == 100
        assert updated['client_name'] == "TEST_Updated Client Name"
        # Verify recalculation
        # discount: 2000 * 0.99 = 1980
        # total: 100 * 1980 = 198000
        assert updated['total_value'] == 198000
        print(f"Updated deal quantity to 100, new total: €{updated['total_value']}")


class TestOTCDealStatusWorkflow:
    """Test deal status transitions through all stages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Create a test deal for status workflow
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 5,
            "reference_price": 60000,
            "reference_currency": "EUR",
            "condition": "premium",
            "condition_pct": 1.5,
            "gross_pct": 3,
            "net_pct": 1.5,
            "broker_name": "TEST_Workflow Broker",
            "member_name": "TEST_Workflow Member",
            "broker_share_pct": 50,
            "client_name": "TEST_Workflow Client"
        })
        assert create_resp.status_code == 200
        self.deal = create_resp.json()
        self.deal_id = self.deal['id']
        yield
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}")
        except:
            pass
    
    def test_status_workflow_to_settled(self):
        """Advance deal through all stages until settled"""
        statuses = ['qualification', 'compliance', 'negotiation', 'approved', 'executing', 'settled']
        
        for status in statuses:
            resp = self.session.put(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/status?status={status}")
            assert resp.status_code == 200, f"Failed to advance to {status}: {resp.text}"
            result = resp.json()
            assert result['success'] == True
            assert result['status'] == status
            print(f"Advanced to: {status}")
        
        # Verify deal is now settled
        deal_resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}")
        assert deal_resp.status_code == 200
        deal = deal_resp.json()
        assert deal['status'] == 'settled'
        assert 'settled_at' in deal
        print(f"Deal settled at: {deal['settled_at']}")


class TestOTCCommissions:
    """Test commissions auto-generation and workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        self.deal_id = None
        self.commission_ids = []
        yield
    
    def test_commissions_auto_generated_on_settlement(self):
        """Verify commissions are auto-generated when deal is settled"""
        # Create deal with broker and member
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 2,
            "reference_price": 55000,
            "reference_currency": "EUR",
            "condition": "premium",
            "condition_pct": 2,
            "gross_pct": 4,
            "net_pct": 2,
            "broker_name": "TEST_Commission Broker",
            "member_name": "TEST_Commission Member",
            "broker_share_pct": 50,
            "client_name": "TEST_Commission Client"
        })
        assert create_resp.status_code == 200
        deal = create_resp.json()
        self.deal_id = deal['id']
        deal_number = deal['deal_number']
        
        # Expected commissions: margin = (4% - 2%) of total = 2% of (2 * 55000 * 1.02) = 2244
        # broker_commission = 1122, member_commission = 1122
        
        # Advance to settled
        for status in ['qualification', 'compliance', 'negotiation', 'approved', 'executing', 'settled']:
            self.session.put(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/status?status={status}")
        
        # Check commissions were generated
        comm_resp = self.session.get(f"{BASE_URL}/api/otc-deals/commissions")
        assert comm_resp.status_code == 200
        commissions = comm_resp.json()
        
        # Find commissions for this deal
        deal_commissions = [c for c in commissions if c['deal_number'] == deal_number]
        assert len(deal_commissions) == 2, f"Expected 2 commissions, got {len(deal_commissions)}"
        
        for c in deal_commissions:
            self.commission_ids.append(c['id'])
            assert c['status'] == 'pending'
            assert c['amount'] == 1122  # Each gets 50% of margin
            print(f"Commission: {c['beneficiary_name']} - €{c['amount']} ({c['role']})")
    
    def test_commission_approval_and_payment(self):
        """Test commission status workflow: pending -> approved -> paid"""
        # Create and settle a deal first
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "sell",
            "asset": "ETH",
            "quantity": 10,
            "reference_price": 2500,
            "reference_currency": "EUR",
            "condition": "discount",
            "condition_pct": 1,
            "gross_pct": 3,
            "net_pct": 1,
            "broker_name": "TEST_Approval Broker",
            "broker_share_pct": 100,  # All to broker
            "client_name": "TEST_Approval Client"
        })
        assert create_resp.status_code == 200
        deal = create_resp.json()
        self.deal_id = deal['id']
        deal_number = deal['deal_number']
        
        # Settle the deal
        for status in ['qualification', 'compliance', 'negotiation', 'approved', 'executing', 'settled']:
            self.session.put(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/status?status={status}")
        
        # Get the commission
        comm_resp = self.session.get(f"{BASE_URL}/api/otc-deals/commissions")
        commissions = [c for c in comm_resp.json() if c['deal_number'] == deal_number]
        assert len(commissions) >= 1
        commission_id = commissions[0]['id']
        self.commission_ids.append(commission_id)
        
        # Approve the commission
        approve_resp = self.session.put(
            f"{BASE_URL}/api/otc-deals/commissions/{commission_id}/status",
            json={"status": "approved"}
        )
        assert approve_resp.status_code == 200, f"Failed to approve: {approve_resp.text}"
        assert approve_resp.json()['status'] == 'approved'
        print("Commission approved")
        
        # Pay the commission
        pay_resp = self.session.put(
            f"{BASE_URL}/api/otc-deals/commissions/{commission_id}/status",
            json={"status": "paid"}
        )
        assert pay_resp.status_code == 200, f"Failed to pay: {pay_resp.text}"
        assert pay_resp.json()['status'] == 'paid'
        print("Commission paid")
    
    def test_commissions_summary_kpis(self):
        """GET /api/otc-deals/commissions/summary - Verify KPI summary"""
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/commissions/summary")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert 'total_generated' in data
        assert 'pending_approval' in data
        assert 'approved' in data
        assert 'paid' in data
        assert 'brokers' in data
        assert isinstance(data['brokers'], list)
        
        print(f"Commission Summary: Total €{data['total_generated']}, Pending €{data['pending_approval']}, Paid €{data['paid']}")


class TestOTCCompliance:
    """Test compliance records, wallets, KYT, satoshi test, proofs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
        # Create a test deal for compliance
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 1,
            "reference_price": 50000,
            "reference_currency": "EUR",
            "condition": "premium",
            "condition_pct": 1,
            "gross_pct": 2,
            "net_pct": 1,
            "client_name": "TEST_Compliance Client"
        })
        assert create_resp.status_code == 200
        self.deal = create_resp.json()
        self.deal_id = self.deal['id']
        yield
        # Cleanup
        try:
            self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}")
        except:
            pass
    
    def test_01_get_compliance_record(self):
        """GET /api/otc-deals/deals/{id}/compliance - Get/create compliance record"""
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert 'id' in data
        assert data['deal_id'] == self.deal_id
        assert 'wallets' in data
        assert 'kyt' in data
        assert 'satoshi_test' in data
        assert 'proof_of_ownership' in data
        assert 'proof_of_reserves' in data
        assert data['overall_status'] == 'pending'
        print(f"Compliance record created: {data['id']}")
    
    def test_02_add_wallet(self):
        """POST /api/otc-deals/deals/{id}/compliance/wallets - Add wallet"""
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/wallets",
            json={
                "address": "bc1qtest123456789abcdef",
                "blockchain": "Bitcoin",
                "wallet_type": "cold",
                "description": "Test cold wallet"
            }
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data['success'] == True
        assert 'wallet' in data
        assert data['wallet']['address'] == "bc1qtest123456789abcdef"
        print(f"Wallet added: {data['wallet']['id']}")
    
    def test_03_start_satoshi_test(self):
        """POST /api/otc-deals/deals/{id}/compliance/satoshi-test - Start satoshi test"""
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/satoshi-test",
            json={"test_type": "generated"}
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data['success'] == True
        assert 'satoshi_test' in data
        assert data['satoshi_test']['status'] == 'pending'
        assert 'test_amount' in data['satoshi_test']
        assert 'verification_address' in data['satoshi_test']
        print(f"Satoshi test started: {data['satoshi_test']['test_amount']} BTC to {data['satoshi_test']['verification_address'][:20]}...")
    
    def test_04_update_kyt(self):
        """PUT /api/otc-deals/deals/{id}/compliance/kyt - Update KYT analysis"""
        resp = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/kyt",
            json={
                "risk_score": 85,
                "flags": [],
                "analyst_notes": "Clean transaction history",
                "status": "clean"
            }
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        assert resp.json()['success'] == True
        print("KYT updated to clean with score 85")
    
    def test_05_request_proof_of_ownership(self):
        """POST /api/otc-deals/deals/{id}/compliance/proof - Request proof of ownership"""
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/proof",
            json={
                "proof_type": "ownership",
                "wallet_address": "bc1qtest123456789abcdef"
            }
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data['success'] == True
        assert data['proof']['status'] == 'pending'
        print("Proof of ownership requested")
    
    def test_06_request_proof_of_reserves(self):
        """POST /api/otc-deals/deals/{id}/compliance/proof - Request proof of reserves"""
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/proof",
            json={
                "proof_type": "reserves",
                "amount": 1,
                "asset": "BTC"
            }
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data['success'] == True
        assert data['proof']['status'] == 'pending'
        print("Proof of reserves requested for 1 BTC")


class TestOTCDealsEdgeCases:
    """Test edge cases and error handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        yield
    
    def test_invalid_status_transition(self):
        """Test invalid status transition returns error"""
        # Create a deal
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 1,
            "reference_price": 50000,
            "client_name": "TEST_Invalid Transition"
        })
        deal_id = create_resp.json()['id']
        
        # Try to jump from draft to settled (invalid)
        resp = self.session.put(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/status?status=settled")
        assert resp.status_code == 400
        assert 'inválida' in resp.json()['detail'].lower() or 'invalid' in resp.json()['detail'].lower()
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{deal_id}")
    
    def test_delete_non_draft_deal_fails(self):
        """Test that only draft deals can be deleted"""
        # Create and advance a deal
        create_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 1,
            "reference_price": 50000,
            "client_name": "TEST_Delete Non-Draft"
        })
        deal_id = create_resp.json()['id']
        
        # Advance to qualification
        self.session.put(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/status?status=qualification")
        
        # Try to delete (should fail)
        resp = self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{deal_id}")
        assert resp.status_code == 400
        print("Correctly prevented deletion of non-draft deal")
    
    def test_get_nonexistent_deal(self):
        """Test 404 for nonexistent deal"""
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/nonexistent-id-12345")
        assert resp.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
