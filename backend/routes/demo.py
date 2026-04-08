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

# Helper: returns the demo collection or the real one
def demo_col(database, name, is_demo=False):
    """Return demo_<name> collection when demo mode, else <name>."""
    return database[f"demo_{name}"] if is_demo else database[name]


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


def _generate_demo_profile():
    """Generate mock profile data for demo presentations"""
    return {
        "id": DEMO_CLIENT_ID,
        "name": "Victoria Sterling",
        "email": "victoria.sterling@sterling-capital.com",
        "phone": "+44 20 7946 0958",
        "country": "GB",
        "date_of_birth": "1982-03-15",
        "address": "42 Kensington Palace Gardens, London W8 4QY, United Kingdom",
        "user_type": "client",
        "membership_level": "vip",
        "region": "europe",
        "is_active": True,
        "is_approved": True,
        "is_onboarded": True,
        "kyc_status": "approved",
        "is_demo": True,
    }


def _generate_bank_accounts(user_id):
    """Generate realistic demo bank accounts"""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": f"demo-bank-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "account_holder": "Victoria Sterling",
            "bank_name": "UBS Switzerland AG",
            "iban": "CH9300762011623852957",
            "swift_bic": "UBSWCHZH80A",
            "account_number": None,
            "sort_code": None,
            "routing_number": None,
            "country": "CH",
            "currency": "CHF",
            "is_primary": True,
            "status": "verified",
            "rejection_reason": None,
            "is_demo": True,
            "created_at": (now - timedelta(days=80)).isoformat(),
            "updated_at": (now - timedelta(days=75)).isoformat(),
        },
        {
            "id": f"demo-bank-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "account_holder": "Sterling Capital Partners Ltd",
            "bank_name": "Barclays Private Bank",
            "iban": "GB29BARC20040156781234",
            "swift_bic": "BARCGB22",
            "account_number": "56781234",
            "sort_code": "20-04-01",
            "routing_number": None,
            "country": "GB",
            "currency": "GBP",
            "is_primary": False,
            "status": "verified",
            "rejection_reason": None,
            "is_demo": True,
            "created_at": (now - timedelta(days=60)).isoformat(),
            "updated_at": (now - timedelta(days=55)).isoformat(),
        },
        {
            "id": f"demo-bank-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "account_holder": "Victoria Sterling",
            "bank_name": "Julius Baer",
            "iban": "CH4308401016529783901",
            "swift_bic": "BAABORCHXXX",
            "account_number": None,
            "sort_code": None,
            "routing_number": None,
            "country": "CH",
            "currency": "EUR",
            "is_primary": False,
            "status": "verified",
            "rejection_reason": None,
            "is_demo": True,
            "created_at": (now - timedelta(days=45)).isoformat(),
            "updated_at": (now - timedelta(days=40)).isoformat(),
        },
        {
            "id": f"demo-bank-{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "account_holder": "Sterling Capital Partners LLC",
            "bank_name": "JP Morgan Chase",
            "iban": None,
            "swift_bic": "CHASUS33",
            "account_number": "482917365012",
            "sort_code": None,
            "routing_number": "021000021",
            "country": "US",
            "currency": "USD",
            "is_primary": False,
            "status": "pending",
            "rejection_reason": None,
            "is_demo": True,
            "created_at": (now - timedelta(days=3)).isoformat(),
            "updated_at": (now - timedelta(days=3)).isoformat(),
        },
    ]


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
            "user_id": "demo-sig-user-1",
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
            "user_id": "demo-sig-user-2",
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


