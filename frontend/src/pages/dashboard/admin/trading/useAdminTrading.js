import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', flag: '🇶🇦' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
];

export const useAdminTrading = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('crypto-fees');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Fees state
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
    if (activeTab === 'withdrawals') fetchWithdrawals();
    if (activeTab === 'crypto-withdrawals') fetchCryptoWithdrawals();
  }, [activeTab, ordersFilter, transfersFilter, withdrawalsFilter, cryptoWithdrawalsFilter]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const feesData = response.data.fees_by_currency || {};
      SUPPORTED_CURRENCIES.forEach(curr => {
        if (!feesData[curr.code]) {
          feesData[curr.code] = {
            buy_fee_percent: 2.0, buy_spread_percent: 1.0,
            sell_fee_percent: 2.0, sell_spread_percent: 1.0,
            swap_fee_percent: 1.5, swap_spread_percent: 0.5,
            min_buy_fee: 5.0, min_sell_fee: 5.0, min_swap_fee: 3.0
          };
        }
      });
      setAllFees(feesData);
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar transferencias' });
    } finally {
      setLoading(false);
    }
  };

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
    } catch {
      setMessage({ type: 'error', text: 'Erro ao carregar levantamentos' });
    } finally {
      setLoading(false);
    }
  };

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
      setCryptoFees(prev => prev.map(c => c.symbol === selectedCrypto.symbol ? selectedCrypto : c));
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao salvar taxas' });
    } finally {
      setSavingCrypto(null);
    }
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
      setMessage({ type: 'success', text: 'Transferencia aprovada!' });
      fetchTransfers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao aprovar transferencia' });
    }
  };

  const rejectTransfer = async (transferId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${transferId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Transferencia rejeitada!' });
      fetchTransfers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erro ao rejeitar transferencia' });
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
    const reason = window.prompt('Motivo da rejeicao:');
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
    const reason = window.prompt('Motivo da rejeicao:');
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

  const updateFeeField = (currency, field, value) => {
    setAllFees(prev => ({
      ...prev,
      [currency]: { ...prev[currency], [field]: parseFloat(value) || 0 }
    }));
  };

  const updateCryptoFeeField = (field, value) => {
    setSelectedCrypto(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const updateLimitField = (field, value) => {
    setLimits(prev => ({
      ...prev,
      [selectedTier]: { ...prev[selectedTier], [field]: parseFloat(value) || 0 }
    }));
  };

  return {
    activeTab, setActiveTab, loading, saving, message,
    // Fees
    allFees, selectedFeeCurrency, setSelectedFeeCurrency, savingCurrency,
    saveFees, updateFeeField,
    // Crypto Fees
    cryptoFees, selectedCrypto, setSelectedCrypto, cryptoSearch, setCryptoSearch,
    savingCrypto, saveCryptoFees, updateCryptoFeeField,
    // Limits
    limits, selectedTier, setSelectedTier, saveLimits, updateLimitField,
    // Orders
    orders, ordersFilter, setOrdersFilter, expandedOrder, setExpandedOrder,
    fetchOrders, completeOrder, cancelOrder,
    // Transfers
    transfers, transfersFilter, setTransfersFilter, expandedTransfer, setExpandedTransfer,
    fetchTransfers, approveTransfer, rejectTransfer,
    // Fiat Withdrawals
    withdrawals, withdrawalsFilter, setWithdrawalsFilter, expandedWithdrawal, setExpandedWithdrawal,
    fetchWithdrawals, processWithdrawal, approveWithdrawal, rejectWithdrawal,
    // Crypto Withdrawals
    cryptoWithdrawals, cryptoWithdrawalsFilter, setCryptoWithdrawalsFilter,
    expandedCryptoWithdrawal, setExpandedCryptoWithdrawal,
    fetchCryptoWithdrawals, approveCryptoWithdrawal, rejectCryptoWithdrawal,
  };
};
