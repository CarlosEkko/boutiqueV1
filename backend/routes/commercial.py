"""
Commercial Management Module - KBEX Exchange
Gestão Comercial: Vendedores, Equipas, Metas, KPIs, Produtos
Integrates with internal users and OTC deals
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from enum import Enum
import uuid

router = APIRouter(prefix="/commercial", tags=["Commercial Management"])

db = None

def set_db(database):
    global db
    db = database

from utils.auth import get_current_user_id


# ==================== ENUMS ====================

class SellerStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"

class ContractType(str, Enum):
    FIXED = "fixed"
    COMMISSION = "commission"
    HYBRID = "hybrid"

class GoalPeriod(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"

class GoalMetric(str, Enum):
    VOLUME = "volume"
    REVENUE = "revenue"
    NEW_CLIENTS = "new_clients"
    DEALS_COUNT = "deals_count"
    MARGIN = "margin"

class ProductType(str, Enum):
    SPOT = "spot"
    OTC = "otc"
    MARGIN = "margin"
    FUTURES = "futures"
    STAKING = "staking"
    COPY_TRADING = "copy_trading"


# ==================== REQUEST MODELS ====================

class SellerProfileUpdate(BaseModel):
    team_ids: Optional[List[str]] = None
    contract_type: Optional[str] = None
    seller_status: Optional[str] = None
    commission_rate: Optional[float] = None
    base_salary: Optional[float] = None
    notes: Optional[str] = None

class TeamCreate(BaseModel):
    name: str
    region: str
    leader_id: Optional[str] = None
    description: Optional[str] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    leader_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class GoalCreate(BaseModel):
    seller_id: str
    period: str = "monthly"
    metric: str = "volume"
    target_value: float
    start_date: str
    end_date: str
    product_type: Optional[str] = None
    description: Optional[str] = None

class GoalUpdate(BaseModel):
    target_value: Optional[float] = None
    description: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    product_type: str
    base_currency: Optional[str] = None
    quote_currency: Optional[str] = None
    avg_margin_pct: Optional[float] = 0
    fee_structure: Optional[Dict[str, Any]] = None
    is_active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_type: Optional[str] = None
    base_currency: Optional[str] = None
    quote_currency: Optional[str] = None
    avg_margin_pct: Optional[float] = None
    fee_structure: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class DealRegistration(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    product_id: Optional[str] = None
    product_type: str = "otc"
    asset: str = "BTC"
    volume: float = 0
    revenue: float = 0
    seller_id: str
    team_id: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    otc_deal_id: Optional[str] = None


# ==================== HELPERS ====================

async def require_admin_or_manager(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = user.get("internal_role", "")
    is_admin = user.get("is_admin", False)
    if not is_admin and role not in ["admin", "global_manager", "manager", "sales_manager"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return user


# ==================== TEAMS ====================

@router.get("/teams")
async def list_teams(user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    teams = []
    async for t in db.commercial_teams.find({}, {"_id": 0}).sort("name", 1):
        # Count members
        member_count = await db.users.count_documents({
            "user_type": "internal",
            "commercial_team_ids": t["id"]
        })
        t["member_count"] = member_count
        teams.append(t)
    return teams


@router.post("/teams")
async def create_team(team: TeamCreate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    doc = {
        "id": str(uuid.uuid4()),
        "name": team.name,
        "region": team.region,
        "leader_id": team.leader_id,
        "description": team.description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await db.commercial_teams.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/teams/{team_id}")
async def update_team(team_id: str, update: TeamUpdate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    data = {k: v for k, v in update.dict().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.commercial_teams.update_one({"id": team_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"success": True}


@router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    await db.commercial_teams.delete_one({"id": team_id})
    return {"success": True}


# ==================== SELLERS (internal users with commercial profile) ====================

@router.get("/sellers")
async def list_sellers(
    region: Optional[str] = None,
    team_id: Optional[str] = None,
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    await require_admin_or_manager(user_id)
    query = {"user_type": "internal"}
    if region:
        query["region"] = region
    if team_id:
        query["commercial_team_ids"] = team_id
    if status:
        query["seller_status"] = status

    sellers = []
    async for u in db.users.find(query, {
        "_id": 0, "password_hash": 0
    }).sort("name", 1):
        sellers.append(u)
    return sellers


@router.get("/sellers/{seller_id}")
async def get_seller(seller_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    seller = await db.users.find_one({"id": seller_id, "user_type": "internal"}, {"_id": 0, "password_hash": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller


@router.put("/sellers/{seller_id}")
async def update_seller_profile(seller_id: str, update: SellerProfileUpdate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    data = {k: v for k, v in update.dict().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one({"id": seller_id, "user_type": "internal"}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Seller not found")
    return {"success": True}


# ==================== GOALS ====================

@router.get("/goals")
async def list_goals(
    seller_id: Optional[str] = None,
    period: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    await require_admin_or_manager(user_id)
    query = {}
    if seller_id:
        query["seller_id"] = seller_id
    if period:
        query["period"] = period
    goals = []
    async for g in db.commercial_goals.find(query, {"_id": 0}).sort("start_date", -1):
        goals.append(g)
    return goals


@router.post("/goals")
async def create_goal(goal: GoalCreate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    doc = {
        "id": str(uuid.uuid4()),
        **goal.dict(),
        "current_value": 0,
        "progress_pct": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await db.commercial_goals.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/goals/{goal_id}")
async def update_goal(goal_id: str, update: GoalUpdate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    data = {k: v for k, v in update.dict().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.commercial_goals.update_one({"id": goal_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"success": True}


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    await db.commercial_goals.delete_one({"id": goal_id})
    return {"success": True}


# ==================== PRODUCTS ====================

@router.get("/products")
async def list_products(user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    products = []
    async for p in db.commercial_products.find({}, {"_id": 0}).sort("name", 1):
        products.append(p)
    return products


@router.post("/products")
async def create_product(product: ProductCreate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    doc = {
        "id": str(uuid.uuid4()),
        **product.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await db.commercial_products.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/products/{product_id}")
async def update_product(product_id: str, update: ProductUpdate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    data = {k: v for k, v in update.dict().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.commercial_products.update_one({"id": product_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    await db.commercial_products.delete_one({"id": product_id})
    return {"success": True}


# ==================== DEAL REGISTRATION ====================

@router.post("/deals")
async def register_deal(deal: DealRegistration, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    doc = {
        "id": str(uuid.uuid4()),
        **deal.dict(),
        "registered_by": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.commercial_deals.insert_one(doc)
    del doc["_id"]

    # Update goal progress for the seller
    await _update_seller_goals(deal.seller_id, deal.volume, deal.revenue)

    return doc


@router.get("/deals")
async def list_commercial_deals(
    seller_id: Optional[str] = None,
    region: Optional[str] = None,
    team_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    await require_admin_or_manager(user_id)
    query = {}
    if seller_id:
        query["seller_id"] = seller_id
    if region:
        query["region"] = region
    if team_id:
        query["team_id"] = team_id
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        query.setdefault("created_at", {})["$lte"] = end_date

    deals = []
    async for d in db.commercial_deals.find(query, {"_id": 0}).sort("created_at", -1).limit(500):
        deals.append(d)
    return deals


# ==================== KPIs & DASHBOARD ====================

@router.get("/dashboard/overview")
async def get_dashboard_overview(
    period: str = "monthly",
    user_id: str = Depends(get_current_user_id)
):
    """Global commercial dashboard - KPIs overview"""
    user = await require_admin_or_manager(user_id)

    now = datetime.now(timezone.utc)
    if period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarterly":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "annual":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    start_iso = start.isoformat()

    # Aggregate deals for the period (from commercial_deals + otc_deals)
    pipeline_commercial = [
        {"$match": {"created_at": {"$gte": start_iso}}},
        {"$group": {
            "_id": None,
            "total_volume": {"$sum": "$volume"},
            "total_revenue": {"$sum": "$revenue"},
            "deal_count": {"$sum": 1},
        }}
    ]

    commercial_stats = {"total_volume": 0, "total_revenue": 0, "deal_count": 0}
    async for doc in db.commercial_deals.aggregate(pipeline_commercial):
        commercial_stats = {
            "total_volume": doc.get("total_volume", 0),
            "total_revenue": doc.get("total_revenue", 0),
            "deal_count": doc.get("deal_count", 0),
        }

    # Also aggregate from otc_deals
    pipeline_otc = [
        {"$match": {"created_at": {"$gte": start_iso}}},
        {"$group": {
            "_id": None,
            "total_volume": {"$sum": {"$multiply": ["$quantity", "$reference_price"]}},
            "total_revenue": {"$sum": "$commission_total"},
            "deal_count": {"$sum": 1},
        }}
    ]

    otc_stats = {"total_volume": 0, "total_revenue": 0, "deal_count": 0}
    async for doc in db.otc_deals.aggregate(pipeline_otc):
        otc_stats = {
            "total_volume": doc.get("total_volume", 0),
            "total_revenue": doc.get("total_revenue", 0),
            "deal_count": doc.get("deal_count", 0),
        }

    # Total sellers
    total_sellers = await db.users.count_documents({"user_type": "internal", "internal_role": {"$in": ["sales", "sales_manager"]}})
    active_sellers = await db.users.count_documents({"user_type": "internal", "internal_role": {"$in": ["sales", "sales_manager"]}, "seller_status": {"$ne": "inactive"}})

    # Total teams
    total_teams = await db.commercial_teams.count_documents({"is_active": True})

    # Active goals
    active_goals = await db.commercial_goals.count_documents({
        "start_date": {"$lte": now.isoformat()},
        "end_date": {"$gte": now.isoformat()}
    })

    return {
        "period": period,
        "start_date": start_iso,
        "kpis": {
            "total_volume": commercial_stats["total_volume"] + otc_stats["total_volume"],
            "total_revenue": commercial_stats["total_revenue"] + otc_stats["total_revenue"],
            "total_deals": commercial_stats["deal_count"] + otc_stats["deal_count"],
            "avg_ticket": (
                (commercial_stats["total_volume"] + otc_stats["total_volume"]) /
                max(commercial_stats["deal_count"] + otc_stats["deal_count"], 1)
            ),
        },
        "team_stats": {
            "total_sellers": total_sellers,
            "active_sellers": active_sellers,
            "total_teams": total_teams,
            "active_goals": active_goals,
        }
    }


@router.get("/dashboard/sellers-ranking")
async def get_sellers_ranking(
    period: str = "monthly",
    metric: str = "volume",
    limit: int = 20,
    user_id: str = Depends(get_current_user_id)
):
    """Ranking of sellers by volume, revenue, or deals count"""
    await require_admin_or_manager(user_id)

    now = datetime.now(timezone.utc)
    if period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "quarterly":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    start_iso = start.isoformat()

    # Aggregate commercial deals by seller
    sort_field = "$volume" if metric == "volume" else "$revenue" if metric == "revenue" else 1
    group_sum = {"$sum": "$volume"} if metric == "volume" else {"$sum": "$revenue"} if metric == "revenue" else {"$sum": 1}

    pipeline = [
        {"$match": {"created_at": {"$gte": start_iso}}},
        {"$group": {
            "_id": "$seller_id",
            "value": group_sum,
            "deal_count": {"$sum": 1},
            "total_volume": {"$sum": "$volume"},
            "total_revenue": {"$sum": "$revenue"},
        }},
        {"$sort": {"value": -1}},
        {"$limit": limit}
    ]

    ranking = []
    async for doc in db.commercial_deals.aggregate(pipeline):
        seller = await db.users.find_one({"id": doc["_id"]}, {"_id": 0, "id": 1, "name": 1, "email": 1, "region": 1, "internal_role": 1})
        if seller:
            ranking.append({
                **seller,
                "value": doc["value"],
                "deal_count": doc["deal_count"],
                "total_volume": doc["total_volume"],
                "total_revenue": doc["total_revenue"],
            })

    return ranking


@router.get("/dashboard/teams-ranking")
async def get_teams_ranking(
    period: str = "monthly",
    user_id: str = Depends(get_current_user_id)
):
    """Ranking of teams by total volume"""
    await require_admin_or_manager(user_id)

    now = datetime.now(timezone.utc)
    if period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    start_iso = start.isoformat()

    pipeline = [
        {"$match": {"created_at": {"$gte": start_iso}, "team_id": {"$ne": None}}},
        {"$group": {
            "_id": "$team_id",
            "total_volume": {"$sum": "$volume"},
            "total_revenue": {"$sum": "$revenue"},
            "deal_count": {"$sum": 1},
        }},
        {"$sort": {"total_volume": -1}}
    ]

    ranking = []
    async for doc in db.commercial_deals.aggregate(pipeline):
        team = await db.commercial_teams.find_one({"id": doc["_id"]}, {"_id": 0})
        if team:
            ranking.append({
                "team": team,
                "total_volume": doc["total_volume"],
                "total_revenue": doc["total_revenue"],
                "deal_count": doc["deal_count"],
            })

    return ranking


@router.get("/dashboard/seller/{seller_id}/kpis")
async def get_seller_kpis(
    seller_id: str,
    period: str = "monthly",
    user_id: str = Depends(get_current_user_id)
):
    """Individual seller KPIs"""
    await require_admin_or_manager(user_id)

    now = datetime.now(timezone.utc)
    if period == "monthly":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    start_iso = start.isoformat()

    pipeline = [
        {"$match": {"seller_id": seller_id, "created_at": {"$gte": start_iso}}},
        {"$group": {
            "_id": None,
            "total_volume": {"$sum": "$volume"},
            "total_revenue": {"$sum": "$revenue"},
            "deal_count": {"$sum": 1},
            "clients": {"$addToSet": "$client_name"},
        }}
    ]

    kpis = {"total_volume": 0, "total_revenue": 0, "deal_count": 0, "active_clients": 0, "avg_ticket": 0}
    async for doc in db.commercial_deals.aggregate(pipeline):
        kpis = {
            "total_volume": doc.get("total_volume", 0),
            "total_revenue": doc.get("total_revenue", 0),
            "deal_count": doc.get("deal_count", 0),
            "active_clients": len(doc.get("clients", [])),
            "avg_ticket": doc.get("total_volume", 0) / max(doc.get("deal_count", 1), 1),
        }

    # Get active goals
    goals = []
    async for g in db.commercial_goals.find({
        "seller_id": seller_id,
        "start_date": {"$lte": now.isoformat()},
        "end_date": {"$gte": now.isoformat()}
    }, {"_id": 0}):
        goals.append(g)

    return {
        "seller_id": seller_id,
        "period": period,
        "kpis": kpis,
        "goals": goals,
    }


@router.get("/dashboard/regions")
async def get_regional_breakdown(
    period: str = "monthly",
    user_id: str = Depends(get_current_user_id)
):
    """Performance breakdown by region"""
    await require_admin_or_manager(user_id)

    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_iso = start.isoformat()

    pipeline = [
        {"$match": {"created_at": {"$gte": start_iso}, "region": {"$ne": None}}},
        {"$group": {
            "_id": "$region",
            "total_volume": {"$sum": "$volume"},
            "total_revenue": {"$sum": "$revenue"},
            "deal_count": {"$sum": 1},
        }},
        {"$sort": {"total_volume": -1}}
    ]

    regions = []
    async for doc in db.commercial_deals.aggregate(pipeline):
        seller_count = await db.users.count_documents({"user_type": "internal", "region": doc["_id"]})
        regions.append({
            "region": doc["_id"],
            "total_volume": doc["total_volume"],
            "total_revenue": doc["total_revenue"],
            "deal_count": doc["deal_count"],
            "seller_count": seller_count,
        })

    return regions


# ==================== HELPERS ====================

async def _update_seller_goals(seller_id: str, volume: float, revenue: float):
    """Update active goals for a seller when a deal is registered"""
    now = datetime.now(timezone.utc).isoformat()
    async for goal in db.commercial_goals.find({
        "seller_id": seller_id,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }):
        increment = 0
        if goal["metric"] == "volume":
            increment = volume
        elif goal["metric"] == "revenue":
            increment = revenue
        elif goal["metric"] == "deals_count":
            increment = 1

        new_val = goal.get("current_value", 0) + increment
        target = goal.get("target_value", 1)
        progress = min(round((new_val / target) * 100, 1), 100) if target > 0 else 0

        await db.commercial_goals.update_one(
            {"id": goal["id"]},
            {"$set": {
                "current_value": new_val,
                "progress_pct": progress,
                "updated_at": now,
            }}
        )
