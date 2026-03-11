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

set_auth_db(db)
set_dashboard_db(db)
set_admin_db(db)
set_kyc_db(db)
set_tickets_db(db)
set_trading_db(db)
set_uploads_db(db)
set_crypto_wallets_db(db)

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(admin_router)
api_router.include_router(kyc_router)
api_router.include_router(fireblocks_router)
api_router.include_router(tickets_router)
api_router.include_router(trading_router)
api_router.include_router(uploads_router)
api_router.include_router(crypto_wallets_router)


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
    source: str = "coinmarketcap"

# Cache for crypto prices
crypto_cache: Dict[str, Any] = {
    "data": None,
    "last_fetch": None,
    "cache_duration": 60  # Cache for 60 seconds
}

# CoinMarketCap API configuration
COINMARKETCAP_API_URL = "https://pro-api.coinmarketcap.com/v1"
COINMARKETCAP_API_KEY = os.environ.get("COINMARKETCAP_API_KEY", "")

# Crypto symbols for CoinMarketCap
CRYPTO_SYMBOLS = ["BTC", "ETH", "ADA", "SOL", "XRP", "BNB", "DOGE", "DOT"]

async def fetch_crypto_prices() -> List[CryptoPrice]:
    """Fetch crypto prices from CoinMarketCap API"""
    
    if not COINMARKETCAP_API_KEY:
        logger.error("CoinMarketCap API key not configured")
        raise HTTPException(status_code=503, detail="CoinMarketCap API key not configured")
    
    headers = {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"{COINMARKETCAP_API_URL}/cryptocurrency/quotes/latest",
                params={
                    "symbol": ",".join(CRYPTO_SYMBOLS),
                    "convert": "USD"
                },
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get("status", {}).get("error_code", 0) != 0:
                error_msg = data.get("status", {}).get("error_message", "Unknown error")
                logger.error(f"CoinMarketCap API error: {error_msg}")
                raise HTTPException(status_code=503, detail=f"CoinMarketCap API error: {error_msg}")
            
            prices = []
            crypto_data = data.get("data", {})
            
            for symbol in CRYPTO_SYMBOLS:
                if symbol in crypto_data:
                    crypto = crypto_data[symbol]
                    # Handle case where symbol maps to multiple coins (use first)
                    if isinstance(crypto, list):
                        crypto = crypto[0]
                    
                    quote = crypto.get("quote", {}).get("USD", {})
                    prices.append(CryptoPrice(
                        symbol=symbol,
                        name=crypto.get("name", symbol),
                        price=quote.get("price", 0),
                        change_24h=quote.get("percent_change_24h", 0),
                        market_cap=quote.get("market_cap"),
                        volume_24h=quote.get("volume_24h")
                    ))
            
            return prices
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.error("Invalid CoinMarketCap API key")
                raise HTTPException(status_code=503, detail="Invalid API key")
            elif e.response.status_code == 429:
                logger.error("CoinMarketCap rate limit exceeded")
                raise HTTPException(status_code=503, detail="Rate limit exceeded")
            logger.error(f"HTTP error fetching crypto prices: {e}")
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
    Get current crypto prices from CoinMarketCap API.
    Results are cached for 60 seconds to avoid rate limiting.
    """
    global crypto_cache
    
    current_time = datetime.now(timezone.utc)
    
    # Check if cache is valid
    if (crypto_cache["data"] is not None and 
        crypto_cache["last_fetch"] is not None):
        time_diff = (current_time - crypto_cache["last_fetch"]).total_seconds()
        if time_diff < crypto_cache["cache_duration"]:
            logger.info("Returning cached crypto prices")
            return CryptoPricesResponse(
                prices=crypto_cache["data"],
                last_updated=crypto_cache["last_fetch"],
                source="coinmarketcap (cached)"
            )
    
    # Fetch fresh data
    logger.info("Fetching fresh crypto prices from CoinMarketCap")
    prices = await fetch_crypto_prices()
    
    # Update cache
    crypto_cache["data"] = prices
    crypto_cache["last_fetch"] = current_time
    
    return CryptoPricesResponse(
        prices=prices,
        last_updated=current_time,
        source="coinmarketcap"
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