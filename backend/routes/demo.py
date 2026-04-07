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

# All available demo sections
DEMO_SECTIONS = [
    {"id": "portfolio", "label": "Portfolio & Wallets", "description": "Dashboard, saldos e alocações"},
    {"id": "crypto_ops", "label": "Operações Crypto", "description": "Depósitos e levantamentos crypto"},
    {"id": "fiat_ops", "label": "Operações Fiat", "description": "Depósitos e levantamentos fiat"},
    {"id": "otc", "label": "OTC Desk", "description": "Leads, deals e pipeline OTC"},
    {"id": "vault", "label": "Multi-Sign Vault", "description": "Signatários e transações vault"},
    {"id": "transactions", "label": "Transações", "description": "Histórico de transações"},
]

ALL_SECTION_IDS = [s["id"] for s in DEMO_SECTIONS]


async def check_demo_mode(user_id: str, database) -> bool:
    """Check if a user currently has demo mode active."""
    user = await database.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "demo_mode": 1})
    return bool(user and user.get("demo_mode"))


async def get_demo_sections(user_id: str, database) -> list:
    """Get which demo sections a user can see. Returns list of section IDs."""
    user = await database.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "demo_sections": 1, "demo_authorized": 1})
    if not user or not user.get("demo_authorized"):
        return []
    return user.get("demo_sections", ALL_SECTION_IDS)

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


