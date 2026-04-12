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


# ══════════════════════════════════════════════════════════════
# FASE 2: SISTEMA DE COMISSÕES
# ══════════════════════════════════════════════════════════════

class CommissionTableCreate(BaseModel):
    name: str
    product_type: Optional[str] = None
    region: Optional[str] = None
    team_id: Optional[str] = None
    seller_id: Optional[str] = None
    client_type: Optional[str] = None  # retail, vip, institutional
    commission_type: str = "pct_revenue"  # pct_revenue, pct_volume, fixed, staircase
    rate: float = 0  # base rate (% or fixed)
    staircase_tiers: Optional[List[Dict[str, Any]]] = None  # [{threshold, rate}]
    is_active: bool = True

class CommissionTableUpdate(BaseModel):
    name: Optional[str] = None
    rate: Optional[float] = None
    commission_type: Optional[str] = None
    staircase_tiers: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None

class CommissionRuleCreate(BaseModel):
    name: str
    rule_type: str  # bonus, accelerator, penalty, split, override
    trigger_metric: Optional[str] = None  # volume, revenue, deals_count
    trigger_threshold: Optional[float] = None  # e.g. 120% of goal
    value: float = 0  # bonus amount or multiplier
    value_type: str = "pct"  # pct, fixed
    applies_to_role: Optional[str] = None  # seller, leader, all
    split_leader_pct: Optional[float] = None
    description: Optional[str] = None
    is_active: bool = True

class PaymentPeriodCreate(BaseModel):
    period_label: str  # "Abril 2026", "Q1 2026"
    start_date: str
    end_date: str

class CommissionSimulation(BaseModel):
    seller_id: str
    volume: float = 0
    revenue: float = 0
    deals_count: int = 0
    product_type: Optional[str] = None


# ─── Commission Tables CRUD ───────────────────────────────────

