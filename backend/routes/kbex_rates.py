from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/kbex-rates", tags=["KBEX Rates"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

# Auth dependency
from routes.auth import get_current_user

async def get_current_user_id(current_user=Depends(get_current_user)):
    if hasattr(current_user, 'id'):
        return current_user.id
    return current_user.get("id", current_user.get("user_id"))

PRODUCTS = ["otc", "exchange", "escrow", "spot"]
TIERS = ["broker", "standard", "premium", "vip", "institucional"]
DEFAULT_TIER_FEES = {
    "broker": 0,
    "standard": 2500,
    "premium": 5000,
    "vip": 15000,
    "institucional": 50000,
}


async def get_tier_fees() -> dict:
    """Get tier fees from DB, or defaults if not configured."""
    db = get_db()
    doc = await db.kbex_settings.find_one({"type": "tier_fees"}, {"_id": 0})
    if doc and "fees" in doc:
        return doc["fees"]
    return DEFAULT_TIER_FEES


class RateConfig(BaseModel):
    product: str
    tier: str
    asset: str = "*"
    buy_spread_pct: float = 0.0
    sell_spread_pct: float = 0.0


class RateBulkUpdate(BaseModel):
    rates: List[RateConfig]


class TierUpgrade(BaseModel):
    user_id: str
    new_tier: str
    deduct_from_balance: bool = True
    currency: str = "EUR"


# ==================== ADMIN: Manage Rate Configs ====================

