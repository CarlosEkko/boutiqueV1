from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel
import uuid
import secrets
import os
import httpx

from models.trading import (
    TradingFees, TradingFeesUpdate,
    UserTradingLimits, UserTradingLimitsUpdate,
    SupportedCrypto,
    TradingOrder, OrderType, OrderStatus, PaymentMethod,
    CreateBuyOrder, CreateSellOrder, CreateSwapOrder,
    BankAccount, CreateBankAccount,
    BankTransfer, BankTransferStatus, CreateBankTransferDeposit, SubmitBankTransferProof,
    PaymentTransaction
)
from utils.auth import get_current_user_id
from routes.admin import get_admin_user, get_internal_user

router = APIRouter(prefix="/trading", tags=["Trading"])

# Database reference
db = None

# Stripe integration
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")

# CoinMarketCap
COINMARKETCAP_API_KEY = os.environ.get("COINMARKETCAP_API_KEY", "")
COINMARKETCAP_API_URL = "https://pro-api.coinmarketcap.com/v1"

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
    """Get current exchange rates from cache or fetch from API"""
    global EXCHANGE_RATES_CACHE
    
    now = datetime.now(timezone.utc)
    
    # Check if cache is valid (5 minutes)
    if EXCHANGE_RATES_CACHE["updated_at"]:
        cache_age = (now - EXCHANGE_RATES_CACHE["updated_at"]).total_seconds()
        if cache_age < 300:  # 5 minutes
            return EXCHANGE_RATES_CACHE["rates"]
    
    # Try to fetch from CoinMarketCap (they have fiat conversion)
    if COINMARKETCAP_API_KEY:
        try:
            headers = {
                "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
                "Accept": "application/json"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get USD price of a stable reference (USDT = 1 USD)
                response = await client.get(
                    f"{COINMARKETCAP_API_URL}/cryptocurrency/quotes/latest",
                    params={"symbol": "USDT", "convert": "EUR,AED,BRL"},
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    usdt_data = data.get("data", {}).get("USDT")
                    if isinstance(usdt_data, list):
                        usdt_data = usdt_data[0]
                    
                    if usdt_data:
                        quotes = usdt_data.get("quote", {})
                        EXCHANGE_RATES_CACHE["rates"] = {
                            "USD": 1.0,
                            "EUR": quotes.get("EUR", {}).get("price", 0.92),
                            "AED": quotes.get("AED", {}).get("price", 3.67),
                            "BRL": quotes.get("BRL", {}).get("price", 5.90)
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


async def get_crypto_price(symbol: str) -> dict:
    """Get current crypto price from cache or CoinMarketCap"""
    # Check cache first
    cached = await db.crypto_prices_cache.find_one({"symbol": symbol}, {"_id": 0})
    
    if cached:
        cache_time = cached.get("updated_at")
        if isinstance(cache_time, str):
            cache_time = datetime.fromisoformat(cache_time)
        
        # Cache valid for 60 seconds
        if (datetime.now(timezone.utc) - cache_time).total_seconds() < 60:
            return cached
    
    # Fetch from CoinMarketCap
    if not COINMARKETCAP_API_KEY:
        raise HTTPException(status_code=503, detail="Price service not configured")
    
    headers = {
        "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
        "Accept": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{COINMARKETCAP_API_URL}/cryptocurrency/quotes/latest",
            params={"symbol": symbol, "convert": "USD"},
            headers=headers
        )
        response.raise_for_status()
        data = response.json()
        
        crypto_data = data.get("data", {}).get(symbol)
        if not crypto_data:
            raise HTTPException(status_code=404, detail=f"Cryptocurrency {symbol} not found")
        
        # Handle case where symbol maps to multiple coins
        if isinstance(crypto_data, list):
            crypto_data = crypto_data[0]
        
        quote = crypto_data.get("quote", {}).get("USD", {})
        
        price_info = {
            "symbol": symbol,
            "name": crypto_data.get("name"),
            "price_usd": quote.get("price", 0),
            "change_24h": quote.get("percent_change_24h", 0),
            "market_cap": quote.get("market_cap"),
            "volume_24h": quote.get("volume_24h"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update cache
        await db.crypto_prices_cache.update_one(
            {"symbol": symbol},
            {"$set": price_info},
            upsert=True
        )
        
        return price_info


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


@router.put("/admin/fees", response_model=dict)
async def update_fees(
    fees_update: TradingFeesUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update trading fees configuration"""
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
    
    if not cryptos:
        # Return default top cryptos if none configured
        default_cryptos = [
            {"symbol": "BTC", "name": "Bitcoin", "cmc_id": 1, "networks": ["bitcoin", "lightning"]},
            {"symbol": "ETH", "name": "Ethereum", "cmc_id": 1027, "networks": ["ethereum"]},
            {"symbol": "USDT", "name": "Tether", "cmc_id": 825, "networks": ["ethereum", "tron", "bsc"]},
            {"symbol": "BNB", "name": "BNB", "cmc_id": 1839, "networks": ["bsc"]},
            {"symbol": "SOL", "name": "Solana", "cmc_id": 5426, "networks": ["solana"]},
            {"symbol": "XRP", "name": "XRP", "cmc_id": 52, "networks": ["xrpl"]},
            {"symbol": "USDC", "name": "USD Coin", "cmc_id": 3408, "networks": ["ethereum", "solana", "polygon"]},
            {"symbol": "ADA", "name": "Cardano", "cmc_id": 2010, "networks": ["cardano"]},
            {"symbol": "DOGE", "name": "Dogecoin", "cmc_id": 74, "networks": ["dogecoin"]},
            {"symbol": "TRX", "name": "TRON", "cmc_id": 1958, "networks": ["tron"]},
        ]
        cryptos = default_cryptos
    
    # Fetch current prices and convert to requested currency
    for crypto in cryptos:
        try:
            price_info = await get_crypto_price(crypto["symbol"])
            price_usd = price_info.get("price_usd", 0)
            market_cap_usd = price_info.get("market_cap")
            
            crypto["price_usd"] = price_usd
            crypto["price"] = convert_price(price_usd, currency, rates)
            crypto["currency"] = currency
            crypto["change_24h"] = price_info.get("change_24h", 0)
            crypto["market_cap"] = convert_price(market_cap_usd, currency, rates) if market_cap_usd else None
        except Exception:
            crypto["price_usd"] = 0
            crypto["price"] = 0
            crypto["currency"] = currency
            crypto["change_24h"] = 0
    
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
async def get_public_fees():
    """Get current trading fees (public)"""
    fees = await get_trading_fees()
    return {
        "buy_fee_percent": fees.buy_fee_percent,
        "sell_fee_percent": fees.sell_fee_percent,
        "swap_fee_percent": fees.swap_fee_percent,
        "network_fees": fees.network_fees
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
    
    # Get fees
    fees = await get_trading_fees()
    
    # Calculate amounts
    spread_amount = market_price * (fees.buy_spread_percent / 100)
    execution_price = market_price + spread_amount
    
    fee_amount = max(order.fiat_amount * (fees.buy_fee_percent / 100), fees.min_buy_fee_usd)
    
    # Network fee
    network_fee = fees.network_fees.get(order.network or "ethereum", 5.0)
    
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
        fee_percent=fees.buy_fee_percent,
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
        
        # Create bank transfer record
        reference_code = f"KB{secrets.token_hex(4).upper()}"
        
        bank_transfer = BankTransfer(
            user_id=user["id"],
            user_email=user["email"],
            order_id=trading_order.id,
            transfer_type="deposit",
            amount=total_amount,
            currency="EUR",
            recipient_iban="PT50 0000 0000 0000 0000 0000 0",  # KBEX bank account
            recipient_bank="KBEX Exchange Ltd",
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
                "recipient_iban": bank_transfer.recipient_iban,
                "recipient_bank": bank_transfer.recipient_bank,
                "reference_code": reference_code,
                "amount": total_amount,
                "currency": "EUR"
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
    
    # Get fees
    fees = await get_trading_fees()
    
    # Calculate amounts with spread
    spread_amount = market_price * (fees.sell_spread_percent / 100)
    execution_price = market_price - spread_amount
    
    gross_amount = order.crypto_amount * execution_price
    fee_amount = max(gross_amount * (fees.sell_fee_percent / 100), fees.min_sell_fee_usd)
    
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
        fee_percent=fees.sell_fee_percent,
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
    
    # Get fees
    fees = await get_trading_fees()
    
    # Calculate with spread
    fee_amount = max(fiat_amount * (fees.swap_fee_percent / 100), fees.min_swap_fee_usd)
    spread_cost = fiat_amount * (fees.swap_spread_percent / 100)
    
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
        fee_percent=fees.swap_fee_percent,
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

# KBEX Bank accounts for receiving deposits (per currency)
KBEX_BANK_ACCOUNTS = {
    "EUR": {
        "bank_name": "KBEX Exchange Ltd",
        "iban": "PT50 0000 0000 0000 0000 0000 0",
        "bic": "KBEXPTPL",
        "account_holder": "KBEX Exchange Ltd",
        "bank_address": "Lisbon, Portugal"
    },
    "USD": {
        "bank_name": "KBEX Exchange Inc",
        "iban": "US00 0000 0000 0000 0000 0000",
        "bic": "KBEXUSNY",
        "account_holder": "KBEX Exchange Inc",
        "bank_address": "New York, USA",
        "routing_number": "021000021",
        "account_number": "123456789"
    },
    "AED": {
        "bank_name": "KBEX Exchange DMCC",
        "iban": "AE00 0000 0000 0000 0000 000",
        "bic": "KBEXAEAD",
        "account_holder": "KBEX Exchange DMCC",
        "bank_address": "Dubai, UAE"
    },
    "BRL": {
        "bank_name": "KBEX Brasil Ltda",
        "pix_key": "depositos@kbex.io",
        "account_holder": "KBEX Brasil Ltda",
        "bank_address": "São Paulo, Brasil",
        "bank": "Banco do Brasil",
        "agency": "0001",
        "account": "12345-6"
    }
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
    if currency not in KBEX_BANK_ACCOUNTS:
        raise HTTPException(status_code=400, detail=f"Currency {currency} not supported. Available: EUR, USD, AED, BRL")
    
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
        recipient_iban=KBEX_BANK_ACCOUNTS[currency].get("iban"),
        recipient_bank=KBEX_BANK_ACCOUNTS[currency].get("bank_name"),
        reference_code=reference_code,
        status=BankTransferStatus.PENDING
    )
    
    # Save to database
    transfer_dict = bank_transfer.model_dump()
    transfer_dict["created_at"] = transfer_dict["created_at"].isoformat()
    transfer_dict["updated_at"] = transfer_dict["updated_at"].isoformat()
    await db.bank_transfers.insert_one(transfer_dict)
    
    # Get bank details for response
    bank_details = KBEX_BANK_ACCOUNTS[currency].copy()
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
    
    # Add bank details
    currency = deposit.get("currency", "EUR")
    if currency in KBEX_BANK_ACCOUNTS:
        deposit["bank_details"] = KBEX_BANK_ACCOUNTS[currency].copy()
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
