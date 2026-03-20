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


# Fireblocks asset mapping - Production assets
# Use mainnet asset IDs for production
FIREBLOCKS_ASSET_MAP = {
    "BTC": "BTC",
    "ETH": "ETH",
    "USDT": "USDT_ERC20",
    "USDC": "USDC",
    "SOL": "SOL",
    "XRP": "XRP",
    "BNB": "BNB_BSC",
    "ADA": "ADA",
    "DOGE": "DOGE",
    "TRX": "TRX",
    "AVAX": "AVAX",
    "LINK": "LINK",
    "DOT": "DOT",
    "MATIC": "MATIC_POLYGON",
    "LTC": "LTC",
    "UNI": "UNI",
    "ATOM": "ATOM_COS",
    "XLM": "XLM",
    "ALGO": "ALGO",
    "FIL": "FIL",
    "ETC": "ETC",
    "XMR": "XMR",
    "NEAR": "NEAR",
    "HBAR": "HBAR",
    "VET": "VET",
    "AAVE": "AAVE",
    "GRT": "GRT",
    "FTM": "FTM_FANTOM",
    "THETA": "THETA",
    "SAND": "SAND",
    "AXS": "AXS",
    "MANA": "MANA",
    "EOS": "EOS",
    "XTZ": "XTZ",
    "FLOW": "FLOW",
    "NEO": "NEO",
    "SHIB": "SHIB",
    "TON": "TON",
    "BCH": "BCH",
    "DAI": "DAI",
    "APT": "APT",
    "OKB": "OKB_ETH",
    "ARB": "ARB",
    "CRO": "CRO",
    "MKR": "MKR",
    "INJ": "INJ",
    "OP": "OP_ETH",
    "RUNE": "RUNE",
    "EGLD": "EGLD",
    "ICP": "ICP",
}

