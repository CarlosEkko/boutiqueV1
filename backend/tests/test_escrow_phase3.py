import os
"""
Escrow Phase 3 Tests - Enhanced Dispute Resolution & Reporting/Audit Layer
Tests for:
- Dispute status progression (open -> under_review -> evidence_required -> resolved)
- Evidence upload to disputes
- Dispute message thread
- Admin force release
- Escrow reports/statement
- Audit trail viewer
- CSV export
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")

# Module-level session to avoid rate limiting
_session = None
_token = None

def get_authenticated_session():
    """Get or create authenticated session (singleton to avoid rate limiting)"""
    global _session, _token
    if _session is None:
        _session = requests.Session()
        _session.headers.update({"Content-Type": "application/json"})
        
        # Login once
        login_response = _session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        _token = login_response.json().get("access_token")
        assert _token, "No access token received"
        _session.headers.update({"Authorization": f"Bearer {_token}"})
    
    return _session


class TestEscrowPhase3:
    """Escrow Phase 3 - Enhanced Dispute Resolution & Reporting"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get authenticated session"""
        self.session = get_authenticated_session()
        self.token = _token
        yield

    # ==================== REPORTS/STATEMENT TESTS ====================
    
    def test_get_escrow_statement(self):
        """GET /api/escrow/reports/statement - Get escrow statement with KPIs"""
        response = self.session.get(f"{BASE_URL}/api/escrow/reports/statement")
        assert response.status_code == 200, f"Statement failed: {response.text}"
        
        data = response.json()
        assert "deals" in data
        assert "total_deals" in data
        assert "total_volume" in data
        assert "total_fees" in data
        assert "by_status" in data
        assert "generated_at" in data
        print(f"Statement: {data['total_deals']} deals, ${data['total_volume']} volume, ${data['total_fees']} fees")
    
    def test_get_escrow_statement_with_filters(self):
        """GET /api/escrow/reports/statement with date and status filters"""
        response = self.session.get(f"{BASE_URL}/api/escrow/reports/statement", params={
            "status": "disputed"
        })
        assert response.status_code == 200, f"Filtered statement failed: {response.text}"
        
        data = response.json()
        assert "deals" in data
        assert "filters" in data
        assert data["filters"]["status"] == "disputed"
        print(f"Filtered statement: {data['total_deals']} disputed deals")
    
    def test_export_csv(self):
        """GET /api/escrow/reports/export - Export deals as CSV-compatible JSON"""
        response = self.session.get(f"{BASE_URL}/api/escrow/reports/export")
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        data = response.json()
        assert "rows" in data
        assert "total" in data
        assert "generated_at" in data
        
        if data["rows"]:
            row = data["rows"][0]
            assert "deal_id" in row
            assert "status" in row
            assert "ticket_size" in row
            assert "fee_total" in row
        print(f"Export: {data['total']} rows")

    # ==================== AUDIT TRAIL TESTS ====================
    
    def test_get_audit_trail_for_existing_deal(self):
        """GET /api/escrow/reports/audit-trail/{deal_id} - Get audit trail"""
        # First get a deal ID
        statement = self.session.get(f"{BASE_URL}/api/escrow/reports/statement").json()
        if not statement["deals"]:
            pytest.skip("No deals to test audit trail")
        
        deal = statement["deals"][0]
        deal_id = deal["id"]
        
        response = self.session.get(f"{BASE_URL}/api/escrow/reports/audit-trail/{deal_id}")
        assert response.status_code == 200, f"Audit trail failed: {response.text}"
        
        data = response.json()
        assert "deal_id" in data
        assert "escrow_id" in data
        assert "current_status" in data
        assert "audit_entries" in data
        assert "total_events" in data
        assert isinstance(data["audit_entries"], list)
        print(f"Audit trail for {data['deal_id']}: {data['total_events']} events")
    
    def test_audit_trail_not_found(self):
        """GET /api/escrow/reports/audit-trail/{invalid_id} - 404 for invalid deal"""
        response = self.session.get(f"{BASE_URL}/api/escrow/reports/audit-trail/invalid-id-12345")
        assert response.status_code == 404

    # ==================== DISPUTE STATUS PROGRESSION TESTS ====================
    
    def test_dispute_status_update_under_review(self):
        """PUT /api/escrow/deals/{id}/dispute/status - Update to under_review"""
        # Find or create a disputed deal
        deal_id = self._get_or_create_disputed_deal()
        if not deal_id:
            pytest.skip("Could not get/create disputed deal")
        
        response = self.session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/status", json={
            "new_status": "under_review",
            "notes": "Test: Moving to under review"
        })
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["dispute"]["status"] == "under_review"
        print(f"Dispute status updated to under_review")
    
    def test_dispute_status_update_evidence_required(self):
        """PUT /api/escrow/deals/{id}/dispute/status - Update to evidence_required"""
        deal_id = self._get_or_create_disputed_deal()
        if not deal_id:
            pytest.skip("Could not get/create disputed deal")
        
        response = self.session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/status", json={
            "new_status": "evidence_required",
            "notes": "Test: Requesting evidence"
        })
        assert response.status_code == 200, f"Status update failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["dispute"]["status"] == "evidence_required"
        print(f"Dispute status updated to evidence_required")

    # ==================== DISPUTE EVIDENCE TESTS ====================
    
    def test_add_dispute_evidence(self):
        """POST /api/escrow/deals/{id}/dispute/evidence - Add evidence to dispute"""
        deal_id = self._get_or_create_disputed_deal()
        if not deal_id:
            pytest.skip("Could not get/create disputed deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/evidence", json={
            "file_name": "test_evidence.pdf",
            "description": "Test evidence document for dispute"
        })
        assert response.status_code == 200, f"Evidence upload failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "evidence_id" in data
        print(f"Evidence added: {data['evidence_id']}")
    
    def test_add_dispute_evidence_with_file_data(self):
        """POST /api/escrow/deals/{id}/dispute/evidence - Add evidence with base64 file"""
        deal_id = self._get_or_create_disputed_deal()
        if not deal_id:
            pytest.skip("Could not get/create disputed deal")
        
        # Simple base64 encoded text
        import base64
        file_data = base64.b64encode(b"Test file content").decode()
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/evidence", json={
            "file_name": "test_document.txt",
            "description": "Test document with file data",
            "file_data": file_data
        })
        assert response.status_code == 200, f"Evidence with file failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        print(f"Evidence with file added: {data['evidence_id']}")

    # ==================== DISPUTE MESSAGE TESTS ====================
    
    def test_add_dispute_message(self):
        """POST /api/escrow/deals/{id}/dispute/message - Add message to dispute thread"""
        deal_id = self._get_or_create_disputed_deal()
        if not deal_id:
            pytest.skip("Could not get/create disputed deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/message", json={
            "message": "Test message from admin regarding the dispute"
        })
        assert response.status_code == 200, f"Message failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert "message" in data
        assert data["message"]["message"] == "Test message from admin regarding the dispute"
        assert data["message"]["sender"] == ADMIN_EMAIL
        print(f"Message added: {data['message']['id']}")
    
    def test_add_dispute_message_with_role(self):
        """POST /api/escrow/deals/{id}/dispute/message - Add message with sender_role"""
        deal_id = self._get_or_create_disputed_deal()
        if not deal_id:
            pytest.skip("Could not get/create disputed deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/message", json={
            "message": "Admin response to dispute",
            "sender_role": "admin"
        })
        assert response.status_code == 200, f"Message with role failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["message"]["sender_role"] == "admin"
        print(f"Message with role added")

    # ==================== DISPUTE RESOLUTION TESTS ====================
    
    def test_resolve_dispute_buyer(self):
        """PUT /api/escrow/deals/{id}/dispute/status - Resolve in favor of buyer"""
        deal_id = self._create_new_disputed_deal()
        if not deal_id:
            pytest.skip("Could not create disputed deal")
        
        response = self.session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/status", json={
            "new_status": "resolved_buyer",
            "notes": "Test: Resolved in favor of buyer"
        })
        assert response.status_code == 200, f"Resolve buyer failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["dispute"]["status"] == "resolved_buyer"
        assert data["deal"]["status"] == "closed"
        print(f"Dispute resolved in favor of buyer")
    
    def test_resolve_dispute_seller(self):
        """PUT /api/escrow/deals/{id}/dispute/status - Resolve in favor of seller"""
        deal_id = self._create_new_disputed_deal()
        if not deal_id:
            pytest.skip("Could not create disputed deal")
        
        response = self.session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/status", json={
            "new_status": "resolved_seller",
            "notes": "Test: Resolved in favor of seller"
        })
        assert response.status_code == 200, f"Resolve seller failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["dispute"]["status"] == "resolved_seller"
        assert data["deal"]["status"] == "closed"
        print(f"Dispute resolved in favor of seller")
    
    def test_resolve_dispute_split(self):
        """PUT /api/escrow/deals/{id}/dispute/status - Resolve with 50/50 split"""
        deal_id = self._create_new_disputed_deal()
        if not deal_id:
            pytest.skip("Could not create disputed deal")
        
        response = self.session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/status", json={
            "new_status": "resolved_split",
            "notes": "Test: Resolved with 50/50 split"
        })
        assert response.status_code == 200, f"Resolve split failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["dispute"]["status"] == "resolved_split"
        assert data["deal"]["status"] == "closed"
        print(f"Dispute resolved with split")

    # ==================== ADMIN FORCE RELEASE TESTS ====================
    
    def test_admin_force_release_buyer(self):
        """POST /api/escrow/deals/{id}/admin-force-release - Force release to buyer"""
        deal_id = self._create_new_disputed_deal()
        if not deal_id:
            pytest.skip("Could not create disputed deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/admin-force-release", json={
            "release_to": "buyer",
            "notes": "Test: Admin force release to buyer",
            "amount_buyer": 10000.0,
            "amount_seller": 0.0
        })
        assert response.status_code == 200, f"Force release failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["status"] == "closed"
        assert "force_release" in data["deal"]
        assert data["release"]["release_to"] == "buyer"
        print(f"Force release to buyer executed")
    
    def test_admin_force_release_seller(self):
        """POST /api/escrow/deals/{id}/admin-force-release - Force release to seller"""
        deal_id = self._create_new_disputed_deal()
        if not deal_id:
            pytest.skip("Could not create disputed deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/admin-force-release", json={
            "release_to": "seller",
            "notes": "Test: Admin force release to seller"
        })
        assert response.status_code == 200, f"Force release failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["status"] == "closed"
        print(f"Force release to seller executed")
    
    def test_admin_force_release_split(self):
        """POST /api/escrow/deals/{id}/admin-force-release - Force release with split"""
        deal_id = self._create_new_disputed_deal()
        if not deal_id:
            pytest.skip("Could not create disputed deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/admin-force-release", json={
            "release_to": "split",
            "notes": "Test: Admin force release split 50/50",
            "amount_buyer": 5000.0,
            "amount_seller": 5000.0
        })
        assert response.status_code == 200, f"Force release split failed: {response.text}"
        
        data = response.json()
        assert data["success"] is True
        assert data["deal"]["status"] == "closed"
        print(f"Force release split executed")

    # ==================== ERROR HANDLING TESTS ====================
    
    def test_dispute_status_update_non_disputed_deal(self):
        """PUT /api/escrow/deals/{id}/dispute/status - Error on non-disputed deal"""
        # Create a draft deal (not disputed)
        deal_id = self._create_draft_deal()
        if not deal_id:
            pytest.skip("Could not create draft deal")
        
        response = self.session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/status", json={
            "new_status": "under_review"
        })
        assert response.status_code == 400
        assert "not in disputed state" in response.json().get("detail", "").lower()
    
    def test_add_evidence_non_disputed_deal(self):
        """POST /api/escrow/deals/{id}/dispute/evidence - Error on non-disputed deal"""
        deal_id = self._create_draft_deal()
        if not deal_id:
            pytest.skip("Could not create draft deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/evidence", json={
            "file_name": "test.pdf"
        })
        assert response.status_code == 400
    
    def test_add_message_non_disputed_deal(self):
        """POST /api/escrow/deals/{id}/dispute/message - Error on non-disputed deal"""
        deal_id = self._create_draft_deal()
        if not deal_id:
            pytest.skip("Could not create draft deal")
        
        response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute/message", json={
            "message": "Test message"
        })
        assert response.status_code == 400

    # ==================== HELPER METHODS ====================
    
    def _get_or_create_disputed_deal(self):
        """Get existing disputed deal or create one"""
        # First try to find existing disputed deal
        response = self.session.get(f"{BASE_URL}/api/escrow/deals", params={"status": "disputed"})
        if response.status_code == 200:
            deals = response.json().get("deals", [])
            if deals:
                return deals[0]["id"]
        
        # Create new disputed deal
        return self._create_new_disputed_deal()
    
    def _create_new_disputed_deal(self):
        """Create a new deal and open dispute on it"""
        # Create deal
        deal_response = self.session.post(f"{BASE_URL}/api/escrow/deals", json={
            "deal_type": "crypto_crypto",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": f"TEST_Buyer_{uuid.uuid4().hex[:6]}", "email": "buyer@test.com"},
            "seller": {"name": f"TEST_Seller_{uuid.uuid4().hex[:6]}", "email": "seller@test.com"},
            "notes": "Test deal for Phase 3 dispute testing"
        })
        
        if deal_response.status_code != 200:
            print(f"Failed to create deal: {deal_response.text}")
            return None
        
        deal_id = deal_response.json()["deal"]["id"]
        
        # Open dispute
        dispute_response = self.session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/dispute", json={
            "reason": "Test dispute for Phase 3 testing"
        })
        
        if dispute_response.status_code != 200:
            print(f"Failed to open dispute: {dispute_response.text}")
            return None
        
        return deal_id
    
    def _create_draft_deal(self):
        """Create a draft deal (not disputed)"""
        response = self.session.post(f"{BASE_URL}/api/escrow/deals", json={
            "deal_type": "crypto_crypto",
            "asset_a": "ETH",
            "asset_b": "USDC",
            "quantity_a": 10.0,
            "quantity_b": 25000.0,
            "agreed_price": 2500.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": f"TEST_DraftBuyer_{uuid.uuid4().hex[:6]}", "email": "draft@test.com"},
            "seller": {"name": f"TEST_DraftSeller_{uuid.uuid4().hex[:6]}", "email": "draft@test.com"},
            "notes": "Test draft deal"
        })
        
        if response.status_code != 200:
            return None
        
        return response.json()["deal"]["id"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
