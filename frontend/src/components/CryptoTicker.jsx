import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

// Mock crypto data (will be replaced with backend API later)
const mockCryptoData = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 94250,
    change: 2.45
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3580,
    change: 1.82
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.89,
    change: -0.56
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    price: 142.30,
    change: 3.21
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    price: 2.18,
    change: -1.15
  }
];

const CryptoTicker = () => {
  const [cryptoData, setCryptoData] = useState(mockCryptoData);
  const [loading, setLoading] = useState(false);

  // Simulate price updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCryptoData(prevData =>
        prevData.map(crypto => ({
          ...crypto,
          price: crypto.price * (1 + (Math.random() - 0.5) * 0.002), // ±0.1% change
          change: crypto.change + (Math.random() - 0.5) * 0.2 // Small change variation
        }))
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="crypto-ticker-container overflow-hidden">
      <div className="crypto-ticker-track flex items-center space-x-8">
        {/* Duplicate for seamless scroll */}
        {[...cryptoData, ...cryptoData].map((crypto, index) => (
          <div
            key={`${crypto.symbol}-${index}`}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            <span className="text-amber-400 font-medium text-sm tracking-wide">
              {crypto.symbol}
            </span>
            <span className="text-white text-sm font-light">
              {formatPrice(crypto.price)}
            </span>
            <span
              className={`flex items-center space-x-1 text-xs font-light ${
                crypto.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {crypto.change >= 0 ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              <span>{formatChange(crypto.change)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CryptoTicker;
