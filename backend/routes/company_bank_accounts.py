from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from utils.auth import get_current_user_id

router = APIRouter(prefix="/company-bank-accounts", tags=["company-bank-accounts"])

# We'll set the db reference from server.py
db = None

def set_db(database):
    global db
    db = database

class CompanyBankAccountCreate(BaseModel):
    bank_name: str
    account_holder: str = "KBEX Financial Services"
    iban: Optional[str] = None
    swift_bic: Optional[str] = None
    account_number: Optional[str] = None
    sort_code: Optional[str] = None
    routing_number: Optional[str] = None
    pix_key: Optional[str] = None
    country: str
    currency: str
    is_active: bool = True

class CompanyBankAccountUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    iban: Optional[str] = None
    swift_bic: Optional[str] = None
    account_number: Optional[str] = None
    sort_code: Optional[str] = None
    routing_number: Optional[str] = None
    pix_key: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None

# Public endpoint - get active company bank accounts for payments
@router.get("/public")
async def get_public_company_accounts(currency: Optional[str] = None):
    """Get active company bank accounts for client payments"""
    query = {"is_active": True}
    if currency:
        query["currency"] = currency
    
    accounts = await db.company_bank_accounts.find(
        query,
        {"_id": 0}
    ).to_list(100)
    
    return accounts

# Admin endpoints
@router.get("/admin/all")
async def admin_get_all_company_accounts(user_id: str = Depends(get_current_user_id)):
    """Get all company bank accounts (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    accounts = await db.company_bank_accounts.find({}, {"_id": 0}).to_list(100)
    return accounts

@router.post("/admin")
async def admin_create_company_account(
    data: CompanyBankAccountCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new company bank account (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    account = {
        "id": str(uuid.uuid4()),
        "bank_name": data.bank_name,
        "account_holder": data.account_holder,
        "iban": data.iban.replace(" ", "").upper() if data.iban else None,
        "swift_bic": data.swift_bic.upper() if data.swift_bic else None,
        "account_number": data.account_number,
        "sort_code": data.sort_code,
        "routing_number": data.routing_number,
        "pix_key": data.pix_key,
        "country": data.country,
        "currency": data.currency,
        "is_active": data.is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.company_bank_accounts.insert_one(account)
    del account["_id"]
    return account

@router.put("/admin/{account_id}")
async def admin_update_company_account(
    account_id: str,
    data: CompanyBankAccountUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update a company bank account (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.bank_name is not None:
        update_data["bank_name"] = data.bank_name
    if data.account_holder is not None:
        update_data["account_holder"] = data.account_holder
    if data.iban is not None:
        update_data["iban"] = data.iban.replace(" ", "").upper() if data.iban else None
    if data.swift_bic is not None:
        update_data["swift_bic"] = data.swift_bic.upper() if data.swift_bic else None
    if data.account_number is not None:
        update_data["account_number"] = data.account_number
    if data.sort_code is not None:
        update_data["sort_code"] = data.sort_code
    if data.routing_number is not None:
        update_data["routing_number"] = data.routing_number
    if data.pix_key is not None:
        update_data["pix_key"] = data.pix_key
    if data.country is not None:
        update_data["country"] = data.country
    if data.currency is not None:
        update_data["currency"] = data.currency
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    result = await db.company_bank_accounts.update_one(
        {"id": account_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    return {"message": "Conta atualizada com sucesso"}

@router.delete("/admin/{account_id}")
async def admin_delete_company_account(
    account_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a company bank account (admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso não autorizado")
    
    result = await db.company_bank_accounts.delete_one({"id": account_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conta não encontrada")
    
    return {"message": "Conta eliminada com sucesso"}
