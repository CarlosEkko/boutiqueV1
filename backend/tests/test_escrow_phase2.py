"""
Escrow Phase 2 Tests - KBEX Exchange
Tests for: Settlement Engine DvP, Advanced Fee Engine with volume tiers,
Compliance Gating, Deposit management with auto-advance, Whitelist addresses,
Fee Revenue Ledger
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


@pytest.fixture(scope="module")
def auth_session():
    """Module-scoped auth session to avoid rate limiting"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login once for all tests
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_res.status_code == 429:
        # Wait for rate limit to clear
        time.sleep(65)
        login_res = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
    
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json().get("access_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    yield session
    
    # Cleanup - delete TEST_ prefixed deals
    try:
        deals_res = session.get(f"{BASE_URL}/api/escrow/deals?limit=100")
        if deals_res.status_code == 200:
            for deal in deals_res.json().get("deals", []):
                if deal.get("buyer", {}).get("name", "").startswith("TEST_"):
                    if deal.get("status") == "draft":
                        session.delete(f"{BASE_URL}/api/escrow/deals/{deal['id']}")
    except:
        pass


class TestVolumeTiers:
    """Volume tier discount tests"""
    
    def test_get_volume_tiers(self, auth_session):
        """GET /api/escrow/volume-tiers returns 5 volume discount tiers"""
        res = auth_session.get(f"{BASE_URL}/api/escrow/volume-tiers")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        data = res.json()
        assert "tiers" in data
        tiers = data["tiers"]
        assert len(tiers) == 5, f"Expected 5 tiers, got {len(tiers)}"
        
        # Verify tier structure
        expected_discounts = [0.0, 0.10, 0.20, 0.30, 0.40]
        for i, tier in enumerate(tiers):
            assert tier["discount"] == expected_discounts[i], f"Tier {i+1} discount mismatch"
        
        print(f"✓ Volume tiers verified: {len(tiers)} tiers")

    def test_volume_discount_tier1_no_discount(self, auth_session):
        """Create deal with $50K ticket - should have 0% volume discount"""
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_Tier1_Buyer", "email": "tier1buyer@test.com"},
            "seller": {"name": "TEST_Tier1_Seller", "email": "tier1seller@test.com"},
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        assert res.status_code == 200
        
        deal = res.json()["deal"]
        assert deal["ticket_size"] == 50000.0
        assert deal["volume_discount_pct"] == 0.0, "Tier 1 should have 0% discount"
        assert deal["volume_discount"] == 0.0
        
        # Standard fee: 0.5% of $50K = $250
        expected_fee = 50000 * 0.005
        assert deal["fee_total"] == expected_fee, f"Expected fee {expected_fee}, got {deal['fee_total']}"
        
        print(f"✓ Tier 1 ($50K): 0% discount, fee=${deal['fee_total']}")

    def test_volume_discount_tier2_10_percent(self, auth_session):
        """Create deal with $200K ticket - should have 10% volume discount"""
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 4.0,
            "quantity_b": 200000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_Tier2_Buyer", "email": "tier2buyer@test.com"},
            "seller": {"name": "TEST_Tier2_Seller", "email": "tier2seller@test.com"},
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        assert res.status_code == 200
        
        deal = res.json()["deal"]
        assert deal["ticket_size"] == 200000.0
        assert deal["volume_discount_pct"] == 0.10, "Tier 2 should have 10% discount"
        
        # Standard fee: 0.5% of $200K = $1000, minus 10% = $900
        calculated_fee = 200000 * 0.005
        expected_discount = calculated_fee * 0.10
        expected_fee = calculated_fee - expected_discount
        
        assert deal["volume_discount"] == expected_discount, f"Expected discount {expected_discount}"
        assert deal["fee_total"] == expected_fee, f"Expected fee {expected_fee}"
        
        print(f"✓ Tier 2 ($200K): 10% discount (-${deal['volume_discount']}), fee=${deal['fee_total']}")

    def test_volume_discount_tier3_20_percent(self, auth_session):
        """Create deal with $750K ticket - should have 20% volume discount"""
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 15.0,
            "quantity_b": 750000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_Tier3_Buyer", "email": "tier3buyer@test.com"},
            "seller": {"name": "TEST_Tier3_Seller", "email": "tier3seller@test.com"},
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        assert res.status_code == 200
        
        deal = res.json()["deal"]
        assert deal["ticket_size"] == 750000.0
        assert deal["volume_discount_pct"] == 0.20, "Tier 3 should have 20% discount"
        
        print(f"✓ Tier 3 ($750K): 20% discount (-${deal['volume_discount']}), fee=${deal['fee_total']}")

    def test_volume_discount_tier4_30_percent(self, auth_session):
        """Create deal with $2M ticket - should have 30% volume discount"""
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 40.0,
            "quantity_b": 2000000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_Tier4_Buyer", "email": "tier4buyer@test.com"},
            "seller": {"name": "TEST_Tier4_Seller", "email": "tier4seller@test.com"},
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        assert res.status_code == 200
        
        deal = res.json()["deal"]
        assert deal["ticket_size"] == 2000000.0
        assert deal["volume_discount_pct"] == 0.30, "Tier 4 should have 30% discount"
        
        print(f"✓ Tier 4 ($2M): 30% discount (-${deal['volume_discount']}), fee=${deal['fee_total']}")

    def test_volume_discount_tier5_40_percent(self, auth_session):
        """Create deal with $10M ticket - should have 40% volume discount"""
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 200.0,
            "quantity_b": 10000000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_Tier5_Buyer", "email": "tier5buyer@test.com"},
            "seller": {"name": "TEST_Tier5_Seller", "email": "tier5seller@test.com"},
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        assert res.status_code == 200
        
        deal = res.json()["deal"]
        assert deal["ticket_size"] == 10000000.0
        assert deal["volume_discount_pct"] == 0.40, "Tier 5 should have 40% discount"
        
        print(f"✓ Tier 5 ($10M): 40% discount (-${deal['volume_discount']}), fee=${deal['fee_total']}")


class TestDepositManagement:
    """Deposit registration and confirmation tests"""
    
    def test_register_buyer_deposit(self, auth_session):
        """POST /api/escrow/deals/{id}/deposit - register buyer deposit with tx_hash"""
        # Create deal first
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_DepBuyer", "email": "depbuyer@test.com"},
            "seller": {"name": "TEST_DepSeller", "email": "depseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        assert create_res.status_code == 200
        deal_id = create_res.json()["deal"]["id"]
        
        # Register buyer deposit
        deposit_data = {
            "party": "buyer",
            "amount": 50000.0,
            "asset": "USDT",
            "tx_hash": "0xabc123def456789",
            "source_address": "0x1234567890abcdef",
            "notes": "Test buyer deposit"
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json=deposit_data)
        assert res.status_code == 200
        
        data = res.json()
        assert data["success"] is True
        assert "deposit_id" in data
        
        # Verify deal updated
        deal = data["deal"]
        assert deal["status"] == "awaiting_deposit", "Should auto-advance to awaiting_deposit"
        assert len(deal["deposits"]) == 1
        
        deposit = deal["deposits"][0]
        assert deposit["party"] == "buyer"
        assert deposit["amount"] == 50000.0
        assert deposit["tx_hash"] == "0xabc123def456789"
        assert deposit["source_address"] == "0x1234567890abcdef"
        assert deposit["confirmed"] is False
        
        print(f"✓ Buyer deposit registered: {deposit['amount']} {deposit['asset']}")

    def test_register_seller_deposit(self, auth_session):
        """POST /api/escrow/deals/{id}/deposit - register seller deposit"""
        # Create deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_SellerDepBuyer", "email": "sdepbuyer@test.com"},
            "seller": {"name": "TEST_SellerDepSeller", "email": "sdepseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Register seller deposit
        deposit_data = {
            "party": "seller",
            "amount": 1.0,
            "asset": "BTC",
            "tx_hash": "0xseller123hash",
            "source_address": "bc1qseller123"
        }
        
        res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json=deposit_data)
        assert res.status_code == 200
        
        deal = res.json()["deal"]
        assert len(deal["deposits"]) == 1
        assert deal["deposits"][0]["party"] == "seller"
        
        print(f"✓ Seller deposit registered")

    def test_confirm_deposit(self, auth_session):
        """POST /api/escrow/deals/{id}/confirm-deposit - confirm a deposit"""
        # Create deal and register deposit
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_ConfirmBuyer", "email": "confbuyer@test.com"},
            "seller": {"name": "TEST_ConfirmSeller", "email": "confseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Register deposit
        deposit_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer",
            "amount": 50000.0,
            "asset": "USDT"
        })
        deposit_id = deposit_res.json()["deposit_id"]
        
        # Confirm deposit
        confirm_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": deposit_id,
            "confirmed": True,
            "notes": "Verified on blockchain"
        })
        
        assert confirm_res.status_code == 200
        deal = confirm_res.json()["deal"]
        
        # Find the confirmed deposit
        confirmed_dep = next((d for d in deal["deposits"] if d["id"] == deposit_id), None)
        assert confirmed_dep is not None
        assert confirmed_dep["confirmed"] is True
        assert confirmed_dep["confirmed_by"] == ADMIN_EMAIL
        
        print(f"✓ Deposit confirmed by {confirmed_dep['confirmed_by']}")

    def test_auto_advance_two_sided_both_confirmed(self, auth_session):
        """Two-sided escrow auto-advances to funded when both deposits confirmed"""
        # Create two-sided deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_AutoAdvBuyer", "email": "autoadvbuyer@test.com"},
            "seller": {"name": "TEST_AutoAdvSeller", "email": "autoadvseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Register and confirm buyer deposit
        buyer_dep = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        buyer_dep_id = buyer_dep.json()["deposit_id"]
        
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": buyer_dep_id, "confirmed": True
        })
        
        # Check status - should still be awaiting_deposit (need seller too)
        deal_res = auth_session.get(f"{BASE_URL}/api/escrow/deals/{deal_id}")
        assert deal_res.json()["status"] == "awaiting_deposit"
        
        # Register and confirm seller deposit
        seller_dep = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "seller", "amount": 1.0, "asset": "BTC"
        })
        seller_dep_id = seller_dep.json()["deposit_id"]
        
        confirm_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": seller_dep_id, "confirmed": True
        })
        
        # Should auto-advance to funded
        deal = confirm_res.json()["deal"]
        assert deal["status"] == "funded", f"Expected 'funded', got '{deal['status']}'"
        assert deal["custody"]["locked"] is True
        assert deal["custody"]["buyer_deposited"] is True
        assert deal["custody"]["seller_deposited"] is True
        
        print(f"✓ Two-sided auto-advanced to funded after both deposits confirmed")

    def test_auto_advance_one_sided_single_deposit(self, auth_session):
        """One-sided escrow auto-advances to funded with single deposit"""
        # Create one-sided deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "buyer",
            "buyer": {"name": "TEST_OneSideBuyer", "email": "onesidebuyer@test.com"},
            "seller": {"name": "TEST_OneSideSeller", "email": "onesideseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Register and confirm single deposit
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        dep_id = dep_res.json()["deposit_id"]
        
        confirm_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_id, "confirmed": True
        })
        
        # Should auto-advance to funded with just one deposit
        deal = confirm_res.json()["deal"]
        assert deal["status"] == "funded", f"One-sided should be funded, got '{deal['status']}'"
        
        print(f"✓ One-sided auto-advanced to funded with single deposit")


