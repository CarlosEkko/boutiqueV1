"""
Demo Mode Profile & Bank Accounts Tests
Tests for the demo mode profile and bank accounts endpoints for KBEX.io platform.
Features tested:
- POST /api/demo/toggle to enable demo mode
- GET /api/demo/profile returns mock Victoria Sterling profile when demo ON
- GET /api/demo/bank-accounts returns 4 mock bank accounts when demo ON
- GET /api/demo/profile returns 403 when demo OFF
- GET /api/demo/bank-accounts returns 403 when demo OFF
- POST /api/demo/toggle again to turn demo OFF
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = "senha123"


class TestDemoProfileAndBankAccounts:
    """Demo Mode Profile & Bank Accounts API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.user = data.get("user", {})
        
        if not self.token:
            pytest.skip("No access token received")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store initial demo mode state to restore later
        status_response = self.session.get(f"{BASE_URL}/api/demo/status")
        if status_response.status_code == 200:
            self.initial_demo_mode = status_response.json().get("demo_mode", False)
        else:
            self.initial_demo_mode = False
        
        yield
        
        # Teardown - restore initial demo mode state if changed
        current_status = self.session.get(f"{BASE_URL}/api/demo/status")
        if current_status.status_code == 200:
            current_mode = current_status.json().get("demo_mode", False)
            if current_mode != self.initial_demo_mode:
                # Toggle back to initial state
                self.session.post(f"{BASE_URL}/api/demo/toggle")
    
    def _ensure_demo_mode_on(self):
        """Helper to ensure demo mode is ON"""
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and not status.json().get("demo_mode"):
            toggle_resp = self.session.post(f"{BASE_URL}/api/demo/toggle")
            assert toggle_resp.status_code == 200, f"Failed to toggle demo mode ON: {toggle_resp.text}"
            assert toggle_resp.json().get("demo_mode") == True
    
    def _ensure_demo_mode_off(self):
        """Helper to ensure demo mode is OFF"""
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and status.json().get("demo_mode"):
            toggle_resp = self.session.post(f"{BASE_URL}/api/demo/toggle")
            assert toggle_resp.status_code == 200, f"Failed to toggle demo mode OFF: {toggle_resp.text}"
            assert toggle_resp.json().get("demo_mode") == False
    
    def test_01_toggle_demo_mode_on(self):
        """Test POST /api/demo/toggle to enable demo mode"""
        # First ensure demo mode is OFF
        self._ensure_demo_mode_off()
        
        # Toggle demo mode ON
        toggle_response = self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        assert toggle_response.status_code == 200, f"Expected 200, got {toggle_response.status_code}: {toggle_response.text}"
        
        data = toggle_response.json()
        assert data.get("success") == True, "Toggle should succeed"
        assert data.get("demo_mode") == True, "Demo mode should be ON after toggle"
        
        # Verify via status endpoint
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        assert status.status_code == 200
        assert status.json().get("demo_mode") == True, "Demo mode should be ON"
        
        print("PASS: Demo mode toggled ON successfully")
    
    def test_02_demo_profile_returns_victoria_sterling_when_on(self):
        """Test GET /api/demo/profile returns mock Victoria Sterling profile when demo ON"""
        # Ensure demo mode is ON
        self._ensure_demo_mode_on()
        
        # Get demo profile
        response = self.session.get(f"{BASE_URL}/api/demo/profile")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        profile = response.json()
        
        # Verify Victoria Sterling mock data
        assert profile.get("name") == "Victoria Sterling", f"Expected name 'Victoria Sterling', got '{profile.get('name')}'"
        assert profile.get("email") == "victoria.sterling@sterling-capital.com", f"Expected email 'victoria.sterling@sterling-capital.com', got '{profile.get('email')}'"
        assert profile.get("phone") == "+44 20 7946 0958", f"Expected phone '+44 20 7946 0958', got '{profile.get('phone')}'"
        assert profile.get("address") == "42 Kensington Palace Gardens, London W8 4QY, United Kingdom", f"Unexpected address: {profile.get('address')}"
        assert profile.get("country") == "GB", f"Expected country 'GB', got '{profile.get('country')}'"
        assert profile.get("membership_level") == "vip", f"Expected membership_level 'vip', got '{profile.get('membership_level')}'"
        assert profile.get("kyc_status") == "approved", f"Expected kyc_status 'approved', got '{profile.get('kyc_status')}'"
        assert profile.get("is_demo") == True, "Profile should have is_demo=True"
        
        print(f"PASS: Demo profile returned Victoria Sterling data:")
        print(f"  Name: {profile.get('name')}")
        print(f"  Email: {profile.get('email')}")
        print(f"  Phone: {profile.get('phone')}")
        print(f"  Address: {profile.get('address')}")
        print(f"  Country: {profile.get('country')}")
        print(f"  Membership: {profile.get('membership_level')}")
    
    def test_03_demo_bank_accounts_returns_4_accounts_when_on(self):
        """Test GET /api/demo/bank-accounts returns 4 mock bank accounts when demo ON"""
        # Ensure demo mode is ON
        self._ensure_demo_mode_on()
        
        # Seed demo data first to ensure bank accounts exist
        seed_response = self.session.post(f"{BASE_URL}/api/demo/seed")
        assert seed_response.status_code == 200, f"Failed to seed demo data: {seed_response.text}"
        
        # Get demo bank accounts
        response = self.session.get(f"{BASE_URL}/api/demo/bank-accounts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        accounts = response.json()
        assert isinstance(accounts, list), "Response should be a list of bank accounts"
        
        # Should have 4 mock bank accounts
        assert len(accounts) == 4, f"Expected 4 bank accounts, got {len(accounts)}"
        
        # Verify expected banks: UBS, Barclays, Julius Baer, JP Morgan
        expected_banks = ["UBS Switzerland AG", "Barclays Private Bank", "Julius Baer", "JP Morgan Chase"]
        found_banks = [acc.get("bank_name") for acc in accounts]
        
        for bank in expected_banks:
            assert bank in found_banks, f"Expected bank '{bank}' not found in {found_banks}"
        
        # Verify all accounts have is_demo=True
        for acc in accounts:
            assert acc.get("is_demo") == True, f"Account {acc.get('bank_name')} should have is_demo=True"
        
        # Verify account holder is Victoria Sterling or Sterling Capital Partners
        for acc in accounts:
            holder = acc.get("account_holder", "")
            assert "Sterling" in holder, f"Account holder should contain 'Sterling', got '{holder}'"
        
        print(f"PASS: Demo bank accounts returned {len(accounts)} accounts:")
        for acc in accounts:
            print(f"  - {acc.get('bank_name')} ({acc.get('currency')}) - {acc.get('account_holder')}")
            print(f"    IBAN: {acc.get('iban') or 'N/A'}, Status: {acc.get('status')}")
    
    def test_04_demo_profile_returns_403_when_off(self):
        """Test GET /api/demo/profile returns 403 when demo OFF"""
        # Ensure demo mode is OFF
        self._ensure_demo_mode_off()
        
        # Get demo profile - should return 403
        response = self.session.get(f"{BASE_URL}/api/demo/profile")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain 'detail' field"
        assert "Demo mode not active" in data.get("detail", ""), f"Expected 'Demo mode not active' error, got: {data.get('detail')}"
        
        print(f"PASS: Demo profile correctly returns 403 when demo mode is OFF")
        print(f"  Error: {data.get('detail')}")
    
    def test_05_demo_bank_accounts_returns_403_when_off(self):
        """Test GET /api/demo/bank-accounts returns 403 when demo OFF"""
        # Ensure demo mode is OFF
        self._ensure_demo_mode_off()
        
        # Get demo bank accounts - should return 403
        response = self.session.get(f"{BASE_URL}/api/demo/bank-accounts")
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain 'detail' field"
        assert "Demo mode not active" in data.get("detail", ""), f"Expected 'Demo mode not active' error, got: {data.get('detail')}"
        
        print(f"PASS: Demo bank accounts correctly returns 403 when demo mode is OFF")
        print(f"  Error: {data.get('detail')}")
    
    def test_06_toggle_demo_mode_off(self):
        """Test POST /api/demo/toggle again to turn demo OFF"""
        # First ensure demo mode is ON
        self._ensure_demo_mode_on()
        
        # Toggle demo mode OFF
        toggle_response = self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        assert toggle_response.status_code == 200, f"Expected 200, got {toggle_response.status_code}: {toggle_response.text}"
        
        data = toggle_response.json()
        assert data.get("success") == True, "Toggle should succeed"
        assert data.get("demo_mode") == False, "Demo mode should be OFF after toggle"
        
        # Verify via status endpoint
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        assert status.status_code == 200
        assert status.json().get("demo_mode") == False, "Demo mode should be OFF"
        
        print("PASS: Demo mode toggled OFF successfully")
    
    def test_07_verify_bank_account_details(self):
        """Test bank account details match expected mock data"""
        # Ensure demo mode is ON
        self._ensure_demo_mode_on()
        
        # Seed demo data
        self.session.post(f"{BASE_URL}/api/demo/seed")
        
        # Get demo bank accounts
        response = self.session.get(f"{BASE_URL}/api/demo/bank-accounts")
        assert response.status_code == 200
        
        accounts = response.json()
        
        # Find UBS account (should be primary)
        ubs_account = next((acc for acc in accounts if "UBS" in acc.get("bank_name", "")), None)
        assert ubs_account is not None, "UBS account not found"
        assert ubs_account.get("is_primary") == True, "UBS should be primary account"
        assert ubs_account.get("currency") == "CHF", "UBS should be CHF currency"
        assert ubs_account.get("country") == "CH", "UBS should be in Switzerland"
        assert ubs_account.get("status") == "verified", "UBS should be verified"
        
        # Find Barclays account
        barclays_account = next((acc for acc in accounts if "Barclays" in acc.get("bank_name", "")), None)
        assert barclays_account is not None, "Barclays account not found"
        assert barclays_account.get("currency") == "GBP", "Barclays should be GBP currency"
        assert barclays_account.get("country") == "GB", "Barclays should be in UK"
        
        # Find Julius Baer account
        julius_account = next((acc for acc in accounts if "Julius" in acc.get("bank_name", "")), None)
        assert julius_account is not None, "Julius Baer account not found"
        assert julius_account.get("currency") == "EUR", "Julius Baer should be EUR currency"
        
        # Find JP Morgan account
        jpmorgan_account = next((acc for acc in accounts if "JP Morgan" in acc.get("bank_name", "")), None)
        assert jpmorgan_account is not None, "JP Morgan account not found"
        assert jpmorgan_account.get("currency") == "USD", "JP Morgan should be USD currency"
        assert jpmorgan_account.get("country") == "US", "JP Morgan should be in US"
        assert jpmorgan_account.get("status") == "pending", "JP Morgan should be pending status"
        
        print("PASS: All bank account details verified correctly")
        print(f"  UBS (CHF, CH): Primary, Verified")
        print(f"  Barclays (GBP, GB): Verified")
        print(f"  Julius Baer (EUR, CH): Verified")
        print(f"  JP Morgan (USD, US): Pending")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
