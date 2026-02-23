from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone
from typing import List, Optional
from models.user import UserResponseAdmin, KYCStatus, MembershipLevel, InviteCode
from utils.auth import get_current_user_id
import uuid
import secrets

router = APIRouter(prefix="/admin", tags=["Admin"])

# Database reference
db = None


def set_db(database):
    global db
    db = database


# ==================== ADMIN CHECK ====================

async def get_admin_user(user_id: str = Depends(get_current_user_id)):
    """Check if user is admin"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has is_admin flag set to True
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


# ==================== USER MANAGEMENT ====================

@router.get("/users", response_model=List[dict])
async def list_users(
    is_approved: Optional[bool] = None,
    kyc_status: Optional[KYCStatus] = None,
    admin: dict = Depends(get_admin_user)
):
    """List all users with optional filters"""
    query = {}
    if is_approved is not None:
        query["is_approved"] = is_approved
    if kyc_status:
        query["kyc_status"] = kyc_status
    
    users = await db.users.find(
        query,
        {"_id": 0, "hashed_password": 0}
    ).to_list(1000)
    
    # Parse dates
    for user in users:
        if isinstance(user.get("created_at"), str):
            user["created_at"] = datetime.fromisoformat(user["created_at"])
        if isinstance(user.get("updated_at"), str):
            user["updated_at"] = datetime.fromisoformat(user["updated_at"])
    
    return users


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get detailed user information"""
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "hashed_password": 0}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's wallets, investments, transactions
    wallets = await db.wallets.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    investments = await db.user_investments.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    return {
        **user,
        "wallets": wallets,
        "investments": investments,
        "transactions": transactions
    }


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Approve a user for dashboard access"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_approved": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create default wallets for approved user
    default_assets = [
        {"asset_id": "BTC", "asset_name": "Bitcoin"},
        {"asset_id": "ETH", "asset_name": "Ethereum"},
        {"asset_id": "USDT", "asset_name": "Tether"},
        {"asset_id": "USDC", "asset_name": "USD Coin"}
    ]
    
    for asset in default_assets:
        existing = await db.wallets.find_one({
            "user_id": user_id,
            "asset_id": asset["asset_id"]
        })
        if not existing:
            wallet = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "asset_id": asset["asset_id"],
                "asset_name": asset["asset_name"],
                "address": f"mock_{asset['asset_id'].lower()}_{user_id[:8]}",  # Mock address
                "balance": 0,
                "available_balance": 0,
                "pending_balance": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.wallets.insert_one(wallet)
    
    return {"success": True, "message": f"User {user['email']} approved"}


@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    reason: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Reject/revoke user approval"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_approved": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"User {user['email']} access revoked"}


@router.post("/users/{user_id}/kyc/{status}")
async def update_kyc_status(
    user_id: str,
    status: KYCStatus,
    admin: dict = Depends(get_admin_user)
):
    """Update user KYC status"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "kyc_status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"KYC status updated to {status}"}


@router.post("/users/{user_id}/membership/{level}")
async def update_membership_level(
    user_id: str,
    level: MembershipLevel,
    admin: dict = Depends(get_admin_user)
):
    """Update user membership level"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "membership_level": level,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"Membership level updated to {level}"}


# ==================== INVITE CODES ====================

@router.get("/invites", response_model=List[dict])
async def list_invite_codes(admin: dict = Depends(get_admin_user)):
    """List all invite codes"""
    codes = await db.invite_codes.find({}, {"_id": 0}).to_list(1000)
    return codes


@router.post("/invites")
async def create_invite_code(
    max_uses: int = 1,
    admin: dict = Depends(get_admin_user)
):
    """Create a new invite code"""
    code = secrets.token_urlsafe(8).upper()[:10]
    
    invite = {
        "id": str(uuid.uuid4()),
        "code": code,
        "created_by": admin["id"],
        "max_uses": max_uses,
        "uses": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invite_codes.insert_one(invite)
    
    return {"success": True, "code": code, "max_uses": max_uses}


@router.delete("/invites/{code}")
async def deactivate_invite_code(
    code: str,
    admin: dict = Depends(get_admin_user)
):
    """Deactivate an invite code"""
    result = await db.invite_codes.update_one(
        {"code": code},
        {"$set": {"is_active": False}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invite code not found")
    
    return {"success": True, "message": f"Invite code {code} deactivated"}


# ==================== INVESTMENT OPPORTUNITIES ====================

@router.post("/opportunities")
async def create_investment_opportunity(
    name: str,
    description: str,
    expected_roi: float,
    duration_days: int,
    min_investment: float,
    max_investment: float,
    total_pool: float,
    risk_level: str = "medium",
    currency: str = "USDT",
    admin: dict = Depends(get_admin_user)
):
    """Create a new investment opportunity"""
    opportunity = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "type": "lending",
        "expected_roi": expected_roi,
        "duration_days": duration_days,
        "min_investment": min_investment,
        "max_investment": max_investment,
        "risk_level": risk_level,
        "status": "open",
        "total_pool": total_pool,
        "current_pool": 0,
        "currency": currency,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.investment_opportunities.insert_one(opportunity)
    
    return {"success": True, "opportunity_id": opportunity["id"]}


@router.put("/opportunities/{opportunity_id}/status/{status}")
async def update_opportunity_status(
    opportunity_id: str,
    status: str,
    admin: dict = Depends(get_admin_user)
):
    """Update investment opportunity status"""
    result = await db.investment_opportunities.update_one(
        {"id": opportunity_id},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    return {"success": True, "message": f"Status updated to {status}"}


# ==================== TRANSPARENCY ====================

@router.post("/transparency/reports")
async def create_transparency_report(
    title: str,
    type: str,
    summary: str,
    auditor: Optional[str] = None,
    file_url: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Create a transparency/audit report"""
    report = {
        "id": str(uuid.uuid4()),
        "title": title,
        "type": type,
        "summary": summary,
        "auditor": auditor,
        "file_url": file_url,
        "report_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transparency_reports.insert_one(report)
    
    return {"success": True, "report_id": report["id"]}


@router.post("/transparency/wallets")
async def add_public_wallet(
    asset_id: str,
    asset_name: str,
    address: str,
    balance: float,
    label: str,
    admin: dict = Depends(get_admin_user)
):
    """Add a public wallet for proof of reserves"""
    wallet = {
        "id": str(uuid.uuid4()),
        "asset_id": asset_id,
        "asset_name": asset_name,
        "address": address,
        "balance": balance,
        "label": label,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    await db.public_wallets.insert_one(wallet)
    
    return {"success": True, "wallet_id": wallet["id"]}


@router.put("/transparency/wallets/{wallet_id}")
async def update_public_wallet_balance(
    wallet_id: str,
    balance: float,
    admin: dict = Depends(get_admin_user)
):
    """Update public wallet balance"""
    result = await db.public_wallets.update_one(
        {"id": wallet_id},
        {
            "$set": {
                "balance": balance,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return {"success": True, "message": "Balance updated"}
