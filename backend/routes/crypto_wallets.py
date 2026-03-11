"""
Crypto Wallets Routes - Fireblocks Integration for User Crypto Wallets
Handles wallet creation, deposit addresses, withdrawals
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging
import uuid

from services.fireblocks_service import FireblocksService
from utils.auth import get_current_user_id
from routes.admin import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/crypto-wallets", tags=["Crypto Wallets"])

# Database reference
db = None

def set_db(database):
    global db
    db = database


# Fireblocks asset mapping - Sandbox uses _TEST suffix for testnet assets
# For production, remove the _TEST suffix
FIREBLOCKS_ASSET_MAP = {
    "BTC": "BTC_TEST",
    "ETH": "ETH_TEST",
    "USDT": "USDT_ERC20_TEST",
    "USDC": "USDC_ERC20_TEST",
    "SOL": "SOL_TEST",
    "XRP": "XRP_TEST",
    "BNB": "BNB_TEST",
    "ADA": "ADA_TEST",
    "DOGE": "DOGE_TEST",
    "TRX": "TRX_TEST",
    "AVAX": "AVAX_TEST",
    "LINK": "LINK_TEST",
    "DOT": "DOT_TEST",
    "MATIC": "MATIC_POLYGON_TEST",
    "LTC": "LTC_TEST",
    "UNI": "UNI_ERC20_TEST",
    "ATOM": "ATOM_TEST",
    "XLM": "XLM_TEST",
    "ALGO": "ALGO_TEST",
    "FIL": "FIL_TEST",
    "ETC": "ETC_TEST",
    "XMR": "XMR_TEST",
    "NEAR": "NEAR_TEST",
    "HBAR": "HBAR_TEST",
    "VET": "VET_TEST",
    "AAVE": "AAVE_ERC20_TEST",
    "GRT": "GRT_ERC20_TEST",
    "FTM": "FTM_TEST",
    "THETA": "THETA_TEST",
    "SAND": "SAND_ERC20_TEST",
    "AXS": "AXS_ERC20_TEST",
    "MANA": "MANA_ERC20_TEST",
    "EOS": "EOS_TEST",
    "XTZ": "XTZ_TEST",
    "FLOW": "FLOW_TEST",
    "NEO": "NEO_TEST",
    # For assets not in testnet, we'll use mainnet IDs
    "SHIB": "SHIB",
    "TON": "TON",
    "BCH": "BCH",
    "DAI": "DAI",
    "APT": "APT",
    "OKB": "OKB",
    "ARB": "ARB",
    "CRO": "CRO",
    "MKR": "MKR",
    "INJ": "INJ",
    "OP": "OP",
    "RUNE": "RUNE",
    "EGLD": "EGLD",
    "ICP": "ICP",
}

# Primary assets to create by default (most commonly used)
PRIMARY_ASSETS = ["BTC", "ETH", "USDT", "USDC", "SOL", "XRP"]


# ==================== MODELS ====================

class CreateUserWalletRequest(BaseModel):
    user_id: str


class CryptoWithdrawalRequest(BaseModel):
    asset: str = Field(..., description="Asset symbol (BTC, ETH, etc.)")
    amount: float = Field(..., gt=0)
    destination_address: str = Field(..., min_length=10)
    network: Optional[str] = None
    note: Optional[str] = None


class WithdrawalApprovalRequest(BaseModel):
    approved: bool
    admin_note: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def get_fireblocks_asset_id(symbol: str) -> str:
    """Map our symbol to Fireblocks asset ID"""
    return FIREBLOCKS_ASSET_MAP.get(symbol.upper(), f"{symbol.upper()}_TEST")


async def get_user_by_id(user_id: str) -> dict:
    """Get user from database"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user


