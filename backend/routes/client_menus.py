from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from routes.admin import get_admin_user
from utils.auth import get_current_user_id
from utils.i18n import t, I18n
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client-menus", tags=["Client Menus"])

db = None

def set_db(database):
    global db
    db = database


# Available menus for clients
AVAILABLE_MENUS = [
    {"value": "portfolio", "label": "Portefólio"},
    {"value": "investimentos", "label": "Investimentos"},
    {"value": "transparencia", "label": "Transparência"},
    {"value": "perfil", "label": "Perfil"},
    {"value": "otc_trading", "label": "OTC Trading"},
    {"value": "multi_sign", "label": "Multi-Sign"},
]

# Default menus (all menus)
DEFAULT_CLIENT_MENUS = [m["value"] for m in AVAILABLE_MENUS]


class ClientMenusUpdate(BaseModel):
    menus: List[str]


@router.get("/available")
async def get_available_menus(admin: dict = Depends(get_admin_user)):
    """Get list of available menus for clients"""
    return {"menus": AVAILABLE_MENUS}


@router.get("/clients")
async def get_clients_with_menus(admin: dict = Depends(get_admin_user)):
    """Get all clients with their menu permissions"""
    # Get all client users (not internal/staff)
    clients = await db.users.find(
        {"user_type": {"$ne": "internal"}},
        {"_id": 0, "hashed_password": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Get custom menu settings for clients
    custom_settings = {}
    menu_settings = await db.client_menu_settings.find({}, {"_id": 0}).to_list(500)
    for setting in menu_settings:
        custom_settings[setting.get("user_id")] = setting.get("menus", [])
    
    # Enrich clients with menu info
    for client in clients:
        user_id = client.get("id")
        if user_id in custom_settings:
            client["custom_menus"] = custom_settings[user_id]
            client["effective_menus"] = custom_settings[user_id]
            client["has_custom_menus"] = True
        else:
            client["custom_menus"] = None
            client["effective_menus"] = DEFAULT_CLIENT_MENUS
            client["has_custom_menus"] = False
    
    return clients


@router.get("/client/{client_id}")
async def get_client_menus(client_id: str, admin: dict = Depends(get_admin_user)):
    """Get menu permissions for a specific client"""
    # Get client
    client = await db.users.find_one({"id": client_id}, {"_id": 0, "hashed_password": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Get custom menu settings
    settings = await db.client_menu_settings.find_one(
        {"user_id": client_id},
        {"_id": 0}
    )
    
    if settings:
        return {
            "client": client,
            "menus": settings.get("menus", []),
            "has_custom_menus": True
        }
    else:
        return {
            "client": client,
            "menus": DEFAULT_CLIENT_MENUS,
            "has_custom_menus": False
        }


@router.put("/client/{client_id}")
async def update_client_menus(
    client_id: str,
    data: ClientMenusUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update menu permissions for a client"""
    # Verify client exists
    client = await db.users.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    # Validate menus
    valid_menu_values = [m["value"] for m in AVAILABLE_MENUS]
    for menu in data.menus:
        if menu not in valid_menu_values:
            raise HTTPException(status_code=400, detail=f"Menu inválido: {menu}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update or create custom menu settings
    await db.client_menu_settings.update_one(
        {"user_id": client_id},
        {
            "$set": {
                "user_id": client_id,
                "menus": data.menus,
                "updated_at": now,
                "updated_by": admin.get("email")
            }
        },
        upsert=True
    )
    
    logger.info(f"Client {client_id} menus updated by {admin.get('email')}: {data.menus}")
    
    return {"success": True, "message": "Menus atualizados com sucesso"}


@router.delete("/client/{client_id}")
async def reset_client_menus(client_id: str, admin: dict = Depends(get_admin_user)):
    """Reset client menus to default (remove custom settings)"""
    result = await db.client_menu_settings.delete_one({"user_id": client_id})
    
    if result.deleted_count > 0:
        logger.info(f"Client {client_id} menus reset to default by {admin.get('email')}")
        return {"success": True, "message": "Menus restaurados para padrão"}
    else:
        return {"success": True, "message": "Cliente já usa configuração padrão"}


@router.get("/my-menus")
async def get_my_menus(user_id: str = Depends(get_current_user_id)):
    """Get current user's menu permissions"""
    # Check if user has custom menu settings
    settings = await db.client_menu_settings.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )
    
    if settings:
        return {"menus": settings.get("menus", []), "is_custom": True}
    else:
        return {"menus": DEFAULT_CLIENT_MENUS, "is_custom": False}
