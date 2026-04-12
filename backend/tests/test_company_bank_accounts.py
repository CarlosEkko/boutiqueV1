"""
Test Company Bank Accounts API
Tests CRUD operations for company bank accounts used in onboarding payment gateway
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestCompanyBankAccountsPublic:
    """Public endpoint tests - no auth required"""
    
    def test_get_public_accounts_returns_active_only(self):
        """GET /api/company-bank-accounts/public returns only active accounts"""
        response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        accounts = response.json()
        assert isinstance(accounts, list), "Response should be a list"
        
        # All returned accounts should be active
        for account in accounts:
            assert account.get("is_active") == True, f"Account {account.get('id')} should be active"
            assert "bank_name" in account
            assert "currency" in account
            assert "country" in account
        
        print(f"PASS: Public endpoint returned {len(accounts)} active accounts")
    
    def test_get_public_accounts_filter_by_currency_eur(self):
        """GET /api/company-bank-accounts/public?currency=EUR filters by EUR"""
        response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=EUR")
        assert response.status_code == 200
        
        accounts = response.json()
        for account in accounts:
            assert account.get("currency") == "EUR", f"Expected EUR, got {account.get('currency')}"
        
        print(f"PASS: Currency filter EUR returned {len(accounts)} accounts")
    
    def test_get_public_accounts_filter_by_currency_brl(self):
        """GET /api/company-bank-accounts/public?currency=BRL filters by BRL"""
        response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=BRL")
        assert response.status_code == 200
        
        accounts = response.json()
        for account in accounts:
            assert account.get("currency") == "BRL", f"Expected BRL, got {account.get('currency')}"
        
        print(f"PASS: Currency filter BRL returned {len(accounts)} accounts")
    
    def test_get_public_accounts_filter_nonexistent_currency(self):
        """GET /api/company-bank-accounts/public?currency=XYZ returns empty list"""
        response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=XYZ")
        assert response.status_code == 200
        
        accounts = response.json()
        assert accounts == [], f"Expected empty list for non-existent currency, got {accounts}"
        
        print("PASS: Non-existent currency filter returns empty list")


class TestCompanyBankAccountsAdmin:
    """Admin endpoint tests - requires authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_get_all_accounts(self):
        """GET /api/company-bank-accounts/admin/all returns all accounts"""
        response = requests.get(
            f"{BASE_URL}/api/company-bank-accounts/admin/all",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        accounts = response.json()
        assert isinstance(accounts, list), "Response should be a list"
        
        print(f"PASS: Admin endpoint returned {len(accounts)} total accounts")
    
    def test_admin_get_all_accounts_unauthorized(self):
        """GET /api/company-bank-accounts/admin/all without auth returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/company-bank-accounts/admin/all")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        
        print(f"PASS: Unauthorized access returns {response.status_code}")
    
    def test_admin_create_account_eur(self):
        """POST /api/company-bank-accounts/admin creates EUR account"""
        test_id = str(uuid.uuid4())[:8]
        account_data = {
            "bank_name": f"TEST_Bank_{test_id}",
            "account_holder": "TEST KBEX Services",
            "iban": f"PT50{test_id}00000000000000",
            "swift_bic": "TESTPTPL",
            "country": "PT",
            "currency": "EUR",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/company-bank-accounts/admin",
            json=account_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created.get("bank_name") == account_data["bank_name"]
        assert created.get("iban") == account_data["iban"].replace(" ", "").upper()
        assert created.get("swift_bic") == account_data["swift_bic"].upper()
        assert created.get("currency") == "EUR"
        assert "id" in created
        
        # Verify it appears in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=EUR")
        public_accounts = public_response.json()
        found = any(acc.get("id") == created["id"] for acc in public_accounts)
        assert found, "Created account should appear in public endpoint"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/company-bank-accounts/admin/{created['id']}",
            headers=self.headers
        )
        
        print(f"PASS: Created EUR account with ID {created['id']}")
    
    def test_admin_create_account_brl_with_pix(self):
        """POST /api/company-bank-accounts/admin creates BRL account with PIX"""
        test_id = str(uuid.uuid4())[:8]
        account_data = {
            "bank_name": f"TEST_Banco_{test_id}",
            "account_holder": "TEST KBEX Brasil",
            "pix_key": f"test_{test_id}@kbex.com.br",
            "country": "BR",
            "currency": "BRL",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/company-bank-accounts/admin",
            json=account_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert created.get("bank_name") == account_data["bank_name"]
        assert created.get("pix_key") == account_data["pix_key"]
        assert created.get("currency") == "BRL"
        
        # Verify it appears in public endpoint filtered by BRL
        public_response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=BRL")
        public_accounts = public_response.json()
        found = any(acc.get("id") == created["id"] for acc in public_accounts)
        assert found, "Created BRL account should appear in public endpoint"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/company-bank-accounts/admin/{created['id']}",
            headers=self.headers
        )
        
        print(f"PASS: Created BRL account with PIX key")
    
    def test_admin_create_account_validation(self):
        """POST /api/company-bank-accounts/admin validates required fields"""
        # Missing bank_name
        response = requests.post(
            f"{BASE_URL}/api/company-bank-accounts/admin",
            json={"country": "PT", "currency": "EUR"},
            headers=self.headers
        )
        assert response.status_code == 422, f"Expected 422 for missing bank_name, got {response.status_code}"
        
        print("PASS: Validation rejects missing required fields")
    
    def test_admin_update_account(self):
        """PUT /api/company-bank-accounts/admin/{id} updates account"""
        # First create an account
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/company-bank-accounts/admin",
            json={
                "bank_name": f"TEST_Update_{test_id}",
                "account_holder": "Original Holder",
                "iban": f"PT50{test_id}00000000000000",
                "country": "PT",
                "currency": "EUR",
                "is_active": True
            },
            headers=self.headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        account_id = created["id"]
        
        # Update the account
        update_response = requests.put(
            f"{BASE_URL}/api/company-bank-accounts/admin/{account_id}",
            json={
                "account_holder": "Updated Holder",
                "is_active": False
            },
            headers=self.headers
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update via admin endpoint
        all_response = requests.get(
            f"{BASE_URL}/api/company-bank-accounts/admin/all",
            headers=self.headers
        )
        all_accounts = all_response.json()
        updated = next((acc for acc in all_accounts if acc["id"] == account_id), None)
        assert updated is not None
        assert updated["account_holder"] == "Updated Holder"
        assert updated["is_active"] == False
        
        # Verify it no longer appears in public endpoint (inactive)
        public_response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public")
        public_accounts = public_response.json()
        found = any(acc.get("id") == account_id for acc in public_accounts)
        assert not found, "Inactive account should not appear in public endpoint"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/company-bank-accounts/admin/{account_id}",
            headers=self.headers
        )
        
        print(f"PASS: Updated account and verified is_active=False hides from public")
    
    def test_admin_update_nonexistent_account(self):
        """PUT /api/company-bank-accounts/admin/{id} returns 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/company-bank-accounts/admin/{fake_id}",
            json={"bank_name": "Test"},
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Update non-existent account returns 404")
    
    def test_admin_delete_account(self):
        """DELETE /api/company-bank-accounts/admin/{id} deletes account"""
        # First create an account
        test_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/company-bank-accounts/admin",
            json={
                "bank_name": f"TEST_Delete_{test_id}",
                "iban": f"PT50{test_id}00000000000000",
                "country": "PT",
                "currency": "EUR",
                "is_active": True
            },
            headers=self.headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        account_id = created["id"]
        
        # Delete the account
        delete_response = requests.delete(
            f"{BASE_URL}/api/company-bank-accounts/admin/{account_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify it's gone from admin endpoint
        all_response = requests.get(
            f"{BASE_URL}/api/company-bank-accounts/admin/all",
            headers=self.headers
        )
        all_accounts = all_response.json()
        found = any(acc.get("id") == account_id for acc in all_accounts)
        assert not found, "Deleted account should not appear in admin endpoint"
        
        print(f"PASS: Deleted account {account_id}")
    
    def test_admin_delete_nonexistent_account(self):
        """DELETE /api/company-bank-accounts/admin/{id} returns 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/company-bank-accounts/admin/{fake_id}",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Delete non-existent account returns 404")


class TestCompanyBankAccountsIntegration:
    """Integration tests for onboarding payment flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.text}")
        
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_full_crud_workflow(self):
        """Test complete Create -> Read -> Update -> Delete workflow"""
        test_id = str(uuid.uuid4())[:8]
        
        # CREATE
        create_data = {
            "bank_name": f"TEST_CRUD_{test_id}",
            "account_holder": "KBEX Test Services",
            "iban": f"DE89{test_id}00000000000000",
            "swift_bic": "TESTDEFF",
            "country": "DE",
            "currency": "EUR",
            "is_active": True
        }
        create_response = requests.post(
            f"{BASE_URL}/api/company-bank-accounts/admin",
            json=create_data,
            headers=self.headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        account_id = created["id"]
        print(f"  Created account: {account_id}")
        
        # READ via public endpoint
        public_response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=EUR")
        assert public_response.status_code == 200
        public_accounts = public_response.json()
        found = any(acc.get("id") == account_id for acc in public_accounts)
        assert found, "Account should be visible in public endpoint"
        print(f"  Verified in public endpoint")
        
        # UPDATE - deactivate
        update_response = requests.put(
            f"{BASE_URL}/api/company-bank-accounts/admin/{account_id}",
            json={"is_active": False},
            headers=self.headers
        )
        assert update_response.status_code == 200
        print(f"  Updated account to inactive")
        
        # READ - verify not in public
        public_response2 = requests.get(f"{BASE_URL}/api/company-bank-accounts/public?currency=EUR")
        public_accounts2 = public_response2.json()
        found2 = any(acc.get("id") == account_id for acc in public_accounts2)
        assert not found2, "Inactive account should not be in public endpoint"
        print(f"  Verified not in public endpoint after deactivation")
        
        # DELETE
        delete_response = requests.delete(
            f"{BASE_URL}/api/company-bank-accounts/admin/{account_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        print(f"  Deleted account")
        
        # Verify deletion
        all_response = requests.get(
            f"{BASE_URL}/api/company-bank-accounts/admin/all",
            headers=self.headers
        )
        all_accounts = all_response.json()
        found3 = any(acc.get("id") == account_id for acc in all_accounts)
        assert not found3, "Deleted account should not exist"
        print(f"  Verified deletion")
        
        print("PASS: Full CRUD workflow completed successfully")
    
    def test_existing_accounts_structure(self):
        """Verify existing accounts have correct structure for onboarding"""
        response = requests.get(f"{BASE_URL}/api/company-bank-accounts/public")
        assert response.status_code == 200
        
        accounts = response.json()
        assert len(accounts) >= 2, f"Expected at least 2 accounts, got {len(accounts)}"
        
        # Check EUR account exists
        eur_accounts = [acc for acc in accounts if acc.get("currency") == "EUR"]
        assert len(eur_accounts) >= 1, "Should have at least 1 EUR account"
        
        eur_account = eur_accounts[0]
        assert eur_account.get("iban") is not None, "EUR account should have IBAN"
        assert eur_account.get("swift_bic") is not None, "EUR account should have SWIFT"
        print(f"  EUR account: {eur_account.get('bank_name')} - IBAN: {eur_account.get('iban')[:10]}...")
        
        # Check BRL account exists
        brl_accounts = [acc for acc in accounts if acc.get("currency") == "BRL"]
        assert len(brl_accounts) >= 1, "Should have at least 1 BRL account"
        
        brl_account = brl_accounts[0]
        assert brl_account.get("pix_key") is not None, "BRL account should have PIX key"
        print(f"  BRL account: {brl_account.get('bank_name')} - PIX: {brl_account.get('pix_key')}")
        
        print("PASS: Existing accounts have correct structure for onboarding")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
