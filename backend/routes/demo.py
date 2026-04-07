"""
Demo Mode - Seed realistic mock data for live platform demonstrations.
Authorized users can toggle demo mode to showcase the full platform.
"""
from fastapi import APIRouter, Depends, HTTPException
from routes.admin import get_admin_user, get_internal_user
from routes.auth import get_current_user_id
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import random
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/demo", tags=["Demo Mode"])

db = None

def set_db(database):
    global db
    db = database

DEMO_CLIENT_ID = "demo-client-001"
DEMO_CLIENT_EMAIL = "victoria.sterling@sterling-capital.com"

# ─── Demo Data Templates ───

DEMO_WALLETS = [
    {"asset_id": "BTC", "asset_name": "Bitcoin", "type": "crypto", "balance": 12.4587, "available_balance": 11.2, "pending_balance": 1.2587},
    {"asset_id": "ETH", "asset_name": "Ethereum", "type": "crypto", "balance": 185.32, "available_balance": 185.32, "pending_balance": 0},
    {"asset_id": "USDT", "asset_name": "Tether", "type": "crypto", "balance": 2450000.00, "available_balance": 2100000.00, "pending_balance": 350000.00},
    {"asset_id": "SOL", "asset_name": "Solana", "type": "crypto", "balance": 4200.0, "available_balance": 4200.0, "pending_balance": 0},
    {"asset_id": "EUR", "asset_name": "Euro", "type": "fiat", "balance": 875000.50, "available_balance": 875000.50, "pending_balance": 0},
    {"asset_id": "USD", "asset_name": "US Dollar", "type": "fiat", "balance": 1250000.00, "available_balance": 1150000.00, "pending_balance": 100000.00},
    {"asset_id": "GBP", "asset_name": "British Pound", "type": "fiat", "balance": 320000.00, "available_balance": 320000.00, "pending_balance": 0},
    {"asset_id": "CHF", "asset_name": "Swiss Franc", "type": "fiat", "balance": 540000.00, "available_balance": 540000.00, "pending_balance": 0},
]

def _generate_transactions(user_id):
    """Generate realistic transaction history"""
    txs = []
    now = datetime.now(timezone.utc)
    
    templates = [
        {"type": "deposit", "asset": "EUR", "amount": 500000, "status": "completed", "desc": "Wire Transfer - UBS Zurich"},
        {"type": "deposit", "asset": "USD", "amount": 750000, "status": "completed", "desc": "Wire Transfer - JP Morgan"},
        {"type": "deposit", "asset": "BTC", "amount": 5.0, "status": "completed", "desc": "Transfer from Fireblocks Vault"},
        {"type": "buy", "asset": "BTC", "amount": 3.5, "status": "completed", "desc": "OTC Buy @ $97,250"},
        {"type": "buy", "asset": "ETH", "amount": 100.0, "status": "completed", "desc": "OTC Buy @ $3,420"},
        {"type": "buy", "asset": "SOL", "amount": 2000.0, "status": "completed", "desc": "OTC Buy @ $185.50"},
        {"type": "sell", "asset": "BTC", "amount": 2.0, "status": "completed", "desc": "OTC Sell @ $98,100"},
        {"type": "deposit", "asset": "EUR", "amount": 375000, "status": "completed", "desc": "Wire Transfer - Credit Suisse"},
        {"type": "withdrawal", "asset": "USDT", "amount": 150000, "status": "completed", "desc": "Transfer to External Wallet"},
        {"type": "deposit", "asset": "GBP", "amount": 320000, "status": "completed", "desc": "Wire Transfer - Barclays"},
        {"type": "buy", "asset": "ETH", "amount": 85.32, "status": "completed", "desc": "OTC Buy @ $3,380"},
        {"type": "deposit", "asset": "CHF", "amount": 540000, "status": "completed", "desc": "Wire Transfer - UBS Geneva"},
        {"type": "buy", "asset": "BTC", "amount": 3.9587, "status": "completed", "desc": "OTC Buy @ $96,800"},
        {"type": "deposit", "asset": "USDT", "amount": 2600000, "status": "completed", "desc": "Transfer from Binance"},
        {"type": "buy", "asset": "SOL", "amount": 2200.0, "status": "completed", "desc": "OTC Buy @ $182.00"},
        {"type": "deposit", "asset": "USD", "amount": 500000, "status": "pending", "desc": "Wire Transfer - Goldman Sachs (Pending)"},
    ]
    
    for i, t in enumerate(templates):
        txs.append({
            "id": f"demo-tx-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "type": t["type"],
            "asset_id": t["asset"],
            "amount": t["amount"],
            "status": t["status"],
            "description": t["desc"],
            "is_demo": True,
            "created_at": (now - timedelta(days=i*3, hours=random.randint(1,12))).isoformat(),
        })
    return txs


