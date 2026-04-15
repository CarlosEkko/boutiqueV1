"""
OTC Lead Workflow Tests - Iteration 14
Tests for:
1. OTC Lead creation with new extended fields
2. Lead pre-qualification workflow
3. Advance to KYC button functionality
4. KYC approval workflow
5. Lead conversion to OTC client
6. Client OTC Portal - viewing deals
7. Client OTC Portal - creating RFQ
8. Client OTC Portal - viewing quotes
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carlos@kryptobox.io"
TEST_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestOTCLeadCreationWithExtendedFields:
    """Tests for OTC Lead creation with new extended fields"""
    
    def test_create_lead_with_all_new_fields(self, api_client):
        """POST /api/otc/leads - Create lead with trading_frequency field"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Note: volume_per_operation, execution_timeframe, current_exchange, problem_to_solve
        # are added during pre-qualification, not during initial lead creation
        lead_data = {
            "entity_name": f"TEST_ExtendedFields_{unique_id}",
            "contact_name": "Extended Fields Test",
            "contact_email": f"extended_{unique_id}@example.com",
            "contact_phone": "+351 912 345 678",
            "country": "PT",
            "source": "website",
            "estimated_volume_usd": 150000,
            "target_asset": "BTC",
            "transaction_type": "buy",
            "trading_frequency": "weekly",  # This is in CreateOTCLeadRequest
            "notes": "High priority lead from referral"
        }
        
        response = api_client.post(f"{BASE_URL}/api/otc/leads", json=lead_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        lead = data["lead"]
        
        # Verify fields are saved
        assert lead["entity_name"] == lead_data["entity_name"]
        assert lead["contact_email"] == lead_data["contact_email"]
        assert lead["trading_frequency"] == "weekly"
        assert lead["status"] == "new"
        
        print(f"Created lead with trading_frequency: {lead['id']}")
        return lead["id"]
    
    def test_create_lead_minimal_fields(self, api_client):
        """POST /api/otc/leads - Create lead with only required fields"""
        unique_id = str(uuid.uuid4())[:8]
        
        lead_data = {
            "entity_name": f"TEST_MinimalFields_{unique_id}",
            "contact_name": "Minimal Test",
            "contact_email": f"minimal_{unique_id}@example.com",
            "country": "PT",
            "source": "referral"
        }
        
        response = api_client.post(f"{BASE_URL}/api/otc/leads", json=lead_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        lead = data["lead"]
        
        assert lead["entity_name"] == lead_data["entity_name"]
        assert lead["status"] == "new"
        print(f"Created minimal lead: {lead['id']}")
    
    def test_get_leads_list(self, api_client):
        """GET /api/otc/leads - List all leads"""
        response = api_client.get(f"{BASE_URL}/api/otc/leads")
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "total" in data
        assert isinstance(data["leads"], list)
        print(f"Found {data['total']} leads")
    
    def test_get_leads_with_status_filter(self, api_client):
        """GET /api/otc/leads?status=new - Filter by status"""
        response = api_client.get(f"{BASE_URL}/api/otc/leads", params={"status": "new"})
        assert response.status_code == 200
        data = response.json()
        for lead in data["leads"]:
            assert lead["status"] == "new"
        print(f"Found {len(data['leads'])} new leads")


class TestLeadPreQualificationWorkflow:
    """Tests for lead pre-qualification workflow"""
    
    @pytest.fixture
    def test_lead(self, api_client):
        """Create a test lead for pre-qualification"""
        unique_id = str(uuid.uuid4())[:8]
        response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_PreQualify_{unique_id}",
            "contact_name": "PreQualify Test",
            "contact_email": f"prequalify_{unique_id}@example.com",
            "country": "PT",
            "source": "website",
            "estimated_volume_usd": 100000
        })
        return response.json()["lead"]["id"]
    
    def test_pre_qualify_lead_positive(self, api_client, test_lead):
        """POST /api/otc/leads/{id}/pre-qualify?qualified=true - Qualify a lead"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{test_lead}/pre-qualify",
            params={
                "qualified": True,
                "volume_per_operation": 50000,
                "current_exchange": "Kraken",
                "problem_to_solve": "Need better liquidity"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "pre_qualified"
        
        # Verify lead status updated
        verify_response = api_client.get(f"{BASE_URL}/api/otc/leads/{test_lead}")
        lead = verify_response.json()
        assert lead["status"] == "pre_qualified"
        print(f"Lead {test_lead} pre-qualified successfully")
    
    def test_pre_qualify_lead_negative(self, api_client):
        """POST /api/otc/leads/{id}/pre-qualify?qualified=false - Mark as not qualified"""
        unique_id = str(uuid.uuid4())[:8]
        # Create a new lead
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_NotQualified_{unique_id}",
            "contact_name": "Not Qualified Test",
            "contact_email": f"notqualified_{unique_id}@example.com",
            "country": "PT",
            "source": "cold_outreach"
        })
        lead_id = create_response.json()["lead"]["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify",
            params={
                "qualified": False,
                "rejection_reason": "Volume too low for OTC"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "not_qualified"
        
        # Verify lead status
        verify_response = api_client.get(f"{BASE_URL}/api/otc/leads/{lead_id}")
        lead = verify_response.json()
        assert lead["status"] == "not_qualified"
        print(f"Lead {lead_id} marked as not qualified")


class TestAdvanceToKYCWorkflow:
    """Tests for Advance to KYC button functionality"""
    
    @pytest.fixture
    def pre_qualified_lead(self, api_client):
        """Create and pre-qualify a lead"""
        unique_id = str(uuid.uuid4())[:8]
        # Create lead
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_KYC_{unique_id}",
            "contact_name": "KYC Test",
            "contact_email": f"kyc_{unique_id}@example.com",
            "country": "PT",
            "source": "website",
            "estimated_volume_usd": 200000
        })
        lead_id = create_response.json()["lead"]["id"]
        
        # Pre-qualify
        api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify",
            params={"qualified": True}
        )
        return lead_id
    
    def test_advance_to_kyc(self, api_client, pre_qualified_lead):
        """POST /api/otc/leads/{id}/advance-to-kyc - Advance pre-qualified lead to KYC"""
        response = api_client.post(f"{BASE_URL}/api/otc/leads/{pre_qualified_lead}/advance-to-kyc")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["lead"]["status"] == "kyc_pending"
        assert "Lead avançado para KYC" in data["message"]
        
        # Verify lead status
        verify_response = api_client.get(f"{BASE_URL}/api/otc/leads/{pre_qualified_lead}")
        lead = verify_response.json()
        assert lead["status"] == "kyc_pending"
        print(f"Lead {pre_qualified_lead} advanced to KYC pending")
    
    def test_advance_to_kyc_wrong_status(self, api_client):
        """Cannot advance to KYC if lead is not pre-qualified"""
        unique_id = str(uuid.uuid4())[:8]
        # Create a new lead (status = new)
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_KYCError_{unique_id}",
            "contact_name": "KYC Error Test",
            "contact_email": f"kycerror_{unique_id}@example.com",
            "country": "PT",
            "source": "website"
        })
        lead_id = create_response.json()["lead"]["id"]
        
        # Try to advance to KYC without pre-qualifying
        response = api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
        assert response.status_code == 400
        assert "pre-qualified" in response.json()["detail"].lower()
        print("Correctly rejected advance to KYC for non-pre-qualified lead")


class TestKYCApprovalWorkflow:
    """Tests for KYC approval workflow"""
    
    @pytest.fixture
    def kyc_pending_lead(self, api_client):
        """Create a lead in KYC pending status"""
        unique_id = str(uuid.uuid4())[:8]
        # Create lead
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_KYCApproval_{unique_id}",
            "contact_name": "KYC Approval Test",
            "contact_email": f"kycapproval_{unique_id}@example.com",
            "country": "PT",
            "source": "website",
            "estimated_volume_usd": 300000
        })
        lead_id = create_response.json()["lead"]["id"]
        
        # Pre-qualify
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify", params={"qualified": True})
        
        # Advance to KYC
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
        
        return lead_id
    
    def test_approve_kyc(self, api_client, kyc_pending_lead):
        """POST /api/otc/leads/{id}/approve-kyc - Approve KYC"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{kyc_pending_lead}/approve-kyc",
            params={"notes": "All documents verified"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["lead"]["status"] == "kyc_approved"
        assert "KYC aprovado" in data["message"]
        
        # Verify lead status and approval timestamp
        verify_response = api_client.get(f"{BASE_URL}/api/otc/leads/{kyc_pending_lead}")
        lead = verify_response.json()
        assert lead["status"] == "kyc_approved"
        assert lead["kyc_approved_at"] is not None
        print(f"Lead {kyc_pending_lead} KYC approved")
    
    def test_reject_kyc(self, api_client):
        """POST /api/otc/leads/{id}/reject-kyc - Reject KYC"""
        unique_id = str(uuid.uuid4())[:8]
        # Create and advance lead to KYC pending
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_KYCReject_{unique_id}",
            "contact_name": "KYC Reject Test",
            "contact_email": f"kycreject_{unique_id}@example.com",
            "country": "PT",
            "source": "website"
        })
        lead_id = create_response.json()["lead"]["id"]
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify", params={"qualified": True})
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
        
        # Reject KYC
        response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/reject-kyc",
            params={"reason": "Documents incomplete"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["lead"]["status"] == "not_qualified"
        
        # Verify rejection reason
        verify_response = api_client.get(f"{BASE_URL}/api/otc/leads/{lead_id}")
        lead = verify_response.json()
        assert "KYC Rejeitado" in lead["rejection_reason"]
        print(f"Lead {lead_id} KYC rejected")


class TestLeadConversionToClient:
    """Tests for lead conversion to OTC client"""
    
    @pytest.fixture
    def kyc_approved_lead(self, api_client):
        """Create a lead with KYC approved status"""
        unique_id = str(uuid.uuid4())[:8]
        # Create lead
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_Convert_{unique_id}",
            "contact_name": "Convert Test",
            "contact_email": f"convert_{unique_id}@example.com",
            "country": "PT",
            "source": "website",
            "estimated_volume_usd": 500000
        })
        lead_id = create_response.json()["lead"]["id"]
        
        # Pre-qualify
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify", params={"qualified": True})
        
        # Advance to KYC
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
        
        # Approve KYC
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/approve-kyc")
        
        return lead_id
    
    def test_convert_lead_to_client(self, api_client, kyc_approved_lead):
        """POST /api/otc/leads/{id}/convert-to-client - Convert approved lead to client"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{kyc_approved_lead}/convert-to-client",
            params={
                "daily_limit_usd": 100000,
                "monthly_limit_usd": 1000000,
                "default_settlement": "sepa"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        client = data["client"]
        
        assert client["lead_id"] == kyc_approved_lead
        assert client["daily_limit_usd"] == 100000
        assert client["monthly_limit_usd"] == 1000000
        assert client["default_settlement_method"] == "sepa"
        assert client["is_active"] is True
        
        # Verify lead status updated
        verify_response = api_client.get(f"{BASE_URL}/api/otc/leads/{kyc_approved_lead}")
        lead = verify_response.json()
        assert lead["status"] == "active_client"
        assert lead["converted_to_client_id"] == client["id"]
        
        print(f"Lead {kyc_approved_lead} converted to client {client['id']}")
        return client["id"]
    
    def test_convert_lead_wrong_status(self, api_client):
        """Cannot convert lead that is not KYC approved"""
        unique_id = str(uuid.uuid4())[:8]
        # Create a new lead (status = new)
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_ConvertError_{unique_id}",
            "contact_name": "Convert Error Test",
            "contact_email": f"converterror_{unique_id}@example.com",
            "country": "PT",
            "source": "website"
        })
        lead_id = create_response.json()["lead"]["id"]
        
        # Try to convert without KYC approval
        response = api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/convert-to-client")
        assert response.status_code == 400
        print("Correctly rejected conversion for non-KYC-approved lead")


class TestClientOTCPortal:
    """Tests for Client OTC Portal endpoints"""
    
    def test_get_client_profile(self, api_client):
        """GET /api/otc/client/me - Get current user's OTC client profile"""
        response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        # This may return 404 if user is not an OTC client, or 200 if they are
        if response.status_code == 200:
            data = response.json()
            assert "entity_name" in data
            assert "daily_limit_usd" in data
            print(f"Client profile: {data['entity_name']}")
        elif response.status_code == 404:
            print("User is not an OTC client (expected for some users)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_get_client_deals(self, api_client):
        """GET /api/otc/client/deals - Get client's deals"""
        # First check if user is an OTC client
        client_response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        if client_response.status_code == 404:
            pytest.skip("User is not an OTC client")
        
        response = api_client.get(f"{BASE_URL}/api/otc/client/deals")
        assert response.status_code == 200
        data = response.json()
        assert "deals" in data
        assert "total" in data
        print(f"Client has {data['total']} deals")
    
    def test_get_client_quotes(self, api_client):
        """GET /api/otc/client/quotes - Get client's quotes"""
        # First check if user is an OTC client
        client_response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        if client_response.status_code == 404:
            pytest.skip("User is not an OTC client")
        
        response = api_client.get(f"{BASE_URL}/api/otc/client/quotes")
        assert response.status_code == 200
        data = response.json()
        assert "quotes" in data
        print(f"Client has {len(data['quotes'])} quotes")


class TestClientRFQCreation:
    """Tests for Client RFQ (Request for Quote) creation"""
    
    def test_create_client_rfq(self, api_client):
        """POST /api/otc/client/rfq - Create RFQ from client portal"""
        # First check if user is an OTC client
        client_response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        if client_response.status_code == 404:
            pytest.skip("User is not an OTC client")
        
        response = api_client.post(
            f"{BASE_URL}/api/otc/client/rfq",
            params={
                "transaction_type": "buy",
                "base_asset": "BTC",
                "quote_asset": "EUR",
                "amount": 1.5,
                "notes": "Test RFQ from client portal"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        deal = data["deal"]
        
        assert deal["transaction_type"] == "buy"
        assert deal["base_asset"] == "BTC"
        assert deal["quote_asset"] == "EUR"
        assert deal["amount"] == 1.5
        assert deal["stage"] == "rfq"
        assert deal["deal_number"].startswith("OTC-")
        
        print(f"Created RFQ: {deal['deal_number']}")
        return deal["id"]
    
    def test_create_client_rfq_sell(self, api_client):
        """POST /api/otc/client/rfq - Create sell RFQ"""
        client_response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        if client_response.status_code == 404:
            pytest.skip("User is not an OTC client")
        
        response = api_client.post(
            f"{BASE_URL}/api/otc/client/rfq",
            params={
                "transaction_type": "sell",
                "base_asset": "ETH",
                "quote_asset": "USD",
                "amount": 10.0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deal"]["transaction_type"] == "sell"
        assert data["deal"]["base_asset"] == "ETH"
        print(f"Created sell RFQ: {data['deal']['deal_number']}")


class TestClientQuoteActions:
    """Tests for client quote accept/reject actions"""
    
    def test_client_accept_quote(self, api_client):
        """POST /api/otc/client/quotes/{id}/accept - Accept quote from client portal"""
        # This test requires an existing quote for the client
        client_response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        if client_response.status_code == 404:
            pytest.skip("User is not an OTC client")
        
        # Get client's quotes
        quotes_response = api_client.get(f"{BASE_URL}/api/otc/client/quotes")
        quotes = quotes_response.json()["quotes"]
        
        # Find a pending quote
        pending_quotes = [q for q in quotes if q["status"] == "sent"]
        if not pending_quotes:
            pytest.skip("No pending quotes to test accept")
        
        quote_id = pending_quotes[0]["id"]
        response = api_client.post(f"{BASE_URL}/api/otc/client/quotes/{quote_id}/accept")
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            print(f"Quote {quote_id} accepted")
        elif response.status_code == 400:
            # Quote may have expired
            print(f"Quote {quote_id} could not be accepted: {response.json()['detail']}")
    
    def test_client_reject_quote(self, api_client):
        """POST /api/otc/client/quotes/{id}/reject - Reject quote from client portal"""
        client_response = api_client.get(f"{BASE_URL}/api/otc/client/me")
        if client_response.status_code == 404:
            pytest.skip("User is not an OTC client")
        
        # Get client's quotes
        quotes_response = api_client.get(f"{BASE_URL}/api/otc/client/quotes")
        quotes = quotes_response.json()["quotes"]
        
        # Find a pending quote
        pending_quotes = [q for q in quotes if q["status"] == "sent"]
        if not pending_quotes:
            pytest.skip("No pending quotes to test reject")
        
        quote_id = pending_quotes[0]["id"]
        response = api_client.post(
            f"{BASE_URL}/api/otc/client/quotes/{quote_id}/reject",
            params={"reason": "Price too high"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            print(f"Quote {quote_id} rejected")
        elif response.status_code == 400:
            print(f"Quote {quote_id} could not be rejected: {response.json()['detail']}")


class TestOTCEnums:
    """Tests for OTC enums endpoint"""
    
    def test_get_enums(self, api_client):
        """GET /api/otc/stats/enums - Get all OTC enums"""
        response = api_client.get(f"{BASE_URL}/api/otc/stats/enums")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected enums are present
        assert "lead_sources" in data
        assert "lead_statuses" in data
        assert "transaction_types" in data
        assert "settlement_methods" in data
        assert "trading_frequencies" in data
        assert "deal_stages" in data
        assert "funding_types" in data
        assert "execution_timeframes" in data
        
        # Verify trading_frequencies includes expected values
        freq_values = [f["value"] for f in data["trading_frequencies"]]
        assert "one_shot" in freq_values  # one_shot, not one_time
        assert "daily" in freq_values
        assert "weekly" in freq_values
        assert "multiple_daily" in freq_values
        
        # Verify execution_timeframes includes expected values
        timeframe_values = [t["value"] for t in data["execution_timeframes"]]
        assert "urgent" in timeframe_values
        assert "within_24h" in timeframe_values
        assert "flexible" in timeframe_values
        
        print(f"All enums verified: {list(data.keys())}")


class TestFullLeadWorkflow:
    """End-to-end test of the complete lead workflow"""
    
    def test_complete_lead_to_client_workflow(self, api_client):
        """Test complete workflow: Create -> Pre-qualify -> KYC -> Convert"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Step 1: Create lead with extended fields
        print("\n=== Step 1: Create Lead ===")
        create_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_FullWorkflow_{unique_id}",
            "contact_name": "Full Workflow Test",
            "contact_email": f"fullworkflow_{unique_id}@example.com",
            "contact_phone": "+351 999 888 777",
            "country": "PT",
            "source": "referral",
            "estimated_volume_usd": 250000,
            "target_asset": "BTC",
            "transaction_type": "buy",
            "trading_frequency": "weekly",
            "volume_per_operation": 75000,
            "execution_timeframe": "within_48h",
            "preferred_settlement_methods": ["sepa"],
            "current_exchange": "Coinbase",
            "problem_to_solve": "Need better rates for recurring purchases"
        })
        assert create_response.status_code == 200
        lead_id = create_response.json()["lead"]["id"]
        print(f"Created lead: {lead_id}")
        
        # Step 2: Pre-qualify
        print("\n=== Step 2: Pre-qualify Lead ===")
        prequalify_response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify",
            params={"qualified": True, "volume_per_operation": 75000}
        )
        assert prequalify_response.status_code == 200
        assert prequalify_response.json()["status"] == "pre_qualified"
        print("Lead pre-qualified")
        
        # Step 3: Advance to KYC
        print("\n=== Step 3: Advance to KYC ===")
        kyc_response = api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/advance-to-kyc")
        assert kyc_response.status_code == 200
        assert kyc_response.json()["lead"]["status"] == "kyc_pending"
        print("Lead advanced to KYC pending")
        
        # Step 4: Approve KYC
        print("\n=== Step 4: Approve KYC ===")
        approve_response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/approve-kyc",
            params={"notes": "All documents verified - full workflow test"}
        )
        assert approve_response.status_code == 200
        assert approve_response.json()["lead"]["status"] == "kyc_approved"
        print("KYC approved")
        
        # Step 5: Convert to client
        print("\n=== Step 5: Convert to Client ===")
        convert_response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/convert-to-client",
            params={
                "daily_limit_usd": 100000,
                "monthly_limit_usd": 500000,
                "default_settlement": "sepa"
            }
        )
        assert convert_response.status_code == 200
        client = convert_response.json()["client"]
        print(f"Converted to client: {client['id']}")
        
        # Verify final state
        final_lead = api_client.get(f"{BASE_URL}/api/otc/leads/{lead_id}").json()
        assert final_lead["status"] == "active_client"
        assert final_lead["converted_to_client_id"] == client["id"]
        
        print("\n=== Full Workflow Complete ===")
        print(f"Lead {lead_id} -> Client {client['id']}")
