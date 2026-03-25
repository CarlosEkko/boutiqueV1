from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from utils.auth import get_current_user_id

router = APIRouter(prefix="/bank-accounts", tags=["bank-accounts"])

# We'll set the db reference from server.py
db = None

def set_db(database):
    global db
    db = database

class BankAccountCreate(BaseModel):
    account_holder: str
    bank_name: str
    iban: Optional[str] = None
    swift_bic: Optional[str] = None
    account_number: Optional[str] = None
    sort_code: Optional[str] = None
    routing_number: Optional[str] = None
    country: str
    currency: str = "EUR"
    is_primary: bool = False

class BankAccountUpdate(BaseModel):
    status: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_primary: Optional[bool] = None

@router.get("")
async def get_bank_accounts(user_id: str = Depends(get_current_user_id)):
    """Get all bank accounts for the current user"""
    accounts = await db.bank_accounts.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    return accounts

@router.post("")
async def create_bank_account(data: BankAccountCreate, user_id: str = Depends(get_current_user_id)):
    """Create a new bank account"""
    # Check for duplicate IBAN
    if data.iban:
        existing = await db.bank_accounts.find_one({
            "user_id": user_id,
            "iban": data.iban
        })
        if existing:
            raise HTTPException(status_code=400, detail="Esta conta já está registada")
    
    # If this is the first account or is_primary is True, set it as primary
    existing_accounts = await db.bank_accounts.count_documents({"user_id": user_id})
    is_primary = data.is_primary or existing_accounts == 0
    
    # If setting as primary, unset other primary accounts
    if is_primary:
        await db.bank_accounts.update_many(
            {"user_id": user_id},
            {"$set": {"is_primary": False}}
        )
    
    account = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "account_holder": data.account_holder,
        "bank_name": data.bank_name,
        "iban": data.iban.replace(" ", "").upper() if data.iban else None,
        "swift_bic": data.swift_bic.upper() if data.swift_bic else None,
        "account_number": data.account_number,
        "sort_code": data.sort_code,
        "routing_number": data.routing_number,
        "country": data.country,
        "currency": data.currency,
        "is_primary": is_primary,
        "status": "pending",
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bank_accounts.insert_one(account)
    del account["_id"]
    return account

@router.delete("/{account_id}")
async def delete_bank_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a bank account"""
    result = await db.bank_accounts.delete_one({
        "id": account_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    return {"message": "Conta removida com sucesso"}

@router.put("/{account_id}/set-primary")
async def set_primary_account(account_id: str, user_id: str = Depends(get_current_user_id)):
    """Set a bank account as primary"""
    # Check account exists and belongs to user
    account = await db.bank_accounts.find_one({
        "id": account_id,
        "user_id": user_id
    })
    
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    # Unset all other primary accounts
    await db.bank_accounts.update_many(
        {"user_id": user_id},
        {"$set": {"is_primary": False}}
    )
    
    # Set this one as primary
    await db.bank_accounts.update_one(
        {"id": account_id},
        {"$set": {"is_primary": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Conta definida como principal"}

# Admin endpoints for managing bank accounts
@router.get("/admin/all")
async def admin_get_all_bank_accounts(user_id: str = Depends(get_current_user_id)):
    """Get all bank accounts (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    accounts = await db.bank_accounts.find({}, {"_id": 0}).to_list(1000)
    
    # Add user info to each account
    for account in accounts:
        owner = await db.users.find_one(
            {"id": account["user_id"]},
            {"_id": 0, "name": 1, "email": 1}
        )
        account["user_name"] = owner.get("name") if owner else "Unknown"
        account["user_email"] = owner.get("email") if owner else "Unknown"
    
    return accounts

@router.put("/admin/{account_id}")
async def admin_update_bank_account(
    account_id: str, 
    data: BankAccountUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update a bank account status (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.status:
        update_data["status"] = data.status
    if data.rejection_reason:
        update_data["rejection_reason"] = data.rejection_reason
    if data.is_primary is not None:
        update_data["is_primary"] = data.is_primary
    
    result = await db.bank_accounts.update_one(
        {"id": account_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    return {"message": "Conta atualizada com sucesso"}
