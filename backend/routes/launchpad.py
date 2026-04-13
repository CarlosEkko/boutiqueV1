"""
Launchpad / ICO Routes
Token sale creation, management, subscription, and public listing.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/launchpad", tags=["Launchpad"])

db = None

def set_db(database):
    global db
    db = database

def get_db():
    return db

from routes.admin import get_admin_user
from utils.auth import get_current_user_id


async def get_current_user(user_id: str = Depends(get_current_user_id)):
    user = await get_db().users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


# --- Models ---

class TokenSaleCreate(BaseModel):
    name: str
    symbol: str
    description: str = ""
    logo_url: str = ""
    banner_url: str = ""
    price: float
    total_supply: float
    hard_cap: float
    soft_cap: float = 0
    min_allocation: float = 0
    max_allocation: float = 0
    start_date: str
    end_date: str
    distribution_date: str = ""
    whitepaper_url: str = ""
    website_url: str = ""
    network: str = "Ethereum"
    token_type: str = "ERC-20"
    accepted_currencies: List[str] = ["EUR", "USD", "BTC", "ETH"]


class TokenSaleUpdate(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    price: Optional[float] = None
    total_supply: Optional[float] = None
    hard_cap: Optional[float] = None
    soft_cap: Optional[float] = None
    min_allocation: Optional[float] = None
    max_allocation: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    distribution_date: Optional[str] = None
    whitepaper_url: Optional[str] = None
    website_url: Optional[str] = None
    network: Optional[str] = None
    token_type: Optional[str] = None
    status: Optional[str] = None
    featured: Optional[bool] = None
    accepted_currencies: Optional[List[str]] = None


class SubscriptionCreate(BaseModel):
    amount_tokens: float
    payment_currency: str = "EUR"


# --- Helper ---

def _compute_status(sale: dict) -> str:
    """Compute dynamic status based on dates and manual status."""
    manual = sale.get("status", "")
    if manual in ("cancelled", "completed", "active"):
        return manual
    now = datetime.now(timezone.utc).isoformat()
    start = sale.get("start_date", "")
    end = sale.get("end_date", "")
    if start and now < start:
        return "upcoming"
    if end and now > end:
        return "completed"
    if sale.get("tokens_sold", 0) >= sale.get("total_supply", 1):
        return "sold_out"
    return "active"


# --- Public Endpoints ---

@router.get("/sales")
async def list_token_sales(status: str = "all"):
    """List all token sales (public). Optionally filter by status."""
    query = {}
    if status != "all":
        query["status"] = status

    sales = await get_db().token_sales.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)

    # Compute dynamic status & stats
    result = []
    for s in sales:
        s["computed_status"] = _compute_status(s)
        s["progress_pct"] = round((s.get("raised_amount", 0) / s["hard_cap"]) * 100, 1) if s.get("hard_cap") else 0
        if status != "all" and s["computed_status"] != status:
            continue
        result.append(s)

    return {"sales": result, "total": len(result)}


@router.get("/sales/{sale_id}")
async def get_token_sale(sale_id: str):
    """Get a single token sale detail (public)."""
    sale = await get_db().token_sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(404, "Token sale not found")
    sale["computed_status"] = _compute_status(sale)
    sale["progress_pct"] = round((sale.get("raised_amount", 0) / sale["hard_cap"]) * 100, 1) if sale.get("hard_cap") else 0
    
    # Get subscription count
    sub_count = await get_db().launchpad_subscriptions.count_documents({"sale_id": sale_id})
    sale["total_participants"] = sub_count
    return sale


# --- Client Endpoints ---

@router.post("/sales/{sale_id}/subscribe")
async def subscribe_to_sale(sale_id: str, body: SubscriptionCreate, user: dict = Depends(get_current_user)):
    """Client subscribes to a token sale."""
    sale = await get_db().token_sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(404, "Token sale not found")

    status = _compute_status(sale)
    if status != "active":
        raise HTTPException(400, f"Sale is not active (status: {status})")

    # Validate allocation limits
    if sale.get("min_allocation") and body.amount_tokens < sale["min_allocation"]:
        raise HTTPException(400, f"Minimum allocation is {sale['min_allocation']} {sale['symbol']}")
    if sale.get("max_allocation") and body.amount_tokens > sale["max_allocation"]:
        raise HTTPException(400, f"Maximum allocation is {sale['max_allocation']} {sale['symbol']}")

    # Check remaining supply
    remaining = sale["total_supply"] - sale.get("tokens_sold", 0)
    if body.amount_tokens > remaining:
        raise HTTPException(400, f"Only {remaining} {sale['symbol']} tokens remaining")

    # Check existing subscription
    existing = await get_db().launchpad_subscriptions.find_one(
        {"sale_id": sale_id, "user_id": user["id"], "status": {"$ne": "refunded"}}, {"_id": 0}
    )
    if existing:
        raise HTTPException(400, "You have already subscribed to this sale")

    amount_usd = body.amount_tokens * sale["price"]
    now_iso = datetime.now(timezone.utc).isoformat()

    subscription = {
        "id": str(uuid.uuid4()),
        "sale_id": sale_id,
        "sale_name": sale["name"],
        "sale_symbol": sale["symbol"],
        "user_id": user["id"],
        "user_email": user.get("email", ""),
        "user_name": user.get("name", ""),
        "amount_tokens": body.amount_tokens,
        "amount_usd": amount_usd,
        "payment_currency": body.payment_currency,
        "status": "confirmed",
        "created_at": now_iso,
        "confirmed_at": now_iso,
        "distributed_at": None,
    }
    await get_db().launchpad_subscriptions.insert_one(subscription)

    # Update sale stats
    await get_db().token_sales.update_one(
        {"id": sale_id},
        {
            "$inc": {"tokens_sold": body.amount_tokens, "raised_amount": amount_usd},
            "$set": {"updated_at": now_iso}
        }
    )

    return {"message": "Subscription confirmed", "subscription_id": subscription["id"], "amount_tokens": body.amount_tokens, "amount_usd": amount_usd}


@router.get("/my-subscriptions")
async def my_subscriptions(user: dict = Depends(get_current_user)):
    """Client views their own subscriptions."""
    subs = await get_db().launchpad_subscriptions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"subscriptions": subs}


# --- Admin Endpoints ---

@router.post("/admin/sales")
async def create_token_sale(body: TokenSaleCreate, admin: dict = Depends(get_admin_user)):
    """Admin creates a new token sale."""
    now_iso = datetime.now(timezone.utc).isoformat()
    sale = {
        "id": str(uuid.uuid4()),
        **body.dict(),
        "tokens_sold": 0,
        "raised_amount": 0,
        "total_participants": 0,
        "status": "upcoming",
        "featured": False,
        "created_by": admin.get("id", ""),
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await get_db().token_sales.insert_one(sale)
    sale.pop("_id", None)
    return sale


@router.put("/admin/sales/{sale_id}")
async def update_token_sale(sale_id: str, body: TokenSaleUpdate, admin: dict = Depends(get_admin_user)):
    """Admin updates a token sale."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await get_db().token_sales.update_one({"id": sale_id}, {"$set": updates})
    sale = await get_db().token_sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(404, "Token sale not found")
    return sale


