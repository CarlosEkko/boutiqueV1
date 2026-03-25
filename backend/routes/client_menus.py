from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from routes.admin import get_admin_user
from utils.auth import get_current_user_id
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client-menus", tags=["Client Menus"])

db = None

def set_db(database):
    global db
    db = database


# Default client menu structure
DEFAULT_CLIENT_MENUS = {
    "portfolio": {
        "id": "portfolio",
        "label": "Portefólio",
        "icon": "LayoutDashboard",
        "enabled": True,
        "submenus": [
            {
                "id": "ativos",
                "label": "Ativos",
                "icon": "Wallet",
                "enabled": True,
                "items": [
                    {"id": "dashboard", "path": "/dashboard", "label": "Dashboard", "icon": "LayoutDashboard", "enabled": True},
                    {"id": "exchange", "path": "/dashboard/exchange", "label": "Exchange", "icon": "ArrowDownUp", "enabled": True},
                    {"id": "wallets", "path": "/dashboard/wallets", "label": "Carteiras", "icon": "Wallet", "enabled": True},
                    {"id": "whitelist", "path": "/dashboard/whitelist", "label": "Whitelist", "icon": "Shield", "enabled": True},
                ]
            },
            {
                "id": "operacoes_crypto",
                "label": "Operações Crypto",
                "icon": "Bitcoin",
                "enabled": True,
                "items": [
                    {"id": "crypto_deposit", "path": "/dashboard/crypto-deposit", "label": "Depósito Crypto", "icon": "ArrowUpToLine", "enabled": True},
                    {"id": "crypto_withdrawal", "path": "/dashboard/crypto-withdrawal", "label": "Levantamento Crypto", "icon": "Send", "enabled": True},
                ]
            },
            {
                "id": "operacoes_fiat",
                "label": "Operações Fiat",
                "icon": "Banknote",
                "enabled": True,
                "items": [
                    {"id": "fiat_deposit", "path": "/dashboard/fiat-deposit", "label": "Depósito Fiat", "icon": "ArrowUpToLine", "enabled": True},
                    {"id": "fiat_withdrawal", "path": "/dashboard/fiat-withdrawal", "label": "Levantamento Fiat", "icon": "ArrowDownToLine", "enabled": True},
                ]
            },
            {
                "id": "transacoes",
                "label": "Transações",
                "icon": "History",
                "enabled": True,
                "path": "/dashboard/transactions"
            }
        ]
    },
    "investimentos": {
        "id": "investimentos",
        "label": "Investimentos",
        "icon": "TrendingUp",
        "enabled": True,
        "items": [
            {"id": "investments", "path": "/dashboard/investments", "label": "Investimentos", "icon": "TrendingUp", "enabled": True},
            {"id": "roi", "path": "/dashboard/roi", "label": "ROI", "icon": "PieChart", "enabled": True},
        ]
    },
    "transparencia": {
        "id": "transparencia",
        "label": "Transparência",
        "icon": "Shield",
        "enabled": True,
        "items": [
            {"id": "transparency", "path": "/dashboard/transparency", "label": "Transparência", "icon": "Shield", "enabled": True},
        ]
    },
    "perfil": {
        "id": "perfil",
        "label": "Perfil",
        "icon": "UserCircle",
        "enabled": True,
        "items": [
            {"id": "profile", "path": "/dashboard/profile", "label": "Meu Perfil", "icon": "User", "enabled": True},
            {"id": "bank_accounts", "path": "/dashboard/bank-accounts", "label": "Dados Bancários", "icon": "Landmark", "enabled": True},
            {"id": "security", "path": "/dashboard/security", "label": "Segurança", "icon": "Shield", "enabled": True},
            {"id": "kyc", "path": "/dashboard/kyc", "label": "Verificação KYC", "icon": "UserCheck", "enabled": True},
            {"id": "support", "path": "/dashboard/support", "label": "Suporte", "icon": "HelpCircle", "enabled": True},
        ]
    }
}


class MenuItemUpdate(BaseModel):
    id: str
    enabled: bool


class MenuUpdate(BaseModel):
    menu_id: str
    enabled: bool
    items: Optional[List[MenuItemUpdate]] = None
    submenus: Optional[List[dict]] = None


@router.get("/config")
async def get_client_menus_config(admin: dict = Depends(get_admin_user)):
    """Get current client menu configuration (Admin only)"""
    config = await db.platform_settings.find_one(
        {"type": "client_menus"},
        {"_id": 0}
    )
    
    if not config:
        # Return default configuration
        return {
            "menus": DEFAULT_CLIENT_MENUS,
            "updated_at": None,
            "updated_by": None
        }
    
    return config


@router.get("/active")
async def get_active_client_menus(user_id: str = Depends(get_current_user_id)):
    """Get active menus for clients (filtered by enabled status)"""
    config = await db.platform_settings.find_one(
        {"type": "client_menus"},
        {"_id": 0}
    )
    
    menus = config.get("menus", DEFAULT_CLIENT_MENUS) if config else DEFAULT_CLIENT_MENUS
    
    # Filter to only enabled menus and items
    active_menus = {}
    for menu_id, menu in menus.items():
        if not menu.get("enabled", True):
            continue
            
        active_menu = {
            "id": menu.get("id"),
            "label": menu.get("label"),
            "icon": menu.get("icon"),
            "enabled": True
        }
        
        # Handle items
        if "items" in menu:
            active_menu["items"] = [
                item for item in menu["items"] 
                if item.get("enabled", True)
            ]
        
        # Handle submenus (nested structure)
        if "submenus" in menu:
            active_submenus = []
            for submenu in menu["submenus"]:
                if not submenu.get("enabled", True):
                    continue
                    
                active_submenu = {
                    "id": submenu.get("id"),
                    "label": submenu.get("label"),
                    "icon": submenu.get("icon"),
                    "enabled": True
                }
                
                if "path" in submenu:
                    active_submenu["path"] = submenu["path"]
                
                if "items" in submenu:
                    active_submenu["items"] = [
                        item for item in submenu["items"]
                        if item.get("enabled", True)
                    ]
                
                active_submenus.append(active_submenu)
            
            active_menu["submenus"] = active_submenus
        
        active_menus[menu_id] = active_menu
    
    return {"menus": active_menus}


@router.put("/config")
async def update_client_menus_config(
    menus: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update client menu configuration (Admin only)"""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.platform_settings.update_one(
        {"type": "client_menus"},
        {
            "$set": {
                "type": "client_menus",
                "menus": menus,
                "updated_at": now,
                "updated_by": admin.get("email")
            }
        },
        upsert=True
    )
    
    logger.info(f"Client menus updated by {admin.get('email')}")
    
    return {"success": True, "message": "Configuração de menus atualizada com sucesso"}


@router.post("/reset")
async def reset_client_menus(admin: dict = Depends(get_admin_user)):
    """Reset client menus to default configuration (Admin only)"""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.platform_settings.update_one(
        {"type": "client_menus"},
        {
            "$set": {
                "type": "client_menus",
                "menus": DEFAULT_CLIENT_MENUS,
                "updated_at": now,
                "updated_by": admin.get("email"),
                "reset_at": now
            }
        },
        upsert=True
    )
    
    logger.info(f"Client menus reset to default by {admin.get('email')}")
    
    return {"success": True, "message": "Menus restaurados para configuração padrão"}
