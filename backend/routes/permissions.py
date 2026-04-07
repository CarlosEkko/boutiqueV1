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
        portfolio_data = DEPARTMENT_MENUS[Department.PORTFOLIO]
        investimentos_data = DEPARTMENT_MENUS[Department.INVESTIMENTOS]
        transparencia_data = DEPARTMENT_MENUS[Department.TRANSPARENCIA]
        account_data = DEPARTMENT_MENUS[Department.ACCOUNT]
        
        client_menus = [
            {
                "department": "portfolio",
                "label": portfolio_data["label"],
                "icon": portfolio_data["icon"],
                "submenus": portfolio_data.get("submenus", [])
            },
            {
                "department": "multi_sign",
                "label": "Multi-Sign",
                "icon": "ShieldCheck",
                "items": [
                    {"path": "/dashboard/vault/wallets", "label": "Cofre", "icon": "Vault"},
                    {"path": "/dashboard/vault", "label": "Transações", "icon": "ArrowDownUp"},
                    {"path": "/dashboard/vault/signatories", "label": "Signatários", "icon": "Users"},
                ]
            },
            {
                "department": "investimentos",
                "label": investimentos_data["label"],
                "icon": investimentos_data["icon"],
                "items": investimentos_data.get("items", [])
            },
            {
                "department": "transparencia",
                "label": transparencia_data["label"],
                "icon": transparencia_data["icon"],
                "items": transparencia_data.get("items", [])
            },
            {
                "department": "account",
                "label": account_data["label"],
                "icon": account_data["icon"],
                "items": account_data.get("items", [])
            }
        ]
        
        # Add OTC Trading menu if user is an OTC client
        if is_otc_client:
            client_menus.append({
                "department": "otc_trading",
                "label": "OTC Trading",
                "icon": "Briefcase",
                "items": [
                    {"path": "/dashboard/otc-trading", "label": "OTC Desk", "icon": "Briefcase"}
                ]
            })
        
        # Add Suporte menu for clients
        client_menus.append({
            "department": "suporte",
            "label": "Suporte",
            "icon": "Headphones",
            "items": [
                {"path": "/dashboard/support", "label": "Tickets de Suporte", "icon": "HelpCircle"},
            ]
        })
        
        # Add Tokenização menu for clients
        tokenization_data = DEPARTMENT_MENUS[Department.TOKENIZATION]
        client_menus.append({
            "department": "tokenizacao",
            "label": "Tokenização",
            "icon": "Gem",
            "items": [
                {"path": "/dashboard/tokenization", "label": "Tokens", "icon": "Gem"},
                {"path": "/dashboard/tokenization/issue", "label": "Emitir Token", "icon": "FilePlus2"},
                {"path": "/dashboard/tokenization/mint-burn", "label": "Mint & Burn", "icon": "Flame"},
                {"path": "/dashboard/tokenization/pricing", "label": "Definir Preço", "icon": "DollarSign"},
            ]
        })
        
        return {"menus": client_menus}
    
    # Get custom permissions if any
    custom_perms = await db.user_permissions.find_one({"user_id": user_id}, {"_id": 0})
    custom_departments = custom_perms.get("departments") if custom_perms else None
    
    # Get accessible departments
    role = internal_role or ("admin" if is_admin else "support_agent")
    accessible_depts = get_user_departments(role, custom_departments)
    
    # Build menu structure for staff
    menus = []
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
        except ValueError:
            continue
    
    return {"menus": menus}


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