def _generate_otc_leads():
    """Generate realistic OTC leads for CRM demo"""
    now = datetime.now(timezone.utc)
    leads = [
        {
            "id": f"demo-lead-{uuid.uuid4().hex[:8]}",
            "entity_name": "Al Rashid Family Office",
            "contact_name": "Mohammed Al Rashid",
            "contact_email": "m.alrashid@arfo.ae",
            "contact_phone": "+971 50 123 4567",
            "country": "AE",
            "source": "referral",
            "potential_tier": "vip",
            "status": "pre_qualified",
            "workflow_stage": 3,
            "first_operation_value": 5000000,
            "notes": "Ultra-HNW client. Interested in BTC/ETH allocation. Family office managing $2B+ AUM.",
            "is_demo": True,
            "created_at": (now - timedelta(days=2)).isoformat(),
            "updated_at": (now - timedelta(hours=6)).isoformat(),
            "created_by": "demo-admin",
        },
        {
            "id": f"demo-lead-{uuid.uuid4().hex[:8]}",
            "entity_name": "Nordic Ventures AB",
            "contact_name": "Erik Johansson",
            "contact_email": "erik@nordicventures.se",
            "contact_phone": "+46 70 234 5678",
            "country": "SE",
            "source": "website",
            "potential_tier": "premium",
            "status": "contacted",
            "workflow_stage": 2,
            "first_operation_value": 1500000,
            "notes": "Institutional investor. Looking to diversify into digital assets.",
            "is_demo": True,
            "created_at": (now - timedelta(days=5)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat(),
            "created_by": "demo-admin",
        },
        {
            "id": f"demo-lead-{uuid.uuid4().hex[:8]}",
            "entity_name": "Helvetia Trust AG",
            "contact_name": "Sophie Weber",
            "contact_email": "s.weber@helvetiatrust.ch",
            "contact_phone": "+41 44 567 8901",
            "country": "CH",
            "source": "event",
            "potential_tier": "institucional",
            "status": "new",
            "workflow_stage": 1,
            "first_operation_value": 10000000,
            "notes": "Swiss trust company. Managing assets for UHNW families. Met at Crypto Valley Conference.",
            "is_demo": True,
            "created_at": (now - timedelta(hours=8)).isoformat(),
            "updated_at": (now - timedelta(hours=8)).isoformat(),
            "created_by": "demo-admin",
        },
        {
            "id": f"demo-lead-{uuid.uuid4().hex[:8]}",
            "entity_name": "Pacific Asset Management",
            "contact_name": "James Chen",
            "contact_email": "j.chen@pacificam.sg",
            "contact_phone": "+65 9123 4567",
            "country": "SG",
            "source": "partner",
            "potential_tier": "vip",
            "status": "pre_qualified",
            "workflow_stage": 4,
            "first_operation_value": 8000000,
            "notes": "Singapore-based fund. Ready for first OTC trade. Compliance docs verified.",
            "is_demo": True,
            "created_at": (now - timedelta(days=10)).isoformat(),
            "updated_at": (now - timedelta(hours=2)).isoformat(),
            "created_by": "demo-admin",
        },
        {
            "id": f"demo-lead-{uuid.uuid4().hex[:8]}",
            "entity_name": "Sterling Capital Partners",
            "contact_name": "Victoria Sterling",
            "contact_email": DEMO_CLIENT_EMAIL,
            "contact_phone": "+44 20 7946 0958",
            "country": "GB",
            "source": "referral",
            "potential_tier": "vip",
            "status": "active_client",
            "workflow_stage": 11,
            "first_operation_value": 3000000,
            "notes": "Converted to active client. Multiple successful OTC trades completed.",
            "is_demo": True,
            "created_at": (now - timedelta(days=45)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat(),
            "created_by": "demo-admin",
        },
    ]
    return leads


def _generate_otc_deals():
    """Generate realistic OTC deals for pipeline demo"""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": f"demo-deal-{uuid.uuid4().hex[:8]}",
            "deal_number": "OTC-2026-0042",
            "deal_type": "buy",
            "asset": "BTC",
            "quantity": 25.0,
            "reference_price": 97250.00,
            "total_value": 2431250.00,
            "spread": 0.15,
            "fees": {"platform": 3646.88, "network": 12.50},
            "client_name": "Pacific Asset Management",
            "client_email": "j.chen@pacificam.sg",
            "stage": "quote_sent",
            "status": "active",
            "is_demo": True,
            "created_by": "demo-admin",
            "created_at": (now - timedelta(days=1)).isoformat(),
            "updated_at": (now - timedelta(hours=3)).isoformat(),
        },
        {
            "id": f"demo-deal-{uuid.uuid4().hex[:8]}",
            "deal_number": "OTC-2026-0041",
            "deal_type": "sell",
            "asset": "ETH",
            "quantity": 500.0,
            "reference_price": 3420.00,
            "total_value": 1710000.00,
            "spread": 0.20,
            "fees": {"platform": 3420.00, "network": 85.00},
            "client_name": "Sterling Capital Partners",
            "client_email": DEMO_CLIENT_EMAIL,
            "stage": "completed",
            "status": "completed",
            "is_demo": True,
            "created_by": "demo-admin",
            "created_at": (now - timedelta(days=7)).isoformat(),
            "updated_at": (now - timedelta(days=5)).isoformat(),
            "settled_at": (now - timedelta(days=5)).isoformat(),
        },
        {
            "id": f"demo-deal-{uuid.uuid4().hex[:8]}",
            "deal_number": "OTC-2026-0040",
            "deal_type": "buy",
            "asset": "SOL",
            "quantity": 10000.0,
            "reference_price": 185.50,
            "total_value": 1855000.00,
            "spread": 0.25,
            "fees": {"platform": 4637.50, "network": 25.00},
            "client_name": "Al Rashid Family Office",
            "client_email": "m.alrashid@arfo.ae",
            "stage": "execution",
            "status": "active",
            "is_demo": True,
            "created_by": "demo-admin",
            "created_at": (now - timedelta(days=3)).isoformat(),
            "updated_at": (now - timedelta(hours=1)).isoformat(),
        },
    ]


