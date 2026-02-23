from fastapi import FastAPI, APIRouter, HTTPException
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

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import and configure auth routes
from routes.auth import router as auth_router, set_db as set_auth_db
from routes.dashboard import router as dashboard_router, set_db as set_dashboard_db
from routes.admin import router as admin_router, set_db as set_admin_db
from routes.kyc import router as kyc_router, set_db as set_kyc_db

set_auth_db(db)
set_dashboard_db(db)
set_admin_db(db)
set_kyc_db(db)

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(admin_router)
api_router.include_router(kyc_router)


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
    source: str = "coingecko"

# Cache for crypto prices
crypto_cache: Dict[str, Any] = {
    "data": None,
    "last_fetch": None,
    "cache_duration": 60  # Cache for 60 seconds
}

COINGECKO_API_URL = "https://api.coingecko.com/api/v3"

# Crypto IDs mapping for CoinGecko
CRYPTO_IDS = {
    "bitcoin": {"symbol": "BTC", "name": "Bitcoin"},
    "ethereum": {"symbol": "ETH", "name": "Ethereum"},
    "cardano": {"symbol": "ADA", "name": "Cardano"},
    "solana": {"symbol": "SOL", "name": "Solana"},
    "ripple": {"symbol": "XRP", "name": "Ripple"},
    "binancecoin": {"symbol": "BNB", "name": "BNB"},
    "dogecoin": {"symbol": "DOGE", "name": "Dogecoin"},
    "polkadot": {"symbol": "DOT", "name": "Polkadot"}
}

async def fetch_crypto_prices() -> List[CryptoPrice]:
    """Fetch crypto prices from CoinGecko API"""
    crypto_ids = ",".join(CRYPTO_IDS.keys())
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{COINGECKO_API_URL}/simple/price",
                params={
                    "ids": crypto_ids,
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                    "include_market_cap": "true",
                    "include_24hr_vol": "true"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            prices = []
            for crypto_id, info in CRYPTO_IDS.items():
                if crypto_id in data:
                    crypto_data = data[crypto_id]
                    prices.append(CryptoPrice(
                        symbol=info["symbol"],
                        name=info["name"],
                        price=crypto_data.get("usd", 0),
                        change_24h=crypto_data.get("usd_24h_change", 0),
                        market_cap=crypto_data.get("usd_market_cap"),
                        volume_24h=crypto_data.get("usd_24h_vol")
                    ))
            
            return prices
            
        except httpx.HTTPError as e:
            logger.error(f"Error fetching crypto prices from CoinGecko: {e}")
            raise HTTPException(status_code=503, detail="Unable to fetch crypto prices")
        except Exception as e:
            logger.error(f"Unexpected error fetching crypto prices: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")

@api_router.get("/crypto-prices", response_model=CryptoPricesResponse)
async def get_crypto_prices():
    """
    Get current crypto prices from CoinGecko API.
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
                source="coingecko (cached)"
            )
    
    # Fetch fresh data
    logger.info("Fetching fresh crypto prices from CoinGecko")
    prices = await fetch_crypto_prices()
    
    # Update cache
    crypto_cache["data"] = prices
    crypto_cache["last_fetch"] = current_time
    
    return CryptoPricesResponse(
        prices=prices,
        last_updated=current_time,
        source="coingecko"
    )

# Include the router in the main app
app.include_router(api_router)

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