import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SpotTrading = ({ selectedSymbol, ticker, onOrderPlaced }) => {
  const { token } = useAuth();
  const [orderType, setOrderType] = useState('market');
  const [side, setSide] = useState(null); // null = show both
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buySlider, setBuySlider] = useState(0);
  const [sellSlider, setSellSlider] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fees, setFees] = useState(null);
  const [balances, setBalances] = useState({ fiat: 0, crypto: 0 });

  const symbol = selectedSymbol.replace('USDT', '');
  const currentPrice = ticker?.lastPrice || 0;

  useEffect(() => {
    if (symbol) {
      fetchFees();
      fetchBalances();
    }
  }, [symbol]);

  useEffect(() => {
    if (currentPrice && orderType === 'market') {
      setBuyPrice(currentPrice.toString());
      setSellPrice(currentPrice.toString());
    }
  }, [currentPrice, orderType]);

  const fetchFees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/trading/fees?crypto=${symbol}`);
      setFees(res.data);
    } catch {}
  };

  const fetchBalances = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/dashboard/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      const fiatBal = data.wallet_value || 0;
      const alloc = data.wallet_allocation || [];
      const cryptoEntry = alloc.find(a => a.symbol === symbol);
      const cryptoBal = cryptoEntry?.balance || 0;
      setBalances({ fiat: fiatBal, crypto: cryptoBal });
    } catch {}
  };

  const handleBuy = async () => {
    if (!buyAmount || loading) return;
    setLoading(true);
    try {
      const fiatAmount = parseFloat(buyAmount) * parseFloat(buyPrice || currentPrice);
      await axios.post(`${API_URL}/api/trading/buy`, {
        crypto_symbol: symbol,
        fiat_amount: fiatAmount,
        payment_method: 'balance',
        network: 'default'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Compra de ${buyAmount} ${symbol} executada`);
      setBuyAmount('');
      setBuySlider(0);
      fetchBalances();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao executar compra');
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!sellAmount || loading) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/trading/sell`, {
        crypto_symbol: symbol,
        crypto_amount: parseFloat(sellAmount),
        payment_method: 'bank_transfer'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Venda de ${sellAmount} ${symbol} executada`);
      setSellAmount('');
      setSellSlider(0);
      fetchBalances();
      if (onOrderPlaced) onOrderPlaced();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao executar venda');
    } finally {
      setLoading(false);
    }
  };

  const feePercent = fees?.buy_fee_percent || 2;

  const buyTotal = buyAmount && buyPrice ? (parseFloat(buyAmount) * parseFloat(buyPrice)).toFixed(2) : '';
  const sellTotal = sellAmount && sellPrice ? (parseFloat(sellAmount) * parseFloat(sellPrice)).toFixed(2) : '';

  const PriceInput = ({ value, onChange, disabled }) => (
    <div className="flex items-center bg-zinc-800/80 border border-zinc-700/50 rounded">
      <span className="text-[10px] text-gray-500 pl-2">Price</span>
      <input type="text" value={disabled ? 'Market' : value} onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 bg-transparent text-right text-xs text-white px-2 py-1.5 focus:outline-none disabled:text-gray-500" />
      <span className="text-[10px] text-gray-400 pr-2">USDT</span>
    </div>
  );

  const AmountInput = ({ value, onChange, unit }) => (
    <div className="flex items-center bg-zinc-800/80 border border-zinc-700/50 rounded">
      <span className="text-[10px] text-gray-500 pl-2">Amount</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="0.00"
        className="flex-1 bg-transparent text-right text-xs text-white px-2 py-1.5 focus:outline-none placeholder-gray-600" />
      <span className="text-[10px] text-gray-400 pr-2">{unit}</span>
    </div>
  );

  const SliderBar = ({ value, onChange }) => (
    <div className="flex items-center gap-1 py-1">
      {[0, 25, 50, 75, 100].map(pct => (
        <button key={pct} onClick={() => onChange(pct)}
          className={`flex-1 h-1 rounded-full transition-colors ${value >= pct ? 'bg-gold-500' : 'bg-zinc-700'}`} />
      ))}
    </div>
  );

  const TotalInput = ({ value }) => (
    <div className="flex items-center bg-zinc-800/80 border border-zinc-700/50 rounded">
      <span className="text-[10px] text-gray-500 pl-2">Total</span>
      <input type="text" value={value} readOnly
        className="flex-1 bg-transparent text-right text-xs text-gray-400 px-2 py-1.5 focus:outline-none" />
      <span className="text-[10px] text-gray-400 pr-2">USDT</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full text-xs" data-testid="spot-trading">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium font-sans text-xs">Spot</span>
          <span className="text-[10px] text-gray-500">{feePercent}% Fee</span>
        </div>
      </div>

      {/* Order type tabs */}
      <div className="px-3 pt-2 flex items-center gap-2 text-[11px]">
        {['limit', 'market'].map(t => (
          <button key={t} onClick={() => setOrderType(t)}
            className={`px-2 py-0.5 rounded capitalize transition-colors ${orderType === t ? 'text-gold-400 bg-gold-500/10' : 'text-gray-500 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Buy / Sell side by side */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Buy Side */}
        <div className="flex-1 flex flex-col gap-1.5">
          <PriceInput value={buyPrice} onChange={setBuyPrice} disabled={orderType === 'market'} />
          <AmountInput value={buyAmount} onChange={setBuyAmount} unit={symbol} />
          <SliderBar value={buySlider} onChange={(pct) => {
            setBuySlider(pct);
            if (balances.fiat > 0 && currentPrice > 0) {
              const maxCrypto = balances.fiat / currentPrice;
              setBuyAmount((maxCrypto * pct / 100).toFixed(6));
            }
          }} />
          <TotalInput value={buyTotal} />

          <div className="mt-1 text-[10px] text-gray-500 flex justify-between">
            <span>Avbl</span>
            <span>{balances.fiat.toFixed(2)} USDT</span>
          </div>

          <button onClick={handleBuy} disabled={loading || !buyAmount}
            className="mt-auto w-full py-2 rounded text-xs font-semibold transition-colors bg-[#0ecb81] hover:bg-[#0ecb81]/80 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="buy-btn">
            {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : `Buy ${symbol}`}
          </button>
        </div>

        {/* Sell Side */}
        <div className="flex-1 flex flex-col gap-1.5">
          <PriceInput value={sellPrice} onChange={setSellPrice} disabled={orderType === 'market'} />
          <AmountInput value={sellAmount} onChange={setSellAmount} unit={symbol} />
          <SliderBar value={sellSlider} onChange={(pct) => {
            setSellSlider(pct);
            if (balances.crypto > 0) {
              setSellAmount((balances.crypto * pct / 100).toFixed(6));
            }
          }} />
          <TotalInput value={sellTotal} />

          <div className="mt-1 text-[10px] text-gray-500 flex justify-between">
            <span>Avbl</span>
            <span>{balances.crypto.toFixed(6)} {symbol}</span>
          </div>

          <button onClick={handleSell} disabled={loading || !sellAmount}
            className="mt-auto w-full py-2 rounded text-xs font-semibold transition-colors bg-[#f6465d] hover:bg-[#f6465d]/80 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="sell-btn">
            {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : `Sell ${symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpotTrading;
