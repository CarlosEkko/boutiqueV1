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


@router.post("/users/{user_id}/make-admin")
async def make_user_admin(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Make a user an admin"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_admin": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"User {user['email']} is now an admin"}


@router.post("/users/{user_id}/remove-admin")
async def remove_user_admin(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Remove admin rights from a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent removing own admin rights
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin rights")
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "is_admin": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"success": True, "message": f"Admin rights removed from {user['email']}"}


@router.get("/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    # Count users
    total_users = await db.users.count_documents({})
    approved_users = await db.users.count_documents({"is_approved": True})
    pending_users = await db.users.count_documents({"is_approved": False})
    admin_users = await db.users.count_documents({"is_admin": True})
    
    # KYC stats
    kyc_approved = await db.users.count_documents({"kyc_status": "approved"})
    kyc_pending = await db.users.count_documents({"kyc_status": "pending"})
    
    # Investment stats
    total_opportunities = await db.investment_opportunities.count_documents({})
    open_opportunities = await db.investment_opportunities.count_documents({"status": "open"})
    total_investments = await db.user_investments.count_documents({})
    
    # Calculate total invested amount
    investments = await db.user_investments.find({}, {"amount": 1, "_id": 0}).to_list(10000)
    total_invested_amount = sum(inv.get("amount", 0) for inv in investments)
    
    # Wallet stats
    total_wallets = await db.wallets.count_documents({})
    
    # Transaction stats
    total_transactions = await db.transactions.count_documents({})
    
    # Invite code stats
    total_invite_codes = await db.invite_codes.count_documents({})
    active_invite_codes = await db.invite_codes.count_documents({"is_active": True})
    
    return {
        "users": {
            "total": total_users,
            "approved": approved_users,
            "pending": pending_users,
            "admins": admin_users
        },
        "kyc": {
            "approved": kyc_approved,
            "pending": kyc_pending
        },
        "investments": {
            "total_opportunities": total_opportunities,
            "open_opportunities": open_opportunities,
            "total_investments": total_investments,
            "total_invested_amount": total_invested_amount
        },
        "wallets": {
            "total": total_wallets
        },
        "transactions": {
            "total": total_transactions
        },
        "invite_codes": {
            "total": total_invite_codes,
            "active": active_invite_codes
        }
    }


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



# ==================== KYC/KYB ADMIN ====================

@router.get("/kyc/pending")
async def list_pending_kyc(admin: dict = Depends(get_admin_user)):
    """List all pending KYC verifications"""
    kyc_list = await db.kyc_verifications.find(
        {"status": "pending_review"},
        {"_id": 0}
    ).to_list(1000)
    
    # Enrich with user info and documents
    enriched = []
    for kyc in kyc_list:
        user = await db.users.find_one({"id": kyc.get("user_id")}, {"_id": 0, "hashed_password": 0})
        docs = await db.kyc_documents.find({"user_id": kyc.get("user_id")}, {"_id": 0}).to_list(100)
        enriched.append({
            **kyc,
            "user": user,
            "documents": docs
        })
    
    return enriched


@router.get("/kyb/pending")
async def list_pending_kyb(admin: dict = Depends(get_admin_user)):
    """List all pending KYB verifications"""
    kyb_list = await db.kyb_verifications.find(
        {"status": "pending_review"},
        {"_id": 0}
    ).to_list(1000)
    
    # Enrich with user info and documents
    enriched = []
    for kyb in kyb_list:
        user = await db.users.find_one({"id": kyb.get("user_id")}, {"_id": 0, "hashed_password": 0})
        docs = await db.kyc_documents.find({"user_id": kyb.get("user_id")}, {"_id": 0}).to_list(100)
        enriched.append({
            **kyb,
            "user": user,
            "documents": docs
        })
    
    return enriched


@router.get("/kyc/{user_id}")
async def get_user_kyc(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get KYC details for a specific user"""
    kyc = await db.kyc_verifications.find_one({"user_id": user_id}, {"_id": 0})
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    docs = await db.kyc_documents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    return {
        **kyc,
        "user": user,
        "documents": docs
    }


@router.get("/kyb/{user_id}")
async def get_user_kyb(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get KYB details for a specific user"""
    kyb = await db.kyb_verifications.find_one({"user_id": user_id}, {"_id": 0})
    if not kyb:
        raise HTTPException(status_code=404, detail="KYB not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    docs = await db.kyc_documents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    return {
        **kyb,
        "user": user,
        "documents": docs
    }


@router.post("/kyc/{user_id}/approve")
async def approve_kyc(user_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a KYC verification"""
    kyc = await db.kyc_verifications.find_one({"user_id": user_id})
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update KYC status
    await db.kyc_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": admin["id"],
                "reviewed_at": now,
                "completed_at": now,
                "updated_at": now
            }
        }
    )
    
    # Update user's KYC status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"kyc_status": "approved", "updated_at": now}}
    )
    
    # Update all documents to approved
    await db.kyc_documents.update_many(
        {"user_id": user_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": admin["id"],
                "reviewed_at": now
            }
        }
    )
    
    return {"success": True, "message": "KYC approved"}


@router.post("/kyc/{user_id}/reject")
async def reject_kyc(
    user_id: str,
    reason: str = "Documents do not meet requirements",
    admin: dict = Depends(get_admin_user)
):
    """Reject a KYC verification"""
    kyc = await db.kyc_verifications.find_one({"user_id": user_id})
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update KYC status
    await db.kyc_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "reviewed_by": admin["id"],
                "reviewed_at": now,
                "updated_at": now
            }
        }
    )
    
    # Update user's KYC status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"kyc_status": "rejected", "updated_at": now}}
    )
    
    return {"success": True, "message": "KYC rejected"}


@router.post("/kyb/{user_id}/approve")
async def approve_kyb(user_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a KYB verification"""
    kyb = await db.kyb_verifications.find_one({"user_id": user_id})
    if not kyb:
        raise HTTPException(status_code=404, detail="KYB not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update KYB status
    await db.kyb_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": admin["id"],
                "reviewed_at": now,
                "completed_at": now,
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "KYB approved"}


@router.post("/kyb/{user_id}/reject")
async def reject_kyb(
    user_id: str,
    reason: str = "Documents do not meet requirements",
    admin: dict = Depends(get_admin_user)
):
    """Reject a KYB verification"""
    kyb = await db.kyb_verifications.find_one({"user_id": user_id})
    if not kyb:
        raise HTTPException(status_code=404, detail="KYB not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update KYB status
    await db.kyb_verifications.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "reviewed_by": admin["id"],
                "reviewed_at": now,
                "updated_at": now
            }
        }
    )
    
    return {"success": True, "message": "KYB rejected"}


@router.post("/document/{doc_id}/approve")
async def approve_document(doc_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a specific document"""
    result = await db.kyc_documents.update_one(
        {"id": doc_id},
        {
            "$set": {
                "status": "approved",
                "reviewed_by": admin["id"],
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "Document approved"}


@router.post("/document/{doc_id}/reject")
async def reject_document(
    doc_id: str,
    reason: str = "Document not readable or invalid",
    admin: dict = Depends(get_admin_user)
):
    """Reject a specific document"""
    result = await db.kyc_documents.update_one(
        {"id": doc_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "reviewed_by": admin["id"],
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "Document rejected"}
