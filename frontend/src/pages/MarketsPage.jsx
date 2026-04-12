import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { useCurrency } from '../context/CurrencyContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Search, 
  ArrowUpDown, 
  RefreshCw,
  Globe,
  BarChart3,
  Loader2,
  LineChart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// TradingView Mini Chart Widget
const MiniChart = ({ symbol, width = '100%', height = 220 }) => {
  const containerId = `tv-mini-${symbol}`;
  
  return (
    <div className="overflow-hidden rounded-lg" style={{ width, height }}>
      <iframe
        src={`https://s.tradingview.com/embed-widget/mini-symbol-overview/?symbol=${symbol}USDT&dateRange=1M&trendLineColor=%23D4AF37&underLineColor=rgba(212,175,55,0.07)&underLineBottomColor=rgba(0,0,0,0)&isTransparent=true&autosize=1&largeChartUrl=`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title={`${symbol} Chart`}
      />
    </div>
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
  
  // Data states
  const [markets, setMarkets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const [marketsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/trading/markets`, { params: { currency: selectedCurrency } }),
        axios.get(`${API_URL}/api/trading/markets/stats`, { params: { currency: selectedCurrency } })
      ]);
      
      setMarkets(marketsRes.data.markets || []);
      setStats(statsRes.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching markets:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    fetchMarkets();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarkets, 60000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  useEffect(() => {
    localStorage.setItem('kbex_market_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbol) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filterAndSortData = (data) => {
    let filtered = data.filter(item => 
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (activeTab === 'favorites') {
      filtered = filtered.filter(item => favorites.includes(item.symbol));
    }

    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
      return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
  };

  const formatPrice = (price, currency = selectedCurrency) => {
    if (!price) return `${getCurrencySymbol(currency)}0.00`;
    
    const symbol = getCurrencySymbol(currency);
    
    if (price >= 1000) {
      return `${symbol}${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (price >= 1) {
      return `${symbol}${price.toFixed(2)}`;
    }
    if (price >= 0.01) {
      return `${symbol}${price.toFixed(4)}`;
    }
    return `${symbol}${price.toFixed(8)}`;
  };

  const formatVolume = (volume, currency = selectedCurrency) => {
    if (!volume) return `${getCurrencySymbol(currency)}0`;
    
    const symbol = getCurrencySymbol(currency);
    
    if (volume >= 1e12) return `${symbol}${(volume / 1e12).toFixed(2)}T`;
    if (volume >= 1e9) return `${symbol}${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${symbol}${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${symbol}${(volume / 1e3).toFixed(2)}K`;
    return `${symbol}${volume.toFixed(2)}`;
  };

  const getCurrencySymbol = (currency) => {
    const symbols = { USD: '$', EUR: '€', AED: 'AED ', BRL: 'R$' };
    return symbols[currency] || '$';
  };

  const tabs = [
    { id: 'spot', label: t('markets.spot', 'Todos') },
    { id: 'gainers', label: t('markets.gainers', 'Maiores Altas') },
    { id: 'losers', label: t('markets.losers', 'Maiores Quedas') },
    { id: 'favorites', label: t('markets.favorites', 'Favoritos'), icon: Star },
  ];

  const getFilteredByTab = () => {
    let data = [...markets];
    
    if (activeTab === 'gainers') {
      data = data.filter(m => m.change_24h > 0).sort((a, b) => b.change_24h - a.change_24h);
    } else if (activeTab === 'losers') {
      data = data.filter(m => m.change_24h < 0).sort((a, b) => a.change_24h - b.change_24h);
    }
    
    return filterAndSortData(data);
  };

  const handleTrade = (symbol) => {
    navigate(`/dashboard/exchange?asset=${symbol}`);
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
                {t('markets.title', 'Mercados')}
              </h1>
              <p className="text-gray-400">
                {t('markets.subtitle', 'Preços em tempo real das principais criptomoedas')}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {lastUpdate && (
                <span>Atualizado: {lastUpdate.toLocaleTimeString()}</span>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchMarkets}
                className="text-gray-400 hover:text-gold-400"
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Market Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Globe size={14} />
                  {t('markets.totalMarketCap', 'Market Cap Total')}
                </div>
                <p className="text-xl font-medium text-white">
                  {formatVolume(stats.total_market_cap)}
                </p>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <BarChart3 size={14} />
                  {t('trading.volume24h', 'Volume 24h')}
                </div>
                <p className="text-xl font-medium text-white">
                  {formatVolume(stats.total_volume_24h)}
                </p>
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <TrendingUp size={14} className="text-green-400" />
                  {t('markets.topGainer', 'Maior Alta')}
                </div>
                {stats.top_gainer && (
                  <p className="text-xl font-medium text-green-400">
                    {stats.top_gainer.symbol} +{stats.top_gainer.change_24h}%
                  </p>
                )}
              </div>
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <TrendingDown size={14} className="text-red-400" />
                  {t('markets.topLoser', 'Maior Queda')}
                </div>
                {stats.top_loser && (
                  <p className="text-xl font-medium text-red-400">
                    {stats.top_loser.symbol} {stats.top_loser.change_24h}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Featured Charts */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <LineChart size={18} className="text-gold-400" />
              <h2 className="text-lg font-medium text-white">
                {t('markets.featuredCharts', 'Gráficos em Destaque')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['BTC', 'ETH', 'SOL', 'XRP'].map(sym => (
                <div 
                  key={sym} 
                  className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden cursor-pointer hover:border-gold-500/30 transition-colors"
                  onClick={() => navigate(`/trading?symbol=${sym}USDT`)}
                  data-testid={`featured-chart-${sym}`}
                >
                  <MiniChart symbol={sym} height={200} />
                </div>
              ))}
            </div>
          </div>

          {/* Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  {tab.icon && <tab.icon size={16} />}
                  {tab.label}
                  {tab.id === 'favorites' && (
                    <span className="ml-1 text-xs bg-gold-500/30 px-1.5 py-0.5 rounded">
                      {favorites.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                type="text"
                placeholder={t('markets.search', 'Pesquisar criptomoeda...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                data-testid="market-search"
              />
            </div>
          </div>

          {/* Markets Table */}
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="markets-table">
                  <thead className="bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <Star size={14} />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('markets.name', 'Nome')}
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400"
                        onClick={() => handleSort('price')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          {t('markets.price', 'Preço')}
                          <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400"
                        onClick={() => handleSort('change_1h')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          1h %
                          <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400"
                        onClick={() => handleSort('change_24h')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          24h %
                          <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400 hidden md:table-cell"
                        onClick={() => handleSort('change_7d')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          7d %
                          <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400 hidden lg:table-cell"
                        onClick={() => handleSort('volume_24h')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Volume 24h
                          <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400 hidden lg:table-cell"
                        onClick={() => handleSort('market_cap')}
                      >
                        <span className="flex items-center justify-end gap-1">
                          Market Cap
                          <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('markets.action', 'Ação')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {getFilteredByTab().map((market, index) => (
                      <tr 
                        key={market.symbol}
                        className="hover:bg-zinc-800/30 transition-colors"
                        data-testid={`market-row-${index}`}
                      >
                        <td className="px-4 py-4">
                          <button 
                            onClick={() => toggleFavorite(market.symbol)}
                            className={`transition-colors ${
                              favorites.includes(market.symbol) ? 'text-gold-400' : 'text-gray-600 hover:text-gold-400'
                            }`}
                          >
                            <Star size={16} fill={favorites.includes(market.symbol) ? 'currentColor' : 'none'} />
                          </button>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-sm">
                          {market.rank || index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={market.logo} 
                              alt={market.symbol}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${market.symbol}&background=random`;
                              }}
                            />
                            <div>
                              <span className="text-white font-medium">{market.symbol}</span>
                              <span className="text-gray-500 text-sm ml-2 hidden sm:inline">{market.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-white font-medium">{formatPrice(market.price)}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`flex items-center justify-end gap-1 ${
                            market.change_1h >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {market.change_1h >= 0 ? '+' : ''}{market.change_1h?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`flex items-center justify-end gap-1 ${
                            market.change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {market.change_24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {market.change_24h >= 0 ? '+' : ''}{market.change_24h?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right hidden md:table-cell">
                          <span className={`${
                            market.change_7d >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {market.change_7d >= 0 ? '+' : ''}{market.change_7d?.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-gray-400 hidden lg:table-cell">
                          {formatVolume(market.volume_24h)}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-400 hidden lg:table-cell">
                          {formatVolume(market.market_cap)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button 
                            size="sm"
                            onClick={() => handleTrade(market.symbol)}
                            className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30"
                            data-testid={`trade-btn-${market.symbol}`}
                          >
                            Trade
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Empty State for Favorites */}
          {activeTab === 'favorites' && favorites.length === 0 && !loading && (
            <div className="text-center py-12">
              <Star className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-white text-lg mb-2">{t('markets.noFavorites', 'Sem favoritos')}</h3>
              <p className="text-gray-400">{t('markets.addFavorites', 'Clique na estrela para adicionar criptomoedas aos favoritos')}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MarketsPage;