class TestComplianceGating:
    """Compliance gate tests"""
    
    def test_compliance_gate_blocks_advance_to_ready(self, auth_session):
        """Compliance gate blocks advance to ready_for_settlement if not all approved"""
        # Create and fund a deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_CompGateBuyer", "email": "compgatebuyer@test.com"},
            "seller": {"name": "TEST_CompGateSeller", "email": "compgateseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Fund the deal
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_res.json()["deposit_id"], "confirmed": True
        })
        
        # Advance to in_verification
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "in_verification"
        })
        
        # Try to advance to ready_for_settlement without compliance approval
        advance_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "ready_for_settlement"
        })
        
        assert advance_res.status_code == 400
        assert "compliance" in advance_res.json()["detail"].lower()
        
        print(f"✓ Compliance gate blocked advance: {advance_res.json()['detail']}")

    def test_compliance_gate_allows_after_all_approved(self, auth_session):
        """Compliance gate allows advance after all 4 checks approved"""
        # Create and fund a deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_CompPassBuyer", "email": "comppassbuyer@test.com"},
            "seller": {"name": "TEST_CompPassSeller", "email": "comppassseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Fund the deal
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_res.json()["deposit_id"], "confirmed": True
        })
        
        # Advance to in_verification
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "in_verification"
        })
        
        # Approve all compliance checks
        auth_session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/compliance", json={
            "buyer_kyc": "approved",
            "seller_kyc": "approved",
            "aml_check": "approved",
            "source_of_funds": "approved"
        })
        
        # Now advance should work
        advance_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "ready_for_settlement"
        })
        
        assert advance_res.status_code == 200
        assert advance_res.json()["deal"]["status"] == "ready_for_settlement"
        
        print(f"✓ Compliance gate passed after all approvals")


