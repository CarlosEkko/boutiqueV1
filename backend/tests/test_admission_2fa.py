"""
Test Suite for Admission Fee by Tier and 2FA System
Tests:
- Admission fee settings by tier (Standard/Premium/VIP)
- 2FA setup, verify, status endpoints
- USDT TRC20 Fireblocks mapping
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAdmissionFeesAndReferralSettings:
    """Test admission fee configuration by client tier"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_referral_settings_returns_tier_fees(self):
        """GET /api/referrals/settings should return fees by tier (standard, premium, vip)"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check admission_fee structure has all tier fields
        admission_fee = data.get("admission_fee", {})
        
        # Standard tier
        assert "standard_eur" in admission_fee, "Missing standard_eur"
        assert "standard_usd" in admission_fee, "Missing standard_usd"
        assert "standard_aed" in admission_fee, "Missing standard_aed"
        assert "standard_brl" in admission_fee, "Missing standard_brl"
        
        # Premium tier
        assert "premium_eur" in admission_fee, "Missing premium_eur"
        assert "premium_usd" in admission_fee, "Missing premium_usd"
        assert "premium_aed" in admission_fee, "Missing premium_aed"
        assert "premium_brl" in admission_fee, "Missing premium_brl"
        
        # VIP tier
        assert "vip_eur" in admission_fee, "Missing vip_eur"
        assert "vip_usd" in admission_fee, "Missing vip_usd"
        assert "vip_aed" in admission_fee, "Missing vip_aed"
        assert "vip_brl" in admission_fee, "Missing vip_brl"
        
        # General settings
        assert "is_active" in admission_fee, "Missing is_active"
        assert "grace_period_days" in admission_fee, "Missing grace_period_days"
        
        # Check referral_fees are also returned
        referral_fees = data.get("referral_fees", {})
        assert "trading_fee_percent" in referral_fees
        assert "deposit_fee_percent" in referral_fees
        assert "withdrawal_fee_percent" in referral_fees
    
    def test_update_admission_fee_by_tier(self):
        """PUT /api/referrals/settings/admission-fee should accept tier values"""
        # Update with new values
        update_data = {
            "standard_eur": 600,
            "standard_usd": 660,
            "standard_aed": 2400,
            "standard_brl": 3300,
            "premium_eur": 3000,
            "premium_usd": 3300,
            "premium_aed": 12000,
            "premium_brl": 16500,
            "vip_eur": 12000,
            "vip_usd": 13200,
            "vip_aed": 48000,
            "vip_brl": 66000,
            "is_active": True,
            "grace_period_days": 10
        }
        
        response = requests.put(
            f"{BASE_URL}/api/referrals/settings/admission-fee",
            json=update_data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        
        # Verify changes persisted
        verify_response = requests.get(f"{BASE_URL}/api/referrals/settings", headers=self.headers)
        assert verify_response.status_code == 200
        
        admission_fee = verify_response.json().get("admission_fee", {})
        assert admission_fee.get("standard_eur") == 600
        assert admission_fee.get("premium_eur") == 3000
        assert admission_fee.get("vip_eur") == 12000
        assert admission_fee.get("grace_period_days") == 10
        
        # Restore original values
        restore_data = {
            "standard_eur": 500,
            "standard_usd": 550,
            "standard_aed": 2000,
            "standard_brl": 2750,
            "premium_eur": 2500,
            "premium_usd": 2750,
            "premium_aed": 10000,
            "premium_brl": 13750,
            "vip_eur": 10000,
            "vip_usd": 11000,
            "vip_aed": 40000,
            "vip_brl": 55000,
            "is_active": True,
            "grace_period_days": 7
        }
        requests.put(f"{BASE_URL}/api/referrals/settings/admission-fee", json=restore_data, headers=self.headers)


class TestTwoFactorAuthentication:
    """Test 2FA system endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@kryptobox.io",
            "password": os.getenv("TEST_ADMIN_PASSWORD", "senha123")
        })
        assert response.status_code == 200, "Admin login failed"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_2fa_status_endpoint(self):
        """GET /api/auth/2fa/status should return 2FA enabled status"""
        response = requests.get(f"{BASE_URL}/api/auth/2fa/status", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert isinstance(data["enabled"], bool)
    
    def test_2fa_setup_returns_secret_and_qr(self):
        """POST /api/auth/2fa/setup should generate secret and QR code"""
        response = requests.post(f"{BASE_URL}/api/auth/2fa/setup", headers=self.headers)
        
        # May return 400 if 2FA already enabled
        if response.status_code == 400:
            data = response.json()
            assert "já está ativo" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        else:
            assert response.status_code == 200
            data = response.json()
            
            # Verify secret is returned
            assert "secret" in data
            assert len(data["secret"]) > 0
            
            # Verify QR code is returned as base64 PNG
            assert "qr_code" in data
            assert data["qr_code"].startswith("data:image/png;base64,")
    
    def test_2fa_verify_rejects_invalid_code(self):
        """POST /api/auth/2fa/verify should reject invalid TOTP code"""
        response = requests.post(
            f"{BASE_URL}/api/auth/2fa/verify",
            json={"code": "000000"},
            headers=self.headers
        )
        
        # Should be 400 Bad Request for invalid code
        assert response.status_code == 400
        data = response.json()
        assert "inválido" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower() or "not initiated" in data.get("detail", "").lower()
    
    def test_2fa_requires_authentication(self):
        """2FA endpoints should require authentication"""
        # Test without token
        response = requests.get(f"{BASE_URL}/api/auth/2fa/status")
        assert response.status_code in [401, 403]
        
        response = requests.post(f"{BASE_URL}/api/auth/2fa/setup")
        assert response.status_code in [401, 403]
        
        response = requests.post(f"{BASE_URL}/api/auth/2fa/verify", json={"code": "123456"})
        assert response.status_code in [401, 403]


class TestUSDTFireblocksMapping:
    """Test USDT TRC20 Fireblocks mapping correction"""
    
    def test_usdt_trc20_has_correct_fireblocks_id(self):
        """GET /api/crypto-wallets/networks/USDT should show TRC20 with TRX_USDT_S2UZ"""
        response = requests.get(f"{BASE_URL}/api/crypto-wallets/networks/USDT")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check USDT is multi-network
        assert data.get("asset") == "USDT"
        assert data.get("is_multi_network") is True
        
        # Find TRC20 network
        networks = data.get("networks", [])
        trc20_network = None
        for net in networks:
            if net.get("network") == "TRC20":
                trc20_network = net
                break
        
        assert trc20_network is not None, "TRC20 network not found"
        
        # Verify the fireblocks_id is TRX_USDT_S2UZ (corrected from USDT_TRX)
        assert trc20_network.get("fireblocks_id") == "TRX_USDT_S2UZ", \
            f"Expected TRX_USDT_S2UZ but got {trc20_network.get('fireblocks_id')}"
        
        # Verify network name and explorer
        assert trc20_network.get("name") == "Tron (TRC20)"
        assert "tronscan.org" in trc20_network.get("explorer", "")
    
    def test_usdt_has_multiple_networks(self):
        """USDT should support multiple networks"""
        response = requests.get(f"{BASE_URL}/api/crypto-wallets/networks/USDT")
        assert response.status_code == 200
        
        data = response.json()
        networks = data.get("networks", [])
        
        # Should have at least ERC20, TRC20, BEP20
        network_ids = [n.get("network") for n in networks]
        assert "ERC20" in network_ids
        assert "TRC20" in network_ids
        assert "BEP20" in network_ids
        
        # Check at least 5 networks are available
        assert len(networks) >= 5


class TestReferralSettingsRequiresAdmin:
    """Test that referral settings endpoints require admin access"""
    
    def test_referral_settings_requires_auth(self):
        """GET /api/referrals/settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings")
        assert response.status_code in [401, 403]
    
    def test_admission_fee_update_requires_admin(self):
        """PUT /api/referrals/settings/admission-fee requires admin role"""
        response = requests.put(
            f"{BASE_URL}/api/referrals/settings/admission-fee",
            json={"standard_eur": 500}
        )
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
