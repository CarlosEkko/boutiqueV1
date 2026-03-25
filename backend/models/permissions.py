from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class StaffRole(str, Enum):
    """Staff roles with hierarchy"""
    ADMIN = "admin"                           # Full access
    GLOBAL_MANAGER = "global_manager"         # Global oversight
    MANAGER = "manager"                       # Regional management
    SALES_MANAGER = "sales_manager"           # Sales team lead
    SALES = "sales"                           # Sales rep
    FINANCE_GENERAL = "finance_general"       # Finance oversight
    FINANCE_LOCAL = "finance_local"           # Regional finance
    FINANCE = "finance"                       # Finance operations
    SUPPORT_MANAGER = "support_manager"       # Support team lead
    SUPPORT_AGENT = "support_agent"           # Support rep


class Department(str, Enum):
    """Menu departments/areas"""
    # Client menus
    ATIVOS = "ativos"
    CONTAS_SEGURANCA = "contas_seguranca"
    OPERACOES_CRYPTO = "operacoes_crypto"
    OPERACOES_FIAT = "operacoes_fiat"
    HISTORICO = "historico"
    INVESTIMENTOS = "investimentos"
    CONFORMIDADE = "conformidade"
    ACCOUNT = "account"
    # Admin/Staff menus
    ADMIN = "admin"
    MANAGEMENT = "management"
    FINANCE = "finance"
    CRM = "crm"
    OTC_DESK = "otc_desk"
    SUPPORT = "support"


# Role to Department access mapping
ROLE_PERMISSIONS = {
    StaffRole.ADMIN: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.ADMIN, 
        Department.MANAGEMENT, 
        Department.FINANCE, 
        Department.CRM,
        Department.OTC_DESK,
        Department.SUPPORT
    ],
    StaffRole.GLOBAL_MANAGER: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.ADMIN, 
        Department.MANAGEMENT, 
        Department.FINANCE, 
        Department.CRM, 
        Department.SUPPORT
    ],
    StaffRole.MANAGER: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.ADMIN,
        Department.CRM,
        Department.SUPPORT
    ],
    StaffRole.SALES_MANAGER: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.CRM
    ],
    StaffRole.SALES: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.CRM
    ],
    StaffRole.FINANCE_GENERAL: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.FINANCE
    ],
    StaffRole.FINANCE_LOCAL: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.FINANCE
    ],
    StaffRole.FINANCE: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.FINANCE
    ],
    StaffRole.SUPPORT_MANAGER: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.SUPPORT
    ],
    StaffRole.SUPPORT_AGENT: [
        Department.ATIVOS,
        Department.CONTAS_SEGURANCA,
        Department.OPERACOES_CRYPTO,
        Department.OPERACOES_FIAT,
        Department.HISTORICO,
        Department.INVESTIMENTOS,
        Department.CONFORMIDADE,
        Department.ACCOUNT,
        Department.SUPPORT
    ],
}


