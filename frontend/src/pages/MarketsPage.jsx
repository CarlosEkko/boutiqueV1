import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { useCurrency } from '../context/CurrencyContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  TrendingUp, TrendingDown, Star, Search, ArrowUpDown, RefreshCw,
  Globe, BarChart3, Loader2, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Native SVG Sparkline
const Sparkline = ({ data, color = '#D4AF37', width = 120, height = 40 }) => {
  if (!data || data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-80">
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#grad-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const MarketsPage = () => {
  const { t } = useLanguage();
  const { selectedCurrency } = useCurrency();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('spot');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('kbex_market_favorites');
    return saved ? JSON.parse(saved) : ['BTC', 'ETH'];
  });
  const [sortConfig, setSortConfig] = useState({ key: 'market_cap', direction: 'desc' });
  const [markets, setMarkets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const wsRef = useRef(null);
  const sparkDataRef = useRef({});

  // Fetch markets from API
  const fetchMarkets = useCallback(async () => {
    try {
      const [marketsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/trading/markets`, { params: { currency: selectedCurrency } }),
        axios.get(`${API_URL}/api/trading/markets/stats`, { params: { currency: selectedCurrency } })
      ]);
      const mkts = marketsRes.data.markets || [];
      setMarkets(mkts);
      setStats(statsRes.data);
      setLastUpdate(new Date());
      // Init sparkline data
      mkts.forEach(m => {
        if (!sparkDataRef.current[m.symbol]) {
          sparkDataRef.current[m.symbol] = [m.price];
        }
      });
    } catch (err) {
      console.error('Error fetching markets:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  // WebSocket for real-time prices
  useEffect(() => {
    if (wsRef.current) wsRef.current.close();

    const symbols = markets.slice(0, 20).map(m => `${m.symbol.toLowerCase()}usdt@ticker`);
    if (symbols.length === 0) return;

    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbols.join('/')}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const d = msg.data;
      if (!d) return;
      const sym = d.s?.replace('USDT', '');
      if (sym) {
        const price = parseFloat(d.c);
        const change24h = parseFloat(d.P);
        setLivePrices(prev => ({ ...prev, [sym]: { price, change24h } }));
        // Add to sparkline
        if (!sparkDataRef.current[sym]) sparkDataRef.current[sym] = [];
        sparkDataRef.current[sym].push(price);
        if (sparkDataRef.current[sym].length > 30) sparkDataRef.current[sym].shift();
      }
    };
    ws.onerror = () => setTimeout(() => {}, 3000);
    wsRef.current = ws;

    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [markets.length > 0 ? markets[0].symbol : '']);

  useEffect(() => {
    localStorage.setItem('kbex_market_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbol) => {
    setFavorites(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  };

  const getPrice = (m) => livePrices[m.symbol]?.price || m.price;
  const getChange = (m) => livePrices[m.symbol]?.change24h ?? m.change_24h;

  const getCurrencySymbol = (c) => ({ USD: '$', EUR: '\u20ac', AED: 'AED ', BRL: 'R$' }[c] || '$');

  const formatPrice = (price) => {
    if (!price) return `${getCurrencySymbol(selectedCurrency)}0.00`;
    const s = getCurrencySymbol(selectedCurrency);
    if (price >= 1000) return `${s}${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `${s}${price.toFixed(2)}`;
    if (price >= 0.01) return `${s}${price.toFixed(4)}`;
    return `${s}${price.toFixed(6)}`;
  };

  const formatVolume = (v) => {
    if (!v) return `${getCurrencySymbol(selectedCurrency)}0`;
    const s = getCurrencySymbol(selectedCurrency);
    if (v >= 1e12) return `${s}${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${s}${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${s}${(v / 1e6).toFixed(2)}M`;
    return `${s}${v.toFixed(0)}`;
  };

  const filterAndSort = () => {
    let data = [...markets];
    if (activeTab === 'gainers') data = data.filter(m => getChange(m) > 0).sort((a, b) => getChange(b) - getChange(a));
    else if (activeTab === 'losers') data = data.filter(m => getChange(m) < 0).sort((a, b) => getChange(a) - getChange(b));
    else if (activeTab === 'favorites') data = data.filter(m => favorites.includes(m.symbol));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(m => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }

    return data.sort((a, b) => {
      let aV = sortConfig.key === 'price' ? getPrice(a) : (a[sortConfig.key] || 0);
      let bV = sortConfig.key === 'price' ? getPrice(b) : (b[sortConfig.key] || 0);
      return sortConfig.direction === 'desc' ? bV - aV : aV - bV;
    });
  };

  const featured = ['BTC', 'ETH', 'SOL', 'XRP'];
  const tabs = [
    { id: 'spot', label: t('markets.spot', 'Todos') },
    { id: 'gainers', label: t('markets.gainers', 'Maiores Altas') },
    { id: 'losers', label: t('markets.losers', 'Maiores Quedas') },
    { id: 'favorites', label: t('markets.favorites', 'Favoritos'), icon: Star },
  ];

  const SortHeader = ({ label, sortKey, align = 'right', className = '' }) => (
    <th className={`px-4 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400 transition-colors ${className}`}
      onClick={() => handleSort(sortKey)}>
      <span className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}<ArrowUpDown size={10} className={sortConfig.key === sortKey ? 'text-gold-400' : ''} />
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-1">{t('markets.title', 'Mercados')}</h1>
              <p className="text-gray-500 text-sm">{t('markets.subtitle', 'Precos em tempo real das principais criptomoedas')}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <Zap size={12} className="text-green-400" />
              <span className="text-green-400">Live</span>
              {lastUpdate && <span>{lastUpdate.toLocaleTimeString()}</span>}
              <Button variant="ghost" size="sm" onClick={fetchMarkets} className="text-gray-500 hover:text-gold-400 h-7 w-7 p-0" disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 text-[11px] uppercase tracking-wider mb-1.5"><Globe size={12} />Market Cap</div>
                <p className="text-lg font-mono text-white">{formatVolume(stats.total_market_cap)}</p>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 text-[11px] uppercase tracking-wider mb-1.5"><BarChart3 size={12} />Volume 24h</div>
                <p className="text-lg font-mono text-white">{formatVolume(stats.total_volume_24h)}</p>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 text-[11px] uppercase tracking-wider mb-1.5"><TrendingUp size={12} className="text-[#0ecb81]" />Maior Alta</div>
                {stats.top_gainer && <p className="text-lg font-mono text-[#0ecb81]">{stats.top_gainer.symbol} <span className="text-sm">+{stats.top_gainer.change_24h}%</span></p>}
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 text-[11px] uppercase tracking-wider mb-1.5"><TrendingDown size={12} className="text-[#f6465d]" />Maior Queda</div>
                {stats.top_loser && <p className="text-lg font-mono text-[#f6465d]">{stats.top_loser.symbol} <span className="text-sm">{stats.top_loser.change_24h}%</span></p>}
              </div>
            </div>
          )}

          {/* Featured - Native Sparklines */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {featured.map(sym => {
              const m = markets.find(x => x.symbol === sym);
              if (!m) return null;
              const price = getPrice(m);
              const change = getChange(m);
              const isUp = change >= 0;
              const sparkData = sparkDataRef.current[sym] || [price];
              return (
                <div key={sym} onClick={() => navigate(`/trading?symbol=${sym}USDT`)}
                  className="bg-zinc-900/40 border border-zinc-800/30 rounded-lg p-4 cursor-pointer hover:border-gold-500/30 transition-all group"
                  data-testid={`featured-${sym}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <img src={m.logo} alt={sym} className="w-6 h-6 rounded-full" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${sym}&background=1a1a2e&color=D4AF37&size=24`; }} />
                      <span className="text-white font-medium text-sm">{sym}</span>
                      <span className="text-gray-600 text-xs">/USDT</span>
                    </div>
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isUp ? 'text-[#0ecb81] bg-[#0ecb81]/10' : 'text-[#f6465d] bg-[#f6465d]/10'}`}>
                      {isUp ? '+' : ''}{change?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xl font-mono text-white mb-2">{formatPrice(price)}</p>
                  <Sparkline data={sparkData} color={isUp ? '#0ecb81' : '#f6465d'} width={200} height={40} />
                </div>
              );
            })}
          </div>

          {/* Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-gold-500/15 text-gold-400' : 'text-gray-500 hover:text-white'}`}
                  data-testid={`tab-${tab.id}`}>
                  {tab.icon && <tab.icon size={12} />}
                  {tab.label}
                  {tab.id === 'favorites' && <span className="text-[10px] bg-gold-500/20 px-1 rounded">{favorites.length}</span>}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
              <Input type="text" placeholder={t('markets.search', 'Pesquisar...')} value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-zinc-900/50 border-zinc-800/50 text-white text-xs" data-testid="market-search" />
            </div>
          </div>

          {/* Table */}
          <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-lg overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="markets-table">
                  <thead>
                    <tr className="border-b border-zinc-800/30">
                      <th className="px-3 py-2.5 w-8"><Star size={12} className="text-gray-600" /></th>
                      <th className="px-2 py-2.5 text-left text-[10px] text-gray-600 uppercase w-8">#</th>
                      <th className="px-3 py-2.5 text-left text-[10px] text-gray-600 uppercase">{t('markets.name', 'Nome')}</th>
                      <SortHeader label={t('markets.price', 'Preco')} sortKey="price" />
                      <SortHeader label="1h" sortKey="change_1h" />
                      <SortHeader label="24h" sortKey="change_24h" />
                      <SortHeader label="7d" sortKey="change_7d" className="hidden md:table-cell" />
                      <SortHeader label="Vol. 24h" sortKey="volume_24h" className="hidden lg:table-cell" />
                      <th className="px-3 py-2.5 text-right text-[10px] text-gray-600 uppercase hidden lg:table-cell">Grafico 7d</th>
                      <th className="px-3 py-2.5 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterAndSort().map((m, i) => {
                      const price = getPrice(m);
                      const change = getChange(m);
                      const sparkData = sparkDataRef.current[m.symbol] || [price];
                      const isUp = change >= 0;
                      return (
                        <tr key={m.symbol} className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors" data-testid={`market-row-${i}`}>
                          <td className="px-3 py-3">
                            <button onClick={() => toggleFavorite(m.symbol)} className={favorites.includes(m.symbol) ? 'text-gold-400' : 'text-gray-700 hover:text-gold-400'}>
                              <Star size={13} fill={favorites.includes(m.symbol) ? 'currentColor' : 'none'} />
                            </button>
                          </td>
                          <td className="px-2 py-3 text-gray-600 text-xs">{m.rank || i + 1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <img src={m.logo} alt={m.symbol} className="w-7 h-7 rounded-full" onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${m.symbol}&background=1a1a2e&color=D4AF37&size=28`; }} />
                              <div>
                                <span className="text-white font-medium text-sm">{m.symbol}</span>
                                <span className="text-gray-600 text-xs ml-1.5 hidden sm:inline">{m.name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right"><span className="text-white font-mono text-sm">{formatPrice(price)}</span></td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-mono ${(m.change_1h || 0) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                              {(m.change_1h || 0) >= 0 ? '+' : ''}{(m.change_1h || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-mono ${isUp ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                              {isUp ? '+' : ''}{change?.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <span className={`text-xs font-mono ${(m.change_7d || 0) >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                              {(m.change_7d || 0) >= 0 ? '+' : ''}{(m.change_7d || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-xs font-mono hidden lg:table-cell">{formatVolume(m.volume_24h)}</td>
                          <td className="px-3 py-3 hidden lg:table-cell">
                            <div className="flex justify-end"><Sparkline data={sparkData} color={isUp ? '#0ecb81' : '#f6465d'} width={80} height={28} /></div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button size="sm" onClick={() => navigate(`/trading?symbol=${m.symbol}USDT`)}
                              className="bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 border border-gold-500/20 h-7 text-xs px-3"
                              data-testid={`trade-btn-${m.symbol}`}>
                              Trade
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketsPage;