class TestSettlementDvP:
    """Settlement DvP tests"""
    
    def test_settle_dvp_creates_fee_ledger_entry(self, auth_session):
        """POST /api/escrow/deals/{id}/settle executes DvP and creates fee_ledger entry"""
        # Create, fund, and prepare deal for settlement
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_SettleBuyer", "email": "settlebuyer@test.com"},
            "seller": {"name": "TEST_SettleSeller", "email": "settleseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        deal_number = create_res.json()["deal"]["deal_id"]
        
        # Fund
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_res.json()["deposit_id"], "confirmed": True
        })
        
        # Advance through states
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={"new_status": "in_verification"})
        
        # Approve compliance
        auth_session.put(f"{BASE_URL}/api/escrow/deals/{deal_id}/compliance", json={
            "buyer_kyc": "approved", "seller_kyc": "approved",
            "aml_check": "approved", "source_of_funds": "approved"
        })
        
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={"new_status": "ready_for_settlement"})
        
        # Execute settlement
        settle_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/settle", json={
            "buyer_destination": "0xbuyer_wallet_123",
            "seller_destination": "bc1qseller_wallet_456",
            "notes": "Test DvP settlement"
        })
        
        assert settle_res.status_code == 200
        data = settle_res.json()
        
        assert data["success"] is True
        assert data["deal"]["status"] == "settled"
        assert data["deal"]["settlement"] is not None
        assert "fee_invoice" in data
        
        # Verify settlement record
        settlement = data["deal"]["settlement"]
        assert settlement["asset_a"] == "BTC"
        assert settlement["quantity_a"] == 1.0
        assert settlement["buyer_destination"] == "0xbuyer_wallet_123"
        assert settlement["seller_destination"] == "bc1qseller_wallet_456"
        
        # Verify fee invoice
        fee_invoice = data["fee_invoice"]
        assert fee_invoice["deal_id"] == deal_number
        assert fee_invoice["fee_total"] == 250.0  # 0.5% of $50K
        
        print(f"✓ DvP Settlement executed: {deal_number}, fee=${fee_invoice['fee_total']}")

    def test_settle_blocked_without_compliance(self, auth_session):
        """Settlement blocked if compliance not approved"""
        # Create and fund deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_NoCompBuyer", "email": "nocompbuyer@test.com"},
            "seller": {"name": "TEST_NoCompSeller", "email": "nocompseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Fund
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_res.json()["deposit_id"], "confirmed": True
        })
        
        # Advance with override to skip compliance gate
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={"new_status": "in_verification"})
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "ready_for_settlement", "override": True
        })
        
        # Try to settle without compliance
        settle_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/settle", json={})
        
        assert settle_res.status_code == 400
        assert "compliance" in settle_res.json()["detail"].lower()
        
        print(f"✓ Settlement blocked without compliance: {settle_res.json()['detail']}")


