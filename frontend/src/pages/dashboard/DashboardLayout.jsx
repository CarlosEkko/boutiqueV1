import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import CurrencySelector from '../../components/CurrencySelector';
import LanguageSelector from '../../components/LanguageSelector';
import NotificationBell from '../../components/dashboard/NotificationBell';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  TrendingUp, 
  PieChart,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Users,
  Gift,
  BarChart3,
  UserCheck,
  Globe,
  UserCog,
  Ticket,
  User,
  ArrowDownUp,
  DollarSign,
  ArrowUpToLine,
  ArrowDownToLine,
  Bitcoin,
  Send,
  HelpCircle,
  Book,
  Headphones,
  Settings,
  Settings2,
  Landmark,
  Lock,
  Sliders,
  Receipt,
  GitBranch,
  CreditCard,
  Banknote,
  FileCheck,
  UserCircle,
  Briefcase,
  Activity,
  Eye,
  Handshake,
  UserPlus,
  Target,
  Contact,
  CheckSquare,
  Kanban,
  FileText,
  Zap,
  Building,
  Mail,
  ShieldCheck,
  CheckCircle,
  ArrowLeftRight,
  FileSearch,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for dynamic menu items
const iconMap = {
  LayoutDashboard, Wallet, History, TrendingUp, PieChart, Shield, Users, Gift,
  BarChart3, UserCheck, Globe, UserCog, Ticket, User, ArrowDownUp, DollarSign,
  ArrowUpToLine, ArrowDownToLine, Bitcoin, Send, HelpCircle, Book, Headphones,
  Settings, Settings2, Landmark, Lock, Sliders, Receipt, GitBranch, CreditCard,
  Banknote, FileCheck, UserCircle, Briefcase, Activity, Eye, Handshake, UserPlus,
  Target, Contact, CheckSquare, Kanban, FileText, Zap, Building, Mail, ShieldCheck, CheckCircle,
  ArrowLeftRight, FileSearch,
  ShieldAlert
};

