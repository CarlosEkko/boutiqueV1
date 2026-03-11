import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { 
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Save,
  AlertCircle,
  Building2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Coins,
  Search,
  Banknote,
  ArrowDownToLine,
  Plus,
  Trash2,
  Edit
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
];

const AdminTradingPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('crypto-fees');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Fees state - now per currency
  const [allFees, setAllFees] = useState(null);
  const [selectedFeeCurrency, setSelectedFeeCurrency] = useState('EUR');
  const [savingCurrency, setSavingCurrency] = useState(null);
  
  // Limits state
  const [limits, setLimits] = useState({});
  const [selectedTier, setSelectedTier] = useState('standard');
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersFilter, setOrdersFilter] = useState({ status: '', type: '' });
  
  // Bank transfers state
  const [transfers, setTransfers] = useState([]);
  const [transfersFilter, setTransfersFilter] = useState({ status: '', type: '' });
  
  // Expanded cards
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [expandedTransfer, setExpandedTransfer] = useState(null);
  
  // Crypto fees state
  const [cryptoFees, setCryptoFees] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [cryptoSearch, setCryptoSearch] = useState('');
  const [savingCrypto, setSavingCrypto] = useState(null);

  // KBEX Bank Accounts state
  const [kbexBankAccounts, setKbexBankAccounts] = useState([]);
  const [editingBankAccount, setEditingBankAccount] = useState(null);
  const [newBankAccount, setNewBankAccount] = useState({
    currency: 'EUR',
    bank_name: '',
    account_name: 'KBEX Exchange Ltd',
    iban: '',
    swift_bic: '',
    account_number: '',
    routing_number: '',
    bank_address: '',
    instructions: ''
  });

  // Fiat Withdrawals state
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalsFilter, setWithdrawalsFilter] = useState({ status: '', currency: '' });
  const [expandedWithdrawal, setExpandedWithdrawal] = useState(null);

  // Crypto Withdrawals state
  const [cryptoWithdrawals, setCryptoWithdrawals] = useState([]);
  const [cryptoWithdrawalsFilter, setCryptoWithdrawalsFilter] = useState({ status: '' });
  const [expandedCryptoWithdrawal, setExpandedCryptoWithdrawal] = useState(null);

  useEffect(() => {
    if (activeTab === 'fees') fetchFees();
    if (activeTab === 'crypto-fees') fetchCryptoFees();
    if (activeTab === 'limits') fetchLimits();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'transfers') fetchTransfers();
    if (activeTab === 'bank-accounts') fetchKbexBankAccounts();
    if (activeTab === 'withdrawals') fetchWithdrawals();
    if (activeTab === 'crypto-withdrawals') fetchCryptoWithdrawals();
  }, [activeTab, ordersFilter, transfersFilter, withdrawalsFilter, cryptoWithdrawalsFilter]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The response includes fees_by_currency with all currencies
      const feesData = response.data.fees_by_currency || {};
      
      // Initialize with defaults if currencies missing
      SUPPORTED_CURRENCIES.forEach(curr => {
        if (!feesData[curr.code]) {
          feesData[curr.code] = {
            buy_fee_percent: 2.0,
            buy_spread_percent: 1.0,
            sell_fee_percent: 2.0,
            sell_spread_percent: 1.0,
            swap_fee_percent: 1.5,
            swap_spread_percent: 0.5,
            min_buy_fee: 5.0,
            min_sell_fee: 5.0,
            min_swap_fee: 3.0
          };
        }
      });
      
      setAllFees(feesData);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar taxas' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCryptoFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/crypto-fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCryptoFees(response.data);
      if (response.data.length > 0 && !selectedCrypto) {
        setSelectedCrypto(response.data[0]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar taxas de criptomoedas' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLimits = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/limits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const limitsMap = {};
      response.data.forEach(l => { limitsMap[l.tier] = l; });
      setLimits(limitsMap);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar limites' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ordersFilter.status) params.append('status', ordersFilter.status);
      if (ordersFilter.type) params.append('order_type', ordersFilter.type);
      
      const response = await axios.get(`${API_URL}/api/trading/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar ordens' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (transfersFilter.status) params.append('status', transfersFilter.status);
      if (transfersFilter.type) params.append('transfer_type', transfersFilter.type);
      
      const response = await axios.get(`${API_URL}/api/trading/admin/bank-transfers?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar transferências' });
    } finally {
      setLoading(false);
    }
  };

  const saveFees = async (currency) => {
    setSavingCurrency(currency);
    setMessage(null);
    try {
      await axios.put(`${API_URL}/api/trading/admin/fees/${currency}`, allFees[currency], {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: `Taxas de ${currency} atualizadas com sucesso!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao salvar taxas' });
    } finally {
      setSavingCurrency(null);
    }
  };

  const saveCryptoFees = async () => {
    if (!selectedCrypto) return;
    setSavingCrypto(selectedCrypto.symbol);
    setMessage(null);
    try {
      await axios.put(`${API_URL}/api/trading/admin/crypto-fees/${selectedCrypto.symbol}`, {
        buy_fee_percent: selectedCrypto.buy_fee_percent,
        buy_spread_percent: selectedCrypto.buy_spread_percent,
        sell_fee_percent: selectedCrypto.sell_fee_percent,
        sell_spread_percent: selectedCrypto.sell_spread_percent,
        swap_fee_percent: selectedCrypto.swap_fee_percent,
        swap_spread_percent: selectedCrypto.swap_spread_percent,
        min_buy_fee: selectedCrypto.min_buy_fee,
        min_sell_fee: selectedCrypto.min_sell_fee,
        min_swap_fee: selectedCrypto.min_swap_fee
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: `Taxas de ${selectedCrypto.symbol} atualizadas com sucesso!` });
      // Update local state
      setCryptoFees(prev => prev.map(c => 
        c.symbol === selectedCrypto.symbol ? selectedCrypto : c
      ));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao salvar taxas' });
    } finally {
      setSavingCrypto(null);
    }
  };

  // KBEX Bank Accounts functions
  const fetchKbexBankAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/kbex-bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKbexBankAccounts(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar contas bancárias' });
    } finally {
      setLoading(false);
    }
  };

  const saveKbexBankAccount = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (editingBankAccount) {
        await axios.put(`${API_URL}/api/trading/admin/kbex-bank-accounts/${editingBankAccount.currency}`, newBankAccount, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ type: 'success', text: 'Conta bancária atualizada!' });
      } else {
        await axios.post(`${API_URL}/api/trading/admin/kbex-bank-accounts`, newBankAccount, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage({ type: 'success', text: 'Conta bancária criada!' });
      }
      fetchKbexBankAccounts();
      setEditingBankAccount(null);
      setNewBankAccount({
        currency: 'EUR', bank_name: '', account_name: 'KBEX Exchange Ltd',
        iban: '', swift_bic: '', account_number: '', routing_number: '', bank_address: '', instructions: ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao salvar conta bancária' });
    } finally {
      setSaving(false);
    }
  };

  const deleteKbexBankAccount = async (currency) => {
    if (!window.confirm(`Tem certeza que deseja excluir a conta bancária ${currency}?`)) return;
    try {
      await axios.delete(`${API_URL}/api/trading/admin/kbex-bank-accounts/${currency}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Conta bancária excluída!' });
      fetchKbexBankAccounts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao excluir' });
    }
  };

  // Fiat Withdrawals functions
  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (withdrawalsFilter.status) params.append('status', withdrawalsFilter.status);
      if (withdrawalsFilter.currency) params.append('currency', withdrawalsFilter.currency);
      
      const response = await axios.get(`${API_URL}/api/trading/admin/fiat-withdrawals?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(response.data);
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro ao carregar levantamentos' });
    } finally {
      setLoading(false);
    }
  };

  const processWithdrawal = async (withdrawalId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${withdrawalId}/process`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Levantamento em processamento!' });
      fetchWithdrawals();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao processar' });
    }
  };

  const approveWithdrawal = async (withdrawalId, reference) => {
    try {
      const params = new URLSearchParams();
      if (reference) params.append('transaction_reference', reference);
      
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${withdrawalId}/approve?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Levantamento aprovado!' });
      fetchWithdrawals();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao aprovar' });
    }
  };

  const rejectWithdrawal = async (withdrawalId) => {
    const reason = window.prompt('Motivo da rejeição:');
    if (!reason) return;
    
    try {
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${withdrawalId}/reject?reason=${encodeURIComponent(reason)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Levantamento rejeitado!' });
      fetchWithdrawals();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao rejeitar' });
    }
  };

  // Crypto Withdrawals functions
  const fetchCryptoWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cryptoWithdrawalsFilter.status) params.append('status', cryptoWithdrawalsFilter.status);
      
      const response = await axios.get(`${API_URL}/api/crypto-wallets/admin/withdrawals?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCryptoWithdrawals(response.data.withdrawals || []);
    } catch (err) {
      console.error('Error fetching crypto withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveCryptoWithdrawal = async (withdrawalId) => {
    try {
      await axios.post(`${API_URL}/api/crypto-wallets/admin/withdrawals/${withdrawalId}/approve`, 
        { approved: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'Levantamento crypto aprovado e processado!' });
      fetchCryptoWithdrawals();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao aprovar levantamento' });
    }
  };

  const rejectCryptoWithdrawal = async (withdrawalId) => {
    const reason = window.prompt('Motivo da rejeição:');
    try {
      await axios.post(`${API_URL}/api/crypto-wallets/admin/withdrawals/${withdrawalId}/approve`, 
        { approved: false, admin_note: reason || 'Rejeitado pelo administrador' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: 'Levantamento crypto rejeitado!' });
      fetchCryptoWithdrawals();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao rejeitar levantamento' });
    }
  };

  const updateCryptoFeeField = (field, value) => {
    setSelectedCrypto(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const saveLimits = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.put(`${API_URL}/api/trading/admin/limits/${selectedTier}`, limits[selectedTier], {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: `Limites do tier ${selectedTier} atualizados!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao salvar limites' });
    } finally {
      setSaving(false);
    }
  };

  const completeOrder = async (orderId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/orders/${orderId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Ordem completada!' });
      fetchOrders();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao completar ordem' });
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Ordem cancelada!' });
      fetchOrders();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao cancelar ordem' });
    }
  };

  const approveTransfer = async (transferId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${transferId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Transferência aprovada!' });
      fetchTransfers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao aprovar transferência' });
    }
  };

  const rejectTransfer = async (transferId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${transferId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Transferência rejeitada!' });
      fetchTransfers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao rejeitar transferência' });
    }
  };

  const updateFeeField = (currency, field, value) => {
    setAllFees(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const updateLimitField = (field, value) => {
    setLimits({
      ...limits,
      [selectedTier]: {
        ...limits[selectedTier],
        [field]: parseFloat(value) || 0
      }
    });
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
        activeTab === id 
          ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' 
          : 'text-gray-400 hover:text-white hover:bg-zinc-800'
      }`}
      onClick={() => setActiveTab(id)}
      data-testid={`tab-${id}`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6" data-testid="admin-trading-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">Gestão de Trading</h1>
        <p className="text-gray-400 mt-1">Configure taxas, limites e aprove transações</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabButton id="crypto-fees" icon={Coins} label="Taxas Crypto" />
        <TabButton id="fees" icon={DollarSign} label="Taxas Fiat" />
        <TabButton id="limits" icon={Users} label="Limites" />
        <TabButton id="orders" icon={TrendingUp} label="Ordens" />
        <TabButton id="transfers" icon={Building2} label="Depósitos Fiat" />
        <TabButton id="crypto-withdrawals" icon={Coins} label="Levantamentos Crypto" />
        <TabButton id="bank-accounts" icon={Banknote} label="Contas Bancárias" />
        <TabButton id="withdrawals" icon={ArrowDownToLine} label="Levantamentos Fiat" />
      </div>

      {/* Crypto Fees Tab */}
      {activeTab === 'crypto-fees' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coins size={20} className="text-gold-400" />
              Taxas por Criptomoeda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Buscar criptomoeda (BTC, ETH, SOL...)"
                value={cryptoSearch}
                onChange={(e) => setCryptoSearch(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white pl-10"
                data-testid="crypto-search-input"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Crypto List */}
              <div className="lg:col-span-1 bg-zinc-800/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Selecione a Cripto</h3>
                <div className="space-y-1">
                  {cryptoFees
                    .filter(c => 
                      c.symbol.toLowerCase().includes(cryptoSearch.toLowerCase()) ||
                      c.name.toLowerCase().includes(cryptoSearch.toLowerCase())
                    )
                    .map(crypto => (
                      <button
                        key={crypto.symbol}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                          selectedCrypto?.symbol === crypto.symbol
                            ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                            : 'text-gray-300 hover:bg-zinc-700/50'
                        }`}
                        onClick={() => setSelectedCrypto(crypto)}
                        data-testid={`crypto-select-${crypto.symbol}`}
                      >
                        <span className="font-medium">{crypto.symbol}</span>
                        <span className="text-xs text-gray-500">{crypto.buy_fee_percent}%</span>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Fee Configuration */}
              <div className="lg:col-span-2">
                {selectedCrypto ? (
                  <div className="space-y-6">
                    {/* Crypto Header */}
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <h3 className="text-xl text-white font-medium">{selectedCrypto.name}</h3>
                      <p className="text-gold-400">{selectedCrypto.symbol}</p>
                    </div>

                    {/* Buy Fees */}
                    <div>
                      <h4 className="text-lg text-gold-400 mb-3">Taxas de Compra</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={selectedCrypto.buy_fee_percent}
                            onChange={(e) => updateCryptoFeeField('buy_fee_percent', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            data-testid="crypto-buy-fee-input"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={selectedCrypto.buy_spread_percent}
                            onChange={(e) => updateCryptoFeeField('buy_spread_percent', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Taxa Mínima (USD)</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={selectedCrypto.min_buy_fee}
                            onChange={(e) => updateCryptoFeeField('min_buy_fee', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sell Fees */}
                    <div>
                      <h4 className="text-lg text-gold-400 mb-3">Taxas de Venda</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={selectedCrypto.sell_fee_percent}
                            onChange={(e) => updateCryptoFeeField('sell_fee_percent', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            data-testid="crypto-sell-fee-input"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={selectedCrypto.sell_spread_percent}
                            onChange={(e) => updateCryptoFeeField('sell_spread_percent', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Taxa Mínima (USD)</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={selectedCrypto.min_sell_fee}
                            onChange={(e) => updateCryptoFeeField('min_sell_fee', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Swap Fees */}
                    <div>
                      <h4 className="text-lg text-gold-400 mb-3">Taxas de Conversão</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={selectedCrypto.swap_fee_percent}
                            onChange={(e) => updateCryptoFeeField('swap_fee_percent', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            data-testid="crypto-swap-fee-input"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={selectedCrypto.swap_spread_percent}
                            onChange={(e) => updateCryptoFeeField('swap_spread_percent', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-400 mb-1 block">Taxa Mínima (USD)</label>
                          <Input
                            type="number"
                            step="0.5"
                            value={selectedCrypto.min_swap_fee}
                            onChange={(e) => updateCryptoFeeField('min_swap_fee', e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      className="bg-gold-500 hover:bg-gold-600 text-black"
                      onClick={saveCryptoFees}
                      disabled={savingCrypto === selectedCrypto.symbol}
                      data-testid="save-crypto-fees-btn"
                    >
                      {savingCrypto === selectedCrypto.symbol ? (
                        <Loader2 className="animate-spin mr-2" size={18} />
                      ) : (
                        <Save className="mr-2" size={18} />
                      )}
                      {savingCrypto === selectedCrypto.symbol ? 'Salvando...' : `Salvar Taxas ${selectedCrypto.symbol}`}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p>Selecione uma criptomoeda para configurar</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fees Tab */}
      {activeTab === 'fees' && allFees && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings size={20} className="text-gold-400" />
              Configuração de Taxas por Moeda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Currency Selector */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-zinc-700">
              {SUPPORTED_CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedFeeCurrency === curr.code
                      ? 'bg-gold-500 text-black font-medium'
                      : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
                  }`}
                  onClick={() => setSelectedFeeCurrency(curr.code)}
                  data-testid={`fee-currency-${curr.code}`}
                >
                  <span>{curr.flag}</span>
                  <span>{curr.code}</span>
                </button>
              ))}
            </div>

            {/* Current Currency Info */}
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {SUPPORTED_CURRENCIES.find(c => c.code === selectedFeeCurrency)?.flag}
                </span>
                <div>
                  <h3 className="text-lg text-white font-medium">
                    {SUPPORTED_CURRENCIES.find(c => c.code === selectedFeeCurrency)?.name} ({selectedFeeCurrency})
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Configurar taxas para transações em {selectedFeeCurrency}
                  </p>
                </div>
              </div>
            </div>

            {/* Buy Fees */}
            <div>
              <h3 className="text-lg text-gold-400 mb-4">Taxas de Compra</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={allFees[selectedFeeCurrency]?.buy_fee_percent || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'buy_fee_percent', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="buy-fee-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={allFees[selectedFeeCurrency]?.buy_spread_percent || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'buy_spread_percent', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="buy-spread-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Taxa Mínima ({selectedFeeCurrency})</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={allFees[selectedFeeCurrency]?.min_buy_fee || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'min_buy_fee', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="min-buy-fee-input"
                  />
                </div>
              </div>
            </div>

            {/* Sell Fees */}
            <div>
              <h3 className="text-lg text-gold-400 mb-4">Taxas de Venda</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={allFees[selectedFeeCurrency]?.sell_fee_percent || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'sell_fee_percent', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="sell-fee-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={allFees[selectedFeeCurrency]?.sell_spread_percent || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'sell_spread_percent', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Taxa Mínima ({selectedFeeCurrency})</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={allFees[selectedFeeCurrency]?.min_sell_fee || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'min_sell_fee', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Swap Fees */}
            <div>
              <h3 className="text-lg text-gold-400 mb-4">Taxas de Conversão</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={allFees[selectedFeeCurrency]?.swap_fee_percent || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'swap_fee_percent', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    data-testid="swap-fee-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={allFees[selectedFeeCurrency]?.swap_spread_percent || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'swap_spread_percent', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Taxa Mínima ({selectedFeeCurrency})</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={allFees[selectedFeeCurrency]?.min_swap_fee || 0}
                    onChange={(e) => updateFeeField(selectedFeeCurrency, 'min_swap_fee', e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>
            </div>

            <Button
              className="bg-gold-500 hover:bg-gold-600 text-black"
              onClick={() => saveFees(selectedFeeCurrency)}
              disabled={savingCurrency === selectedFeeCurrency}
              data-testid="save-fees-btn"
            >
              {savingCurrency === selectedFeeCurrency ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : (
                <Save className="mr-2" size={18} />
              )}
              {savingCurrency === selectedFeeCurrency ? 'Salvando...' : `Salvar Taxas ${selectedFeeCurrency}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Limits Tab */}
      {activeTab === 'limits' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users size={20} className="text-gold-400" />
              Limites por Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tier Selector */}
            <div className="flex gap-2">
              {['standard', 'premium', 'vip'].map(tier => (
                <button
                  key={tier}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    selectedTier === tier
                      ? 'bg-gold-500 text-black'
                      : 'bg-zinc-800 text-gray-400 hover:text-white'
                  }`}
                  onClick={() => setSelectedTier(tier)}
                  data-testid={`tier-${tier}-btn`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {limits[selectedTier] && (
              <>
                {/* Daily Limits */}
                <div>
                  <h3 className="text-lg text-gold-400 mb-4">Limites Diários (USD)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Compra</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].daily_buy_limit}
                        onChange={(e) => updateLimitField('daily_buy_limit', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        data-testid="daily-buy-limit-input"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Venda</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].daily_sell_limit}
                        onChange={(e) => updateLimitField('daily_sell_limit', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Conversão</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].daily_swap_limit}
                        onChange={(e) => updateLimitField('daily_swap_limit', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Monthly Limits */}
                <div>
                  <h3 className="text-lg text-gold-400 mb-4">Limites Mensais (USD)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Compra</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].monthly_buy_limit}
                        onChange={(e) => updateLimitField('monthly_buy_limit', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Venda</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].monthly_sell_limit}
                        onChange={(e) => updateLimitField('monthly_sell_limit', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Conversão</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].monthly_swap_limit}
                        onChange={(e) => updateLimitField('monthly_swap_limit', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Per Transaction Limits */}
                <div>
                  <h3 className="text-lg text-gold-400 mb-4">Por Transação (USD)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Mín. Compra</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].min_buy_amount}
                        onChange={(e) => updateLimitField('min_buy_amount', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Máx. Compra</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].max_buy_amount}
                        onChange={(e) => updateLimitField('max_buy_amount', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Mín. Venda</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].min_sell_amount}
                        onChange={(e) => updateLimitField('min_sell_amount', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Máx. Venda</label>
                      <Input
                        type="number"
                        value={limits[selectedTier].max_sell_amount}
                        onChange={(e) => updateLimitField('max_sell_amount', e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  onClick={saveLimits}
                  disabled={saving}
                  data-testid="save-limits-btn"
                >
                  {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                  {saving ? 'Salvando...' : `Salvar Limites ${selectedTier}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-gold-400" />
                Ordens de Trading
              </div>
              <Button variant="ghost" size="sm" onClick={fetchOrders}>
                <RefreshCw size={16} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={ordersFilter.status}
                onChange={(e) => setOrdersFilter({ ...ordersFilter, status: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                data-testid="orders-status-filter"
              >
                <option value="">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="awaiting_payment">Aguardando Pagamento</option>
                <option value="awaiting_admin_approval">Aguardando Aprovação</option>
                <option value="processing">Processando</option>
                <option value="completed">Completo</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <select
                value={ordersFilter.type}
                onChange={(e) => setOrdersFilter({ ...ordersFilter, type: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                data-testid="orders-type-filter"
              >
                <option value="">Todos os Tipos</option>
                <option value="buy">Compra</option>
                <option value="sell">Venda</option>
                <option value="swap">Conversão</option>
              </select>
            </div>

            {/* Orders List */}
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto text-gold-400" size={32} />
              </div>
            ) : orders.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhuma ordem encontrada</p>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div 
                    key={order.id} 
                    className="bg-zinc-800/50 rounded-lg overflow-hidden"
                    data-testid={`order-card-${order.id}`}
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.order_type === 'buy' ? 'bg-green-500/20 text-green-400' :
                            order.order_type === 'sell' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {order.order_type === 'buy' ? 'Compra' : 
                             order.order_type === 'sell' ? 'Venda' : 'Swap'}
                          </span>
                          <div>
                            <span className="text-white font-medium">
                              {order.crypto_amount?.toFixed(6)} {order.crypto_symbol}
                            </span>
                            <span className="text-gray-400 ml-2">
                              (${order.fiat_amount?.toFixed(2)})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'awaiting_admin_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {order.status === 'awaiting_admin_approval' ? 'Aguardando Aprovação' : order.status}
                          </span>
                          {expandedOrder === order.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {expandedOrder === order.id && (
                      <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-gray-400 block">Usuário</span>
                            <span className="text-white">{order.user_email}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Preço</span>
                            <span className="text-white">${order.execution_price?.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Taxa</span>
                            <span className="text-white">${order.fee_amount?.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Data</span>
                            <span className="text-white">{new Date(order.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {order.status === 'awaiting_admin_approval' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => completeOrder(order.id)}
                              data-testid={`complete-order-${order.id}`}
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => cancelOrder(order.id)}
                              data-testid={`cancel-order-${order.id}`}
                            >
                              <XCircle size={16} className="mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bank Transfers Tab */}
      {activeTab === 'transfers' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-gold-400" />
                Transferências Bancárias
              </div>
              <Button variant="ghost" size="sm" onClick={fetchTransfers}>
                <RefreshCw size={16} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={transfersFilter.status}
                onChange={(e) => setTransfersFilter({ ...transfersFilter, status: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                data-testid="transfers-status-filter"
              >
                <option value="">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="awaiting_approval">Aguardando Aprovação</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
                <option value="completed">Completo</option>
              </select>
              <select
                value={transfersFilter.type}
                onChange={(e) => setTransfersFilter({ ...transfersFilter, type: e.target.value })}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                data-testid="transfers-type-filter"
              >
                <option value="">Todos os Tipos</option>
                <option value="deposit">Depósito</option>
                <option value="withdrawal">Saque</option>
              </select>
            </div>

            {/* Transfers List */}
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="animate-spin mx-auto text-gold-400" size={32} />
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhuma transferência encontrada</p>
            ) : (
              <div className="space-y-3">
                {transfers.map(transfer => (
                  <div 
                    key={transfer.id} 
                    className="bg-zinc-800/50 rounded-lg overflow-hidden"
                    data-testid={`transfer-card-${transfer.id}`}
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                      onClick={() => setExpandedTransfer(expandedTransfer === transfer.id ? null : transfer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            transfer.transfer_type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {transfer.transfer_type === 'deposit' ? 'Depósito' : 'Saque'}
                          </span>
                          <div>
                            <span className="text-white font-medium">
                              {transfer.currency} {transfer.amount?.toLocaleString()}
                            </span>
                            <span className="text-gray-400 ml-2">
                              Ref: {transfer.reference_code}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            transfer.status === 'completed' || transfer.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            transfer.status === 'awaiting_approval' ? 'bg-yellow-500/20 text-yellow-400' :
                            transfer.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {transfer.status === 'awaiting_approval' ? 'Aguardando Aprovação' : transfer.status}
                          </span>
                          {expandedTransfer === transfer.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {expandedTransfer === transfer.id && (
                      <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-gray-400 block">Usuário</span>
                            <span className="text-white">{transfer.user_email}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Referência</span>
                            <span className="text-gold-400 font-mono">{transfer.reference_code}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block">Data</span>
                            <span className="text-white">{new Date(transfer.created_at).toLocaleString()}</span>
                          </div>
                          {transfer.proof_document_url && (
                            <div className="col-span-full">
                              <span className="text-gray-400 block">Comprovante</span>
                              <a href={transfer.proof_document_url} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                                Ver comprovante
                              </a>
                            </div>
                          )}
                        </div>

                        {(transfer.status === 'pending' || transfer.status === 'awaiting_approval') && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => approveTransfer(transfer.id)}
                              data-testid={`approve-transfer-${transfer.id}`}
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => rejectTransfer(transfer.id)}
                              data-testid={`reject-transfer-${transfer.id}`}
                            >
                              <XCircle size={16} className="mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bank Accounts Tab */}
      {activeTab === 'bank-accounts' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Banknote size={20} className="text-gold-400" />
              Contas Bancárias KBEX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-zinc-800/50 rounded-lg p-6">
              <h3 className="text-lg text-gold-400 mb-4">
                {editingBankAccount ? `Editar Conta ${editingBankAccount.currency}` : 'Adicionar Nova Conta'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Moeda</label>
                  <select
                    value={newBankAccount.currency}
                    onChange={(e) => setNewBankAccount({...newBankAccount, currency: e.target.value})}
                    disabled={!!editingBankAccount}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nome do Banco</label>
                  <Input
                    value={newBankAccount.bank_name}
                    onChange={(e) => setNewBankAccount({...newBankAccount, bank_name: e.target.value})}
                    placeholder="Ex: Banco Nacional de Portugal"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Nome da Conta</label>
                  <Input
                    value={newBankAccount.account_name}
                    onChange={(e) => setNewBankAccount({...newBankAccount, account_name: e.target.value})}
                    placeholder="KBEX Exchange Ltd"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">IBAN</label>
                  <Input
                    value={newBankAccount.iban}
                    onChange={(e) => setNewBankAccount({...newBankAccount, iban: e.target.value})}
                    placeholder="PT50 0000 0000 0000 0000 0000 0"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">SWIFT/BIC</label>
                  <Input
                    value={newBankAccount.swift_bic}
                    onChange={(e) => setNewBankAccount({...newBankAccount, swift_bic: e.target.value})}
                    placeholder="BNPAFRPP"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Número da Conta</label>
                  <Input
                    value={newBankAccount.account_number}
                    onChange={(e) => setNewBankAccount({...newBankAccount, account_number: e.target.value})}
                    placeholder="Para USD/outros"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Routing Number (USD)</label>
                  <Input
                    value={newBankAccount.routing_number}
                    onChange={(e) => setNewBankAccount({...newBankAccount, routing_number: e.target.value})}
                    placeholder="Para transferências nos EUA"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 mb-1 block">Endereço do Banco</label>
                  <Input
                    value={newBankAccount.bank_address}
                    onChange={(e) => setNewBankAccount({...newBankAccount, bank_address: e.target.value})}
                    placeholder="Morada completa do banco"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm text-gray-400 mb-1 block">Instruções para o Cliente</label>
                  <textarea
                    value={newBankAccount.instructions}
                    onChange={(e) => setNewBankAccount({...newBankAccount, instructions: e.target.value})}
                    placeholder="Instruções adicionais para transferências..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white min-h-[80px]"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  className="bg-gold-500 hover:bg-gold-600 text-black"
                  onClick={saveKbexBankAccount}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                  {editingBankAccount ? 'Atualizar' : 'Criar Conta'}
                </Button>
                {editingBankAccount && (
                  <Button
                    variant="outline"
                    className="border-zinc-700"
                    onClick={() => {
                      setEditingBankAccount(null);
                      setNewBankAccount({
                        currency: 'EUR', bank_name: '', account_name: 'KBEX Exchange Ltd',
                        iban: '', swift_bic: '', account_number: '', routing_number: '', bank_address: '', instructions: ''
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            {/* Existing Accounts */}
            <div>
              <h3 className="text-lg text-white mb-4">Contas Configuradas</h3>
              {kbexBankAccounts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhuma conta bancária configurada</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kbexBankAccounts.map(account => (
                    <div key={account.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{SUPPORTED_CURRENCIES.find(c => c.code === account.currency)?.flag}</span>
                          <span className="text-xl text-white font-medium">{account.currency}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                              setEditingBankAccount(account);
                              setNewBankAccount({
                                currency: account.currency,
                                bank_name: account.bank_name || '',
                                account_name: account.account_name || '',
                                iban: account.iban || '',
                                swift_bic: account.swift_bic || '',
                                account_number: account.account_number || '',
                                routing_number: account.routing_number || '',
                                bank_address: account.bank_address || '',
                                instructions: account.instructions || ''
                              });
                            }}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => deleteKbexBankAccount(account.currency)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">Banco: <span className="text-white">{account.bank_name}</span></p>
                        <p className="text-gray-400">Conta: <span className="text-white">{account.account_name}</span></p>
                        {account.iban && <p className="text-gray-400">IBAN: <span className="text-white font-mono">{account.iban}</span></p>}
                        {account.swift_bic && <p className="text-gray-400">SWIFT: <span className="text-white font-mono">{account.swift_bic}</span></p>}
                        {account.account_number && <p className="text-gray-400">Nº Conta: <span className="text-white">{account.account_number}</span></p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawals Tab */}
      {activeTab === 'withdrawals' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowDownToLine size={20} className="text-gold-400" />
                Pedidos de Levantamento
              </CardTitle>
              <div className="flex gap-2">
                <select
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  value={withdrawalsFilter.status}
                  onChange={(e) => setWithdrawalsFilter({...withdrawalsFilter, status: e.target.value})}
                >
                  <option value="">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="processing">Em Processamento</option>
                  <option value="completed">Concluído</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
                <select
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                  value={withdrawalsFilter.currency}
                  onChange={(e) => setWithdrawalsFilter({...withdrawalsFilter, currency: e.target.value})}
                >
                  <option value="">Todas as Moedas</option>
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchWithdrawals}>
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-gold-400" size={32} />
              </div>
            ) : withdrawals.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum pedido de levantamento encontrado</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map(withdrawal => (
                  <div 
                    key={withdrawal.id} 
                    className="bg-zinc-800/50 rounded-lg overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                      onClick={() => setExpandedWithdrawal(expandedWithdrawal === withdrawal.id ? null : withdrawal.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">
                            {SUPPORTED_CURRENCIES.find(c => c.code === withdrawal.currency)?.flag}
                          </span>
                          <div>
                            <span className="text-white font-medium">
                              {withdrawal.amount?.toFixed(2)} {withdrawal.currency}
                            </span>
                            <span className="text-gray-400 ml-2 text-sm">
                              (Líquido: {withdrawal.net_amount?.toFixed(2)})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 text-sm">{withdrawal.user_email}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            withdrawal.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            withdrawal.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            withdrawal.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                            withdrawal.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {withdrawal.status === 'pending' ? 'Pendente' :
                             withdrawal.status === 'processing' ? 'Processando' :
                             withdrawal.status === 'completed' ? 'Concluído' :
                             withdrawal.status === 'rejected' ? 'Rejeitado' :
                             withdrawal.status === 'cancelled' ? 'Cancelado' : withdrawal.status}
                          </span>
                          {expandedWithdrawal === withdrawal.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {expandedWithdrawal === withdrawal.id && (
                      <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-400">Valor Bruto</p>
                            <p className="text-white">{withdrawal.amount?.toFixed(2)} {withdrawal.currency}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Taxa</p>
                            <p className="text-white">{withdrawal.fee_amount?.toFixed(2)} {withdrawal.currency}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Valor Líquido</p>
                            <p className="text-green-400">{withdrawal.net_amount?.toFixed(2)} {withdrawal.currency}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Data do Pedido</p>
                            <p className="text-white">{new Date(withdrawal.created_at).toLocaleString('pt-PT')}</p>
                          </div>
                        </div>
                        
                        <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
                          <h4 className="text-gold-400 font-medium mb-2">Dados Bancários do Cliente</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Banco</p>
                              <p className="text-white">{withdrawal.bank_name}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Titular</p>
                              <p className="text-white">{withdrawal.account_holder}</p>
                            </div>
                            {withdrawal.iban && (
                              <div>
                                <p className="text-gray-400">IBAN</p>
                                <p className="text-white font-mono">{withdrawal.iban}</p>
                              </div>
                            )}
                            {withdrawal.swift_bic && (
                              <div>
                                <p className="text-gray-400">SWIFT/BIC</p>
                                <p className="text-white font-mono">{withdrawal.swift_bic}</p>
                              </div>
                            )}
                            {withdrawal.account_number && (
                              <div>
                                <p className="text-gray-400">Nº Conta</p>
                                <p className="text-white">{withdrawal.account_number}</p>
                              </div>
                            )}
                            {withdrawal.routing_number && (
                              <div>
                                <p className="text-gray-400">Routing Number</p>
                                <p className="text-white">{withdrawal.routing_number}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {withdrawal.rejection_reason && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                            <p className="text-red-400 text-sm">Motivo da rejeição: {withdrawal.rejection_reason}</p>
                          </div>
                        )}

                        {withdrawal.transaction_reference && (
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                            <p className="text-green-400 text-sm">Referência: {withdrawal.transaction_reference}</p>
                          </div>
                        )}

                        {(withdrawal.status === 'pending' || withdrawal.status === 'processing') && (
                          <div className="flex gap-2">
                            {withdrawal.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                                onClick={() => processWithdrawal(withdrawal.id)}
                              >
                                <Clock size={16} className="mr-1" />
                                Marcar Processando
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => {
                                const ref = window.prompt('Referência da transferência (opcional):');
                                approveWithdrawal(withdrawal.id, ref);
                              }}
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Aprovar e Concluir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => rejectWithdrawal(withdrawal.id)}
                            >
                              <XCircle size={16} className="mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Crypto Withdrawals Tab */}
      {activeTab === 'crypto-withdrawals' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Coins size={20} className="text-gold-400" />
              Levantamentos Crypto Pendentes
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-white text-sm"
                value={cryptoWithdrawalsFilter.status}
                onChange={(e) => setCryptoWithdrawalsFilter({ ...cryptoWithdrawalsFilter, status: e.target.value })}
              >
                <option value="">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="processing">Processando</option>
                <option value="completed">Concluído</option>
                <option value="failed">Falhado</option>
                <option value="rejected">Rejeitado</option>
              </select>
              <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchCryptoWithdrawals}>
                <RefreshCw size={14} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-gold-400" size={32} />
              </div>
            ) : cryptoWithdrawals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Coins size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum levantamento crypto encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cryptoWithdrawals.map(w => (
                  <div key={w.id} className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
                    <button
                      onClick={() => setExpandedCryptoWithdrawal(expandedCryptoWithdrawal === w.id ? null : w.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                            <Coins size={20} className="text-gold-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {w.amount} {w.asset}
                            </div>
                            <div className="text-xs text-gray-400">{w.user_email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            w.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                            w.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {w.status === 'pending' ? 'Pendente' :
                             w.status === 'processing' ? 'Processando' :
                             w.status === 'completed' ? 'Concluído' :
                             w.status === 'rejected' ? 'Rejeitado' : 'Falhado'}
                          </span>
                          {expandedCryptoWithdrawal === w.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        </div>
                      </div>
                    </button>

                    {expandedCryptoWithdrawal === w.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-zinc-700 pt-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Quantidade:</span>
                            <span className="text-white ml-2">{w.amount} {w.asset}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Taxa:</span>
                            <span className="text-yellow-400 ml-2">{w.fee_amount?.toFixed(8)} {w.asset}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Valor Líquido:</span>
                            <span className="text-emerald-400 ml-2">{w.net_amount?.toFixed(8)} {w.asset}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Data:</span>
                            <span className="text-white ml-2">{new Date(w.created_at).toLocaleDateString('pt-PT')}</span>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-400">Endereço Destino:</span>
                          <code className="text-xs text-white bg-zinc-900 px-2 py-1 rounded ml-2 break-all">
                            {w.destination_address}
                          </code>
                        </div>

                        {w.fireblocks_tx_id && (
                          <div className="text-sm">
                            <span className="text-gray-400">Fireblocks TX:</span>
                            <code className="text-xs text-emerald-400 ml-2">{w.fireblocks_tx_id}</code>
                          </div>
                        )}

                        {w.status === 'pending' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600"
                              onClick={() => approveCryptoWithdrawal(w.id)}
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Aprovar e Enviar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                              onClick={() => rejectCryptoWithdrawal(w.id)}
                            >
                              <XCircle size={14} className="mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}

                        {w.admin_note && (
                          <div className="text-sm bg-zinc-900 p-2 rounded">
                            <span className="text-gray-400">Nota:</span>
                            <p className="text-white">{w.admin_note}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminTradingPage;