@router.get("/commission-tables")
async def list_commission_tables(user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    tables = []
    async for t in db.commission_tables.find({}, {"_id": 0}).sort("name", 1):
        tables.append(t)
    return tables


@router.post("/commission-tables")
async def create_commission_table(table: CommissionTableCreate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    doc = {
        "id": str(uuid.uuid4()),
        **table.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await db.commission_tables.insert_one(doc)
    # Audit log
    await _log_audit(user_id, "commission_table_created", {"table_id": doc["id"], "name": table.name})
    del doc["_id"]
    return doc


@router.put("/commission-tables/{table_id}")
async def update_commission_table(table_id: str, update: CommissionTableUpdate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    old = await db.commission_tables.find_one({"id": table_id}, {"_id": 0})
    data = {k: v for k, v in update.dict().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.commission_tables.update_one({"id": table_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    await _log_audit(user_id, "commission_table_updated", {"table_id": table_id, "changes": data, "previous": old})
    return {"success": True}


@router.delete("/commission-tables/{table_id}")
async def delete_commission_table(table_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    await db.commission_tables.delete_one({"id": table_id})
    await _log_audit(user_id, "commission_table_deleted", {"table_id": table_id})
    return {"success": True}


# ─── Commission Rules CRUD ────────────────────────────────────

@router.get("/commission-rules")
async def list_commission_rules(user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    rules = []
    async for r in db.commission_rules.find({}, {"_id": 0}).sort("name", 1):
        rules.append(r)
    return rules


@router.post("/commission-rules")
async def create_commission_rule(rule: CommissionRuleCreate, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    doc = {
        "id": str(uuid.uuid4()),
        **rule.dict(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user_id,
    }
    await db.commission_rules.insert_one(doc)
    await _log_audit(user_id, "commission_rule_created", {"rule_id": doc["id"], "name": rule.name})
    del doc["_id"]
    return doc


@router.put("/commission-rules/{rule_id}")
async def update_commission_rule(rule_id: str, update: dict, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    update.pop("id", None)
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.commission_rules.update_one({"id": rule_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True}


@router.delete("/commission-rules/{rule_id}")
async def delete_commission_rule(rule_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    await db.commission_rules.delete_one({"id": rule_id})
    return {"success": True}


# ─── Commission Calculation Engine ────────────────────────────

async def _find_best_table(seller_id: str, product_type: str = None, region: str = None, team_id: str = None) -> dict:
    """Find the most specific commission table for a seller/deal context.
    Priority: seller > team > region > product > global default"""
    # Try seller-specific
    t = await db.commission_tables.find_one({"seller_id": seller_id, "is_active": True}, {"_id": 0})
    if t:
        return t
    # Try team-specific
    if team_id:
        t = await db.commission_tables.find_one({"team_id": team_id, "seller_id": None, "is_active": True}, {"_id": 0})
        if t:
            return t
    # Try region
    if region:
        t = await db.commission_tables.find_one({"region": region, "team_id": None, "seller_id": None, "is_active": True}, {"_id": 0})
        if t:
            return t
    # Try product type
    if product_type:
        t = await db.commission_tables.find_one({"product_type": product_type, "region": None, "team_id": None, "seller_id": None, "is_active": True}, {"_id": 0})
        if t:
            return t
    # Global default
    t = await db.commission_tables.find_one({"product_type": None, "region": None, "team_id": None, "seller_id": None, "is_active": True}, {"_id": 0})
    return t


def _calc_base_commission(table: dict, volume: float, revenue: float) -> float:
    """Calculate base commission from a table"""
    if not table:
        return 0
    ctype = table.get("commission_type", "pct_revenue")
    rate = table.get("rate", 0)

    if ctype == "pct_revenue":
        return revenue * (rate / 100)
    elif ctype == "pct_volume":
        return volume * (rate / 100)
    elif ctype == "fixed":
        return rate
    elif ctype == "staircase":
        tiers = table.get("staircase_tiers") or []
        # Sorted descending by threshold
        tiers_sorted = sorted(tiers, key=lambda t: t.get("threshold", 0), reverse=True)
        for tier in tiers_sorted:
            if revenue >= tier.get("threshold", 0):
                return revenue * (tier.get("rate", 0) / 100)
        return 0
    return 0


async def _apply_rules(seller_id: str, base_commission: float, volume: float, revenue: float, deals_count: int) -> dict:
    """Apply advanced rules (bonus, accelerators, penalties, splits)"""
    bonuses = 0
    penalties = 0
    leader_split = 0
    rule_details = []

    rules = []
    async for r in db.commission_rules.find({"is_active": True}, {"_id": 0}):
        rules.append(r)

    # Check seller goals for acceleration
    now = datetime.now(timezone.utc).isoformat()
    goals = []
    async for g in db.commercial_goals.find({
        "seller_id": seller_id,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}):
        goals.append(g)

    goal_achievement_pct = 0
    if goals:
        # Use first active goal as reference
        g = goals[0]
        target = g.get("target_value", 1)
        current = g.get("current_value", 0)
        goal_achievement_pct = (current / target * 100) if target > 0 else 0

    for rule in rules:
        rtype = rule.get("rule_type")
        threshold = rule.get("trigger_threshold", 0)
        value = rule.get("value", 0)
        vtype = rule.get("value_type", "pct")

        if rtype == "bonus" and goal_achievement_pct >= (threshold or 100):
            bonus = base_commission * (value / 100) if vtype == "pct" else value
            bonuses += bonus
            rule_details.append({"rule": rule["name"], "type": "bonus", "amount": bonus})

        elif rtype == "accelerator" and goal_achievement_pct >= (threshold or 120):
            accel = base_commission * (value / 100) if vtype == "pct" else value
            bonuses += accel
            rule_details.append({"rule": rule["name"], "type": "accelerator", "amount": accel})

        elif rtype == "penalty" and goal_achievement_pct < (threshold or 50):
            pen = base_commission * (value / 100) if vtype == "pct" else value
            penalties += pen
            rule_details.append({"rule": rule["name"], "type": "penalty", "amount": -pen})

        elif rtype == "split":
            split_pct = rule.get("split_leader_pct", 10)
            leader_split = base_commission * (split_pct / 100)
            rule_details.append({"rule": rule["name"], "type": "split", "leader_amount": leader_split})

    return {
        "bonuses": bonuses,
        "penalties": penalties,
        "leader_split": leader_split,
        "rule_details": rule_details,
        "goal_achievement_pct": round(goal_achievement_pct, 1),
    }


@router.post("/commissions/calculate")
async def calculate_commissions_for_period(
    period: PaymentPeriodCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Calculate commissions for all sellers in a given period"""
    await require_admin_or_manager(user_id)

    # Get all deals in period
    deals = []
    async for d in db.commercial_deals.find({
        "created_at": {"$gte": period.start_date, "$lte": period.end_date}
    }, {"_id": 0}):
        deals.append(d)

    # Also fetch settled OTC deals
    async for d in db.otc_deals.find({
        "created_at": {"$gte": period.start_date, "$lte": period.end_date},
        "status": {"$in": ["settled", "closed"]}
    }, {"_id": 0}):
        deals.append({
            "seller_id": d.get("broker_id") or d.get("member_id"),
            "volume": (d.get("quantity", 0) * d.get("reference_price", 0)),
            "revenue": d.get("commission_total", 0) or d.get("broker_commission", 0) + d.get("member_commission", 0),
            "product_type": "otc",
            "region": d.get("region"),
            "team_id": d.get("team_id"),
            "client_name": d.get("client_name", ""),
            "created_at": d.get("created_at"),
            "otc_deal_id": d.get("id"),
        })

    # Group deals by seller
    seller_deals = {}
    for d in deals:
        sid = d.get("seller_id")
        if not sid:
            continue
        if sid not in seller_deals:
            seller_deals[sid] = {"volume": 0, "revenue": 0, "deals_count": 0, "deals": []}
        seller_deals[sid]["volume"] += d.get("volume", 0)
        seller_deals[sid]["revenue"] += d.get("revenue", 0)
        seller_deals[sid]["deals_count"] += 1
        seller_deals[sid]["deals"].append(d)

    # Calculate commissions for each seller
    results = []
    payment_id = str(uuid.uuid4())

    for sid, data in seller_deals.items():
        seller = await db.users.find_one({"id": sid}, {"_id": 0, "id": 1, "name": 1, "email": 1, "region": 1})
        if not seller:
            continue

        table = await _find_best_table(sid, "otc", seller.get("region"))
        base = _calc_base_commission(table, data["volume"], data["revenue"])
        rules_result = await _apply_rules(sid, base, data["volume"], data["revenue"], data["deals_count"])

        total = base + rules_result["bonuses"] - rules_result["penalties"] - rules_result["leader_split"]

        commission_record = {
            "id": str(uuid.uuid4()),
            "payment_id": payment_id,
            "period_label": period.period_label,
            "start_date": period.start_date,
            "end_date": period.end_date,
            "seller_id": sid,
            "seller_name": seller.get("name"),
            "seller_email": seller.get("email"),
            "region": seller.get("region"),
            "volume": data["volume"],
            "revenue": data["revenue"],
            "deals_count": data["deals_count"],
            "table_used": table.get("name") if table else "Sem tabela",
            "base_commission": round(base, 2),
            "bonuses": round(rules_result["bonuses"], 2),
            "penalties": round(rules_result["penalties"], 2),
            "leader_split": round(rules_result["leader_split"], 2),
            "total_commission": round(max(total, 0), 2),
            "rule_details": rules_result["rule_details"],
            "goal_achievement_pct": rules_result["goal_achievement_pct"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user_id,
        }
        await db.commercial_commissions.insert_one(commission_record)
        del commission_record["_id"]
        results.append(commission_record)

    await _log_audit(user_id, "commissions_calculated", {
        "payment_id": payment_id, "period": period.period_label, "sellers": len(results)
    })

    return {"payment_id": payment_id, "period": period.period_label, "commissions": results}


@router.post("/commissions/simulate")
async def simulate_commission(sim: CommissionSimulation, user_id: str = Depends(get_current_user_id)):
    """Simulate commission for a seller before finalizing"""
    await require_admin_or_manager(user_id)

    seller = await db.users.find_one({"id": sim.seller_id}, {"_id": 0, "id": 1, "name": 1, "region": 1})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    table = await _find_best_table(sim.seller_id, sim.product_type, seller.get("region"))
    base = _calc_base_commission(table, sim.volume, sim.revenue)
    rules_result = await _apply_rules(sim.seller_id, base, sim.volume, sim.revenue, sim.deals_count)
    total = base + rules_result["bonuses"] - rules_result["penalties"] - rules_result["leader_split"]

    return {
        "seller": seller,
        "table_used": table.get("name") if table else "Sem tabela",
        "base_commission": round(base, 2),
        "bonuses": round(rules_result["bonuses"], 2),
        "penalties": round(rules_result["penalties"], 2),
        "leader_split": round(rules_result["leader_split"], 2),
        "total_commission": round(max(total, 0), 2),
        "rule_details": rules_result["rule_details"],
        "goal_achievement_pct": rules_result["goal_achievement_pct"],
    }


@router.get("/commissions/payments")
async def list_commission_payments(
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """List all calculated commissions grouped by period"""
    await require_admin_or_manager(user_id)
    query = {}
    if status:
        query["status"] = status
    commissions = []
    async for c in db.commercial_commissions.find(query, {"_id": 0}).sort("created_at", -1).limit(500):
        commissions.append(c)
    return commissions


@router.put("/commissions/payments/{commission_id}/approve")
async def approve_commission(commission_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    result = await db.commercial_commissions.update_one(
        {"id": commission_id, "status": "pending"},
        {"$set": {"status": "approved", "approved_by": user_id, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found or already processed")
    await _log_audit(user_id, "commission_approved", {"commission_id": commission_id})
    return {"success": True}


@router.put("/commissions/payments/{commission_id}/pay")
async def mark_commission_paid(commission_id: str, user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    result = await db.commercial_commissions.update_one(
        {"id": commission_id, "status": "approved"},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat(), "paid_by": user_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found or not approved")
    await _log_audit(user_id, "commission_paid", {"commission_id": commission_id})
    return {"success": True}


@router.put("/commissions/payments/{commission_id}/reject")
async def reject_commission(commission_id: str, reason: str = "", user_id: str = Depends(get_current_user_id)):
    await require_admin_or_manager(user_id)
    result = await db.commercial_commissions.update_one(
        {"id": commission_id},
        {"$set": {"status": "rejected", "rejected_by": user_id, "reject_reason": reason, "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Commission not found")
    return {"success": True}


@router.get("/commissions/history")
async def commission_payment_history(
    seller_id: Optional[str] = None,
    user_id: str = Depends(get_current_user_id)
):
    """Full payment history"""
    await require_admin_or_manager(user_id)
    query = {"status": "paid"}
    if seller_id:
        query["seller_id"] = seller_id
    history = []
    async for c in db.commercial_commissions.find(query, {"_id": 0}).sort("paid_at", -1).limit(200):
        history.append(c)
    return history


# ══════════════════════════════════════════════════════════════
# FASE 3: RELATÓRIOS E AUDITORIA
# ══════════════════════════════════════════════════════════════

@router.get("/reports/commissions")
async def report_commissions(
    start_date: str,
    end_date: str,
    format: str = "json",
    user_id: str = Depends(get_current_user_id)
):
    """Commissions report by period - supports JSON, CSV"""
    await require_admin_or_manager(user_id)

    commissions = []
    async for c in db.commercial_commissions.find({
        "start_date": {"$gte": start_date},
        "end_date": {"$lte": end_date}
    }, {"_id": 0}).sort("seller_name", 1):
        commissions.append(c)

    if format == "csv":
        from fastapi.responses import StreamingResponse
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Vendedor", "Email", "Regiao", "Periodo", "Volume", "Receita", "Negocios",
                         "Tabela", "Base", "Bonus", "Penalidade", "Split Lider", "Total", "Estado"])
        for c in commissions:
            writer.writerow([
                c.get("seller_name"), c.get("seller_email"), c.get("region"), c.get("period_label"),
                c.get("volume", 0), c.get("revenue", 0), c.get("deals_count", 0),
                c.get("table_used"), c.get("base_commission", 0), c.get("bonuses", 0),
                c.get("penalties", 0), c.get("leader_split", 0), c.get("total_commission", 0), c.get("status")
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=comissoes_{start_date}_{end_date}.csv"}
        )

    return {"commissions": commissions, "total": len(commissions)}


@router.get("/reports/performance")
async def report_performance(
    start_date: str,
    end_date: str,
    group_by: str = "seller",
    format: str = "json",
    user_id: str = Depends(get_current_user_id)
):
    """Performance report - by seller, product, or region"""
    await require_admin_or_manager(user_id)

    group_field = f"${group_by}_id" if group_by == "seller" else f"${group_by}" if group_by in ["region", "product_type"] else "$seller_id"

    pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {
            "_id": group_field,
            "total_volume": {"$sum": "$volume"},
            "total_revenue": {"$sum": "$revenue"},
            "deal_count": {"$sum": 1},
            "clients": {"$addToSet": "$client_name"},
        }},
        {"$sort": {"total_volume": -1}}
    ]

    rows = []
    async for doc in db.commercial_deals.aggregate(pipeline):
        entry = {
            "group": doc["_id"],
            "total_volume": doc.get("total_volume", 0),
            "total_revenue": doc.get("total_revenue", 0),
            "deal_count": doc.get("deal_count", 0),
            "client_count": len(doc.get("clients", [])),
        }
        if group_by == "seller":
            seller = await db.users.find_one({"id": doc["_id"]}, {"_id": 0, "name": 1, "email": 1, "region": 1})
            if seller:
                entry["name"] = seller.get("name")
                entry["email"] = seller.get("email")
                entry["region"] = seller.get("region")
        rows.append(entry)

    if format == "csv":
        from fastapi.responses import StreamingResponse
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        if group_by == "seller":
            writer.writerow(["Vendedor", "Email", "Regiao", "Volume", "Receita", "Negocios", "Clientes"])
            for r in rows:
                writer.writerow([r.get("name"), r.get("email"), r.get("region"), r["total_volume"], r["total_revenue"], r["deal_count"], r["client_count"]])
        else:
            writer.writerow([group_by.capitalize(), "Volume", "Receita", "Negocios", "Clientes"])
            for r in rows:
                writer.writerow([r["group"], r["total_volume"], r["total_revenue"], r["deal_count"], r["client_count"]])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=performance_{group_by}_{start_date}_{end_date}.csv"}
        )

    return {"group_by": group_by, "rows": rows}


@router.get("/reports/deals-audit")
async def report_deals_audit(
    start_date: str,
    end_date: str,
    seller_id: Optional[str] = None,
    format: str = "json",
    user_id: str = Depends(get_current_user_id)
):
    """Audit report of all deals in period"""
    await require_admin_or_manager(user_id)

    query = {"created_at": {"$gte": start_date, "$lte": end_date}}
    if seller_id:
        query["seller_id"] = seller_id

    deals = []
    async for d in db.commercial_deals.find(query, {"_id": 0}).sort("created_at", -1):
        deals.append(d)

    if format == "csv":
        from fastapi.responses import StreamingResponse
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Data", "Cliente", "Produto", "Asset", "Volume", "Receita", "Vendedor", "Regiao", "Equipa"])
        for d in deals:
            writer.writerow([
                d.get("id"), d.get("created_at"), d.get("client_name"), d.get("product_type"),
                d.get("asset"), d.get("volume", 0), d.get("revenue", 0),
                d.get("seller_id"), d.get("region"), d.get("team_id")
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_deals_{start_date}_{end_date}.csv"}
        )

    return {"deals": deals, "total": len(deals)}


# ─── Audit Log ────────────────────────────────────────────────

@router.get("/audit-log")
async def get_audit_log(
    action: Optional[str] = None,
    limit: int = 100,
    user_id: str = Depends(get_current_user_id)
):
    """View audit log of commercial module actions"""
    await require_admin_or_manager(user_id)
    query = {}
    if action:
        query["action"] = action
    logs = []
    async for l in db.commercial_audit_log.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit):
        logs.append(l)
    return logs


async def _log_audit(user_id: str, action: str, details: dict = None):
    """Write an immutable audit log entry"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    await db.commercial_audit_log.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user.get("name") if user else "Unknown",
        "action": action,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
