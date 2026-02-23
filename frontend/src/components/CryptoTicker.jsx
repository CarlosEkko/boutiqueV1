import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fallback mock data in case API fails
const fallbackCryptoData = [
  { symbol: 'BTC', name: 'Bitcoin', price: 94250, change_24h: 2.45 },
  { symbol: 'ETH', name: 'Ethereum', price: 3580, change_24h: 1.82 },
  { symbol: 'ADA', name: 'Cardano', price: 0.89, change_24h: -0.56 },
  { symbol: 'SOL', name: 'Solana', price: 142.30, change_24h: 3.21 },
  { symbol: 'XRP', name: 'Ripple', price: 2.18, change_24h: -1.15 }
];

const CryptoTicker = () => {
  const [cryptoData, setCryptoData] = useState(fallbackCryptoData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

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
        setError(null);
      }
    } catch (err) {
      console.warn('Failed to fetch crypto prices, using fallback data:', err.message);
      setError(err.message);
      setIsLive(false);
      // Keep using current data (fallback or last successful fetch)
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchCryptoPrices();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchCryptoPrices, 60000);
    
    return () => clearInterval(interval);
  }, [fetchCryptoPrices]);

  // Small price fluctuations for visual effect (only when not live)
  useEffect(() => {
    if (isLive) return; // Don't simulate when we have live data
    
    const interval = setInterval(() => {
      setCryptoData(prevData =>
        prevData.map(crypto => ({
          ...crypto,
          price: crypto.price * (1 + (Math.random() - 0.5) * 0.002),
          change_24h: crypto.change_24h + (Math.random() - 0.5) * 0.1
        }))
      );
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  const formatPrice = (price) => {
    if (price >= 1000) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(4)}`;
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
    <div className="crypto-ticker-container overflow-hidden relative">
      {/* Live indicator */}
      {isLive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center space-x-1 pr-4 bg-gradient-to-r from-black via-black to-transparent">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-green-400 uppercase tracking-wider">Live</span>
        </div>
      )}
      
      <div className="crypto-ticker-track flex items-center space-x-8">
        {/* Duplicate for seamless scroll */}
        {[...cryptoData, ...cryptoData].map((crypto, index) => (
          <div
            key={`${crypto.symbol}-${index}`}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <span className="text-amber-400 font-medium text-sm tracking-wide font-['Inter']">
              {crypto.symbol}
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