@router.delete("/admin/sales/{sale_id}")
async def delete_token_sale(sale_id: str, admin: dict = Depends(get_admin_user)):
    """Admin deletes a token sale (only if no subscriptions)."""
    sub_count = await get_db().launchpad_subscriptions.count_documents({"sale_id": sale_id})
    if sub_count > 0:
        raise HTTPException(400, f"Cannot delete: {sub_count} active subscriptions exist")
    result = await get_db().token_sales.delete_one({"id": sale_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Token sale not found")
    return {"message": "Token sale deleted"}


@router.put("/admin/sales/{sale_id}/toggle-featured")
async def toggle_featured(sale_id: str, admin: dict = Depends(get_admin_user)):
    """Toggle featured status of a token sale."""
    sale = await get_db().token_sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(404, "Token sale not found")
    new_featured = not sale.get("featured", False)
    await get_db().token_sales.update_one(
        {"id": sale_id},
        {"$set": {"featured": new_featured, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"featured": new_featured, "message": f"{'Destaque ativado' if new_featured else 'Destaque removido'}"}



@router.get("/admin/sales/{sale_id}/subscriptions")
async def get_sale_subscriptions(sale_id: str, admin: dict = Depends(get_admin_user)):
    """Admin views all subscriptions for a token sale."""
    subs = await get_db().launchpad_subscriptions.find(
        {"sale_id": sale_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return {"subscriptions": subs, "total": len(subs)}


@router.put("/admin/subscriptions/{sub_id}/distribute")
async def distribute_subscription(sub_id: str, admin: dict = Depends(get_admin_user)):
    """Admin marks a subscription as distributed (tokens delivered)."""
    now_iso = datetime.now(timezone.utc).isoformat()
    result = await get_db().launchpad_subscriptions.update_one(
        {"id": sub_id, "status": "confirmed"},
        {"$set": {"status": "distributed", "distributed_at": now_iso}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Subscription not found or already processed")
    return {"message": "Marked as distributed"}


@router.put("/admin/subscriptions/{sub_id}/refund")
async def refund_subscription(sub_id: str, admin: dict = Depends(get_admin_user)):
    """Admin refunds a subscription."""
    sub = await get_db().launchpad_subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(404, "Subscription not found")
    if sub["status"] == "refunded":
        raise HTTPException(400, "Already refunded")

    now_iso = datetime.now(timezone.utc).isoformat()
    await get_db().launchpad_subscriptions.update_one(
        {"id": sub_id},
        {"$set": {"status": "refunded", "refunded_at": now_iso}}
    )
    # Return tokens to sale pool
    await get_db().token_sales.update_one(
        {"id": sub["sale_id"]},
        {"$inc": {"tokens_sold": -sub["amount_tokens"], "raised_amount": -sub["amount_usd"]}}
    )
    return {"message": "Subscription refunded"}
