import React, { useState, useEffect } from 'react';
import { Search, Star } from 'lucide-react';

const QUOTE_TABS = [
  { key: 'USDT', label: 'USDT' },
  { key: 'BTC', label: 'BTC' },
  { key: 'ETH', label: 'ETH' },
  { key: 'EUR', label: 'EUR' },
  { key: 'USD', label: 'USD' },
  { key: 'BRL', label: 'BRL' },
  { key: 'FIAT', label: 'Fiat' },
];

// Binance pairs per quote currency
const CRYPTO_PAIRS = {
  USDT: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK', 'MATIC', 'UNI', 'ATOM', 'LTC', 'FIL', 'XMR', 'NEAR', 'APT', 'ARB', 'OP', 'INJ', 'SUI', 'TIA', 'SEI', 'AAVE', 'MKR', 'CRV', 'PEPE', 'SHIB', 'WIF'],
  BTC: ['ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK', 'LTC', 'UNI', 'ATOM', 'FIL', 'XMR', 'NEAR', 'AAVE'],
  ETH: ['BTC', 'SOL', 'XRP', 'LINK', 'UNI', 'AAVE', 'LDO', 'ARB', 'OP', 'MATIC'],
  EUR: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK', 'LTC'],
  USD: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'DOT', 'AVAX'],
  BRL: ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'USDT'],
  FIAT: [],  // Populated from EUR + USD + BRL
};

const PairsList = ({ markets, selectedSymbol, onSelectPair, loading }) => {
  const [search, setSearch] = useState('');
  const [activeQuote, setActiveQuote] = useState('USDT');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('kbex_trading_favorites');
    return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL'];
  });

  useEffect(() => {
    localStorage.setItem('kbex_trading_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFav = (e, pairKey) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(pairKey) ? prev.filter(s => s !== pairKey) : [...prev, pairKey]);
  };

  const formatPrice = (p) => {
    if (!p) return '0.00';
    if (p >= 1000) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    if (p >= 0.001) return p.toFixed(6);
    return p.toFixed(8);
  };

  // Build pairs list based on active quote
  const buildPairs = () => {
    if (activeQuote === 'FIAT') {
      const fiatPairs = [];
      ['EUR', 'USD', 'BRL'].forEach(fiat => {
        (CRYPTO_PAIRS[fiat] || []).forEach(base => {
          const market = markets.find(m => m.symbol === base);
          fiatPairs.push({
            base,
            quote: fiat,
            pair: `${base}/${fiat}`,
            binanceSymbol: `${base}${fiat}`,
            price: market?.price || 0,
            change: market?.change_24h || 0,
            name: market?.name || base,
          });
        });
      });
      return fiatPairs;
    }

    const bases = CRYPTO_PAIRS[activeQuote] || [];
    return bases.map(base => {
      const market = markets.find(m => m.symbol === base);
      return {
        base,
        quote: activeQuote,
        pair: `${base}/${activeQuote}`,
        binanceSymbol: `${base}${activeQuote}`,
        price: market?.price || 0,
        change: market?.change_24h || 0,
        name: market?.name || base,
      };
    });
  };

  const pairs = buildPairs();
  const filtered = search
    ? pairs.filter(p => p.base.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase()))
    : pairs;

  return (
    <div className="flex flex-col h-full text-xs" data-testid="pairs-list">
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded pl-7 pr-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50" />
        </div>
      </div>

      {/* Quote tabs */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-zinc-800/50 overflow-x-auto">
        <button onClick={() => setActiveQuote('FAV')}
          className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 transition-colors ${activeQuote === 'FAV' ? 'text-gold-400 bg-gold-500/10' : 'text-gray-500 hover:text-white'}`}>
          <Star size={10} fill={activeQuote === 'FAV' ? 'currentColor' : 'none'} />
        </button>
        {QUOTE_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveQuote(tab.key)}
            className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 transition-colors ${activeQuote === tab.key ? 'text-gold-400 bg-gold-500/10' : 'text-gray-500 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="grid grid-cols-3 gap-0 px-2 py-0.5 text-[10px] text-gray-600 border-b border-zinc-800/30">
        <span>Pair</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
      </div>

      {/* Pairs */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeQuote === 'FAV' ? (
          // Favorites view
          favorites.length === 0 ? (
            <div className="text-center py-4 text-gray-600 text-[10px]">No favorites</div>
          ) : (
            markets.filter(m => favorites.includes(m.symbol)).map(m => {
              const active = selectedSymbol === `${m.symbol}USDT`;
              return (
                <button key={m.symbol} onClick={() => onSelectPair(m.symbol, 'USDT')}
                  className={`w-full grid grid-cols-3 gap-0 px-2 py-1 text-left transition-colors ${active ? 'bg-gold-500/10' : 'hover:bg-zinc-800/50'}`}>
                  <div className="flex items-center gap-1">
                    <span onClick={(e) => toggleFav(e, m.symbol)} role="button" className="text-gold-400 cursor-pointer">
                      <Star size={10} fill="currentColor" />
                    </span>
                    <span className={`font-medium ${active ? 'text-gold-400' : 'text-white'}`}>{m.symbol}</span>
                    <span className="text-gray-600 text-[9px]">/USDT</span>
                  </div>
                  <span className="text-gray-300 text-right font-mono">{formatPrice(m.price)}</span>
                  <span className={`text-right font-mono ${(m.change_24h || 0) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                    {(m.change_24h || 0) >= 0 ? '+' : ''}{(m.change_24h || 0).toFixed(2)}%
                  </span>
                </button>
              );
            })
          )
        ) : (
          filtered.map(p => {
            const active = selectedSymbol === p.binanceSymbol;
            const isFiat = ['EUR', 'USD', 'BRL', 'AED'].includes(p.quote);
            return (
              <button key={p.binanceSymbol} onClick={() => onSelectPair(p.base, p.quote)}
                className={`w-full grid grid-cols-3 gap-0 px-2 py-1 text-left transition-colors ${active ? 'bg-gold-500/10' : 'hover:bg-zinc-800/50'}`}>
                <div className="flex items-center gap-1">
                  <span onClick={(e) => toggleFav(e, p.base)} role="button"
                    className={`cursor-pointer ${favorites.includes(p.base) ? 'text-gold-400' : 'text-gray-600'}`}>
                    <Star size={10} fill={favorites.includes(p.base) ? 'currentColor' : 'none'} />
                  </span>
                  <span className={`font-medium ${active ? 'text-gold-400' : 'text-white'}`}>{p.base}</span>
                  <span className={`text-[9px] ${isFiat ? 'text-blue-400' : 'text-gray-600'}`}>/{p.quote}</span>
                </div>
                <span className="text-gray-300 text-right font-mono">{formatPrice(p.price)}</span>
                <span className={`text-right font-mono ${p.change >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PairsList;
