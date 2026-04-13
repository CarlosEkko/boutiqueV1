import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useBinanceStream } from './trading/useBinanceStream';
import OrderBook from './trading/OrderBook';
import MarketTrades from './trading/MarketTrades';
import SpotTrading from './trading/SpotTrading';
import PairsList from './trading/PairsList';
import TradingChart from './trading/TradingChart';
import OpenOrders from './trading/OpenOrders';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getPricePrecision = (symbol) => {
  const high = ['BTC'];
  const mid = ['ETH', 'BNB', 'SOL'];
  const base = symbol.replace('USDT', '');
  if (high.includes(base)) return 2;
  if (mid.includes(base)) return 2;
  return 4;
};

const TradingTerminal = () => {
  const { user } = useAuth();
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [markets, setMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [orderRefresh, setOrderRefresh] = useState(0);

  const { orderBook, trades, ticker } = useBinanceStream(selectedSymbol);
  const pricePrecision = getPricePrecision(selectedSymbol);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/trading/markets?currency=USD`);
      setMarkets(res.data.markets || []);
    } catch (err) {
      console.error('Failed to fetch markets', err);
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);

  useEffect(() => {
    const interval = setInterval(fetchMarkets, 15000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const handleSelectPair = (symbol) => {
    setSelectedSymbol(`${symbol}USDT`);
  };

  const handleOrderPlaced = () => {
    setOrderRefresh(prev => prev + 1);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#0b0e11] text-white overflow-hidden" data-testid="trading-terminal">

      {/* Top ticker bar */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-3 gap-6 text-xs shrink-0 bg-[#0b0e11]">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{selectedSymbol.replace('USDT', '/USDT')}</span>
        </div>
        {ticker && (
          <>
            <span className={`text-sm font-bold ${ticker.priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {ticker.lastPrice.toFixed(pricePrecision)}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">24h Change</span>
              <span className={ticker.priceChange >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                {ticker.priceChangePercent >= 0 ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">24h High</span>
              <span className="text-white">{ticker.high.toFixed(pricePrecision)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">24h Low</span>
              <span className="text-white">{ticker.low.toFixed(pricePrecision)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">24h Vol</span>
              <span className="text-white">
                {ticker.quoteVolume >= 1e9 ? `$${(ticker.quoteVolume / 1e9).toFixed(2)}B` :
                 ticker.quoteVolume >= 1e6 ? `$${(ticker.quoteVolume / 1e6).toFixed(2)}M` :
                 `$${ticker.quoteVolume.toFixed(0)}`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main scrollable area */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Order Book (full height) */}
        <div className="w-[220px] border-r border-zinc-800 flex flex-col shrink-0">
          <OrderBook orderBook={orderBook} ticker={ticker} pricePrecision={pricePrecision} />
        </div>

        {/* CENTER: Chart → Spot → Orders (vertically stacked, scrollable) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Chart */}
          <div className="h-[420px] shrink-0 border-b border-zinc-800">
            <TradingChart symbol={selectedSymbol} />
          </div>

          {/* Spot Trading Form (full width) */}
          <div className="shrink-0 border-b border-zinc-800">
            <SpotTrading selectedSymbol={selectedSymbol} ticker={ticker} onOrderPlaced={handleOrderPlaced} isLoggedIn={!!user} />
          </div>

          {/* Open Orders / History / Trade History / Holdings tabs */}
          <div className="h-[280px] shrink-0">
            <OpenOrders refreshTrigger={orderRefresh} isLoggedIn={!!user} />
          </div>
        </div>

        {/* RIGHT: Pairs + Market Trades */}
        <div className="w-[260px] border-l border-zinc-800 flex flex-col shrink-0">
          <div className="h-[45%] border-b border-zinc-800">
            <PairsList markets={markets} selectedSymbol={selectedSymbol}
              onSelectPair={handleSelectPair} loading={marketsLoading} />
          </div>
          <div className="flex-1">
            <MarketTrades trades={trades} pricePrecision={pricePrecision} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingTerminal;
