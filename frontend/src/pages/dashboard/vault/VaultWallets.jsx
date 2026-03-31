import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Search, ArrowDownLeft, Send, Eye, EyeOff, Vault,
  ChevronRight, Shield, RefreshCw, Plus, Pencil, Check, X,
  Loader2,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRYPTO_META = {
  BTC: { name: 'Bitcoin', network: 'Bitcoin', color: '#F7931A', icon: '\u20bf' },
  ETH: { name: 'Ethereum', network: 'ERC20', color: '#627EEA', icon: '\u039e' },
  USDT: { name: 'TetherUS', network: 'TRC20', color: '#26A17B', icon: '\u20ae' },
  USDC: { name: 'USD Coin', network: 'ERC20', color: '#2775CA', icon: '$' },
  SOL: { name: 'Solana', network: 'Solana', color: '#9945FF', icon: 'S' },
  XRP: { name: 'Ripple', network: 'XRP', color: '#23292F', icon: 'X' },
  ADA: { name: 'Cardano', network: 'Cardano', color: '#0033AD', icon: 'A' },
  DOT: { name: 'Polkadot', network: 'Polkadot', color: '#E6007A', icon: 'D' },
  BNB: { name: 'BNB', network: 'BEP20', color: '#F3BA2F', icon: 'B' },
  DOGE: { name: 'Dogecoin', network: 'Dogecoin', color: '#C2A633', icon: '\u00d0' },
  MATIC: { name: 'Polygon', network: 'ERC20', color: '#8247E5', icon: 'M' },
  AVAX: { name: 'Avalanche', network: 'C-Chain', color: '#E84142', icon: 'A' },
  TRX: { name: 'TRON', network: 'TRC20', color: '#FF060A', icon: 'T' },
  LINK: { name: 'Chainlink', network: 'ERC20', color: '#2A5ADA', icon: 'L' },
  UNI: { name: 'Uniswap', network: 'ERC20', color: '#FF007A', icon: 'U' },
  EUR: { name: 'Euro', network: 'SEPA', color: '#0052B4', icon: '\u20ac' },
  USD: { name: 'US Dollar', network: 'Wire', color: '#22C55E', icon: '$' },
};

