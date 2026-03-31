import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Search, ArrowDownLeft, Send, Eye, EyeOff,
  Wallet, ChevronRight, Shield, Copy, ExternalLink, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Crypto metadata
const CRYPTO_META = {
  BTC: { name: 'Bitcoin', network: 'Bitcoin', color: '#F7931A', icon: '₿' },
  ETH: { name: 'Ethereum', network: 'ERC20', color: '#627EEA', icon: 'Ξ' },
  USDT: { name: 'TetherUS', network: 'TRC20', color: '#26A17B', icon: '₮' },
  USDC: { name: 'USD Coin', network: 'ERC20', color: '#2775CA', icon: '$' },
  SOL: { name: 'Solana', network: 'Solana', color: '#9945FF', icon: 'S' },
  XRP: { name: 'Ripple', network: 'XRP', color: '#23292F', icon: 'X' },
  ADA: { name: 'Cardano', network: 'Cardano', color: '#0033AD', icon: 'A' },
  DOT: { name: 'Polkadot', network: 'Polkadot', color: '#E6007A', icon: 'D' },
  BNB: { name: 'BNB', network: 'BEP20', color: '#F3BA2F', icon: 'B' },
  DOGE: { name: 'Dogecoin', network: 'Dogecoin', color: '#C2A633', icon: 'Ð' },
  MATIC: { name: 'Polygon', network: 'ERC20', color: '#8247E5', icon: 'M' },
  AVAX: { name: 'Avalanche', network: 'C-Chain', color: '#E84142', icon: 'A' },
  TRX: { name: 'TRON', network: 'TRC20', color: '#FF060A', icon: 'T' },
  LINK: { name: 'Chainlink', network: 'ERC20', color: '#2A5ADA', icon: 'L' },
  UNI: { name: 'Uniswap', network: 'ERC20', color: '#FF007A', icon: 'U' },
  EUR: { name: 'Euro', network: 'SEPA', color: '#0052B4', icon: '€' },
  USD: { name: 'US Dollar', network: 'Wire', color: '#22C55E', icon: '$' },
};

