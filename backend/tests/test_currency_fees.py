"""
Per-Currency Trading Fees API Tests
Tests for individualized trading fees per fiat currency (EUR, USD, AED, BRL)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "carlos@kryptobox.io"
ADMIN_PASSWORD = "senha123"

SUPPORTED_CURRENCIES = ["EUR", "USD", "AED", "BRL"]


class TestCurrencyFeesAPI:
    """Tests for per-currency fee management API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_all_fees_returns_fees_by_currency(self):
        """GET /api/trading/admin/fees should return fees_by_currency with all 4 currencies"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify fees_by_currency exists
        assert "fees_by_currency" in data, "Response missing fees_by_currency field"
        fees_by_currency = data["fees_by_currency"]
        
        # Verify all 4 currencies are present
        for currency in SUPPORTED_CURRENCIES:
            assert currency in fees_by_currency, f"Missing currency: {currency}"
            currency_fees = fees_by_currency[currency]
            
            # Verify required fee fields exist
            assert "buy_fee_percent" in currency_fees
            assert "sell_fee_percent" in currency_fees
            assert "swap_fee_percent" in currency_fees
            assert "buy_spread_percent" in currency_fees
            assert "sell_spread_percent" in currency_fees
            assert "swap_spread_percent" in currency_fees
            assert "min_buy_fee" in currency_fees
            assert "min_sell_fee" in currency_fees
            assert "min_swap_fee" in currency_fees
    
    def test_get_eur_fees(self):
        """GET /api/trading/admin/fees/EUR should return EUR-specific fees"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "EUR"
        assert "fees" in data
        fees = data["fees"]
        
        # Verify fee values are valid numbers
        assert isinstance(fees["buy_fee_percent"], (int, float))
        assert isinstance(fees["sell_fee_percent"], (int, float))
        assert isinstance(fees["swap_fee_percent"], (int, float))
    
    def test_get_usd_fees(self):
        """GET /api/trading/admin/fees/USD should return USD-specific fees"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/USD",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "USD"
        assert "fees" in data
    
    def test_get_aed_fees(self):
        """GET /api/trading/admin/fees/AED should return AED-specific fees"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/AED",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "AED"
        assert "fees" in data
    
    def test_get_brl_fees(self):
        """GET /api/trading/admin/fees/BRL should return BRL-specific fees"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/BRL",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "BRL"
        assert "fees" in data
    
    def test_get_unsupported_currency_fails(self):
        """GET /api/trading/admin/fees/XYZ should return 400 for unsupported currency"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/XYZ",
            headers=self.headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "not supported" in data.get("detail", "").lower() or "currency" in data.get("detail", "").lower()
    
    def test_update_eur_buy_fee(self):
        """PUT /api/trading/admin/fees/EUR should update EUR buy fee"""
        # Get original value
        original = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers
        ).json()
        original_buy_fee = original["fees"]["buy_fee_percent"]
        
        # Update to new value
        new_buy_fee = 2.5 if original_buy_fee != 2.5 else 2.0
        response = requests.put(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers,
            json={"buy_fee_percent": new_buy_fee}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "EUR" in data["message"]
        
        # Verify update persisted
        verify = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers
        ).json()
        assert verify["fees"]["buy_fee_percent"] == new_buy_fee
        
        # Restore original value
        requests.put(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers,
            json={"buy_fee_percent": original_buy_fee}
        )
    
    def test_update_brl_multiple_fees(self):
        """PUT /api/trading/admin/fees/BRL should update multiple BRL fees at once"""
        response = requests.put(
            f"{BASE_URL}/api/trading/admin/fees/BRL",
            headers=self.headers,
            json={
                "buy_fee_percent": 3.5,
                "sell_fee_percent": 3.5,
                "min_buy_fee": 30.0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        # Verify all fields updated
        verify = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/BRL",
            headers=self.headers
        ).json()
        assert verify["fees"]["buy_fee_percent"] == 3.5
        assert verify["fees"]["sell_fee_percent"] == 3.5
        assert verify["fees"]["min_buy_fee"] == 30.0
    
    def test_update_aed_swap_fees(self):
        """PUT /api/trading/admin/fees/AED should update AED swap fees"""
        response = requests.put(
            f"{BASE_URL}/api/trading/admin/fees/AED",
            headers=self.headers,
            json={
                "swap_fee_percent": 2.2,
                "swap_spread_percent": 0.5
            }
        )
        
        assert response.status_code == 200
        
        # Verify update
        verify = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/AED",
            headers=self.headers
        ).json()
        assert verify["fees"]["swap_fee_percent"] == 2.2
        assert verify["fees"]["swap_spread_percent"] == 0.5
    
    def test_currencies_have_different_fees(self):
        """Different currencies should have different default fees (based on model defaults)"""
        eur_fees = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers
        ).json()["fees"]
        
        brl_fees = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/BRL",
            headers=self.headers
        ).json()["fees"]
        
        # BRL typically has higher fees due to market conditions
        # At least one fee value should differ
        fees_differ = (
            eur_fees["buy_fee_percent"] != brl_fees["buy_fee_percent"] or
            eur_fees["min_buy_fee"] != brl_fees["min_buy_fee"]
        )
        assert fees_differ, "EUR and BRL fees should have different values"
    
    def test_unauthenticated_access_fails(self):
        """GET /api/trading/admin/fees without auth should return 401 or 403"""
        response = requests.get(
            f"{BASE_URL}/api/trading/admin/fees",
            headers={"Content-Type": "application/json"}
        )
        
        # Both 401 (Unauthorized) and 403 (Forbidden) are acceptable
        assert response.status_code in [401, 403]
    
    def test_public_fees_endpoint_returns_currency_fees(self):
        """GET /api/trading/fees?currency=BRL should return BRL-specific fees (public)"""
        response = requests.get(
            f"{BASE_URL}/api/trading/fees?currency=BRL"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["currency"] == "BRL"
        assert "buy_fee_percent" in data
        assert "sell_fee_percent" in data
        assert "swap_fee_percent" in data


class TestCurrencyFeesDataIntegrity:
    """Tests for data integrity of per-currency fees"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and get token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_fee_values_are_valid_percentages(self):
        """All fee percentages should be valid (0-100)"""
        for currency in SUPPORTED_CURRENCIES:
            response = requests.get(
                f"{BASE_URL}/api/trading/admin/fees/{currency}",
                headers=self.headers
            )
            fees = response.json()["fees"]
            
            # Check all percentage fields
            percentage_fields = [
                "buy_fee_percent", "sell_fee_percent", "swap_fee_percent",
                "buy_spread_percent", "sell_spread_percent", "swap_spread_percent"
            ]
            
            for field in percentage_fields:
                value = fees[field]
                assert 0 <= value <= 100, f"{currency} {field} should be 0-100, got {value}"
    
    def test_min_fees_are_positive(self):
        """All minimum fees should be positive numbers"""
        for currency in SUPPORTED_CURRENCIES:
            response = requests.get(
                f"{BASE_URL}/api/trading/admin/fees/{currency}",
                headers=self.headers
            )
            fees = response.json()["fees"]
            
            min_fee_fields = ["min_buy_fee", "min_sell_fee", "min_swap_fee"]
            
            for field in min_fee_fields:
                value = fees[field]
                assert value >= 0, f"{currency} {field} should be >= 0, got {value}"
    
    def test_updating_one_currency_doesnt_affect_others(self):
        """Updating EUR fees should not affect USD fees"""
        # Get original USD fees
        original_usd = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/USD",
            headers=self.headers
        ).json()["fees"]
        
        # Update EUR fees
        requests.put(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers,
            json={"buy_fee_percent": 9.9}
        )
        
        # Verify USD fees unchanged
        after_usd = requests.get(
            f"{BASE_URL}/api/trading/admin/fees/USD",
            headers=self.headers
        ).json()["fees"]
        
        assert original_usd["buy_fee_percent"] == after_usd["buy_fee_percent"]
        assert original_usd["sell_fee_percent"] == after_usd["sell_fee_percent"]
        
        # Cleanup - restore EUR
        requests.put(
            f"{BASE_URL}/api/trading/admin/fees/EUR",
            headers=self.headers,
            json={"buy_fee_percent": 2.0}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
