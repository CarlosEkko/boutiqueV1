import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
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
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ExchangePage = () => {
  const { token, user } = useAuth();
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
  
  // Payment status polling
  const [pollingStatus, setPollingStatus] = useState(null);

  useEffect(() => {
    fetchCryptos();
    fetchFees();
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

  const fetchCryptos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/cryptos`);
      setCryptos(response.data);
      if (response.data.length > 0) {
        setSelectedCrypto(response.data[0]);
        setFromCrypto(response.data[0]);
        if (response.data.length > 1) {
          setToCrypto(response.data[1]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cryptos', err);
    }
  };

  const fetchFees = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/fees`);
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
    if (!selectedCrypto || !amount) return;
    
    setLoading(true);
    setOrderResult(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/trading/buy`,
        {
          crypto_symbol: selectedCrypto.symbol,
          fiat_amount: parseFloat(amount),
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
    if (!selectedCrypto || !amount || !fees) return null;
    
    const fiatAmount = parseFloat(amount);
    const price = selectedCrypto.price_usd || 0;
    const feePercent = fees.buy_fee_percent || 2;
    const networkFee = fees.network_fees?.ethereum || 5;
    
    const feeAmount = Math.max(fiatAmount * (feePercent / 100), 5);
    const usableAmount = fiatAmount - feeAmount - networkFee;
    const cryptoAmount = usableAmount / price;
    
    return {
      cryptoAmount: cryptoAmount > 0 ? cryptoAmount : 0,
      fee: feeAmount,
      networkFee,
      total: fiatAmount,
      price
    };
  };

  const calculateSellPreview = () => {
    if (!selectedCrypto || !sellAmount || !fees) return null;
    
    const cryptoAmount = parseFloat(sellAmount);
    const price = selectedCrypto.price_usd || 0;
    const feePercent = fees.sell_fee_percent || 2;
    
    const grossAmount = cryptoAmount * price;
    const feeAmount = Math.max(grossAmount * (feePercent / 100), 5);
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
    const fromPrice = fromCrypto.price_usd || 0;
    const toPrice = toCrypto.price_usd || 0;
    const feePercent = fees.swap_fee_percent || 1.5;
    
    const fromUsd = amount * fromPrice;
    const feeAmount = Math.max(fromUsd * (feePercent / 100), 3);
    const netUsd = fromUsd - feeAmount;
    const toAmount = netUsd / toPrice;
    
    return {
      fromUsd,
      fee: feeAmount,
      toAmount: toAmount > 0 ? toAmount : 0,
      rate: fromPrice / toPrice
    };
  };

  const buyPreview = calculateBuyPreview();
  const sellPreview = calculateSellPreview();
  const swapPreview = calculateSwapPreview();

  const CryptoSelector = ({ value, onChange, exclude = null }) => (
    <div className="relative">
      <select
        value={value?.symbol || ''}
        onChange={(e) => {
          const crypto = cryptos.find(c => c.symbol === e.target.value);
          onChange(crypto);
        }}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:border-gold-500"
        data-testid="crypto-selector"
      >
        {cryptos.filter(c => !exclude || c.symbol !== exclude.symbol).map(crypto => (
          <option key={crypto.symbol} value={crypto.symbol}>
            {crypto.symbol} - {crypto.name}
          </option>
        ))}
      </select>
      {value && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          ${value.price_usd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="exchange-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">Exchange</h1>
          <p className="text-gray-400 mt-1">Compre, venda e converta criptomoedas</p>
        </div>
        <Button
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-500/10"
          onClick={() => setShowOrders(!showOrders)}
          data-testid="toggle-orders-btn"
        >
          {showOrders ? 'Esconder Ordens' : 'Ver Minhas Ordens'}
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
                Comprar
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
                Vender
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
                Converter
              </button>
            </div>

            <CardContent className="p-6">
              {/* Buy Form */}
              {activeTab === 'buy' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Criptomoeda</label>
                    <CryptoSelector value={selectedCrypto} onChange={setSelectedCrypto} />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Valor em USD</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-zinc-800 border-zinc-700 text-white pl-8"
                        data-testid="buy-amount-input"
                      />
                    </div>
                    {limits && (
                      <p className="text-xs text-gray-500 mt-1">
                        Limite: ${limits.limits?.min_buy_amount?.toFixed(2)} - ${limits.limits?.max_buy_amount?.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Método de Pagamento</label>
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
                        <span className="text-sm">Cartão</span>
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
                        <span className="text-sm">Transferência</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  {buyPreview && amount && (
                    <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Você receberá</span>
                        <span className="text-white font-medium">
                          {buyPreview.cryptoAmount.toFixed(6)} {selectedCrypto?.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa</span>
                        <span className="text-gray-300">${buyPreview.fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa de Rede</span>
                        <span className="text-gray-300">${buyPreview.networkFee.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total</span>
                          <span className="text-gold-400 font-semibold">${buyPreview.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3"
                    onClick={handleBuy}
                    disabled={loading || !amount || !selectedCrypto}
                    data-testid="buy-submit-btn"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin mr-2" size={18} />
                    ) : (
                      <TrendingUp className="mr-2" size={18} />
                    )}
                    {loading ? 'Processando...' : 'Comprar'}
                  </Button>
                </div>
              )}

              {/* Sell Form */}
              {activeTab === 'sell' && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Criptomoeda</label>
                    <CryptoSelector value={selectedCrypto} onChange={setSelectedCrypto} />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Quantidade</label>
                    <div className="relative">
                      <Input
                        type="number"
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
                        <span className="text-white">${sellPreview.grossAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Taxa</span>
                        <span className="text-gray-300">-${sellPreview.fee.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-zinc-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Você recebe</span>
                          <span className="text-gold-400 font-semibold">${sellPreview.netAmount.toFixed(2)}</span>
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
                    <CryptoSelector value={fromCrypto} onChange={setFromCrypto} exclude={toCrypto} />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Quantidade</label>
                    <div className="relative">
                      <Input
                        type="number"
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
                    <CryptoSelector value={toCrypto} onChange={setToCrypto} exclude={fromCrypto} />
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
                        <span className="text-gray-300">${swapPreview.fee.toFixed(2)}</span>
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
                      ${selectedCrypto.price_usd?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-sm ${selectedCrypto.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedCrypto.change_24h >= 0 ? '+' : ''}{selectedCrypto.change_24h?.toFixed(2)}%
                    </span>
                  </div>
                  {selectedCrypto.market_cap && (
                    <div className="text-sm text-gray-400">
                      Market Cap: ${(selectedCrypto.market_cap / 1e9).toFixed(2)}B
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
                  <span className="text-white">${limits.limits?.daily_buy_limit?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Usado Hoje</span>
                  <span className="text-white">${limits.usage?.daily_buy_used?.toFixed(2) || '0.00'}</span>
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

          {/* Fees Info */}
          {fees && (
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Taxas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Compra</span>
                  <span className="text-white">{fees.buy_fee_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Venda</span>
                  <span className="text-white">{fees.sell_fee_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Conversão</span>
                  <span className="text-white">{fees.swap_fee_percent}%</span>
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
