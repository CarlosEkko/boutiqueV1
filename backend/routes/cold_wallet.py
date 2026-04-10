"""
Cold Wallet (Trezor) Routes
Manages cold wallet addresses for clients and treasury
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from utils.auth import get_current_user_id
from routes.admin import get_admin_user

router = APIRouter(prefix="/cold-wallet", tags=["cold-wallet"])

db = None

def set_db(database):
    global db
    db = database


class ColdWalletAddress(BaseModel):
    coin: str
    address: str
    path: Optional[str] = None
    balance: Optional[str] = "0"


# ---- Client Cold Wallet ----

@router.get("/addresses")
async def get_client_addresses(user_id: str = Depends(get_current_user_id)):
    """Get saved cold wallet addresses for the current user."""
    addresses = await db.cold_wallet_addresses.find(
        {"user_id": user_id, "type": "client"},
        {"_id": 0}
    ).to_list(50)
    return addresses


@router.post("/addresses")
async def save_client_address(data: ColdWalletAddress, user_id: str = Depends(get_current_user_id)):
    """Save or update a cold wallet address for the current user."""
    await db.cold_wallet_addresses.update_one(
        {"user_id": user_id, "coin": data.coin, "type": "client"},
        {"$set": {
            "user_id": user_id,
            "type": "client",
            "coin": data.coin,
            "address": data.address,
            "path": data.path,
            "balance": data.balance,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "saved"}


# ---- Admin Treasury Cold Wallet ----

@router.get("/treasury")
async def get_treasury_addresses(admin: dict = Depends(get_admin_user)):
    """Get all treasury cold wallet addresses."""
    addresses = await db.cold_wallet_addresses.find(
        {"type": "treasury"},
        {"_id": 0}
    ).to_list(50)
    return addresses


@router.post("/treasury")
async def save_treasury_address(data: ColdWalletAddress, admin: dict = Depends(get_admin_user)):
    """Save or update a treasury cold wallet address."""
    await db.cold_wallet_addresses.update_one(
        {"coin": data.coin, "type": "treasury"},
        {"$set": {
            "type": "treasury",
            "coin": data.coin,
            "address": data.address,
            "path": data.path,
            "balance": data.balance,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("id"),
        }},
        upsert=True,
    )
    return {"status": "saved"}


@router.post("/treasury/refresh")
async def refresh_treasury_balances(admin: dict = Depends(get_admin_user)):
    """Placeholder for balance refresh - balances are updated from the frontend via Trezor Connect."""
    count = await db.cold_wallet_addresses.count_documents({"type": "treasury"})
    return {"updated": count, "message": "Use a Trezor para atualizar os saldos via frontend"}