def _generate_escrow_deals():
    """Generate realistic OTC Escrow deals for demo"""
    now = datetime.now(timezone.utc)
    
    deals = [
        {
            "id": f"demo-esc-{uuid.uuid4().hex[:8]}",
            "deal_id": "ESC-DEMO-0001",
            "deal_type": "standard",
            "status": "settled",
            "asset_a": "BTC", "asset_b": "USDT",
            "quantity_a": 25.0, "quantity_b": 2431250.0,
            "agreed_price": 97250.0,
            "ticket_size": 2431250.0,
            "buyer": {"name": "Pacific Asset Management", "email": "j.chen@pacificam.sg"},
            "seller": {"name": "Sterling Capital Partners", "email": DEMO_CLIENT_EMAIL},
            "fee_schedule": "premium", "fee_payer": "split",
            "fee_rate": 0.003, "fee_total": 7293.75,
            "fee_buyer": 3646.88, "fee_seller": 3646.87,
            "custody": {"locked": False, "locked_at": (now - timedelta(days=8)).isoformat(), "unlocked_at": (now - timedelta(days=5)).isoformat()},
            "deposits": [
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "buyer", "asset": "USDT", "amount": 2431250, "confirmed": True, "tx_hash": "0xabc123...def456", "created_at": (now - timedelta(days=9)).isoformat()},
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "seller", "asset": "BTC", "amount": 25.0, "confirmed": True, "tx_hash": "bc1q789...xyz012", "created_at": (now - timedelta(days=9)).isoformat()},
            ],
            "settlement": {
                "type": "dvp", "executed_by": "carlos@kbex.io",
                "executed_at": (now - timedelta(days=5)).isoformat(),
                "asset_a": "BTC", "quantity_a": 25.0,
                "asset_b": "USDT", "quantity_b": 2431250.0,
                "fee_total": 7293.75,
            },
            "compliance": {"kyc_buyer": "approved", "kyc_seller": "approved", "aml_check": "passed", "source_of_funds": "approved", "risk_score": 15},
            "timeline": [
                {"timestamp": (now - timedelta(days=12)).isoformat(), "status": "draft", "action": "Deal created", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=10)).isoformat(), "status": "awaiting_deposit", "action": "Advanced to Awaiting Deposit", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=9)).isoformat(), "status": "funded", "action": "Both parties deposited", "performed_by": "system"},
                {"timestamp": (now - timedelta(days=5)).isoformat(), "status": "settled", "action": "DvP Settlement executed", "performed_by": "carlos@kbex.io"},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(days=12)).isoformat(),
            "updated_at": (now - timedelta(days=5)).isoformat(),
            "created_by": "carlos@kbex.io",
        },
        {
            "id": f"demo-esc-{uuid.uuid4().hex[:8]}",
            "deal_id": "ESC-DEMO-0002",
            "deal_type": "standard",
            "status": "funded",
            "asset_a": "ETH", "asset_b": "EUR",
            "quantity_a": 500.0, "quantity_b": 1710000.0,
            "agreed_price": 3420.0,
            "ticket_size": 1710000.0,
            "buyer": {"name": "Al Rashid Family Office", "email": "m.alrashid@arfo.ae"},
            "seller": {"name": "Nordic Ventures AB", "email": "erik@nordicventures.se"},
            "fee_schedule": "standard", "fee_payer": "buyer",
            "fee_rate": 0.005, "fee_total": 8550.0,
            "fee_buyer": 8550.0, "fee_seller": 0,
            "custody": {"locked": True, "locked_at": (now - timedelta(days=2)).isoformat()},
            "deposits": [
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "buyer", "asset": "EUR", "amount": 1710000, "confirmed": True, "tx_hash": "WIRE-2026-EUR-0042", "created_at": (now - timedelta(days=3)).isoformat()},
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "seller", "asset": "ETH", "amount": 500.0, "confirmed": True, "tx_hash": "0xeth456...abc789", "created_at": (now - timedelta(days=2)).isoformat()},
            ],
            "compliance": {"kyc_buyer": "approved", "kyc_seller": "approved", "aml_check": "passed", "source_of_funds": "pending", "risk_score": 28},
            "timeline": [
                {"timestamp": (now - timedelta(days=5)).isoformat(), "status": "draft", "action": "Deal created", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=4)).isoformat(), "status": "awaiting_deposit", "action": "Advanced to Awaiting Deposit", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=2)).isoformat(), "status": "funded", "action": "Both parties deposited — custody locked", "performed_by": "system"},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(days=5)).isoformat(),
            "updated_at": (now - timedelta(days=2)).isoformat(),
            "created_by": "carlos@kbex.io",
        },
        {
            "id": f"demo-esc-{uuid.uuid4().hex[:8]}",
            "deal_id": "ESC-DEMO-0003",
            "deal_type": "standard",
            "status": "disputed",
            "asset_a": "BTC", "asset_b": "USD",
            "quantity_a": 10.0, "quantity_b": 972500.0,
            "agreed_price": 97250.0,
            "ticket_size": 972500.0,
            "buyer": {"name": "Helvetia Trust AG", "email": "s.weber@helvetiatrust.ch"},
            "seller": {"name": "Mediterranean Holdings", "email": "contact@medholdings.mt"},
            "fee_schedule": "premium", "fee_payer": "split",
            "fee_rate": 0.003, "fee_total": 2917.50,
            "fee_buyer": 1458.75, "fee_seller": 1458.75,
            "custody": {"locked": True, "locked_at": (now - timedelta(days=10)).isoformat()},
            "deposits": [
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "buyer", "asset": "USD", "amount": 972500, "confirmed": True, "tx_hash": "WIRE-2026-USD-0089", "created_at": (now - timedelta(days=11)).isoformat()},
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "seller", "asset": "BTC", "amount": 10.0, "confirmed": True, "tx_hash": "bc1qsell...789abc", "created_at": (now - timedelta(days=10)).isoformat()},
            ],
            "dispute": {
                "reason": "Seller claims BTC was sent from sanctioned address — buyer disputes origin",
                "opened_by": "carlos@kbex.io",
                "opened_at": (now - timedelta(days=3)).isoformat(),
                "status": "under_review",
                "evidence": [
                    {"id": f"ev-{uuid.uuid4().hex[:6]}", "uploaded_by": "s.weber@helvetiatrust.ch", "file_name": "compliance_report.pdf", "description": "Chainalysis report showing clean source", "uploaded_at": (now - timedelta(days=2)).isoformat()},
                    {"id": f"ev-{uuid.uuid4().hex[:6]}", "uploaded_by": "contact@medholdings.mt", "file_name": "tx_proof.pdf", "description": "Blockchain transaction proof from known exchange", "uploaded_at": (now - timedelta(days=1)).isoformat()},
                ],
                "messages": [
                    {"id": f"msg-{uuid.uuid4().hex[:6]}", "sender": "carlos@kbex.io", "sender_role": "admin", "message": "Dispute opened. Both parties requested to provide evidence within 48h.", "timestamp": (now - timedelta(days=3)).isoformat()},
                    {"id": f"msg-{uuid.uuid4().hex[:6]}", "sender": "s.weber@helvetiatrust.ch", "sender_role": "party", "message": "Chainalysis report attached. All source addresses are from regulated exchanges.", "timestamp": (now - timedelta(days=2)).isoformat()},
                    {"id": f"msg-{uuid.uuid4().hex[:6]}", "sender": "contact@medholdings.mt", "sender_role": "party", "message": "Transaction proof uploaded. BTC originated from our Binance institutional account.", "timestamp": (now - timedelta(days=1)).isoformat()},
                ],
            },
            "compliance": {"kyc_buyer": "approved", "kyc_seller": "approved", "aml_check": "flagged", "source_of_funds": "under_review", "risk_score": 62},
            "timeline": [
                {"timestamp": (now - timedelta(days=15)).isoformat(), "status": "draft", "action": "Deal created", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=12)).isoformat(), "status": "funded", "action": "Both parties deposited", "performed_by": "system"},
                {"timestamp": (now - timedelta(days=3)).isoformat(), "status": "disputed", "action": "Dispute opened by admin", "performed_by": "carlos@kbex.io"},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(days=15)).isoformat(),
            "updated_at": (now - timedelta(days=1)).isoformat(),
            "created_by": "carlos@kbex.io",
        },
        {
            "id": f"demo-esc-{uuid.uuid4().hex[:8]}",
            "deal_id": "ESC-DEMO-0004",
            "deal_type": "standard",
            "status": "awaiting_deposit",
            "asset_a": "SOL", "asset_b": "USDT",
            "quantity_a": 10000.0, "quantity_b": 1855000.0,
            "agreed_price": 185.50,
            "ticket_size": 1855000.0,
            "buyer": {"name": "Pacific Asset Management", "email": "j.chen@pacificam.sg"},
            "seller": {"name": "Al Rashid Family Office", "email": "m.alrashid@arfo.ae"},
            "fee_schedule": "institutional", "fee_payer": "seller",
            "fee_rate": 0.001, "fee_total": 1855.0,
            "fee_buyer": 0, "fee_seller": 1855.0,
            "custody": {"locked": False},
            "deposits": [],
            "compliance": {"kyc_buyer": "approved", "kyc_seller": "approved", "aml_check": "pending", "source_of_funds": "pending", "risk_score": 20},
            "timeline": [
                {"timestamp": (now - timedelta(hours=18)).isoformat(), "status": "draft", "action": "Deal created", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(hours=6)).isoformat(), "status": "awaiting_deposit", "action": "Advanced to Awaiting Deposit", "performed_by": "carlos@kbex.io"},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(hours=18)).isoformat(),
            "updated_at": (now - timedelta(hours=6)).isoformat(),
            "created_by": "carlos@kbex.io",
        },
        {
            "id": f"demo-esc-{uuid.uuid4().hex[:8]}",
            "deal_id": "ESC-DEMO-0005",
            "deal_type": "standard",
            "status": "closed",
            "asset_a": "BTC", "asset_b": "CHF",
            "quantity_a": 50.0, "quantity_b": 4862500.0,
            "agreed_price": 97250.0,
            "ticket_size": 4862500.0,
            "buyer": {"name": "Helvetia Trust AG", "email": "s.weber@helvetiatrust.ch"},
            "seller": {"name": "Sterling Capital Partners", "email": DEMO_CLIENT_EMAIL},
            "fee_schedule": "institutional", "fee_payer": "split",
            "fee_rate": 0.001, "fee_total": 4862.50,
            "fee_buyer": 2431.25, "fee_seller": 2431.25,
            "custody": {"locked": False, "locked_at": (now - timedelta(days=25)).isoformat(), "unlocked_at": (now - timedelta(days=20)).isoformat()},
            "deposits": [
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "buyer", "asset": "CHF", "amount": 4862500, "confirmed": True, "tx_hash": "WIRE-2026-CHF-0012", "created_at": (now - timedelta(days=26)).isoformat()},
                {"id": f"dep-{uuid.uuid4().hex[:6]}", "party": "seller", "asset": "BTC", "amount": 50.0, "confirmed": True, "tx_hash": "bc1qlarge...btc456", "created_at": (now - timedelta(days=25)).isoformat()},
            ],
            "settlement": {
                "type": "dvp", "executed_by": "carlos@kbex.io",
                "executed_at": (now - timedelta(days=20)).isoformat(),
                "asset_a": "BTC", "quantity_a": 50.0,
                "asset_b": "CHF", "quantity_b": 4862500.0,
                "fee_total": 4862.50,
            },
            "compliance": {"kyc_buyer": "approved", "kyc_seller": "approved", "aml_check": "passed", "source_of_funds": "approved", "risk_score": 8},
            "timeline": [
                {"timestamp": (now - timedelta(days=30)).isoformat(), "status": "draft", "action": "Deal created", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=27)).isoformat(), "status": "awaiting_deposit", "action": "Advanced to Awaiting Deposit", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=25)).isoformat(), "status": "funded", "action": "Both parties deposited", "performed_by": "system"},
                {"timestamp": (now - timedelta(days=20)).isoformat(), "status": "settled", "action": "DvP Settlement executed", "performed_by": "carlos@kbex.io"},
                {"timestamp": (now - timedelta(days=18)).isoformat(), "status": "closed", "action": "Deal closed after final verification", "performed_by": "carlos@kbex.io"},
            ],
            "is_demo": True,
            "created_at": (now - timedelta(days=30)).isoformat(),
            "updated_at": (now - timedelta(days=18)).isoformat(),
            "created_by": "carlos@kbex.io",
        },
    ]
    return deals


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
    """Reset all demo data from demo_* collections"""
    demo_collections = [
        "demo_wallets", "demo_transactions", "demo_otc_leads", "demo_otc_deals",
        "demo_bank_transfers", "demo_bank_accounts", "demo_crypto_deposits",
        "demo_crypto_withdrawals", "demo_vault_signatories", "demo_vault_settings",
        "demo_vault_transactions", "demo_escrow_deals", "demo_data",
    ]
    counts = {}
    for col in demo_collections:
        r = await db[col].delete_many({})
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