const VaultWallets = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const headers = { Authorization: `Bearer ${token}` };

  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [activeTab, setActiveTab] = useState('coins');
  const [searchCoin, setSearchCoin] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [isOmnibus, setIsOmnibus] = useState(false);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      // First check if user has Omnibus sub-account (OTC client)
      const omnibusRes = await axios.get(`${API_URL}/api/omnibus/my-balance`, { headers }).catch(() => null);
      
      if (omnibusRes?.data?.has_omnibus) {
        setIsOmnibus(true);
        const omnibusBalances = (omnibusRes.data.balances || []).map(b => ({
          symbol: b.asset,
          name: CRYPTO_META[b.asset]?.name || b.asset,
          network: CRYPTO_META[b.asset]?.network || '',
          total: b.balance || 0,
          available: b.available_balance || 0,
          pending: b.pending_balance || 0,
          usdValue: 0, // Will be enriched with prices
        }));
        setBalances(omnibusBalances);
        const walletList = [
          { id: 'overview', name: 'Overview', type: 'overview', qualified: true },
          { id: 'omnibus', name: 'Cofre Omnibus', type: 'omnibus', qualified: true },
        ];
        setWallets(walletList);
        setSelectedWallet(walletList[1]);
        setLoading(false);
        return;
      }

      // Fallback: individual Fireblocks vault (regular client)
      const vaultRes = await axios.get(`${API_URL}/api/crypto-wallets/my-vault`, { headers });
      
      if (vaultRes.data.has_vault) {
        const walletList = [
          { id: 'overview', name: 'Overview', type: 'overview', qualified: true },
          { id: 'main', name: 'Main Wallet', type: 'main', qualified: true, vault_id: vaultRes.data.vault_id },
        ];
        setWallets(walletList);
        setSelectedWallet(walletList[1]);
        await fetchBalances();
      } else {
        setWallets([]);
      }
    } catch (err) {
      console.error('Error fetching wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    setLoadingBalances(true);
    try {
      const res = await axios.get(`${API_URL}/api/crypto-wallets/balances`, { headers });
      const fetchedBalances = (res.data.balances || []).map(b => ({
        ...b,
        symbol: b.asset,
        name: CRYPTO_META[b.asset]?.name || b.asset,
        network: CRYPTO_META[b.asset]?.network || '',
        usdValue: b.total * (b.price || 0),
      }));
      setBalances(fetchedBalances);
    } catch (err) {
      // If Fireblocks not configured, show mock data for demo
      const mockBalances = [
        { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', total: 0, available: 0, usdValue: 0 },
        { symbol: 'ETH', name: 'Ethereum', network: 'ERC20', total: 0, available: 0, usdValue: 0 },
        { symbol: 'USDT', name: 'TetherUS', network: 'TRC20', total: 0, available: 0, usdValue: 0 },
        { symbol: 'USDC', name: 'USD Coin', network: 'ERC20', total: 0, available: 0, usdValue: 0 },
        { symbol: 'SOL', name: 'Solana', network: 'Solana', total: 0, available: 0, usdValue: 0 },
      ];
      setBalances(mockBalances);
    } finally {
      setLoadingBalances(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vault/transactions`, { headers });
      setTransactions(res.data.transactions || []);
    } catch {
      setTransactions([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const totalBalance = useMemo(() => {
    return balances.reduce((sum, b) => sum + (b.usdValue || 0), 0);
  }, [balances]);

  const filteredBalances = useMemo(() => {
    return balances.filter(b => {
      if (hideZero && b.total === 0) return false;
      if (searchCoin) {
        const q = searchCoin.toLowerCase();
        return b.symbol?.toLowerCase().includes(q) || b.name?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [balances, hideZero, searchCoin]);

  const formatUSD = (val) => {
    if (!showBalances) return '••••••';
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`;
  };

  const formatAmount = (val) => {
    if (!showBalances) return '••••••';
    if (val === 0) return '0.00';
    if (val < 0.0001) return val.toFixed(8);
    if (val < 1) return val.toFixed(6);
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="vault-wallets-loading">
        <RefreshCw size={24} className="animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)]" data-testid="vault-wallets-page">
      {/* Left Sidebar - Wallet List */}
      <div className="w-56 flex-shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 overflow-y-auto">
        <div className="p-4 border-b border-zinc-800/50">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Wallets</h3>
        </div>
        <div className="py-2">
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWallet(w)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                selectedWallet?.id === w.id
                  ? 'bg-zinc-800/80 border-l-2 border-emerald-500'
                  : 'hover:bg-zinc-800/40 border-l-2 border-transparent'
              }`}
              data-testid={`wallet-item-${w.id}`}
            >
              <div className={`w-2 h-2 rounded-sm ${w.qualified ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
              <span className={`text-sm ${selectedWallet?.id === w.id ? 'text-white font-medium' : 'text-zinc-400'}`}>
                {w.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedWallet ? (
          <div className="p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4" data-testid="wallet-breadcrumb">
              <span className="hover:text-zinc-300 cursor-pointer" onClick={() => setSelectedWallet(wallets[0])}>
                Overview
              </span>
              <ChevronRight size={14} />
              <span className="text-white">{selectedWallet.name}</span>
            </div>

            {/* Wallet Header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-zinc-400 text-sm">Qualified Wallet</span>
              <Shield size={14} className="text-zinc-600" />
            </div>
            <h1 className="text-2xl font-light text-white mb-6" data-testid="wallet-name">{selectedWallet.name}</h1>

            {/* Balance + Actions */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-light text-white tracking-tight" data-testid="wallet-total-balance">
                  {formatUSD(totalBalance)}
                </span>
                <button
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                  data-testid="toggle-balances"
                >
                  {showBalances ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/dashboard/crypto-deposit')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-lg"
                  data-testid="wallet-receive-btn"
                >
                  <ArrowDownLeft size={16} className="mr-2" />
                  Receive
                </Button>
                <Button
                  onClick={() => navigate('/dashboard/vault/new')}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6 rounded-lg"
                  data-testid="wallet-send-btn"
                >
                  <Send size={16} className="mr-2" />
                  Send
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-800 mb-6">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('coins')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'coins'
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  data-testid="tab-coins"
                >
                  Coins
                  {activeTab === 'coins' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`pb-3 text-sm font-medium transition-colors relative ${
                    activeTab === 'transactions'
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  data-testid="tab-transactions"
                >
                  Transactions
                  {activeTab === 'transactions' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'coins' && (
              <div>
                {/* Search + Filters */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div className="relative w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input
                      value={searchCoin}
                      onChange={e => setSearchCoin(e.target.value)}
                      placeholder="Search coin"
                      className="bg-zinc-800/50 border-zinc-700 text-white pl-9 text-sm h-9"
                      data-testid="search-coin"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hide-zero"
                      checked={hideZero}
                      onCheckedChange={setHideZero}
                      className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      data-testid="hide-zero-checkbox"
                    />
                    <label htmlFor="hide-zero" className="text-sm text-zinc-400 cursor-pointer select-none">
                      Hide 0 balances
                    </label>
                  </div>
                </div>

                {/* Coins Table */}
                <div className="border border-zinc-800/50 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_180px_180px_140px] gap-4 px-6 py-3 bg-zinc-900/30 border-b border-zinc-800/50">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Coin</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-right">Total Balance</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-right">Available Balance</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-right">Actions</span>
                  </div>

                  {/* Table Rows */}
                  {loadingBalances ? (
                    <div className="flex items-center justify-center py-16">
                      <RefreshCw size={20} className="animate-spin text-zinc-500" />
                    </div>
                  ) : filteredBalances.length === 0 ? (
                    <div className="text-center py-16">
                      <Wallet size={32} className="mx-auto text-zinc-700 mb-3" />
                      <p className="text-zinc-500 text-sm">No coins found</p>
                    </div>
                  ) : (
                    filteredBalances.map((coin, index) => {
                      const meta = CRYPTO_META[coin.symbol] || {};
                      return (
                        <div
                          key={coin.symbol}
                          className={`grid grid-cols-[1fr_180px_180px_140px] gap-4 px-6 py-4 items-center hover:bg-zinc-800/30 transition-colors ${
                            index < filteredBalances.length - 1 ? 'border-b border-zinc-800/30' : ''
                          }`}
                          data-testid={`coin-row-${coin.symbol}`}
                        >
                          {/* Coin Info */}
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: meta.color || '#555' }}
                            >
                              {meta.icon || coin.symbol?.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium text-sm">{coin.symbol}</span>
                                {coin.network && (
                                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0 rounded">
                                    {coin.network}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-zinc-500 text-xs">{coin.name}</span>
                            </div>
                          </div>

                          {/* Total Balance */}
                          <div className="text-right">
                            <p className="text-white text-sm font-mono">{formatAmount(coin.total)}</p>
                            <p className="text-zinc-500 text-xs">{formatUSD(coin.usdValue || 0)}</p>
                          </div>

                          {/* Available Balance */}
                          <div className="text-right">
                            <p className="text-white text-sm font-mono">{formatAmount(coin.available)}</p>
                            <p className="text-zinc-500 text-xs">{formatUSD(coin.usdValue || 0)}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); navigate('/dashboard/crypto-deposit'); }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 rounded"
                              data-testid={`receive-${coin.symbol}`}
                            >
                              Receive
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); navigate('/dashboard/vault/new'); }}
                              className="text-zinc-400 hover:text-white text-xs h-8 px-3"
                              data-testid={`send-${coin.symbol}`}
                            >
                              Send
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                {transactions.length === 0 ? (
                  <div className="text-center py-16">
                    <Wallet size={32} className="mx-auto text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(tx => (
                      <div
                        key={tx.id}
                        onClick={() => navigate(`/dashboard/vault/${tx.id}`)}
                        className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:border-zinc-700 cursor-pointer transition-all"
                        data-testid={`wallet-tx-${tx.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.status === 'completed' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                          }`}>
                            <Send size={16} className={tx.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'} />
                          </div>
                          <div>
                            <span className="text-white text-sm font-medium">Send {tx.asset}</span>
                            <p className="text-zinc-500 text-xs">{tx.order_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-mono text-sm">-{formatAmount(tx.amount)}</p>
                          <p className="text-zinc-500 text-xs">{tx.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-500">Select a wallet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultWallets;
