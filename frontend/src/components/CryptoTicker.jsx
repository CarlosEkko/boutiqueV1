import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CryptoTicker = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCryptoPrices = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana,ripple&vs_currencies=usd&include_24hr_change=true'
      );
      const data = await response.json();
      
      const formattedData = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: data.bitcoin.usd,
          change: data.bitcoin.usd_24h_change
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: data.ethereum.usd,
          change: data.ethereum.usd_24h_change
        },
        {
          symbol: 'ADA',
          name: 'Cardano',
          price: data.cardano.usd,
          change: data.cardano.usd_24h_change
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price: data.solana.usd,
          change: data.solana.usd_24h_change
        },
        {
          symbol: 'XRP',
          name: 'Ripple',
          price: data.ripple.usd,
          change: data.ripple.usd_24h_change
        }
      ];
      
      setCryptoData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoPrices();
    // Update every 60 seconds
    const interval = setInterval(fetchCryptoPrices, 60000);
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
