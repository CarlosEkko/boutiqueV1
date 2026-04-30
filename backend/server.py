from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import asyncio

# Add backend to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent))

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "kyc").mkdir(parents=True, exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and configure auth routes
from routes.auth import router as auth_router, set_db as set_auth_db
from routes.dashboard import router as dashboard_router, set_db as set_dashboard_db
from routes.admin import router as admin_router, set_db as set_admin_db
from routes.kyc import router as kyc_router, set_db as set_kyc_db
from routes.fireblocks import router as fireblocks_router
from routes.tickets import router as tickets_router, set_db as set_tickets_db
from routes.trading import router as trading_router, set_db as set_trading_db
from routes.uploads import router as uploads_router, set_db as set_uploads_db
from routes.crypto_wallets import router as crypto_wallets_router, set_db as set_crypto_wallets_db
from routes.knowledge_base import router as kb_router, set_db as set_kb_db
from routes.permissions import router as permissions_router, set_db as set_permissions_db
from routes.crm import router as crm_router, set_db as set_crm_db
from routes.referrals import router as referrals_router, set_db as set_referrals_db
from routes.otc import router as otc_router, set_db as set_otc_db
from routes.bank_accounts import router as bank_accounts_router, set_db as set_bank_accounts_db
from routes.company_bank_accounts import router as company_bank_accounts_router, set_db as set_company_bank_accounts_db
from routes.client_menus import router as client_menus_router, set_db as set_client_menus_db
from routes.notifications import router as notifications_router, set_db as set_notifications_db
from routes.sumsub import router as sumsub_router, set_db as set_sumsub_db
from routes.webhooks import router as webhooks_router, set_db as set_webhooks_db
from routes.team_hub import router as team_hub_router, set_db as set_team_hub_db
from routes.microsoft365 import router as o365_router, set_db as set_o365_db
from routes.approvals import router as approvals_router, set_db as set_approvals_db
from routes.multisign import router as multisign_router, set_db as set_multisign_db
from routes.websocket_prices import router as ws_prices_router
from routes.finance import router as finance_router, set_db as set_finance_db
from routes.omnibus import router as omnibus_router, set_db as set_omnibus_db
from routes.admin_multisign import router as admin_multisign_router, set_db as set_admin_multisign_db
from routes.otc_deals import router as otc_deals_router, set_db as set_otc_deals_db
from routes.risk_compliance import router as risk_compliance_router, set_db as set_risk_compliance_db
from routes.staking import router as staking_router, set_db as set_staking_db
from routes.tokenization import router as tokenization_router, set_db as set_tokenization_db
from routes.security import router as security_router, set_db as set_security_db
from routes.demo import router as demo_router, set_db as set_demo_db
from routes.escrow import router as escrow_router, set_db as set_escrow_db
from routes.inflation import router as inflation_router
from routes.kbex_rates import router as kbex_rates_router, set_db as set_kbex_rates_db
from routes.revolut import router as revolut_router, set_db as set_revolut_db
from routes.cold_wallet import router as cold_wallet_router, set_db as set_cold_wallet_db
from routes.launchpad import router as launchpad_router, set_db as set_launchpad_db
from routes.commercial import router as commercial_router, set_db as set_commercial_db
from routes.business_accounts import router as business_accounts_router, set_db as set_business_accounts_db
from routes.client_tiers import router as client_tiers_router, set_db as set_client_tiers_db
from routes.billing import router as billing_router, set_db as set_billing_db
from routes.cookie_consent import router as cookie_consent_router, set_db as set_cookie_consent_db
from routes.public_status import router as public_status_router, set_db as set_public_status_db
from routes.price_alerts import router as price_alerts_router, set_db as set_price_alerts_db, start_alert_worker
from routes.tenants import router as tenants_router
from routes.stripe_payments import router as stripe_router, set_db as set_stripe_db, _stripe_webhook_handler
from utils.security_logger import set_db as set_security_logger_db, is_ip_blacklisted, log_security_event

set_auth_db(db)
set_dashboard_db(db)
set_admin_db(db)
set_kyc_db(db)
set_tickets_db(db)
set_trading_db(db)
set_uploads_db(db)
set_crypto_wallets_db(db)
set_kb_db(db)
set_permissions_db(db)
set_referrals_db(db)
set_otc_db(db)
set_bank_accounts_db(db)
set_company_bank_accounts_db(db)
set_client_menus_db(db)
set_notifications_db(db)
set_sumsub_db(db)
set_webhooks_db(db)
set_team_hub_db(db)
set_o365_db(db)
set_approvals_db(db)
set_multisign_db(db)
set_finance_db(db)
set_omnibus_db(db)
set_admin_multisign_db(db)
set_otc_deals_db(db)
set_risk_compliance_db(db)
set_security_db(db)
set_demo_db(db)
set_escrow_db(db)
set_staking_db(db)
set_security_logger_db(db)
set_kbex_rates_db(db)
set_revolut_db(db)
set_cold_wallet_db(db)
set_launchpad_db(db)
set_commercial_db(db)
set_business_accounts_db(db)
set_client_tiers_db(db)
set_billing_db(db)
set_cookie_consent_db(db)
set_public_status_db(db)
set_price_alerts_db(db)
set_stripe_db(db)
set_crm_db(db)
set_tokenization_db(db)

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(admin_router)
api_router.include_router(kyc_router)
api_router.include_router(fireblocks_router)
api_router.include_router(tickets_router)
api_router.include_router(trading_router)
api_router.include_router(uploads_router)
api_router.include_router(crypto_wallets_router)
api_router.include_router(kb_router)
api_router.include_router(permissions_router)
api_router.include_router(crm_router)
api_router.include_router(referrals_router)
api_router.include_router(otc_router)
api_router.include_router(bank_accounts_router)
api_router.include_router(company_bank_accounts_router)
api_router.include_router(client_menus_router)
api_router.include_router(notifications_router)
api_router.include_router(sumsub_router)
api_router.include_router(webhooks_router)
api_router.include_router(team_hub_router)
api_router.include_router(o365_router)
api_router.include_router(approvals_router)
api_router.include_router(multisign_router)
api_router.include_router(ws_prices_router)
api_router.include_router(finance_router)
api_router.include_router(omnibus_router)
api_router.include_router(admin_multisign_router)
api_router.include_router(otc_deals_router)
api_router.include_router(risk_compliance_router)
api_router.include_router(staking_router)
api_router.include_router(tokenization_router)
api_router.include_router(security_router)
api_router.include_router(demo_router)
api_router.include_router(escrow_router)
api_router.include_router(inflation_router)
api_router.include_router(kbex_rates_router)
api_router.include_router(revolut_router)
api_router.include_router(cold_wallet_router)
api_router.include_router(launchpad_router)
api_router.include_router(commercial_router)
api_router.include_router(business_accounts_router)
api_router.include_router(client_tiers_router)
api_router.include_router(billing_router)
api_router.include_router(cookie_consent_router)
api_router.include_router(public_status_router)
api_router.include_router(price_alerts_router)
# tenants_router has its own /api prefix, register on app directly (below)


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.get("/health")
async def health_check():
    """Liveness probe for Docker healthcheck / nginx retry / external monitors.
    Always returns 200 if the process is alive. Kept intentionally cheap — no DB call.
    """
    return {"status": "ok", "service": "kbex-backend"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ==================== CRYPTO PRICES API ====================

class CryptoPrice(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    market_cap: Optional[float] = None
    volume_24h: Optional[float] = None

class CryptoPricesResponse(BaseModel):
    prices: List[CryptoPrice]
    last_updated: datetime
    source: str = "binance"

# Cache for crypto prices
crypto_cache: Dict[str, Any] = {
    "data": None,
    "last_fetch": None,
    "cache_duration": 60  # Cache for 60 seconds
}

# Binance API configuration
BINANCE_API_URL = "https://api.binance.com/api/v3"

# Crypto symbols with names
CRYPTO_SYMBOLS_MAP = {
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
    "ADA": "Cardano",
    "SOL": "Solana",
    "XRP": "XRP",
    "BNB": "BNB",
    "DOGE": "Dogecoin",
    "DOT": "Polkadot"
}

async def fetch_crypto_prices() -> List[CryptoPrice]:
    """Fetch crypto prices from Binance API"""
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            # Get all 24h tickers from Binance
            response = await client.get(f"{BINANCE_API_URL}/ticker/24hr")
            response.raise_for_status()
            all_tickers = response.json()
            
            # Create a map of USDT pairs
            binance_prices = {}
            for ticker in all_tickers:
                binance_symbol = ticker.get("symbol", "")
                if binance_symbol.endswith("USDT"):
                    base_symbol = binance_symbol[:-4]
                    binance_prices[base_symbol] = ticker
            
            prices = []
            for symbol, name in CRYPTO_SYMBOLS_MAP.items():
                ticker_data = binance_prices.get(symbol)
                
                if ticker_data:
                    price = float(ticker_data.get("lastPrice", 0))
                    volume = float(ticker_data.get("volume", 0)) * price
                    
                    prices.append(CryptoPrice(
                        symbol=symbol,
                        name=name,
                        price=price,
                        change_24h=float(ticker_data.get("priceChangePercent", 0)),
                        market_cap=None,  # Binance doesn't provide market cap
                        volume_24h=volume
                    ))
            
            return prices
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching crypto prices from Binance: {e}")
            raise HTTPException(status_code=503, detail="Unable to fetch crypto prices")
        except httpx.RequestError as e:
            logger.error(f"Request error fetching crypto prices: {e}")
            raise HTTPException(status_code=503, detail="Unable to fetch crypto prices")
        except Exception as e:
            logger.error(f"Unexpected error fetching crypto prices: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/crypto-prices", response_model=CryptoPricesResponse)
async def get_crypto_prices():
    """
    Get current crypto prices using the unified price source (MongoDB cache).
    This ensures all pages show the same prices.
    """
    from routes.trading import get_bulk_crypto_prices, DEFAULT_CRYPTOS
    
    current_time = datetime.now(timezone.utc)
    
    # Get all default crypto symbols
    symbols = [c["symbol"] for c in DEFAULT_CRYPTOS]
    
    try:
        # Use the same source as Exchange/Trading pages
        cached_prices = await get_bulk_crypto_prices(symbols)
        
        # Convert to CryptoPrice format
        prices = []
        for symbol, data in cached_prices.items():
            prices.append(CryptoPrice(
                symbol=data.get("symbol", symbol),
                name=data.get("name", symbol),
                price=data.get("price_usd", 0),
                change_24h=data.get("change_24h", 0),
                market_cap=data.get("market_cap"),
                volume_24h=data.get("volume_24h", 0)
            ))
        
        # Sort by a common order (BTC, ETH first, then alphabetically)
        priority = {"BTC": 0, "ETH": 1}
        prices.sort(key=lambda x: (priority.get(x.symbol, 100), x.symbol))
        
        return CryptoPricesResponse(
            prices=prices,
            last_updated=current_time,
            source="market"
        )
    except Exception as e:
        logger.error(f"Error fetching crypto prices: {e}")
        # Fallback to direct Binance call
        prices = await fetch_crypto_prices()
        return CryptoPricesResponse(
            prices=prices,
            last_updated=current_time,
            source="market"
        )

# Include the router in the main app
app.include_router(api_router)
app.include_router(tenants_router)
app.include_router(stripe_router)

# Stripe webhook endpoint — Stripe POSTs to /api/webhook/stripe on checkout
# events. Must be signature-verified; delegates to the stripe_payments module.
@app.post("/api/webhook/stripe")
async def stripe_webhook_entry(request: Request):
    return await _stripe_webhook_handler(request)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cloudflare Trusted Proxy Middleware + Security Headers
CLOUDFLARE_IP_RANGES = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
    "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"
]

import ipaddress
CF_NETWORKS = []
for cidr in CLOUDFLARE_IP_RANGES:
    try:
        CF_NETWORKS.append(ipaddress.ip_network(cidr))
    except ValueError:
        pass


def is_cloudflare_ip(ip_str: str) -> bool:
    """Check if IP belongs to Cloudflare's network ranges"""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in CF_NETWORKS)
    except ValueError:
        return False


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    """Cloudflare proxy trust + Security headers + IP Blacklist"""
    # --- Extract real client IP ---
    proxy_ip = request.client.host if request.client else "unknown"
    cf_ip = request.headers.get("CF-Connecting-IP")
    xff = request.headers.get("X-Forwarded-For")

    if cf_ip and is_cloudflare_ip(proxy_ip):
        request.state.client_ip = cf_ip
    elif xff:
        request.state.client_ip = xff.split(",")[0].strip()
    else:
        request.state.client_ip = proxy_ip

    # --- IP Blacklist Check (skip WebSocket and static) ---
    if not request.url.path.startswith("/uploads") and "ws" not in request.url.path:
        try:
            if await is_ip_blacklisted(request.state.client_ip):
                import asyncio
                asyncio.ensure_future(log_security_event(
                    event_type="blacklist_blocked",
                    client_ip=request.state.client_ip,
                    endpoint=request.url.path,
                    severity="high"
                ))
                from starlette.responses import JSONResponse
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Acesso bloqueado."}
                )
        except Exception:
            pass

    response = await call_next(request)

    # --- Security Headers ---
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(self)"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: blob: https:; "
        "connect-src 'self' https://api.binance.com wss://stream.binance.com https://challenges.cloudflare.com https://*.kbex.io; "
        "frame-src https://challenges.cloudflare.com; "
        "object-src 'none'; "
        "base-uri 'self';"
    )

    # --- Cache Control for API responses ---
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"

    return response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        from routes.revolut import stop_background_sync
        stop_background_sync()
    except Exception:
        pass
    client.close()


@app.on_event("startup")
async def startup_background_tasks():
    """Launch background jobs: Revolut periodic sync + Billing renewal cycle."""
    # Phase 2: Tenant data isolation backfill (idempotent).
    try:
        from routes.tenants import ensure_tenant_scoping
        await ensure_tenant_scoping()
    except Exception as e:
        logger.warning(f"Tenant scoping backfill failed: {e}")
    try:
        from routes.revolut import start_background_sync
        start_background_sync()
    except Exception as e:
        logger.warning(f"Failed to start Revolut background sync: {e}")
    try:
        from routes.billing import start_cycle
        start_cycle()
    except Exception as e:
        logger.warning(f"Failed to start Billing renewal cycle: {e}")
    try:
        start_alert_worker()
    except Exception as e:
        logger.warning(f"Failed to start Price-alert worker: {e}")