# ─── Endpoints ───

@router.post("/authorize/{user_id}")
async def authorize_demo_access(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin grants demo mode access to a user"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"demo_authorized": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "Demo access granted"}


@router.delete("/authorize/{user_id}")
async def revoke_demo_access(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin revokes demo mode access"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"demo_authorized": False, "demo_mode": False}}
    )
    return {"success": True, "message": "Demo access revoked"}


@router.post("/toggle")
async def toggle_demo_mode(user_id: str = Depends(get_current_user_id)):
    """Toggle demo mode for authorized user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("demo_authorized") and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Demo mode not authorized for this user")
    
    current = user.get("demo_mode", False)
    new_state = not current
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"demo_mode": new_state, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # If turning ON, ensure demo data exists
    if new_state:
        existing = await db.demo_data.find_one({"type": "seed_status"})
        if not existing:
            await _seed_demo_data()
    
    return {"success": True, "demo_mode": new_state}


@router.get("/status")
async def get_demo_status(user_id: str = Depends(get_current_user_id)):
    """Get current demo mode status"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "demo_mode": 1, "demo_authorized": 1, "is_admin": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    authorized = user.get("demo_authorized", False) or user.get("is_admin", False)
    return {
        "demo_mode": user.get("demo_mode", False),
        "demo_authorized": authorized
    }


@router.post("/seed")
async def seed_demo_data_endpoint(admin: dict = Depends(get_admin_user)):
    """Manually seed/refresh demo data"""
    result = await _seed_demo_data()
    return result


@router.post("/reset")
async def reset_demo_data(admin: dict = Depends(get_admin_user)):
    """Reset all demo data"""
    collections = ["wallets", "transactions", "otc_leads", "otc_deals", "otc_clients", "bank_transfers", "demo_data"]
    counts = {}
    for col in collections:
        r = await db[col].delete_many({"is_demo": True})
        counts[col] = r.deleted_count
    
    # Remove demo user
    await db.users.delete_many({"id": DEMO_CLIENT_ID})
    
    return {"success": True, "deleted": counts}


@router.get("/client")
async def get_demo_client(user_id: str = Depends(get_current_user_id)):
    """Get demo client data for client-view simulation"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("demo_mode"):
        raise HTTPException(status_code=403, detail="Demo mode not active")
    
    demo_client = await db.users.find_one({"id": DEMO_CLIENT_ID}, {"_id": 0})
    if not demo_client:
        raise HTTPException(status_code=404, detail="Demo client not found. Please seed demo data first.")
    
    return {
        "id": demo_client["id"],
        "email": demo_client.get("email"),
        "name": demo_client.get("name"),
        "token_hint": "Use demo client ID for API calls in demo mode"
    }


async def _seed_demo_data():
    """Seed all demo data into the database"""
    now = datetime.now(timezone.utc)
    
    # 1. Create demo client user
    await db.users.update_one(
        {"id": DEMO_CLIENT_ID},
        {"$set": {
            "id": DEMO_CLIENT_ID,
            "email": DEMO_CLIENT_EMAIL,
            "name": "Victoria Sterling",
            "phone": "+44 20 7946 0958",
            "country": "GB",
            "user_type": "client",
            "membership_level": "vip",
            "is_active": True,
            "is_approved": True,
            "is_onboarded": True,
            "kyc_status": "approved",
            "hashed_password": "",
            "is_demo": True,
            "created_at": (now - timedelta(days=90)).isoformat(),
            "updated_at": now.isoformat(),
        }},
        upsert=True
    )
    
    # 2. Clear old demo data
    await db.wallets.delete_many({"is_demo": True})
    await db.transactions.delete_many({"is_demo": True})
    await db.otc_leads.delete_many({"is_demo": True})
    await db.otc_deals.delete_many({"is_demo": True})
    await db.bank_transfers.delete_many({"is_demo": True})
    
    # 3. Create wallets
    for w in DEMO_WALLETS:
        wallet = {
            "id": f"demo-wallet-{w['asset_id'].lower()}",
            "user_id": DEMO_CLIENT_ID,
            "is_demo": True,
            **w,
            "created_at": (now - timedelta(days=90)).isoformat(),
        }
        await db.wallets.insert_one(wallet)
    
    # 4. Create transactions
    txs = _generate_transactions(DEMO_CLIENT_ID)
    if txs:
        await db.transactions.insert_many(txs)
    
    # 5. Create OTC leads
    leads = _generate_otc_leads()
    if leads:
        await db.otc_leads.insert_many(leads)
    
    # 6. Create OTC deals
    deals = _generate_otc_deals()
    if deals:
        await db.otc_deals.insert_many(deals)
    
    # 7. Create bank deposits for demo
    deposits = [
        {
            "id": f"demo-dep-{uuid.uuid4().hex[:8]}",
            "user_id": DEMO_CLIENT_ID,
            "amount": 500000,
            "currency": "EUR",
            "status": "completed",
            "bank_reference": "KBEX-2026-EUR-00142",
            "is_demo": True,
            "created_at": (now - timedelta(days=30)).isoformat(),
        },
        {
            "id": f"demo-dep-{uuid.uuid4().hex[:8]}",
            "user_id": DEMO_CLIENT_ID,
            "amount": 750000,
            "currency": "USD",
            "status": "completed",
            "bank_reference": "KBEX-2026-USD-00089",
            "is_demo": True,
            "created_at": (now - timedelta(days=15)).isoformat(),
        },
        {
            "id": f"demo-dep-{uuid.uuid4().hex[:8]}",
            "user_id": DEMO_CLIENT_ID,
            "amount": 100000,
            "currency": "USD",
            "status": "pending",
            "bank_reference": "KBEX-2026-USD-00201",
            "is_demo": True,
            "created_at": (now - timedelta(hours=4)).isoformat(),
        },
    ]
    await db.bank_transfers.insert_many(deposits)
    
    # 8. Mark seed as done
    await db.demo_data.update_one(
        {"type": "seed_status"},
        {"$set": {"type": "seed_status", "seeded_at": now.isoformat(), "version": 1}},
        upsert=True
    )
    
    logger.info("Demo data seeded successfully")
    return {
        "success": True,
        "seeded": {
            "client": 1,
            "wallets": len(DEMO_WALLETS),
            "transactions": len(txs),
            "otc_leads": len(leads),
            "otc_deals": len(deals),
            "deposits": len(deposits),
        }
    }
