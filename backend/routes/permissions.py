from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List, Optional
from models.permissions import (
    StaffRole, Department, ROLE_PERMISSIONS, DEPARTMENT_MENUS,
    PermissionUpdate, get_user_departments
)
from utils.auth import get_current_user_id

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
    
    # Clients only see Portfolio, Account (and OTC if they are OTC clients)
    if not is_admin and user_type != "internal" and not internal_role:
        client_menus = [
            {
                "department": "portfolio",
                "label": "Portfolio",
                "icon": "LayoutDashboard",
                "items": DEPARTMENT_MENUS[Department.PORTFOLIO]["items"]
            },
            {
                "department": "account",
                "label": "Conta",
                "icon": "UserCircle",
                "items": DEPARTMENT_MENUS[Department.ACCOUNT]["items"]
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
        
        return {"menus": client_menus}
    
    # Get custom permissions if any
    custom_perms = await db.user_permissions.find_one({"user_id": user_id}, {"_id": 0})
    custom_departments = custom_perms.get("departments") if custom_perms else None
    
    # Get accessible departments
    role = internal_role or ("admin" if is_admin else "support_agent")
    accessible_depts = get_user_departments(role, custom_departments)
    
    # Build menu structure
    menus = []
    for dept_value in accessible_depts:
        try:
            dept = Department(dept_value)
            dept_info = DEPARTMENT_MENUS.get(dept)
            if dept_info:
                menus.append({
                    "department": dept_value,
                    "label": dept_info["label"],
                    "icon": dept_info["icon"],
                    "items": dept_info["items"]
                })
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
