"""
Cold Wallet (Trezor) Routes
Manages cold wallet addresses for clients and treasury.
Includes UTXO/ETH param fetching, fee estimation, broadcast, and tx logging.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from utils.auth import get_current_user_id
from routes.admin import get_admin_user
from services.blockchain_service import (
    get_utxos, get_btc_raw_tx, get_fee_estimates,
    get_eth_params, broadcast_transaction,
)

logger = logging.getLogger(__name__)

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


class BroadcastRequest(BaseModel):
    coin: str
    hex_tx: str
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    amount: Optional[str] = None
    wallet_type: Optional[str] = "client"  # client or treasury


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


# ---- Blockchain Data Endpoints ----

@router.get("/utxos/{address}")
async def fetch_utxos(address: str, coin: str = "BTC", user_id: str = Depends(get_current_user_id)):
    """Fetch UTXOs for a BTC/LTC address."""
    try:
        utxo_list = await get_utxos(coin.upper(), address)
        return {"coin": coin.upper(), "address": address, "utxos": utxo_list}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"UTXO fetch error: {e}")
        raise HTTPException(status_code=502, detail=f"Falha ao buscar UTXOs: {str(e)}")


@router.get("/raw-tx/{txid}")
async def fetch_raw_tx(txid: str, user_id: str = Depends(get_current_user_id)):
    """Get raw hex of a BTC transaction (needed for Trezor sign inputs)."""
    try:
        raw = await get_btc_raw_tx(txid)
        return {"txid": txid, "hex": raw}
    except Exception as e:
        logger.error(f"Raw TX fetch error: {e}")
        raise HTTPException(status_code=502, detail=f"Falha ao buscar transação: {str(e)}")


@router.get("/eth-params/{address}")
async def fetch_eth_params(address: str, user_id: str = Depends(get_current_user_id)):
    """Get ETH nonce, gas price, balance."""
    try:
        params = await get_eth_params(address)
        return params
    except Exception as e:
        logger.error(f"ETH params error: {e}")
        raise HTTPException(status_code=502, detail=f"Falha ao buscar dados ETH: {str(e)}")


@router.get("/fee-estimate/{coin}")
async def fetch_fee_estimate(coin: str, user_id: str = Depends(get_current_user_id)):
    """Get fee estimates for a given coin."""
    try:
        fees = await get_fee_estimates(coin.upper())
        return {"coin": coin.upper(), **fees}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Fee estimate error: {e}")
        raise HTTPException(status_code=502, detail=f"Falha ao estimar taxas: {str(e)}")


@router.post("/broadcast")
async def broadcast_signed_tx(data: BroadcastRequest, user_id: str = Depends(get_current_user_id)):
    """Broadcast a Trezor-signed transaction to the blockchain network."""
    try:
        txid = await broadcast_transaction(data.coin.upper(), data.hex_tx)

        # Log the transaction
        await db.cold_wallet_transactions.insert_one({
            "user_id": user_id,
            "coin": data.coin.upper(),
            "txid": txid,
            "from_address": data.from_address,
            "to_address": data.to_address,
            "amount": data.amount,
            "wallet_type": data.wallet_type,
            "status": "broadcast",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {"txid": txid, "status": "broadcast", "coin": data.coin.upper()}
    except Exception as e:
        logger.error(f"Broadcast error: {e}")
        raise HTTPException(status_code=502, detail=f"Falha ao transmitir transação: {str(e)}")


@router.get("/transactions")
async def get_wallet_transactions(user_id: str = Depends(get_current_user_id)):
    """Get cold wallet transaction history for the current user."""
    txs = await db.cold_wallet_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return txs


# ---- Admin Blockchain Endpoints (same features for treasury) ----

@router.get("/admin/utxos/{address}")
async def admin_fetch_utxos(address: str, coin: str = "BTC", admin: dict = Depends(get_admin_user)):
    try:
        utxo_list = await get_utxos(coin.upper(), address)
        return {"coin": coin.upper(), "address": address, "utxos": utxo_list}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/admin/eth-params/{address}")
async def admin_fetch_eth_params(address: str, admin: dict = Depends(get_admin_user)):
    try:
        return await get_eth_params(address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/admin/fee-estimate/{coin}")
async def admin_fetch_fee_estimate(coin: str, admin: dict = Depends(get_admin_user)):
    try:
        fees = await get_fee_estimates(coin.upper())
        return {"coin": coin.upper(), **fees}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/admin/broadcast")
async def admin_broadcast_tx(data: BroadcastRequest, admin: dict = Depends(get_admin_user)):
    try:
        txid = await broadcast_transaction(data.coin.upper(), data.hex_tx)
        await db.cold_wallet_transactions.insert_one({
            "user_id": admin.get("id"),
            "coin": data.coin.upper(),
            "txid": txid,
            "from_address": data.from_address,
            "to_address": data.to_address,
            "amount": data.amount,
            "wallet_type": "treasury",
            "status": "broadcast",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"txid": txid, "status": "broadcast", "coin": data.coin.upper()}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
