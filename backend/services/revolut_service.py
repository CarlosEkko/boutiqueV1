"""
Revolut Business API Integration Service
Handles OAuth2 authentication and API calls for account/transaction management.
"""
import os
import time
import uuid
import logging
import httpx
import jwt
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CERT_PATH = Path(__file__).parent.parent / "certs" / "revolut_private.pem"

# Environment-based URLs
REVOLUT_URLS = {
    "production": {
        "api": "https://b2b.revolut.com/api/1.0",
        "auth": "https://business.revolut.com/app-confirm",
        "token": "https://b2b.revolut.com/api/1.0/auth/token",
    },
    "sandbox": {
        "api": "https://sandbox-b2b.revolut.com/api/1.0",
        "auth": "https://sandbox-business.revolut.com/app-confirm",
        "token": "https://sandbox-b2b.revolut.com/api/1.0/auth/token",
    },
}


class RevolutService:
    def __init__(self):
        self._db = None

    def set_db(self, database):
        self._db = database

    @property
    def db(self):
        return self._db

    @property
    def client_id(self):
        return os.environ.get("REVOLUT_CLIENT_ID", "")

    @property
    def redirect_uri(self):
        return os.environ.get("REVOLUT_REDIRECT_URI", "")

    @property
    def env(self):
        return os.environ.get("REVOLUT_ENV", "production")

    @property
    def urls(self):
        return REVOLUT_URLS.get(self.env, REVOLUT_URLS["production"])

    def _load_private_key(self):
        if CERT_PATH.exists():
            return CERT_PATH.read_text()
        raise FileNotFoundError(f"Revolut private key not found at {CERT_PATH}")

    def _create_client_assertion(self) -> str:
        """Create a signed JWT client assertion for Revolut OAuth2."""
        private_key = self._load_private_key()
        now = int(time.time())
        payload = {
            "iss": self.redirect_uri.split("://")[1].split("/")[0],
            "sub": self.client_id,
            "aud": "https://revolut.com",
            "iat": now,
            "exp": now + 2400,
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, private_key, algorithm="RS256")

    def get_authorization_url(self) -> str:
        """Get the URL to redirect the admin for Revolut authorization."""
        return (
            f"{self.urls['auth']}"
            f"?client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&response_type=code"
        )

    async def exchange_code(self, authorization_code: str) -> dict:
        """Exchange authorization code for access + refresh tokens."""
        assertion = self._create_client_assertion()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                self.urls["token"],
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                    "client_assertion": assertion,
                },
            )
            if resp.status_code != 200:
                logger.error(f"Token exchange failed: {resp.status_code} {resp.text}")
                return {"error": resp.text, "status": resp.status_code}

            tokens = resp.json()
            # Store tokens in DB
            await self._save_tokens(tokens)
            return {"success": True, "tokens_saved": True}

    async def refresh_access_token(self) -> str | None:
        """Refresh the access token using stored refresh_token."""
        stored = await self._get_tokens()
        if not stored or not stored.get("refresh_token"):
            return None

        assertion = self._create_client_assertion()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                self.urls["token"],
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": stored["refresh_token"],
                    "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                    "client_assertion": assertion,
                },
            )
            if resp.status_code != 200:
                logger.error(f"Token refresh failed: {resp.status_code} {resp.text}")
                return None

            tokens = resp.json()
            await self._save_tokens(tokens)
            return tokens.get("access_token")

    async def _get_access_token(self) -> str | None:
        """Get a valid access token, refreshing if expired."""
        stored = await self._get_tokens()
        if not stored:
            return None

        # Check if token is still valid (40 min lifetime, refresh at 35 min)
        saved_at = stored.get("saved_at", 0)
        if time.time() - saved_at > 2100:  # 35 minutes
            return await self.refresh_access_token()

        return stored.get("access_token")

    async def _save_tokens(self, tokens: dict):
        """Save tokens to database."""
        if self.db is None:
            return
        tokens["saved_at"] = time.time()
        tokens["saved_at_iso"] = datetime.now(timezone.utc).isoformat()
        await self.db.revolut_tokens.update_one(
            {"type": "oauth_tokens"},
            {"$set": {**tokens, "type": "oauth_tokens"}},
            upsert=True,
        )

    async def _get_tokens(self) -> dict | None:
        """Load tokens from database."""
        if self.db is None:
            return None
        doc = await self.db.revolut_tokens.find_one({"type": "oauth_tokens"}, {"_id": 0})
        return doc

    async def _api_call(self, method: str, endpoint: str, params: dict = None, json_data: dict = None) -> dict:
        """Make an authenticated API call to Revolut."""
        token = await self._get_access_token()
        if not token:
            return {"error": "Not authenticated. Complete OAuth flow first.", "authenticated": False}

        url = f"{self.urls['api']}{endpoint}"
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient(timeout=30) as client:
            if method == "GET":
                resp = await client.get(url, headers=headers, params=params)
            elif method == "POST":
                resp = await client.post(url, headers=headers, json=json_data)
            else:
                return {"error": f"Unsupported method: {method}"}

            if resp.status_code == 401:
                # Try refresh
                new_token = await self.refresh_access_token()
                if new_token:
                    headers["Authorization"] = f"Bearer {new_token}"
                    if method == "GET":
                        resp = await client.get(url, headers=headers, params=params)
                    else:
                        resp = await client.post(url, headers=headers, json=json_data)
                else:
                    return {"error": "Authentication expired. Re-authorize.", "authenticated": False}

            if resp.status_code >= 400:
                return {"error": resp.text, "status": resp.status_code}

            return resp.json()

    # ---- Public API Methods ----

    async def get_accounts(self) -> dict:
        """List all Revolut Business accounts."""
        return await self._api_call("GET", "/accounts")

    async def get_account(self, account_id: str) -> dict:
        """Get details for a specific account."""
        return await self._api_call("GET", f"/accounts/{account_id}")

    async def get_transactions(self, account_id: str = None, from_date: str = None, to_date: str = None, count: int = 50) -> dict:
        """List transactions, optionally filtered by account and date range."""
        params = {"count": min(count, 1000)}
        if account_id:
            params["account_id"] = account_id
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        return await self._api_call("GET", "/transactions", params=params)

    async def get_bank_details(self, account_id: str) -> dict:
        """Get bank details (IBAN, BIC, etc.) for a specific Revolut account."""
        return await self._api_call("GET", f"/accounts/{account_id}/bank-details")

    async def get_counterparties(self) -> dict:
        """List saved counterparties (beneficiaries)."""
        return await self._api_call("GET", "/counterparties")

    async def get_connection_status(self) -> dict:
        """Check if Revolut is properly connected."""
        tokens = await self._get_tokens()
        if not tokens:
            return {
                "connected": False,
                "status": "not_configured",
                "message": "OAuth não completado. Autorize a conexão.",
                "auth_url": self.get_authorization_url(),
            }

        saved_at = tokens.get("saved_at", 0)
        age_minutes = (time.time() - saved_at) / 60

        if age_minutes > 2400:  # refresh token expired (40h)
            return {
                "connected": False,
                "status": "expired",
                "message": "Sessão expirada. Re-autorize a conexão.",
                "auth_url": self.get_authorization_url(),
            }

        # Check webhook status
        webhook_status = None
        if self.db is not None:
            wh = await self.db.revolut_tokens.find_one({"type": "webhook_config"}, {"_id": 0})
            if wh:
                webhook_status = {"id": wh.get("webhook_id"), "url": wh.get("url"), "events": wh.get("events")}

        return {
            "connected": True,
            "status": "active",
            "message": "Revolut Business conectado",
            "last_auth": tokens.get("saved_at_iso"),
            "webhook": webhook_status,
        }

    # ---- Webhook Management (API v2) ----

    @property
    def _v2_base(self):
        if self.env == "sandbox":
            return "https://sandbox-b2b.revolut.com/api/2.0"
        return "https://b2b.revolut.com/api/2.0"

    async def _v2_call(self, method: str, endpoint: str, json_data: dict = None) -> dict:
        """Make authenticated call to Revolut API v2."""
        token = await self._get_access_token()
        if not token:
            return {"error": "Not authenticated", "authenticated": False}

        url = f"{self._v2_base}{endpoint}"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=30) as client:
            if method == "GET":
                resp = await client.get(url, headers=headers)
            elif method == "POST":
                resp = await client.post(url, headers=headers, json=json_data)
            elif method == "DELETE":
                resp = await client.delete(url, headers=headers)
            else:
                return {"error": f"Unsupported method"}

            if resp.status_code == 401:
                new_token = await self.refresh_access_token()
                if new_token:
                    headers["Authorization"] = f"Bearer {new_token}"
                    if method == "GET":
                        resp = await client.get(url, headers=headers)
                    elif method == "POST":
                        resp = await client.post(url, headers=headers, json=json_data)
                    elif method == "DELETE":
                        resp = await client.delete(url, headers=headers)
                else:
                    return {"error": "Auth expired", "authenticated": False}

            if resp.status_code == 204:
                return {"success": True}
            if resp.status_code >= 400:
                return {"error": resp.text, "status": resp.status_code}
            return resp.json()

    async def create_webhook(self, webhook_url: str) -> dict:
        """Register a webhook with Revolut for real-time deposit notifications."""
        result = await self._v2_call("POST", "/webhooks", {
            "url": webhook_url,
            "events": ["TransactionCreated", "TransactionStateChanged"],
        })
        if "error" not in result and result.get("id"):
            # Save webhook config
            if self.db is not None:
                await self.db.revolut_tokens.update_one(
                    {"type": "webhook_config"},
                    {"$set": {
                        "type": "webhook_config",
                        "webhook_id": result["id"],
                        "url": webhook_url,
                        "events": result.get("events", []),
                        "signing_secret": result.get("signing_secret", ""),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }},
                    upsert=True,
                )
        return result

    async def list_webhooks(self) -> dict:
        """List all registered webhooks."""
        return await self._v2_call("GET", "/webhooks")

    async def delete_webhook(self, webhook_id: str) -> dict:
        """Delete a webhook."""
        result = await self._v2_call("DELETE", f"/webhooks/{webhook_id}")
        if "error" not in result:
            if self.db is not None:
                await self.db.revolut_tokens.delete_one({"type": "webhook_config", "webhook_id": webhook_id})
        return result


# Global instance
revolut_service = RevolutService()