const VaultWallets = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const headers = { Authorization: `Bearer ${token}` };

  const [cofres, setCofres] = useState([]);
  const [selectedCofre, setSelectedCofre] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [activeTab, setActiveTab] = useState('coins');
  const [searchCoin, setSearchCoin] = useState('');
  const [hideZero, setHideZero] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [isOmnibus, setIsOmnibus] = useState(false);
  const [cofresMax, setCofresMax] = useState(0);
  const [tier, setTier] = useState('');

  // Create cofre modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCofreName, setNewCofreName] = useState('');
  const [creating, setCreating] = useState(false);

  // Rename inline
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchCofres(); }, []);

  const fetchCofres = async () => {
    try {
      // Check omnibus cofres (OTC / Multi-Sign client)
      const res = await axios.get(`${API_URL}/api/omnibus/my-cofres`, { headers }).catch(() => null);

      if (res?.data?.has_cofres) {
        setIsOmnibus(true);
        setCofresMax(res.data.cofres_max || 0);
        setTier(res.data.tier || '');
        const list = (res.data.cofres || []).map(c => ({
          id: c._id,
          name: c.cofre_name || 'Cofre',
          type: 'omnibus',
          qualified: true,
          balances: c.assets || [],
        }));
        setCofres(list);
        if (list.length > 0) {
          setSelectedCofre(list[0]);
          setBalances(mapOmnibusBalances(list[0].balances));
        }
        setLoading(false);
        return;
      }

      // Fallback: individual Fireblocks vault (regular client)
      const vaultRes = await axios.get(`${API_URL}/api/crypto-wallets/my-vault`, { headers }).catch(() => null);
      if (vaultRes?.data?.has_vault) {
        const list = [
          { id: 'main', name: 'Cofre Principal', type: 'main', qualified: true, vault_id: vaultRes.data.vault_id },
        ];
        setCofres(list);
        setSelectedCofre(list[0]);
        await fetchFireblocksBalances();
      } else {
        setCofres([]);
      }
    } catch (err) {
      console.error('Error fetching cofres:', err);
    } finally {
      setLoading(false);
    }
  };

  const mapOmnibusBalances = (assets) =>
    (assets || []).map(b => ({
      symbol: b.asset,
      name: CRYPTO_META[b.asset]?.name || b.asset,
      network: CRYPTO_META[b.asset]?.network || '',
      total: b.balance || 0,
      available: b.available_balance || 0,
      pending: b.pending_balance || 0,
      usdValue: 0,
    }));

  const fetchFireblocksBalances = async () => {
    setLoadingBalances(true);
    try {
      const res = await axios.get(`${API_URL}/api/crypto-wallets/balances`, { headers });
      setBalances((res.data.balances || []).map(b => ({
        ...b, symbol: b.asset,
        name: CRYPTO_META[b.asset]?.name || b.asset,
        network: CRYPTO_META[b.asset]?.network || '',
        usdValue: b.total * (b.price || 0),
      })));
    } catch {
      setBalances([
        { symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin', total: 0, available: 0, usdValue: 0 },
        { symbol: 'ETH', name: 'Ethereum', network: 'ERC20', total: 0, available: 0, usdValue: 0 },
        { symbol: 'USDT', name: 'TetherUS', network: 'TRC20', total: 0, available: 0, usdValue: 0 },
        { symbol: 'USDC', name: 'USD Coin', network: 'ERC20', total: 0, available: 0, usdValue: 0 },
      ]);
    } finally {
      setLoadingBalances(false);
    }
  };

  const selectCofre = (cofre) => {
    setSelectedCofre(cofre);
    if (cofre.type === 'omnibus') {
      setBalances(mapOmnibusBalances(cofre.balances));
    }
    setActiveTab('coins');
  };

  const handleCreateCofre = async () => {
    if (!newCofreName.trim()) return;
    setCreating(true);
    try {
      await axios.post(`${API_URL}/api/omnibus/cofres`,
        { name: newCofreName.trim() }, { headers }
      );
      toast.success(`Cofre "${newCofreName}" criado`);
      setShowCreateModal(false);
      setNewCofreName('');
      await fetchCofres();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar cofre');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (subAccountId) => {
    if (!editName.trim()) { setEditingId(null); return; }
    try {
      await axios.put(`${API_URL}/api/omnibus/cofres/${subAccountId}/rename`,
        { name: editName.trim() }, { headers }
      );
      toast.success('Cofre renomeado');
      setEditingId(null);
      await fetchCofres();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao renomear');
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vault/transactions`, { headers });
      setTransactions(res.data.transactions || []);
    } catch { setTransactions([]); }
  };

  useEffect(() => { if (activeTab === 'transactions') fetchTransactions(); }, [activeTab]);

  const totalBalance = useMemo(() => balances.reduce((s, b) => s + (b.usdValue || 0), 0), [balances]);

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
    if (!showBalances) return '\u2022\u2022\u2022\u2022\u2022\u2022';
    return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)}`;
  };

  const formatAmount = (val) => {
    if (!showBalances) return '\u2022\u2022\u2022\u2022\u2022\u2022';
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

  const isOverview = !selectedCofre;

  return (
    <div className="flex h-[calc(100vh-80px)]" data-testid="vault-wallets-page">
      {/* Left Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-zinc-800/50 bg-zinc-950/50 overflow-y-auto">
        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider" data-testid="cofres-title">
            Cofres
          </h3>
          {isOmnibus && (
            <span className="text-[10px] text-zinc-600">{cofres.length}/{cofresMax}</span>
          )}
        </div>
        <div className="py-2">
          {/* Visão Geral */}
          <button
            onClick={() => { setSelectedCofre(null); setActiveTab('coins'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
              !selectedCofre
                ? 'bg-zinc-800/80 border-l-2 border-emerald-500'
                : 'hover:bg-zinc-800/40 border-l-2 border-transparent'
            }`}
            data-testid="cofre-overview"
          >
            <div className={`w-2 h-2 rounded-sm bg-emerald-500`} />
            <span className={`text-sm ${!selectedCofre ? 'text-white font-medium' : 'text-zinc-400'}`}>
              Visão Geral
            </span>
          </button>

          {/* List of cofres */}
          {cofres.map(c => (
            <div
              key={c.id}
              className={`group flex items-center px-4 py-3 transition-all cursor-pointer ${
                selectedCofre?.id === c.id
                  ? 'bg-zinc-800/80 border-l-2 border-emerald-500'
                  : 'hover:bg-zinc-800/40 border-l-2 border-transparent'
              }`}
              data-testid={`cofre-item-${c.id}`}
            >
              <div
                className="flex items-center gap-3 flex-1 min-w-0"
                onClick={() => selectCofre(c)}
              >
                <div className="w-2 h-2 rounded-sm bg-amber-500 flex-shrink-0" />
                {editingId === c.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(c.id)}
                      className="h-6 text-xs bg-zinc-900 border-zinc-700 text-white px-1.5 py-0"
                      autoFocus
                      data-testid={`rename-input-${c.id}`}
                    />
                    <button onClick={() => handleRename(c.id)} className="text-emerald-400 hover:text-emerald-300">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <span className={`text-sm truncate ${selectedCofre?.id === c.id ? 'text-white font-medium' : 'text-zinc-400'}`}>
                    {c.name}
                  </span>
                )}
              </div>
              {isOmnibus && editingId !== c.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setEditName(c.name); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity ml-1"
                  data-testid={`edit-cofre-${c.id}`}
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))}

          {/* Add cofre button */}
          {isOmnibus && cofres.length < cofresMax && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 border-l-2 border-transparent transition-all group"
              data-testid="add-cofre-btn"
            >
              <Plus size={14} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-400 transition-colors">Novo Cofre</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {isOverview ? (
          /* === VISÃO GERAL === */
          <div className="p-6">
            <h1 className="text-2xl font-light text-white mb-2" data-testid="overview-title">Visão Geral</h1>
            <p className="text-sm text-zinc-500 mb-8">
              {cofres.length} cofre{cofres.length !== 1 ? 's' : ''} activo{cofres.length !== 1 ? 's' : ''}
              {isOmnibus && <span className="ml-2 text-zinc-600">({tier} • máx. {cofresMax})</span>}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cofres.map(c => {
                const hasBalance = c.balances?.some(b => b.balance > 0);
                return (
                  <Card
                    key={c.id}
                    onClick={() => selectCofre(c)}
                    className="bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 cursor-pointer transition-all hover:-translate-y-0.5"
                    data-testid={`overview-cofre-${c.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Vault size={16} className="text-amber-500" />
                          <span className="text-white font-medium text-sm">{c.name}</span>
                        </div>
                        <Badge className={`text-[10px] ${hasBalance ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                          {hasBalance ? 'Activo' : 'Vazio'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {(c.balances || []).filter(b => b.balance > 0).slice(0, 3).map(b => (
                          <div key={b.asset} className="flex justify-between text-xs">
                            <span className="text-zinc-400">{b.asset}</span>
                            <span className="text-white font-mono">{showBalances ? b.balance.toFixed(b.balance < 1 ? 6 : 2) : '\u2022\u2022\u2022\u2022'}</span>
                          </div>
                        ))}
                        {(c.balances || []).filter(b => b.balance > 0).length === 0 && (
                          <p className="text-zinc-600 text-xs">Sem saldo</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : selectedCofre ? (
          /* === COFRE DETAIL === */
          <div className="p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4" data-testid="cofre-breadcrumb">
              <span className="hover:text-zinc-300 cursor-pointer" onClick={() => setSelectedCofre(null)}>
                Visão Geral
              </span>
              <ChevronRight size={14} />
              <span className="text-white">{selectedCofre.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-zinc-400 text-sm">Qualified Wallet</span>
              <Shield size={14} className="text-zinc-600" />
            </div>
            <h1 className="text-2xl font-light text-white mb-6" data-testid="cofre-name">{selectedCofre.name}</h1>

            {/* Balance + Actions */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-light text-white tracking-tight" data-testid="cofre-total-balance">
                  {formatUSD(totalBalance)}
                </span>
                <button onClick={() => setShowBalances(!showBalances)} className="text-zinc-500 hover:text-zinc-300 transition-colors" data-testid="toggle-balances">
                  {showBalances ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/dashboard/crypto-deposit')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-lg" data-testid="cofre-receive-btn">
                  <ArrowDownLeft size={16} className="mr-2" /> Receive
                </Button>
                <Button onClick={() => navigate('/dashboard/vault/new')} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6 rounded-lg" data-testid="cofre-send-btn">
                  <Send size={16} className="mr-2" /> Send
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-800 mb-6">
              <div className="flex gap-6">
                {['coins', 'transactions'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    data-testid={`tab-${tab}`}
                  >
                    {tab === 'coins' ? 'Coins' : 'Transactions'}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Coins Tab */}
            {activeTab === 'coins' && (
              <div>
                <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                  <div className="relative w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input value={searchCoin} onChange={e => setSearchCoin(e.target.value)} placeholder="Search coin" className="bg-zinc-800/50 border-zinc-700 text-white pl-9 text-sm h-9" data-testid="search-coin" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="hide-zero" checked={hideZero} onCheckedChange={setHideZero} className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" data-testid="hide-zero-checkbox" />
                    <label htmlFor="hide-zero" className="text-sm text-zinc-400 cursor-pointer select-none">Hide 0 balances</label>
                  </div>
                </div>

                <div className="border border-zinc-800/50 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_180px_180px_140px] gap-4 px-6 py-3 bg-zinc-900/30 border-b border-zinc-800/50">
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Coin</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-right">Total Balance</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-right">Available Balance</span>
                    <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium text-right">Actions</span>
                  </div>

                  {loadingBalances ? (
                    <div className="flex items-center justify-center py-16">
                      <RefreshCw size={20} className="animate-spin text-zinc-500" />
                    </div>
                  ) : filteredBalances.length === 0 ? (
                    <div className="text-center py-16">
                      <Vault size={32} className="mx-auto text-zinc-700 mb-3" />
                      <p className="text-zinc-500 text-sm">Sem moedas encontradas</p>
                    </div>
                  ) : (
                    filteredBalances.map((coin, index) => {
                      const meta = CRYPTO_META[coin.symbol] || {};
                      return (
                        <div
                          key={coin.symbol}
                          className={`grid grid-cols-[1fr_180px_180px_140px] gap-4 px-6 py-4 items-center hover:bg-zinc-800/30 transition-colors ${index < filteredBalances.length - 1 ? 'border-b border-zinc-800/30' : ''}`}
                          data-testid={`coin-row-${coin.symbol}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: meta.color || '#555' }}>
                              {meta.icon || coin.symbol?.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium text-sm">{coin.symbol}</span>
                                {coin.network && <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0 rounded">{coin.network}</Badge>}
                              </div>
                              <span className="text-zinc-500 text-xs">{coin.name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-mono">{formatAmount(coin.total)}</p>
                            <p className="text-zinc-500 text-xs">{formatUSD(coin.usdValue || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-mono">{formatAmount(coin.available)}</p>
                            <p className="text-zinc-500 text-xs">{formatUSD(coin.usdValue || 0)}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate('/dashboard/crypto-deposit'); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 rounded" data-testid={`receive-${coin.symbol}`}>
                              Receive
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate('/dashboard/vault/new'); }} className="text-zinc-400 hover:text-white text-xs h-8 px-3" data-testid={`send-${coin.symbol}`}>
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

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                {transactions.length === 0 ? (
                  <div className="text-center py-16">
                    <Vault size={32} className="mx-auto text-zinc-700 mb-3" />
                    <p className="text-zinc-500 text-sm">Sem transações</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map(tx => (
                      <div key={tx.id} onClick={() => navigate(`/dashboard/vault/${tx.id}`)} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:border-zinc-700 cursor-pointer transition-all" data-testid={`cofre-tx-${tx.id}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.status === 'completed' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
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
            <p className="text-zinc-500">Selecione um cofre</p>
          </div>
        )}
      </div>

      {/* Create Cofre Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-light">Novo Cofre</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block">Nome do Cofre</label>
            <Input
              value={newCofreName}
              onChange={e => setNewCofreName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCofre()}
              placeholder="Ex: Cofre Operacional, Reservas, Trading..."
              className="bg-zinc-800 border-zinc-700 text-white"
              autoFocus
              data-testid="new-cofre-name-input"
            />
            <p className="text-xs text-zinc-600 mt-2">
              {cofres.length}/{cofresMax} cofres utilizados ({tier})
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleCreateCofre} disabled={creating || !newCofreName.trim()} className="bg-amber-600 hover:bg-amber-500 text-white" data-testid="create-cofre-submit">
              {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
              Criar Cofre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultWallets;