@router.get("/profile")
async def get_demo_profile(user_id: str = Depends(get_current_user_id)):
    """Get mock profile data for demo mode — hides real user identity"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("demo_mode"):
        raise HTTPException(status_code=403, detail="Demo mode not active")
    return _generate_demo_profile()


@router.get("/bank-accounts")
async def get_demo_bank_accounts(user_id: str = Depends(get_current_user_id)):
    """Get mock bank accounts for demo mode"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("demo_mode"):
        raise HTTPException(status_code=403, detail="Demo mode not active")
    accounts = await db.bank_accounts.find(
        {"user_id": DEMO_CLIENT_ID, "is_demo": True},
        {"_id": 0}
    ).to_list(100)
    if not accounts:
        accounts = _generate_bank_accounts(DEMO_CLIENT_ID)
    return accounts


async def _seed_demo_data():
    """Seed all demo data into SEPARATE demo_* collections (not operational DB)."""
    now = datetime.now(timezone.utc)
    
    # 1. Create demo client user (stays in users collection but tagged)
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
    
    # 2. Clear old demo data from demo_* collections
    demo_collections = [
        "demo_wallets", "demo_transactions", "demo_otc_leads", "demo_otc_deals",
        "demo_bank_transfers", "demo_bank_accounts", "demo_crypto_deposits",
        "demo_crypto_withdrawals", "demo_vault_signatories", "demo_vault_settings",
        "demo_vault_transactions", "demo_escrow_deals",
    ]
    for col_name in demo_collections:
        await db[col_name].delete_many({})
    
    # Also clean any legacy demo data from operational collections
    legacy_cols = ["wallets", "transactions", "otc_leads", "otc_deals", "bank_transfers",
                   "bank_accounts", "crypto_deposits", "crypto_withdrawals",
                   "vault_signatories", "vault_settings", "vault_transactions"]
    for col_name in legacy_cols:
        await db[col_name].delete_many({"is_demo": True})
    
    # 3. Create wallets → demo_wallets
    for w in DEMO_WALLETS:
        wallet = {
            "id": f"demo-wallet-{w['asset_id'].lower()}",
            "user_id": DEMO_CLIENT_ID,
            "is_demo": True,
            **w,
            "created_at": (now - timedelta(days=90)).isoformat(),
        }
        await db.demo_wallets.insert_one(wallet)
    
    # 4. Transactions → demo_transactions
    txs = _generate_transactions(DEMO_CLIENT_ID)
    if txs:
        await db.demo_transactions.insert_many(txs)
    
    # 5. OTC leads → demo_otc_leads
    leads = _generate_otc_leads()
    if leads:
        await db.demo_otc_leads.insert_many(leads)
    
    # 6. OTC deals → demo_otc_deals
    deals = _generate_otc_deals()
    if deals:
        await db.demo_otc_deals.insert_many(deals)
    
    # 7. Bank deposits → demo_bank_transfers
    deposits = [
        {
            "id": f"demo-dep-{uuid.uuid4().hex[:8]}",
            "user_id": DEMO_CLIENT_ID,
            "amount": 500000, "currency": "EUR",
            "status": "completed", "bank_reference": "KBEX-2026-EUR-00142",
            "is_demo": True,
            "created_at": (now - timedelta(days=30)).isoformat(),
        },
        {
            "id": f"demo-dep-{uuid.uuid4().hex[:8]}",
            "user_id": DEMO_CLIENT_ID,
            "amount": 750000, "currency": "USD",
            "status": "completed", "bank_reference": "KBEX-2026-USD-00089",
            "is_demo": True,
            "created_at": (now - timedelta(days=15)).isoformat(),
        },
        {
            "id": f"demo-dep-{uuid.uuid4().hex[:8]}",
            "user_id": DEMO_CLIENT_ID,
            "amount": 100000, "currency": "USD",
            "status": "pending", "bank_reference": "KBEX-2026-USD-00201",
            "is_demo": True,
            "created_at": (now - timedelta(hours=4)).isoformat(),
        },
    ]
    await db.demo_bank_transfers.insert_many(deposits)
    
    # 8. Crypto deposits → demo_crypto_deposits
    crypto_deps = _generate_crypto_deposits(DEMO_CLIENT_ID)
    if crypto_deps:
        await db.demo_crypto_deposits.insert_many(crypto_deps)
    
    # 9. Crypto withdrawals → demo_crypto_withdrawals
    crypto_withs = _generate_crypto_withdrawals(DEMO_CLIENT_ID)
    if crypto_withs:
        await db.demo_crypto_withdrawals.insert_many(crypto_withs)
    
    # 10. Vault / Multi-Sign → demo_vault_*
    signatories, vault_settings, vault_txs = _generate_vault_data(DEMO_CLIENT_ID)
    if signatories:
        await db.demo_vault_signatories.insert_many(signatories)
    await db.demo_vault_settings.insert_one(vault_settings)
    if vault_txs:
        await db.demo_vault_transactions.insert_many(vault_txs)
    
    # 11. Bank accounts → demo_bank_accounts
    demo_bank_accounts = _generate_bank_accounts(DEMO_CLIENT_ID)
    if demo_bank_accounts:
        await db.demo_bank_accounts.insert_many(demo_bank_accounts)
    
    # 12. Escrow deals → demo_escrow_deals
    escrow_deals = _generate_escrow_deals()
    if escrow_deals:
        await db.demo_escrow_deals.insert_many(escrow_deals)
    
    # 13. Mark seed as done
    await db.demo_data.update_one(
        {"type": "seed_status"},
        {"$set": {"type": "seed_status", "seeded_at": now.isoformat(), "version": 2}},
        upsert=True
    )
    
    logger.info("Demo data seeded to demo_* collections successfully")
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
            "bank_accounts": len(demo_bank_accounts),
            "escrow_deals": len(escrow_deals),
        }
    }
