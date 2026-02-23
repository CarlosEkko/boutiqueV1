import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { TrendingUp, TrendingDown, Star, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mock data for markets
const spotMarkets = [
  { pair: 'BTC/USDT', price: 64567.89, change24h: -2.34, volume: '1.2B', high: 66000, low: 63500 },
  { pair: 'ETH/USDT', price: 1856.45, change24h: -3.12, volume: '890M', high: 1920, low: 1800 },
  { pair: 'SOL/USDT', price: 78.23, change24h: 1.45, volume: '456M', high: 82, low: 75 },
  { pair: 'XRP/USDT', price: 1.36, change24h: -1.89, volume: '234M', high: 1.42, low: 1.32 },
  { pair: 'ADA/USDT', price: 0.2654, change24h: -4.21, volume: '123M', high: 0.28, low: 0.26 },
  { pair: 'BNB/USDT', price: 596.78, change24h: -1.56, volume: '345M', high: 610, low: 585 },
  { pair: 'DOGE/USDT', price: 0.0945, change24h: 2.34, volume: '567M', high: 0.098, low: 0.091 },
  { pair: 'DOT/USDT', price: 4.56, change24h: -2.78, volume: '89M', high: 4.8, low: 4.4 },
];

const futuresMarkets = [
  { pair: 'BTCUSDT', price: 64580.00, change24h: -2.31, volume: '2.5B', funding: '0.0100%', openInterest: '4.2B' },
  { pair: 'ETHUSDT', price: 1857.50, change24h: -3.08, volume: '1.1B', funding: '0.0085%', openInterest: '1.8B' },
  { pair: 'SOLUSDT', price: 78.35, change24h: 1.52, volume: '678M', funding: '0.0120%', openInterest: '890M' },
  { pair: 'XRPUSDT', price: 1.365, change24h: -1.85, volume: '345M', funding: '0.0095%', openInterest: '456M' },
  { pair: 'BNBUSDT', price: 597.00, change24h: -1.52, volume: '234M', funding: '0.0078%', openInterest: '345M' },
];

const MarketsPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('spot');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(['BTC/USDT', 'ETH/USDT']);
  const [sortConfig, setSortConfig] = useState({ key: 'volume', direction: 'desc' });

  const toggleFavorite = (pair) => {
    setFavorites(prev => 
      prev.includes(pair) 
        ? prev.filter(p => p !== pair)
        : [...prev, pair]
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
      item.pair.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (activeTab === 'favorites') {
      filtered = filtered.filter(item => favorites.includes(item.pair));
    }

    return filtered.sort((a, b) => {
      const aVal = typeof a[sortConfig.key] === 'string' 
        ? parseFloat(a[sortConfig.key].replace(/[^0-9.-]/g, ''))
        : a[sortConfig.key];
      const bVal = typeof b[sortConfig.key] === 'string'
        ? parseFloat(b[sortConfig.key].replace(/[^0-9.-]/g, ''))
        : b[sortConfig.key];
      
      return sortConfig.direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
  };

  const formatPrice = (price) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  const tabs = [
    { id: 'spot', label: t('markets.spot', 'Spot') },
    { id: 'futures', label: t('markets.futures', 'Futuros') },
    { id: 'favorites', label: t('markets.favorites', 'Favoritos'), icon: Star },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
              {t('markets.title', 'Mercados')}
            </h1>
            <p className="text-gray-400">
              {t('markets.subtitle', 'Explore todos os pares de negociação disponíveis')}
            </p>
          </div>

          {/* Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
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
                placeholder={t('markets.search', 'Pesquisar par...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-white"
                data-testid="market-search"
              />
            </div>
          </div>

          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('markets.totalMarkets', 'Total Mercados'), value: activeTab === 'futures' ? '5' : '8' },
              { label: t('markets.volume24h', 'Volume 24h'), value: '$4.2B' },
              { label: t('markets.topGainer', 'Maior Alta'), value: 'DOGE +2.34%', color: 'text-green-400' },
              { label: t('markets.topLoser', 'Maior Queda'), value: 'ADA -4.21%', color: 'text-red-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className={`text-lg font-medium ${stat.color || 'text-white'}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Markets Table */}
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="markets-table">
                <thead className="bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      <Star size={14} />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('markets.pair', 'Par')}
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
                      onClick={() => handleSort('change24h')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        {t('markets.change24h', '24h %')}
                        <ArrowUpDown size={12} />
                      </span>
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold-400 hidden md:table-cell"
                      onClick={() => handleSort('volume')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        {t('markets.volume', 'Volume')}
                        <ArrowUpDown size={12} />
                      </span>
                    </th>
                    {activeTab === 'futures' && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          {t('markets.funding', 'Funding')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          {t('markets.openInterest', 'Open Interest')}
                        </th>
                      </>
                    )}
                    {activeTab === 'spot' && (
                      <>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          {t('markets.high', 'Alta 24h')}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          {t('markets.low', 'Baixa 24h')}
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('markets.action', 'Ação')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filterAndSortData(activeTab === 'futures' ? futuresMarkets : spotMarkets).map((market, index) => (
                    <tr 
                      key={market.pair}
                      className="hover:bg-zinc-800/30 transition-colors"
                      data-testid={`market-row-${index}`}
                    >
                      <td className="px-4 py-4">
                        <button 
                          onClick={() => toggleFavorite(market.pair)}
                          className={`transition-colors ${
                            favorites.includes(market.pair) ? 'text-gold-400' : 'text-gray-600 hover:text-gold-400'
                          }`}
                        >
                          <Star size={16} fill={favorites.includes(market.pair) ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white font-medium">{market.pair}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-white">${formatPrice(market.price)}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`flex items-center justify-end gap-1 ${
                          market.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {market.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-400 hidden md:table-cell">
                        ${market.volume}
                      </td>
                      {activeTab === 'futures' && (
                        <>
                          <td className="px-4 py-4 text-right text-gray-400 hidden lg:table-cell">
                            {market.funding}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-400 hidden lg:table-cell">
                            ${market.openInterest}
                          </td>
                        </>
                      )}
                      {activeTab === 'spot' && (
                        <>
                          <td className="px-4 py-4 text-right text-gray-400 hidden lg:table-cell">
                            ${formatPrice(market.high)}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-400 hidden lg:table-cell">
                            ${formatPrice(market.low)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-4 text-right">
                        <Button 
                          size="sm"
                          className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30"
                          data-testid={`trade-btn-${market.pair}`}
                        >
                          {t('markets.trade', 'Trade')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State for Favorites */}
          {activeTab === 'favorites' && favorites.length === 0 && (
            <div className="text-center py-12">
              <Star className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-white text-lg mb-2">{t('markets.noFavorites', 'Sem favoritos')}</h3>
              <p className="text-gray-400">{t('markets.addFavorites', 'Clique na estrela para adicionar pares aos favoritos')}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MarketsPage;