# Department menu items
DEPARTMENT_MENUS = {
    Department.ATIVOS: {
        "label": "Ativos",
        "icon": "LayoutDashboard",
        "items": [
            {"path": "/dashboard", "label": "Dashboard", "icon": "LayoutDashboard"},
            {"path": "/dashboard/exchange", "label": "Exchange", "icon": "ArrowDownUp"},
        ]
    },
    Department.CONTAS_SEGURANCA: {
        "label": "Contas & Segurança",
        "icon": "Shield",
        "items": [
            {"path": "/dashboard/wallets", "label": "Carteiras", "icon": "Wallet"},
            {"path": "/dashboard/whitelist", "label": "Whitelist", "icon": "Shield"},
        ]
    },
    Department.OPERACOES_CRYPTO: {
        "label": "Operações Crypto",
        "icon": "Bitcoin",
        "items": [
            {"path": "/dashboard/crypto-deposit", "label": "Depósito Crypto", "icon": "ArrowUpToLine"},
            {"path": "/dashboard/crypto-withdrawal", "label": "Levantamento Crypto", "icon": "Send"},
        ]
    },
    Department.OPERACOES_FIAT: {
        "label": "Operações Fiat",
        "icon": "Banknote",
        "items": [
            {"path": "/dashboard/fiat-deposit", "label": "Depósito Fiat", "icon": "ArrowUpToLine"},
            {"path": "/dashboard/fiat-withdrawal", "label": "Levantamento Fiat", "icon": "ArrowDownToLine"},
        ]
    },
    Department.HISTORICO: {
        "label": "Histórico e Movimentos",
        "icon": "History",
        "items": [
            {"path": "/dashboard/transactions", "label": "Transações", "icon": "History"},
        ]
    },
    Department.INVESTIMENTOS: {
        "label": "Investimentos & Performance",
        "icon": "TrendingUp",
        "items": [
            {"path": "/dashboard/investments", "label": "Investimentos", "icon": "TrendingUp"},
            {"path": "/dashboard/roi", "label": "ROI", "icon": "PieChart"},
        ]
    },
    Department.CONFORMIDADE: {
        "label": "Conformidade & Transparência",
        "icon": "FileCheck",
        "items": [
            {"path": "/dashboard/transparency", "label": "Transparência", "icon": "Shield"},
        ]
    },
    Department.ACCOUNT: {
        "label": "Conta",
        "icon": "UserCircle",
        "items": [
            {"path": "/profile", "label": "Meu Perfil", "icon": "User"},
            {"path": "/dashboard/kyc", "label": "Verificação KYC", "icon": "UserCheck"},
            {"path": "/dashboard/support", "label": "Suporte", "icon": "HelpCircle"},
        ]
    },
    Department.ADMIN: {
        "label": "Admin",
        "icon": "Settings",
        "items": [
            {"path": "/dashboard/admin", "label": "Visão Geral", "icon": "BarChart3"},
            {"path": "/dashboard/admin/regional", "label": "Métricas Regionais", "icon": "Globe"},
            {"path": "/dashboard/admin/staff", "label": "Gestão de Equipa", "icon": "UserCog"},
            {"path": "/dashboard/admin/users", "label": "Clientes", "icon": "Users"},
            {"path": "/dashboard/admin/kyc", "label": "KYC/KYB", "icon": "UserCheck"},
            {"path": "/dashboard/admin/opportunities", "label": "Oportunidades", "icon": "TrendingUp"},
            {"path": "/dashboard/admin/transparency", "label": "Transparência", "icon": "Shield"},
            {"path": "/dashboard/admin/invites", "label": "Códigos Convite", "icon": "Gift"},
        ]
    },
    Department.MANAGEMENT: {
        "label": "Gestão",
        "icon": "Settings2",
        "items": [
            {"path": "/dashboard/admin/permissions", "label": "Permissões", "icon": "Lock"},
            {"path": "/dashboard/admin/trading", "label": "Taxas & Limites", "icon": "Sliders"},
            {"path": "/dashboard/admin/settings", "label": "Configurações", "icon": "Settings"},
            {"path": "/dashboard/admin/referrals", "label": "Referências", "icon": "GitBranch"},
            {"path": "/dashboard/admin/admission-fees", "label": "Taxas de Admissão", "icon": "CreditCard"},
            {"path": "/dashboard/crm/advanced", "label": "Dashboard Avançado", "icon": "BarChart3"},
        ]
    },
    Department.FINANCE: {
        "label": "Financeiro",
        "icon": "Landmark",
        "items": [
            {"path": "/dashboard/admin/orders", "label": "Ordens de Trading", "icon": "Receipt"},
            {"path": "/dashboard/admin/fiat-deposits", "label": "Depósitos Fiat", "icon": "ArrowUpToLine"},
            {"path": "/dashboard/admin/fiat-withdrawals", "label": "Levantamentos Fiat", "icon": "ArrowDownToLine"},
            {"path": "/dashboard/admin/crypto-withdrawals", "label": "Levantamentos Crypto", "icon": "Bitcoin"},
        ]
    },
    Department.CRM: {
        "label": "CRM",
        "icon": "Users",
        "items": [
            {"path": "/dashboard/crm", "label": "Dashboard CRM", "icon": "LayoutDashboard"},
            {"path": "/dashboard/crm/clients", "label": "Meus Clientes", "icon": "Eye"},
            {"path": "/dashboard/crm/suppliers", "label": "Fornecedores", "icon": "Handshake"},
            {"path": "/dashboard/crm/leads", "label": "Leads", "icon": "UserPlus"},
            {"path": "/dashboard/crm/deals", "label": "Negociações", "icon": "Target"},
            {"path": "/dashboard/crm/contacts", "label": "Contactos", "icon": "Contact"},
            {"path": "/dashboard/crm/tasks", "label": "Tarefas", "icon": "CheckSquare"},
            {"path": "/dashboard/admin/pipeline", "label": "Pipeline de Vendas", "icon": "GitBranch"},
        ]
    },
    Department.OTC_DESK: {
        "label": "OTC Desk",
        "icon": "Briefcase",
        "items": [
            {"path": "/dashboard/otc", "label": "Dashboard OTC", "icon": "LayoutDashboard"},
            {"path": "/dashboard/otc/leads", "label": "Leads OTC", "icon": "UserPlus"},
            {"path": "/dashboard/otc/pipeline", "label": "Pipeline", "icon": "Kanban"},
            {"path": "/dashboard/otc/quotes", "label": "Cotações", "icon": "FileText"},
            {"path": "/dashboard/otc/execution", "label": "Execução", "icon": "Zap"},
            {"path": "/dashboard/otc/settlement", "label": "Liquidação", "icon": "Wallet"},
            {"path": "/dashboard/otc/invoices", "label": "Faturas", "icon": "Receipt"},
            {"path": "/dashboard/otc/clients", "label": "Clientes OTC", "icon": "Building"},
        ]
    },
    Department.SUPPORT: {
        "label": "Suporte",
        "icon": "Headphones",
        "items": [
            {"path": "/dashboard/admin/tickets", "label": "Tickets de Suporte", "icon": "Ticket"},
            {"path": "/dashboard/admin/knowledge-base", "label": "Base de Conhecimento", "icon": "Book"},
        ]
    },
}


class UserPermissions(BaseModel):
    """Custom permissions for a user (overrides role-based)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    departments: List[Department] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Admin who set the permissions


class PermissionUpdate(BaseModel):
    """Request model for updating permissions"""
    departments: List[str]


def get_user_departments(role: str, custom_permissions: List[str] = None) -> List[str]:
    """Get list of departments a user can access"""
    if custom_permissions:
        return custom_permissions
    
    try:
        staff_role = StaffRole(role)
        return [d.value for d in ROLE_PERMISSIONS.get(staff_role, [])]
    except ValueError:
        # Legacy roles mapping
        legacy_mapping = {
            "admin": StaffRole.ADMIN,
            "manager": StaffRole.MANAGER,
            "local_manager": StaffRole.MANAGER,
            "support": StaffRole.SUPPORT_AGENT,
        }
        staff_role = legacy_mapping.get(role, StaffRole.SUPPORT_AGENT)
        return [d.value for d in ROLE_PERMISSIONS.get(staff_role, [])]