@router.get("/config")
async def get_rate_configs(admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    configs = await db.kbex_rates.find({}, {"_id": 0}).to_list(1000)
    fees = await get_tier_fees()
    return {
        "rates": configs,
        "products": PRODUCTS,
        "tiers": TIERS,
        "tier_fees": fees,
    }


@router.put("/config")
async def update_rate_configs(payload: RateBulkUpdate, admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    now = datetime.now(timezone.utc).isoformat()
    updated = 0

    for rate in payload.rates:
        if rate.product not in PRODUCTS and rate.product != "*":
            continue
        if rate.tier not in TIERS and rate.tier != "*":
            continue

        await db.kbex_rates.update_one(
            {"product": rate.product, "tier": rate.tier, "asset": rate.asset.upper() if rate.asset != "*" else "*"},
            {"$set": {
                "product": rate.product,
                "tier": rate.tier,
                "asset": rate.asset.upper() if rate.asset != "*" else "*",
                "buy_spread_pct": rate.buy_spread_pct,
                "sell_spread_pct": rate.sell_spread_pct,
                "updated_by": admin_id,
                "updated_at": now,
            }},
            upsert=True,
        )
        updated += 1

    await db.kbex_rates_audit.insert_one({
        "action": "bulk_update",
        "updated_by": admin_id,
        "updated_at": now,
        "count": updated,
    })

    return {"success": True, "updated": updated}


@router.delete("/config")
async def delete_rate_config(product: str, tier: str, asset: str = "*", admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await db.kbex_rates.delete_one({"product": product, "tier": tier, "asset": asset.upper() if asset != "*" else "*"})
    return {"success": True, "deleted": result.deleted_count}


# ==================== TIER FEES MANAGEMENT ====================

class TierFeesUpdate(BaseModel):
    fees: dict


@router.put("/tier-fees")
async def update_tier_fees(payload: TierFeesUpdate, admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    current = await get_tier_fees()
    updated_fees = {**current, **{k: float(v) for k, v in payload.fees.items() if k in TIERS}}
    now = datetime.now(timezone.utc).isoformat()

    await db.kbex_settings.update_one(
        {"type": "tier_fees"},
        {"$set": {"type": "tier_fees", "fees": updated_fees, "updated_by": admin_id, "updated_at": now}},
        upsert=True,
    )

    await db.kbex_rates_audit.insert_one({
        "action": "tier_fees_update",
        "updated_by": admin_id,
        "fees": updated_fees,
        "updated_at": now,
    })

    return {"success": True, "fees": updated_fees}


# ==================== RESOLVE: Get KBEX Rate ====================

async def resolve_spread(product: str, tier: str, asset: str) -> dict:
    """Resolve the buy/sell spread for a given product, tier, and asset.
    Lookup order: product+tier+asset -> product+tier+* -> *+tier+* -> defaults(0%)
    """
    db = get_db()
    asset_upper = asset.upper()

    rate = await db.kbex_rates.find_one(
        {"product": product, "tier": tier, "asset": asset_upper}, {"_id": 0}
    )
    if rate:
        return rate

    rate = await db.kbex_rates.find_one(
        {"product": product, "tier": tier, "asset": "*"}, {"_id": 0}
    )
    if rate:
        return rate

    rate = await db.kbex_rates.find_one(
        {"product": "*", "tier": tier, "asset": "*"}, {"_id": 0}
    )
    if rate:
        return rate

    return {"buy_spread_pct": 0, "sell_spread_pct": 0}


@router.get("/resolve")
async def resolve_rate(
    asset: str,
    product: str = "otc",
    user_id_param: Optional[str] = None,
    current_user: str = Depends(get_current_user_id),
):
    db = get_db()
    target_user_id = user_id_param or current_user
    user = await db.users.find_one({"id": target_user_id}, {"_id": 0, "membership_level": 1})
    tier = (user or {}).get("membership_level", "standard")

    spread = await resolve_spread(product, tier, asset)
    return {
        "asset": asset,
        "product": product,
        "tier": tier,
        "buy_spread_pct": spread.get("buy_spread_pct", 0),
        "sell_spread_pct": spread.get("sell_spread_pct", 0),
    }


# ==================== TIER MANAGEMENT ====================

@router.get("/tiers")
async def get_tier_info(admin_id: str = Depends(get_current_user_id)):
    fees = await get_tier_fees()
    return {
        "tiers": TIERS,
        "fees": fees,
    }


@router.post("/upgrade-tier")
async def upgrade_user_tier(payload: TierUpgrade, admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    if payload.new_tier not in TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {payload.new_tier}")

    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_tier = user.get("membership_level", "standard")
    fees = await get_tier_fees()
    fee = fees.get(payload.new_tier, 0)
    now = datetime.now(timezone.utc).isoformat()

    if payload.deduct_from_balance and fee > 0:
        currency = payload.currency.upper()
        wallet = await db.wallets.find_one(
            {"user_id": payload.user_id, "currency": currency}, {"_id": 0}
        )
        balance = (wallet or {}).get("balance", 0)
        if balance < fee:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {currency} balance: {balance:.2f} < {fee:.2f}"
            )
        await db.wallets.update_one(
            {"user_id": payload.user_id, "currency": currency},
            {"$inc": {"balance": -fee}},
        )
        await db.transactions.insert_one({
            "user_id": payload.user_id,
            "type": "tier_upgrade_fee",
            "amount": -fee,
            "currency": currency,
            "description": f"Tier upgrade: {old_tier} -> {payload.new_tier}",
            "created_at": now,
        })

    await db.users.update_one(
        {"id": payload.user_id},
        {"$set": {
            "membership_level": payload.new_tier,
            "membership_fee_paid_at": now,
            "membership_expires_at": datetime(
                datetime.now(timezone.utc).year + 1,
                datetime.now(timezone.utc).month,
                datetime.now(timezone.utc).day,
                tzinfo=timezone.utc,
            ).isoformat(),
            "membership_fee_amount": fee,
            "updated_at": now,
        }},
    )

    await db.kbex_rates_audit.insert_one({
        "action": "tier_upgrade",
        "user_id": payload.user_id,
        "old_tier": old_tier,
        "new_tier": payload.new_tier,
        "fee": fee,
        "deducted": payload.deduct_from_balance,
        "admin_id": admin_id,
        "created_at": now,
    })

    logger.info(f"Tier upgraded: {payload.user_id} from {old_tier} to {payload.new_tier} (fee: {fee})")
    return {
        "success": True,
        "old_tier": old_tier,
        "new_tier": payload.new_tier,
        "fee_charged": fee if payload.deduct_from_balance else 0,
    }


# ==================== MEMBERSHIP RENEWAL ALERTS ====================

@router.get("/renewal-alerts")
async def get_renewal_alerts(admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    threshold = (now + timedelta(days=30)).isoformat()

    expiring = await db.users.find(
        {
            "user_type": "client",
            "membership_expires_at": {"$lte": threshold, "$ne": None},
        },
        {"_id": 0, "id": 1, "name": 1, "email": 1, "membership_level": 1,
         "membership_expires_at": 1, "membership_fee_paid_at": 1},
    ).to_list(100)

    return {"alerts": expiring, "threshold_days": 30}


# ==================== SEED DEFAULTS ====================

@router.post("/seed-defaults")
async def seed_default_rates(admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    defaults = {
        "broker":        {"buy": 0.1, "sell": 0.1},
        "standard":      {"buy": 0.8, "sell": 0.5},
        "premium":       {"buy": 0.5, "sell": 0.3},
        "vip":           {"buy": 0.3, "sell": 0.2},
        "institucional": {"buy": 0.1, "sell": 0.1},
    }

    now = datetime.now(timezone.utc).isoformat()
    count = 0
    for product in PRODUCTS:
        for tier, spreads in defaults.items():
            existing = await db.kbex_rates.find_one({"product": product, "tier": tier, "asset": "*"})
            if not existing:
                await db.kbex_rates.insert_one({
                    "product": product,
                    "tier": tier,
                    "asset": "*",
                    "buy_spread_pct": spreads["buy"],
                    "sell_spread_pct": spreads["sell"],
                    "updated_by": admin_id,
                    "updated_at": now,
                })
                count += 1

    return {"success": True, "seeded": count}


# ==================== ESCROW FEE TIERS ====================

class EscrowFeeTier(BaseModel):
    min_amount: float
    max_amount: float  # Use -1 for unlimited
    fee_pct: float
    min_fee: float


class EscrowFeeTiersUpdate(BaseModel):
    tiers: List[EscrowFeeTier]


@router.get("/escrow-fees")
async def get_escrow_fees(admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    doc = await db.kbex_settings.find_one({"type": "escrow_fees"}, {"_id": 0})
    tiers = (doc or {}).get("tiers", [])
    return {"tiers": tiers}


@router.put("/escrow-fees")
async def update_escrow_fees(payload: EscrowFeeTiersUpdate, admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    now = datetime.now(timezone.utc).isoformat()
    tiers_data = [t.dict() for t in payload.tiers]

    await db.kbex_settings.update_one(
        {"type": "escrow_fees"},
        {"$set": {"type": "escrow_fees", "tiers": tiers_data, "updated_by": admin_id, "updated_at": now}},
        upsert=True,
    )

    await db.kbex_rates_audit.insert_one({
        "action": "escrow_fees_update",
        "updated_by": admin_id,
        "tiers": tiers_data,
        "updated_at": now,
    })

    return {"success": True, "tiers": tiers_data}


@router.post("/escrow-fees/seed")
async def seed_escrow_fees(admin_id: str = Depends(get_current_user_id)):
    db = get_db()
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await db.kbex_settings.find_one({"type": "escrow_fees"})
    if existing:
        return {"success": True, "seeded": 0, "message": "Already configured"}

    default_tiers = [
        {"min_amount": 0, "max_amount": 100000, "fee_pct": 1.5, "min_fee": 1000},
        {"min_amount": 100001, "max_amount": 500000, "fee_pct": 1.0, "min_fee": 1500},
        {"min_amount": 500001, "max_amount": 1000000, "fee_pct": 0.75, "min_fee": 5000},
        {"min_amount": 1000001, "max_amount": 5000000, "fee_pct": 0.5, "min_fee": 7500},
        {"min_amount": 5000001, "max_amount": 10000000, "fee_pct": 0.35, "min_fee": 25000},
        {"min_amount": 10000001, "max_amount": -1, "fee_pct": 0.25, "min_fee": 25000},
    ]

    now = datetime.now(timezone.utc).isoformat()
    await db.kbex_settings.insert_one({
        "type": "escrow_fees",
        "tiers": default_tiers,
        "updated_by": admin_id,
        "updated_at": now,
    })

    return {"success": True, "seeded": len(default_tiers)}


async def resolve_escrow_fee(amount: float) -> dict:
    """Resolve the escrow fee for a given amount."""
    db = get_db()
    doc = await db.kbex_settings.find_one({"type": "escrow_fees"}, {"_id": 0})
    tiers = (doc or {}).get("tiers", [])

    for tier in tiers:
        max_amt = tier.get("max_amount", -1)
        if amount >= tier["min_amount"] and (max_amt == -1 or amount <= max_amt):
            fee_calculated = amount * (tier["fee_pct"] / 100)
            fee_final = max(fee_calculated, tier["min_fee"])
            return {
                "amount": amount,
                "fee_pct": tier["fee_pct"],
                "min_fee": tier["min_fee"],
                "fee_calculated": round(fee_calculated, 2),
                "fee_final": round(fee_final, 2),
                "tier_range": f"{tier['min_amount']} - {'∞' if max_amt == -1 else max_amt}",
            }

    return {"amount": amount, "fee_pct": 0, "min_fee": 0, "fee_calculated": 0, "fee_final": 0, "tier_range": "N/A"}


@router.get("/escrow-fees/calculate")
async def calculate_escrow_fee(amount: float, _user: str = Depends(get_current_user_id)):
    return await resolve_escrow_fee(amount)

