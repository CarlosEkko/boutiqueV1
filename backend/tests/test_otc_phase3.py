"""
OTC Phase 3 - Settlement & Invoicing Tests
Tests for the settlement (liquidação) and invoicing (faturação) workflow
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carlos@kryptobox.io"
TEST_PASSWORD = "senha123"


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


@pytest.fixture(scope="module")
def test_data(api_client):
    """Create test data for settlement/invoice flow"""
    data = {}
    unique_id = str(uuid.uuid4())[:8]
    
    # 1. Create a test lead
    lead_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
        "entity_name": f"TEST_Settlement_Company_{unique_id}",
        "contact_name": "Test Settlement Contact",
        "contact_email": f"test_settlement_{unique_id}@example.com",
        "country": "PT",
        "source": "website",
        "estimated_volume_usd": 100000,
        "target_asset": "BTC",
        "transaction_type": "buy"
    })
    assert lead_response.status_code == 200
    data["lead_id"] = lead_response.json()["lead"]["id"]
    
    # 2. Pre-qualify the lead
    prequalify_response = api_client.post(
        f"{BASE_URL}/api/otc/leads/{data['lead_id']}/pre-qualify",
        params={"qualified": True, "volume_per_operation": 50000}
    )
    assert prequalify_response.status_code == 200
    
    # 3. Convert to client
    convert_response = api_client.post(
        f"{BASE_URL}/api/otc/leads/{data['lead_id']}/convert-to-client",
        params={"daily_limit_usd": 100000, "monthly_limit_usd": 500000, "default_settlement": "sepa"}
    )
    assert convert_response.status_code == 200
    data["client_id"] = convert_response.json()["client"]["id"]
    
    # 4. Create a deal
    deal_response = api_client.post(f"{BASE_URL}/api/otc/deals", json={
        "client_id": data["client_id"],
        "transaction_type": "buy",
        "base_asset": "BTC",
        "quote_asset": "EUR",
        "amount": 0.5,
        "settlement_method": "sepa"
    })
    assert deal_response.status_code == 200
    data["deal_id"] = deal_response.json()["deal"]["id"]
    data["deal_number"] = deal_response.json()["deal"]["deal_number"]
    
    # 5. Create a quote
    quote_response = api_client.post(f"{BASE_URL}/api/otc/quotes", json={
        "deal_id": data["deal_id"],
        "market_price": 60000,
        "spread_percent": 1.5,
        "fees": 50,
        "valid_for_minutes": 30,
        "is_manual": True
    })
    assert quote_response.status_code == 200
    data["quote_id"] = quote_response.json()["quote"]["id"]
    
    # 6. Accept the quote
    accept_response = api_client.post(f"{BASE_URL}/api/otc/quotes/{data['quote_id']}/accept")
    assert accept_response.status_code == 200
    
    # 7. Start execution
    exec_response = api_client.post(f"{BASE_URL}/api/otc/deals/{data['deal_id']}/start-execution")
    assert exec_response.status_code == 200
    data["execution_id"] = exec_response.json()["execution"]["id"]
    
    # 8. Confirm funds
    confirm_response = api_client.post(
        f"{BASE_URL}/api/otc/executions/{data['execution_id']}/confirm-funds",
        params={"amount": 30450, "tx_hash": "SEPA-TEST-123"}
    )
    assert confirm_response.status_code == 200
    
    # 9. Complete execution (moves to settlement stage)
    complete_response = api_client.post(
        f"{BASE_URL}/api/otc/executions/{data['execution_id']}/complete",
        params={"executed_price": 60900}
    )
    assert complete_response.status_code == 200
    
    yield data
    
    # Cleanup is optional - test data prefixed with TEST_


class TestSettlementEndpoints:
    """Tests for Settlement (Liquidação) endpoints"""
    
    def test_list_settlements(self, api_client):
        """GET /api/otc/settlements - List all settlements"""
        response = api_client.get(f"{BASE_URL}/api/otc/settlements")
        assert response.status_code == 200
        data = response.json()
        assert "settlements" in data
        assert "total" in data
        assert isinstance(data["settlements"], list)
        print(f"Found {data['total']} settlements")
    
    def test_list_settlements_with_status_filter(self, api_client):
        """GET /api/otc/settlements?status=pending - Filter by status"""
        response = api_client.get(f"{BASE_URL}/api/otc/settlements", params={"status": "pending"})
        assert response.status_code == 200
        data = response.json()
        assert "settlements" in data
        # All returned settlements should have pending status
        for settlement in data["settlements"]:
            assert settlement.get("status") == "pending"
        print(f"Found {len(data['settlements'])} pending settlements")
    
    def test_list_settlements_with_completed_filter(self, api_client):
        """GET /api/otc/settlements?status=completed - Filter completed"""
        response = api_client.get(f"{BASE_URL}/api/otc/settlements", params={"status": "completed"})
        assert response.status_code == 200
        data = response.json()
        assert "settlements" in data
        for settlement in data["settlements"]:
            assert settlement.get("status") == "completed"
        print(f"Found {len(data['settlements'])} completed settlements")
    
    def test_create_settlement(self, api_client, test_data):
        """POST /api/otc/settlements - Create settlement with method selection"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/settlements",
            params={
                "deal_id": test_data["deal_id"],
                "method": "sepa",
                "fiat_amount": 30450,
                "fiat_currency": "EUR"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "settlement" in data
        settlement = data["settlement"]
        assert settlement["deal_id"] == test_data["deal_id"]
        assert settlement["method"] == "sepa"
        assert settlement["status"] == "pending"
        test_data["settlement_id"] = settlement["id"]
        print(f"Created settlement: {settlement['id']}")
    
    def test_get_settlement_details(self, api_client, test_data):
        """GET /api/otc/settlements/{id} - Get settlement details"""
        response = api_client.get(f"{BASE_URL}/api/otc/settlements/{test_data['settlement_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["settlement_id"]
        assert data["deal_id"] == test_data["deal_id"]
        assert "deal" in data  # Should include enriched deal info
        print(f"Settlement details: method={data['method']}, status={data['status']}")
    
    def test_confirm_fiat_settlement(self, api_client, test_data):
        """POST /api/otc/settlements/{id}/confirm-fiat - Confirm fiat with bank reference"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/settlements/{test_data['settlement_id']}/confirm-fiat",
            params={
                "bank_reference": "SEPA-REF-2026-001",
                "amount": 30450
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify settlement status updated
        verify_response = api_client.get(f"{BASE_URL}/api/otc/settlements/{test_data['settlement_id']}")
        assert verify_response.status_code == 200
        settlement = verify_response.json()
        assert settlement["status"] == "in_progress"
        assert settlement["bank_reference"] == "SEPA-REF-2026-001"
        print(f"Fiat settlement confirmed with reference: {settlement['bank_reference']}")
    
    def test_complete_settlement(self, api_client, test_data):
        """POST /api/otc/settlements/{id}/complete - Complete settlement and move to invoice"""
        response = api_client.post(f"{BASE_URL}/api/otc/settlements/{test_data['settlement_id']}/complete")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify settlement is completed
        verify_response = api_client.get(f"{BASE_URL}/api/otc/settlements/{test_data['settlement_id']}")
        assert verify_response.status_code == 200
        settlement = verify_response.json()
        assert settlement["status"] == "completed"
        assert settlement["confirmed_at"] is not None
        
        # Verify deal moved to invoice stage
        deal_response = api_client.get(f"{BASE_URL}/api/otc/deals/{test_data['deal_id']}")
        assert deal_response.status_code == 200
        deal = deal_response.json()["deal"]
        assert deal["stage"] == "invoice"
        print(f"Settlement completed, deal moved to invoice stage")


class TestCryptoSettlement:
    """Tests for crypto on-chain settlement"""
    
    def test_create_crypto_settlement(self, api_client):
        """Create a settlement with crypto on-chain method"""
        # First create a new deal for crypto settlement test
        unique_id = str(uuid.uuid4())[:8]
        
        # Create lead
        lead_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_CryptoSettlement_{unique_id}",
            "contact_name": "Crypto Test",
            "contact_email": f"crypto_test_{unique_id}@example.com",
            "country": "PT",
            "source": "website",
            "estimated_volume_usd": 50000,
            "target_asset": "USDT",
            "transaction_type": "sell"
        })
        assert lead_response.status_code == 200
        lead_id = lead_response.json()["lead"]["id"]
        
        # Pre-qualify
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify", params={"qualified": True})
        
        # Convert to client
        convert_response = api_client.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/convert-to-client",
            params={"default_settlement": "usdt_onchain"}
        )
        client_id = convert_response.json()["client"]["id"]
        
        # Create deal
        deal_response = api_client.post(f"{BASE_URL}/api/otc/deals", json={
            "client_id": client_id,
            "transaction_type": "sell",
            "base_asset": "BTC",
            "quote_asset": "USDT",
            "amount": 0.1,
            "settlement_method": "usdt_onchain"
        })
        deal_id = deal_response.json()["deal"]["id"]
        
        # Create quote
        quote_response = api_client.post(f"{BASE_URL}/api/otc/quotes", json={
            "deal_id": deal_id,
            "market_price": 60000,
            "spread_percent": 1.0,
            "fees": 10,
            "valid_for_minutes": 30,
            "is_manual": True
        })
        quote_id = quote_response.json()["quote"]["id"]
        
        # Accept quote
        api_client.post(f"{BASE_URL}/api/otc/quotes/{quote_id}/accept")
        
        # Start execution
        exec_response = api_client.post(f"{BASE_URL}/api/otc/deals/{deal_id}/start-execution")
        execution_id = exec_response.json()["execution"]["id"]
        
        # Confirm funds and complete
        api_client.post(f"{BASE_URL}/api/otc/executions/{execution_id}/confirm-funds", params={"amount": 0.1})
        api_client.post(f"{BASE_URL}/api/otc/executions/{execution_id}/complete", params={"executed_price": 59400})
        
        # Create crypto settlement
        settlement_response = api_client.post(
            f"{BASE_URL}/api/otc/settlements",
            params={
                "deal_id": deal_id,
                "method": "usdt_onchain",
                "crypto_amount": 5940,
                "crypto_asset": "USDT"
            }
        )
        assert settlement_response.status_code == 200
        settlement = settlement_response.json()["settlement"]
        assert settlement["method"] == "usdt_onchain"
        print(f"Created crypto settlement: {settlement['id']}")
        
        # Confirm crypto settlement with tx hash
        confirm_response = api_client.post(
            f"{BASE_URL}/api/otc/settlements/{settlement['id']}/confirm-crypto",
            params={
                "tx_hash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "amount": 5940,
                "network": "ERC20"
            }
        )
        assert confirm_response.status_code == 200
        
        # Verify
        verify_response = api_client.get(f"{BASE_URL}/api/otc/settlements/{settlement['id']}")
        settlement = verify_response.json()
        assert settlement["status"] == "in_progress"
        assert settlement["tx_hash"] is not None
        assert settlement["network"] == "ERC20"
        print(f"Crypto settlement confirmed with tx_hash: {settlement['tx_hash'][:20]}...")


class TestInvoiceEndpoints:
    """Tests for Invoice (Faturação) endpoints"""
    
    def test_list_invoices(self, api_client):
        """GET /api/otc/invoices - List all invoices"""
        response = api_client.get(f"{BASE_URL}/api/otc/invoices")
        assert response.status_code == 200
        data = response.json()
        assert "invoices" in data
        assert "total" in data
        assert isinstance(data["invoices"], list)
        print(f"Found {data['total']} invoices")
    
    def test_list_invoices_by_status(self, api_client):
        """GET /api/otc/invoices?status=draft - Filter by status"""
        for status in ["draft", "sent", "paid"]:
            response = api_client.get(f"{BASE_URL}/api/otc/invoices", params={"status": status})
            assert response.status_code == 200
            data = response.json()
            for invoice in data["invoices"]:
                assert invoice.get("status") == status
            print(f"Found {len(data['invoices'])} {status} invoices")
    
    def test_create_invoice(self, api_client, test_data):
        """POST /api/otc/invoices - Create invoice from deal"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/invoices",
            params={
                "deal_id": test_data["deal_id"],
                "notes": "Test invoice for settlement testing"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "invoice" in data
        invoice = data["invoice"]
        
        # Verify invoice number format (INV-YYYY-XXXXX)
        assert invoice["invoice_number"].startswith("INV-")
        assert invoice["deal_id"] == test_data["deal_id"]
        assert invoice["status"] == "draft"
        assert invoice["base_asset"] == "BTC"
        assert invoice["quote_asset"] == "EUR"
        assert invoice["amount"] == 0.5
        assert invoice["total"] > 0
        
        test_data["invoice_id"] = invoice["id"]
        test_data["invoice_number"] = invoice["invoice_number"]
        print(f"Created invoice: {invoice['invoice_number']} - Total: ${invoice['total']}")
    
    def test_get_invoice_details(self, api_client, test_data):
        """GET /api/otc/invoices/{id} - Get invoice details"""
        response = api_client.get(f"{BASE_URL}/api/otc/invoices/{test_data['invoice_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_data["invoice_id"]
        assert data["invoice_number"] == test_data["invoice_number"]
        assert "deal" in data  # Should include enriched deal info
        assert data["client_name"] is not None
        print(f"Invoice details: {data['invoice_number']} - Client: {data['client_name']}")
    
    def test_send_invoice(self, api_client, test_data):
        """POST /api/otc/invoices/{id}/send - Mark invoice as sent"""
        response = api_client.post(f"{BASE_URL}/api/otc/invoices/{test_data['invoice_id']}/send")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify status updated
        verify_response = api_client.get(f"{BASE_URL}/api/otc/invoices/{test_data['invoice_id']}")
        invoice = verify_response.json()
        assert invoice["status"] == "sent"
        assert invoice["sent_at"] is not None
        print(f"Invoice {invoice['invoice_number']} marked as sent")
    
    def test_mark_invoice_paid(self, api_client, test_data):
        """POST /api/otc/invoices/{id}/mark-paid - Mark as paid and complete deal"""
        response = api_client.post(
            f"{BASE_URL}/api/otc/invoices/{test_data['invoice_id']}/mark-paid",
            params={"payment_reference": "TRF-2026-001-TEST"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify invoice is paid
        verify_response = api_client.get(f"{BASE_URL}/api/otc/invoices/{test_data['invoice_id']}")
        invoice = verify_response.json()
        assert invoice["status"] == "paid"
        assert invoice["paid_at"] is not None
        assert invoice["payment_reference"] == "TRF-2026-001-TEST"
        
        # Verify deal is completed
        deal_response = api_client.get(f"{BASE_URL}/api/otc/deals/{test_data['deal_id']}")
        deal = deal_response.json()["deal"]
        assert deal["stage"] == "completed"
        print(f"Invoice {invoice['invoice_number']} paid, deal completed!")


class TestSettlementMethods:
    """Tests for different settlement methods"""
    
    def test_settlement_methods_available(self, api_client):
        """Verify all settlement methods are available in enums"""
        response = api_client.get(f"{BASE_URL}/api/otc/stats/enums")
        assert response.status_code == 200
        data = response.json()
        
        settlement_methods = [m["value"] for m in data["settlement_methods"]]
        expected_methods = ["sepa", "swift", "pix", "faster_payments", 
                          "usdt_onchain", "usdc_onchain", "crypto_onchain", "internal"]
        
        for method in expected_methods:
            assert method in settlement_methods, f"Missing settlement method: {method}"
        print(f"All settlement methods available: {settlement_methods}")


class TestErrorHandling:
    """Tests for error handling in settlement/invoice flow"""
    
    def test_create_settlement_wrong_stage(self, api_client):
        """Cannot create settlement for deal not in settlement stage"""
        # Create a deal that's not in settlement stage
        unique_id = str(uuid.uuid4())[:8]
        
        lead_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_ErrorHandling_{unique_id}",
            "contact_name": "Error Test",
            "contact_email": f"error_test_{unique_id}@example.com",
            "country": "PT",
            "source": "website"
        })
        lead_id = lead_response.json()["lead"]["id"]
        
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify", params={"qualified": True})
        convert_response = api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/convert-to-client")
        client_id = convert_response.json()["client"]["id"]
        
        deal_response = api_client.post(f"{BASE_URL}/api/otc/deals", json={
            "client_id": client_id,
            "transaction_type": "buy",
            "base_asset": "BTC",
            "quote_asset": "EUR",
            "amount": 0.1
        })
        deal_id = deal_response.json()["deal"]["id"]
        
        # Try to create settlement (deal is in RFQ stage, not settlement)
        response = api_client.post(
            f"{BASE_URL}/api/otc/settlements",
            params={"deal_id": deal_id, "method": "sepa"}
        )
        assert response.status_code == 400
        assert "settlement stage" in response.json()["detail"].lower()
        print("Correctly rejected settlement for deal not in settlement stage")
    
    def test_create_invoice_wrong_stage(self, api_client):
        """Cannot create invoice for deal not in invoice stage"""
        unique_id = str(uuid.uuid4())[:8]
        
        lead_response = api_client.post(f"{BASE_URL}/api/otc/leads", json={
            "entity_name": f"TEST_InvoiceError_{unique_id}",
            "contact_name": "Invoice Error Test",
            "contact_email": f"invoice_error_{unique_id}@example.com",
            "country": "PT",
            "source": "website"
        })
        lead_id = lead_response.json()["lead"]["id"]
        
        api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/pre-qualify", params={"qualified": True})
        convert_response = api_client.post(f"{BASE_URL}/api/otc/leads/{lead_id}/convert-to-client")
        client_id = convert_response.json()["client"]["id"]
        
        deal_response = api_client.post(f"{BASE_URL}/api/otc/deals", json={
            "client_id": client_id,
            "transaction_type": "buy",
            "base_asset": "ETH",
            "quote_asset": "EUR",
            "amount": 1.0
        })
        deal_id = deal_response.json()["deal"]["id"]
        
        # Try to create invoice (deal is in RFQ stage, not invoice)
        response = api_client.post(
            f"{BASE_URL}/api/otc/invoices",
            params={"deal_id": deal_id}
        )
        assert response.status_code == 400
        assert "invoice stage" in response.json()["detail"].lower()
        print("Correctly rejected invoice for deal not in invoice stage")
    
    def test_get_nonexistent_settlement(self, api_client):
        """GET /api/otc/settlements/{id} - 404 for non-existent"""
        response = api_client.get(f"{BASE_URL}/api/otc/settlements/nonexistent-id-12345")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent settlement")
    
    def test_get_nonexistent_invoice(self, api_client):
        """GET /api/otc/invoices/{id} - 404 for non-existent"""
        response = api_client.get(f"{BASE_URL}/api/otc/invoices/nonexistent-id-12345")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent invoice")


class TestInvoiceNumberGeneration:
    """Tests for invoice number auto-generation"""
    
    def test_invoice_number_format(self, api_client):
        """Verify invoice numbers follow INV-YYYY-XXXXX format"""
        response = api_client.get(f"{BASE_URL}/api/otc/invoices")
        assert response.status_code == 200
        invoices = response.json()["invoices"]
        
        current_year = datetime.now().year
        for invoice in invoices:
            inv_num = invoice["invoice_number"]
            assert inv_num.startswith(f"INV-{current_year}-"), f"Invalid format: {inv_num}"
            # Check the number part is 5 digits
            number_part = inv_num.split("-")[-1]
            assert len(number_part) == 5, f"Number part should be 5 digits: {inv_num}"
            assert number_part.isdigit(), f"Number part should be digits: {inv_num}"
        print(f"All {len(invoices)} invoices have correct format")


class TestDealEnrichment:
    """Tests for deal enrichment in settlements/invoices"""
    
    def test_settlement_includes_deal_info(self, api_client):
        """Settlements list should include deal info"""
        response = api_client.get(f"{BASE_URL}/api/otc/settlements")
        assert response.status_code == 200
        settlements = response.json()["settlements"]
        
        for settlement in settlements:
            # Should have enriched deal info
            assert "deal_number" in settlement or settlement.get("deal_id")
            if "deal_number" in settlement:
                assert settlement["deal_number"].startswith("OTC-")
        print("Settlements include deal enrichment")
    
    def test_invoice_includes_deal_info(self, api_client):
        """Invoice details should include deal info"""
        response = api_client.get(f"{BASE_URL}/api/otc/invoices")
        assert response.status_code == 200
        invoices = response.json()["invoices"]
        
        if invoices:
            # Get details of first invoice
            detail_response = api_client.get(f"{BASE_URL}/api/otc/invoices/{invoices[0]['id']}")
            assert detail_response.status_code == 200
            invoice = detail_response.json()
            assert "deal" in invoice
            assert invoice["deal"]["deal_number"].startswith("OTC-")
        print("Invoice details include deal enrichment")
