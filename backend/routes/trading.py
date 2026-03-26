from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
import uuid
import secrets
import os
import httpx

from models.trading import (
    TradingFees, TradingFeesUpdate, CurrencyFeesUpdate,
    UserTradingLimits, UserTradingLimitsUpdate,
    SupportedCrypto,
    TradingOrder, OrderType, OrderStatus, PaymentMethod,
    CreateBuyOrder, CreateSellOrder, CreateSwapOrder,
    BankAccount, CreateBankAccount,
    BankTransfer, BankTransferStatus, CreateBankTransferDeposit, SubmitBankTransferProof,
    PaymentTransaction,
    CryptoFees, CryptoFeesUpdate,
    KBEXBankAccount, KBEXBankAccountCreate, KBEXBankAccountUpdate,
    FiatWithdrawal, FiatWithdrawalRequest, WithdrawalStatus
)
from utils.auth import get_current_user_id
from routes.admin import get_admin_user, get_internal_user

router = APIRouter(prefix="/trading", tags=["Trading"])

# Database reference
db = None

# Stripe integration
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

# Binance API (replacing CoinMarketCap)
BINANCE_API_KEY = os.environ.get("BINANCE_API_KEY", "")
BINANCE_SECRET_KEY = os.environ.get("BINANCE_SECRET_KEY", "")
BINANCE_API_URL = "https://api.binance.com/api/v3"

# Keep CoinMarketCap key for logo URLs only (no API calls)
COINMARKETCAP_API_KEY = os.environ.get("COINMARKETCAP_API_KEY", "")

# Supported fiat currencies
SUPPORTED_FIAT = ["USD", "EUR", "AED", "BRL"]

# Exchange rates cache (updated every 5 minutes)
EXCHANGE_RATES_CACHE = {
    "rates": {
        "USD": 1.0,
        "EUR": 0.92,
        "AED": 3.67,
        "BRL": 5.90
    },
    "updated_at": None
}


def set_db(database):
    global db
    db = database


# ==================== CURRENCY CONVERSION ====================

async def get_exchange_rates() -> dict:
    """Get current exchange rates from cache or fetch from Binance/exchangerate API"""
    global EXCHANGE_RATES_CACHE
    
    now = datetime.now(timezone.utc)
    
    # Check if cache is valid (5 minutes)
    if EXCHANGE_RATES_CACHE["updated_at"]:
        cache_age = (now - EXCHANGE_RATES_CACHE["updated_at"]).total_seconds()
        if cache_age < 300:  # 5 minutes
            return EXCHANGE_RATES_CACHE["rates"]
    
    # Try to fetch exchange rates using exchangerate-api (free, no key needed)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Use free exchange rate API
            response = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get("rates", {})
                EXCHANGE_RATES_CACHE["rates"] = {
                    "USD": 1.0,
                    "EUR": rates.get("EUR", 0.92),
                    "AED": rates.get("AED", 3.67),
                    "BRL": rates.get("BRL", 5.90)
                }
                EXCHANGE_RATES_CACHE["updated_at"] = now
    except Exception as e:
        print(f"Failed to fetch exchange rates: {e}")
    
    return EXCHANGE_RATES_CACHE["rates"]


def convert_price(price_usd: float, target_currency: str, rates: dict) -> float:
    """Convert USD price to target currency"""
    if target_currency == "USD":
        return price_usd
    
    rate = rates.get(target_currency, 1.0)
    return price_usd * rate


def convert_to_usd(amount: float, source_currency: str, rates: dict) -> float:
    """Convert amount from source currency to USD"""
    if source_currency == "USD":
        return amount
    
    rate = rates.get(source_currency, 1.0)
    return amount / rate if rate > 0 else amount


# ==================== HELPER FUNCTIONS ====================

async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Get current user with full details"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def get_trading_fees() -> TradingFees:
    """Get current trading fees from database or create defaults"""
    fees = await db.trading_fees.find_one({}, {"_id": 0})
    if not fees:
        # Create default fees
        default_fees = TradingFees()
        fees_dict = default_fees.model_dump()
        fees_dict["updated_at"] = fees_dict["updated_at"].isoformat()
        await db.trading_fees.insert_one(fees_dict)
        return default_fees
    
    if isinstance(fees.get("updated_at"), str):
        fees["updated_at"] = datetime.fromisoformat(fees["updated_at"])
    return TradingFees(**fees)


async def get_fees_for_crypto(symbol: str) -> dict:
    """Get trading fees for a specific cryptocurrency.
    Returns fees from crypto_fees collection if available, otherwise defaults.
    """
    fees = await db.crypto_fees.find_one({"symbol": symbol.upper()}, {"_id": 0})
    
    if fees and fees.get("is_active", True):
        return {
            "buy_fee_percent": fees.get("buy_fee_percent", 2.0),
            "buy_spread_percent": fees.get("buy_spread_percent", 1.0),
            "sell_fee_percent": fees.get("sell_fee_percent", 2.0),
            "sell_spread_percent": fees.get("sell_spread_percent", 1.0),
            "swap_fee_percent": fees.get("swap_fee_percent", 1.5),
            "swap_spread_percent": fees.get("swap_spread_percent", 0.5),
            "min_buy_fee": fees.get("min_buy_fee", 5.0),
            "min_sell_fee": fees.get("min_sell_fee", 5.0),
            "min_swap_fee": fees.get("min_swap_fee", 3.0)
        }
    
    # Fallback to global trading fees
    global_fees = await get_trading_fees()
    return {
        "buy_fee_percent": global_fees.buy_fee_percent,
        "buy_spread_percent": global_fees.buy_spread_percent,
        "sell_fee_percent": global_fees.sell_fee_percent,
        "sell_spread_percent": global_fees.sell_spread_percent,
        "swap_fee_percent": global_fees.swap_fee_percent,
        "swap_spread_percent": global_fees.swap_spread_percent,
        "min_buy_fee": global_fees.min_buy_fee_usd,
        "min_sell_fee": global_fees.min_sell_fee_usd,
        "min_swap_fee": global_fees.min_swap_fee_usd
    }


def get_currency_fees(fees: TradingFees, currency: str) -> dict:
    """Get fees for a specific currency"""
    if fees.fees_by_currency and currency in fees.fees_by_currency:
        return fees.fees_by_currency[currency]
    
    # Fallback to legacy fields
    return {
        "buy_fee_percent": fees.buy_fee_percent,
        "buy_spread_percent": fees.buy_spread_percent,
        "sell_fee_percent": fees.sell_fee_percent,
        "sell_spread_percent": fees.sell_spread_percent,
        "swap_fee_percent": fees.swap_fee_percent,
        "swap_spread_percent": fees.swap_spread_percent,
        "min_buy_fee": fees.min_buy_fee_usd,
        "min_sell_fee": fees.min_sell_fee_usd,
        "min_swap_fee": fees.min_swap_fee_usd
    }


async def get_user_limits(tier: str) -> UserTradingLimits:
    """Get trading limits for user tier"""
    limits = await db.trading_limits.find_one({"tier": tier}, {"_id": 0})
    if not limits:
        # Create default limits for this tier
        default_limits = UserTradingLimits(tier=tier)
        
        # Adjust based on tier
        if tier == "premium":
            default_limits.daily_buy_limit = 20000.0
            default_limits.daily_sell_limit = 20000.0
            default_limits.monthly_buy_limit = 200000.0
            default_limits.monthly_sell_limit = 200000.0
            default_limits.max_buy_amount = 50000.0
            default_limits.max_sell_amount = 50000.0
        elif tier == "vip":
            default_limits.daily_buy_limit = 100000.0
            default_limits.daily_sell_limit = 100000.0
            default_limits.monthly_buy_limit = 1000000.0
            default_limits.monthly_sell_limit = 1000000.0
            default_limits.max_buy_amount = 250000.0
            default_limits.max_sell_amount = 250000.0
        
        limits_dict = default_limits.model_dump()
        limits_dict["updated_at"] = limits_dict["updated_at"].isoformat()
        await db.trading_limits.insert_one(limits_dict)
        return default_limits
    
    if isinstance(limits.get("updated_at"), str):
        limits["updated_at"] = datetime.fromisoformat(limits["updated_at"])
    return UserTradingLimits(**limits)


