"""
Test OTC Lead Bug Fixes - Iteration 31
Tests for 7 bugs fixed in OTC Lead creation/editing:
1. Phone mandatory
2. Source dropdown options
3. 'both' transaction type
4. Rapid clicks duplicate prevention (frontend only)
5. Edit modal with notes/settlement/tier
6. KYC email trigger (not tested here - email service)
7. Number formatting (frontend only)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOTCLeadBugFixes:
    """Test OTC Lead bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("access_token")
        assert self.token, "No access_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        self.created_lead_ids = []
        yield
        
        # Cleanup - delete test leads
        for lead_id in self.created_lead_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/otc/leads/{lead_id}")
            except:
                pass
    
    # ==================== BUG 1: Phone Mandatory ====================
    
    def test_create_lead_without_phone_fails(self):
        """Bug 1: Backend should reject leads without phone"""
        payload = {
            "entity_name": "TEST_NoPhone Corp",
            "contact_name": "Test User",
            "contact_email": "test_nophone@test.com",
            # No contact_phone
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 100000,
            "transaction_type": "buy"
        }
        
        response = self.session.post(f"{BASE_URL}/api/otc/leads", json=payload)
        
        # Should fail with 422 validation error
        assert response.status_code == 422, f"Expected 422 for missing phone, got {response.status_code}: {response.text}"
        print("PASS: Backend rejects lead without phone (422)")
    
    def test_create_lead_with_phone_succeeds(self):
        """Bug 1: Backend should accept leads with phone"""
        payload = {
            "entity_name": "TEST_WithPhone Corp",
            "contact_name": "Test User",
            "contact_email": f"test_withphone_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 100000,
            "transaction_type": "buy"
        }
        
        response = self.session.post(f"{BASE_URL}/api/otc/leads", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("lead", {}).get("contact_phone") == "+351912345678"
        
        # Track for cleanup
        lead_id = data.get("lead", {}).get("id")
        if lead_id:
            self.created_lead_ids.append(lead_id)
        
        print("PASS: Backend accepts lead with phone")
    
    # ==================== BUG 2: Source Dropdown Options ====================
    
    def test_enums_returns_sources_flat_array(self):
        """Bug 2: Enums API should return 'sources' as flat array"""
        response = self.session.get(f"{BASE_URL}/api/otc/stats/enums")
        
        assert response.status_code == 200, f"Enums API failed: {response.text}"
        data = response.json()
        
        # Check 'sources' key exists and is a flat array
        assert "sources" in data, "Missing 'sources' key in enums response"
        sources = data["sources"]
        assert isinstance(sources, list), f"'sources' should be a list, got {type(sources)}"
        
        # Check all 8 expected sources
        expected_sources = ["website", "referral", "linkedin", "event", "broker", "cold_outreach", "existing_client", "other"]
        for src in expected_sources:
            assert src in sources, f"Missing source: {src}"
        
        print(f"PASS: Enums returns sources as flat array: {sources}")
    
    def test_create_lead_with_all_sources(self):
        """Bug 2: All source values should be accepted"""
        sources_to_test = ["website", "referral", "linkedin", "event", "broker", "cold_outreach", "existing_client", "other"]
        
        for source in sources_to_test:
            payload = {
                "entity_name": f"TEST_Source_{source}",
                "contact_name": "Test User",
                "contact_email": f"test_source_{source}_{int(time.time())}@test.com",
                "contact_phone": "+351912345678",
                "country": "Portugal",
                "source": source,
                "estimated_volume_usd": 50000,
                "transaction_type": "buy"
            }
            
            response = self.session.post(f"{BASE_URL}/api/otc/leads", json=payload)
            assert response.status_code == 200, f"Source '{source}' failed: {response.text}"
            
            lead_id = response.json().get("lead", {}).get("id")
            if lead_id:
                self.created_lead_ids.append(lead_id)
        
        print(f"PASS: All {len(sources_to_test)} source values accepted")
    
    # ==================== BUG 3: Transaction Type 'both' ====================
    
    def test_create_lead_with_both_transaction_type(self):
        """Bug 3: Transaction type 'both' (Ambos) should work"""
        payload = {
            "entity_name": "TEST_BothType Corp",
            "contact_name": "Test User",
            "contact_email": f"test_both_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 200000,
            "transaction_type": "both"  # The key fix
        }
        
        response = self.session.post(f"{BASE_URL}/api/otc/leads", json=payload)
        
        assert response.status_code == 200, f"Transaction type 'both' failed: {response.text}"
        data = response.json()
        assert data.get("lead", {}).get("transaction_type") == "both"
        
        lead_id = data.get("lead", {}).get("id")
        if lead_id:
            self.created_lead_ids.append(lead_id)
        
        print("PASS: Transaction type 'both' accepted")
    
    def test_enums_includes_both_transaction_type(self):
        """Bug 3: Enums should include 'both' in transaction_types"""
        response = self.session.get(f"{BASE_URL}/api/otc/stats/enums")
        
        assert response.status_code == 200
        data = response.json()
        
        tx_types = data.get("transaction_types", [])
        tx_values = [t.get("value") for t in tx_types]
        
        assert "both" in tx_values, f"'both' not in transaction_types: {tx_values}"
        assert "buy" in tx_values
        assert "sell" in tx_values
        assert "swap" in tx_values
        
        print(f"PASS: Transaction types include 'both': {tx_values}")
    
    # ==================== BUG 5: Edit Modal - Notes/Settlement/Tier ====================
    
    def test_update_lead_notes(self):
        """Bug 5: PUT /api/otc/leads/{id} should update notes"""
        # First create a lead
        create_payload = {
            "entity_name": "TEST_EditNotes Corp",
            "contact_name": "Test User",
            "contact_email": f"test_edit_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 100000,
            "transaction_type": "buy"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/otc/leads", json=create_payload)
        assert create_response.status_code == 200
        lead_id = create_response.json().get("lead", {}).get("id")
        self.created_lead_ids.append(lead_id)
        
        # Update notes
        update_payload = {
            "notes": "Updated notes from test"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/otc/leads/{lead_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify via GET
        get_response = self.session.get(f"{BASE_URL}/api/otc/leads/{lead_id}")
        assert get_response.status_code == 200
        lead_data = get_response.json()
        assert lead_data.get("notes") == "Updated notes from test"
        
        print("PASS: Lead notes updated successfully")
    
    def test_update_lead_settlement_methods(self):
        """Bug 5: PUT should update preferred_settlement_methods"""
        # Create lead
        create_payload = {
            "entity_name": "TEST_EditSettlement Corp",
            "contact_name": "Test User",
            "contact_email": f"test_settlement_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 100000,
            "transaction_type": "buy"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/otc/leads", json=create_payload)
        assert create_response.status_code == 200
        lead_id = create_response.json().get("lead", {}).get("id")
        self.created_lead_ids.append(lead_id)
        
        # Update settlement methods
        update_payload = {
            "preferred_settlement_methods": ["sepa", "swift", "pix"]
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/otc/leads/{lead_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/otc/leads/{lead_id}")
        assert get_response.status_code == 200
        lead_data = get_response.json()
        assert set(lead_data.get("preferred_settlement_methods", [])) == {"sepa", "swift", "pix"}
        
        print("PASS: Lead settlement methods updated successfully")
    
    def test_update_lead_potential_tier(self):
        """Bug 5: PUT should update potential_tier"""
        # Create lead
        create_payload = {
            "entity_name": "TEST_EditTier Corp",
            "contact_name": "Test User",
            "contact_email": f"test_tier_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 100000,
            "transaction_type": "buy"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/otc/leads", json=create_payload)
        assert create_response.status_code == 200
        lead_id = create_response.json().get("lead", {}).get("id")
        self.created_lead_ids.append(lead_id)
        
        # Update tier
        update_payload = {
            "potential_tier": "vip"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/otc/leads/{lead_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/otc/leads/{lead_id}")
        assert get_response.status_code == 200
        lead_data = get_response.json()
        assert lead_data.get("potential_tier") == "vip"
        
        print("PASS: Lead potential_tier updated successfully")
    
    def test_update_lead_volume(self):
        """Bug 5: PUT should update estimated_volume_usd and volume_per_operation"""
        # Create lead
        create_payload = {
            "entity_name": "TEST_EditVolume Corp",
            "contact_name": "Test User",
            "contact_email": f"test_volume_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "website",
            "estimated_volume_usd": 100000,
            "transaction_type": "buy"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/otc/leads", json=create_payload)
        assert create_response.status_code == 200
        lead_id = create_response.json().get("lead", {}).get("id")
        self.created_lead_ids.append(lead_id)
        
        # Update volumes
        update_payload = {
            "estimated_volume_usd": 500000,
            "volume_per_operation": 100000
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/otc/leads/{lead_id}", json=update_payload)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/otc/leads/{lead_id}")
        assert get_response.status_code == 200
        lead_data = get_response.json()
        assert lead_data.get("estimated_volume_usd") == 500000
        assert lead_data.get("volume_per_operation") == 100000
        
        print("PASS: Lead volumes updated successfully")
    
    # ==================== Enums - Potential Tiers ====================
    
    def test_enums_returns_potential_tiers(self):
        """Enums API should return 'potential_tiers' with standard/premium/vip/institutional"""
        response = self.session.get(f"{BASE_URL}/api/otc/stats/enums")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "potential_tiers" in data, "Missing 'potential_tiers' key"
        tiers = data["potential_tiers"]
        tier_values = [t.get("value") for t in tiers]
        
        expected_tiers = ["standard", "premium", "vip", "institutional"]
        for tier in expected_tiers:
            assert tier in tier_values, f"Missing tier: {tier}"
        
        print(f"PASS: Potential tiers returned: {tier_values}")
    
    # ==================== Create Lead with Tier ====================
    
    def test_create_lead_with_potential_tier(self):
        """Create lead with potential_tier field"""
        payload = {
            "entity_name": "TEST_WithTier Corp",
            "contact_name": "Test User",
            "contact_email": f"test_withtier_{int(time.time())}@test.com",
            "contact_phone": "+351912345678",
            "country": "Portugal",
            "source": "referral",
            "estimated_volume_usd": 1000000,
            "transaction_type": "both",
            "potential_tier": "institutional"
        }
        
        response = self.session.post(f"{BASE_URL}/api/otc/leads", json=payload)
        
        assert response.status_code == 200, f"Create with tier failed: {response.text}"
        data = response.json()
        assert data.get("lead", {}).get("potential_tier") == "institutional"
        
        lead_id = data.get("lead", {}).get("id")
        if lead_id:
            self.created_lead_ids.append(lead_id)
        
        print("PASS: Lead created with potential_tier")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
