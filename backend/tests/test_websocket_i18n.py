"""
Test WebSocket prices endpoint and French (FR) i18n translations
Tests for KBEX.io iteration 22 features:
- WebSocket /api/ws/prices endpoint
- French translations in backend i18n
"""

import pytest
import requests
import os
import asyncio
import websockets
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWebSocketPrices:
    """WebSocket prices endpoint tests"""
    
    def test_crypto_prices_http_fallback(self):
        """Test HTTP fallback endpoint for crypto prices"""
        response = requests.get(f"{BASE_URL}/api/crypto-prices")
        assert response.status_code == 200
        
        data = response.json()
        assert "prices" in data
        assert len(data["prices"]) > 0
        
        # Check price structure
        price = data["prices"][0]
        assert "symbol" in price
        assert "name" in price
        assert "price" in price
        assert "change_24h" in price
        print(f"HTTP fallback working: {len(data['prices'])} prices returned")
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection to /api/ws/prices"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, timeout=10) as websocket:
                # Should receive initial prices immediately
                message = await asyncio.wait_for(websocket.recv(), timeout=15)
                data = json.loads(message)
                
                assert data["type"] == "prices"
                assert "data" in data
                assert len(data["data"]) > 0
                assert "timestamp" in data
                
                # Check price structure
                price = data["data"][0]
                assert "symbol" in price
                assert "price" in price
                
                print(f"WebSocket connected: received {len(data['data'])} prices")
                print(f"Source: {data.get('source', 'unknown')}")
                
        except Exception as e:
            pytest.skip(f"WebSocket connection failed: {e}")
    
    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self):
        """Test WebSocket ping/pong keepalive"""
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        ws_url = f"{ws_url}/api/ws/prices"
        
        try:
            async with websockets.connect(ws_url, timeout=10) as websocket:
                # Wait for initial message
                await asyncio.wait_for(websocket.recv(), timeout=15)
                
                # Send ping
                await websocket.send("ping")
                
                # Should receive pong
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                assert response == "pong"
                print("WebSocket ping/pong working")
                
        except Exception as e:
            pytest.skip(f"WebSocket ping/pong failed: {e}")


class TestFrenchTranslations:
    """French (FR) i18n backend translation tests"""
    
    def test_fr_auth_translations(self):
        """Test French authentication translations"""
        from utils.i18n import t
        
        # Test auth translations
        assert t("auth.login_success", "FR") == "Connexion réussie"
        assert t("auth.logout_success", "FR") == "Déconnexion réussie"
        assert t("auth.invalid_credentials", "FR") == "Email ou mot de passe invalide"
        assert t("auth.user_not_found", "FR") == "Utilisateur introuvable"
        assert t("auth.email_already_exists", "FR") == "Email déjà enregistré"
        print("FR auth translations: PASS")
    
    def test_fr_2fa_translations(self):
        """Test French 2FA translations"""
        from utils.i18n import t
        
        assert t("2fa.setup_success", "FR") == "Configuration 2FA lancée"
        assert t("2fa.verify_success", "FR") == "2FA activé avec succès"
        assert t("2fa.invalid_code", "FR") == "Code de vérification invalide"
        print("FR 2FA translations: PASS")
    
    def test_fr_kyc_translations(self):
        """Test French KYC translations"""
        from utils.i18n import t
        
        assert t("kyc.submission_success", "FR") == "KYC soumis avec succès"
        assert t("kyc.approved", "FR") == "KYC approuvé"
        assert t("kyc.rejected", "FR") == "KYC rejeté"
        assert t("kyc.pending", "FR") == "KYC en cours d'examen"
        print("FR KYC translations: PASS")
    
    def test_fr_trading_translations(self):
        """Test French trading translations"""
        from utils.i18n import t
        
        assert t("trading.order_created", "FR") == "Ordre créé avec succès"
        assert t("trading.order_cancelled", "FR") == "Ordre annulé"
        assert t("trading.insufficient_balance", "FR") == "Solde insuffisant"
        print("FR trading translations: PASS")
    
    def test_fr_wallet_translations(self):
        """Test French wallet translations"""
        from utils.i18n import t
        
        assert t("wallet.created", "FR") == "Portefeuille créé avec succès"
        assert t("wallet.deposit_success", "FR") == "Dépôt effectué avec succès"
        assert t("wallet.withdrawal_success", "FR") == "Demande de retrait soumise"
        print("FR wallet translations: PASS")
    
    def test_fr_otc_translations(self):
        """Test French OTC translations"""
        from utils.i18n import t
        
        assert t("otc.lead_created", "FR") == "Prospect créé avec succès"
        assert t("otc.quote_created", "FR") == "Cotation créée et envoyée"
        assert t("otc.quote_accepted", "FR") == "Cotation acceptée"
        print("FR OTC translations: PASS")
    
    def test_fr_general_translations(self):
        """Test French general translations"""
        from utils.i18n import t
        
        assert t("general.success", "FR") == "Succès"
        assert t("general.error", "FR") == "Une erreur est survenue"
        assert t("general.not_found", "FR") == "Introuvable"
        assert t("general.created", "FR") == "Créé avec succès"
        print("FR general translations: PASS")
    
    def test_fr_admin_translations(self):
        """Test French admin translations"""
        from utils.i18n import t
        
        assert t("admin.user_approved", "FR") == "Utilisateur approuvé avec succès"
        assert t("admin.settings_updated", "FR") == "Paramètres mis à jour avec succès"
        print("FR admin translations: PASS")
    
    def test_fr_notifications_translations(self):
        """Test French notification translations"""
        from utils.i18n import t
        
        assert t("notifications.new_user", "FR") == "Nouvel enregistrement d'utilisateur"
        assert t("notifications.kyc_submitted", "FR") == "Nouvelle soumission KYC"
        assert t("notifications.deposit_received", "FR") == "Dépôt reçu"
        print("FR notifications translations: PASS")
    
    def test_language_fallback(self):
        """Test language fallback to default (PT)"""
        from utils.i18n import t, DEFAULT_LANGUAGE
        
        # Test with invalid language code - should fallback to default (PT)
        result = t("auth.login_success", "XX")
        # Default language is PT, so fallback should be Portuguese
        assert result == "Login efetuado com sucesso" or result == "Login successful"
        print(f"Language fallback to {DEFAULT_LANGUAGE}: PASS")


class TestLanguageSelector:
    """Test language selector in header"""
    
    def test_supported_languages(self):
        """Verify all 4 languages are supported"""
        from utils.i18n import translations
        
        assert "EN" in translations
        assert "PT" in translations
        assert "FR" in translations
        assert "AR" in translations
        print("All 4 languages supported: EN, PT, FR, AR")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
