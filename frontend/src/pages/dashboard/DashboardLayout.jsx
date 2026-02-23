import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  ChevronLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useState } from 'react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/dashboard/wallets', icon: Wallet, label: 'Wallets' },
    { to: '/dashboard/transactions', icon: History, label: 'Transactions' },
    { to: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
    { to: '/dashboard/roi', icon: PieChart, label: 'ROI' },
    { to: '/dashboard/transparency', icon: Shield, label: 'Transparency' },
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
            ? 'bg-amber-600/20 text-amber-400 border-l-2 border-amber-500'
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
        className={`hidden md:flex flex-col bg-zinc-950 border-r border-amber-900/20 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-amber-900/20">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-xl">K</span>
              </div>
              {sidebarOpen && (
                <span className="text-xl font-light text-white">
                  <span className="text-amber-400">Krypto</span>box
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
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-amber-900/20">
          {sidebarOpen && (
            <div className="mb-4 px-4">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-white font-medium truncate">{user?.name}</p>
              <p className="text-xs text-amber-400">{user?.membership_level || 'Standard'}</p>
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
          >
            <LogOut size={20} />
            {sidebarOpen && 'Logout'}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950 border-b border-amber-900/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold">K</span>
            </div>
            <span className="text-lg font-light text-white">
              <span className="text-amber-400">Krypto</span>box
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
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-900/20 mt-4"
            >
              <LogOut size={20} />
              Logout
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
