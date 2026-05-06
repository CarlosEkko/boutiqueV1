from fastapi import APIRouter, HTTPException, Header, Depends
from datetime import datetime, timezone
from typing import List, Optional
from models.permissions import (
    StaffRole, Department, ROLE_PERMISSIONS, DEPARTMENT_MENUS,
    PermissionUpdate, get_user_departments
)
from utils.auth import get_current_user_id
from utils.i18n import t, I18n

router = APIRouter(prefix="/permissions", tags=["Permissions"])

db = None


def set_db(database):
    global db
    db = database


async def get_admin_user(user_id: str = Depends(get_current_user_id)):
    """Check if user is admin"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_admin = user.get("is_admin", False)
    internal_role = user.get("internal_role")
    
    if not is_admin and internal_role not in ["admin", "global_manager"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


@router.get("/roles")
async def get_available_roles():
    """Get all available staff roles"""
    return {
        "roles": [
            {"value": "admin", "label": "Admin", "description": "Acesso total ao sistema"},
            {"value": "global_manager", "label": "Global Manager", "description": "Gestão global de todas regiões"},
            {"value": "manager", "label": "Manager", "description": "Gestão regional"},
            {"value": "sales_manager", "label": "Manager de Vendas", "description": "Líder da equipa de vendas"},
            {"value": "sales", "label": "Vendas", "description": "Representante de vendas"},
            {"value": "finance_general", "label": "Financeiro Geral", "description": "Supervisão financeira global"},
            {"value": "finance_local", "label": "Financeiro Local", "description": "Financeiro regional"},
            {"value": "finance", "label": "Financeiro", "description": "Operações financeiras"},
            {"value": "support_manager", "label": "Suporte Manager", "description": "Líder da equipa de suporte"},
            {"value": "support_agent", "label": "Agente de Suporte", "description": "Atendimento ao cliente"},
        ]
    }


@router.get("/departments")
async def get_available_departments():
    """Get all available departments/menu areas"""
    return {
        "departments": [
            {"value": d.value, "label": info["label"], "icon": info["icon"]}
            for d, info in DEPARTMENT_MENUS.items()
        ]
    }


@router.get("/menus")
async def get_menu_structure(user_id: str = Depends(get_current_user_id)):
    """Get menu structure for current user based on their permissions"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is internal
    is_admin = user.get("is_admin", False)
    user_type = user.get("user_type", "client")
    internal_role = user.get("internal_role")
    user_email = user.get("email")
    
    # Check if user is an OTC client
    otc_client = await db.otc_clients.find_one(
        {"$or": [
            {"user_id": user_id},
            {"contact_email": user_email}
        ]}
    )
    is_otc_client = otc_client is not None
    
    # Clients see the new hierarchical menu structure
    if not is_admin and user_type != "internal" and not internal_role:
        # Check if client has custom menu settings from admin
        menu_settings = await db.client_menu_settings.find_one({"user_id": user_id}, {"_id": 0})
        allowed_menus = set(menu_settings.get("menus", [])) if menu_settings else None
        
        portfolio_data = DEPARTMENT_MENUS[Department.PORTFOLIO]
        investimentos_data = DEPARTMENT_MENUS[Department.INVESTIMENTOS]
        transparencia_data = DEPARTMENT_MENUS[Department.TRANSPARENCIA]
        account_data = DEPARTMENT_MENUS[Department.ACCOUNT]
        
        # All possible client menus
        all_client_menus = {
            "portfolio": {
                "department": "portfolio",
                "label": portfolio_data["label"],
                "icon": portfolio_data["icon"],
                "submenus": portfolio_data.get("submenus", [])
            },
            "trading": {
                "department": "trading",
                "label": "Trading",
                "icon": "TrendingUp",
                "path": "/dashboard/trading"
            },
            "multi_sign": {
                "department": "multi_sign",
                "label": "Multi-Sign",
                "icon": "ShieldCheck",
                "items": [
                    {"path": "/dashboard/vault/wallets", "label": "Cofre", "icon": "Vault"},
                    {"path": "/dashboard/vault", "label": "Transações", "icon": "ArrowDownUp"},
                    {"path": "/dashboard/vault/signatories", "label": "Signatários", "icon": "Users"},
                ]
            },
            "investimentos": {
                "department": "investimentos",
                "label": investimentos_data["label"],
                "icon": investimentos_data["icon"],
                "items": investimentos_data.get("items", [])
            },
            "transparencia": {
                "department": "transparencia",
                "label": transparencia_data["label"],
                "icon": transparencia_data["icon"],
                "items": transparencia_data.get("items", [])
            },
            "account": {
                "department": "account",
                "label": account_data["label"],
                "icon": account_data["icon"],
                "items": account_data.get("items", [])
            },
            "otc_trading": {
                "department": "otc_trading",
                "label": "OTC Trading",
                "icon": "Briefcase",
                "items": [
                    {"path": "/dashboard/otc-trading", "label": "OTC Desk", "icon": "Briefcase"}
                ]
            },
            "suporte": {
                "department": "suporte",
                "label": "Suporte",
                "icon": "Headphones",
                "items": [
                    {"path": "/dashboard/support", "label": "Tickets de Suporte", "icon": "HelpCircle"},
                ]
            },
            "tokenizacao": {
                "department": "tokenizacao",
                "label": "Tokenização",
                "icon": "Gem",
                "items": [
                    {"path": "/dashboard/tokenization", "label": "Tokens", "icon": "Gem"},
                    {"path": "/dashboard/tokenization/issue", "label": "Emitir Token", "icon": "FilePlus2"},
                    {"path": "/dashboard/tokenization/mint-burn", "label": "Mint & Burn", "icon": "Flame"},
                    {"path": "/dashboard/tokenization/pricing", "label": "Definir Preço", "icon": "DollarSign"},
                ]
            },
            "cold_wallet": {
                "department": "cold_wallet",
                "label": "Cold Wallet",
                "icon": "Shield",
                "items": [
                    {"path": "/dashboard/cold-wallet", "label": "Cold Wallet", "icon": "Shield"},
                ]
            },
            "escrow": {
                "department": "escrow",
                "label": "Escrow",
                "icon": "Lock",
                "items": [
                    {"path": "/dashboard/escrow", "label": "Dashboard", "icon": "LayoutDashboard"},
                    {"path": "/dashboard/escrow/deals", "label": "Operacoes", "icon": "FileText"},
                ]
            },
            "launchpad": {
                "department": "launchpad",
                "label": "Launchpad",
                "icon": "Rocket",
                "items": [
                    {"path": "/dashboard/launchpad", "label": "Projetos", "icon": "Rocket"},
                    {"path": "/dashboard/launchpad/my-investments", "label": "Meus Investimentos", "icon": "Coins"},
                ]
            },
        }
        
        # Menu display order
        menu_order = ["portfolio", "trading", "multi_sign", "investimentos", "transparencia", "escrow", "cold_wallet", "launchpad", "tokenizacao", "otc_trading", "suporte", "account"]
        
        client_menus = []
        for key in menu_order:
            # Always include portfolio, trading, account
            if key in ("portfolio", "trading", "account"):
                client_menus.append(all_client_menus[key])
                continue
            # OTC only if client is OTC
            if key == "otc_trading" and not is_otc_client:
                continue
            # If admin configured custom menus, respect that
            if allowed_menus is not None and key not in allowed_menus:
                continue
            if key in all_client_menus:
                client_menus.append(all_client_menus[key])
        
        return {"menus": client_menus}
    
    # Get custom permissions if any
    custom_perms = await db.user_permissions.find_one({"user_id": user_id}, {"_id": 0})
    custom_departments = custom_perms.get("departments") if custom_perms else None
    
    # Get accessible departments
    role = internal_role or ("admin" if is_admin else "support_agent")
    accessible_depts = get_user_departments(role, custom_departments)
    
    # Build menu structure for staff
    menus = []
    portfolio_added = False
    for dept_value in accessible_depts:
        try:
            dept = Department(dept_value)
            dept_info = DEPARTMENT_MENUS.get(dept)
            if dept_info:
                menu_item = {
                    "department": dept_value,
                    "label": dept_info["label"],
                    "icon": dept_info["icon"],
                }
                # Handle both submenus (for portfolio) and items
                if "submenus" in dept_info:
                    menu_item["submenus"] = dept_info["submenus"]
                if "items" in dept_info:
                    menu_item["items"] = dept_info["items"]
                menus.append(menu_item)
                # Add Trading as standalone item right after portfolio
                if dept_value == "portfolio" and not portfolio_added:
                    menus.append({
                        "department": "trading",
                        "label": "Trading",
                        "icon": "TrendingUp",
                        "path": "/dashboard/trading"
                    })
                    portfolio_added = True
                # Add client-facing Launchpad after portfolio section
                if dept_value == "launchpad":
                    # Rename to launchpad_admin so it goes to GESTÃO
                    menus[-1]["department"] = "launchpad_admin"
        except ValueError:
            continue
    
    # Add "My Performance" menu for all internal users
    menus.append({
        "department": "my_performance",
        "label": "A Minha Performance",
        "icon": "BarChart3",
        "items": [
            {"path": "/dashboard/my-performance", "label": "A Minha Performance", "icon": "BarChart3"},
        ]
    })

    return {"menus": menus}