class TestFeeLedger:
    """Fee ledger tests"""
    
    def test_get_fee_ledger(self, auth_session):
        """GET /api/escrow/fee-ledger returns entries and totals"""
        res = auth_session.get(f"{BASE_URL}/api/escrow/fee-ledger")
        assert res.status_code == 200
        
        data = res.json()
        assert "entries" in data
        assert "total" in data
        assert "totals" in data
        
        totals = data["totals"]
        assert "total_revenue" in totals
        assert "total_from_buyers" in totals
        assert "total_from_sellers" in totals
        assert "total_volume" in totals
        assert "deal_count" in totals
        
        print(f"✓ Fee ledger: {data['total']} entries, revenue=${totals['total_revenue']}")

    def test_get_fee_ledger_summary(self, auth_session):
        """GET /api/escrow/fee-ledger/summary returns revenue by schedule"""
        res = auth_session.get(f"{BASE_URL}/api/escrow/fee-ledger/summary")
        assert res.status_code == 200
        
        data = res.json()
        assert "by_schedule" in data
        
        for item in data["by_schedule"]:
            assert "schedule" in item
            assert "revenue" in item
            assert "volume" in item
            assert "count" in item
        
        print(f"✓ Fee ledger summary: {len(data['by_schedule'])} schedules")


