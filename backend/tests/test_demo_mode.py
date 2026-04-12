import os
"""
Demo Mode Feature Tests
Tests for the demo mode toggle functionality for KBEX.io platform.
Features tested:
- Demo mode toggle API (POST /api/demo/toggle)
- Demo status API (GET /api/demo/status)
- Demo mode ON: Dashboard overview returns demo client portfolio (~$8M)
- Demo mode ON: Dashboard wallets returns wallets with balances
- Demo mode ON: OTC leads returns only demo leads (is_demo: true)
- Demo mode ON: OTC deals returns only demo deals
- Demo mode OFF: OTC leads excludes demo leads
- Demo mode OFF: Dashboard overview returns real user data
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "carlos@kbex.io"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "senha123")


class TestDemoMode:
    """Demo Mode API Tests"""
    
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
    
    def test_01_demo_status_endpoint(self):
        """Test GET /api/demo/status returns demo_mode and demo_authorized"""
        response = self.session.get(f"{BASE_URL}/api/demo/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "demo_mode" in data, "Response should contain 'demo_mode' field"
        assert "demo_authorized" in data, "Response should contain 'demo_authorized' field"
        assert isinstance(data["demo_mode"], bool), "demo_mode should be boolean"
        assert isinstance(data["demo_authorized"], bool), "demo_authorized should be boolean"
        
        # Admin should be authorized for demo mode
        assert data["demo_authorized"] == True, "Admin user should be demo_authorized"
        
        print(f"Demo status: mode={data['demo_mode']}, authorized={data['demo_authorized']}")
    
    def test_02_demo_toggle_endpoint(self):
        """Test POST /api/demo/toggle toggles demo mode on/off"""
        # Get initial state
        status_before = self.session.get(f"{BASE_URL}/api/demo/status")
        assert status_before.status_code == 200
        initial_mode = status_before.json().get("demo_mode", False)
        
        # Toggle demo mode
        toggle_response = self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        assert toggle_response.status_code == 200, f"Expected 200, got {toggle_response.status_code}: {toggle_response.text}"
        
        data = toggle_response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert data["success"] == True, "Toggle should succeed"
        assert "demo_mode" in data, "Response should contain 'demo_mode' field"
        
        # Verify mode was toggled
        expected_mode = not initial_mode
        assert data["demo_mode"] == expected_mode, f"Expected demo_mode={expected_mode}, got {data['demo_mode']}"
        
        # Verify via status endpoint
        status_after = self.session.get(f"{BASE_URL}/api/demo/status")
        assert status_after.status_code == 200
        assert status_after.json()["demo_mode"] == expected_mode
        
        print(f"Demo mode toggled: {initial_mode} -> {expected_mode}")
    
    def test_03_demo_mode_on_dashboard_overview(self):
        """Test GET /api/dashboard/overview returns demo client portfolio when demo mode is ON"""
        # Ensure demo mode is ON
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and not status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        # Get dashboard overview
        response = self.session.get(f"{BASE_URL}/api/dashboard/overview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify portfolio structure
        assert "total_portfolio_value" in data, "Response should contain 'total_portfolio_value'"
        assert "wallet_value" in data, "Response should contain 'wallet_value'"
        assert "wallet_allocation" in data, "Response should contain 'wallet_allocation'"
        
        # Demo client should have significant portfolio value (~$8M+)
        total_value = data.get("total_portfolio_value", 0)
        wallet_value = data.get("wallet_value", 0)
        
        print(f"Demo portfolio: total_value=${total_value:,.2f}, wallet_value=${wallet_value:,.2f}")
        
        # Demo client should have substantial value (at least $1M to account for price variations)
        assert wallet_value > 1000000, f"Demo client wallet_value should be > $1M, got ${wallet_value:,.2f}"
        
        # Check wallet allocation has multiple assets
        allocation = data.get("wallet_allocation", [])
        assert len(allocation) > 0, "Demo client should have wallet allocations"
        
        print(f"Demo wallet allocation: {len(allocation)} assets")
    
    def test_04_demo_mode_on_wallets(self):
        """Test GET /api/dashboard/wallets returns wallets with balances when demo mode is ON"""
        # Ensure demo mode is ON
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and not status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        # Get wallets
        response = self.session.get(f"{BASE_URL}/api/dashboard/wallets")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        wallets = response.json()
        assert isinstance(wallets, list), "Response should be a list of wallets"
        
        # Find demo wallets with balances
        wallets_with_balance = [w for w in wallets if w.get("balance", 0) > 0]
        
        print(f"Total wallets: {len(wallets)}, with balance: {len(wallets_with_balance)}")
        
        # Demo client should have wallets with balances
        assert len(wallets_with_balance) > 0, "Demo client should have wallets with balances"
        
        # Check for expected demo wallet assets (BTC, ETH, USDT, SOL, EUR, USD, GBP, CHF)
        expected_assets = ["BTC", "ETH", "USDT", "SOL", "EUR", "USD", "GBP", "CHF"]
        found_assets = {w.get("asset_id") for w in wallets_with_balance}
        
        for asset in expected_assets:
            if asset in found_assets:
                wallet = next((w for w in wallets_with_balance if w.get("asset_id") == asset), None)
                if wallet:
                    print(f"  {asset}: balance={wallet.get('balance', 0)}")
        
        # At least some expected assets should have balances
        matching_assets = found_assets.intersection(set(expected_assets))
        assert len(matching_assets) >= 3, f"Expected at least 3 demo assets with balance, found: {matching_assets}"
    
    def test_05_demo_mode_on_otc_leads(self):
        """Test GET /api/otc/leads returns only demo leads when demo mode is ON"""
        # Ensure demo mode is ON
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and not status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        # Get OTC leads
        response = self.session.get(f"{BASE_URL}/api/otc/leads")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leads" in data, "Response should contain 'leads' field"
        
        leads = data.get("leads", [])
        print(f"OTC leads in demo mode: {len(leads)} total")
        
        # All leads should have is_demo: true
        for lead in leads:
            assert lead.get("is_demo") == True, f"Lead {lead.get('id')} should have is_demo=True in demo mode"
        
        # Demo mode should have 5 mock leads
        if len(leads) > 0:
            print(f"Demo leads found: {len(leads)}")
            for lead in leads[:3]:  # Print first 3
                print(f"  - {lead.get('entity_name')}: {lead.get('status')}")
    
    def test_06_demo_mode_on_otc_deals(self):
        """Test GET /api/otc/deals returns only demo deals when demo mode is ON"""
        # Ensure demo mode is ON
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and not status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        # Get OTC deals
        response = self.session.get(f"{BASE_URL}/api/otc/deals")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "deals" in data, "Response should contain 'deals' field"
        
        deals = data.get("deals", [])
        print(f"OTC deals in demo mode: {len(deals)} total")
        
        # All deals should have is_demo: true
        for deal in deals:
            assert deal.get("is_demo") == True, f"Deal {deal.get('id')} should have is_demo=True in demo mode"
        
        # Demo mode should have 3 mock deals
        if len(deals) > 0:
            print(f"Demo deals found: {len(deals)}")
            for deal in deals:
                print(f"  - {deal.get('deal_number')}: {deal.get('asset')} {deal.get('deal_type')} - {deal.get('stage')}")
    
    def test_07_demo_mode_off_otc_leads_excludes_demo(self):
        """Test GET /api/otc/leads excludes demo leads when demo mode is OFF"""
        # Ensure demo mode is OFF
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        # Get OTC leads
        response = self.session.get(f"{BASE_URL}/api/otc/leads")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        leads = data.get("leads", [])
        
        print(f"OTC leads in normal mode: {len(leads)} total")
        
        # No leads should have is_demo: true
        demo_leads = [l for l in leads if l.get("is_demo") == True]
        assert len(demo_leads) == 0, f"Found {len(demo_leads)} demo leads when demo mode is OFF"
        
        print("Verified: No demo leads shown when demo mode is OFF")
    
    def test_08_demo_mode_off_dashboard_overview(self):
        """Test GET /api/dashboard/overview returns real user data when demo mode is OFF"""
        # Ensure demo mode is OFF
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        # Get dashboard overview
        response = self.session.get(f"{BASE_URL}/api/dashboard/overview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify portfolio structure
        assert "total_portfolio_value" in data, "Response should contain 'total_portfolio_value'"
        assert "wallet_value" in data, "Response should contain 'wallet_value'"
        
        total_value = data.get("total_portfolio_value", 0)
        wallet_value = data.get("wallet_value", 0)
        
        print(f"Real user portfolio: total_value=${total_value:,.2f}, wallet_value=${wallet_value:,.2f}")
        
        # Real admin user likely has different (possibly lower) portfolio value than demo client
        # Just verify the endpoint works and returns valid data
        assert isinstance(total_value, (int, float)), "total_portfolio_value should be numeric"
        assert isinstance(wallet_value, (int, float)), "wallet_value should be numeric"
    
    def test_09_demo_seed_endpoint(self):
        """Test POST /api/demo/seed manually seeds demo data (admin only)"""
        response = self.session.post(f"{BASE_URL}/api/demo/seed")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert data["success"] == True, "Seed should succeed"
        assert "seeded" in data, "Response should contain 'seeded' field"
        
        seeded = data.get("seeded", {})
        print(f"Demo data seeded:")
        print(f"  - Client: {seeded.get('client', 0)}")
        print(f"  - Wallets: {seeded.get('wallets', 0)}")
        print(f"  - Transactions: {seeded.get('transactions', 0)}")
        print(f"  - OTC Leads: {seeded.get('otc_leads', 0)}")
        print(f"  - OTC Deals: {seeded.get('otc_deals', 0)}")
        print(f"  - Deposits: {seeded.get('deposits', 0)}")
    
    def test_10_demo_mode_otc_clients(self):
        """Test GET /api/otc/clients filters by demo mode"""
        # Test with demo mode ON
        status = self.session.get(f"{BASE_URL}/api/demo/status")
        if status.status_code == 200 and not status.json().get("demo_mode"):
            self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        response_on = self.session.get(f"{BASE_URL}/api/otc/clients")
        assert response_on.status_code == 200, f"Expected 200, got {response_on.status_code}"
        
        clients_demo = response_on.json().get("clients", [])
        print(f"OTC clients in demo mode: {len(clients_demo)}")
        
        # All clients should have is_demo: true in demo mode
        for client in clients_demo:
            assert client.get("is_demo") == True, f"Client {client.get('id')} should have is_demo=True"
        
        # Toggle demo mode OFF
        self.session.post(f"{BASE_URL}/api/demo/toggle")
        
        response_off = self.session.get(f"{BASE_URL}/api/otc/clients")
        assert response_off.status_code == 200
        
        clients_real = response_off.json().get("clients", [])
        print(f"OTC clients in normal mode: {len(clients_real)}")
        
        # No clients should have is_demo: true when demo mode is OFF
        demo_clients = [c for c in clients_real if c.get("is_demo") == True]
        assert len(demo_clients) == 0, f"Found {len(demo_clients)} demo clients when demo mode is OFF"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
