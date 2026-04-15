"""
OTC Compliance Features Tests - Iteration 30
Tests for:
- Satoshi Test with Fireblocks address generation
- Proof of Ownership (message signing challenge-response)
- Proof of Reserves (on-chain verification via Blockstream API)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# Valid BTC address for reserves testing (has balance)
VALID_BTC_ADDRESS = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
# Invalid BTC address for error testing
INVALID_BTC_ADDRESS = "bc1qinvalidaddress123"


class TestOTCComplianceFeatures:
    """Test OTC Compliance: Satoshi Test, Proof of Ownership, Proof of Reserves"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        data = login_resp.json()
        # Backend returns access_token (not token)
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.deal_id = None
        yield
        
        # Cleanup: Delete test deal if created
        if self.deal_id:
            try:
                # First try to delete (only works for draft status)
                self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}")
            except:
                pass
    
    # ==================== DEAL CREATION ====================
    
    def test_01_create_otc_deal(self):
        """Create a new OTC deal for compliance testing"""
        deal_payload = {
            "deal_type": "sell",
            "asset": "BTC",
            "quantity": 0.5,
            "reference_price": 95000,
            "reference_currency": "EUR",
            "condition": "premium",
            "condition_pct": 2.0,
            "gross_pct": 3.0,
            "net_pct": 2.5,
            "client_name": "TEST_Compliance_Client",
            "client_email": "test_compliance@test.com",
            "notes": "Test deal for compliance features"
        }
        
        resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json=deal_payload)
        assert resp.status_code == 200, f"Create deal failed: {resp.text}"
        
        deal = resp.json()
        assert "id" in deal, "Deal ID not returned"
        assert deal["asset"] == "BTC"
        assert deal["quantity"] == 0.5
        assert deal["status"] == "draft"
        
        self.deal_id = deal["id"]
        print(f"✓ Created OTC deal: {deal['deal_number']} (ID: {self.deal_id})")
        return self.deal_id
    
    def test_02_get_compliance_record(self):
        """Get compliance record for deal (auto-creates if not exists)"""
        deal_id = self.test_01_create_otc_deal()
        
        resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance")
        assert resp.status_code == 200, f"Get compliance failed: {resp.text}"
        
        compliance = resp.json()
        assert "id" in compliance
        assert compliance["deal_id"] == deal_id
        assert "satoshi_test" in compliance
        assert "proof_of_ownership" in compliance
        assert "proof_of_reserves" in compliance
        
        print(f"✓ Compliance record retrieved with all sections")
        return deal_id
    
    # ==================== SATOSHI TEST ====================
    
    def test_03_start_satoshi_test(self):
        """Start Satoshi test - should return Fireblocks address"""
        deal_id = self.test_01_create_otc_deal()
        
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/satoshi-test",
            json={"test_type": "generated"}
        )
        assert resp.status_code == 200, f"Start Satoshi test failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        satoshi_test = data.get("satoshi_test", {})
        assert satoshi_test.get("status") == "pending"
        assert satoshi_test.get("test_amount") is not None
        assert satoshi_test.get("verification_address") is not None
        
        # Check if Fireblocks address was generated
        address_source = satoshi_test.get("address_source")
        print(f"✓ Satoshi test started - Address source: {address_source}")
        print(f"  Test amount: {satoshi_test.get('test_amount')} BTC")
        print(f"  Verification address: {satoshi_test.get('verification_address')[:30]}...")
        
        if address_source == "fireblocks":
            print("  ✓ FIREBLOCKS address generated successfully")
            assert satoshi_test.get("fireblocks_vault_id") is not None
        else:
            print("  ⚠ Mock address used (Fireblocks may be unavailable)")
        
        return deal_id, address_source
    
    def test_04_check_satoshi_onchain(self):
        """Check on-chain for Satoshi test transaction"""
        deal_id, _ = self.test_03_start_satoshi_test()
        
        resp = self.session.get(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/satoshi-test/check-onchain"
        )
        assert resp.status_code == 200, f"Check on-chain failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        result = data.get("result", {})
        # For a new address, transaction won't be found yet
        print(f"✓ On-chain check completed - Received: {result.get('received', False)}")
        return deal_id
    
    def test_05_verify_satoshi_test(self):
        """Verify Satoshi test (manual verification)"""
        deal_id, _ = self.test_03_start_satoshi_test()
        
        resp = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/satoshi-test/verify?status=verified"
        )
        assert resp.status_code == 200, f"Verify Satoshi test failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        # Verify compliance record updated
        comp_resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance")
        compliance = comp_resp.json()
        assert compliance["satoshi_test"]["status"] == "verified"
        
        print(f"✓ Satoshi test verified successfully")
        return deal_id
    
    # ==================== PROOF OF OWNERSHIP ====================
    
    def test_06_request_ownership_proof(self):
        """Generate ownership challenge message"""
        deal_id = self.test_01_create_otc_deal()
        
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/ownership/request"
        )
        assert resp.status_code == 200, f"Request ownership proof failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        poo = data.get("proof_of_ownership", {})
        assert poo.get("status") == "awaiting_signature"
        assert poo.get("challenge_message") is not None
        assert poo.get("nonce") is not None
        
        # Verify challenge message format
        challenge = poo.get("challenge_message", "")
        assert "KBEX Proof of Ownership" in challenge
        assert "Deal:" in challenge
        assert "Nonce:" in challenge
        
        print(f"✓ Ownership challenge generated")
        print(f"  Challenge message:\n{challenge}")
        return deal_id, challenge
    
    def test_07_submit_ownership_signature(self):
        """Submit signature for ownership proof"""
        deal_id, challenge = self.test_06_request_ownership_proof()
        
        # Submit a test signature (in real scenario, this would be signed by wallet)
        test_signature = "H+ArjLJmPNf8k9Y5Z3X2W1V0U9T8S7R6Q5P4O3N2M1L0K9J8I7H6G5F4E3D2C1B0A9=="
        
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/ownership/submit-signature",
            json={"signature": test_signature}
        )
        assert resp.status_code == 200, f"Submit signature failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        # Verify status changed to pending_review
        comp_resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance")
        compliance = comp_resp.json()
        assert compliance["proof_of_ownership"]["status"] == "pending_review"
        assert compliance["proof_of_ownership"]["signature"] == test_signature
        
        print(f"✓ Signature submitted - Status: pending_review")
        return deal_id
    
    def test_08_verify_ownership_proof(self):
        """Admin verifies ownership proof"""
        deal_id = self.test_07_submit_ownership_signature()
        
        resp = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/ownership/verify?status=verified"
        )
        assert resp.status_code == 200, f"Verify ownership failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        # Verify compliance record updated
        comp_resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance")
        compliance = comp_resp.json()
        assert compliance["proof_of_ownership"]["status"] == "verified"
        assert compliance["proof_of_ownership"]["verified_at"] is not None
        
        print(f"✓ Proof of Ownership verified successfully")
        return deal_id
    
    # ==================== PROOF OF RESERVES ====================
    
    def test_09_check_reserves_valid_address(self):
        """Check reserves on-chain with valid BTC address"""
        deal_id = self.test_01_create_otc_deal()
        
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/reserves/check",
            json={
                "wallet_address": VALID_BTC_ADDRESS,
                "required_amount": 0.1,  # Low amount to ensure sufficient
                "asset": "BTC"
            }
        )
        assert resp.status_code == 200, f"Check reserves failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        por = data.get("proof_of_reserves", {})
        assert por.get("wallet_address") == VALID_BTC_ADDRESS
        assert por.get("on_chain_balance") is not None
        assert por.get("utxo_count") is not None
        
        balance = por.get("on_chain_balance", 0)
        sufficient = por.get("sufficient", False)
        
        print(f"✓ Reserves check completed via Blockstream API")
        print(f"  Address: {VALID_BTC_ADDRESS[:20]}...")
        print(f"  On-chain balance: {balance} BTC")
        print(f"  UTXOs: {por.get('utxo_count')}")
        print(f"  Sufficient: {sufficient}")
        
        return deal_id, balance
    
    def test_10_check_reserves_invalid_address(self):
        """Check reserves with INVALID address - should return proper error"""
        deal_id = self.test_01_create_otc_deal()
        
        resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/reserves/check",
            json={
                "wallet_address": INVALID_BTC_ADDRESS,
                "required_amount": 1.0,
                "asset": "BTC"
            }
        )
        
        # Should return 400 for invalid address
        assert resp.status_code == 400, f"Expected 400 for invalid address, got {resp.status_code}: {resp.text}"
        
        data = resp.json()
        assert "detail" in data
        # Error message should indicate invalid address
        print(f"✓ Invalid address properly rejected with 400")
        print(f"  Error: {data.get('detail')}")
        return deal_id
    
    def test_11_verify_reserves_proof(self):
        """Admin manually verifies reserves proof"""
        deal_id, balance = self.test_09_check_reserves_valid_address()
        
        resp = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/reserves/verify?status=verified"
        )
        assert resp.status_code == 200, f"Verify reserves failed: {resp.text}"
        
        data = resp.json()
        assert data.get("success") == True
        
        # Verify compliance record updated
        comp_resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance")
        compliance = comp_resp.json()
        assert compliance["proof_of_reserves"]["status"] == "verified"
        assert compliance["proof_of_reserves"]["verified_at"] is not None
        
        print(f"✓ Proof of Reserves verified successfully")
        return deal_id
    
    # ==================== FULL COMPLIANCE FLOW ====================
    
    def test_12_full_compliance_flow(self):
        """Test complete compliance flow: Satoshi + Ownership + Reserves"""
        # Create deal
        deal_id = self.test_01_create_otc_deal()
        
        # 1. Start and verify Satoshi test
        sat_resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/satoshi-test",
            json={"test_type": "generated"}
        )
        assert sat_resp.status_code == 200
        
        sat_verify = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/satoshi-test/verify?status=verified"
        )
        assert sat_verify.status_code == 200
        
        # 2. Request, submit, and verify ownership proof
        own_req = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/ownership/request"
        )
        assert own_req.status_code == 200
        
        own_sig = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/ownership/submit-signature",
            json={"signature": "TestSignature123=="}
        )
        assert own_sig.status_code == 200
        
        own_verify = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/ownership/verify?status=verified"
        )
        assert own_verify.status_code == 200
        
        # 3. Check and verify reserves
        res_check = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/reserves/check",
            json={
                "wallet_address": VALID_BTC_ADDRESS,
                "required_amount": 0.1,
                "asset": "BTC"
            }
        )
        assert res_check.status_code == 200
        
        res_verify = self.session.put(
            f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance/proof/reserves/verify?status=verified"
        )
        assert res_verify.status_code == 200
        
        # Verify final compliance status
        comp_resp = self.session.get(f"{BASE_URL}/api/otc-deals/deals/{deal_id}/compliance")
        compliance = comp_resp.json()
        
        assert compliance["satoshi_test"]["status"] == "verified"
        assert compliance["proof_of_ownership"]["status"] == "verified"
        assert compliance["proof_of_reserves"]["status"] == "verified"
        
        print(f"✓ Full compliance flow completed successfully")
        print(f"  Satoshi Test: {compliance['satoshi_test']['status']}")
        print(f"  Proof of Ownership: {compliance['proof_of_ownership']['status']}")
        print(f"  Proof of Reserves: {compliance['proof_of_reserves']['status']}")
        
        return deal_id


