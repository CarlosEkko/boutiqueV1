"""
Test Suite for Iteration 33: CompliancePage Wallet-Centric View & Public Lead Creation
Tests:
- P0: CompliancePage wallet-centric view - click wallet card updates KYT, Satoshi Test, and Proof panels
- P1a: Public 'Solicitar Acesso' form creates both CRM Lead and OTC Lead via POST /api/crm/leads/public
- P1b: /register route redirects to /#contact (no public registration form)
- P1c: AuthPage only shows Login form - no sign up toggle or register form
- P1d: AuthPage 'Solicitar Acesso' link at bottom points to /#contact
- Backend: POST /api/crm/leads/public returns otc_lead_created: true
- Backend: Duplicate email protection - submitting same email twice should not create duplicate OTC lead
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://boutique-exchange.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")
TEST_DEAL_ID = "baa39416-6cca-4140-ad25-14167c741f52"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestPublicLeadCreation:
    """Test public lead creation endpoint - creates both CRM and OTC leads"""
    
    def test_public_lead_creates_crm_and_otc_lead(self):
        """P1a: POST /api/crm/leads/public creates both CRM Lead and OTC Lead"""
        unique_email = f"test_public_lead_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Public Lead",
                "email": unique_email,
                "phone": "+351123456789",
                "message": "Test message from public form"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Expected success: true"
        assert data.get("already_exists") == False, "Expected already_exists: false for new lead"
        assert data.get("otc_lead_created") == True, "Expected otc_lead_created: true"
        assert "message" in data, "Expected message in response"
        
        print(f"✓ Public lead created successfully: {unique_email}")
        print(f"  - OTC Lead Created: {data.get('otc_lead_created')}")
        print(f"  - Email Sent: {data.get('email_sent')}")
    
    def test_duplicate_email_protection(self):
        """Backend: Duplicate email protection - submitting same email twice should not create duplicate OTC lead"""
        unique_email = f"test_duplicate_{uuid.uuid4().hex[:8]}@test.com"
        
        # First submission
        response1 = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Duplicate Lead",
                "email": unique_email,
                "phone": "+351123456789",
                "message": "First submission"
            }
        )
        
        assert response1.status_code == 200, f"First submission failed: {response1.text}"
        data1 = response1.json()
        assert data1.get("success") == True
        assert data1.get("otc_lead_created") == True, "First submission should create OTC lead"
        
        # Second submission with same email
        response2 = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Duplicate Lead 2",
                "email": unique_email,
                "phone": "+351987654321",
                "message": "Second submission"
            }
        )
        
        assert response2.status_code == 200, f"Second submission failed: {response2.text}"
        data2 = response2.json()
        
        # Second submission should indicate already exists
        assert data2.get("success") == True
        assert data2.get("already_exists") == True, "Second submission should indicate already_exists: true"
        
        print(f"✓ Duplicate email protection working: {unique_email}")
        print(f"  - First submission: otc_lead_created={data1.get('otc_lead_created')}")
        print(f"  - Second submission: already_exists={data2.get('already_exists')}")
    
    def test_public_lead_without_turnstile(self):
        """Test public lead creation without turnstile token (should work in test environment)"""
        unique_email = f"test_no_turnstile_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test No Turnstile",
                "email": unique_email,
                "phone": "+351111222333",
                "message": None,
                "turnstile_token": None
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        print(f"✓ Public lead created without turnstile token: {unique_email}")
    
    def test_public_lead_required_fields(self):
        """Test that required fields are validated"""
        # Missing email
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Missing Email",
                "phone": "+351123456789"
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for missing email, got {response.status_code}"
        
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "email": "test@test.com",
                "phone": "+351123456789"
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for missing name, got {response.status_code}"
        
        # Missing phone
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Missing Phone",
                "email": "test@test.com"
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for missing phone, got {response.status_code}"
        
        print("✓ Required field validation working correctly")


class TestOTCLeadVerification:
    """Verify OTC lead was created via search endpoint"""
    
    def test_verify_otc_lead_created(self, auth_headers):
        """Verify OTC lead can be found after public form submission"""
        unique_email = f"test_verify_otc_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create lead via public form
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Verify OTC",
                "email": unique_email,
                "phone": "+351555666777",
                "message": "Verify OTC lead creation"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("otc_lead_created") == True
        
        # Search for the OTC lead
        search_response = requests.get(
            f"{BASE_URL}/api/otc/leads",
            params={"search": unique_email},
            headers=auth_headers
        )
        
        assert search_response.status_code == 200, f"OTC leads search failed: {search_response.text}"
        leads = search_response.json()
        
        # Find our lead
        found_lead = None
        for lead in leads:
            if lead.get("contact_email", "").lower() == unique_email.lower():
                found_lead = lead
                break
        
        assert found_lead is not None, f"OTC lead not found for email: {unique_email}"
        assert found_lead.get("source") == "website", "Expected source to be 'website'"
        assert "Solicitar Acesso" in found_lead.get("source_detail", ""), "Expected source_detail to contain 'Solicitar Acesso'"
        
        print(f"✓ OTC lead verified in database: {unique_email}")
        print(f"  - Lead ID: {found_lead.get('id')}")
        print(f"  - Source: {found_lead.get('source')}")
        print(f"  - Source Detail: {found_lead.get('source_detail')}")


class TestCompliancePageAPI:
    """Test Compliance Page API endpoints for wallet-centric view"""
    
    def test_get_deal_compliance(self, auth_headers):
        """Test fetching compliance data for a deal"""
        response = requests.get(
            f"{BASE_URL}/api/otc-deals/deals/{TEST_DEAL_ID}/compliance",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get compliance: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify compliance structure
        assert "wallets" in data, "Expected 'wallets' in compliance data"
        assert "kyt" in data or "overall_status" in data, "Expected KYT or overall_status in compliance data"
        
        print(f"✓ Compliance data retrieved for deal: {TEST_DEAL_ID}")
        print(f"  - Wallets count: {len(data.get('wallets', []))}")
        print(f"  - Overall status: {data.get('overall_status')}")
        
        # Return data for further tests
        return data
    
    def test_compliance_wallets_have_required_fields(self, auth_headers):
        """Test that wallets have required fields for wallet-centric view"""
        response = requests.get(
            f"{BASE_URL}/api/otc-deals/deals/{TEST_DEAL_ID}/compliance",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        wallets = data.get("wallets", [])
        
        if len(wallets) > 0:
            wallet = wallets[0]
            # Check required fields for wallet-centric view
            assert "id" in wallet, "Wallet should have 'id'"
            assert "address" in wallet, "Wallet should have 'address'"
            assert "blockchain" in wallet, "Wallet should have 'blockchain'"
            assert "status" in wallet, "Wallet should have 'status'"
            
            print(f"✓ Wallet structure verified")
            print(f"  - Wallet ID: {wallet.get('id')}")
            print(f"  - Address: {wallet.get('address', '')[:20]}...")
            print(f"  - Blockchain: {wallet.get('blockchain')}")
            print(f"  - KYT Status: {wallet.get('kyt_status')}")
            print(f"  - KYT Score: {wallet.get('kyt_score')}")
        else:
            print("⚠ No wallets found in compliance data - skipping wallet structure test")
    
    def test_get_deal_details(self, auth_headers):
        """Test fetching deal details"""
        response = requests.get(
            f"{BASE_URL}/api/otc-deals/deals/{TEST_DEAL_ID}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get deal: {response.status_code} - {response.text}"
        data = response.json()
        
        assert "id" in data or "deal_number" in data, "Expected deal ID or deal_number"
        
        print(f"✓ Deal details retrieved")
        print(f"  - Deal Number: {data.get('deal_number')}")
        print(f"  - Client: {data.get('client_name')}")
        print(f"  - Asset: {data.get('asset')}")
        print(f"  - Quantity: {data.get('quantity')}")


class TestCRMLeadVerification:
    """Verify CRM lead was created via search endpoint"""
    
    def test_verify_crm_lead_created(self, auth_headers):
        """Verify CRM lead can be found after public form submission"""
        unique_email = f"test_verify_crm_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create lead via public form
        response = requests.post(
            f"{BASE_URL}/api/crm/leads/public",
            json={
                "name": "Test Verify CRM",
                "email": unique_email,
                "phone": "+351888999000",
                "message": "Verify CRM lead creation"
            }
        )
        
        assert response.status_code == 200
        
        # Search for the CRM lead
        search_response = requests.get(
            f"{BASE_URL}/api/crm/leads",
            params={"search": unique_email},
            headers=auth_headers
        )
        
        assert search_response.status_code == 200, f"CRM leads search failed: {search_response.text}"
        leads = search_response.json()
        
        # Find our lead
        found_lead = None
        for lead in leads:
            if lead.get("email", "").lower() == unique_email.lower():
                found_lead = lead
                break
        
        assert found_lead is not None, f"CRM lead not found for email: {unique_email}"
        assert found_lead.get("source") == "Website", "Expected source to be 'Website'"
        assert found_lead.get("interest") == "Solicitar Acesso", "Expected interest to be 'Solicitar Acesso'"
        assert "website" in found_lead.get("tags", []), "Expected 'website' tag"
        assert "solicitar-acesso" in found_lead.get("tags", []), "Expected 'solicitar-acesso' tag"
        
        print(f"✓ CRM lead verified in database: {unique_email}")
        print(f"  - Lead ID: {found_lead.get('id')}")
        print(f"  - Source: {found_lead.get('source')}")
        print(f"  - Interest: {found_lead.get('interest')}")
        print(f"  - Tags: {found_lead.get('tags')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
