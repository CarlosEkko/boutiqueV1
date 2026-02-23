import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback data in case CoinMarketCap API fails
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
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [selectedFiat, setSelectedFiat] = useState('USD');
  const [showFiatDropdown, setShowFiatDropdown] = useState(false);
  const [dataSource, setDataSource] = useState('');

  const fetchCryptoPrices = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/crypto-prices`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.prices && data.prices.length > 0) {
        setCryptoData(data.prices);
        setIsLive(true);
        setDataSource(data.source || 'coinmarketcap');
        setError(null);
      }
    } catch (err) {
      console.warn('Failed to fetch crypto prices, using fallback data:', err.message);
      setError(err.message);
      setIsLive(false);
      setDataSource('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchCryptoPrices]);

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
        <div className="flex items-center space-x-1 mr-4 flex-shrink-0">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-green-400 uppercase tracking-wider">Live</span>
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
