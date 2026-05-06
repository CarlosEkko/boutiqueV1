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
    # Client menus - New hierarchical structure
    PORTFOLIO = "portfolio"           # Main parent: Portefólio
    INVESTIMENTOS = "investimentos"   # Main parent: Investimentos
    TRANSPARENCIA = "transparencia"   # Main parent: Transparência
    ACCOUNT = "account"               # Conta (profile, kyc, support)
    # Admin/Staff menus
    ADMIN = "admin"
    MANAGEMENT = "management"
    FINANCE = "finance"
    CRM = "crm"
    OTC_DESK = "otc_desk"
    SUPPORT = "support"
    TEAM_HUB = "team_hub"
    TRANSACTION_APPROVAL = "transaction_approval"
    RISK_COMPLIANCE = "risk_compliance"
    TOKENIZATION = "tokenization"
    ESCROW = "escrow"
    LAUNCHPAD = "launchpad"
    COLD_WALLET = "cold_wallet"
    COMMERCIAL = "commercial"


# Role to Department access mapping
ROLE_PERMISSIONS = {
    StaffRole.ADMIN: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.ADMIN, 
        Department.MANAGEMENT, 
        Department.FINANCE, 
        Department.CRM,
        Department.OTC_DESK,
        Department.SUPPORT,
        Department.TEAM_HUB,
        Department.TRANSACTION_APPROVAL,
        Department.RISK_COMPLIANCE,
        Department.TOKENIZATION,
        Department.ESCROW,
        Department.LAUNCHPAD,
        Department.COLD_WALLET,
        Department.COMMERCIAL
    ],
    StaffRole.GLOBAL_MANAGER: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.ADMIN, 
        Department.MANAGEMENT, 
        Department.FINANCE, 
        Department.CRM, 
        Department.SUPPORT,
        Department.TEAM_HUB,
        Department.TRANSACTION_APPROVAL,
        Department.RISK_COMPLIANCE,
        Department.TOKENIZATION,
        Department.ESCROW,
        Department.LAUNCHPAD
    ],
    StaffRole.MANAGER: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.ADMIN,
        Department.CRM,
        Department.SUPPORT,
        Department.TEAM_HUB,
        Department.TRANSACTION_APPROVAL
    ],
    StaffRole.SALES_MANAGER: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.CRM,
        Department.TEAM_HUB
    ],
    StaffRole.SALES: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.CRM
    ],
    StaffRole.FINANCE_GENERAL: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.FINANCE
    ],
    StaffRole.FINANCE_LOCAL: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.FINANCE
    ],
    StaffRole.FINANCE: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.FINANCE
    ],
    StaffRole.SUPPORT_MANAGER: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.SUPPORT
    ],
    StaffRole.SUPPORT_AGENT: [
        Department.PORTFOLIO,
        Department.INVESTIMENTOS,
        Department.TRANSPARENCIA,
        Department.ACCOUNT,
        Department.SUPPORT
    ],
}


