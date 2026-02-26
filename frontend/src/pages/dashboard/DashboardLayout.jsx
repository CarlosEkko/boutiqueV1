import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
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
  Users,
  Gift,
  Settings,
  BarChart3,
  UserCheck,
  Globe,
  UserCog,
  Ticket,
  User
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useState } from 'react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.is_admin;

  const userNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard.nav.overview'), end: true },
    { to: '/dashboard/wallets', icon: Wallet, label: t('dashboard.nav.wallets') },
    { to: '/dashboard/transactions', icon: History, label: t('dashboard.nav.transactions') },
    { to: '/dashboard/investments', icon: TrendingUp, label: t('dashboard.nav.investments') },
    { to: '/dashboard/roi', icon: PieChart, label: t('dashboard.nav.roi') },
    { to: '/dashboard/transparency', icon: Shield, label: t('dashboard.nav.transparency') },
    { to: '/dashboard/kyc', icon: UserCheck, label: t('dashboard.nav.kycVerification') },
  ];

  const adminNavItems = [
    { to: '/dashboard/admin', icon: BarChart3, label: t('dashboard.nav.adminOverview'), end: true },
    { to: '/dashboard/admin/regional', icon: Globe, label: 'Métricas Regionais' },
    { to: '/dashboard/admin/staff', icon: UserCog, label: 'Gestão de Equipa' },
    { to: '/dashboard/admin/tickets', icon: Ticket, label: 'Tickets de Suporte' },
    { to: '/dashboard/admin/users', icon: Users, label: t('dashboard.nav.users') },
    { to: '/dashboard/admin/kyc', icon: UserCheck, label: t('dashboard.nav.kycKyb') },
    { to: '/dashboard/admin/opportunities', icon: TrendingUp, label: t('dashboard.nav.opportunities') },
    { to: '/dashboard/admin/transparency', icon: Shield, label: t('dashboard.nav.transparency') },
    { to: '/dashboard/admin/invites', icon: Gift, label: t('dashboard.nav.inviteCodes') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavItem = ({ to, icon: Icon, label, end }) => (
    <NavLink
      to={to}
      end={end}
      onClick={() => setMobileMenuOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-gold-500/20 text-gold-400 border-l-2 border-gold-400'
            : 'text-gray-400 hover:text-white hover:bg-zinc-800/50'
        }`
      }
    >
      <Icon size={20} />
      {(sidebarOpen || mobileMenuOpen) && <span className="font-medium">{label}</span>}
    </NavLink>
  );

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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* User Navigation */}
          <div className="mb-4">
            {sidebarOpen && <p className="px-4 text-xs text-gray-500 uppercase mb-2">{t('dashboard.layout.portfolio')}</p>}
            {userNavItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Admin Navigation - Only visible to admins */}
          {isAdmin && (
            <div className="pt-4 border-t border-gold-800/20">
              {sidebarOpen && <p className="px-4 text-xs text-gold-400 uppercase mb-2">{t('dashboard.layout.admin')}</p>}
              {adminNavItems.map((item) => (
                <NavItem key={item.to} {...item} />
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
              <p className="text-xs text-gold-400">{user?.membership_level || 'Standard'}</p>
            </div>
          )}
          <NavLink
            to="/profile"
            className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-gray-400 hover:text-gold-400 hover:bg-gold-900/20 transition-colors"
          >
            <User size={20} />
            {sidebarOpen && <span className="font-medium">Meu Perfil</span>}
          </NavLink>
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
            className="text-white p-2"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/95 pt-16">
          <nav className="p-4 space-y-2">
            {/* User Navigation */}
            <p className="px-4 text-xs text-gray-500 uppercase mb-2">{t('dashboard.layout.portfolio')}</p>
            {userNavItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            
            {/* Admin Navigation */}
            {isAdmin && (
              <div className="pt-4 mt-4 border-t border-gold-800/20">
                <p className="px-4 text-xs text-gold-400 uppercase mb-2">{t('dashboard.layout.admin')}</p>
                {adminNavItems.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            )}
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 mt-4"
            >
              <LogOut size={20} />
              {t('dashboard.layout.logout')}
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="md:p-8 p-4 pt-20 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