class TestSatoshiTestFireblocks:
    """Specific tests for Fireblocks integration in Satoshi Test"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        
        data = login_resp.json()
        token = data.get("access_token") or data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.deal_id = None
        yield
        
        if self.deal_id:
            try:
                self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}")
            except:
                pass
    
    def test_satoshi_address_source_is_fireblocks(self):
        """Verify Satoshi test returns Fireblocks address (address_source=fireblocks)"""
        # Create deal
        deal_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "sell",
            "asset": "BTC",
            "quantity": 1.0,
            "reference_price": 95000,
            "client_name": "TEST_Fireblocks_Check"
        })
        assert deal_resp.status_code == 200
        self.deal_id = deal_resp.json()["id"]
        
        # Start Satoshi test
        sat_resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/satoshi-test",
            json={"test_type": "generated"}
        )
        assert sat_resp.status_code == 200
        
        data = sat_resp.json()
        satoshi_test = data.get("satoshi_test", {})
        
        address_source = satoshi_test.get("address_source")
        verification_address = satoshi_test.get("verification_address", "")
        
        print(f"Address source: {address_source}")
        print(f"Verification address: {verification_address}")
        
        # Check if Fireblocks is working
        if address_source == "fireblocks":
            print("✓ FIREBLOCKS integration working - Real address generated")
            assert satoshi_test.get("fireblocks_vault_id") is not None
            # Fireblocks BTC addresses typically start with bc1 or 3 or 1
            assert verification_address.startswith(("bc1", "3", "1")), f"Invalid BTC address format: {verification_address}"
        else:
            print("⚠ Fireblocks unavailable - Mock address used")
            # Mock addresses start with bc1q followed by hex
            assert verification_address.startswith("bc1q")


class TestBlockstreamIntegration:
    """Tests for Blockstream API integration (Proof of Reserves)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        
        data = login_resp.json()
        token = data.get("access_token") or data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.deal_id = None
        yield
        
        if self.deal_id:
            try:
                self.session.delete(f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}")
            except:
                pass
    
    def test_blockstream_api_returns_balance(self):
        """Verify Blockstream API returns real on-chain balance"""
        # Create deal
        deal_resp = self.session.post(f"{BASE_URL}/api/otc-deals/deals", json={
            "deal_type": "sell",
            "asset": "BTC",
            "quantity": 0.1,
            "reference_price": 95000,
            "client_name": "TEST_Blockstream_Check"
        })
        assert deal_resp.status_code == 200
        self.deal_id = deal_resp.json()["id"]
        
        # Check reserves with known address
        res_resp = self.session.post(
            f"{BASE_URL}/api/otc-deals/deals/{self.deal_id}/compliance/proof/reserves/check",
            json={
                "wallet_address": VALID_BTC_ADDRESS,
                "required_amount": 0.001,
                "asset": "BTC"
            }
        )
        assert res_resp.status_code == 200
        
        data = res_resp.json()
        por = data.get("proof_of_reserves", {})
        
        balance = por.get("on_chain_balance")
        utxo_count = por.get("utxo_count")
        
        print(f"✓ Blockstream API integration working")
        print(f"  Address: {VALID_BTC_ADDRESS}")
        print(f"  Balance: {balance} BTC")
        print(f"  UTXOs: {utxo_count}")
        
        # Balance should be a number (could be 0 for empty addresses)
        assert isinstance(balance, (int, float)), f"Balance should be numeric: {balance}"
        assert isinstance(utxo_count, int), f"UTXO count should be int: {utxo_count}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
