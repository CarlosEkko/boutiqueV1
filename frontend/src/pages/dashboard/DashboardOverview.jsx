import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DashboardOverview = () => {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/dashboard/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOverview(response.data);
      } catch (err) {
        if (err.response?.status === 403) {
          setError('pending_approval');
        } else {
          setError(err.response?.data?.detail || 'Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchOverview();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Loading...</div>
      </div>
    );
  }

  if (error === 'pending_approval') {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="bg-zinc-900/50 border-gold-800/30">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold-500/20 flex items-center justify-center">
              <Clock className="text-gold-400" size={32} />
            </div>
            <h2 className="text-2xl font-light text-white mb-2">Account Pending Approval</h2>
            <p className="text-gray-400 mb-6">
              Your account is currently under review. Our team will verify your information and approve your access shortly.
            </p>
            <div className="space-y-3 text-left bg-zinc-800/50 rounded-lg p-4">
              <h3 className="text-gold-400 font-medium">What's next?</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-500 mt-0.5" />
                  Account created successfully
                </li>
                <li className="flex items-start gap-2">
                  <Clock size={16} className="text-gold-400 mt-0.5" />
                  Pending admin approval (24-48 hours)
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-gray-500 mt-0.5" />
                  KYC verification (after approval)
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8">
        <AlertCircle className="mx-auto mb-2" size={32} />
        {error}
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">
            Welcome back, <span className="text-gold-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 mt-1">Here's your portfolio overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${
            overview?.kyc_status === 'approved' 
              ? 'bg-green-900/30 text-green-400' 
              : 'bg-gold-800/30 text-gold-400'
          }`}>
            KYC: {overview?.kyc_status || 'Not Started'}
          </Badge>
          <Badge className="bg-gold-500/20 text-gold-400">
            {overview?.membership_level || 'Standard'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Portfolio</p>
                <p className="text-2xl font-light text-white mt-1">
                  {formatCurrency(overview?.total_portfolio_value)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                <PieChart className="text-gold-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Wallet Balance</p>
                <p className="text-2xl font-light text-white mt-1">
                  {formatCurrency(overview?.wallet_value)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Wallet className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Invested</p>
                <p className="text-2xl font-light text-white mt-1">
                  {formatCurrency(overview?.invested_value)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Expected Returns</p>
                <p className="text-2xl font-light text-green-400 mt-1">
                  +{formatCurrency(overview?.expected_returns)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                <ArrowUpRight className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Allocation & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white font-light">Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.wallet_allocation?.length > 0 ? (
              <div className="space-y-4">
                {overview.wallet_allocation.map((asset, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-medium">
                        {asset.asset?.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-white">{asset.asset}</p>
                        <p className="text-sm text-gray-400">{asset.balance?.toFixed(6)}</p>
                      </div>
                    </div>
                    <p className="text-white">{formatCurrency(asset.value_usd)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Wallet className="mx-auto mb-2" size={32} />
                <p>No assets in wallet yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white font-light">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.recent_transactions?.length > 0 ? (
              <div className="space-y-4">
                {overview.recent_transactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gold-800/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' || tx.type === 'return'
                          ? 'bg-green-600/20'
                          : 'bg-red-600/20'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'return' ? (
                          <ArrowDownRight className="text-green-400" size={16} />
                        ) : (
                          <ArrowUpRight className="text-red-400" size={16} />
                        )}
                      </div>
                      <div>
                        <p className="text-white capitalize">{tx.type}</p>
                        <p className="text-xs text-gray-400">{tx.currency}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      tx.type === 'deposit' || tx.type === 'return'
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'return' ? '+' : '-'}
                      {tx.amount} {tx.currency}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="mx-auto mb-2" size={32} />
                <p>No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