@router.get("/me")
async def get_my_permissions(user_id: str = Depends(get_current_user_id)):
    """Lightweight endpoint — returns the effective departments of the
    currently authenticated user. Used by the frontend route guards to decide
    which `/dashboard/admin/*` pages each staff member may access (without
    fetching the full menu structure)."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin = bool(user.get("is_admin"))
    user_type = user.get("user_type", "client")
    internal_role = user.get("internal_role")

    if not is_admin and user_type != "internal" and not internal_role:
        # Plain client — no admin departments
        return {
            "user_id": user_id,
            "is_admin": False,
            "is_internal": False,
            "internal_role": None,
            "departments": [],
        }

    custom_perms = await db.user_permissions.find_one({"user_id": user_id}, {"_id": 0})
    custom_departments = custom_perms.get("departments") if custom_perms else None
    role = internal_role or ("admin" if is_admin else "support_agent")
    departments = get_user_departments(role, custom_departments)

    return {
        "user_id": user_id,
        "is_admin": is_admin,
        "is_internal": True,
        "internal_role": role,
        "departments": departments,
    }


@router.get("/user/{user_id}")
async def get_user_permissions(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get permissions for a specific user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get custom permissions
    custom_perms = await db.user_permissions.find_one({"user_id": user_id}, {"_id": 0})
    
    # Get role-based permissions
    role = user.get("internal_role") or ("admin" if user.get("is_admin") else None)
    role_departments = get_user_departments(role) if role else []
    
    return {
        "user_id": user_id,
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "role": role,
        "role_departments": role_departments,
        "custom_departments": custom_perms.get("departments") if custom_perms else None,
        "effective_departments": custom_perms.get("departments") if custom_perms else role_departments
    }


@router.put("/user/{user_id}")
async def update_user_permissions(
    user_id: str,
    data: PermissionUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update custom permissions for a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate departments
    valid_depts = [d.value for d in Department]
    for dept in data.departments:
        if dept not in valid_depts:
            raise HTTPException(status_code=400, detail=f"Invalid department: {dept}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Upsert permissions
    await db.user_permissions.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "user_id": user_id,
                "departments": data.departments,
                "updated_at": now,
                "updated_by": admin["id"]
            },
            "$setOnInsert": {
                "created_at": now,
                "created_by": admin["id"]
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Permissions updated"}


@router.delete("/user/{user_id}")
async def reset_user_permissions(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Reset user to role-based permissions (remove custom)"""
    await db.user_permissions.delete_one({"user_id": user_id})
    return {"success": True, "message": "Custom permissions removed, using role defaults"}


@router.get("/staff-with-permissions")
async def get_all_staff_permissions(admin: dict = Depends(get_admin_user)):
    """Get all internal users with their permissions"""
    users = await db.users.find(
        {"user_type": "internal"},
        {"_id": 0, "hashed_password": 0}
    ).to_list(1000)
    
    result = []
    for user in users:
        # Get custom permissions
        custom_perms = await db.user_permissions.find_one({"user_id": user["id"]}, {"_id": 0})
        
        role = user.get("internal_role") or ("admin" if user.get("is_admin") else None)
        role_departments = get_user_departments(role) if role else []
        
        result.append({
            "id": user["id"],
            "name": user.get("name"),
            "email": user.get("email"),
            "role": role,
            "region": user.get("region"),
            "is_active": user.get("is_active", True),
            "role_departments": role_departments,
            "custom_departments": custom_perms.get("departments") if custom_perms else None,
            "effective_departments": custom_perms.get("departments") if custom_perms else role_departments,
            "has_custom_permissions": custom_perms is not None
        })
    
    return result
