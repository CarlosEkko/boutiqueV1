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
from routes.crm import router as crm_router
from routes.referrals import router as referrals_router, set_db as set_referrals_db
from routes.otc import router as otc_router, set_db as set_otc_db
from routes.bank_accounts import router as bank_accounts_router, set_db as set_bank_accounts_db
from routes.company_bank_accounts import router as company_bank_accounts_router, set_db as set_company_bank_accounts_db
from routes.client_menus import router as client_menus_router, set_db as set_client_menus_db
from routes.notifications import router as notifications_router, set_db as set_notifications_db
from routes.sumsub import router as sumsub_router, set_db as set_sumsub_db
from routes.webhooks import router as webhooks_router, set_db as set_webhooks_db
from routes.team_hub import router as team_hub_router, set_db as set_team_hub_db

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

# Stripe webhook alias at /api/webhook/stripe
from routes.trading import router as trading_router_direct
@api_router.post("/webhook/stripe")
async def stripe_webhook_alias(request: Request):
    """Alias for Stripe webhook - redirects to trading webhook"""
    from routes.trading import stripe_webhook, set_db as set_trading_db_direct
    # Ensure db is set
    set_trading_db_direct(db)
    return await stripe_webhook(request)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()