async def ensure_user_has_fireblocks_vault(user_id: str) -> dict:
    """Ensure user has a Fireblocks vault account, create if not exists"""
    # Check if user already has a vault
    user_vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if user_vault:
        return user_vault
    
    # Get user info
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create vault in Fireblocks
    try:
        vault_name = f"KBEX-{user.get('email', user_id)[:30]}"
        vault = await FireblocksService.create_vault_account(name=vault_name, hidden=False)
        
        vault_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "fireblocks_vault_id": vault.get("id"),
            "vault_name": vault_name,
            "assets": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.user_fireblocks_vaults.insert_one(vault_record)
        logger.info(f"Created Fireblocks vault {vault.get('id')} for user {user_id}")
        
        return vault_record
        
    except Exception as e:
        logger.error(f"Failed to create Fireblocks vault for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create crypto wallet: {str(e)}")


async def ensure_asset_in_vault(user_id: str, asset_symbol: str) -> dict:
    """Ensure an asset wallet exists in user's vault"""
    vault = await ensure_user_has_fireblocks_vault(user_id)
    _ = vault.get("fireblocks_vault_id")
    
    # Check if asset already exists
    existing_assets = vault.get("assets", [])
    for existing in existing_assets:
        if existing.get("symbol") == asset_symbol.upper():
            return existing
    
    # Create asset in Fireblocks
    try:
        fireblocks_asset_id = get_fireblocks_asset_id(asset_symbol)
        _ = await FireblocksService.create_vault_asset(vault_id, fireblocks_asset_id)
        
        # Get deposit address
        addresses = await FireblocksService.get_deposit_addresses(vault_id, fireblocks_asset_id)
        deposit_address = addresses[0].get("address") if addresses else None
        
        asset_record = {
            "symbol": asset_symbol.upper(),
            "fireblocks_asset_id": fireblocks_asset_id,
            "deposit_address": deposit_address,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Update vault record
        await db.user_fireblocks_vaults.update_one(
            {"user_id": user_id},
            {
                "$push": {"assets": asset_record},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        logger.info(f"Created asset {asset_symbol} for user {user_id}")
        return asset_record
        
    except Exception as e:
        logger.error(f"Failed to create asset {asset_symbol} for user {user_id}: {e}")
        # Don't fail completely, just log and return None
        return None


# ==================== USER ENDPOINTS ====================

@router.get("/my-vault")
async def get_my_crypto_vault(user_id: str = Depends(get_current_user_id)):
    """Get current user's crypto vault info"""
    vault = await db.user_fireblocks_vaults.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if not vault:
        return {"has_vault": False, "message": "No crypto wallet created yet"}
    
    return {
        "has_vault": True,
        "vault_id": vault.get("fireblocks_vault_id"),
        "assets": vault.get("assets", []),
        "created_at": vault.get("created_at")
    }


@router.post("/initialize")
async def initialize_crypto_wallet(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id)
):
    """Initialize crypto wallet for current user"""
    # Check if user is approved
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Account must be approved to create crypto wallet")
    
    # Create vault
    vault = await ensure_user_has_fireblocks_vault(user_id)
    
    # Create primary assets in background
    async def create_primary_assets():
        for asset in PRIMARY_ASSETS:
            try:
                await ensure_asset_in_vault(user_id, asset)
            except Exception as e:
                logger.error(f"Failed to create {asset} for {user_id}: {e}")
    
    background_tasks.add_task(create_primary_assets)
    
    return {
        "success": True,
        "message": "Crypto wallet initialized. Primary assets being created.",
        "vault_id": vault.get("fireblocks_vault_id")
    }


@router.get("/deposit-address/{asset}")
async def get_deposit_address(
    asset: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get deposit address for a specific asset"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        raise HTTPException(status_code=404, detail="Crypto wallet not initialized. Please initialize first.")
    
    _ = vault.get("fireblocks_vault_id")
    asset_upper = asset.upper()
    
    # Check if asset exists in vault
    existing_assets = vault.get("assets", [])
    asset_info = next((a for a in existing_assets if a.get("symbol") == asset_upper), None)
    
    if asset_info and asset_info.get("deposit_address"):
        return {
            "asset": asset_upper,
            "address": asset_info.get("deposit_address"),
            "network": asset_info.get("fireblocks_asset_id"),
            "cached": True
        }
    
    # Create asset if not exists
    try:
        asset_record = await ensure_asset_in_vault(user_id, asset_upper)
        
        if not asset_record:
            raise HTTPException(status_code=500, detail=f"Failed to create {asset_upper} wallet")
        
        return {
            "asset": asset_upper,
            "address": asset_record.get("deposit_address"),
            "network": asset_record.get("fireblocks_asset_id"),
            "cached": False
        }
        
    except Exception as e:
        logger.error(f"Error getting deposit address: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balances")
async def get_crypto_balances(user_id: str = Depends(get_current_user_id)):
    """Get all crypto balances from Fireblocks"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        return {"balances": [], "message": "No crypto wallet found"}
    
    _ = vault.get("fireblocks_vault_id")
    balances = []
    
    try:
        # Get vault account with all assets
        account = await FireblocksService.get_vault_account(vault_id)
        assets = account.get("assets", [])
        
        for asset in assets:
            balances.append({
                "asset": asset.get("id", "").replace("_TEST", "").replace("_ERC20", ""),
                "fireblocks_asset_id": asset.get("id"),
                "total": float(asset.get("total", 0)),
                "available": float(asset.get("available", 0)),
                "pending": float(asset.get("pending", 0)),
                "frozen": float(asset.get("frozen", 0))
            })
        
        return {"balances": balances, "vault_id": vault_id}
        
    except Exception as e:
        logger.error(f"Error getting balances: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/withdraw")
async def request_crypto_withdrawal(
    request: CryptoWithdrawalRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Request a crypto withdrawal (requires admin approval)"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        raise HTTPException(status_code=404, detail="Crypto wallet not found")
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get asset fees
    from routes.trading import get_crypto_fees
    fees = await get_crypto_fees(request.asset)
    withdrawal_fee = fees.withdrawal_fee_percent / 100
    network_fee = fees.network_fee
    
    # Calculate amounts
    fee_amount = request.amount * withdrawal_fee
    # total_deduction = request.amount + network_fee
    net_amount = request.amount - fee_amount
    
    # Create withdrawal request
    withdrawal_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user.get("email"),
        "vault_id": vault.get("fireblocks_vault_id"),
        "asset": request.asset.upper(),
        "fireblocks_asset_id": get_fireblocks_asset_id(request.asset),
        "amount": request.amount,
        "fee_amount": fee_amount,
        "network_fee": network_fee,
        "net_amount": net_amount,
        "destination_address": request.destination_address,
        "network": request.network,
        "note": request.note,
        "status": "pending",  # pending -> approved -> processing -> completed/failed
        "fireblocks_tx_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.crypto_withdrawals.insert_one(withdrawal_record)
    
    logger.info(f"Crypto withdrawal request created: {withdrawal_record['id']}")
    
    return {
        "success": True,
        "withdrawal_id": withdrawal_record["id"],
        "message": "Withdrawal request submitted. Awaiting admin approval.",
        "summary": {
            "asset": request.asset.upper(),
            "amount": request.amount,
            "fee": fee_amount,
            "network_fee": network_fee,
            "net_amount": net_amount,
            "destination": request.destination_address
        }
    }


@router.get("/withdrawals")
async def get_my_withdrawals(user_id: str = Depends(get_current_user_id)):
    """Get user's withdrawal history"""
    withdrawals = await db.crypto_withdrawals.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return withdrawals


@router.post("/withdrawals/{withdrawal_id}/cancel")
async def cancel_withdrawal(
    withdrawal_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Cancel a pending withdrawal"""
    withdrawal = await db.crypto_withdrawals.find_one({
        "id": withdrawal_id,
        "user_id": user_id
    })
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending withdrawals can be cancelled")
    
    await db.crypto_withdrawals.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "cancelled",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": "Withdrawal cancelled"}


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/withdrawals")
async def admin_list_withdrawals(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """List all crypto withdrawal requests"""
    query = {}
    if status:
        query["status"] = status
    
    withdrawals = await db.crypto_withdrawals.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    
    return {"withdrawals": withdrawals, "count": len(withdrawals)}


@router.post("/admin/withdrawals/{withdrawal_id}/approve")
async def admin_approve_withdrawal(
    withdrawal_id: str,
    request: WithdrawalApprovalRequest,
    admin: dict = Depends(get_admin_user)
):
    """Approve or reject a crypto withdrawal"""
    withdrawal = await db.crypto_withdrawals.find_one({"id": withdrawal_id})
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Withdrawal is not pending")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if not request.approved:
        # Reject withdrawal
        await db.crypto_withdrawals.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": "rejected",
                    "admin_note": request.admin_note,
                    "reviewed_by": admin.get("email"),
                    "reviewed_at": now,
                    "updated_at": now
                }
            }
        )
        return {"success": True, "message": "Withdrawal rejected"}
    
    # Approve and execute on Fireblocks
    try:
        # Update status to processing
        await db.crypto_withdrawals.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": "processing",
                    "reviewed_by": admin.get("email"),
                    "reviewed_at": now,
                    "updated_at": now
                }
            }
        )
        
        # Execute transaction on Fireblocks
        tx = await FireblocksService.create_transaction(
            source_vault_id=withdrawal.get("vault_id"),
            destination_address=withdrawal.get("destination_address"),
            asset_id=withdrawal.get("fireblocks_asset_id"),
            amount=str(withdrawal.get("net_amount")),
            note=f"KBEX Withdrawal {withdrawal_id}"
        )
        
        # Update with transaction ID
        await db.crypto_withdrawals.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": "completed",
                    "fireblocks_tx_id": tx.get("id"),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        logger.info(f"Withdrawal {withdrawal_id} completed: Fireblocks TX {tx.get('id')}")
        
        return {
            "success": True,
            "message": "Withdrawal approved and executed",
            "fireblocks_tx_id": tx.get("id")
        }
        
    except Exception as e:
        logger.error(f"Failed to execute withdrawal {withdrawal_id}: {e}")
        
        # Mark as failed
        await db.crypto_withdrawals.update_one(
            {"id": withdrawal_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        raise HTTPException(status_code=500, detail=f"Failed to execute withdrawal: {str(e)}")


@router.get("/admin/vaults")
async def admin_list_all_vaults(admin: dict = Depends(get_admin_user)):
    """List all user vaults"""
    vaults = await db.user_fireblocks_vaults.find(
        {},
        {"_id": 0}
    ).to_list(500)
    
    return {"vaults": vaults, "count": len(vaults)}


@router.post("/admin/create-vault/{user_id}")
async def admin_create_user_vault(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Create Fireblocks vault for a user"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    vault = await ensure_user_has_fireblocks_vault(user_id)
    
    # Create primary assets
    for asset in PRIMARY_ASSETS:
        try:
            await ensure_asset_in_vault(user_id, asset)
        except Exception as e:
            logger.error(f"Failed to create {asset} for {user_id}: {e}")
    
    return {
        "success": True,
        "vault_id": vault.get("fireblocks_vault_id"),
        "user_id": user_id
    }


# ==================== WEBHOOK ====================

@router.post("/webhook")
async def fireblocks_webhook(request: dict):
    """Handle Fireblocks webhook events"""
    event_type = request.get("type")
    data = request.get("data", {})
    
    logger.info(f"Fireblocks webhook received: {event_type}")
    
    if event_type == "TRANSACTION_STATUS_UPDATED":
        tx_id = data.get("id")
        status = data.get("status")
        
        # Update any related withdrawal
        if status == "COMPLETED":
            await db.crypto_withdrawals.update_one(
                {"fireblocks_tx_id": tx_id},
                {
                    "$set": {
                        "status": "completed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        elif status == "FAILED":
            await db.crypto_withdrawals.update_one(
                {"fireblocks_tx_id": tx_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": data.get("subStatus"),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
    
    elif event_type == "VAULT_ACCOUNT_ASSET_UPDATE":
        # Deposit received - could notify user here
        vault_id = data.get("vaultAccountId")
        asset_id = data.get("assetId")
        balance = data.get("available")
        
        logger.info(f"Balance update for vault {vault_id}, asset {asset_id}: {balance}")
    
    return {"success": True}
