import React, { useState, useEffect } from 'react';
import { Search, Star, TrendingUp, TrendingDown } from 'lucide-react';

const PairsList = ({ markets, selectedSymbol, onSelectPair, loading }) => {
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('kbex_trading_favorites');
    return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL'];
  });

  useEffect(() => {
    localStorage.setItem('kbex_trading_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFav = (e, symbol) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const filtered = markets.filter(m =>
    m.symbol.toLowerCase().includes(search.toLowerCase()) ||
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (p) => {
    if (!p) return '0.00';
    if (p >= 100) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className="flex flex-col h-full text-xs" data-testid="pairs-list">
      <div className="px-2 py-1.5 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..." className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded pl-7 pr-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-0 px-2 py-1 text-[10px] text-gray-500 border-b border-zinc-800/50">
        <span>Pair</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.slice(0, 40).map(m => {
          const active = selectedSymbol === `${m.symbol}USDT`;
          return (
            <button key={m.symbol} onClick={() => onSelectPair(m.symbol)}
              className={`w-full grid grid-cols-3 gap-0 px-2 py-1 text-left transition-colors ${active ? 'bg-gold-500/10' : 'hover:bg-zinc-800/50'}`}>
              <div className="flex items-center gap-1">
                <span onClick={(e) => toggleFav(e, m.symbol)} role="button"
                  className={`cursor-pointer ${favorites.includes(m.symbol) ? 'text-gold-400' : 'text-gray-600'}`}>
                  <Star size={10} fill={favorites.includes(m.symbol) ? 'currentColor' : 'none'} />
                </span>
                <span className={`font-medium ${active ? 'text-gold-400' : 'text-white'}`}>{m.symbol}</span>
                <span className="text-gray-600 text-[9px]">/USDT</span>
              </div>
              <span className="text-gray-300 text-right font-mono">{formatPrice(m.price)}</span>
              <span className={`text-right font-mono ${(m.change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(m.change_24h || 0) >= 0 ? '+' : ''}{(m.change_24h || 0).toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PairsList;
