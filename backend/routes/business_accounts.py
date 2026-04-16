from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from utils.auth import get_current_user_id
from bson import ObjectId

router = APIRouter(prefix="/business-accounts", tags=["Business Accounts"])

db = None

def set_db(database):
    global db
    db = database


class BusinessAccountCreate(BaseModel):
    company_name: str
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    company_type: Optional[str] = "llc"
    incorporation_country: Optional[str] = None


class BusinessAccountUpdate(BaseModel):
    company_name: Optional[str] = None
    registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    company_type: Optional[str] = None
    incorporation_country: Optional[str] = None


class SwitchEntityRequest(BaseModel):
    entity_type: str  # "personal" or "business"
    business_account_id: Optional[str] = None


@router.get("")
async def get_business_accounts(user_id: str = Depends(get_current_user_id)):
    accounts = await db.business_accounts.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(20)
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "active_entity": 1})
    active_entity = user.get("active_entity", {"type": "personal"}) if user else {"type": "personal"}
    
    return {
        "accounts": accounts,
        "active_entity": active_entity
    }


@router.post("")
async def create_business_account(data: BusinessAccountCreate, user_id: str = Depends(get_current_user_id)):
    existing = await db.business_accounts.find_one({
        "user_id": user_id, "company_name": data.company_name
    })
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este nome de empresa")

    account_id = str(ObjectId())
    account = {
        "id": account_id,
        "user_id": user_id,
        "company_name": data.company_name,
        "registration_number": data.registration_number,
        "tax_id": data.tax_id,
        "company_type": data.company_type,
        "incorporation_country": data.incorporation_country,
        "kyb_status": "not_started",
        "status": "pending_kyb",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.business_accounts.insert_one(account)

    # Create fiat wallets for business account
    fiat_currencies = ['EUR', 'USD', 'AED', 'CHF', 'QAR', 'SAR', 'HKD']
    for currency in fiat_currencies:
        wallet = {
            "user_id": user_id,
            "entity_id": account_id,
            "entity_type": "business",
            "asset_id": currency,
            "asset_type": "fiat",
            "balance": 0,
            "pending_balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.wallets.insert_one(wallet)

    return {"id": account_id, "message": "Conta empresarial criada com sucesso"}


@router.put("/{account_id}")
async def update_business_account(account_id: str, data: BusinessAccountUpdate, user_id: str = Depends(get_current_user_id)):
    account = await db.business_accounts.find_one({"id": account_id, "user_id": user_id})
    if not account:
        raise HTTPException(status_code=404, detail="Conta não encontrada")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.business_accounts.update_one(
            {"id": account_id}, {"$set": update_data}
        )
    return {"message": "Conta atualizada"}


@router.post("/switch")
async def switch_entity(data: SwitchEntityRequest, user_id: str = Depends(get_current_user_id)):
    if data.entity_type == "business":
        if not data.business_account_id:
            raise HTTPException(status_code=400, detail="business_account_id é obrigatório")
        account = await db.business_accounts.find_one({"id": data.business_account_id, "user_id": user_id})
        if not account:
            raise HTTPException(status_code=404, detail="Conta empresarial não encontrada")
        
        active_entity = {
            "type": "business",
            "business_account_id": data.business_account_id,
            "company_name": account.get("company_name", "")
        }
    else:
        active_entity = {"type": "personal"}

    await db.users.update_one(
        {"id": user_id},
        {"$set": {"active_entity": active_entity}}
    )
    return {"active_entity": active_entity}


@router.get("/active-entity")
async def get_active_entity(user_id: str = Depends(get_current_user_id)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "active_entity": 1})
    return user.get("active_entity", {"type": "personal"}) if user else {"type": "personal"}
