import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { PieChart as RechartsPieChart, ResponsiveContainer, Pie, Cell, Tooltip, Legend } from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// CoinMarketCap logo URLs based on crypto symbol
const getCryptoLogo = (symbol) => {
  const cmcIds = {
    'BTC': 1, 'ETH': 1027, 'USDT': 825, 'BNB': 1839, 'SOL': 5426,
    'USDC': 3408, 'XRP': 52, 'STETH': 8085, 'DOGE': 74, 'ADA': 2010,
    'TRX': 1958, 'AVAX': 5805, 'WBTC': 3717, 'LINK': 1975, 'TON': 11419,
    'SUI': 20947, 'SHIB': 5994, 'HBAR': 4642, 'XLM': 512, 'BCH': 1831,
    'DOT': 6636, 'LEO': 3957, 'LTC': 2, 'UNI': 7083, 'NEAR': 6535,
    'ATOM': 3794, 'MATIC': 3890, 'POL': 3890, 'APT': 21794, 'PEPE': 24478,
    'ICP': 8916, 'ETC': 1321, 'RENDER': 5690, 'CRO': 3635, 'FET': 3773,
    'TAO': 22974, 'VET': 3077, 'MNT': 27075, 'ARB': 11841, 'ALGO': 4030,
    'OP': 11840, 'FIL': 2280, 'KAS': 20396, 'AAVE': 7278, 'MKR': 1518,
    'STX': 4847, 'RUNE': 4157, 'INJ': 7226, 'IMX': 10603, 'GRT': 6719,
    'FTM': 3513, 'XTZ': 2011, 'FLOW': 4558, 'NEO': 1376
  };
  const cmcId = cmcIds[symbol?.toUpperCase()];
  if (cmcId) {
    return `https://s2.coinmarketcap.com/static/img/coins/64x64/${cmcId}.png`;
  }
  return null;
};

// Fiat currency flags (using flag CDN for better compatibility)
const fiatFlags = {
  'EUR': 'https://flagcdn.com/w40/eu.png',
  'USD': 'https://flagcdn.com/w40/us.png',
  'AED': 'https://flagcdn.com/w40/ae.png',
  'BRL': 'https://flagcdn.com/w40/br.png'
};

// Colors for pie chart
const CHART_COLORS = [
  '#F7931A', // Bitcoin orange
  '#627EEA', // Ethereum blue
  '#26A17B', // Tether green
  '#2775CA', // USDC blue
  '#9945FF', // Solana purple
  '#D4AF37', // Gold for fiat
  '#E84142', // Red
  '#F0B90B', // Binance yellow
  '#00D395', // Mint
  '#FF6B6B', // Coral
];

const DashboardOverview = () => {
  const { user, token } = useAuth();
  const { t } = useLanguage();
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
            {t('dashboard.overview.welcome')}, <span className="text-gold-400">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-gray-400 mt-1">{t('dashboard.overview.heresYourPortfolio')}</p>
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
                <p className="text-sm text-gray-400">{t('dashboard.overview.totalPortfolio')}</p>
                <p className="text-2xl font-light text-white mt-1">
                  {formatCurrency(overview?.total_portfolio_value)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                <PieChartIcon className="text-gold-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('dashboard.overview.walletBalance')}</p>
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
                <p className="text-sm text-gray-400">{t('dashboard.overview.totalInvested')}</p>
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
                <p className="text-sm text-gray-400">{t('dashboard.overview.expectedReturns')}</p>
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
            <CardTitle className="text-white font-light">{t('dashboard.overview.portfolioAllocation')}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview?.wallet_allocation?.length > 0 ? (
              <div className="space-y-6">
                {/* Pie Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={overview.wallet_allocation.map((asset, index) => ({
                          name: asset.asset,
                          value: asset.value_usd,
                          color: CHART_COLORS[index % CHART_COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {overview.wallet_allocation.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <div style={{
                                backgroundColor: '#18181b',
                                border: '1px solid #3f3f46',
                                borderRadius: '8px',
                                padding: '10px 14px'
                              }}>
                                <p style={{ color: '#d4af37', fontWeight: 'bold', margin: 0 }}>{data.name}</p>
                                <p style={{ color: '#ffffff', margin: '4px 0 0 0' }}>{formatCurrency(data.value)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Asset List with Logos */}
                <div className="space-y-3 border-t border-gold-800/20 pt-4">
                  {overview.wallet_allocation.map((asset, index) => {
                    const isFiat = ['EUR', 'USD', 'AED', 'BRL'].includes(asset.asset);
                    const logo = !isFiat ? getCryptoLogo(asset.asset) : null;
                    const percentage = ((asset.value_usd / overview.total_portfolio_value) * 100).toFixed(1);
                    
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                            style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                          >
                            {isFiat ? (
                              <img 
                                src={fiatFlags[asset.asset]} 
                                alt={asset.asset} 
                                className="w-6 h-6 rounded-sm object-cover"
                              />
                            ) : logo ? (
                              <img 
                                src={logo} 
                                alt={asset.asset} 
                                className="w-7 h-7 rounded-full"
                                loading="lazy"
                                onError={(e) => { 
                                  e.target.style.display = 'none'; 
                                  e.target.parentElement.innerHTML = `<span class="text-gold-400 font-medium text-sm">${asset.asset?.slice(0, 2)}</span>`;
                                }}
                              />
                            ) : (
                              <span className="text-gold-400 font-medium text-sm">{asset.asset?.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{asset.asset}</p>
                            <p className="text-sm text-gray-400">{asset.balance?.toFixed(asset.balance < 1 ? 6 : 2)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white">{formatCurrency(asset.value_usd)}</p>
                          <p className="text-sm" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                            {percentage}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
            <CardTitle className="text-white font-light">{t('dashboard.overview.recentTransactions')}</CardTitle>
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
                <p>{t('dashboard.overview.noTransactionsYet')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
