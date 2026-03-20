import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import CurrencySelector from '../../components/CurrencySelector';
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
  CreditCard
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for dynamic menu items
const iconMap = {
  LayoutDashboard, Wallet, History, TrendingUp, PieChart, Shield, Users, Gift,
  BarChart3, UserCheck, Globe, UserCog, Ticket, User, ArrowDownUp, DollarSign,
  ArrowUpToLine, ArrowDownToLine, Bitcoin, Send, HelpCircle, Book, Headphones,
  Settings, Settings2, Landmark, Lock, Sliders, Receipt, GitBranch, CreditCard
};

// Department icon and color mapping
const departmentConfig = {
  portfolio: { icon: LayoutDashboard, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  admin: { icon: Settings, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  management: { icon: Settings2, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  finance: { icon: Landmark, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  crm: { icon: Users, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  support: { icon: Headphones, color: 'text-gold-400', bgColor: 'bg-gold-500/20' },
};

const DashboardLayout = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuStructure, setMenuStructure] = useState([]);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});

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
        const response = await axios.get(`${API_URL}/api/permissions/menus`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMenuStructure(response.data.menus || []);
        
        // All menus start collapsed by default
        setExpandedMenus({});
      } catch (err) {
        console.error('Failed to fetch menu structure:', err);
        setMenuStructure([{
          department: 'portfolio',
          label: 'Portfolio',
          icon: 'LayoutDashboard',
          items: [
            { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
            { path: '/dashboard/wallets', label: 'Carteiras', icon: 'Wallet' },
          ]
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [token, location.pathname]);

  // Fetch notifications periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const toggleMenu = (department) => {
    setExpandedMenus(prev => ({
      ...prev,
      [department]: !prev[department]
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
    return menu.items?.some(item => isPathActive(item.path, item.path === '/dashboard'));
  };

  // Get total notifications for a department
  const getDepartmentNotificationCount = (menu) => {
    return menu.items?.reduce((total, item) => {
      return total + (notifications[item.path] || 0);
    }, 0) || 0;
  };

  const SubNavItem = ({ to, icon: iconName, label, notificationCount }) => {
    const Icon = getIcon(iconName);
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `flex items-center justify-between pl-10 pr-4 py-2 rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-gold-500/10 text-gold-400'
              : 'text-gray-500 hover:text-gray-300 hover:bg-zinc-800/30'
          }`
        }
      >
        <div className="flex items-center gap-3">
          <Icon size={14} />
          {(sidebarOpen || mobileMenuOpen) && <span className="text-sm">{label}</span>}
        </div>
        {notificationCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </NavLink>
    );
  };

  const MenuSection = ({ menu, isMobile = false }) => {
    const config = departmentConfig[menu.department] || departmentConfig.portfolio;
    const DeptIcon = config.icon;
    const isExpanded = expandedMenus[menu.department];
    const isActive = isMenuActive(menu);
    const deptNotificationCount = getDepartmentNotificationCount(menu);

    // All departments use accordion style now (including Portfolio)
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
                <span className="font-medium text-sm">{menu.label}</span>
                {deptNotificationCount > 0 && !isExpanded && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {deptNotificationCount > 99 ? '99+' : deptNotificationCount}
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            
            {isExpanded && (
              <div className="mt-1 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                {menu.items?.map((item) => (
                  <SubNavItem 
                    key={item.path} 
                    to={item.path} 
                    icon={item.icon} 
                    label={item.label}
                    notificationCount={notifications[item.path] || 0}
                  />
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
                {menu.label}
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
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  // Separate portfolio from other menus
  const portfolioMenu = menuStructure.find(m => m.department === 'portfolio');
  const adminMenus = menuStructure.filter(m => m.department !== 'portfolio');

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
          {/* Portfolio Menu */}
          {portfolioMenu && (
            <MenuSection menu={portfolioMenu} />
          )}

          {/* Admin/Staff Menus */}
          {adminMenus.length > 0 && (
            <div className="pt-4 border-t border-gold-800/20 space-y-2">
              {sidebarOpen && (
                <p className="px-4 text-xs text-gold-400 uppercase mb-2 tracking-wider">
                  Gestão
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
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-2 relative"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            {Object.values(notifications).reduce((a, b) => a + b, 0) > 0 && !mobileMenuOpen && (
              <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/95 pt-16 overflow-y-auto">
          <nav className="p-4 space-y-4">
            {/* Portfolio Menu */}
            {portfolioMenu && (
              <MenuSection menu={portfolioMenu} isMobile={true} />
            )}
            
            {/* Admin/Staff Menus */}
            {adminMenus.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gold-800/20 space-y-2">
                <p className="px-4 text-xs text-gold-400 uppercase mb-2 tracking-wider">
                  Gestão
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
        {/* Top Bar with Currency Selector */}
        <div className="hidden md:flex justify-end items-center px-8 py-4 border-b border-zinc-800/50">
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
