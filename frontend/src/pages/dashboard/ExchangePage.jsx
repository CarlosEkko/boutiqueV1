import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  ArrowDownUp, 
  CreditCard, 
  Building2, 
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ArrowRight,
  ChevronDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ExchangePage = () => {
  const { token, user } = useAuth();
  const { currency, currentCurrency, formatCurrency, convertFromUSD, convertToUSD } = useCurrency();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('buy');
  const [cryptos, setCryptos] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [fees, setFees] = useState(null);
  const [limits, setLimits] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  
  // For swap
  const [fromCrypto, setFromCrypto] = useState(null);
  const [toCrypto, setToCrypto] = useState(null);
  const [fromAmount, setFromAmount] = useState('');
  
  // For sell
  const [sellAmount, setSellAmount] = useState('');
  
  // Input mode toggle (fiat or crypto units)
  const [inputMode, setInputMode] = useState('fiat'); // 'fiat' or 'crypto'
  const [cryptoAmount, setCryptoAmount] = useState('');
  
  // Payment status polling
  const [pollingStatus, setPollingStatus] = useState(null);

  useEffect(() => {
    fetchCryptos();
    // Fees will be loaded when selectedCrypto is set
    if (token) {
      fetchLimits();
      fetchOrders();
    }
    
    // Check for payment return
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');
    const cancelled = searchParams.get('cancelled');
    
    if (sessionId && orderId) {
      pollPaymentStatus(sessionId, orderId);
    } else if (cancelled) {
      setOrderResult({
        success: false,
        message: 'Pagamento cancelado'
      });
    }
  }, [token, searchParams]);

  // Refetch cryptos when currency changes
  useEffect(() => {
    fetchCryptos();
  }, [currency]);

  // Auto-refresh prices every second for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCryptos(true); // silent refresh
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currency]);

  // Refetch fees when selected crypto changes (for buy/sell)
  useEffect(() => {
    if (selectedCrypto && (activeTab === 'buy' || activeTab === 'sell')) {
      fetchFees(selectedCrypto.symbol);
    }
  }, [selectedCrypto?.symbol, activeTab]);

  // Refetch fees when fromCrypto changes (for swap)
  useEffect(() => {
    if (fromCrypto && activeTab === 'swap') {
      fetchFees(fromCrypto.symbol);
    }
  }, [fromCrypto?.symbol, activeTab]);

  const fetchCryptos = async (silent = false) => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/cryptos?currency=${currency}`);
      
      // Update prices while preserving selections
      setCryptos(prevCryptos => {
        // If silent refresh, just update prices
        if (silent && prevCryptos.length > 0) {
          return response.data;
        }
        return response.data;
      });
      
      // Only set selections on initial load
      if (!silent && response.data.length > 0) {
        setSelectedCrypto(prev => prev || response.data[0]);
        setFromCrypto(prev => prev || response.data[0]);
        if (response.data.length > 1) {
          setToCrypto(prev => prev || response.data[1]);
        }
      } else if (silent) {
        // Update selected crypto prices on silent refresh
        setSelectedCrypto(prev => {
          if (prev) {
            const updated = response.data.find(c => c.symbol === prev.symbol);
            return updated || prev;
          }
          return prev;
        });
        setFromCrypto(prev => {
          if (prev) {
            const updated = response.data.find(c => c.symbol === prev.symbol);
            return updated || prev;
          }
          return prev;
        });
        setToCrypto(prev => {
          if (prev) {
            const updated = response.data.find(c => c.symbol === prev.symbol);
            return updated || prev;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch cryptos', err);
    }
  };

  const fetchFees = async (cryptoSymbol = null) => {
    try {
      const params = cryptoSymbol ? `?crypto=${cryptoSymbol}` : '';
      const response = await axios.get(`${API_URL}/api/trading/fees${params}`);
      setFees(response.data);
    } catch (err) {
      console.error('Failed to fetch fees', err);
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/limits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLimits(response.data);
    } catch (err) {
      console.error('Failed to fetch limits', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  const pollPaymentStatus = async (sessionId, orderId, attempts = 0) => {
    if (attempts >= 10) {
      setPollingStatus('timeout');
      return;
    }
    
    setPollingStatus('checking');
    
    try {
      const response = await axios.get(`${API_URL}/api/trading/payment-status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.payment_status === 'paid') {
        setPollingStatus('success');
        setOrderResult({
          success: true,
          message: 'Pagamento confirmado! Sua compra foi processada.',
          orderId
        });
        fetchOrders();
      } else if (response.data.status === 'expired') {
        setPollingStatus('expired');
        setOrderResult({
          success: false,
          message: 'Sessão de pagamento expirada'
        });
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, orderId, attempts + 1), 2000);
      }
    } catch (err) {
      setTimeout(() => pollPaymentStatus(sessionId, orderId, attempts + 1), 2000);
    }
  };

  const handleBuy = async () => {
    if (!selectedCrypto) return;
    
    // Determine fiat amount based on input mode
    let fiatAmountToSend;
    if (inputMode === 'fiat') {
      if (!amount) return;
      fiatAmountToSend = parseFloat(amount);
    } else {
      if (!cryptoAmount || !buyPreview) return;
      fiatAmountToSend = buyPreview.total;
    }
    
    setLoading(true);
    setOrderResult(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/trading/buy`,
        {
          crypto_symbol: selectedCrypto.symbol,
          fiat_amount: fiatAmountToSend,
          payment_method: paymentMethod,
          network: selectedCrypto.networks?.[0]
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Origin': window.location.origin
          }
        }
      );
      
      if (paymentMethod === 'card' && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        setOrderResult(response.data);
      }
    } catch (err) {
      setOrderResult({
        success: false,
        message: err.response?.data?.detail || 'Erro ao processar ordem'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!selectedCrypto || !sellAmount) return;
    
    setLoading(true);
    setOrderResult(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/trading/sell`,
        {
          crypto_symbol: selectedCrypto.symbol,
          crypto_amount: parseFloat(sellAmount),
          payment_method: 'bank_transfer'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOrderResult(response.data);
      fetchOrders();
    } catch (err) {
      setOrderResult({
        success: false,
        message: err.response?.data?.detail || 'Erro ao processar ordem'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!fromCrypto || !toCrypto || !fromAmount) return;
    
    setLoading(true);
    setOrderResult(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/trading/swap`,
        {
          from_crypto: fromCrypto.symbol,
          to_crypto: toCrypto.symbol,
          from_amount: parseFloat(fromAmount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOrderResult(response.data);
      fetchOrders();
    } catch (err) {
      setOrderResult({
        success: false,
        message: err.response?.data?.detail || 'Erro ao processar ordem'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBuyPreview = () => {
    if (!selectedCrypto || !fees) return null;
    
    const price = selectedCrypto.price || selectedCrypto.price_usd || 0;
    const feePercent = fees.buy_fee_percent || 2;
    const networkFee = convertFromUSD(fees.network_fees?.ethereum || 5);
    
    let fiatAmount, cryptoAmountResult;
    
    if (inputMode === 'fiat') {
      if (!amount) return null;
      fiatAmount = parseFloat(amount);
      const feeAmount = Math.max(fiatAmount * (feePercent / 100), convertFromUSD(5));
      const usableAmount = fiatAmount - feeAmount - networkFee;
      cryptoAmountResult = usableAmount / price;
      
      return {
        cryptoAmount: cryptoAmountResult > 0 ? cryptoAmountResult : 0,
        fee: feeAmount,
        networkFee,
        total: fiatAmount,
        price
      };
    } else {
      if (!cryptoAmount) return null;
      const targetCrypto = parseFloat(cryptoAmount);
      // Work backwards: total = (cryptoAmount * price + networkFee) / (1 - feePercent/100)
      const baseValue = targetCrypto * price + networkFee;
      fiatAmount = baseValue / (1 - feePercent / 100);
      const feeAmount = fiatAmount * (feePercent / 100);
      
      return {
        cryptoAmount: targetCrypto,
        fee: feeAmount,
        networkFee,
        total: fiatAmount,
        price
      };
    }
  };

  const calculateSellPreview = () => {
    if (!selectedCrypto || !sellAmount || !fees) return null;
    
    const cryptoAmount = parseFloat(sellAmount);
    const price = selectedCrypto.price || selectedCrypto.price_usd || 0;
    const feePercent = fees.sell_fee_percent || 2;
    
    const grossAmount = cryptoAmount * price;
    const feeAmount = Math.max(grossAmount * (feePercent / 100), convertFromUSD(5));
    const netAmount = grossAmount - feeAmount;
    
    return {
      grossAmount,
      fee: feeAmount,
      netAmount: netAmount > 0 ? netAmount : 0,
      price
    };
  };

  const calculateSwapPreview = () => {
    if (!fromCrypto || !toCrypto || !fromAmount || !fees) return null;
    
    const amount = parseFloat(fromAmount);
    const fromPrice = fromCrypto.price || fromCrypto.price_usd || 0;
    const toPrice = toCrypto.price || toCrypto.price_usd || 0;
    const feePercent = fees.swap_fee_percent || 1.5;
    
    const fromValue = amount * fromPrice;
    const feeAmount = Math.max(fromValue * (feePercent / 100), convertFromUSD(3));
    const netValue = fromValue - feeAmount;
    const toAmount = netValue / toPrice;
    
    return {
      fromValue,
      fee: feeAmount,
      toAmount: toAmount > 0 ? toAmount : 0,
      rate: fromPrice / toPrice
    };
  };

  const buyPreview = calculateBuyPreview();
  const sellPreview = calculateSellPreview();
  const swapPreview = calculateSwapPreview();

  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const [fromCryptoDropdownOpen, setFromCryptoDropdownOpen] = useState(false);
  const [toCryptoDropdownOpen, setToCryptoDropdownOpen] = useState(false);
  
  const CryptoSelector = ({ value, onChange, exclude = null, dropdownOpen, setDropdownOpen }) => {
    const filteredCryptos = cryptos.filter(c => !exclude || c.symbol !== exclude.symbol);
    
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-gold-500 hover:border-zinc-600 transition-colors"
          data-testid="crypto-selector"
        >
          <div className="flex items-center gap-3">
            {value?.logo && (
              <img 
                src={value.logo} 
                alt={value.symbol} 
                className="w-6 h-6 rounded-full"
                loading="eager"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <span className="font-medium">{value?.symbol || 'Selecionar'}</span>
            <span className="text-gray-400 text-sm">{value?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {value && formatCurrency(value.price || value.price_usd)}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {dropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {filteredCryptos.map(crypto => (
              <button
                key={crypto.symbol}
                type="button"
                onClick={() => {
                  onChange(crypto);
                  setDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-700/50 transition-colors ${
                  value?.symbol === crypto.symbol ? 'bg-gold-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {crypto.logo && (
                    <img 
                      src={crypto.logo} 
                      alt={crypto.symbol} 
                      className="w-6 h-6 rounded-full"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span className="font-medium text-white">{crypto.symbol}</span>
                  <span className="text-gray-400 text-sm">{crypto.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{formatCurrency(crypto.price || crypto.price_usd)}</div>
                  <div className={`text-xs ${crypto.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {crypto.change_24h >= 0 ? '+' : ''}{crypto.change_24h?.toFixed(2)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="exchange-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">{t('dashboard.exchange.title')}</h1>
          <p className="text-gray-400 mt-1">{t('dashboard.exchange.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-500/10"
          onClick={() => setShowOrders(!showOrders)}
          data-testid="toggle-orders-btn"
        >
          {showOrders ? t('nav.hideOrders') : t('dashboard.exchange.viewMyOrders')}
        </Button>
      </div>

      {/* Payment Status Banner */}
      {pollingStatus && (
        <div className={`p-4 rounded-lg ${
          pollingStatus === 'checking' ? 'bg-blue-500/20 border border-blue-500/30' :
          pollingStatus === 'success' ? 'bg-green-500/20 border border-green-500/30' :
          'bg-red-500/20 border border-red-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {pollingStatus === 'checking' && <Loader2 className="animate-spin text-blue-400" size={20} />}
            {pollingStatus === 'success' && <CheckCircle className="text-green-400" size={20} />}
            {(pollingStatus === 'timeout' || pollingStatus === 'expired') && <XCircle className="text-red-400" size={20} />}
            <span className={
              pollingStatus === 'checking' ? 'text-blue-400' :
              pollingStatus === 'success' ? 'text-green-400' :
              'text-red-400'
            }>
              {pollingStatus === 'checking' && 'Verificando pagamento...'}
              {pollingStatus === 'success' && 'Pagamento confirmado!'}
              {pollingStatus === 'timeout' && 'Tempo esgotado. Verifique suas ordens.'}
              {pollingStatus === 'expired' && 'Sessão de pagamento expirada.'}
            </span>
          </div>
        </div>
      )}

      {/* Orders List */}
      {showOrders && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Minhas Ordens</span>
              <Button variant="ghost" size="sm" onClick={fetchOrders} data-testid="refresh-orders-btn">
                <RefreshCw size={16} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nenhuma ordem encontrada</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {orders.slice(0, 10).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg" data-testid={`order-${order.id}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          order.order_type === 'buy' ? 'bg-green-500/20 text-green-400' :
                          order.order_type === 'sell' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {order.order_type === 'buy' ? 'Compra' : 
                           order.order_type === 'sell' ? 'Venda' : 'Swap'}
                        </span>
                        <span className="text-white font-medium">
                          {order.crypto_amount?.toFixed(6)} {order.crypto_symbol}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        order.status === 'pending' || order.status === 'awaiting_payment' ? 'bg-yellow-500/20 text-yellow-400' :
                        order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {order.status === 'completed' ? 'Completo' :
                         order.status === 'pending' ? 'Pendente' :
                         order.status === 'awaiting_payment' ? 'Aguardando Pagamento' :
                         order.status === 'awaiting_admin_approval' ? 'Aguardando Aprovação' :
                         order.status === 'processing' ? 'Processando' :
                         order.status === 'cancelled' ? 'Cancelado' : order.status}
                      </span>
                      <p className="text-sm text-gray-400 mt-1">
                        ${order.fiat_amount?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Trading Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Form */}
        <div className="lg:col-span-2">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              <button
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'buy' 
                    ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('buy')}
                data-testid="buy-tab"
              >
                <TrendingUp className="inline mr-2" size={18} />
                {t('dashboard.exchange.buy')}
              </button>
              <button
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'sell' 
                    ? 'text-red-400 border-b-2 border-red-400 bg-red-500/5' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('sell')}
                data-testid="sell-tab"
              >
                <TrendingDown className="inline mr-2" size={18} />
                {t('dashboard.exchange.sell')}
              </button>
              <button
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'swap' 
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' 
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('swap')}
                data-testid="swap-tab"
              >
                <ArrowDownUp className="inline mr-2" size={18} />
                {t('dashboard.exchange.convert')}
              </button>
            </div>

            <CardContent className="p-6">
              {/* Buy Form */}
              {activeTab === 'buy' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">{t('dashboard.exchange.cryptocurrency')}</label>
                    <CryptoSelector 
                      value={selectedCrypto} 
                      onChange={setSelectedCrypto}
                      dropdownOpen={cryptoDropdownOpen}
                      setDropdownOpen={setCryptoDropdownOpen}
                    />
                  </div>
                  
                  {/* Amount Input with Segmented Control */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-400">{t('dashboard.exchange.amount') || 'Montante'}</label>
                      <div className="flex bg-zinc-800 rounded-full p-0.5">
                        <button
                          type="button"
                          onClick={() => setInputMode('fiat')}
                          className={`px-3 py-1 text-xs rounded-full transition-all ${
                            inputMode === 'fiat' 
                              ? 'bg-gold-600/80 text-white' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                          data-testid="input-mode-fiat"
                        >
                          {currency}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInputMode('crypto')}
                          className={`px-3 py-1 text-xs rounded-full transition-all ${
                            inputMode === 'crypto' 
                              ? 'bg-gold-600/80 text-white' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                          data-testid="input-mode-crypto"
                        >
                          {selectedCrypto?.symbol || 'BTC'}
                        </button>
                      </div>
                    </div>
                    
                    {inputMode === 'fiat' ? (
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{currentCurrency.symbol}</span>
                        <Input
                          type="number" step="any"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="bg-zinc-800 border-zinc-700 text-white pl-10"
                          data-testid="buy-amount-input"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          type="number" step="any"
                          value={cryptoAmount}
                          onChange={(e) => setCryptoAmount(e.target.value)}
                          placeholder="0.00"
                          className="bg-zinc-800 border-zinc-700 text-white pr-16"
                          data-testid="buy-crypto-amount-input"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                          {selectedCrypto?.symbol}
                        </span>
                      </div>
                    )}
                    
                    {/* Conversion hint */}
                    {((inputMode === 'fiat' && amount) || (inputMode === 'crypto' && cryptoAmount)) && selectedCrypto && (
                      <p className="text-xs text-gray-500 mt-1">
                        ≈ {inputMode === 'fiat' 
                          ? `${(parseFloat(amount) / (selectedCrypto.price || selectedCrypto.price_usd || 1)).toFixed(6)} ${selectedCrypto.symbol}`
                          : formatCurrency(parseFloat(cryptoAmount) * (selectedCrypto.price || selectedCrypto.price_usd || 0))
                        }
                      </p>
                    )}
                    
                    {limits && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('dashboard.exchange.limit')}: {formatCurrency(convertFromUSD(limits.limits?.min_buy_amount))} - {formatCurrency(convertFromUSD(limits.limits?.max_buy_amount))}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">{t('dashboard.exchange.paymentMethod')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className={`p-4 rounded-lg border transition-all ${
                          paymentMethod === 'card'
                            ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                            : 'border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }`}
                        onClick={() => setPaymentMethod('card')}
                        data-testid="payment-card-btn"
                      >
                        <CreditCard className="mx-auto mb-2" size={24} />
                        <span className="text-sm">{t('dashboard.exchange.card')}</span>
                      </button>
                      <button
                        className={`p-4 rounded-lg border transition-all ${
                          paymentMethod === 'bank_transfer'
                            ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                            : 'border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }`}
                        onClick={() => setPaymentMethod('bank_transfer')}
                        data-testid="payment-bank-btn"
                      >
                        <Building2 className="mx-auto mb-2" size={24} />
                        <span className="text-sm">{t('dashboard.exchange.bankTransfer')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  {buyPreview && (
                    <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('dashboard.cryptoWithdrawal.youWillReceive')}</span>
                        <span className="text-white font-medium">
                          {buyPreview.cryptoAmount.toFixed(6)} {selectedCrypto?.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('dashboard.fiatWithdrawal.fee')}</span>
                        <span className="text-gray-300">{formatCurrency(buyPreview.fee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('dashboard.cryptoWithdrawal.networkFee')}</span>
                        <span className="text-gray-300">{formatCurrency(buyPreview.networkFee)}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="text-gold-400 font-semibold">{formatCurrency(buyPreview.total)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3"
                    onClick={handleBuy}
                    disabled={loading || (!amount && !cryptoAmount) || !selectedCrypto}
                    data-testid="buy-submit-btn"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" size={18} />
                    ) : (
                      <TrendingUp className="mr-2" size={18} />
                    )}
                    {loading ? t('admin.common.loading') : t('dashboard.exchange.buy')}
                  </Button>
                </div>
              )}

              {/* Sell Form */}
              {activeTab === 'sell' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Criptomoeda</label>
                    <CryptoSelector 
                      value={selectedCrypto} 
                      onChange={setSelectedCrypto}
                      dropdownOpen={cryptoDropdownOpen}
                      setDropdownOpen={setCryptoDropdownOpen}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Quantidade</label>
                    <div className="relative">
                      <Input
                        type="number" step="any"
                        value={sellAmount}
                        onChange={(e) => setSellAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-zinc-800 border-zinc-700 text-white"
                        data-testid="sell-amount-input"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {selectedCrypto?.symbol}
                      </span>
                    </div>
                  </div>

                  {/* Preview */}
                  {sellPreview && sellAmount && (
                    <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Valor Bruto</span>
                        <span className="text-white">{formatCurrency(sellPreview.grossAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa</span>
                        <span className="text-gray-300">-{formatCurrency(sellPreview.fee)}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Você recebe</span>
                          <span className="text-gold-400 font-semibold">{formatCurrency(sellPreview.netAmount)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-blue-400 text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      Vendas são processadas via transferência bancária após aprovação.
                    </p>
                  </div>

                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3"
                    onClick={handleSell}
                    disabled={loading || !sellAmount || !selectedCrypto}
                    data-testid="sell-submit-btn"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" size={18} />
                    ) : (
                      <TrendingDown className="mr-2" size={18} />
                    )}
                    {loading ? 'Processando...' : 'Vender'}
                  </Button>
                </div>
              )}

              {/* Swap Form */}
              {activeTab === 'swap' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">De</label>
                    <CryptoSelector 
                      value={fromCrypto} 
                      onChange={setFromCrypto} 
                      exclude={toCrypto}
                      dropdownOpen={fromCryptoDropdownOpen}
                      setDropdownOpen={setFromCryptoDropdownOpen}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Quantidade</label>
                    <div className="relative">
                      <Input
                        type="number" step="any"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-zinc-800 border-zinc-700 text-white"
                        data-testid="swap-amount-input"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {fromCrypto?.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button 
                      className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
                      onClick={() => {
                        const temp = fromCrypto;
                        setFromCrypto(toCrypto);
                        setToCrypto(temp);
                      }}
                      data-testid="swap-switch-btn"
                    >
                      <ArrowDownUp className="text-gold-400" size={20} />
                    </button>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Para</label>
                    <CryptoSelector 
                      value={toCrypto} 
                      onChange={setToCrypto} 
                      exclude={fromCrypto}
                      dropdownOpen={toCryptoDropdownOpen}
                      setDropdownOpen={setToCryptoDropdownOpen}
                    />
                  </div>

                  {/* Preview */}
                  {swapPreview && fromAmount && (
                    <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa de Câmbio</span>
                        <span className="text-white">
                          1 {fromCrypto?.symbol} = {swapPreview.rate.toFixed(6)} {toCrypto?.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa</span>
                        <span className="text-gray-300">{formatCurrency(swapPreview.fee)}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Você recebe</span>
                          <span className="text-gold-400 font-semibold">
                            {swapPreview.toAmount.toFixed(6)} {toCrypto?.symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
                    onClick={handleSwap}
                    disabled={loading || !fromAmount || !fromCrypto || !toCrypto}
                    data-testid="swap-submit-btn"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" size={18} />
                    ) : (
                      <ArrowDownUp className="mr-2" size={18} />
                    )}
                    {loading ? 'Processando...' : 'Converter'}
                  </Button>
                </div>
              )}

              {/* Order Result */}
              {orderResult && (
                <div className={`mt-6 p-4 rounded-lg ${
                  orderResult.success 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    {orderResult.success ? (
                      <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                    ) : (
                      <XCircle className="text-red-400 flex-shrink-0" size={20} />
                    )}
                    <div className="flex-1">
                      <p className={orderResult.success ? 'text-green-400' : 'text-red-400'}>
                        {orderResult.message}
                      </p>
                      
                      {/* Bank Transfer Details */}
                      {orderResult.bank_transfer && (
                        <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg space-y-3">
                          <h4 className="text-white font-medium">Dados Bancários</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">IBAN</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono">{orderResult.bank_transfer.recipient_iban}</span>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(orderResult.bank_transfer.recipient_iban)}
                                  className="text-gold-400 hover:text-gold-300"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Referência</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gold-400 font-mono font-bold">{orderResult.bank_transfer.reference_code}</span>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(orderResult.bank_transfer.reference_code)}
                                  className="text-gold-400 hover:text-gold-300"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Valor</span>
                              <span className="text-white">{orderResult.bank_transfer.currency} {orderResult.bank_transfer.amount}</span>
                            </div>
                          </div>
                          <p className="text-yellow-400 text-xs mt-2">
                            Use o código de referência na descrição da transferência!
                          </p>
                        </div>
                      )}

                      {/* Order Summary */}
                      {orderResult.summary && (
                        <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {orderResult.summary.crypto_amount && (
                              <div>
                                <span className="text-gray-400">Quantidade: </span>
                                <span className="text-white">{orderResult.summary.crypto_amount.toFixed(6)} {orderResult.summary.crypto_symbol}</span>
                              </div>
                            )}
                            {orderResult.summary.to_amount && (
                              <div>
                                <span className="text-gray-400">Recebido: </span>
                                <span className="text-white">{orderResult.summary.to_amount.toFixed(6)} {orderResult.summary.to_crypto}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Market Info */}
        <div className="space-y-6">
          {/* Selected Crypto Info */}
          {selectedCrypto && (
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  {selectedCrypto.symbol}
                  <span className="text-sm text-gray-400 font-normal">{selectedCrypto.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-light text-white">
                      {formatCurrency(selectedCrypto.price || selectedCrypto.price_usd)}
                    </span>
                    <span className={`text-sm ${selectedCrypto.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedCrypto.change_24h >= 0 ? '+' : ''}{selectedCrypto.change_24h?.toFixed(2)}%
                    </span>
                  </div>
                  {selectedCrypto.market_cap && (
                    <div className="text-sm text-gray-400">
                      Market Cap: {formatCurrency(selectedCrypto.market_cap / 1e9)}B
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Limits */}
          {limits && (
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Seus Limites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tier</span>
                  <span className="text-gold-400 capitalize">{limits.tier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Limite Diário Compra</span>
                  <span className="text-white">{formatCurrency(convertFromUSD(limits.limits?.daily_buy_limit))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Usado Hoje</span>
                  <span className="text-white">{formatCurrency(convertFromUSD(limits.usage?.daily_buy_used || 0))}</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-1">
                  <div 
                    className="bg-gold-500 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min((limits.usage?.daily_buy_used || 0) / limits.limits?.daily_buy_limit * 100, 100)}%` 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangePage;
