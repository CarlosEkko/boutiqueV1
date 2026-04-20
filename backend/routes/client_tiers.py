"""
Client Tiers & Features comparison.
Provides CRUD for tier configuration and client-facing comparison view.
Seeded with defaults based on KBEX tier grid (Broker / Standard / Premium / VIP / Institucional).
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from utils.auth import get_current_user_id

router = APIRouter(prefix="/client-tiers", tags=["Client Tiers"])

db = None


def set_db(database):
    global db
    db = database


# ==================== MODELS ====================

class Feature(BaseModel):
    id: str
    label: str
    # values per tier: can be bool, number, or string ("24h", "limitado", "—")
    values: Dict[str, Any]


class TierSection(BaseModel):
    id: str
    label: str
    features: List[Feature]


class TiersConfig(BaseModel):
    tiers: List[Dict[str, Any]]
    sections: List[TierSection]
    updated_at: Optional[str] = None


class UpgradeRequest(BaseModel):
    target_tier: str  # "premium" / "vip" / "institucional"
    message: Optional[str] = None


# ==================== DEFAULT SEED DATA ====================

DEFAULT_TIERS = [
    {"id": "broker", "label": "Broker", "min_allocation": 190, "currency": "EUR", "color": "#6B7280", "accent": "slate"},
    {"id": "standard", "label": "Standard", "min_allocation": 500, "currency": "EUR", "color": "#A78BFA", "accent": "violet"},
    {"id": "premium", "label": "Premium", "min_allocation": 1100, "currency": "EUR", "color": "#60A5FA", "accent": "sky"},
    {"id": "vip", "label": "VIP", "min_allocation": 2500, "currency": "EUR", "color": "#D4AF37", "accent": "gold"},
    {"id": "institucional", "label": "Institucional", "min_allocation": 5000, "currency": "EUR", "color": "#10B981", "accent": "emerald"},
]

DEFAULT_SECTIONS = [
    {
        "id": "profile",
        "label": "Perfil",
        "features": [
            {"id": "my_profile", "label": "Meu Perfil", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "bank_data", "label": "Dados Bancários", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "security", "label": "Segurança", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "kyc", "label": "Verificação KYC", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "support", "label": "Suporte", "values": {"broker": "24h", "standard": "24h", "premium": "até 12h", "vip": "até 8h", "institucional": "1h"}},
        ],
    },
    {
        "id": "portfolio",
        "label": "Portefólio",
        "features": [
            {"id": "exchange", "label": "Exchange", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "wallets", "label": "Carteiras", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "whitelist", "label": "Whitelist", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "crypto_ops", "label": "Operações Crypto", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "fiat_ops", "label": "Operações FIAT", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "transactions", "label": "Transações", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
        ],
    },
    {
        "id": "trading",
        "label": "Trading",
        "features": [
            {"id": "spot_trading", "label": "Spot Trading", "values": {"broker": True, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "market_trading", "label": "Market Trading", "values": {"broker": False, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "stop_limit", "label": "Stop-Limit", "values": {"broker": False, "standard": True, "premium": True, "vip": True, "institucional": True}},
        ],
    },
    {
        "id": "cold_wallet",
        "label": "Cold Wallet",
        "features": [
            {"id": "trezor_wallet", "label": "Trezor Wallet", "values": {"broker": False, "standard": False, "premium": True, "vip": True, "institucional": True}},
        ],
    },
    {
        "id": "investments",
        "label": "Investimentos",
        "features": [
            {"id": "investments", "label": "Investimentos", "values": {"broker": False, "standard": False, "premium": True, "vip": True, "institucional": True}},
            {"id": "staking", "label": "Staking", "values": {"broker": False, "standard": True, "premium": True, "vip": True, "institucional": True}},
            {"id": "roi", "label": "ROI", "values": {"broker": False, "standard": True, "premium": True, "vip": True, "institucional": True}},
        ],
    },
    {
        "id": "launchpad",
        "label": "Launchpad",
        "features": [
            {"id": "launchpad", "label": "Launchpad", "values": {"broker": False, "standard": False, "premium": True, "vip": True, "institucional": True}},
        ],
    },
    {
        "id": "otc_portal",
        "label": "Portal OTC",
        "features": [
            {"id": "otc_desk", "label": "OTC Desk", "values": {"broker": False, "standard": False, "premium": True, "vip": True, "institucional": True}},
            {"id": "otc_desk_premium", "label": "OTC Desk Premium", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "otc_vaults", "label": "Cofres (Omnibus)", "values": {"broker": 1, "standard": 3, "premium": 10, "vip": 20, "institucional": 50}},
        ],
    },
    {
        "id": "forensic",
        "label": "Forensic",
        "features": [
            {"id": "kyt", "label": "KYT", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "reports", "label": "Relatórios", "values": {"broker": 0, "standard": 0, "premium": 0, "vip": 50, "institucional": "ilimitado"}},
            {"id": "investigations", "label": "Investigações", "values": {"broker": 0, "standard": 0, "premium": 0, "vip": 10, "institucional": 50}},
        ],
    },
    {
        "id": "escrow",
        "label": "Escrow Account",
        "features": [
            {"id": "clock_trade", "label": "Clock Trade", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "stablecoin_swap", "label": "Stablecoin Swap", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "cross_chain", "label": "Cross-Chain", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "crypto_fiat", "label": "Crypto/Fiat", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "crypto_crypto", "label": "Crypto/Crypto", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "one_side", "label": "1-Side", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
            {"id": "two_side", "label": "2-Side", "values": {"broker": False, "standard": False, "premium": False, "vip": True, "institucional": True}},
        ],
    },
    {
        "id": "multi_sign",
        "label": "Multi-Sign",
        "features": [
            {"id": "signatories", "label": "Signatários", "values": {"broker": 0, "standard": 0, "premium": 0, "vip": 5, "institucional": 10}},
        ],
    },
]


async def _ensure_seed():
    """Seed default tier config if collection empty."""
    existing = await db.client_tiers_config.find_one({"id": "main"}, {"_id": 0})
    if existing:
        return existing
    doc = {
        "id": "main",
        "tiers": DEFAULT_TIERS,
        "sections": DEFAULT_SECTIONS,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.client_tiers_config.insert_one(doc)
    return doc


async def _is_admin(user_id: str) -> bool:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "is_admin": 1, "internal_role": 1})
    if not user:
        return False
    return bool(user.get("is_admin")) or user.get("internal_role") in ("admin", "global_manager", "manager")


# ==================== ROUTES ====================

@router.get("")
async def get_tiers(user_id: str = Depends(get_current_user_id)):
    """Return full tier config (for both client and admin views)."""
    doc = await _ensure_seed()
    doc.pop("_id", None)

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "membership_level": 1})
    current_tier = (user or {}).get("membership_level", "standard")

    return {
        "tiers": doc.get("tiers", []),
        "sections": doc.get("sections", []),
        "current_tier": current_tier,
        "updated_at": doc.get("updated_at"),
    }


@router.put("")
async def update_tiers(payload: TiersConfig, user_id: str = Depends(get_current_user_id)):
    """Admin only — replace full tier config."""
    if not await _is_admin(user_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    update = {
        "tiers": payload.tiers,
        "sections": [s.model_dump() for s in payload.sections],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.client_tiers_config.update_one(
        {"id": "main"},
        {"$set": update, "$setOnInsert": {"id": "main"}},
        upsert=True,
    )
    return {"success": True, "updated_at": update["updated_at"]}


@router.post("/reset")
async def reset_to_defaults(user_id: str = Depends(get_current_user_id)):
    """Admin only — reset to default KBEX config."""
    if not await _is_admin(user_id):
        raise HTTPException(status_code=403, detail="Admin access required")

    doc = {
        "id": "main",
        "tiers": DEFAULT_TIERS,
        "sections": DEFAULT_SECTIONS,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.client_tiers_config.update_one({"id": "main"}, {"$set": doc}, upsert=True)
    return {"success": True}


@router.post("/upgrade-request")
async def request_upgrade(payload: UpgradeRequest, user_id: str = Depends(get_current_user_id)):
    """Client submits an upgrade request — creates a record and notifies staff."""
    valid = {"standard", "premium", "vip", "institucional", "broker"}
    target = payload.target_tier.lower().strip()
    if target not in valid:
        raise HTTPException(status_code=400, detail="Tier inválido")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    record = {
        "user_id": user_id,
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "current_tier": user.get("membership_level", "standard"),
        "target_tier": target,
        "message": (payload.message or "").strip()[:2000],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.tier_upgrade_requests.insert_one(record)
    _ = res
    record.pop("_id", None)

    # Notify admins (best-effort, non-blocking logic kept simple)
    try:
        await db.notifications.insert_one({
            "target": "admin",
            "type": "tier_upgrade_request",
            "title": f"Pedido de upgrade: {user.get('name')} → {target.upper()}",
            "message": record["message"] or "Sem mensagem adicional",
            "user_id": user_id,
            "read": False,
            "created_at": record["created_at"],
        })
    except Exception:
        pass

    return {"success": True, "message": "Pedido de upgrade enviado com sucesso", "request": record}


@router.get("/upgrade-requests")
async def list_upgrade_requests(user_id: str = Depends(get_current_user_id)):
    """Admin only — list upgrade requests."""
    if not await _is_admin(user_id):
        raise HTTPException(status_code=403, detail="Admin access required")
    items = await db.tier_upgrade_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"requests": items}