class TestWhitelist:
    """Whitelist management tests"""
    
    def test_add_whitelist_address(self, auth_session):
        """POST /api/escrow/deals/{id}/whitelist adds whitelisted address"""
        # Create deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_WLBuyer", "email": "wlbuyer@test.com"},
            "seller": {"name": "TEST_WLSeller", "email": "wlseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Add whitelist address
        wl_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist", json={
            "address": "0xBuyerWallet123456789",
            "label": "Buyer Main Wallet",
            "asset": "USDT",
            "party": "buyer"
        })
        
        assert wl_res.status_code == 200
        data = wl_res.json()
        assert data["success"] is True
        assert "entry" in data
        
        entry = data["entry"]
        assert entry["address"] == "0xBuyerWallet123456789"
        assert entry["label"] == "Buyer Main Wallet"
        assert entry["party"] == "buyer"
        assert entry["added_by"] == ADMIN_EMAIL
        
        print(f"✓ Whitelist address added: {entry['label']}")

    def test_get_whitelist(self, auth_session):
        """GET /api/escrow/deals/{id}/whitelist returns whitelist"""
        # Create deal and add whitelist
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_GetWLBuyer", "email": "getwlbuyer@test.com"},
            "seller": {"name": "TEST_GetWLSeller", "email": "getwlseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Add two addresses
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist", json={
            "address": "0xAddr1", "label": "Addr 1", "asset": "USDT", "party": "buyer"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist", json={
            "address": "bc1qAddr2", "label": "Addr 2", "asset": "BTC", "party": "seller"
        })
        
        # Get whitelist
        res = auth_session.get(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist")
        assert res.status_code == 200
        
        data = res.json()
        assert "whitelist" in data
        assert len(data["whitelist"]) == 2
        
        print(f"✓ Whitelist retrieved: {len(data['whitelist'])} addresses")

    def test_remove_whitelist_address(self, auth_session):
        """DELETE /api/escrow/deals/{id}/whitelist/{address_id} removes address"""
        # Create deal and add whitelist
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "two_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_DelWLBuyer", "email": "delwlbuyer@test.com"},
            "seller": {"name": "TEST_DelWLSeller", "email": "delwlseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Add address
        add_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist", json={
            "address": "0xToDelete", "label": "To Delete", "asset": "USDT", "party": "buyer"
        })
        address_id = add_res.json()["entry"]["id"]
        
        # Delete address
        del_res = auth_session.delete(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist/{address_id}")
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True
        
        # Verify removed
        get_res = auth_session.get(f"{BASE_URL}/api/escrow/deals/{deal_id}/whitelist")
        assert len(get_res.json()["whitelist"]) == 0
        
        print(f"✓ Whitelist address removed")


class TestRiskScoring:
    """Risk scoring tests"""
    
    def test_risk_score_calculated_on_advance(self, auth_session):
        """Risk score auto-calculated on status advance"""
        # Create deal
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 1.0,
            "quantity_b": 50000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_RiskBuyer", "email": "riskbuyer@test.com"},
            "seller": {"name": "TEST_RiskSeller", "email": "riskseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Initial risk score should be None
        initial_deal = create_res.json()["deal"]
        assert initial_deal["compliance"]["risk_score"] is None
        
        # Fund and advance
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 50000.0, "asset": "USDT"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_res.json()["deposit_id"], "confirmed": True
        })
        
        # Advance to in_verification
        advance_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "in_verification"
        })
        
        deal = advance_res.json()["deal"]
        assert deal["compliance"]["risk_score"] is not None
        assert 0 <= deal["compliance"]["risk_score"] <= 100
        
        print(f"✓ Risk score calculated: {deal['compliance']['risk_score']}")

    def test_risk_score_high_for_large_ticket(self, auth_session):
        """Risk score higher for large ticket sizes"""
        # Create large deal ($6M)
        deal_data = {
            "deal_type": "crypto_crypto",
            "structure": "one_sided",
            "asset_a": "BTC",
            "asset_b": "USDT",
            "quantity_a": 120.0,
            "quantity_b": 6000000.0,
            "agreed_price": 50000.0,
            "fee_schedule": "standard",
            "fee_payer": "split",
            "buyer": {"name": "TEST_HighRiskBuyer", "email": "highriskbuyer@test.com"},
            "seller": {"name": "TEST_HighRiskSeller", "email": "highriskseller@test.com"},
        }
        
        create_res = auth_session.post(f"{BASE_URL}/api/escrow/deals", json=deal_data)
        deal_id = create_res.json()["deal"]["id"]
        
        # Fund and advance
        dep_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/deposit", json={
            "party": "buyer", "amount": 6000000.0, "asset": "USDT"
        })
        auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/confirm-deposit", json={
            "deposit_id": dep_res.json()["deposit_id"], "confirmed": True
        })
        
        advance_res = auth_session.post(f"{BASE_URL}/api/escrow/deals/{deal_id}/advance", json={
            "new_status": "in_verification"
        })
        
        deal = advance_res.json()["deal"]
        risk_score = deal["compliance"]["risk_score"]
        
        # Large ticket should have higher risk (baseline 50 + 30 for >$5M)
        assert risk_score >= 70, f"Expected high risk score for $6M deal, got {risk_score}"
        
        print(f"✓ High risk score for $6M deal: {risk_score}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