# Department menu items - New hierarchical structure
DEPARTMENT_MENUS = {
    Department.PORTFOLIO: {
        "label": "Portefólio",
        "icon": "LayoutDashboard",
        "submenus": [
            {
                "id": "portfolio_dashboard",
                "label": "Dashboard",
                "icon": "LayoutDashboard",
                "path": "/dashboard"
            },
            {
                "id": "ativos",
                "label": "Ativos",
                "icon": "Wallet",
                "items": [
                    {"path": "/dashboard/exchange", "label": "Exchange", "icon": "ArrowDownUp"},
                    {"path": "/dashboard/wallets", "label": "Carteiras", "icon": "Wallet"},
                    {"path": "/dashboard/whitelist", "label": "Whitelist", "icon": "Shield"},
                ]
            },
            {
                "id": "operacoes_crypto",
                "label": "Operações Crypto",
                "icon": "Bitcoin",
                "items": [
                    {"path": "/dashboard/crypto-deposit", "label": "Depósito Crypto", "icon": "ArrowUpToLine"},
                    {"path": "/dashboard/crypto-withdrawal", "label": "Levantamento Crypto", "icon": "Send"},
                ]
            },
            {
                "id": "operacoes_fiat",
                "label": "Operações Fiat",
                "icon": "Banknote",
                "items": [
                    {"path": "/dashboard/fiat-deposit", "label": "Depósito Fiat", "icon": "ArrowUpToLine"},
                    {"path": "/dashboard/fiat-withdrawal", "label": "Levantamento Fiat", "icon": "ArrowDownToLine"},
                ]
            },
            {
                "id": "transacoes",
                "label": "Transações",
                "icon": "History",
                "path": "/dashboard/transactions"
            }
        ]
    },
    Department.INVESTIMENTOS: {
        "label": "Investimentos",
        "icon": "TrendingUp",
        "items": [
            {"path": "/dashboard/investments", "label": "Investimentos", "icon": "TrendingUp"},
            {"path": "/dashboard/staking", "label": "Staking", "icon": "Coins"},
            {"path": "/dashboard/roi", "label": "ROI", "icon": "PieChart"},
        ]
    },
    Department.COLD_WALLET: {
        "label": "Cold Wallet",
        "icon": "Shield",
        "items": [
            {"path": "/dashboard/cold-wallet", "label": "Cold Wallet", "icon": "Shield"},
        ]
    },
    Department.TRANSPARENCIA: {
        "label": "Transparência",
        "icon": "Shield",
        "items": [
            {"path": "/dashboard/transparency", "label": "Transparência", "icon": "Shield"},
        ]
    },
    Department.ACCOUNT: {
        "label": "Perfil",
        "icon": "UserCircle",
        "items": [
            {"path": "/dashboard/profile", "label": "Meu Perfil", "icon": "User"},
            {"path": "/dashboard/tiers", "label": "Níveis & Benefícios", "icon": "Crown"},
            {"path": "/dashboard/bank-accounts", "label": "Dados Bancários", "icon": "Landmark"},
            {"path": "/dashboard/security", "label": "Segurança", "icon": "Shield"},
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
            {"path": "/dashboard/admin/opportunities", "label": "Oportunidades", "icon": "TrendingUp"},
            {"path": "/dashboard/admin/transparency", "label": "Transparência", "icon": "Shield"},
            {"path": "/dashboard/admin/invites", "label": "Códigos Convite", "icon": "Gift"},
            {"path": "/dashboard/admin/security", "label": "Security Dashboard", "icon": "ShieldAlert"},
        ]
    },
    Department.MANAGEMENT: {
        "label": "Gestão",
        "icon": "Settings2",
        "items": [
            {"path": "/dashboard/admin/permissions", "label": "Permissões", "icon": "Lock"},
            {"path": "/dashboard/admin/client-menus", "label": "Menus de Clientes", "icon": "Menu"},
            {"path": "/dashboard/admin/tiers", "label": "Níveis de Cliente", "icon": "Crown"},
            {"path": "/dashboard/admin/trading", "label": "Taxas & Limites", "icon": "Sliders"},
            {"path": "/dashboard/admin/settings", "label": "Configurações", "icon": "Settings"},
            {"path": "/dashboard/admin/cookie-consent", "label": "Consentimento Cookies", "icon": "Cookie"},
            {"path": "/dashboard/approvals/settings", "label": "Multi-Sign", "icon": "ShieldCheck"},
            {"path": "/dashboard/admin/multisign-clients", "label": "Clientes Multi-Sign", "icon": "Users"},
            {"path": "/dashboard/admin/referrals", "label": "Referências", "icon": "GitBranch"},
            {"path": "/dashboard/admin/kbex-rates", "label": "KBEX Spread", "icon": "TrendingUp"},
            {"path": "/dashboard/admin/otc-desk", "label": "OTC Desk Config", "icon": "Gauge"},
            {"path": "/dashboard/admin/tenants", "label": "Tenants", "icon": "Globe"},
            {"path": "/dashboard/admin/escrow-fees", "label": "Escrow Fees", "icon": "Shield"},
            {"path": "/dashboard/crm/advanced", "label": "Dashboard Avançado", "icon": "BarChart3"},
        ]
    },
    Department.FINANCE: {
        "label": "Financeiro",
        "icon": "Landmark",
        "items": [
            {"path": "/dashboard/admin/finance", "label": "Dashboard Financeiro", "icon": "BarChart3"},
            {"path": "/dashboard/admin/billing", "label": "Cobrança & Renovações", "icon": "CalendarClock"},
            {"path": "/dashboard/admin/orders", "label": "Ordens de Trading", "icon": "Receipt"},
            {"path": "/dashboard/admin/admission-fees", "label": "Taxas de Admissão", "icon": "CreditCard"},
            {"path": "/dashboard/admin/fiat-deposits", "label": "Depósitos Fiat", "icon": "ArrowUpToLine"},
            {"path": "/dashboard/admin/fiat-withdrawals", "label": "Levantamentos Fiat", "icon": "ArrowDownToLine"},
            {"path": "/dashboard/admin/crypto-withdrawals", "label": "Levantamentos Crypto", "icon": "Bitcoin"},
            {"path": "/dashboard/admin/bank-accounts", "label": "Contas de Clientes", "icon": "Users"},
            {"path": "/dashboard/admin/contas-bancarias", "label": "Contas Bancárias", "icon": "Landmark"},
            {"path": "/dashboard/admin/cold-wallet", "label": "Cold Wallet", "icon": "Shield"},
            {"path": "/dashboard/finance/balance-adjustments", "label": "Ajustes de Saldo", "icon": "ArrowLeftRight"},
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
            {"path": "/dashboard/otc", "label": "Dashboard", "icon": "LayoutDashboard"},
            {"path": "/dashboard/trading-desk/institutional", "label": "Mesa Institucional", "icon": "Gauge"},
            {"path": "/dashboard/otc/pipeline", "label": "Pipeline", "icon": "Kanban"},
            {"path": "/dashboard/otc/clients", "label": "Clientes", "icon": "Building"},
            {"path": "/dashboard/otc/leads", "label": "Leads", "icon": "UserPlus"},
            {"path": "/dashboard/otc/quotes", "label": "RFQ", "icon": "FileText"},
            {"path": "/dashboard/crm/otc-deals", "label": "Negócios", "icon": "ArrowLeftRight"},
            {"path": "/dashboard/otc/execution", "label": "Execução", "icon": "Zap"},
            {"path": "/dashboard/otc/settlement", "label": "Liquidação", "icon": "Wallet"},
            {"path": "/dashboard/otc/invoices", "label": "Faturas", "icon": "Receipt"},
            {"path": "/dashboard/crm/commissions", "label": "Comissões", "icon": "Banknote"},
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
    Department.TEAM_HUB: {
        "label": "Team Hub",
        "icon": "Mail",
        "items": [
            {"path": "/dashboard/team-hub/dashboard", "label": "Dashboard", "icon": "LayoutDashboard"},
            {"path": "/dashboard/team-hub", "label": "Team Hub", "icon": "Mail"},
        ]
    },
    Department.TRANSACTION_APPROVAL: {
        "label": "Multi-Sign",
        "icon": "ShieldCheck",
        "items": [
            {"path": "/dashboard/approvals", "label": "Aprovações", "icon": "CheckCircle"},
            {"path": "/dashboard/vault/wallets", "label": "Cofre", "icon": "Vault"},
            {"path": "/dashboard/vault", "label": "Transações", "icon": "ArrowDownUp"},
            {"path": "/dashboard/vault/signatories", "label": "Signatários", "icon": "Users"},
        ]
    },
    Department.RISK_COMPLIANCE: {
        "label": "Risk & Compliance",
        "icon": "FileSearch",
        "items": [
            {"path": "/dashboard/risk/dashboard", "label": "Dashboard Risco", "icon": "Shield"},
            {"path": "/dashboard/risk/kyc-verifications", "label": "Verificações KYC/KYB", "icon": "UserCheck"},
            {"path": "/dashboard/risk/kyt-forensic", "label": "KYT Forensic", "icon": "FileSearch"},
        ]
    },
    Department.TOKENIZATION: {
        "label": "Tokenização",
        "icon": "Gem",
        "items": [
            {"path": "/dashboard/tokenization", "label": "Tokens", "icon": "Gem"},
            {"path": "/dashboard/tokenization/issue", "label": "Emitir Token", "icon": "FilePlus2"},
            {"path": "/dashboard/tokenization/mint-burn", "label": "Mint & Burn", "icon": "Flame"},
            {"path": "/dashboard/tokenization/pricing", "label": "Definir Preço", "icon": "DollarSign"},
            {"path": "/dashboard/tokenization/management", "label": "Gestão", "icon": "Settings2"},
        ]
    },
    Department.ESCROW: {
        "label": "Escrow",
        "icon": "Lock",
        "items": [
            {"path": "/dashboard/escrow", "label": "Dashboard", "icon": "LayoutDashboard"},
            {"path": "/dashboard/escrow/deals", "label": "Deals", "icon": "FileText"},
            {"path": "/dashboard/escrow/fees", "label": "Fee Revenue", "icon": "DollarSign"},
        ]
    },
    Department.LAUNCHPAD: {
        "label": "Launchpad",
        "icon": "Rocket",
        "items": [
            {"path": "/dashboard/admin/launchpad", "label": "Gerir Token Sales", "icon": "Rocket"},
        ]
    },
    Department.COMMERCIAL: {
        "label": "Gestão Comercial",
        "icon": "BarChart3",
        "items": [
            {"path": "/dashboard/commercial", "label": "Dashboard", "icon": "BarChart3"},
            {"path": "/dashboard/commercial/sellers", "label": "Vendedores", "icon": "Users"},
            {"path": "/dashboard/commercial/teams", "label": "Equipas", "icon": "Users"},
            {"path": "/dashboard/commercial/goals", "label": "Metas", "icon": "Target"},
            {"path": "/dashboard/commercial/products", "label": "Produtos", "icon": "Briefcase"},
            {"path": "/dashboard/commercial/deals", "label": "Negócios", "icon": "Handshake"},
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