# Multi-network assets - assets that exist on multiple blockchains
MULTI_NETWORK_ASSETS = {
    "USDT": [
        {"network": "ERC20", "fireblocks_id": "USDT_ERC20", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "TRC20", "fireblocks_id": "TRX_USDT_S2UZ", "name": "Tron (TRC20)", "explorer": "https://tronscan.org/#/transaction/"},
        {"network": "BEP20", "fireblocks_id": "USDT_BSC", "name": "BNB Smart Chain (BEP20)", "explorer": "https://bscscan.com/tx/"},
        {"network": "SOL", "fireblocks_id": "USDT_SOL", "name": "Solana (SPL)", "explorer": "https://solscan.io/tx/"},
        {"network": "ALGO", "fireblocks_id": "USDT_ALGO", "name": "Algorand (ASA)", "explorer": "https://algoexplorer.io/tx/"},
        {"network": "AVAX", "fireblocks_id": "USDT_AVAX", "name": "Avalanche C-Chain", "explorer": "https://snowtrace.io/tx/"},
        {"network": "POLYGON", "fireblocks_id": "USDT_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
        {"network": "ARB", "fireblocks_id": "USDT_ARB", "name": "Arbitrum", "explorer": "https://arbiscan.io/tx/"},
        {"network": "OP", "fireblocks_id": "USDT_OP", "name": "Optimism", "explorer": "https://optimistic.etherscan.io/tx/"},
    ],
    "USDC": [
        {"network": "ERC20", "fireblocks_id": "USDC", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "SOL", "fireblocks_id": "USDC_SOL", "name": "Solana (SPL)", "explorer": "https://solscan.io/tx/"},
        {"network": "ALGO", "fireblocks_id": "USDC_ALGO", "name": "Algorand (ASA)", "explorer": "https://algoexplorer.io/tx/"},
        {"network": "AVAX", "fireblocks_id": "USDC_AVAX", "name": "Avalanche C-Chain", "explorer": "https://snowtrace.io/tx/"},
        {"network": "POLYGON", "fireblocks_id": "USDC_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
        {"network": "ARB", "fireblocks_id": "USDC_ARB", "name": "Arbitrum", "explorer": "https://arbiscan.io/tx/"},
        {"network": "OP", "fireblocks_id": "USDC_OP", "name": "Optimism", "explorer": "https://optimistic.etherscan.io/tx/"},
        {"network": "BASE", "fireblocks_id": "USDC_BASE", "name": "Base", "explorer": "https://basescan.org/tx/"},
    ],
    "DAI": [
        {"network": "ERC20", "fireblocks_id": "DAI", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "POLYGON", "fireblocks_id": "DAI_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
        {"network": "ARB", "fireblocks_id": "DAI_ARB", "name": "Arbitrum", "explorer": "https://arbiscan.io/tx/"},
        {"network": "OP", "fireblocks_id": "DAI_OP", "name": "Optimism", "explorer": "https://optimistic.etherscan.io/tx/"},
    ],
    "WBTC": [
        {"network": "ERC20", "fireblocks_id": "WBTC", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "POLYGON", "fireblocks_id": "WBTC_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
    ],
    "LINK": [
        {"network": "ERC20", "fireblocks_id": "LINK", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "BEP20", "fireblocks_id": "LINK_BSC", "name": "BNB Smart Chain (BEP20)", "explorer": "https://bscscan.com/tx/"},
        {"network": "POLYGON", "fireblocks_id": "LINK_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
    ],
    "UNI": [
        {"network": "ERC20", "fireblocks_id": "UNI", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "POLYGON", "fireblocks_id": "UNI_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
        {"network": "ARB", "fireblocks_id": "UNI_ARB", "name": "Arbitrum", "explorer": "https://arbiscan.io/tx/"},
    ],
    "AAVE": [
        {"network": "ERC20", "fireblocks_id": "AAVE", "name": "Ethereum (ERC20)", "explorer": "https://etherscan.io/tx/"},
        {"network": "POLYGON", "fireblocks_id": "AAVE_POLYGON", "name": "Polygon (MATIC)", "explorer": "https://polygonscan.com/tx/"},
    ],
}

# Blockchain explorer URLs for each asset
BLOCKCHAIN_EXPLORERS = {
    "BTC": "https://blockchain.com/btc/tx/",
    "ETH": "https://etherscan.io/tx/",
    "USDT": "https://etherscan.io/tx/",
    "USDC": "https://etherscan.io/tx/",
    "SOL": "https://solscan.io/tx/",
    "XRP": "https://xrpscan.com/tx/",
    "BNB": "https://bscscan.com/tx/",
    "ADA": "https://cardanoscan.io/transaction/",
    "DOGE": "https://dogechain.info/tx/",
    "TRX": "https://tronscan.org/#/transaction/",
    "AVAX": "https://snowtrace.io/tx/",
    "LINK": "https://etherscan.io/tx/",
    "DOT": "https://polkadot.subscan.io/extrinsic/",
    "MATIC": "https://polygonscan.com/tx/",
    "LTC": "https://blockchair.com/litecoin/transaction/",
    "ATOM": "https://www.mintscan.io/cosmos/txs/",
    "XLM": "https://stellar.expert/explorer/public/tx/",
    "ALGO": "https://algoexplorer.io/tx/",
    "FIL": "https://filfox.info/en/message/",
    "ETC": "https://blockscout.com/etc/mainnet/tx/",
    "NEAR": "https://explorer.near.org/transactions/",
    "HBAR": "https://hashscan.io/mainnet/transaction/",
    "FTM": "https://ftmscan.com/tx/",
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


class WhitelistAddressRequest(BaseModel):
    asset: str = Field(..., description="Asset symbol (BTC, ETH, etc.)")
    address: str = Field(..., min_length=10, description="Withdrawal address")
    label: str = Field(..., min_length=1, max_length=50, description="Label for this address")
    network: Optional[str] = None


class WhitelistUpdateRequest(BaseModel):
    label: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== HELPER FUNCTIONS ====================

def get_fireblocks_asset_id(symbol: str) -> str:
    """Map our symbol to Fireblocks asset ID"""
    return FIREBLOCKS_ASSET_MAP.get(symbol.upper(), symbol.upper())


def get_explorer_url(symbol: str, tx_id: str) -> str:
    """Get blockchain explorer URL for a transaction"""
    base_url = BLOCKCHAIN_EXPLORERS.get(symbol.upper(), "")
    if base_url:
        return f"{base_url}{tx_id}"
    return None


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
    vault_id = vault.get("fireblocks_vault_id")
    
    # Check if asset already exists
    existing_assets = vault.get("assets", [])
    for existing in existing_assets:
        if existing.get("symbol") == asset_symbol.upper():
            return existing
    
    # Create asset in Fireblocks
    try:
        fireblocks_asset_id = get_fireblocks_asset_id(asset_symbol)
        
        # Try to create, but handle "already exists" error
        try:
            _ = await FireblocksService.create_vault_asset(vault_id, fireblocks_asset_id)
        except Exception as create_error:
            error_str = str(create_error)
            # If asset already exists in Fireblocks (code 1026), continue to get the address
            if "1026" in error_str or "already exists" in error_str.lower():
                logger.info(f"Asset {asset_symbol} already exists in vault {vault_id}, getting address")
            else:
                raise create_error
        
        # Get deposit address
        addresses = await FireblocksService.get_deposit_addresses(vault_id, fireblocks_asset_id)
        deposit_address = addresses[0].get("address") if addresses else None
        memo = addresses[0].get("tag") if addresses else None
        
        asset_record = {
            "symbol": asset_symbol.upper(),
            "fireblocks_asset_id": fireblocks_asset_id,
            "deposit_address": deposit_address,
            "memo": memo,
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
        
        logger.info(f"Created/linked asset {asset_symbol} for user {user_id}")
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
    
    vault_id = vault.get("fireblocks_vault_id")
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
        # Balance update - update user's wallet balance
        vault_id = data.get("vaultAccountId")
        asset_id = data.get("assetId")
        total_balance = float(data.get("total", 0))
        available_balance = float(data.get("available", 0))
        pending_balance = float(data.get("pending", 0))
        
        logger.info(f"Balance update for vault {vault_id}, asset {asset_id}: total={total_balance}, available={available_balance}")
        
        # Find user by vault ID
        vault = await db.user_fireblocks_vaults.find_one({"fireblocks_vault_id": str(vault_id)})
        if vault:
            user_id = vault.get("user_id")
            
            # Map Fireblocks asset ID to our asset ID
            clean_asset_id = asset_id.replace("_TEST", "").replace("_ERC20", "").replace("_TEST3", "")
            if clean_asset_id.endswith("_"):
                clean_asset_id = clean_asset_id[:-1]
            
            # Update wallet balance
            result = await db.wallets.update_one(
                {"user_id": user_id, "asset_id": clean_asset_id},
                {
                    "$set": {
                        "balance": total_balance,
                        "available_balance": available_balance,
                        "pending_balance": pending_balance,
                        "last_fireblocks_sync": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Updated wallet balance for user {user_id}, asset {clean_asset_id}")
    
    elif event_type == "TRANSACTION_CREATED":
        # New transaction created (incoming deposit)
        tx_id = data.get("id")
        tx_status = data.get("status")
        tx_type = data.get("operation")  # TRANSFER, DEPOSIT, etc
        destination = data.get("destination", {})
        vault_id = destination.get("id")
        asset_id = data.get("assetId")
        amount = float(data.get("amount", 0))
        
        logger.info(f"New transaction {tx_id}: type={tx_type}, status={tx_status}, asset={asset_id}, amount={amount}")
        
        # Find user for this vault
        if vault_id:
            vault = await db.user_fireblocks_vaults.find_one({"fireblocks_vault_id": str(vault_id)})
            if vault:
                user_id = vault.get("user_id")
                
                # Map asset ID
                clean_asset_id = asset_id.replace("_TEST", "").replace("_ERC20", "").replace("_TEST3", "")
                if clean_asset_id.endswith("_"):
                    clean_asset_id = clean_asset_id[:-1]
                
                # Record the transaction
                tx_record = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "fireblocks_tx_id": tx_id,
                    "type": "deposit" if tx_type in ["TRANSFER", "DEPOSIT"] else tx_type.lower(),
                    "asset": clean_asset_id,
                    "fireblocks_asset_id": asset_id,
                    "amount": amount,
                    "status": tx_status.lower(),
                    "source": data.get("source", {}).get("address"),
                    "destination_address": destination.get("address"),
                    "tx_hash": data.get("txHash"),
                    "fee": float(data.get("networkFee", 0)),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.crypto_transactions.insert_one(tx_record)
                logger.info(f"Recorded deposit transaction for user {user_id}: {amount} {clean_asset_id}")
    
    elif event_type == "TRANSACTION_STATUS_UPDATED":
        # Transaction status changed
        tx_id = data.get("id")
        new_status = data.get("status")
        tx_hash = data.get("txHash")
        
        logger.info(f"Transaction {tx_id} status updated to {new_status}")
        
        # Update transaction record
        update_data = {
            "status": new_status.lower(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if tx_hash:
            update_data["tx_hash"] = tx_hash
        
        await db.crypto_transactions.update_one(
            {"fireblocks_tx_id": tx_id},
            {"$set": update_data}
        )
        
        # Also update withdrawals if this is an outgoing tx
        await db.crypto_withdrawals.update_one(
            {"fireblocks_tx_id": tx_id},
            {"$set": update_data}
        )
    
    return {"success": True}


# ==================== TRANSACTIONS ENDPOINTS ====================

@router.get("/transactions")
async def get_crypto_transactions(
    asset: Optional[str] = None,
    tx_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
):
    """Get user's crypto transaction history"""
    query = {"user_id": user_id}
    
    if asset:
        query["asset"] = asset.upper()
    if tx_type:
        query["type"] = tx_type.lower()
    if status:
        query["status"] = status.lower()
    
    transactions = await db.crypto_transactions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Also get withdrawals
    withdrawal_query = {"user_id": user_id}
    if asset:
        withdrawal_query["asset"] = asset.upper()
    if status:
        withdrawal_query["status"] = status.lower()
    
    withdrawals = await db.crypto_withdrawals.find(
        withdrawal_query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add type to withdrawals
    for w in withdrawals:
        w["type"] = "withdrawal"
    
    # Merge and sort by date
    all_transactions = transactions + withdrawals
    all_transactions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "transactions": all_transactions[:limit],
        "count": len(all_transactions)
    }


@router.get("/transactions/{tx_id}")
async def get_transaction_detail(
    tx_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get details of a specific transaction"""
    # Try to find in transactions
    tx = await db.crypto_transactions.find_one(
        {"id": tx_id, "user_id": user_id},
        {"_id": 0}
    )
    
    if not tx:
        # Try withdrawals
        tx = await db.crypto_withdrawals.find_one(
            {"id": tx_id, "user_id": user_id},
            {"_id": 0}
        )
        if tx:
            tx["type"] = "withdrawal"
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return tx


# ==================== WHITELIST ENDPOINTS ====================

@router.get("/whitelist")
async def get_my_whitelist(user_id: str = Depends(get_current_user_id)):
    """Get user's whitelisted withdrawal addresses"""
    whitelist = await db.crypto_whitelist.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"whitelist": whitelist, "count": len(whitelist)}


@router.post("/whitelist")
async def add_whitelist_address(
    request: WhitelistAddressRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Add an address to the whitelist"""
    # Check if address already exists for this asset
    existing = await db.crypto_whitelist.find_one({
        "user_id": user_id,
        "asset": request.asset.upper(),
        "address": request.address
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Address already in whitelist for this asset")
    
    whitelist_record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "asset": request.asset.upper(),
        "fireblocks_asset_id": get_fireblocks_asset_id(request.asset),
        "address": request.address,
        "label": request.label,
        "network": request.network,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.crypto_whitelist.insert_one(whitelist_record)
    logger.info(f"Whitelist address added for user {user_id}: {request.asset} - {request.address[:10]}...")
    
    return {
        "success": True,
        "message": "Address added to whitelist",
        "whitelist_id": whitelist_record["id"]
    }


@router.put("/whitelist/{whitelist_id}")
async def update_whitelist_address(
    whitelist_id: str,
    request: WhitelistUpdateRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Update a whitelisted address"""
    whitelist = await db.crypto_whitelist.find_one({
        "id": whitelist_id,
        "user_id": user_id
    })
    
    if not whitelist:
        raise HTTPException(status_code=404, detail="Whitelist entry not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.label is not None:
        update_data["label"] = request.label
    if request.is_active is not None:
        update_data["is_active"] = request.is_active
    
    await db.crypto_whitelist.update_one(
        {"id": whitelist_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Whitelist entry updated"}


@router.delete("/whitelist/{whitelist_id}")
async def delete_whitelist_address(
    whitelist_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Remove an address from the whitelist"""
    result = await db.crypto_whitelist.delete_one({
        "id": whitelist_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Whitelist entry not found")
    
    return {"success": True, "message": "Address removed from whitelist"}


@router.get("/whitelist/{asset}")
async def get_whitelist_for_asset(
    asset: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get whitelisted addresses for a specific asset"""
    whitelist = await db.crypto_whitelist.find(
        {"user_id": user_id, "asset": asset.upper(), "is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    return {"asset": asset.upper(), "addresses": whitelist}


# ==================== QR CODE ENDPOINT ====================

@router.get("/qrcode/{asset}")
async def get_deposit_qrcode(
    asset: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get QR code data for deposit address"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        raise HTTPException(status_code=404, detail="Crypto wallet not initialized")
    
    # Get asset info
    assets = vault.get("assets", [])
    asset_info = next((a for a in assets if a.get("symbol") == asset.upper()), None)
    
    if not asset_info or not asset_info.get("deposit_address"):
        # Try to create the asset
        asset_record = await ensure_asset_in_vault(user_id, asset.upper())
        if not asset_record:
            raise HTTPException(status_code=404, detail=f"No address found for {asset}")
        asset_info = asset_record
    
    address = asset_info.get("deposit_address")
    
    # Generate QR code URI based on asset type
    qr_uri = address
    if asset.upper() == "BTC":
        qr_uri = f"bitcoin:{address}"
    elif asset.upper() == "ETH":
        qr_uri = f"ethereum:{address}"
    elif asset.upper() == "LTC":
        qr_uri = f"litecoin:{address}"
    elif asset.upper() == "DOGE":
        qr_uri = f"dogecoin:{address}"
    elif asset.upper() == "XRP":
        qr_uri = f"ripple:{address}"
    
    return {
        "asset": asset.upper(),
        "address": address,
        "qr_data": qr_uri,
        "network": asset_info.get("fireblocks_asset_id")
    }



# ==================== FIREBLOCKS TRANSACTION MONITORING ====================

@router.get("/fireblocks/transactions")
async def get_fireblocks_transactions(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
):
    """Get transactions from Fireblocks for user's vault"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        return {"transactions": [], "message": "No crypto wallet found"}
    
    vault_id = vault.get("fireblocks_vault_id")
    
    try:
        # Get transactions from Fireblocks
        transactions = await FireblocksService.get_transactions(vault_id, limit)
        
        # Enrich with explorer URLs
        enriched_transactions = []
        for tx in transactions:
            asset_id = tx.get("assetId", "").replace("_TEST", "")
            symbol = asset_id.split("_")[0] if "_" in asset_id else asset_id
            
            tx_hash = tx.get("txHash")
            enriched_tx = {
                "id": tx.get("id"),
                "fireblocks_tx_id": tx.get("id"),
                "tx_hash": tx_hash,
                "asset": symbol,
                "fireblocks_asset_id": tx.get("assetId"),
                "amount": float(tx.get("amount", 0)),
                "amount_usd": float(tx.get("amountUSD", 0)),
                "network_fee": float(tx.get("networkFee", 0)),
                "fee_currency": tx.get("feeCurrency"),
                "status": tx.get("status"),
                "sub_status": tx.get("subStatus"),
                "operation": tx.get("operation"),  # TRANSFER, CONTRACT_CALL, etc.
                "source": tx.get("source", {}),
                "destination": tx.get("destination", {}),
                "destination_address": tx.get("destinationAddress"),
                "created_at": tx.get("createdAt"),
                "last_updated": tx.get("lastUpdated"),
                "num_confirmations": tx.get("numOfConfirmations", 0),
                "required_confirmations": tx.get("blockInfo", {}).get("blockHeight"),
                "signed_by": tx.get("signedBy", []),
                "created_by": tx.get("createdBy"),
                "note": tx.get("note"),
                "explorer_url": get_explorer_url(symbol, tx_hash) if tx_hash else None
            }
            enriched_transactions.append(enriched_tx)
        
        return {"transactions": enriched_transactions, "vault_id": vault_id}
    
    except Exception as e:
        logger.error(f"Error getting Fireblocks transactions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get transactions: {str(e)}")


@router.get("/fireblocks/transaction/{tx_id}")
async def get_fireblocks_transaction_details(
    tx_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get detailed transaction information from Fireblocks"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        raise HTTPException(status_code=404, detail="No crypto wallet found")
    
    try:
        # Get transaction details from Fireblocks
        tx = await FireblocksService.get_transaction_by_id(tx_id)
        
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        asset_id = tx.get("assetId", "").replace("_TEST", "")
        symbol = asset_id.split("_")[0] if "_" in asset_id else asset_id
        tx_hash = tx.get("txHash")
        
        # Build detailed response
        details = {
            "id": tx.get("id"),
            "fireblocks_tx_id": tx.get("id"),
            "tx_hash": tx_hash,
            "asset": symbol,
            "asset_name": get_asset_name(symbol),
            "fireblocks_asset_id": tx.get("assetId"),
            "amount": float(tx.get("amount", 0)),
            "amount_usd": float(tx.get("amountUSD", 0)),
            "network_fee": float(tx.get("networkFee", 0)),
            "network_fee_usd": float(tx.get("networkFeeUSD", 0)) if tx.get("networkFeeUSD") else None,
            "fee_currency": tx.get("feeCurrency"),
            "status": tx.get("status"),
            "sub_status": tx.get("subStatus"),
            "operation": tx.get("operation"),
            "source": {
                "type": tx.get("source", {}).get("type"),
                "id": tx.get("source", {}).get("id"),
                "name": tx.get("source", {}).get("name")
            },
            "destination": {
                "type": tx.get("destination", {}).get("type"),
                "id": tx.get("destination", {}).get("id"),
                "name": tx.get("destination", {}).get("name")
            },
            "destination_address": tx.get("destinationAddress"),
            "destination_tag": tx.get("destinationTag"),
            "created_at": tx.get("createdAt"),
            "last_updated": tx.get("lastUpdated"),
            "num_confirmations": tx.get("numOfConfirmations", 0),
            "block_info": tx.get("blockInfo"),
            "signed_by": tx.get("signedBy", []),
            "created_by": tx.get("createdBy"),
            "rejected_by": tx.get("rejectedBy"),
            "note": tx.get("note"),
            "explorer_url": get_explorer_url(symbol, tx_hash) if tx_hash else None
        }
        
        return details
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transaction details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get transaction: {str(e)}")


@router.get("/deposits")
async def get_my_deposits(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
):
    """Get deposit history from Fireblocks"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        return {"deposits": [], "message": "No crypto wallet found"}
    
    vault_id = vault.get("fireblocks_vault_id")
    
    try:
        # Get incoming transactions
        transactions = await FireblocksService.get_transactions(vault_id, limit)
        
        # Filter for deposits (incoming to this vault)
        deposits = []
        for tx in transactions:
            dest = tx.get("destination", {})
            if dest.get("id") == vault_id and dest.get("type") == "VAULT_ACCOUNT":
                asset_id = tx.get("assetId", "").replace("_TEST", "")
                symbol = asset_id.split("_")[0] if "_" in asset_id else asset_id
                tx_hash = tx.get("txHash")
                
                deposits.append({
                    "id": tx.get("id"),
                    "tx_hash": tx_hash,
                    "asset": symbol,
                    "amount": float(tx.get("amount", 0)),
                    "amount_usd": float(tx.get("amountUSD", 0)),
                    "status": tx.get("status"),
                    "source_address": tx.get("sourceAddress"),
                    "created_at": tx.get("createdAt"),
                    "num_confirmations": tx.get("numOfConfirmations", 0),
                    "explorer_url": get_explorer_url(symbol, tx_hash) if tx_hash else None
                })
        
        return {"deposits": deposits, "count": len(deposits)}
    
    except Exception as e:
        logger.error(f"Error getting deposits: {e}")
        return {"deposits": [], "error": str(e)}


# Helper function for asset names
def get_asset_name(symbol: str) -> str:
    """Get full asset name from symbol"""
    names = {
        "BTC": "Bitcoin",
        "ETH": "Ethereum",
        "USDT": "Tether",
        "USDC": "USD Coin",
        "SOL": "Solana",
        "XRP": "Ripple",
        "BNB": "BNB",
        "ADA": "Cardano",
        "DOGE": "Dogecoin",
        "DOT": "Polkadot",
        "LTC": "Litecoin",
        "AVAX": "Avalanche",
        "MATIC": "Polygon",
        "LINK": "Chainlink"
    }
    return names.get(symbol.upper(), symbol.upper())



# ==================== NETWORK ENDPOINTS ====================

@router.get("/networks/{asset}")
async def get_asset_networks(asset: str):
    """Get available networks for a multi-network asset"""
    asset_upper = asset.upper()
    
    if asset_upper in MULTI_NETWORK_ASSETS:
        return {
            "asset": asset_upper,
            "is_multi_network": True,
            "networks": MULTI_NETWORK_ASSETS[asset_upper]
        }
    
    # Single network asset
    fireblocks_id = FIREBLOCKS_ASSET_MAP.get(asset_upper, asset_upper)
    explorer = BLOCKCHAIN_EXPLORERS.get(asset_upper, "")
    
    return {
        "asset": asset_upper,
        "is_multi_network": False,
        "networks": [
            {
                "network": "native",
                "fireblocks_id": fireblocks_id,
                "name": get_asset_name(asset_upper),
                "explorer": explorer
            }
        ]
    }


@router.get("/networks")
async def get_all_multi_network_assets():
    """Get list of all assets that support multiple networks"""
    result = {}
    for asset, networks in MULTI_NETWORK_ASSETS.items():
        result[asset] = {
            "name": get_asset_name(asset),
            "network_count": len(networks),
            "networks": [n["name"] for n in networks]
        }
    return {"multi_network_assets": result}


@router.get("/deposit-address/{asset}/{network}")
async def get_deposit_address_by_network(
    asset: str,
    network: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get deposit address for a specific asset on a specific network"""
    vault = await db.user_fireblocks_vaults.find_one({"user_id": user_id})
    
    if not vault:
        raise HTTPException(status_code=404, detail="Crypto wallet not initialized")
    
    asset_upper = asset.upper()
    network_upper = network.upper()
    
    # Find the fireblocks asset ID for this network
    fireblocks_asset_id = None
    network_info = None
    
    if asset_upper in MULTI_NETWORK_ASSETS:
        for net in MULTI_NETWORK_ASSETS[asset_upper]:
            if net["network"].upper() == network_upper:
                fireblocks_asset_id = net["fireblocks_id"]
                network_info = net
                break
    
    if not fireblocks_asset_id:
        # Fallback to default mapping
        fireblocks_asset_id = FIREBLOCKS_ASSET_MAP.get(asset_upper, asset_upper)
        network_info = {"network": "native", "name": get_asset_name(asset_upper)}
    
    vault_id = vault.get("fireblocks_vault_id")
    
    # Check if we already have this address
    assets = vault.get("assets", [])
    for existing_asset in assets:
        if existing_asset.get("fireblocks_asset_id") == fireblocks_asset_id:
            return {
                "asset": asset_upper,
                "network": network_info.get("network"),
                "network_name": network_info.get("name"),
                "fireblocks_asset_id": fireblocks_asset_id,
                "address": existing_asset.get("deposit_address"),
                "memo": existing_asset.get("memo")
            }
    
    # Create new asset wallet in Fireblocks
    try:
        # Try to create, but handle "already exists" error
        try:
            await FireblocksService.create_vault_asset(vault_id, fireblocks_asset_id)
        except Exception as create_error:
            error_str = str(create_error)
            # If asset already exists in Fireblocks (code 1026), continue to get the address
            if "1026" in error_str or "already exists" in error_str.lower():
                logger.info(f"Asset {fireblocks_asset_id} already exists in vault {vault_id}, getting address")
            else:
                raise create_error
        
        # Get deposit address
        addresses = await FireblocksService.get_deposit_addresses(vault_id, fireblocks_asset_id)
        address = addresses[0].get("address") if addresses else None
        memo = addresses[0].get("tag") if addresses else None
        
        # Save to database
        new_asset_record = {
            "symbol": f"{asset_upper}_{network_upper}",
            "fireblocks_asset_id": fireblocks_asset_id,
            "deposit_address": address,
            "memo": memo,
            "network": network_info.get("network"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.user_fireblocks_vaults.update_one(
            {"user_id": user_id},
            {"$push": {"assets": new_asset_record}}
        )
        
        return {
            "asset": asset_upper,
            "network": network_info.get("network"),
            "network_name": network_info.get("name"),
            "fireblocks_asset_id": fireblocks_asset_id,
            "address": address,
            "memo": memo
        }
    
    except Exception as e:
        logger.error(f"Failed to create {asset_upper} wallet on {network_upper}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create wallet: {str(e)}")
