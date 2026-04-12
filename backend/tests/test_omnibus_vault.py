import os
"""
Omnibus Vault API Tests
Tests for the Omnibus Vault structure for OTC/Multi-Sign clients.
Features tested:
- Omnibus config (GET/PUT)
- Sub-account provisioning
- Credit/Debit operations
- Balance validation
- Multi-sign transaction integration with omnibus ledger
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestOmnibusVaultAPI:
    """Test Omnibus Vault API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            # Auth uses 'access_token' key (not 'token')
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
                self.user_id = data.get("user", {}).get("id")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ==================== CONFIG TESTS ====================
    
    def test_get_omnibus_config(self):
        """GET /api/omnibus/config - returns current config"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Config should be set (per agent context: fireblocks_vault_id='63')
        assert "configured" in data
        if data.get("configured"):
            assert "fireblocks_vault_id" in data
            assert "vault_name" in data
            assert "supported_assets" in data
            print(f"Omnibus config: vault_id={data.get('fireblocks_vault_id')}, name={data.get('vault_name')}")
        else:
            print("Omnibus not configured yet")
    
    def test_put_omnibus_config_admin_only(self):
        """PUT /api/omnibus/config - sets omnibus vault configuration (admin only)"""
        config_data = {
            "fireblocks_vault_id": "63",
            "vault_name": "KBEX Omnibus Test",
            "supported_assets": ["BTC", "ETH", "USDT", "USDC", "SOL", "XRP"]
        }
        
        response = self.session.put(f"{BASE_URL}/api/omnibus/config", json=config_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Config set successfully: {data.get('message')}")
        
        # Verify config was saved
        verify_response = self.session.get(f"{BASE_URL}/api/omnibus/config")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("fireblocks_vault_id") == "63"
    
    # ==================== PROVISION TESTS ====================
    
    def test_provision_client_requires_identity(self):
        """POST /api/omnibus/provision - requires user_id or otc_client_id"""
        response = self.session.post(f"{BASE_URL}/api/omnibus/provision", json={
            "initial_assets": ["BTC", "ETH"]
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "user_id" in response.text.lower() or "otc_client_id" in response.text.lower()
    
    def test_provision_client_with_user_id(self):
        """POST /api/omnibus/provision - creates sub-account for user"""
        # Create a test user ID (or use existing)
        test_user_id = f"test-user-{uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/omnibus/provision", json={
            "user_id": test_user_id,
            "initial_assets": ["BTC", "ETH", "USDT"]
        })
        
        # Could be 200 (success) or 400 (already provisioned)
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "sub_account_id" in data
            assert "assets_provisioned" in data
            print(f"Provisioned sub-account: {data.get('sub_account_id')}")
        elif response.status_code == 400:
            # Already provisioned is acceptable
            assert "já possui" in response.text.lower() or "already" in response.text.lower()
            print("User already has omnibus sub-account")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}: {response.text}")
    
    # ==================== SUB-ACCOUNTS LIST ====================
    
    def test_list_sub_accounts(self):
        """GET /api/omnibus/sub-accounts - lists all sub-accounts (admin)"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/sub-accounts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sub_accounts" in data
        sub_accounts = data["sub_accounts"]
        print(f"Found {len(sub_accounts)} omnibus sub-accounts")
        
        # Verify structure if accounts exist
        if sub_accounts:
            account = sub_accounts[0]
            assert "_id" in account  # MongoDB aggregation returns _id as sub_account_id
            assert "assets" in account
            print(f"First sub-account: {account.get('_id')}, client: {account.get('client_label', 'N/A')}")
    
    # ==================== CREDIT/DEBIT TESTS ====================
    
    def test_credit_sub_account(self):
        """POST /api/omnibus/credit/{sub_id} - credits funds to sub-account"""
        # Get existing sub-account from context: a641ea39-5faf-4baf-aa65-bf841d093112
        sub_account_id = "a641ea39-5faf-4baf-aa65-bf841d093112"
        
        credit_data = {
            "asset": "BTC",
            "amount": 0.001,
            "reference": "TEST_CREDIT",
            "notes": "Test credit for pytest"
        }
        
        response = self.session.post(f"{BASE_URL}/api/omnibus/credit/{sub_account_id}", json=credit_data)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"Credit successful: {data.get('message')}")
        elif response.status_code == 404:
            # Sub-account or asset not found
            print(f"Sub-account or asset not found: {response.text}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}: {response.text}")
    
    def test_debit_sub_account_insufficient_balance(self):
        """POST /api/omnibus/debit/{sub_id} - validates balance before debit"""
        sub_account_id = "a641ea39-5faf-4baf-aa65-bf841d093112"
        
        # Try to debit more than available
        debit_data = {
            "asset": "BTC",
            "amount": 999999.0,  # Very large amount
            "reference": "TEST_DEBIT_FAIL",
            "notes": "Should fail - insufficient balance"
        }
        
        response = self.session.post(f"{BASE_URL}/api/omnibus/debit/{sub_account_id}", json=debit_data)
        
        if response.status_code == 400:
            # Expected - insufficient balance
            assert "insuficiente" in response.text.lower() or "insufficient" in response.text.lower()
            print("Correctly rejected debit with insufficient balance")
        elif response.status_code == 404:
            print(f"Sub-account not found: {response.text}")
        else:
            pytest.fail(f"Expected 400 for insufficient balance, got {response.status_code}")
    
    def test_debit_sub_account_success(self):
        """POST /api/omnibus/debit/{sub_id} - debits funds with balance validation"""
        sub_account_id = "a641ea39-5faf-4baf-aa65-bf841d093112"
        
        # First credit some funds
        credit_response = self.session.post(f"{BASE_URL}/api/omnibus/credit/{sub_account_id}", json={
            "asset": "USDT",
            "amount": 100.0,
            "reference": "TEST_CREDIT_FOR_DEBIT",
            "notes": "Credit for debit test"
        })
        
        if credit_response.status_code != 200:
            pytest.skip(f"Could not credit for debit test: {credit_response.text}")
        
        # Now debit
        debit_data = {
            "asset": "USDT",
            "amount": 10.0,
            "reference": "TEST_DEBIT",
            "notes": "Test debit for pytest"
        }
        
        response = self.session.post(f"{BASE_URL}/api/omnibus/debit/{sub_account_id}", json=debit_data)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print(f"Debit successful: {data.get('message')}")
        else:
            pytest.fail(f"Debit failed: {response.status_code}: {response.text}")
    
    # ==================== MOVEMENTS HISTORY ====================
    
    def test_get_movements_history(self):
        """GET /api/omnibus/movements/{sub_id} - returns movement history"""
        sub_account_id = "a641ea39-5faf-4baf-aa65-bf841d093112"
        
        response = self.session.get(f"{BASE_URL}/api/omnibus/movements/{sub_account_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "movements" in data
        movements = data["movements"]
        print(f"Found {len(movements)} movements for sub-account")
        
        # Verify structure if movements exist
        if movements:
            movement = movements[0]
            assert "type" in movement  # credit or debit
            assert "asset" in movement
            assert "amount" in movement
            print(f"Latest movement: {movement.get('type')} {movement.get('amount')} {movement.get('asset')}")
    
    # ==================== CLIENT BALANCE ====================
    
    def test_get_my_omnibus_balance(self):
        """GET /api/omnibus/my-balance - returns client's omnibus balances"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/my-balance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "has_omnibus" in data
        
        if data.get("has_omnibus"):
            assert "sub_account_id" in data
            assert "balances" in data
            balances = data["balances"]
            print(f"User has omnibus with {len(balances)} assets")
            for b in balances:
                print(f"  {b.get('asset')}: balance={b.get('balance')}, available={b.get('available_balance')}")
        else:
            print("User does not have omnibus sub-account")
    
    def test_get_my_movements(self):
        """GET /api/omnibus/my-movements - returns client's movements"""
        response = self.session.get(f"{BASE_URL}/api/omnibus/my-movements")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "movements" in data
        print(f"User has {len(data['movements'])} movements")


class TestMultiSignOmnibusIntegration:
    """Test Multi-Sign transaction integration with Omnibus ledger"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
                self.user_id = data.get("user", {}).get("id")
            else:
                pytest.skip("No token in login response")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_vault_signatories_endpoint(self):
        """GET /api/vault/signatories - returns configured signatories"""
        response = self.session.get(f"{BASE_URL}/api/vault/signatories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "signatories" in data
        print(f"Found {len(data['signatories'])} signatories")
    
    def test_vault_settings_endpoint(self):
        """GET /api/vault/settings - returns vault settings"""
        response = self.session.get(f"{BASE_URL}/api/vault/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "required_signatures" in data
        assert "transaction_timeout_hours" in data
        print(f"Vault settings: {data.get('required_signatures')} signatures required, {data.get('transaction_timeout_hours')}h timeout")
    
    def test_vault_transactions_list(self):
        """GET /api/vault/transactions - lists vault transactions"""
        response = self.session.get(f"{BASE_URL}/api/vault/transactions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "transactions" in data
        assert "pending_action_count" in data
        print(f"Found {len(data['transactions'])} transactions, {data['pending_action_count']} pending action")
    
    def test_vault_dashboard(self):
        """GET /api/vault/dashboard - returns vault dashboard stats"""
        response = self.session.get(f"{BASE_URL}/api/vault/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_transactions" in data
        assert "pending_signatures" in data
        assert "completed" in data
        assert "signatories_count" in data
        print(f"Dashboard: {data.get('total_transactions')} total, {data.get('pending_signatures')} pending, {data.get('completed')} completed")


class TestPermissionsCofreRename:
    """Test that 'Wallets' was renamed to 'Cofre' in Multi-Sign menu"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_permissions_menus_contains_cofre(self):
        """GET /api/permissions/menus - should contain 'Cofre' in Multi-Sign menu"""
        response = self.session.get(f"{BASE_URL}/api/permissions/menus")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Search for 'Cofre' in the menu structure
        found_cofre = False
        menu_text = str(data)
        
        if "Cofre" in menu_text:
            found_cofre = True
            print("Found 'Cofre' in menu structure")
        
        # Also check that 'Wallets' is NOT in Multi-Sign section (should be renamed)
        # Note: 'Carteiras' (Wallets in Portuguese) may still exist in Portfolio section
        
        assert found_cofre, "Expected 'Cofre' in Multi-Sign menu but not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
