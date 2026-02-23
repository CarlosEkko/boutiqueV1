import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { 
  Users, 
  TrendingUp, 
  Wallet,
  Gift,
  CheckCircle,
  Clock,
  Shield,
  DollarSign
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminOverview = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Loading...</div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subValue }) => (
    <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-3xl font-light mt-1 ${color || 'text-white'}`}>{value}</p>
            {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
          </div>
          <div className={`w-14 h-14 rounded-full bg-${color?.replace('text-', '')}/20 flex items-center justify-center`} 
               style={{ backgroundColor: color ? `${color.replace('text-', '')}20` : 'rgba(165, 122, 80, 0.2)' }}>
            <Icon className={color || 'text-gold-400'} size={28} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of platform statistics</p>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-lg text-gold-400 mb-4 flex items-center gap-2">
          <Users size={20} /> Users
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Users" 
            value={stats?.users?.total || 0}
            icon={Users}
            color="text-blue-400"
          />
          <StatCard 
            title="Approved Users" 
            value={stats?.users?.approved || 0}
            icon={CheckCircle}
            color="text-green-400"
          />
          <StatCard 
            title="Pending Approval" 
            value={stats?.users?.pending || 0}
            icon={Clock}
            color="text-gold-400"
          />
          <StatCard 
            title="Admins" 
            value={stats?.users?.admins || 0}
            icon={Shield}
            color="text-purple-400"
          />
        </div>
      </div>

      {/* KYC Stats */}
      <div>
        <h2 className="text-lg text-gold-400 mb-4 flex items-center gap-2">
          <Shield size={20} /> KYC Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            title="KYC Approved" 
            value={stats?.kyc?.approved || 0}
            icon={CheckCircle}
            color="text-green-400"
          />
          <StatCard 
            title="KYC Pending" 
            value={stats?.kyc?.pending || 0}
            icon={Clock}
            color="text-gold-400"
          />
        </div>
      </div>

      {/* Investment Stats */}
      <div>
        <h2 className="text-lg text-gold-400 mb-4 flex items-center gap-2">
          <TrendingUp size={20} /> Investments
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Opportunities" 
            value={stats?.investments?.total_opportunities || 0}
            icon={TrendingUp}
            color="text-blue-400"
          />
          <StatCard 
            title="Open Opportunities" 
            value={stats?.investments?.open_opportunities || 0}
            icon={TrendingUp}
            color="text-green-400"
          />
          <StatCard 
            title="Total Investments" 
            value={stats?.investments?.total_investments || 0}
            icon={DollarSign}
            color="text-gold-400"
          />
          <StatCard 
            title="Total Invested" 
            value={`$${(stats?.investments?.total_invested_amount || 0).toLocaleString()}`}
            icon={DollarSign}
            color="text-green-400"
          />
        </div>
      </div>

      {/* Other Stats */}
      <div>
        <h2 className="text-lg text-gold-400 mb-4 flex items-center gap-2">
          <Wallet size={20} /> Platform
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Total Wallets" 
            value={stats?.wallets?.total || 0}
            icon={Wallet}
            color="text-blue-400"
          />
          <StatCard 
            title="Total Transactions" 
            value={stats?.transactions?.total || 0}
            icon={TrendingUp}
            color="text-gold-400"
          />
          <StatCard 
            title="Active Invite Codes" 
            value={stats?.invite_codes?.active || 0}
            icon={Gift}
            color="text-purple-400"
            subValue={`${stats?.invite_codes?.total || 0} total`}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
