import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback data in case connection fails
const fallbackCryptoData = [
  { symbol: 'BTC', name: 'Bitcoin', price: 64500, change_24h: -2.5 },
  { symbol: 'ETH', name: 'Ethereum', price: 1850, change_24h: -3.2 },
  { symbol: 'ADA', name: 'Cardano', price: 0.26, change_24h: -1.8 },
  { symbol: 'SOL', name: 'Solana', price: 78, change_24h: -4.1 },
  { symbol: 'XRP', name: 'Ripple', price: 1.36, change_24h: -2.0 }
];

// Exchange rates (USD base)
const exchangeRates = {
  USD: { rate: 1, symbol: '$' },
  EUR: { rate: 0.92, symbol: '€' },
  AED: { rate: 3.67, symbol: 'د.إ' },
  BRL: { rate: 5.80, symbol: 'R$' }
};

const fiatCurrencies = ['USD', 'EUR', 'AED', 'BRL'];

const CryptoTicker = () => {
  const [cryptoData, setCryptoData] = useState(fallbackCryptoData);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [showFiatDropdown, setShowFiatDropdown] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const fallbackIntervalRef = useRef(null);

  // Build WebSocket URL from API_URL
  const getWsUrl = useCallback(() => {
    if (!API_URL) return null;
    const wsProtocol = API_URL.startsWith('https') ? 'wss' : 'ws';
    const host = API_URL.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/api/ws/prices`;
  }, []);

  // Fallback HTTP fetch
  const fetchCryptoPrices = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/crypto-prices`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.prices && data.prices.length > 0) {
        setCryptoData(data.prices);
        setIsLive(true);
        setDataSource('api');
      }
    } catch (err) {
      console.warn('HTTP fallback failed:', err.message);
      setIsLive(false);
      setDataSource('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) {
      fetchCryptoPrices();
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempts.current = 0;
        setDataSource('ws_live');
        // Clear fallback polling if running
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
        // Send ping every 30s to keep alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
        ws._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const msg = JSON.parse(event.data);
          if (msg.type === 'prices' && msg.data) {
            setCryptoData(msg.data);
            setIsLive(true);
            setDataSource(msg.source || 'ws_live');
            setLoading(false);
          }
        } catch (e) {
          console.warn('WS parse error:', e);
        }
      };

      ws.onclose = (event) => {
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        wsRef.current = null;

        // Reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        } else {
          // Fallback to HTTP polling
          setDataSource('api_fallback');
          startFallbackPolling();
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };
    } catch (err) {
      console.warn('WebSocket creation failed:', err);
      startFallbackPolling();
    }
  }, [getWsUrl, fetchCryptoPrices]);

  const startFallbackPolling = useCallback(() => {
    if (!fallbackIntervalRef.current) {
      fetchCryptoPrices();
      fallbackIntervalRef.current = setInterval(fetchCryptoPrices, 30000);
    }
  }, [fetchCryptoPrices]);

  useEffect(() => {
    // Initial HTTP fetch for fast first paint, then connect WS
    fetchCryptoPrices();
    // Small delay then try WebSocket
    const wsTimer = setTimeout(connectWebSocket, 1000);

    return () => {
      clearTimeout(wsTimer);
      if (wsRef.current) {
        if (wsRef.current._pingInterval) clearInterval(wsRef.current._pingInterval);
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    };
  }, [connectWebSocket, fetchCryptoPrices]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.fiat-selector')) {
        setShowFiatDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const convertPrice = (usdPrice) => {
    const { rate } = exchangeRates[selectedFiat];
    return usdPrice * rate;
  };

  const formatPrice = (price) => {
    const convertedPrice = convertPrice(price);
    const { symbol } = exchangeRates[selectedFiat];
    if (convertedPrice >= 1000) {
      return `${symbol}${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (convertedPrice >= 1) {
      return `${symbol}${convertedPrice.toFixed(2)}`;
    } else {
      return `${symbol}${convertedPrice.toFixed(4)}`;
    }
  };

  const formatChange = (change) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  // Connection status indicator
  const getStatusIndicator = () => {
    if (dataSource.startsWith('ws') || dataSource === 'binance_live') {
      return { color: 'bg-green-500', label: 'LIVE' };
    }
    if (dataSource === 'api' || dataSource === 'api_fallback' || dataSource === 'cache') {
      return { color: 'bg-yellow-500', label: 'CMC' };
    }
    return { color: 'bg-red-500', label: 'OFF' };
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-6 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2 animate-pulse">
            <div className="w-12 h-4 bg-zinc-800 rounded"></div>
            <div className="w-16 h-4 bg-zinc-800 rounded"></div>
            <div className="w-12 h-4 bg-zinc-800 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const status = getStatusIndicator();

  return (
    <div className="crypto-ticker-container overflow-hidden relative flex items-center">
      {/* Fiat Currency Selector */}
      <div className="fiat-selector relative z-20 mr-4 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFiatDropdown(!showFiatDropdown);
          }}
          className="flex items-center space-x-1 px-2 py-1 bg-zinc-900/80 border border-gold-800/30 rounded text-xs text-gold-400 hover:border-gold-500/50 transition-colors"
          data-testid="fiat-selector"
        >
          <span className="font-medium">{selectedFiat}</span>
          <ChevronDown size={12} className={`transition-transform ${showFiatDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showFiatDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-gold-800/30 rounded shadow-lg overflow-hidden z-[200]">
            {fiatCurrencies.map((currency) => (
              <button
                key={currency}
                onClick={() => {
                  setSelectedFiat(currency);
                  setShowFiatDropdown(false);
                }}
                className={`block w-full px-3 py-1.5 text-xs text-left transition-colors ${
                  selectedFiat === currency
                    ? 'bg-gold-800/30 text-gold-400'
                    : 'text-gray-300 hover:bg-zinc-800'
                }`}
                data-testid={`fiat-option-${currency.toLowerCase()}`}
              >
                <span className="font-medium">{currency}</span>
                <span className="text-gray-500 ml-1">{exchangeRates[currency].symbol}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center space-x-1 mr-4 flex-shrink-0" title={`Source: ${dataSource}`}>
          <div className={`w-2 h-2 ${status.color} rounded-full animate-pulse`} />
          <span className="text-[10px] text-green-400 uppercase tracking-wider">{status.label}</span>
        </div>
      )}
      
      {/* Crypto Ticker */}
      <div className="crypto-ticker-track flex items-center space-x-8 overflow-hidden">
        {[...cryptoData, ...cryptoData].map((crypto, index) => (
          <div
            key={`${crypto.symbol}-${index}`}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <span className="text-gold-400 font-medium text-sm tracking-wide font-['Inter']">
              {crypto.symbol}/{selectedFiat}
            </span>
            <span className="text-white text-sm font-light font-['Inter']">
              {formatPrice(crypto.price)}
            </span>
            <span
              className={`flex items-center space-x-1 text-xs font-light font-['Inter'] ${
                crypto.change_24h >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {crypto.change_24h >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              <span>{formatChange(crypto.change_24h)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
