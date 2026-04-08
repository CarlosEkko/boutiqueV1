"""
Test OTC Lead to KYC Verification Flow
Tests the advance-to-kyc endpoint and KYC verifications page integration
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_session():
    """Module-scoped auth session to avoid rate limiting"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login to get token
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "carlos@kbex.io",
        "password": "senha123"
    })
    assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    token = login_response.json().get("access_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session


class TestOTCKYCVerifications:
    """Tests for OTC Lead KYC verification flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_session):
        """Setup test fixtures"""
        self.session = auth_session
        
        # Store existing lead ID for testing
        self.existing_lead_id = "2f04eb7c-2d56-4899-a920-38593bd86841"
    
    # ==================== KYC VERIFICATIONS ENDPOINT ====================
    
    def test_kyc_verifications_returns_otc_leads(self):
        """GET /api/risk-compliance/kyc-verifications returns OTC leads alongside Sumsub entries"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications")
        assert response.status_code == 200
        
        data = response.json()
        assert "verifications" in data
        assert "stats" in data
        
        verifications = data["verifications"]
        assert len(verifications) > 0, "Should have at least one verification"
        
        # Find OTC lead entries
        otc_lead_entries = [v for v in verifications if v.get("source") == "otc_lead"]
        assert len(otc_lead_entries) > 0, "Should have at least one OTC lead entry"
        
        # Find Sumsub entries
        sumsub_entries = [v for v in verifications if v.get("source") == "sumsub"]
        # Sumsub entries may or may not exist, just verify structure
        
        print(f"Found {len(otc_lead_entries)} OTC lead entries and {len(sumsub_entries)} Sumsub entries")
    
    def test_otc_lead_entry_has_required_fields(self):
        """OTC lead entries in KYC verifications have source=otc_lead, tier, tier_fee fields"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        # Find the specific OTC lead entry
        otc_lead_entry = next((v for v in verifications if v.get("lead_id") == self.existing_lead_id), None)
        assert otc_lead_entry is not None, f"Should find OTC lead entry for {self.existing_lead_id}"
        
        # Verify required fields
        assert otc_lead_entry.get("source") == "otc_lead", "source should be 'otc_lead'"
        assert otc_lead_entry.get("tier") is not None, "tier field should be present"
        assert otc_lead_entry.get("tier_label") is not None, "tier_label field should be present"
        assert otc_lead_entry.get("tier_fee") is not None, "tier_fee field should be present"
        assert otc_lead_entry.get("lead_id") == self.existing_lead_id, "lead_id should match"
        
        # Verify tier_fee format (e.g., "50 000 EUR")
        tier_fee = otc_lead_entry.get("tier_fee")
        assert "EUR" in tier_fee or "USD" in tier_fee, f"tier_fee should contain currency: {tier_fee}"
        
        print(f"OTC Lead entry: tier={otc_lead_entry.get('tier')}, tier_fee={tier_fee}")
    
    def test_otc_lead_entry_has_no_sumsub_link(self):
        """OTC lead entries should NOT have sumsub_link"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        otc_lead_entries = [v for v in verifications if v.get("source") == "otc_lead"]
        for entry in otc_lead_entries:
            assert entry.get("sumsub_link") is None, f"OTC lead entry should not have sumsub_link: {entry.get('email')}"
        
        print(f"Verified {len(otc_lead_entries)} OTC lead entries have no sumsub_link")
    
    def test_sumsub_entries_have_sumsub_link(self):
        """Sumsub entries should have sumsub_link"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        sumsub_entries = [v for v in verifications if v.get("source") == "sumsub"]
        for entry in sumsub_entries:
            if entry.get("applicant_id"):
                assert entry.get("sumsub_link") is not None, f"Sumsub entry should have sumsub_link: {entry.get('email')}"
                assert "cockpit.sumsub.com" in entry.get("sumsub_link"), "sumsub_link should point to Sumsub cockpit"
        
        print(f"Verified {len(sumsub_entries)} Sumsub entries have sumsub_link")
    
    def test_kyc_verifications_stats(self):
        """KYC verifications endpoint returns correct stats"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications")
        assert response.status_code == 200
        
        data = response.json()
        stats = data["stats"]
        
        assert "total" in stats
        assert "pending" in stats
        assert "approved" in stats
        assert "rejected" in stats
        assert "kyc_count" in stats
        assert "kyb_count" in stats
        
        # Verify total matches verifications count
        assert stats["total"] == len(data["verifications"]), "Total should match verifications count"
        
        print(f"Stats: total={stats['total']}, pending={stats['pending']}, approved={stats['approved']}")
    
    # ==================== ADVANCE TO KYC ENDPOINT ====================
    
    def test_advance_to_kyc_requires_pre_qualified_status(self):
        """POST /api/otc/leads/{id}/advance-to-kyc requires pre_qualified status"""
        # The existing lead is already at kyc_pending, so this should fail
        response = self.session.post(f"{BASE_URL}/api/otc/leads/{self.existing_lead_id}/advance-to-kyc")
        
        # Should fail because lead is already at kyc_pending
        assert response.status_code == 400, f"Should fail for non-pre_qualified lead: {response.text}"
        assert "pre-qualified" in response.json().get("detail", "").lower() or "pre_qualified" in response.json().get("detail", "").lower()
    
    def test_advance_to_kyc_creates_sumsub_applicant_entry(self):
        """Verify that advance-to-kyc created a sumsub_applicants entry with source=otc_lead"""
        # Check the existing lead's KYC entry
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        # Find the entry for our lead
        lead_entry = next((v for v in verifications if v.get("lead_id") == self.existing_lead_id), None)
        assert lead_entry is not None, "Should find KYC entry for the lead"
        
        # Verify it was created with correct source
        assert lead_entry.get("source") == "otc_lead"
        assert lead_entry.get("applicant_id") is not None
        assert lead_entry.get("applicant_id").startswith("otc-"), "applicant_id should start with 'otc-'"
    
    def test_advance_to_kyc_response_structure(self):
        """Verify the lead has tier_info after advance-to-kyc"""
        # Get the lead to verify tier info was set
        response = self.session.get(f"{BASE_URL}/api/otc/leads/{self.existing_lead_id}")
        assert response.status_code == 200
        
        lead = response.json()
        
        # Verify tier info was set
        assert lead.get("tier_fee") is not None, "tier_fee should be set"
        assert lead.get("tier_currency") is not None, "tier_currency should be set"
        assert lead.get("kyc_sent_at") is not None, "kyc_sent_at should be set"
        assert lead.get("status") == "kyc_pending", "status should be kyc_pending"
        
        print(f"Lead tier_fee: {lead.get('tier_fee')} {lead.get('tier_currency')}")
    
    # ==================== MANUAL REVIEW ====================
    
    def test_manual_approve_kyc_for_otc_lead(self):
        """Manual approve works for OTC lead KYC entries"""
        # First, create a new test lead to approve
        test_lead_data = {
            "entity_name": f"TEST_ManualApprove_{uuid.uuid4().hex[:8]}",
            "contact_name": "Test Approve User",
            "contact_email": f"test_approve_{uuid.uuid4().hex[:8]}@test.com",
            "contact_phone": "+351911000001",
            "country": "PT",
            "source": "website",
            "potential_tier": "standard"
        }
        
        # Create lead
        create_response = self.session.post(f"{BASE_URL}/api/otc/leads", json=test_lead_data)
        assert create_response.status_code == 200, f"Failed to create lead: {create_response.text}"
        lead_id = create_response.json()["lead"]["id"]
        
        try:
            # Pre-qualify the lead
            prequalify_response = self.session.post(
                f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualification",
                json={
                    "client_type": "retail",
                    "first_operation_value": 10000,
                    "expected_frequency": "one_shot",
                    "operation_objective": "trading",
                    "fund_source": "income"
                }
            )
            assert prequalify_response.status_code == 200, f"Failed to pre-qualify: {prequalify_response.text}"
            
            # Advance to KYC
            advance_response = self.session.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
            assert advance_response.status_code == 200, f"Failed to advance to KYC: {advance_response.text}"
            
            # Verify tier_info in response
            advance_data = advance_response.json()
            assert "tier_info" in advance_data, "Response should contain tier_info"
            assert advance_data["tier_info"]["label"] is not None
            assert advance_data["tier_info"]["fee"] is not None
            
            # Now test manual approve
            approve_response = self.session.post(
                f"{BASE_URL}/api/risk-compliance/kyc-verifications/{lead_id}/manual-review",
                json={"action": "approve", "reason": "Test approval"}
            )
            assert approve_response.status_code == 200, f"Failed to approve: {approve_response.text}"
            
            approve_data = approve_response.json()
            assert approve_data.get("success") == True
            assert approve_data.get("status") == "approved"
            
            print(f"Successfully approved OTC lead KYC: {lead_id}")
            
        finally:
            # Cleanup - delete the test lead
            self.session.delete(f"{BASE_URL}/api/otc/leads/{lead_id}")
    
    def test_manual_reject_kyc_for_otc_lead(self):
        """Manual reject works for OTC lead KYC entries"""
        # Create a new test lead to reject
        test_lead_data = {
            "entity_name": f"TEST_ManualReject_{uuid.uuid4().hex[:8]}",
            "contact_name": "Test Reject User",
            "contact_email": f"test_reject_{uuid.uuid4().hex[:8]}@test.com",
            "contact_phone": "+351911000002",
            "country": "PT",
            "source": "website",
            "potential_tier": "standard"
        }
        
        # Create lead
        create_response = self.session.post(f"{BASE_URL}/api/otc/leads", json=test_lead_data)
        assert create_response.status_code == 200, f"Failed to create lead: {create_response.text}"
        lead_id = create_response.json()["lead"]["id"]
        
        try:
            # Pre-qualify the lead
            prequalify_response = self.session.post(
                f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualification",
                json={
                    "client_type": "retail",
                    "first_operation_value": 10000,
                    "expected_frequency": "one_shot",
                    "operation_objective": "trading",
                    "fund_source": "income"
                }
            )
            assert prequalify_response.status_code == 200
            
            # Advance to KYC
            advance_response = self.session.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
            assert advance_response.status_code == 200
            
            # Now test manual reject
            reject_response = self.session.post(
                f"{BASE_URL}/api/risk-compliance/kyc-verifications/{lead_id}/manual-review",
                json={"action": "reject", "reason": "Test rejection - invalid documents"}
            )
            assert reject_response.status_code == 200, f"Failed to reject: {reject_response.text}"
            
            reject_data = reject_response.json()
            assert reject_data.get("success") == True
            assert reject_data.get("status") == "rejected"
            
            print(f"Successfully rejected OTC lead KYC: {lead_id}")
            
        finally:
            # Cleanup - delete the test lead
            self.session.delete(f"{BASE_URL}/api/otc/leads/{lead_id}")
    
    # ==================== FILTER TESTS ====================
    
    def test_kyc_verifications_filter_by_status(self):
        """KYC verifications can be filtered by status"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        # All returned entries should have pending status
        for v in verifications:
            assert v.get("status") == "pending", f"Expected pending status, got {v.get('status')}"
        
        print(f"Found {len(verifications)} pending verifications")
    
    def test_kyc_verifications_filter_by_type(self):
        """KYC verifications can be filtered by verification_type (kyc/kyb)"""
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications?verification_type=kyc")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        # All returned entries should be KYC type
        for v in verifications:
            assert v.get("verification_type") == "kyc", f"Expected kyc type, got {v.get('verification_type')}"
        
        print(f"Found {len(verifications)} KYC verifications")
    
    def test_kyc_verifications_search(self):
        """KYC verifications can be searched by name/email"""
        # Search for the existing lead
        response = self.session.get(f"{BASE_URL}/api/risk-compliance/kyc-verifications?search=carlos")
        assert response.status_code == 200
        
        data = response.json()
        verifications = data["verifications"]
        
        # Should find entries with "carlos" in name or email
        assert len(verifications) > 0, "Should find at least one entry with 'carlos'"
        
        for v in verifications:
            name_or_email = f"{v.get('name', '')} {v.get('email', '')}".lower()
            assert "carlos" in name_or_email, f"Entry should contain 'carlos': {name_or_email}"
        
        print(f"Found {len(verifications)} verifications matching 'carlos'")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