async def get_bulk_crypto_prices(symbols: list) -> dict:
    """Get prices for multiple cryptocurrencies using Binance API"""
    if not symbols:
        return {}
    
    # Cache valid for 1 second (real-time updates)
    CACHE_TTL_SECONDS = 1
    
    # Check cache first - get all cached prices
    cache_valid_time = datetime.now(timezone.utc) - timedelta(seconds=CACHE_TTL_SECONDS)
    cached_prices = {}
    expired_prices = {}  # Keep expired prices as fallback
    symbols_to_fetch = []
    
    cached_cursor = db.crypto_prices_cache.find(
        {"symbol": {"$in": symbols}},
        {"_id": 0}
    )
    async for cached in cached_cursor:
        cache_time = cached.get("updated_at")
        if isinstance(cache_time, str):
            cache_time = datetime.fromisoformat(cache_time)
        if cache_time and cache_time > cache_valid_time:
            cached_prices[cached["symbol"]] = cached
        else:
            # Keep expired cache as fallback
            expired_prices[cached["symbol"]] = cached
            symbols_to_fetch.append(cached["symbol"])
    
    # Add symbols not in cache at all
    for symbol in symbols:
        if symbol not in cached_prices and symbol not in symbols_to_fetch:
            symbols_to_fetch.append(symbol)
    
    # If all prices are cached, return
    if not symbols_to_fetch:
        return cached_prices
    
    # Fetch prices from Binance
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Get all ticker prices from Binance (single request for all symbols)
            response = await client.get(f"{BINANCE_API_URL}/ticker/24hr")
            response.raise_for_status()
            all_tickers = response.json()
            
            # Create a map of symbol to price info
            binance_prices = {}
            for ticker in all_tickers:
                # Binance uses pairs like BTCUSDT, extract the base symbol
                binance_symbol = ticker.get("symbol", "")
                if binance_symbol.endswith("USDT"):
                    base_symbol = binance_symbol[:-4]  # Remove USDT suffix
                    binance_prices[base_symbol] = {
                        "price": float(ticker.get("lastPrice", 0)),
                        "change_24h": float(ticker.get("priceChangePercent", 0)),
                        "volume_24h": float(ticker.get("volume", 0)) * float(ticker.get("lastPrice", 0))
                    }
            
            for symbol in symbols_to_fetch:
                price_data = binance_prices.get(symbol)
                
                if price_data and price_data["price"] > 0:
                    # Get crypto name from defaults
                    crypto_info = next((c for c in DEFAULT_CRYPTOS if c["symbol"] == symbol), None)
                    crypto_name = crypto_info["name"] if crypto_info else symbol
                    
                    price_info = {
                        "symbol": symbol,
                        "name": crypto_name,
                        "price_usd": price_data["price"],
                        "change_24h": price_data["change_24h"],
                        "market_cap": None,  # Binance doesn't provide market cap
                        "volume_24h": price_data["volume_24h"],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    cached_prices[symbol] = price_info
                    
                    # Update cache
                    await db.crypto_prices_cache.update_one(
                        {"symbol": symbol},
                        {"$set": price_info},
                        upsert=True
                    )
    except Exception as e:
        print(f"Error fetching bulk prices from Binance: {e}")
        # Use expired prices as fallback when API fails
        for symbol in symbols_to_fetch:
            if symbol in expired_prices and symbol not in cached_prices:
                cached_prices[symbol] = expired_prices[symbol]
    
    # For symbols without any data, use expired cache
    for symbol in symbols_to_fetch:
        if symbol not in cached_prices and symbol in expired_prices:
            cached_prices[symbol] = expired_prices[symbol]
    
    return cached_prices


async def get_crypto_price(symbol: str) -> dict:
    """Get current crypto price from cache or Binance API"""
    # Check cache first
    cached = await db.crypto_prices_cache.find_one({"symbol": symbol}, {"_id": 0})
    
    if cached:
        cache_time = cached.get("updated_at")
        if isinstance(cache_time, str):
            cache_time = datetime.fromisoformat(cache_time)
        
        # Cache valid for 1 second (real-time updates)
        if (datetime.now(timezone.utc) - cache_time).total_seconds() < 1:
            return cached
    
    # Fetch from Binance
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Get 24h ticker for the symbol pair with USDT
            binance_symbol = f"{symbol.upper()}USDT"
            response = await client.get(
                f"{BINANCE_API_URL}/ticker/24hr",
                params={"symbol": binance_symbol}
            )
            response.raise_for_status()
            ticker = response.json()
            
            # Get crypto name from defaults
            crypto_info = next((c for c in DEFAULT_CRYPTOS if c["symbol"] == symbol.upper()), None)
            crypto_name = crypto_info["name"] if crypto_info else symbol.upper()
            
            price_info = {
                "symbol": symbol.upper(),
                "name": crypto_name,
                "price_usd": float(ticker.get("lastPrice", 0)),
                "change_24h": float(ticker.get("priceChangePercent", 0)),
                "market_cap": None,
                "volume_24h": float(ticker.get("volume", 0)) * float(ticker.get("lastPrice", 0)),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Update cache
            await db.crypto_prices_cache.update_one(
                {"symbol": symbol.upper()},
                {"$set": price_info},
                upsert=True
            )
            
            return price_info
    except httpx.HTTPStatusError as e:
        # If symbol not found on Binance, try with cached/expired data
        if cached:
            return cached
        raise HTTPException(status_code=404, detail=f"Cryptocurrency {symbol} not found on Binance")
    except Exception as e:
        print(f"Error fetching price from Binance: {e}")
        if cached:
            return cached
        raise HTTPException(status_code=503, detail="Price service temporarily unavailable")


async def check_user_limits(user: dict, order_type: str, amount_usd: float) -> bool:
    """Check if user is within their trading limits"""
    tier = user.get("membership_level", "standard")
    limits = await get_user_limits(tier)
    
    # Get user's orders for today and this month
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate daily usage
    daily_orders = await db.trading_orders.find({
        "user_id": user["id"],
        "order_type": order_type,
        "status": {"$in": ["completed", "processing", "pending"]},
        "created_at": {"$gte": today_start.isoformat()}
    }, {"_id": 0, "fiat_amount": 1}).to_list(1000)
    
    daily_used = sum(o.get("fiat_amount", 0) for o in daily_orders)
    
    # Calculate monthly usage
    monthly_orders = await db.trading_orders.find({
        "user_id": user["id"],
        "order_type": order_type,
        "status": {"$in": ["completed", "processing", "pending"]},
        "created_at": {"$gte": month_start.isoformat()}
    }, {"_id": 0, "fiat_amount": 1}).to_list(10000)
    
    monthly_used = sum(o.get("fiat_amount", 0) for o in monthly_orders)
    
    # Check limits based on order type
    if order_type == "buy":
        if daily_used + amount_usd > limits.daily_buy_limit:
            raise HTTPException(status_code=400, detail=f"Daily buy limit exceeded. Used: ${daily_used:.2f}, Limit: ${limits.daily_buy_limit:.2f}")
        if monthly_used + amount_usd > limits.monthly_buy_limit:
            raise HTTPException(status_code=400, detail=f"Monthly buy limit exceeded. Used: ${monthly_used:.2f}, Limit: ${limits.monthly_buy_limit:.2f}")
        if amount_usd < limits.min_buy_amount:
            raise HTTPException(status_code=400, detail=f"Minimum buy amount is ${limits.min_buy_amount:.2f}")
        if amount_usd > limits.max_buy_amount:
            raise HTTPException(status_code=400, detail=f"Maximum buy amount is ${limits.max_buy_amount:.2f}")
    
    elif order_type == "sell":
        if daily_used + amount_usd > limits.daily_sell_limit:
            raise HTTPException(status_code=400, detail=f"Daily sell limit exceeded")
        if monthly_used + amount_usd > limits.monthly_sell_limit:
            raise HTTPException(status_code=400, detail=f"Monthly sell limit exceeded")
        if amount_usd < limits.min_sell_amount:
            raise HTTPException(status_code=400, detail=f"Minimum sell amount is ${limits.min_sell_amount:.2f}")
        if amount_usd > limits.max_sell_amount:
            raise HTTPException(status_code=400, detail=f"Maximum sell amount is ${limits.max_sell_amount:.2f}")
    
    elif order_type == "swap":
        if daily_used + amount_usd > limits.daily_swap_limit:
            raise HTTPException(status_code=400, detail=f"Daily swap limit exceeded")
        if monthly_used + amount_usd > limits.monthly_swap_limit:
            raise HTTPException(status_code=400, detail=f"Monthly swap limit exceeded")
        if amount_usd < limits.min_swap_amount:
            raise HTTPException(status_code=400, detail=f"Minimum swap amount is ${limits.min_swap_amount:.2f}")
        if amount_usd > limits.max_swap_amount:
            raise HTTPException(status_code=400, detail=f"Maximum swap amount is ${limits.max_swap_amount:.2f}")
    
    return True


# ==================== ADMIN: FEES MANAGEMENT ====================

@router.get("/admin/fees", response_model=dict)
async def get_fees(admin: dict = Depends(get_admin_user)):
    """Get current trading fees configuration"""
    fees = await get_trading_fees()
    return fees.model_dump()


@router.get("/admin/fees/{currency}", response_model=dict)
async def get_currency_fees_endpoint(
    currency: str,
    admin: dict = Depends(get_admin_user)
):
    """Get fees for a specific currency"""
    currency = currency.upper()
    if currency not in SUPPORTED_FIAT:
        raise HTTPException(status_code=400, detail=f"Currency not supported. Available: {SUPPORTED_FIAT}")
    
    fees = await get_trading_fees()
    currency_fees = get_currency_fees(fees, currency)
    
    return {
        "currency": currency,
        "fees": currency_fees
    }


@router.put("/admin/fees/{currency}", response_model=dict)
async def update_currency_fees(
    currency: str,
    fees_update: CurrencyFeesUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update fees for a specific currency"""
    currency = currency.upper()
    if currency not in SUPPORTED_FIAT:
        raise HTTPException(status_code=400, detail=f"Currency not supported. Available: {SUPPORTED_FIAT}")
    
    current_fees = await get_trading_fees()
    
    # Get current currency fees or create defaults
    if not current_fees.fees_by_currency:
        current_fees.fees_by_currency = {}
    
    if currency not in current_fees.fees_by_currency:
        current_fees.fees_by_currency[currency] = {
            "buy_fee_percent": 2.0,
            "buy_spread_percent": 1.0,
            "sell_fee_percent": 2.0,
            "sell_spread_percent": 1.0,
            "swap_fee_percent": 1.5,
            "swap_spread_percent": 0.5,
            "min_buy_fee": 5.0,
            "min_sell_fee": 5.0,
            "min_swap_fee": 3.0
        }
    
    # Update specific fields
    for field, value in fees_update.model_dump(exclude_unset=True).items():
        if value is not None:
            current_fees.fees_by_currency[currency][field] = value
    
    await db.trading_fees.update_one(
        {"id": current_fees.id},
        {
            "$set": {
                "fees_by_currency": current_fees.fees_by_currency,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin["id"]
            }
        }
    )
    
    return {"success": True, "message": f"Fees for {currency} updated"}


@router.put("/admin/fees", response_model=dict)
async def update_fees(
    fees_update: TradingFeesUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update trading fees configuration (legacy - updates all currencies)"""
    current_fees = await get_trading_fees()
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}
    
    for field, value in fees_update.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    await db.trading_fees.update_one(
        {"id": current_fees.id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Trading fees updated"}


# ==================== ADMIN: CRYPTO-SPECIFIC FEES ====================

# Default top 50 cryptocurrencies with CoinMarketCap IDs for logos
DEFAULT_CRYPTOS = [
    {"symbol": "BTC", "name": "Bitcoin", "cmc_id": 1},
    {"symbol": "ETH", "name": "Ethereum", "cmc_id": 1027},
    {"symbol": "USDT", "name": "Tether", "cmc_id": 825},
    {"symbol": "BNB", "name": "BNB", "cmc_id": 1839},
    {"symbol": "SOL", "name": "Solana", "cmc_id": 5426},
    {"symbol": "XRP", "name": "XRP", "cmc_id": 52},
    {"symbol": "USDC", "name": "USD Coin", "cmc_id": 3408},
    {"symbol": "ADA", "name": "Cardano", "cmc_id": 2010},
    {"symbol": "DOGE", "name": "Dogecoin", "cmc_id": 74},
    {"symbol": "TRX", "name": "TRON", "cmc_id": 1958},
    {"symbol": "AVAX", "name": "Avalanche", "cmc_id": 5805},
    {"symbol": "LINK", "name": "Chainlink", "cmc_id": 1975},
    {"symbol": "TON", "name": "Toncoin", "cmc_id": 11419},
    {"symbol": "SHIB", "name": "Shiba Inu", "cmc_id": 5994},
    {"symbol": "DOT", "name": "Polkadot", "cmc_id": 6636},
    {"symbol": "BCH", "name": "Bitcoin Cash", "cmc_id": 1831},
    {"symbol": "NEAR", "name": "NEAR Protocol", "cmc_id": 6535},
    {"symbol": "MATIC", "name": "Polygon", "cmc_id": 3890},
    {"symbol": "LTC", "name": "Litecoin", "cmc_id": 2},
    {"symbol": "UNI", "name": "Uniswap", "cmc_id": 7083},
    {"symbol": "ICP", "name": "Internet Computer", "cmc_id": 8916},
    {"symbol": "DAI", "name": "Dai", "cmc_id": 4943},
    {"symbol": "APT", "name": "Aptos", "cmc_id": 21794},
    {"symbol": "ETC", "name": "Ethereum Classic", "cmc_id": 1321},
    {"symbol": "ATOM", "name": "Cosmos", "cmc_id": 3794},
    {"symbol": "XLM", "name": "Stellar", "cmc_id": 512},
    {"symbol": "XMR", "name": "Monero", "cmc_id": 328},
    {"symbol": "OKB", "name": "OKB", "cmc_id": 3897},
    {"symbol": "FIL", "name": "Filecoin", "cmc_id": 2280},
    {"symbol": "HBAR", "name": "Hedera", "cmc_id": 4642},
    {"symbol": "ARB", "name": "Arbitrum", "cmc_id": 11841},
    {"symbol": "CRO", "name": "Cronos", "cmc_id": 3635},
    {"symbol": "MKR", "name": "Maker", "cmc_id": 1518},
    {"symbol": "VET", "name": "VeChain", "cmc_id": 3077},
    {"symbol": "INJ", "name": "Injective", "cmc_id": 7226},
    {"symbol": "OP", "name": "Optimism", "cmc_id": 11840},
    {"symbol": "AAVE", "name": "Aave", "cmc_id": 7278},
    {"symbol": "GRT", "name": "The Graph", "cmc_id": 6719},
    {"symbol": "RUNE", "name": "THORChain", "cmc_id": 4157},
    {"symbol": "ALGO", "name": "Algorand", "cmc_id": 4030},
    {"symbol": "FTM", "name": "Fantom", "cmc_id": 3513},
    {"symbol": "THETA", "name": "Theta Network", "cmc_id": 2416},
    {"symbol": "SAND", "name": "The Sandbox", "cmc_id": 6210},
    {"symbol": "AXS", "name": "Axie Infinity", "cmc_id": 6783},
    {"symbol": "MANA", "name": "Decentraland", "cmc_id": 1966},
    {"symbol": "EGLD", "name": "MultiversX", "cmc_id": 6892},
    {"symbol": "EOS", "name": "EOS", "cmc_id": 1765},
    {"symbol": "XTZ", "name": "Tezos", "cmc_id": 2011},
    {"symbol": "FLOW", "name": "Flow", "cmc_id": 4558},
    {"symbol": "NEO", "name": "Neo", "cmc_id": 1376},
]


def get_crypto_logo_url(cmc_id: int) -> str:
    """Get CoinMarketCap logo URL for a cryptocurrency"""
    return f"https://s2.coinmarketcap.com/static/img/coins/64x64/{cmc_id}.png"


async def get_crypto_fees(symbol: str) -> CryptoFees:
    """Get fees for a specific cryptocurrency, create if not exists"""
    fees = await db.crypto_fees.find_one({"symbol": symbol.upper()}, {"_id": 0})
    
    if fees:
        if isinstance(fees.get("updated_at"), str):
            fees["updated_at"] = datetime.fromisoformat(fees["updated_at"])
        return CryptoFees(**fees)
    
    # Find crypto name from defaults
    crypto_info = next((c for c in DEFAULT_CRYPTOS if c["symbol"] == symbol.upper()), None)
    if not crypto_info:
        crypto_info = {"symbol": symbol.upper(), "name": symbol.upper()}
    
    # Create default fees for this crypto
    default_fees = CryptoFees(
        symbol=crypto_info["symbol"],
        name=crypto_info["name"]
    )
    
    fees_dict = default_fees.model_dump()
    fees_dict["updated_at"] = fees_dict["updated_at"].isoformat()
    await db.crypto_fees.insert_one(fees_dict)
    
    return default_fees


@router.get("/admin/crypto-fees", response_model=List[dict])
async def list_all_crypto_fees(admin: dict = Depends(get_admin_user)):
    """List fees for all supported cryptocurrencies"""
    # Ensure all default cryptos have fee entries
    for crypto in DEFAULT_CRYPTOS:
        await get_crypto_fees(crypto["symbol"])
    
    # Get all crypto fees
    fees_list = await db.crypto_fees.find({}, {"_id": 0}).sort("symbol", 1).to_list(100)
    return fees_list


@router.get("/admin/crypto-fees/{symbol}", response_model=dict)
async def get_single_crypto_fees(
    symbol: str,
    admin: dict = Depends(get_admin_user)
):
    """Get fees for a specific cryptocurrency"""
    fees = await get_crypto_fees(symbol.upper())
    return fees.model_dump()


@router.put("/admin/crypto-fees/{symbol}", response_model=dict)
async def update_crypto_fees(
    symbol: str,
    fees_update: CryptoFeesUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update fees for a specific cryptocurrency"""
    # Ensure crypto exists
    current_fees = await get_crypto_fees(symbol.upper())
    
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": admin["id"]
    }
    
    for field, value in fees_update.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    await db.crypto_fees.update_one(
        {"symbol": symbol.upper()},
        {"$set": update_data}
    )
    
    return {"success": True, "message": f"Fees for {symbol.upper()} updated"}


@router.post("/admin/crypto-fees/batch", response_model=dict)
async def batch_update_crypto_fees(
    symbols: List[str],
    fees_update: CryptoFeesUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update fees for multiple cryptocurrencies at once"""
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": admin["id"]
    }
    
    for field, value in fees_update.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    symbols_upper = [s.upper() for s in symbols]
    
    result = await db.crypto_fees.update_many(
        {"symbol": {"$in": symbols_upper}},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": f"Updated fees for {result.modified_count} cryptocurrencies"
    }


# ==================== ADMIN: LIMITS MANAGEMENT ====================

@router.get("/admin/limits", response_model=List[dict])
async def get_all_limits(admin: dict = Depends(get_admin_user)):
    """Get all trading limits configurations"""
    limits_list = []
    for tier in ["standard", "premium", "vip"]:
        limits = await get_user_limits(tier)
        limits_list.append(limits.model_dump())
    return limits_list


@router.get("/admin/limits/{tier}", response_model=dict)
async def get_tier_limits(tier: str, admin: dict = Depends(get_admin_user)):
    """Get trading limits for specific tier"""
    if tier not in ["standard", "premium", "vip"]:
        raise HTTPException(status_code=400, detail="Invalid tier")
    limits = await get_user_limits(tier)
    return limits.model_dump()


@router.put("/admin/limits/{tier}", response_model=dict)
async def update_tier_limits(
    tier: str,
    limits_update: UserTradingLimitsUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update trading limits for specific tier"""
    if tier not in ["standard", "premium", "vip"]:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    current_limits = await get_user_limits(tier)
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}
    
    for field, value in limits_update.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    await db.trading_limits.update_one(
        {"tier": tier},
        {"$set": update_data}
    )
    
    return {"success": True, "message": f"Limits for {tier} tier updated"}


# ==================== ADMIN: SUPPORTED CRYPTOS ====================

@router.get("/admin/cryptos", response_model=List[dict])
async def list_supported_cryptos(admin: dict = Depends(get_admin_user)):
    """List all supported cryptocurrencies"""
    cryptos = await db.supported_cryptos.find({}, {"_id": 0}).to_list(100)
    return cryptos


@router.post("/admin/cryptos", response_model=dict)
async def add_supported_crypto(
    symbol: str,
    name: str,
    cmc_id: int,
    networks: List[str],
    decimals: int = 8,
    admin: dict = Depends(get_admin_user)
):
    """Add a supported cryptocurrency"""
    existing = await db.supported_cryptos.find_one({"symbol": symbol.upper()})
    if existing:
        raise HTTPException(status_code=400, detail=f"{symbol} already exists")
    
    crypto = SupportedCrypto(
        symbol=symbol.upper(),
        name=name,
        cmc_id=cmc_id,
        networks=networks,
        decimals=decimals
    )
    
    crypto_dict = crypto.model_dump()
    crypto_dict["updated_at"] = crypto_dict["updated_at"].isoformat()
    
    await db.supported_cryptos.insert_one(crypto_dict)
    
    return {"success": True, "message": f"{symbol} added to supported cryptocurrencies"}


@router.put("/admin/cryptos/{symbol}", response_model=dict)
async def update_supported_crypto(
    symbol: str,
    is_active: Optional[bool] = None,
    can_buy: Optional[bool] = None,
    can_sell: Optional[bool] = None,
    can_swap: Optional[bool] = None,
    networks: Optional[List[str]] = None,
    admin: dict = Depends(get_admin_user)
):
    """Update a supported cryptocurrency"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if is_active is not None:
        update_data["is_active"] = is_active
    if can_buy is not None:
        update_data["can_buy"] = can_buy
    if can_sell is not None:
        update_data["can_sell"] = can_sell
    if can_swap is not None:
        update_data["can_swap"] = can_swap
    if networks is not None:
        update_data["networks"] = networks
    
    result = await db.supported_cryptos.update_one(
        {"symbol": symbol.upper()},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"{symbol} not found")
    
    return {"success": True, "message": f"{symbol} updated"}


# ==================== ADMIN: BANK TRANSFERS ====================

@router.get("/admin/bank-transfers", response_model=List[dict])
async def list_bank_transfers(
    status: Optional[BankTransferStatus] = None,
    transfer_type: Optional[str] = None,
    admin: dict = Depends(get_internal_user)
):
    """List all bank transfers"""
    query = {}
    if status:
        query["status"] = status
    if transfer_type:
        query["transfer_type"] = transfer_type
    
    transfers = await db.bank_transfers.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return transfers


@router.post("/admin/bank-transfers/{transfer_id}/approve", response_model=dict)
async def approve_bank_transfer(
    transfer_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Approve a bank transfer"""
    transfer = await db.bank_transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if transfer["status"] not in ["pending", "awaiting_approval"]:
        raise HTTPException(status_code=400, detail="Transfer cannot be approved in current status")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bank_transfers.update_one(
        {"id": transfer_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": admin["id"],
                "approved_at": now,
                "updated_at": now
            }
        }
    )
    
    # If this is a deposit, credit the user's fiat wallet
    if transfer["transfer_type"] == "deposit":
        currency = transfer.get("currency", "EUR")
        
        # Currency name mapping
        currency_names = {
            "EUR": "Euro",
            "USD": "US Dollar",
            "AED": "UAE Dirham",
            "BRL": "Brazilian Real",
            "USDT": "Tether"
        }
        
        # Find or create fiat wallet for user
        wallet = await db.wallets.find_one({
            "user_id": transfer["user_id"],
            "asset_id": currency
        })
        
        if wallet:
            new_balance = wallet.get("balance", 0) + transfer["amount"]
            await db.wallets.update_one(
                {"id": wallet["id"]},
                {"$set": {"balance": new_balance, "available_balance": new_balance}}
            )
        else:
            # Create fiat wallet
            is_fiat = currency in ["EUR", "USD", "AED", "BRL"]
            fiat_symbols = {"EUR": "€", "USD": "$", "AED": "د.إ", "BRL": "R$"}
            
            new_wallet = {
                "id": str(uuid.uuid4()),
                "user_id": transfer["user_id"],
                "asset_id": currency,
                "asset_name": currency_names.get(currency, currency),
                "asset_type": "fiat" if is_fiat else "crypto",
                "symbol": fiat_symbols.get(currency),
                "balance": transfer["amount"],
                "available_balance": transfer["amount"],
                "pending_balance": 0,
                "created_at": now
            }
            await db.wallets.insert_one(new_wallet)
        
        # Update transfer to completed
        await db.bank_transfers.update_one(
            {"id": transfer_id},
            {"$set": {"status": "completed", "completed_at": now}}
        )
        
        # Update related order if exists
        if transfer.get("order_id"):
            await db.trading_orders.update_one(
                {"id": transfer["order_id"]},
                {"$set": {"status": "completed", "completed_at": now, "updated_at": now}}
            )
    
    return {"success": True, "message": "Bank transfer approved"}


@router.post("/admin/bank-transfers/{transfer_id}/reject", response_model=dict)
async def reject_bank_transfer(
    transfer_id: str,
    reason: str = "Transfer not verified",
    admin: dict = Depends(get_admin_user)
):
    """Reject a bank transfer"""
    transfer = await db.bank_transfers.find_one({"id": transfer_id}, {"_id": 0})
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bank_transfers.update_one(
        {"id": transfer_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_by": admin["id"],
                "rejected_at": now,
                "rejection_reason": reason,
                "updated_at": now
            }
        }
    )
    
    # Update related order if exists
    if transfer.get("order_id"):
        await db.trading_orders.update_one(
            {"id": transfer["order_id"]},
            {"$set": {"status": "cancelled", "rejection_reason": reason, "updated_at": now}}
        )
    
    return {"success": True, "message": "Bank transfer rejected"}


# ==================== ADMIN: KBEX BANK ACCOUNTS MANAGEMENT ====================

@router.get("/admin/kbex-bank-accounts", response_model=List[dict])
async def list_kbex_bank_accounts(admin: dict = Depends(get_admin_user)):
    """List all KBEX bank accounts for receiving deposits"""
    accounts = await db.kbex_bank_accounts.find({}, {"_id": 0}).sort("currency", 1).to_list(20)
    return accounts


@router.get("/admin/kbex-bank-accounts/{currency}", response_model=dict)
async def get_kbex_bank_account_admin(currency: str, admin: dict = Depends(get_admin_user)):
    """Get KBEX bank account for a specific currency"""
    account = await db.kbex_bank_accounts.find_one({"currency": currency.upper()}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail=f"Bank account for {currency} not found")
    return account


@router.post("/admin/kbex-bank-accounts", response_model=dict)
async def create_kbex_bank_account(
    account: KBEXBankAccountCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new KBEX bank account for a currency"""
    # Check if account for this currency already exists
    existing = await db.kbex_bank_accounts.find_one({"currency": account.currency.upper()})
    if existing:
        raise HTTPException(status_code=400, detail=f"Bank account for {account.currency} already exists")
    
    bank_account = KBEXBankAccount(
        currency=account.currency.upper(),
        bank_name=account.bank_name,
        account_name=account.account_name,
        iban=account.iban,
        swift_bic=account.swift_bic,
        account_number=account.account_number,
        routing_number=account.routing_number,
        sort_code=account.sort_code,
        bank_address=account.bank_address,
        instructions=account.instructions,
        is_active=account.is_active,
        updated_by=admin["id"]
    )
    
    account_dict = bank_account.model_dump()
    account_dict["created_at"] = account_dict["created_at"].isoformat()
    account_dict["updated_at"] = account_dict["updated_at"].isoformat()
    
    await db.kbex_bank_accounts.insert_one(account_dict)
    
    return {"success": True, "message": f"Bank account for {account.currency} created", "id": bank_account.id}


@router.put("/admin/kbex-bank-accounts/{currency}", response_model=dict)
async def update_kbex_bank_account(
    currency: str,
    update: KBEXBankAccountUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update KBEX bank account for a currency"""
    account = await db.kbex_bank_accounts.find_one({"currency": currency.upper()})
    if not account:
        raise HTTPException(status_code=404, detail=f"Bank account for {currency} not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}
    
    for field, value in update.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    await db.kbex_bank_accounts.update_one(
        {"currency": currency.upper()},
        {"$set": update_data}
    )
    
    return {"success": True, "message": f"Bank account for {currency} updated"}


@router.delete("/admin/kbex-bank-accounts/{currency}", response_model=dict)
async def delete_kbex_bank_account(currency: str, admin: dict = Depends(get_admin_user)):
    """Delete KBEX bank account for a currency"""
    result = await db.kbex_bank_accounts.delete_one({"currency": currency.upper()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Bank account for {currency} not found")
    
    return {"success": True, "message": f"Bank account for {currency} deleted"}


# Public endpoint to get bank details for a currency
@router.get("/bank-details/{currency}", response_model=dict)
async def get_bank_details_for_deposit(currency: str, user: dict = Depends(get_current_user)):
    """Get KBEX bank details for making a deposit in a specific currency (uses unified company_bank_accounts)"""
    account = await db.company_bank_accounts.find_one(
        {"currency": currency.upper(), "is_active": True},
        {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail=f"Bank account for {currency} not available")
    
    # Generate reference code for this user (DEP prefix for deposits)
    reference_code = f"DEP-{user['id'][:8].upper()}"
    
    return {
        "bank_details": account,
        "reference_code": reference_code,
        "instructions": f"Please include the reference code '{reference_code}' in your transfer description."
    }


# ==================== ADMIN: FIAT WITHDRAWALS MANAGEMENT ====================

@router.get("/admin/fiat-withdrawals", response_model=List[dict])
async def list_fiat_withdrawals(
    status: Optional[str] = None,
    currency: Optional[str] = None,
    admin: dict = Depends(get_internal_user)
):
    """List all fiat withdrawal requests"""
    query = {}
    if status:
        query["status"] = status
    if currency:
        query["currency"] = currency.upper()
    
    withdrawals = await db.fiat_withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return withdrawals


@router.get("/admin/fiat-withdrawals/{withdrawal_id}", response_model=dict)
async def get_fiat_withdrawal(withdrawal_id: str, admin: dict = Depends(get_internal_user)):
    """Get a specific fiat withdrawal request"""
    withdrawal = await db.fiat_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return withdrawal


@router.post("/admin/fiat-withdrawals/{withdrawal_id}/process", response_model=dict)
async def process_fiat_withdrawal(
    withdrawal_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Mark withdrawal as processing (being handled)"""
    withdrawal = await db.fiat_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot process withdrawal with status: {withdrawal['status']}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.fiat_withdrawals.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "processing",
                "processed_by": admin["id"],
                "processed_at": now,
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "Withdrawal marked as processing"}


@router.post("/admin/fiat-withdrawals/{withdrawal_id}/approve", response_model=dict)
async def approve_fiat_withdrawal(
    withdrawal_id: str,
    transaction_reference: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Approve and complete a fiat withdrawal"""
    withdrawal = await db.fiat_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["status"] not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve withdrawal with status: {withdrawal['status']}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Deduct from user's fiat wallet
    wallet = await db.wallets.find_one({
        "user_id": withdrawal["user_id"],
        "asset_id": withdrawal["currency"]
    })
    
    if not wallet or (wallet.get("balance", 0) < withdrawal["amount"]):
        raise HTTPException(status_code=400, detail="Insufficient balance in user's wallet")
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": withdrawal["user_id"], "asset_id": withdrawal["currency"]},
        {
            "$inc": {"balance": -withdrawal["amount"], "available_balance": -withdrawal["amount"]},
            "$set": {"updated_at": now}
        }
    )
    
    # Update withdrawal status
    await db.fiat_withdrawals.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "completed",
                "transaction_reference": transaction_reference,
                "processed_by": admin["id"],
                "completed_at": now,
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "Withdrawal approved and completed"}


@router.post("/admin/fiat-withdrawals/{withdrawal_id}/reject", response_model=dict)
async def reject_fiat_withdrawal(
    withdrawal_id: str,
    reason: str = "Request rejected",
    admin: dict = Depends(get_admin_user)
):
    """Reject a fiat withdrawal request"""
    withdrawal = await db.fiat_withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["status"] not in ["pending", "processing"]:
        raise HTTPException(status_code=400, detail=f"Cannot reject withdrawal with status: {withdrawal['status']}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.fiat_withdrawals.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "processed_by": admin["id"],
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "Withdrawal rejected"}


# ==================== USER: FIAT WITHDRAWAL REQUEST ====================

@router.post("/fiat-withdrawal", response_model=dict)
async def request_fiat_withdrawal(
    request: FiatWithdrawalRequest,
    user: dict = Depends(get_current_user)
):
    """Request a fiat withdrawal"""
    currency = request.currency.upper()
    
    if currency not in ["EUR", "USD", "AED", "BRL"]:
        raise HTTPException(status_code=400, detail="Invalid currency")
    
    # Check user's fiat balance
    wallet = await db.wallets.find_one({
        "user_id": user["id"],
        "asset_id": currency
    })
    
    if not wallet or (wallet.get("available_balance", 0) < request.amount):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get bank details
    bank_name = request.bank_name
    account_holder = request.account_holder
    iban = request.iban
    swift_bic = request.swift_bic
    account_number = request.account_number
    routing_number = request.routing_number
    
    # If bank_account_id provided, use saved account
    if request.bank_account_id:
        bank_account = await db.bank_accounts.find_one({
            "id": request.bank_account_id,
            "user_id": user["id"]
        })
        if not bank_account:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        bank_name = bank_account.get("bank_name", bank_name)
        account_holder = bank_account.get("account_holder", account_holder)
        iban = bank_account.get("iban", iban)
        swift_bic = bank_account.get("swift_bic", swift_bic)
        account_number = bank_account.get("account_number", account_number)
        routing_number = bank_account.get("routing_number", routing_number)
    
    if not bank_name or not account_holder:
        raise HTTPException(status_code=400, detail="Bank name and account holder are required")
    
    if not iban and not account_number:
        raise HTTPException(status_code=400, detail="IBAN or account number is required")
    
    # Calculate fee (e.g., 0.5% with minimum 5 EUR/USD)
    fee_percent = 0.5
    min_fee = 5.0
    fee_amount = max(request.amount * (fee_percent / 100), min_fee)
    net_amount = request.amount - fee_amount
    
    withdrawal = FiatWithdrawal(
        user_id=user["id"],
        user_email=user["email"],
        currency=currency,
        amount=request.amount,
        fee_amount=fee_amount,
        net_amount=net_amount,
        bank_account_id=request.bank_account_id,
        bank_name=bank_name,
        account_holder=account_holder,
        iban=iban,
        swift_bic=swift_bic,
        account_number=account_number,
        routing_number=routing_number,
        status=WithdrawalStatus.PENDING
    )
    
    withdrawal_dict = withdrawal.model_dump()
    withdrawal_dict["created_at"] = withdrawal_dict["created_at"].isoformat()
    withdrawal_dict["updated_at"] = withdrawal_dict["updated_at"].isoformat()
    withdrawal_dict["status"] = withdrawal_dict["status"].value
    
    await db.fiat_withdrawals.insert_one(withdrawal_dict)
    
    # Reserve the balance (move from available to pending)
    await db.wallets.update_one(
        {"user_id": user["id"], "asset_id": currency},
        {
            "$inc": {"available_balance": -request.amount, "pending_balance": request.amount},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "success": True,
        "message": "Withdrawal request submitted",
        "withdrawal": {
            "id": withdrawal.id,
            "amount": request.amount,
            "fee": fee_amount,
            "net_amount": net_amount,
            "currency": currency,
            "status": "pending"
        }
    }


@router.get("/my-withdrawals", response_model=List[dict])
async def get_my_withdrawals(user: dict = Depends(get_current_user)):
    """Get user's withdrawal history"""
    withdrawals = await db.fiat_withdrawals.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return withdrawals


@router.post("/fiat-withdrawal/{withdrawal_id}/cancel", response_model=dict)
async def cancel_fiat_withdrawal(withdrawal_id: str, user: dict = Depends(get_current_user)):
    """Cancel a pending withdrawal request"""
    withdrawal = await db.fiat_withdrawals.find_one({
        "id": withdrawal_id,
        "user_id": user["id"]
    })
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only cancel pending withdrawals")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update withdrawal status
    await db.fiat_withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )
    
    # Return reserved balance
    await db.wallets.update_one(
        {"user_id": user["id"], "asset_id": withdrawal["currency"]},
        {
            "$inc": {"available_balance": withdrawal["amount"], "pending_balance": -withdrawal["amount"]},
            "$set": {"updated_at": now}
        }
    )
    
    return {"success": True, "message": "Withdrawal cancelled"}


# ==================== ADMIN: ORDERS MANAGEMENT ====================

@router.get("/admin/orders", response_model=List[dict])
async def list_all_orders(
    status: Optional[OrderStatus] = None,
    order_type: Optional[OrderType] = None,
    admin: dict = Depends(get_internal_user)
):
    """List all trading orders"""
    query = {}
    if status:
        query["status"] = status
    if order_type:
        query["order_type"] = order_type
    
    orders = await db.trading_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@router.post("/admin/orders/{order_id}/complete", response_model=dict)
async def complete_order(
    order_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Manually complete an order"""
    order = await db.trading_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.trading_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": now,
                "updated_at": now,
                "approved_by": admin["id"]
            }
        }
    )
    
    # Update user's wallet based on order type
    if order["order_type"] == "buy":
        wallet = await db.wallets.find_one({
            "user_id": order["user_id"],
            "asset_id": order["crypto_symbol"]
        })
        
        if wallet:
            new_balance = wallet.get("balance", 0) + order["crypto_amount"]
            await db.wallets.update_one(
                {"id": wallet["id"]},
                {"$set": {"balance": new_balance, "available_balance": new_balance}}
            )
        else:
            new_wallet = {
                "id": str(uuid.uuid4()),
                "user_id": order["user_id"],
                "asset_id": order["crypto_symbol"],
                "asset_name": order["crypto_name"],
                "balance": order["crypto_amount"],
                "available_balance": order["crypto_amount"],
                "pending_balance": 0,
                "created_at": now
            }
            await db.wallets.insert_one(new_wallet)
    
    return {"success": True, "message": "Order completed"}


@router.post("/admin/orders/{order_id}/cancel", response_model=dict)
async def cancel_order(
    order_id: str,
    reason: str = "Order cancelled by admin",
    admin: dict = Depends(get_admin_user)
):
    """Cancel an order"""
    order = await db.trading_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.trading_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "cancelled",
                "rejection_reason": reason,
                "rejected_by": admin["id"],
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "Order cancelled"}


# ==================== PUBLIC: CRYPTO PRICES ====================

@router.get("/exchange-rates", response_model=dict)
async def get_fiat_exchange_rates():
    """Get current fiat exchange rates"""
    rates = await get_exchange_rates()
    return {
        "base": "USD",
        "rates": rates,
        "supported_currencies": SUPPORTED_FIAT
    }


@router.get("/cryptos", response_model=List[dict])
async def get_available_cryptos(currency: str = "USD"):
    """Get list of available cryptocurrencies with prices in specified currency"""
    currency = currency.upper()
    if currency not in SUPPORTED_FIAT:
        currency = "USD"
    
    # Get exchange rates
    rates = await get_exchange_rates()
    
    cryptos = await db.supported_cryptos.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    if not cryptos or len(cryptos) < 50:
        # Use the full list of 50 default cryptos
        cryptos = [c.copy() for c in DEFAULT_CRYPTOS]
    
    # Get all symbols to fetch prices for
    symbols = [crypto["symbol"] for crypto in cryptos]
    
    # Fetch all prices in one API call (optimized)
    all_prices = await get_bulk_crypto_prices(symbols)
    
    # Apply prices to cryptos
    for crypto in cryptos:
        price_info = all_prices.get(crypto["symbol"], {})
        price_usd = price_info.get("price_usd") or 0
        market_cap_usd = price_info.get("market_cap")
        
        crypto["price_usd"] = price_usd
        crypto["price"] = convert_price(price_usd, currency, rates) if price_usd else 0
        crypto["currency"] = currency
        crypto["change_24h"] = price_info.get("change_24h") or 0
        crypto["market_cap"] = convert_price(market_cap_usd, currency, rates) if market_cap_usd else None
        
        # Add logo URL
        if crypto.get("cmc_id"):
            crypto["logo"] = get_crypto_logo_url(crypto["cmc_id"])
    
    return cryptos


@router.get("/price/{symbol}", response_model=dict)
async def get_single_crypto_price(symbol: str, currency: str = "USD"):
    """Get price for a single cryptocurrency in specified currency"""
    currency = currency.upper()
    if currency not in SUPPORTED_FIAT:
        currency = "USD"
    
    rates = await get_exchange_rates()
    price_info = await get_crypto_price(symbol.upper())
    
    price_usd = price_info.get("price_usd", 0)
    
    return {
        **price_info,
        "price": convert_price(price_usd, currency, rates),
        "currency": currency,
        "exchange_rate": rates.get(currency, 1.0)
    }


@router.get("/fees", response_model=dict)
async def get_public_fees(currency: str = "USD", crypto: str = None):
    """Get current trading fees (public). 
    If crypto symbol provided, returns crypto-specific fees.
    Otherwise returns global/currency fees.
    """
    # If crypto symbol provided, return crypto-specific fees
    if crypto:
        crypto_fees = await get_fees_for_crypto(crypto.upper())
        global_fees = await get_trading_fees()
        return {
            "crypto": crypto.upper(),
            "buy_fee_percent": crypto_fees["buy_fee_percent"],
            "sell_fee_percent": crypto_fees["sell_fee_percent"],
            "swap_fee_percent": crypto_fees["swap_fee_percent"],
            "buy_spread_percent": crypto_fees["buy_spread_percent"],
            "sell_spread_percent": crypto_fees["sell_spread_percent"],
            "swap_spread_percent": crypto_fees["swap_spread_percent"],
            "min_buy_fee": crypto_fees["min_buy_fee"],
            "min_sell_fee": crypto_fees["min_sell_fee"],
            "min_swap_fee": crypto_fees["min_swap_fee"],
            "network_fees": global_fees.network_fees
        }
    
    # Otherwise return currency-based fees (legacy)
    currency = currency.upper()
    if currency not in SUPPORTED_FIAT:
        currency = "USD"
    
    fees = await get_trading_fees()
    currency_fees = get_currency_fees(fees, currency)
    
    return {
        "currency": currency,
        "buy_fee_percent": currency_fees.get("buy_fee_percent", 2.0),
        "sell_fee_percent": currency_fees.get("sell_fee_percent", 2.0),
        "swap_fee_percent": currency_fees.get("swap_fee_percent", 1.5),
        "buy_spread_percent": currency_fees.get("buy_spread_percent", 1.0),
        "sell_spread_percent": currency_fees.get("sell_spread_percent", 1.0),
        "swap_spread_percent": currency_fees.get("swap_spread_percent", 0.5),
        "min_buy_fee": currency_fees.get("min_buy_fee", 5.0),
        "min_sell_fee": currency_fees.get("min_sell_fee", 5.0),
        "min_swap_fee": currency_fees.get("min_swap_fee", 3.0),
        "network_fees": fees.network_fees,
        "all_currencies": fees.fees_by_currency
    }


@router.get("/limits", response_model=dict)
async def get_my_limits(user: dict = Depends(get_current_user)):
    """Get current user's trading limits"""
    tier = user.get("membership_level", "standard")
    limits = await get_user_limits(tier)
    
    # Get user's current usage
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    daily_buy = await db.trading_orders.aggregate([
        {"$match": {
            "user_id": user["id"],
            "order_type": "buy",
            "status": {"$in": ["completed", "processing", "pending"]},
            "created_at": {"$gte": today_start.isoformat()}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$fiat_amount"}}}
    ]).to_list(1)
    
    daily_sell = await db.trading_orders.aggregate([
        {"$match": {
            "user_id": user["id"],
            "order_type": "sell",
            "status": {"$in": ["completed", "processing", "pending"]},
            "created_at": {"$gte": today_start.isoformat()}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$fiat_amount"}}}
    ]).to_list(1)
    
    return {
        "tier": tier,
        "limits": limits.model_dump(),
        "usage": {
            "daily_buy_used": daily_buy[0]["total"] if daily_buy else 0,
            "daily_sell_used": daily_sell[0]["total"] if daily_sell else 0
        }
    }


# ==================== USER: BUY CRYPTO ====================

@router.post("/buy", response_model=dict)
async def create_buy_order(
    request: Request,
    order: CreateBuyOrder,
    user: dict = Depends(get_current_user)
):
    """Create a buy order"""
    # Check user is approved
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Account not approved for trading")
    
    # Get crypto price
    price_info = await get_crypto_price(order.crypto_symbol.upper())
    market_price = price_info["price_usd"]
    
    if market_price <= 0:
        raise HTTPException(status_code=400, detail="Price not available")
    
    # Check limits
    await check_user_limits(user, "buy", order.fiat_amount)
    
    # Get fees for this specific crypto
    fees = await get_fees_for_crypto(order.crypto_symbol.upper())
    global_fees = await get_trading_fees()  # For network fees
    
    # Calculate amounts
    spread_amount = market_price * (fees["buy_spread_percent"] / 100)
    execution_price = market_price + spread_amount
    
    fee_amount = max(order.fiat_amount * (fees["buy_fee_percent"] / 100), fees["min_buy_fee"])
    
    # Network fee
    network_fee = global_fees.network_fees.get(order.network or "ethereum", 5.0)
    
    # Calculate crypto amount user will receive
    usable_amount = order.fiat_amount - fee_amount - network_fee
    crypto_amount = usable_amount / execution_price
    
    total_amount = order.fiat_amount
    
    # Create order
    trading_order = TradingOrder(
        user_id=user["id"],
        user_email=user["email"],
        order_type=OrderType.BUY,
        crypto_symbol=order.crypto_symbol.upper(),
        crypto_name=price_info["name"],
        network=order.network,
        crypto_amount=crypto_amount,
        fiat_amount=order.fiat_amount,
        market_price=market_price,
        execution_price=execution_price,
        fee_percent=fees["buy_fee_percent"],
        fee_amount=fee_amount,
        network_fee=network_fee,
        total_amount=total_amount,
        payment_method=order.payment_method
    )
    
    if order.payment_method == PaymentMethod.CARD:
        trading_order.status = OrderStatus.AWAITING_PAYMENT
        
        # Create Stripe checkout session
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        # Get frontend URL for redirects
        origin = request.headers.get("origin", host_url)
        success_url = f"{origin}/dashboard/exchange?session_id={{CHECKOUT_SESSION_ID}}&order_id={trading_order.id}"
        cancel_url = f"{origin}/dashboard/exchange?cancelled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=float(total_amount),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "order_id": trading_order.id,
                "user_id": user["id"],
                "order_type": "buy",
                "crypto_symbol": order.crypto_symbol.upper()
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        trading_order.stripe_session_id = session.session_id
        
        # Create payment transaction record
        payment_tx = PaymentTransaction(
            user_id=user["id"],
            user_email=user["email"],
            order_id=trading_order.id,
            stripe_session_id=session.session_id,
            amount=total_amount,
            currency="usd",
            status="initiated",
            metadata=checkout_request.metadata
        )
        
        payment_dict = payment_tx.model_dump()
        payment_dict["created_at"] = payment_dict["created_at"].isoformat()
        payment_dict["updated_at"] = payment_dict["updated_at"].isoformat()
        await db.payment_transactions.insert_one(payment_dict)
        
        # Save order
        order_dict = trading_order.model_dump()
        order_dict["created_at"] = order_dict["created_at"].isoformat()
        order_dict["updated_at"] = order_dict["updated_at"].isoformat()
        await db.trading_orders.insert_one(order_dict)
        
        return {
            "success": True,
            "order_id": trading_order.id,
            "checkout_url": session.url,
            "session_id": session.session_id,
            "summary": {
                "crypto_amount": crypto_amount,
                "crypto_symbol": order.crypto_symbol.upper(),
                "fiat_amount": order.fiat_amount,
                "fee": fee_amount,
                "network_fee": network_fee,
                "total": total_amount,
                "execution_price": execution_price
            }
        }
    
    elif order.payment_method == PaymentMethod.BANK_TRANSFER:
        trading_order.status = OrderStatus.AWAITING_ADMIN_APPROVAL
        
        # Get bank account from database (default to EUR for buy orders)
        bank_currency = "EUR"  # Default currency for bank transfers
        bank_account = await get_kbex_bank_account(bank_currency)
        if not bank_account:
            raise HTTPException(status_code=400, detail=f"Bank account for {bank_currency} not configured. Please contact support.")
        
        # Create bank transfer record
        reference_code = f"KB{secrets.token_hex(4).upper()}"
        
        bank_transfer = BankTransfer(
            user_id=user["id"],
            user_email=user["email"],
            order_id=trading_order.id,
            transfer_type="deposit",
            amount=total_amount,
            currency=bank_currency,
            recipient_iban=bank_account.get("iban"),
            recipient_bank=bank_account.get("bank_name"),
            reference_code=reference_code,
            status=BankTransferStatus.PENDING
        )
        
        trading_order.bank_transfer_id = bank_transfer.id
        
        # Save bank transfer
        transfer_dict = bank_transfer.model_dump()
        transfer_dict["created_at"] = transfer_dict["created_at"].isoformat()
        transfer_dict["updated_at"] = transfer_dict["updated_at"].isoformat()
        await db.bank_transfers.insert_one(transfer_dict)
        
        # Save order
        order_dict = trading_order.model_dump()
        order_dict["created_at"] = order_dict["created_at"].isoformat()
        order_dict["updated_at"] = order_dict["updated_at"].isoformat()
        await db.trading_orders.insert_one(order_dict)
        
        return {
            "success": True,
            "order_id": trading_order.id,
            "bank_transfer": {
                "id": bank_transfer.id,
                "recipient_iban": bank_account.get("iban"),
                "recipient_bank": bank_account.get("bank_name"),
                "bic": bank_account.get("bic"),
                "account_holder": bank_account.get("account_holder"),
                "reference_code": reference_code,
                "amount": total_amount,
                "currency": bank_currency
            },
            "summary": {
                "crypto_amount": crypto_amount,
                "crypto_symbol": order.crypto_symbol.upper(),
                "fiat_amount": order.fiat_amount,
                "fee": fee_amount,
                "network_fee": network_fee,
                "total": total_amount,
                "execution_price": execution_price
            },
            "message": "Please transfer the amount to the provided bank account with the reference code"
        }
    
    raise HTTPException(status_code=400, detail="Invalid payment method")


# ==================== USER: SELL CRYPTO ====================

@router.post("/sell", response_model=dict)
async def create_sell_order(
    order: CreateSellOrder,
    user: dict = Depends(get_current_user)
):
    """Create a sell order"""
    # Check user is approved
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Account not approved for trading")
    
    # Check user has enough crypto balance
    wallet = await db.wallets.find_one({
        "user_id": user["id"],
        "asset_id": order.crypto_symbol.upper()
    }, {"_id": 0})
    
    if not wallet or wallet.get("available_balance", 0) < order.crypto_amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get crypto price
    price_info = await get_crypto_price(order.crypto_symbol.upper())
    market_price = price_info["price_usd"]
    
    if market_price <= 0:
        raise HTTPException(status_code=400, detail="Price not available")
    
    # Calculate fiat amount
    fiat_amount = order.crypto_amount * market_price
    
    # Check limits
    await check_user_limits(user, "sell", fiat_amount)
    
    # Get fees for this specific crypto
    fees = await get_fees_for_crypto(order.crypto_symbol.upper())
    
    # Calculate amounts with spread
    spread_amount = market_price * (fees["sell_spread_percent"] / 100)
    execution_price = market_price - spread_amount
    
    gross_amount = order.crypto_amount * execution_price
    fee_amount = max(gross_amount * (fees["sell_fee_percent"] / 100), fees["min_sell_fee"])
    
    total_receive = gross_amount - fee_amount
    
    # Create order
    trading_order = TradingOrder(
        user_id=user["id"],
        user_email=user["email"],
        order_type=OrderType.SELL,
        status=OrderStatus.AWAITING_ADMIN_APPROVAL,
        crypto_symbol=order.crypto_symbol.upper(),
        crypto_name=price_info["name"],
        crypto_amount=order.crypto_amount,
        fiat_amount=fiat_amount,
        market_price=market_price,
        execution_price=execution_price,
        fee_percent=fees["sell_fee_percent"],
        fee_amount=fee_amount,
        total_amount=total_receive,
        payment_method=order.payment_method
    )
    
    # Lock the crypto amount in user's wallet
    new_available = wallet.get("available_balance", 0) - order.crypto_amount
    new_pending = wallet.get("pending_balance", 0) + order.crypto_amount
    
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$set": {"available_balance": new_available, "pending_balance": new_pending}}
    )
    
    # Save order
    order_dict = trading_order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    await db.trading_orders.insert_one(order_dict)
    
    return {
        "success": True,
        "order_id": trading_order.id,
        "status": "awaiting_admin_approval",
        "summary": {
            "crypto_amount": order.crypto_amount,
            "crypto_symbol": order.crypto_symbol.upper(),
            "gross_amount": gross_amount,
            "fee": fee_amount,
            "total_receive": total_receive,
            "execution_price": execution_price
        },
        "message": "Your sell order is pending admin approval. Funds will be transferred to your bank account."
    }


# ==================== USER: SWAP CRYPTO ====================

@router.post("/swap", response_model=dict)
async def create_swap_order(
    order: CreateSwapOrder,
    user: dict = Depends(get_current_user)
):
    """Create a swap/convert order"""
    # Check user is approved
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Account not approved for trading")
    
    # Check user has enough of the source crypto
    from_wallet = await db.wallets.find_one({
        "user_id": user["id"],
        "asset_id": order.from_crypto.upper()
    }, {"_id": 0})
    
    if not from_wallet or from_wallet.get("available_balance", 0) < order.from_amount:
        raise HTTPException(status_code=400, detail=f"Insufficient {order.from_crypto} balance")
    
    # Get prices for both cryptos
    from_price = await get_crypto_price(order.from_crypto.upper())
    to_price = await get_crypto_price(order.to_crypto.upper())
    
    from_price_usd = from_price["price_usd"]
    to_price_usd = to_price["price_usd"]
    
    if from_price_usd <= 0 or to_price_usd <= 0:
        raise HTTPException(status_code=400, detail="Price not available")
    
    # Calculate USD value of swap
    fiat_amount = order.from_amount * from_price_usd
    
    # Check limits
    await check_user_limits(user, "swap", fiat_amount)
    
    # Get fees for the source crypto (for swaps, use from_crypto fees)
    fees = await get_fees_for_crypto(order.from_crypto.upper())
    
    # Calculate with spread
    fee_amount = max(fiat_amount * (fees["swap_fee_percent"] / 100), fees["min_swap_fee"])
    spread_cost = fiat_amount * (fees["swap_spread_percent"] / 100)
    
    usable_amount = fiat_amount - fee_amount - spread_cost
    to_amount = usable_amount / to_price_usd
    
    # Create order
    trading_order = TradingOrder(
        user_id=user["id"],
        user_email=user["email"],
        order_type=OrderType.SWAP,
        status=OrderStatus.PROCESSING,
        crypto_symbol=order.to_crypto.upper(),
        crypto_name=to_price["name"],
        from_crypto=order.from_crypto.upper(),
        to_crypto=order.to_crypto.upper(),
        crypto_amount=to_amount,
        fiat_amount=fiat_amount,
        market_price=to_price_usd,
        execution_price=to_price_usd,
        fee_percent=fees["swap_fee_percent"],
        fee_amount=fee_amount,
        total_amount=to_amount,
        payment_method=PaymentMethod.CRYPTO
    )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Deduct from source wallet
    new_from_balance = from_wallet.get("balance", 0) - order.from_amount
    new_from_available = from_wallet.get("available_balance", 0) - order.from_amount
    
    await db.wallets.update_one(
        {"id": from_wallet["id"]},
        {"$set": {"balance": new_from_balance, "available_balance": new_from_available}}
    )
    
    # Add to destination wallet
    to_wallet = await db.wallets.find_one({
        "user_id": user["id"],
        "asset_id": order.to_crypto.upper()
    }, {"_id": 0})
    
    if to_wallet:
        new_to_balance = to_wallet.get("balance", 0) + to_amount
        await db.wallets.update_one(
            {"id": to_wallet["id"]},
            {"$set": {"balance": new_to_balance, "available_balance": new_to_balance}}
        )
    else:
        new_wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "asset_id": order.to_crypto.upper(),
            "asset_name": to_price["name"],
            "balance": to_amount,
            "available_balance": to_amount,
            "pending_balance": 0,
            "created_at": now
        }
        await db.wallets.insert_one(new_wallet)
    
    # Complete order
    trading_order.status = OrderStatus.COMPLETED
    trading_order.completed_at = datetime.now(timezone.utc)
    
    order_dict = trading_order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    order_dict["completed_at"] = order_dict["completed_at"].isoformat()
    await db.trading_orders.insert_one(order_dict)
    
    return {
        "success": True,
        "order_id": trading_order.id,
        "status": "completed",
        "summary": {
            "from_crypto": order.from_crypto.upper(),
            "from_amount": order.from_amount,
            "to_crypto": order.to_crypto.upper(),
            "to_amount": to_amount,
            "fee": fee_amount,
            "rate": f"1 {order.from_crypto.upper()} = {from_price_usd / to_price_usd:.6f} {order.to_crypto.upper()}"
        }
    }


# ==================== USER: ORDERS ====================

@router.get("/orders", response_model=List[dict])
async def get_my_orders(
    status: Optional[OrderStatus] = None,
    order_type: Optional[OrderType] = None,
    user: dict = Depends(get_current_user)
):
    """Get current user's trading orders"""
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    if order_type:
        query["order_type"] = order_type
    
    orders = await db.trading_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders


@router.get("/orders/{order_id}", response_model=dict)
async def get_order_details(
    order_id: str,
    user: dict = Depends(get_current_user)
):
    """Get order details"""
    order = await db.trading_orders.find_one({
        "id": order_id,
        "user_id": user["id"]
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order


# ==================== USER: BANK ACCOUNTS ====================

@router.get("/bank-accounts", response_model=List[dict])
async def get_my_bank_accounts(user: dict = Depends(get_current_user)):
    """Get user's saved bank accounts"""
    accounts = await db.bank_accounts.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(10)
    return accounts


@router.post("/bank-accounts", response_model=dict)
async def add_bank_account(
    account: CreateBankAccount,
    user: dict = Depends(get_current_user)
):
    """Add a new bank account"""
    bank_account = BankAccount(
        user_id=user["id"],
        account_holder=account.account_holder,
        iban=account.iban,
        bic_swift=account.bic_swift,
        bank_name=account.bank_name,
        bank_country=account.bank_country
    )
    
    account_dict = bank_account.model_dump()
    account_dict["created_at"] = account_dict["created_at"].isoformat()
    await db.bank_accounts.insert_one(account_dict)
    
    return {"success": True, "account_id": bank_account.id, "message": "Bank account added. Pending verification."}


@router.delete("/bank-accounts/{account_id}", response_model=dict)
async def remove_bank_account(
    account_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove a bank account"""
    result = await db.bank_accounts.update_one(
        {"id": account_id, "user_id": user["id"]},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    return {"success": True, "message": "Bank account removed"}


# ==================== USER: BANK TRANSFERS ====================

@router.get("/bank-transfers", response_model=List[dict])
async def get_my_bank_transfers(user: dict = Depends(get_current_user)):
    """Get user's bank transfers"""
    transfers = await db.bank_transfers.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return transfers


@router.post("/bank-transfers/{transfer_id}/proof", response_model=dict)
async def submit_transfer_proof(
    transfer_id: str,
    proof: SubmitBankTransferProof,
    user: dict = Depends(get_current_user)
):
    """Submit proof of bank transfer"""
    transfer = await db.bank_transfers.find_one({
        "id": transfer_id,
        "user_id": user["id"]
    }, {"_id": 0})
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if transfer["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Cannot submit proof for this transfer")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bank_transfers.update_one(
        {"id": transfer_id},
        {
            "$set": {
                "proof_document_url": proof.proof_document_url,
                "status": "awaiting_approval",
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "Proof submitted. Awaiting admin approval."}


# ==================== USER: FIAT DEPOSITS ====================

async def get_kbex_bank_account(currency: str) -> dict:
    """Get KBEX bank account details from company_bank_accounts collection (unified)"""
    # Use unified company_bank_accounts collection
    account = await db.company_bank_accounts.find_one(
        {"currency": currency.upper(), "is_active": True},
        {"_id": 0}
    )
    
    if not account:
        return None
    
    # Format response with consistent field names
    return {
        "bank_name": account.get("bank_name"),
        "account_holder": account.get("account_holder", "KBEX Financial Services"),
        "iban": account.get("iban"),
        "bic": account.get("swift_bic"),
        "account_number": account.get("account_number"),
        "routing_number": account.get("routing_number"),
        "sort_code": account.get("sort_code"),
        "pix_key": account.get("pix_key"),
        "bank_address": account.get("bank_address"),
        "instructions": account.get("instructions")
    }


class CreateFiatDeposit(BaseModel):
    """Create fiat deposit request"""
    currency: str  # EUR, USD, AED, BRL
    amount: float


@router.post("/fiat/deposit", response_model=dict)
async def create_fiat_deposit(
    deposit: CreateFiatDeposit,
    user: dict = Depends(get_current_user)
):
    """Create a fiat deposit request and get bank details"""
    # Check user is approved
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Account not approved for deposits")
    
    currency = deposit.currency.upper()
    
    # Validate currency
    if currency not in SUPPORTED_FIAT:
        raise HTTPException(status_code=400, detail=f"Currency {currency} not supported. Available: {SUPPORTED_FIAT}")
    
    # Get bank account from database (configured by admin)
    bank_account = await get_kbex_bank_account(currency)
    if not bank_account:
        raise HTTPException(status_code=400, detail=f"Bank account for {currency} not configured. Please contact support.")
    
    # Minimum deposit amounts
    min_amounts = {"EUR": 100, "USD": 100, "AED": 500, "BRL": 500}
    if deposit.amount < min_amounts.get(currency, 100):
        raise HTTPException(status_code=400, detail=f"Minimum deposit is {min_amounts[currency]} {currency}")
    
    # Generate unique reference code
    reference_code = f"DEP{secrets.token_hex(4).upper()}"
    
    # Create bank transfer record
    bank_transfer = BankTransfer(
        user_id=user["id"],
        user_email=user["email"],
        transfer_type="deposit",
        amount=deposit.amount,
        currency=currency,
        recipient_iban=bank_account.get("iban"),
        recipient_bank=bank_account.get("bank_name"),
        reference_code=reference_code,
        status=BankTransferStatus.PENDING
    )
    
    # Save to database
    transfer_dict = bank_transfer.model_dump()
    transfer_dict["created_at"] = transfer_dict["created_at"].isoformat()
    transfer_dict["updated_at"] = transfer_dict["updated_at"].isoformat()
    await db.bank_transfers.insert_one(transfer_dict)
    
    # Get bank details for response
    bank_details = bank_account.copy()
    bank_details["reference_code"] = reference_code
    bank_details["amount"] = deposit.amount
    bank_details["currency"] = currency
    
    return {
        "success": True,
        "deposit_id": bank_transfer.id,
        "reference_code": reference_code,
        "bank_details": bank_details,
        "instructions": {
            "pt": f"Faça uma transferência de {deposit.amount} {currency} para a conta bancária indicada. Use o código de referência '{reference_code}' na descrição da transferência. Após a transferência, envie o comprovante.",
            "en": f"Transfer {deposit.amount} {currency} to the bank account shown. Use reference code '{reference_code}' in the transfer description. After transfer, submit proof of payment."
        },
        "next_step": "upload_proof"
    }


@router.get("/fiat/deposits", response_model=List[dict])
async def get_my_fiat_deposits(
    status: Optional[str] = None,
    currency: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get user's fiat deposit history"""
    query = {"user_id": user["id"], "transfer_type": "deposit"}
    
    if status:
        query["status"] = status
    if currency:
        query["currency"] = currency.upper()
    
    deposits = await db.bank_transfers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return deposits


@router.get("/fiat/deposit/{deposit_id}", response_model=dict)
async def get_fiat_deposit_details(
    deposit_id: str,
    user: dict = Depends(get_current_user)
):
    """Get fiat deposit details"""
    deposit = await db.bank_transfers.find_one({
        "id": deposit_id,
        "user_id": user["id"],
        "transfer_type": "deposit"
    }, {"_id": 0})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    # Add bank details from database
    currency = deposit.get("currency", "EUR")
    bank_account = await get_kbex_bank_account(currency)
    if bank_account:
        deposit["bank_details"] = bank_account.copy()
        deposit["bank_details"]["reference_code"] = deposit["reference_code"]
    
    return deposit


@router.post("/fiat/deposit/{deposit_id}/proof", response_model=dict)
async def submit_fiat_deposit_proof(
    deposit_id: str,
    proof_url: str,
    user: dict = Depends(get_current_user)
):
    """Submit proof of fiat deposit"""
    deposit = await db.bank_transfers.find_one({
        "id": deposit_id,
        "user_id": user["id"],
        "transfer_type": "deposit"
    }, {"_id": 0})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Proof already submitted or deposit processed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bank_transfers.update_one(
        {"id": deposit_id},
        {
            "$set": {
                "proof_document_url": proof_url,
                "status": "awaiting_approval",
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "Proof submitted. Your deposit is awaiting admin approval."}


@router.delete("/fiat/deposit/{deposit_id}", response_model=dict)
async def cancel_fiat_deposit(
    deposit_id: str,
    user: dict = Depends(get_current_user)
):
    """Cancel a pending fiat deposit"""
    deposit = await db.bank_transfers.find_one({
        "id": deposit_id,
        "user_id": user["id"],
        "transfer_type": "deposit"
    }, {"_id": 0})
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Cannot cancel deposit in current status")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.bank_transfers.update_one(
        {"id": deposit_id},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )
    
    return {"success": True, "message": "Deposit cancelled"}


# ==================== STRIPE WEBHOOK ====================

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        session_id = webhook_response.session_id
        payment_status = webhook_response.payment_status
        event_type = webhook_response.event_type
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"stripe_session_id": session_id},
            {
                "$set": {
                    "payment_status": payment_status,
                    "status": "completed" if payment_status == "paid" else "failed",
                    "updated_at": now
                }
            }
        )
        
        # Update trading order
        if payment_status == "paid":
            payment_tx = await db.payment_transactions.find_one(
                {"stripe_session_id": session_id},
                {"_id": 0}
            )
            
            if payment_tx:
                order = await db.trading_orders.find_one(
                    {"id": payment_tx["order_id"]},
                    {"_id": 0}
                )
                
                if order:
                    # Update order status
                    await db.trading_orders.update_one(
                        {"id": order["id"]},
                        {
                            "$set": {
                                "status": "completed",
                                "completed_at": now,
                                "updated_at": now
                            }
                        }
                    )
                    
                    # Credit user's crypto wallet
                    wallet = await db.wallets.find_one({
                        "user_id": order["user_id"],
                        "asset_id": order["crypto_symbol"]
                    })
                    
                    if wallet:
                        new_balance = wallet.get("balance", 0) + order["crypto_amount"]
                        await db.wallets.update_one(
                            {"id": wallet["id"]},
                            {"$set": {"balance": new_balance, "available_balance": new_balance}}
                        )
                    else:
                        new_wallet = {
                            "id": str(uuid.uuid4()),
                            "user_id": order["user_id"],
                            "asset_id": order["crypto_symbol"],
                            "asset_name": order["crypto_name"],
                            "balance": order["crypto_amount"],
                            "available_balance": order["crypto_amount"],
                            "pending_balance": 0,
                            "created_at": now
                        }
                        await db.wallets.insert_one(new_wallet)
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== PAYMENT STATUS ====================

@router.get("/payment-status/{session_id}", response_model=dict)
async def get_payment_status(
    session_id: str,
    user: dict = Depends(get_current_user)
):
    """Get payment status for a Stripe session"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Also update our database
        now = datetime.now(timezone.utc).isoformat()
        
        await db.payment_transactions.update_one(
            {"stripe_session_id": session_id, "user_id": user["id"]},
            {
                "$set": {
                    "payment_status": status.payment_status,
                    "status": "completed" if status.payment_status == "paid" else status.status,
                    "updated_at": now
                }
            }
        )
        
        # If paid, complete the order
        if status.payment_status == "paid":
            payment_tx = await db.payment_transactions.find_one(
                {"stripe_session_id": session_id},
                {"_id": 0}
            )
            
            if payment_tx:
                order = await db.trading_orders.find_one(
                    {"id": payment_tx["order_id"]},
                    {"_id": 0}
                )
                
                if order and order["status"] != "completed":
                    await db.trading_orders.update_one(
                        {"id": order["id"]},
                        {
                            "$set": {
                                "status": "completed",
                                "completed_at": now,
                                "updated_at": now
                            }
                        }
                    )
                    
                    # Credit user's crypto wallet
                    wallet = await db.wallets.find_one({
                        "user_id": order["user_id"],
                        "asset_id": order["crypto_symbol"]
                    })
                    
                    if wallet:
                        new_balance = wallet.get("balance", 0) + order["crypto_amount"]
                        await db.wallets.update_one(
                            {"id": wallet["id"]},
                            {"$set": {"balance": new_balance, "available_balance": new_balance}}
                        )
                    else:
                        new_wallet = {
                            "id": str(uuid.uuid4()),
                            "user_id": order["user_id"],
                            "asset_id": order["crypto_symbol"],
                            "asset_name": order["crypto_name"],
                            "balance": order["crypto_amount"],
                            "available_balance": order["crypto_amount"],
                            "pending_balance": 0,
                            "created_at": now
                        }
                        await db.wallets.insert_one(new_wallet)
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



# ==================== MARKETS DATA ====================

# Cache for market data
MARKETS_CACHE = {
    "data": None,
    "updated_at": None
}

@router.get("/markets")
async def get_markets_data(currency: str = "USD"):
    """Get market data for all supported cryptocurrencies using Binance API"""
    global MARKETS_CACHE
    
    now = datetime.now(timezone.utc)
    
    # Check cache validity (60 seconds)
    if MARKETS_CACHE["data"] and MARKETS_CACHE["updated_at"]:
        cache_age = (now - MARKETS_CACHE["updated_at"]).total_seconds()
        if cache_age < 60:
            # Return cached data converted to requested currency
            return await convert_markets_to_currency(MARKETS_CACHE["data"], currency)
    
    # Fetch fresh data from Binance
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Get all 24h tickers from Binance
            response = await client.get(f"{BINANCE_API_URL}/ticker/24hr")
            
            if response.status_code == 200:
                all_tickers = response.json()
                
                # Create a map of USDT pairs
                binance_prices = {}
                for ticker in all_tickers:
                    binance_symbol = ticker.get("symbol", "")
                    if binance_symbol.endswith("USDT"):
                        base_symbol = binance_symbol[:-4]
                        binance_prices[base_symbol] = ticker
                
                markets = []
                for idx, crypto in enumerate(DEFAULT_CRYPTOS):
                    symbol = crypto["symbol"]
                    ticker_data = binance_prices.get(symbol)
                    
                    if ticker_data:
                        price = float(ticker_data.get("lastPrice", 0))
                        volume = float(ticker_data.get("volume", 0)) * price
                        
                        markets.append({
                            "symbol": symbol,
                            "name": crypto["name"],
                            "logo": get_crypto_logo_url(crypto["cmc_id"]),
                            "price": price,
                            "change_1h": 0,  # Binance doesn't provide 1h change in this endpoint
                            "change_24h": float(ticker_data.get("priceChangePercent", 0)),
                            "change_7d": 0,  # Would need separate API call
                            "volume_24h": volume,
                            "market_cap": 0,  # Binance doesn't provide market cap
                            "rank": idx + 1,  # Use our list order as rank
                        })
                    else:
                        # Crypto not found on Binance, add with zero values
                        markets.append({
                            "symbol": symbol,
                            "name": crypto["name"],
                            "logo": get_crypto_logo_url(crypto["cmc_id"]),
                            "price": 0,
                            "change_1h": 0,
                            "change_24h": 0,
                            "change_7d": 0,
                            "volume_24h": 0,
                            "market_cap": 0,
                            "rank": idx + 1,
                        })
                
                MARKETS_CACHE["data"] = markets
                MARKETS_CACHE["updated_at"] = now
                
                return await convert_markets_to_currency(markets, currency)
    
    except Exception as e:
        print(f"Failed to fetch market data from Binance: {e}")
    
    # Return cached or fallback data
    if MARKETS_CACHE["data"]:
        return await convert_markets_to_currency(MARKETS_CACHE["data"], currency)
    
    # Return default/fallback data
    return await get_fallback_markets(currency)


async def convert_markets_to_currency(markets: list, currency: str) -> dict:
    """Convert market data to target currency"""
    if currency == "USD":
        return {
            "currency": currency,
            "markets": markets,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    rates = await get_exchange_rates()
    rate = rates.get(currency, 1.0)
    
    converted = []
    for m in markets:
        converted.append({
            **m,
            "price": (m.get("price") or 0) * rate,
            "volume_24h": (m.get("volume_24h") or 0) * rate,
            "market_cap": (m.get("market_cap") or 0) * rate,
        })
    
    return {
        "currency": currency,
        "markets": converted,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


async def get_fallback_markets(currency: str) -> dict:
    """Return fallback market data when API is unavailable"""
    # Fallback prices (approximate)
    fallback_prices = {
        "BTC": 65000, "ETH": 3500, "USDT": 1, "BNB": 600, "SOL": 150,
        "XRP": 0.60, "USDC": 1, "ADA": 0.45, "DOGE": 0.12, "TRX": 0.12,
        "AVAX": 35, "LINK": 15, "TON": 6, "SHIB": 0.000025, "DOT": 7,
        "BCH": 450, "NEAR": 5, "MATIC": 0.55, "LTC": 85, "UNI": 10,
    }
    
    markets = []
    for crypto in DEFAULT_CRYPTOS[:20]:  # Limit to first 20 for fallback
        price = fallback_prices.get(crypto["symbol"], 1)
        markets.append({
            "symbol": crypto["symbol"],
            "name": crypto["name"],
            "logo": get_crypto_logo_url(crypto["cmc_id"]),
            "price": price,
            "change_1h": 0,
            "change_24h": 0,
            "change_7d": 0,
            "volume_24h": 0,
            "market_cap": 0,
            "rank": DEFAULT_CRYPTOS.index(crypto) + 1,
        })
    
    return await convert_markets_to_currency(markets, currency)


@router.get("/markets/stats")
async def get_market_stats(currency: str = "USD"):
    """Get market statistics summary"""
    markets_response = await get_markets_data(currency)
    markets = markets_response.get("markets", [])
    
    if not markets:
        return {
            "total_market_cap": 0,
            "total_volume_24h": 0,
            "btc_dominance": 0,
            "top_gainer": None,
            "top_loser": None,
            "currency": currency
        }
    
    total_market_cap = sum(m.get("market_cap") or 0 for m in markets)
    total_volume = sum(m.get("volume_24h") or 0 for m in markets)
    
    btc_market = next((m for m in markets if m["symbol"] == "BTC"), None)
    btc_market_cap = (btc_market.get("market_cap") or 0) if btc_market else 0
    btc_dominance = (btc_market_cap / total_market_cap * 100) if btc_market and total_market_cap > 0 else 0
    
    sorted_by_change = sorted(markets, key=lambda x: x.get("change_24h") or 0, reverse=True)
    top_gainer = sorted_by_change[0] if sorted_by_change else None
    top_loser = sorted_by_change[-1] if sorted_by_change else None
    
    return {
        "total_market_cap": total_market_cap,
        "total_volume_24h": total_volume,
        "btc_dominance": round(btc_dominance, 2),
        "top_gainer": {
            "symbol": top_gainer["symbol"],
            "name": top_gainer["name"],
            "change_24h": round(top_gainer.get("change_24h") or 0, 2)
        } if top_gainer else None,
        "top_loser": {
            "symbol": top_loser["symbol"],
            "name": top_loser["name"],
            "change_24h": round(top_loser.get("change_24h") or 0, 2)
        } if top_loser else None,
        "currency": currency,
        "total_cryptos": len(markets)
    }
