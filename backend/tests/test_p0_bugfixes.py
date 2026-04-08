"""
Test P0 Bug Fixes - Iteration 40
Tests for:
1. AED currency symbol fix (frontend - verified via Playwright)
2. Trustfull Risk API key fix (backend)
3. Safari cursor bug fix (frontend - verified via Playwright)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrustfullAPI:
    """Test Trustfull Risk API integration"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_login_works(self):
        """Test login endpoint works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"PASS: Login successful, access_token received")
    
    def test_otc_leads_list(self, auth_token):
        """Test OTC leads list endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/leads", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # API returns paginated response with 'leads' key
        assert "leads" in data
        leads = data["leads"]
        assert isinstance(leads, list)
        print(f"PASS: OTC leads list returned {len(leads)} leads (total: {data.get('total', 'N/A')})")
        return leads
    
    def test_risk_scan_endpoint_exists(self, auth_token):
        """Test that risk-scan endpoint exists and responds"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # First get a lead to test with
        leads_response = requests.get(f"{BASE_URL}/api/otc/leads", headers=headers)
        if leads_response.status_code != 200:
            pytest.skip("Could not fetch leads")
        
        data = leads_response.json()
        leads = data.get("leads", [])
        if not leads:
            pytest.skip("No leads available for testing")
        
        # Get first lead with email
        test_lead = None
        for lead in leads:
            if isinstance(lead, dict) and lead.get("email"):
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("No leads with email found")
        
        lead_id = test_lead.get("id")
        print(f"Testing risk-scan for lead: {lead_id}")
        
        # Test the risk-scan endpoint
        response = requests.post(
            f"{BASE_URL}/api/otc/leads/{lead_id}/risk-scan",
            headers=headers
        )
        
        # Should return 200 or 400 (if already scanned) - not 500
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}, body: {response.text[:200]}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Risk scan returned data: {list(data.keys())}")
            # Verify the response has expected structure
            assert "email_risk" in data or "combined_score" in data or "risk_level" in data
        elif response.status_code == 400:
            print(f"INFO: Lead already has risk scan or validation error: {response.text[:100]}")
        elif response.status_code == 404:
            print(f"INFO: Lead not found (may have been deleted)")


class TestDashboardEndpoints:
    """Test dashboard endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_dashboard_overview(self, auth_token):
        """Test dashboard overview endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=headers)
        assert response.status_code == 200
        print("PASS: Dashboard overview endpoint works")
    
    def test_dashboard_wallets(self, auth_token):
        """Test dashboard wallets endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/wallets", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check for fiat wallets including AED
        fiat_assets = [w.get("asset_id") for w in data if w.get("asset_id") in ["EUR", "USD", "AED", "BRL"]]
        print(f"PASS: Wallets endpoint returned {len(data)} wallets, fiat: {fiat_assets}")
    
    def test_exchange_rates(self, auth_token):
        """Test exchange rates endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/trading/exchange-rates", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "rates" in data
        rates = data["rates"]
        # Check AED rate exists
        assert "AED" in rates, "AED rate should be present"
        print(f"PASS: Exchange rates include AED: {rates.get('AED')}")


class TestOTCDeskEndpoints:
    """Test OTC Desk endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kbex.io",
            "password": "senha123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_otc_leads_endpoint(self, auth_token):
        """Test OTC leads endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/leads", headers=headers)
        assert response.status_code == 200
        print("PASS: OTC leads endpoint works")
    
    def test_otc_tiers_endpoint(self, auth_token):
        """Test OTC tiers endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/otc/tiers", headers=headers)
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"INFO: OTC tiers endpoint returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
