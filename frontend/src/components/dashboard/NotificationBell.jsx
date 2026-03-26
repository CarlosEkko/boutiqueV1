import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  ArrowUpToLine,
  ArrowDownToLine,
  CreditCard,
  Bitcoin,
  UserCheck,
  Landmark,
  MessageSquare,
  UserPlus,
  Briefcase,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const iconMap = {
  ArrowUpToLine,
  ArrowDownToLine,
  CreditCard,
  Bitcoin,
  UserCheck,
  Landmark,
  MessageSquare,
  UserPlus,
  Briefcase,
};

const colorMap = {
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const NotificationBell = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Only show for admin/internal users
  const isStaff = user?.is_admin || user?.user_type === 'internal';

  useEffect(() => {
    if (!token || !isStaff) return;

    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/notifications/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(response.data.notifications || []);
        setTotalCount(response.data.total_count || 0);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [token, isStaff]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (link) => {
    setIsOpen(false);
    navigate(link);
  };

  if (!isStaff) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
        data-testid="notification-bell"
      >
        <Bell size={20} className={totalCount > 0 ? 'text-gold-400' : 'text-gray-400'} />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium px-1">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-gold-800/30 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="text-white font-medium">Notificações</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-gray-500 text-sm">Sem notificações pendentes</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {notifications.map((notif, index) => {
                  const Icon = iconMap[notif.icon] || Bell;
                  const colorClass = colorMap[notif.color] || colorMap.yellow;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleNotificationClick(notif.link)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors text-left"
                    >
                      <div className={`p-2 rounded-lg border ${colorClass}`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {notif.title}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {notif.count} {notif.count === 1 ? 'item' : 'itens'} pendente{notif.count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2 py-1 rounded-full">
                        {notif.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
              <p className="text-xs text-gray-500 text-center">
                Total de {totalCount} {totalCount === 1 ? 'item' : 'itens'} a aguardar ação
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