// Department icon and color mapping
const departmentConfig = {
  // Main client menus
  portfolio: { icon: LayoutDashboard, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  investimentos: { icon: TrendingUp, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  transparencia: { icon: Shield, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  account: { icon: UserCircle, color: 'text-gold-400', bgColor: 'bg-gold-500/20' },
  otc_trading: { icon: Briefcase, color: 'text-gold-400', bgColor: 'bg-gold-500/20' },
  // Submenu colors
  ativos: { icon: Wallet, color: 'text-blue-300', bgColor: 'bg-blue-500/10' },
  operacoes_crypto: { icon: Bitcoin, color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  operacoes_fiat: { icon: Banknote, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  transacoes: { icon: History, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  // Admin/staff menus
  admin: { icon: Settings, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  management: { icon: Settings2, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  finance: { icon: Landmark, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  crm: { icon: Users, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  support: { icon: Headphones, color: 'text-gold-400', bgColor: 'bg-gold-500/20' },
  otc_desk: { icon: Briefcase, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  team_hub: { icon: Mail, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  transaction_approval: { icon: ShieldCheck, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  vault: { icon: ShieldCheck, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  risk_compliance: { icon: FileSearch, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

// Translation mapping for menu labels from backend to frontend i18n keys
const labelTranslationMap = {
  // Main menus (department labels)
  'Portefólio': 'sidebar.portfolio',
  'Portfolio': 'sidebar.portfolio',
  'Investimentos': 'sidebar.investimentos',
  'Transparência': 'sidebar.transparencia',
  'Perfil': 'sidebar.perfil',
  'Admin': 'sidebar.admin',
  'Gestão': 'sidebar.gestao',
  'Financeiro': 'sidebar.financeiro',
  'CRM': 'sidebar.crm',
  'OTC Desk': 'sidebar.otcDesk',
  'Suporte': 'sidebar.suporte',
  // Submenus
  'Ativos': 'sidebar.ativos',
  'Operações Crypto': 'sidebar.operacoesCrypto',
  'Operações Fiat': 'sidebar.operacoesFiat',
  'Transações': 'sidebar.transacoes',
  // Items - Portfolio
  'Dashboard': 'sidebar.dashboard',
  'Exchange': 'sidebar.exchange',
  'Carteiras': 'sidebar.carteiras',
  'Whitelist': 'sidebar.whitelist',
  'Depósito Crypto': 'sidebar.depositoCrypto',
  'Levantamento Crypto': 'sidebar.levantamentoCrypto',
  'Depósito Fiat': 'sidebar.depositoFiat',
  'Levantamento Fiat': 'sidebar.levantamentoFiat',
  // Items - Account
  'Meu Perfil': 'sidebar.meuPerfil',
  'Dados Bancários': 'sidebar.dadosBancarios',
  'Segurança': 'sidebar.seguranca',
  'Verificação KYC': 'sidebar.verificacaoKyc',
  // Items - Admin
  'Visão Geral': 'sidebar.visaoGeral',
  'Métricas Regionais': 'sidebar.metricasRegionais',
  'Gestão de Equipa': 'sidebar.gestaoEquipa',
  'Clientes': 'sidebar.clientes',
  'KYC/KYB': 'sidebar.kycKyb',
  'Oportunidades': 'sidebar.oportunidades',
  'Códigos Convite': 'sidebar.codigosConvite',
  // Items - Management
  'Permissões': 'sidebar.permissoes',
  'Menus de Clientes': 'sidebar.menusClientes',
  'Taxas & Limites': 'sidebar.taxasLimites',
  'Configurações': 'sidebar.configuracoes',
  'Referências': 'sidebar.referencias',
  'Dashboard Avançado': 'sidebar.dashboardAvancado',
  // Items - Finance
  'Ordens de Trading': 'sidebar.ordensTrading',
  'Taxas de Admissão': 'sidebar.taxasAdmissao',
  'Depósitos Fiat': 'sidebar.depositosFiat',
  'Levantamentos Fiat': 'sidebar.levantamentosFiat',
  'Levantamentos Crypto': 'sidebar.levantamentosCrypto',
  'Contas de Clientes': 'sidebar.contasClientes',
  'Contas da Empresa': 'sidebar.contasEmpresa',
  // Items - CRM
  'Dashboard CRM': 'sidebar.dashboardCrm',
  'Meus Clientes': 'sidebar.meusClientes',
  'Fornecedores': 'sidebar.fornecedores',
  'Leads': 'sidebar.leads',
  'Negociações': 'sidebar.negociacoes',
  'Contactos': 'sidebar.contactos',
  'Tarefas': 'sidebar.tarefas',
  'Pipeline de Vendas': 'sidebar.pipelineVendas',
  // Items - OTC Desk
  'Dashboard OTC': 'sidebar.dashboardOtc',
  'Leads OTC': 'sidebar.leadsOtc',
  'Pipeline': 'sidebar.pipeline',
  'Clientes OTC': 'sidebar.clientesOtc',
  'RFQ': 'sidebar.rfq',
  'Negócios OTC': 'sidebar.negociosOtc',
  'Negócios': 'sidebar.negocios',
  'Cotações': 'sidebar.cotacoes',
  'Execução': 'sidebar.execucao',
  'Liquidação': 'sidebar.liquidacao',
  'Faturas': 'sidebar.faturas',
  'Comissões': 'sidebar.comissoes',
  'Clientes': 'sidebar.clientes',
  // Items - Support
  'Tickets de Suporte': 'sidebar.ticketsSuporte',
  'Base de Conhecimento': 'sidebar.baseConhecimento',
  // Misc
  'ROI': 'dashboard.nav.roi',
  'Investimentos': 'sidebar.investimentos',
  'Risk & Compliance': 'sidebar.riskCompliance',
  'Dashboard Risco': 'sidebar.dashboardRisco',
  'KYT Forensic': 'sidebar.kytForensic',
  'Security Dashboard': 'sidebar.securityDashboard',
};

const DashboardLayout = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  // Helper to translate labels from backend
  const translateLabel = (label) => {
    const key = labelTranslationMap[label];
    if (key) {
      const translated = t(key, label);
      return translated !== key ? translated : label;
    }
    return label;
  };
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuStructure, setMenuStructure] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [expandedSubmenus, setExpandedSubmenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [allowedClientMenus, setAllowedClientMenus] = useState(null); // null = all allowed, array = restricted

  // Fetch notification counts for finance items
  const fetchNotifications = useCallback(async () => {
    if (!token || !user?.is_admin) return;
    
    try {
      const [depositsRes, withdrawalsRes, ordersRes, cryptoRes, ticketsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/trading/admin/bank-transfers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/trading/admin/fiat-withdrawals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/trading/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/crypto-wallets/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/kb/admin/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const counts = {};
      
      if (depositsRes.status === 'fulfilled') {
        const pending = depositsRes.value.data?.filter(d => d.status === 'pending' || d.status === 'awaiting_approval')?.length || 0;
        if (pending > 0) counts['/dashboard/admin/fiat-deposits'] = pending;
      }
      
      if (withdrawalsRes.status === 'fulfilled') {
        const pending = withdrawalsRes.value.data?.filter(w => w.status === 'pending')?.length || 0;
        if (pending > 0) counts['/dashboard/admin/fiat-withdrawals'] = pending;
      }
      
      if (ordersRes.status === 'fulfilled') {
        const pending = ordersRes.value.data?.filter(o => o.status === 'pending')?.length || 0;
        if (pending > 0) counts['/dashboard/admin/orders'] = pending;
      }
      
      if (cryptoRes.status === 'fulfilled') {
        const pending = cryptoRes.value.data?.withdrawals?.filter(w => w.status === 'pending')?.length || 0;
        if (pending > 0) counts['/dashboard/admin/crypto-withdrawals'] = pending;
      }
      
      if (ticketsRes.status === 'fulfilled') {
        const pending = ticketsRes.value.data?.filter(t => t.status === 'open' || t.status === 'pending')?.length || 0;
        if (pending > 0) counts['/dashboard/admin/tickets'] = pending;
      }

      setNotifications(counts);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token, user?.is_admin]);

  // Fetch menu structure from API
  useEffect(() => {
    const fetchMenus = async () => {
      if (!token) return;
      
      try {
        // Fetch menu structure
        const response = await axios.get(`${API_URL}/api/permissions/menus`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMenuStructure(response.data.menus || []);
        
        // Fetch personalized client menus (only for non-internal users)
        if (user?.user_type !== 'internal' && !user?.is_admin) {
          try {
            const clientMenusRes = await axios.get(`${API_URL}/api/client-menus/my-menus`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (clientMenusRes.data.is_custom) {
              setAllowedClientMenus(clientMenusRes.data.menus || []);
            }
          } catch (err) {
            console.error('Failed to fetch client menus:', err);
          }
        }
        
        // All menus start collapsed by default
        setExpandedMenus({});
        setExpandedSubmenus({});
      } catch (err) {
        console.error('Failed to fetch menu structure:', err);
        // Fallback menu
        setMenuStructure([{
          department: 'portfolio',
          label: 'Portefolio',
          icon: 'LayoutDashboard',
          submenus: [
            {
              id: 'ativos',
              label: 'Ativos',
              icon: 'Wallet',
              items: [
                { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
                { path: '/dashboard/wallets', label: 'Carteiras', icon: 'Wallet' },
              ]
            }
          ]
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [token, user?.user_type, user?.is_admin]);

  // Fetch notifications periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Auto-expand menu that contains current path (but NOT submenus - they should be clicked)
  useEffect(() => {
    if (menuStructure.length === 0) return;
    
    const currentPath = location.pathname;
    
    // Find which menu contains the current path - only expand the parent menu
    for (const menu of menuStructure) {
      // Check if menu has submenus (hierarchical structure like Portfolio)
      if (menu.submenus) {
        for (const submenu of menu.submenus) {
          // Check if submenu has a direct path (like Transacoes)
          if (submenu.path && (currentPath === submenu.path || currentPath.startsWith(submenu.path + '/'))) {
            setExpandedMenus(prev => ({ ...prev, [menu.department]: true }));
            return;
          }
          // Check if any item in the submenu matches - only expand parent menu, not submenu
          if (submenu.items) {
            const matchingItem = submenu.items.find(item => 
              currentPath === item.path || currentPath.startsWith(item.path + '/')
            );
            if (matchingItem) {
              setExpandedMenus(prev => ({ ...prev, [menu.department]: true }));
              // Don't auto-expand submenus - user must click to expand
              return;
            }
          }
        }
      }
      
      // Check flat items (for non-hierarchical menus like Investimentos)
      if (menu.items) {
        const matchingItem = menu.items.find(item => 
          currentPath === item.path || currentPath.startsWith(item.path + '/')
        );
        if (matchingItem) {
          setExpandedMenus(prev => ({ ...prev, [menu.department]: true }));
          return;
        }
      }
    }
  }, [location.pathname, menuStructure]);

  // Toggle main menu - only closes when clicking the parent
  const toggleMenu = (department) => {
    setExpandedMenus(prev => {
      const isCurrentlyOpen = prev[department];
      // Close all menus, only open the clicked one if it was closed
      return isCurrentlyOpen ? {} : { [department]: true };
    });
    // Reset submenus when switching departments
    setExpandedSubmenus({});
  };

  // Toggle submenu
  const toggleSubmenu = (submenuId) => {
    setExpandedSubmenus(prev => ({
      ...prev,
      [submenuId]: !prev[submenuId]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getIcon = (iconName) => {
    return iconMap[iconName] || LayoutDashboard;
  };

  const isPathActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isMenuActive = (menu) => {
    // Check submenus
    if (menu.submenus) {
      for (const submenu of menu.submenus) {
        if (submenu.path && isPathActive(submenu.path)) return true;
        if (submenu.items?.some(item => isPathActive(item.path, item.path === '/dashboard'))) return true;
      }
    }
    // Check flat items
    if (menu.items) {
      return menu.items.some(item => isPathActive(item.path, item.path === '/dashboard'));
    }
    return false;
  };

  const isSubmenuActive = (submenu) => {
    if (submenu.path) return isPathActive(submenu.path);
    return submenu.items?.some(item => isPathActive(item.path, item.path === '/dashboard'));
  };

  // Get total notifications for a department
  const getDepartmentNotificationCount = (menu) => {
    let total = 0;
    if (menu.submenus) {
      for (const submenu of menu.submenus) {
        if (submenu.items) {
          total += submenu.items.reduce((sum, item) => sum + (notifications[item.path] || 0), 0);
        }
      }
    }
    if (menu.items) {
      total += menu.items.reduce((sum, item) => sum + (notifications[item.path] || 0), 0);
    }
    return total;
  };

  const NavItem = ({ to, icon: iconName, label, notificationCount }) => {
    const Icon = getIcon(iconName);
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center justify-between pl-12 pr-4 py-2 rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-gold-500/10 text-gold-400'
              : 'text-gray-500 hover:text-gray-300 hover:bg-zinc-800/30'
          }`
        }
      >
        <div className="flex items-center gap-3">
          <Icon size={14} />
          {(sidebarOpen || mobileMenuOpen) && <span className="text-sm">{translateLabel(label)}</span>}
        </div>
        {notificationCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </NavLink>
    );
  };

  // Render submenu (second level) with items (third level)
  const SubmenuSection = ({ submenu, parentExpanded }) => {
    const config = departmentConfig[submenu.id] || { icon: LayoutDashboard, color: 'text-gray-400' };
    const SubIcon = getIcon(submenu.icon) || config.icon;
    const isExpanded = expandedSubmenus[submenu.id];
    const isActive = isSubmenuActive(submenu);

    // If submenu has a direct path (like Transacoes), render as a link
    if (submenu.path && !submenu.items) {
      return (
        <NavLink
          to={submenu.path}
          className={({ isActive: linkActive }) =>
            `flex items-center gap-3 pl-8 pr-4 py-2 rounded-lg transition-all duration-200 ${
              linkActive
                ? 'bg-gold-500/10 text-gold-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-zinc-800/30'
            }`
          }
        >
          <SubIcon size={16} />
          <span className="text-sm">{translateLabel(submenu.label)}</span>
        </NavLink>
      );
    }

    // Render as expandable submenu
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => toggleSubmenu(submenu.id)}
          className={`w-full flex items-center justify-between pl-8 pr-4 py-2 rounded-lg transition-all duration-200 ${
            isActive
              ? `${config.color} bg-zinc-800/50`
              : 'text-gray-400 hover:text-gray-300 hover:bg-zinc-800/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <SubIcon size={16} />
            <span className="text-sm font-medium">{translateLabel(submenu.label)}</span>
          </div>
          {isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        
        {isExpanded && submenu.items && (
          <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
            {submenu.items.map((item) => (
              <NavItem 
                key={item.path} 
                to={item.path} 
                icon={item.icon} 
                label={item.label}
                notificationCount={notifications[item.path] || 0}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Main menu section (first level)
  const MenuSection = ({ menu, isMobile = false }) => {
    const config = departmentConfig[menu.department] || departmentConfig.portfolio;
    const DeptIcon = getIcon(menu.icon) || config.icon;
    const isExpanded = expandedMenus[menu.department];
    const isActive = isMenuActive(menu);
    const deptNotificationCount = getDepartmentNotificationCount(menu);

    const hasSubmenus = menu.submenus && menu.submenus.length > 0;
    const hasItems = menu.items && menu.items.length > 0;

    return (
      <div className="space-y-1">
        {sidebarOpen || isMobile ? (
          <>
            <button
              onClick={() => toggleMenu(menu.department)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? `${config.bgColor} ${config.color}`
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <DeptIcon size={18} />
                <span className="font-medium text-sm">{translateLabel(menu.label)}</span>
                {deptNotificationCount > 0 && !isExpanded && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {deptNotificationCount > 99 ? '99+' : deptNotificationCount}
                  </span>
                )}
              </div>
              {(hasSubmenus || hasItems) && (
                isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )
              )}
            </button>
            
            {isExpanded && (
              <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                {/* Render submenus (hierarchical structure) */}
                {hasSubmenus && menu.submenus.map((submenu) => (
                  <SubmenuSection 
                    key={submenu.id} 
                    submenu={submenu} 
                    parentExpanded={isExpanded}
                  />
                ))}
                
                {/* Render flat items (non-hierarchical menus) */}
                {hasItems && !hasSubmenus && menu.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive: linkActive }) =>
                      `flex items-center justify-between pl-10 pr-4 py-2 rounded-lg transition-all duration-200 ${
                        linkActive
                          ? 'bg-gold-500/10 text-gold-400'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-zinc-800/30'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      {React.createElement(getIcon(item.icon), { size: 14 })}
                      <span className="text-sm">{translateLabel(item.label)}</span>
                    </div>
                    {notifications[item.path] > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {notifications[item.path] > 99 ? '99+' : notifications[item.path]}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        ) : (
          // Collapsed mode - show just the icon with notification badge
          <div className="relative group">
            <button
              onClick={() => toggleMenu(menu.department)}
              className={`w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200 relative ${
                isActive
                  ? `${config.bgColor} ${config.color}`
                  : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <DeptIcon size={20} />
              {deptNotificationCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {deptNotificationCount > 9 ? '9+' : deptNotificationCount}
                </span>
              )}
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:block z-50">
              <div className="bg-zinc-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {translateLabel(menu.label)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gold-400">{t('sidebar.loading')}</div>
      </div>
    );
  }

  // Separate client menus from admin menus
  const clientMenuDepts = ['portfolio', 'investimentos', 'transparencia', 'account', 'otc_trading', 'multi_sign'];
  
  // Default menus for clients (only Portfolio and Perfil)
  const defaultClientDepts = ['portfolio', 'account'];
  
  // Filter client menus based on personalized settings
  let clientMenus = menuStructure.filter(m => clientMenuDepts.includes(m.department));
  
  // For non-admin/non-internal users, apply menu restrictions
  if (user?.user_type !== 'internal' && !user?.is_admin) {
    if (allowedClientMenus !== null && Array.isArray(allowedClientMenus)) {
      // Custom menu restrictions set by admin
      const deptToMenuKey = {
        'portfolio': 'portfolio',
        'investimentos': 'investimentos',
        'transparencia': 'transparencia',
        'account': 'perfil',
        'otc_trading': 'otc_trading',
        'multi_sign': 'multi_sign'
      };
      
      clientMenus = clientMenus.filter(m => {
        const menuKey = deptToMenuKey[m.department];
        return allowedClientMenus.includes(menuKey) || allowedClientMenus.includes(m.department);
      });
    } else {
      // No custom config — show only default menus (Portfolio + Perfil)
      clientMenus = clientMenus.filter(m => defaultClientDepts.includes(m.department));
    }
  }
  
  const adminMenus = menuStructure.filter(m => !clientMenuDepts.includes(m.department));

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar - Desktop */}
      <aside 
        className={`hidden md:flex flex-col bg-zinc-950 border-r border-gold-800/20 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gold-800/20">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2">
              <img 
                src="/logo.png" 
                alt="KBEX.io" 
                className="h-10 w-auto"
              />
              {sidebarOpen && (
                <span className="text-xl font-light text-white">
                  <span className="text-gold-400">KB</span>EX
                </span>
              )}
            </NavLink>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white p-1"
            >
              <ChevronLeft className={`transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Client Menus */}
          {clientMenus.length > 0 && (
            <div className="space-y-2">
              {clientMenus.map((menu) => (
                <MenuSection key={menu.department} menu={menu} />
              ))}
            </div>
          )}

          {/* Admin/Staff Menus */}
          {adminMenus.length > 0 && (
            <div className="pt-4 border-t border-gold-800/20 space-y-2">
              {sidebarOpen && (
                <p className="px-4 text-xs text-gold-400 uppercase mb-2 tracking-wider">
                  {t('sidebar.gestaoLabel')}
                </p>
              )}
              {adminMenus.map((menu) => (
                <MenuSection key={menu.department} menu={menu} />
              ))}
            </div>
          )}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-gold-800/20">
          {sidebarOpen && (
            <div className="mb-4 px-4">
              <p className="text-sm text-gray-400">{t('dashboard.layout.loggedInAs')}</p>
              <p className="text-white font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gold-400">{user?.internal_role || user?.membership_level || 'Standard'}</p>
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
          >
            <LogOut size={20} />
            {sidebarOpen && t('dashboard.layout.logout')}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-gold-800/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="KBEX.io" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-light text-white">
              <span className="text-gold-400">KB</span>EX
            </span>
          </NavLink>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-2 relative"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/95 pt-16 overflow-y-auto">
          <nav className="p-4 space-y-4">
            {/* Client Menus */}
            {clientMenus.length > 0 && (
              <div className="space-y-2">
                {clientMenus.map((menu) => (
                  <MenuSection key={menu.department} menu={menu} isMobile={true} />
                ))}
              </div>
            )}
            
            {/* Admin/Staff Menus */}
            {adminMenus.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gold-800/20 space-y-2">
                <p className="px-4 text-xs text-gold-400 uppercase mb-2 tracking-wider">
                  {t('sidebar.gestaoLabel')}
                </p>
                {adminMenus.map((menu) => (
                  <MenuSection key={menu.department} menu={menu} isMobile={true} />
                ))}
              </div>
            )}
            
            {/* Logout */}
            <div className="pt-4 mt-4 border-t border-gold-800/20">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 mt-2"
              >
                <LogOut size={20} />
                {t('dashboard.layout.logout')}
              </Button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar with Notifications and Currency Selector */}
        <div className="hidden md:flex justify-end items-center gap-4 px-8 py-4">
          <NotificationBell />
          <LanguageSelector />
          <CurrencySelector />
        </div>
        <div className="md:p-8 p-4 pt-20 md:pt-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