def _generate_crypto_deposits(user_id):
    """Generate realistic crypto deposit history"""
    now = datetime.now(timezone.utc)
    deposits = [
        {"asset": "BTC", "amount": 5.0, "amount_usd": 487500.0, "status": "COMPLETED", "source": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkf", "confirmations": 6, "tx_hash": "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01"},
        {"asset": "ETH", "amount": 150.0, "amount_usd": 513000.0, "status": "COMPLETED", "source": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", "confirmations": 64, "tx_hash": "0xdef456789abc0123456789abcdef0123456789abcdef0123456789abcdef0123"},
        {"asset": "USDT", "amount": 1000000.0, "amount_usd": 1000000.0, "status": "COMPLETED", "source": "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax", "confirmations": 20, "tx_hash": "0x789abc0123456789abcdef0123456789abcdef0123456789abcdef0123456789"},
        {"asset": "BTC", "amount": 3.2587, "amount_usd": 317475.0, "status": "COMPLETED", "source": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", "confirmations": 3, "tx_hash": "b2c3d4e5f6a1789012345678abcdef0123456789abcdef0123456789abcdef02"},
        {"asset": "SOL", "amount": 2200.0, "amount_usd": 407000.0, "status": "COMPLETED", "source": "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV", "confirmations": 50, "tx_hash": "5nPqdYLMhGUqaLxvR8X1K3Q4T5V6W7X8Y9Z0"},
        {"asset": "ETH", "amount": 35.32, "amount_usd": 120794.0, "status": "CONFIRMING", "source": "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", "confirmations": 8, "tx_hash": "0xabc123456789def0123456789abcdef0123456789abcdef0123456789abcdef"},
        {"asset": "BTC", "amount": 4.2, "amount_usd": 409500.0, "status": "PENDING", "source": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq", "confirmations": 0, "tx_hash": None},
    ]
    result = []
    for i, d in enumerate(deposits):
        result.append({
            "id": f"demo-cdep-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "tx_hash": d["tx_hash"],
            "asset": d["asset"],
            "amount": d["amount"],
            "amount_usd": d["amount_usd"],
            "status": d["status"],
            "source_address": d["source"],
            "num_confirmations": d["confirmations"],
            "is_demo": True,
            "created_at": (now - timedelta(days=i*4+1, hours=random.randint(1,18))).isoformat(),
        })
    return result


def _generate_crypto_withdrawals(user_id):
    """Generate realistic crypto withdrawal history"""
    now = datetime.now(timezone.utc)
    withdrawals = [
        {"asset": "BTC", "amount": 2.0, "fee": 0.00015, "dest": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4", "status": "completed", "tx_hash": "c3d4e5f6a1b2789012345678abcdef0123456789abcdef0123456789abcdef03"},
        {"asset": "ETH", "amount": 50.0, "fee": 0.005, "dest": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "status": "completed", "tx_hash": "0x456def789abc0123456789abcdef0123456789abcdef0123456789abcdef0456"},
        {"asset": "USDT", "amount": 500000.0, "fee": 25.0, "dest": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", "status": "completed", "tx_hash": "0xfed789abc0123456789abcdef0123456789abcdef0123456789abcdef012345"},
        {"asset": "SOL", "amount": 500.0, "fee": 0.01, "dest": "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy", "status": "pending_approval", "tx_hash": None},
        {"asset": "BTC", "amount": 1.5, "fee": 0.0002, "dest": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "status": "pending", "tx_hash": None},
    ]
    result = []
    for i, w in enumerate(withdrawals):
        result.append({
            "id": f"demo-cwith-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "asset_id": w["asset"],
            "amount": w["amount"],
            "network_fee": w["fee"],
            "net_amount": w["amount"] - w["fee"],
            "destination_address": w["dest"],
            "status": w["status"],
            "tx_hash": w["tx_hash"],
            "is_demo": True,
            "created_at": (now - timedelta(days=i*5+2, hours=random.randint(1,12))).isoformat(),
            "updated_at": (now - timedelta(days=i*5+1)).isoformat(),
        })
    return result


def _generate_vault_data(user_id):
    """Generate realistic multi-sign vault data"""
    now = datetime.now(timezone.utc)
    
    signatories = [
        {
            "id": f"demo-sig-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "user_id": f"demo-sig-user-1",
            "name": "James Sterling",
            "email": "james@sterling-capital.com",
            "role": "co_signer",
            "is_registered": True,
            "status": "active",
            "is_demo": True,
            "added_at": (now - timedelta(days=60)).isoformat(),
            "last_active": (now - timedelta(hours=12)).isoformat(),
        },
        {
            "id": f"demo-sig-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "user_id": f"demo-sig-user-2",
            "name": "Catherine Wells",
            "email": "c.wells@sterling-capital.com",
            "role": "approver",
            "is_registered": True,
            "status": "active",
            "is_demo": True,
            "added_at": (now - timedelta(days=45)).isoformat(),
            "last_active": (now - timedelta(days=2)).isoformat(),
        },
        {
            "id": f"demo-sig-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "user_id": None,
            "name": "Robert Sterling Jr.",
            "email": "robert.jr@sterling-capital.com",
            "role": "viewer",
            "is_registered": False,
            "status": "active",
            "is_demo": True,
            "added_at": (now - timedelta(days=30)).isoformat(),
            "last_active": None,
        },
    ]
    
    settings = {
        "user_id": user_id,
        "required_signatures": 2,
        "transaction_timeout_hours": 48,
        "auto_reject_on_timeout": True,
        "notify_all_signers": True,
        "is_demo": True,
    }
    
    transactions = [
        {
            "id": f"demo-vtx-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "type": "withdrawal",
            "asset": "BTC",
            "amount": 3.5,
            "destination": "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
            "description": "Transfer to Ledger Cold Storage",
            "status": "pending_signatures",
            "required_signatures": 2,
            "current_signatures": 1,
            "signatures": [
                {"user_id": user_id, "name": "Victoria Sterling", "email": DEMO_CLIENT_EMAIL, "status": "approved", "signed_at": (now - timedelta(hours=6)).isoformat()},
                {"user_id": "demo-sig-user-1", "name": "James Sterling", "email": "james@sterling-capital.com", "status": "pending", "signed_at": None},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(hours=8)).isoformat(),
            "expires_at": (now + timedelta(hours=40)).isoformat(),
            "updated_at": (now - timedelta(hours=6)).isoformat(),
        },
        {
            "id": f"demo-vtx-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "type": "withdrawal",
            "asset": "ETH",
            "amount": 100.0,
            "destination": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            "description": "DeFi allocation — Aave V3",
            "status": "completed",
            "required_signatures": 2,
            "current_signatures": 2,
            "signatures": [
                {"user_id": user_id, "name": "Victoria Sterling", "email": DEMO_CLIENT_EMAIL, "status": "approved", "signed_at": (now - timedelta(days=3)).isoformat()},
                {"user_id": "demo-sig-user-2", "name": "Catherine Wells", "email": "c.wells@sterling-capital.com", "status": "approved", "signed_at": (now - timedelta(days=3, hours=-2)).isoformat()},
            ],
            "tx_hash": "0x789def456abc0123456789abcdef0123456789abcdef0123456789abcdef0789",
            "is_demo": True,
            "created_at": (now - timedelta(days=4)).isoformat(),
            "updated_at": (now - timedelta(days=3)).isoformat(),
        },
        {
            "id": f"demo-vtx-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "type": "withdrawal",
            "asset": "USDT",
            "amount": 250000.0,
            "destination": "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax",
            "description": "Margin funding — Institutional Account",
            "status": "completed",
            "required_signatures": 2,
            "current_signatures": 2,
            "signatures": [
                {"user_id": user_id, "name": "Victoria Sterling", "email": DEMO_CLIENT_EMAIL, "status": "approved", "signed_at": (now - timedelta(days=7)).isoformat()},
                {"user_id": "demo-sig-user-1", "name": "James Sterling", "email": "james@sterling-capital.com", "status": "approved", "signed_at": (now - timedelta(days=7, hours=-5)).isoformat()},
            ],
            "tx_hash": "0xabc789def0123456789abcdef0123456789abcdef0123456789abcdef012abc",
            "is_demo": True,
            "created_at": (now - timedelta(days=8)).isoformat(),
            "updated_at": (now - timedelta(days=7)).isoformat(),
        },
        {
            "id": f"demo-vtx-{uuid.uuid4().hex[:8]}",
            "owner_id": user_id,
            "type": "withdrawal",
            "asset": "BTC",
            "amount": 1.0,
            "destination": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            "description": "Payment — Real Estate Token Settlement",
            "status": "rejected",
            "required_signatures": 2,
            "current_signatures": 0,
            "signatures": [
                {"user_id": user_id, "name": "Victoria Sterling", "email": DEMO_CLIENT_EMAIL, "status": "approved", "signed_at": (now - timedelta(days=12)).isoformat()},
                {"user_id": "demo-sig-user-2", "name": "Catherine Wells", "email": "c.wells@sterling-capital.com", "status": "rejected", "signed_at": (now - timedelta(days=11)).isoformat(), "rejection_reason": "Destination address not whitelisted"},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(days=13)).isoformat(),
            "updated_at": (now - timedelta(days=11)).isoformat(),
        },
    ]
    
    return signatories, settings, transactions


# ─── Endpoints ───

@router.post("/authorize/{user_id}")
async def authorize_demo_access(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin grants demo mode access to a user with all sections enabled by default"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "demo_authorized": True,
            "demo_sections": ALL_SECTION_IDS,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "message": "Demo access granted"}


@router.delete("/authorize/{user_id}")
async def revoke_demo_access(user_id: str, admin: dict = Depends(get_admin_user)):
    """Admin revokes demo mode access"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "demo_authorized": False,
            "demo_mode": False,
            "demo_sections": [],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "message": "Demo access revoked"}


@router.get("/sections")
async def list_demo_sections(admin: dict = Depends(get_admin_user)):
    """List all available demo sections"""
    return {"sections": DEMO_SECTIONS}


@router.put("/permissions/{user_id}")
async def update_demo_permissions(user_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    """Update which demo sections a specific user can see"""
    sections = body.get("sections", [])
    valid = [s for s in sections if s in ALL_SECTION_IDS]
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "demo_authorized": len(valid) > 0,
            "demo_sections": valid,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"success": True, "sections": valid}


@router.get("/permissions/{user_id}")
async def get_demo_permissions(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get demo permissions for a specific user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "demo_authorized": 1, "demo_sections": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "demo_authorized": user.get("demo_authorized", False),
        "sections": user.get("demo_sections", [])
    }


@router.get("/authorized-users")
async def list_demo_authorized_users(admin: dict = Depends(get_admin_user)):
    """List all users with demo access and their section permissions"""
    users = await db.users.find(
        {"demo_authorized": True},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "demo_authorized": 1, "demo_sections": 1, "internal_role": 1}
    ).to_list(100)
    return {"users": users}


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
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "demo_mode": 1, "demo_authorized": 1, "is_admin": 1, "demo_sections": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    authorized = user.get("demo_authorized", False) or user.get("is_admin", False)
    return {
        "demo_mode": user.get("demo_mode", False),
        "demo_authorized": authorized,
        "sections": user.get("demo_sections", ALL_SECTION_IDS if authorized else [])
    }


@router.post("/seed")
async def seed_demo_data_endpoint(admin: dict = Depends(get_admin_user)):
    """Manually seed/refresh demo data"""
    result = await _seed_demo_data()
    return result


@router.post("/reset")
async def reset_demo_data(admin: dict = Depends(get_admin_user)):
    """Reset all demo data"""
    collections = ["wallets", "transactions", "otc_leads", "otc_deals", "otc_clients", "bank_transfers", "crypto_deposits", "crypto_withdrawals", "vault_signatories", "vault_settings", "vault_transactions", "demo_data"]
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
    await db.crypto_deposits.delete_many({"is_demo": True})
    await db.crypto_withdrawals.delete_many({"is_demo": True})
    await db.vault_signatories.delete_many({"is_demo": True})
    await db.vault_settings.delete_many({"is_demo": True})
    await db.vault_transactions.delete_many({"is_demo": True})
    
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
    
    # 8. Create crypto deposits
    crypto_deps = _generate_crypto_deposits(DEMO_CLIENT_ID)
    if crypto_deps:
        await db.crypto_deposits.insert_many(crypto_deps)
    
    # 9. Create crypto withdrawals
    crypto_withs = _generate_crypto_withdrawals(DEMO_CLIENT_ID)
    if crypto_withs:
        await db.crypto_withdrawals.insert_many(crypto_withs)
    
    # 10. Create vault/multi-sign data
    signatories, vault_settings, vault_txs = _generate_vault_data(DEMO_CLIENT_ID)
    if signatories:
        await db.vault_signatories.insert_many(signatories)
    await db.vault_settings.insert_one(vault_settings)
    if vault_txs:
        await db.vault_transactions.insert_many(vault_txs)
    
    # 11. Mark seed as done
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
            "crypto_deposits": len(crypto_deps),
            "crypto_withdrawals": len(crypto_withs),
            "vault_signatories": len(signatories),
            "vault_transactions": len(vault_txs),
        }
    }
