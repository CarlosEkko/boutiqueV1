import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { useCurrency } from '../context/CurrencyContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  TrendingUp, 
  TrendingDown, 
  Search,
  Star,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// TradingView Advanced Chart Widget using iframe for better React 18 compatibility
const TradingViewWidget = ({ symbol = 'BTCUSDT' }) => {
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    // Force re-render when symbol changes
    setKey(prev => prev + 1);
  }, [symbol]);

  // Build the TradingView widget URL
  const widgetConfig = {
    autosize: true,
    symbol: symbol,
    interval: '60',
    timezone: 'Europe/Lisbon',
    theme: 'dark',
    style: '1',
    locale: 'pt_BR',
    enable_publishing: false,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    gridColor: 'rgba(66, 66, 66, 0.3)',
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    hide_volume: false,
  };

  return (
    <div className="h-full w-full relative" key={key}>
      <iframe
        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${symbol}&interval=60&hide_top_toolbar=0&hide_legend=1&save_image=0&hide_volume=0&theme=dark&style=1&locale=pt_BR&enable_publishing=0`}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="TradingView Chart"
        allowFullScreen
      />
    </div>
  );
};


const TradingPage = () => {
  const { t } = useLanguage();
  const { selectedCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedSymbol, setSelectedSymbol] = useState(searchParams.get('symbol') || 'BTCUSDT');
  const [searchQuery, setSearchQuery] = useState('');
  const [markets, setMarkets] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('kbex_trading_favorites');
    return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL'];
  });

  useEffect(() => {
    fetchMarkets();
  }, [selectedCurrency]);

  useEffect(() => {
    localStorage.setItem('kbex_trading_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const fetchMarkets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/markets`, {
        params: { currency: selectedCurrency }
      });
      setMarkets(response.data.markets || []);
      
      // Find selected market data
      const symbol = selectedSymbol.replace('USDT', '');
      const market = response.data.markets?.find(m => m.symbol === symbol);
      setSelectedMarket(market);
    } catch (err) {
      console.error('Error fetching markets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPair = (symbol) => {
    const tradingSymbol = `${symbol}USDT`;
    setSelectedSymbol(tradingSymbol);
    
    // Update selected market data
    const market = markets.find(m => m.symbol === symbol);
    setSelectedMarket(market);
  };

  const toggleFavorite = (symbol) => {
    setFavorites(prev => 
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume) => {
    if (!volume) return '$0';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toFixed(2)}`;
  };

  const filteredMarkets = markets.filter(m => 
    m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="py-6">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Left Sidebar - Pair Selector */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <Input
                    type="text"
                    placeholder={t('trading.searchPair', 'Pesquisar par...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-800/50 border-zinc-700 text-white text-sm h-9"
                  />
                </div>
                
                {/* Favorites */}
                <div className="mb-4">
                  <h3 className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <Star size={12} className="text-gold-400" /> {t('trading.favorites', 'Favoritos')}
                  </h3>
                  <div className="space-y-1">
                    {markets.filter(m => favorites.includes(m.symbol)).map(market => (
                      <button
                        key={market.symbol}
                        onClick={() => handleSelectPair(market.symbol)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                          selectedSymbol === `${market.symbol}USDT` 
                            ? 'bg-gold-500/20 text-gold-400' 
                            : 'hover:bg-zinc-800/50 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img 
                            src={market.logo} 
                            alt={market.symbol}
                            className="w-5 h-5 rounded-full"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                          <span>{market.symbol}/USDT</span>
                        </div>
                        <span className={market.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {market.change_24h >= 0 ? '+' : ''}{market.change_24h?.toFixed(2)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* All Pairs */}
                <div>
                  <h3 className="text-xs text-gray-500 uppercase mb-2">{t('trading.allPairs', 'Todos os Pares')}</h3>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gold-400 animate-spin" />
                      </div>
                    ) : (
                      filteredMarkets.slice(0, 30).map(market => (
                        <button
                          key={market.symbol}
                          onClick={() => handleSelectPair(market.symbol)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                            selectedSymbol === `${market.symbol}USDT` 
                              ? 'bg-gold-500/20 text-gold-400' 
                              : 'hover:bg-zinc-800/50 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(market.symbol);
                              }}
                              className={favorites.includes(market.symbol) ? 'text-gold-400' : 'text-gray-600'}
                            >
                              <Star size={12} fill={favorites.includes(market.symbol) ? 'currentColor' : 'none'} />
                            </button>
                            <img 
                              src={market.logo} 
                              alt={market.symbol}
                              className="w-5 h-5 rounded-full"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                            <span>{market.symbol}/USDT</span>
                          </div>
                          <span className={market.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {market.change_24h >= 0 ? '+' : ''}{market.change_24h?.toFixed(2)}%
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Chart Area */}
            <div className="lg:col-span-3 space-y-4">
              {/* Header with pair info */}
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {selectedMarket && (
                      <>
                        <img 
                          src={selectedMarket.logo} 
                          alt={selectedMarket.symbol}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <div>
                          <h2 className="text-xl font-medium text-white flex items-center gap-2">
                            {selectedSymbol}
                            <button
                              onClick={() => toggleFavorite(selectedMarket.symbol)}
                              className={favorites.includes(selectedMarket.symbol) ? 'text-gold-400' : 'text-gray-500 hover:text-gold-400'}
                            >
                              <Star size={18} fill={favorites.includes(selectedMarket.symbol) ? 'currentColor' : 'none'} />
                            </button>
                          </h2>
                          <p className="text-sm text-gray-400">{selectedMarket.name}</p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {selectedMarket && (
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <p className="text-gray-500">{t('trading.price', 'Preço')}</p>
                        <p className="text-white text-lg font-medium">{formatPrice(selectedMarket.price)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">{t('trading.change24h', '24h Var.')}</p>
                        <p className={`text-lg font-medium flex items-center gap-1 ${
                          selectedMarket.change_24h >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {selectedMarket.change_24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {selectedMarket.change_24h >= 0 ? '+' : ''}{selectedMarket.change_24h?.toFixed(2)}%
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-gray-500">{t('trading.volume24h', 'Volume 24h')}</p>
                        <p className="text-white">{formatVolume(selectedMarket.volume_24h)}</p>
                      </div>
                      <div className="hidden lg:block">
                        <p className="text-gray-500">{t('trading.marketCap', 'Market Cap')}</p>
                        <p className="text-white">{formatVolume(selectedMarket.market_cap)}</p>
                      </div>
                      <Button
                        onClick={() => navigate(`/dashboard/exchange?asset=${selectedMarket.symbol}`)}
                        className="bg-gold-500 hover:bg-gold-400 text-black font-medium"
                      >
                        {t('trading.buySell', 'Comprar/Vender')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* TradingView Chart */}
              <div 
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl overflow-hidden" 
                style={{ height: '600px' }}
              >
                <TradingViewWidget symbol={selectedSymbol} theme="dark" />
              </div>
              
              {/* Additional Info */}
              {selectedMarket && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                    <p className="text-gray-500 text-sm mb-1">{t('trading.change1h', 'Variação 1h')}</p>
                    <p className={`text-lg font-medium ${
                      selectedMarket.change_1h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedMarket.change_1h >= 0 ? '+' : ''}{selectedMarket.change_1h?.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                    <p className="text-gray-500 text-sm mb-1">{t('trading.change7d', 'Variação 7d')}</p>
                    <p className={`text-lg font-medium ${
                      selectedMarket.change_7d >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedMarket.change_7d >= 0 ? '+' : ''}{selectedMarket.change_7d?.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                    <p className="text-gray-500 text-sm mb-1">{t('trading.globalRank', 'Rank Global')}</p>
                    <p className="text-lg font-medium text-white">#{selectedMarket.rank}</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                    <a 
                      href={`https://coinmarketcap.com/currencies/${selectedMarket.name?.toLowerCase().replace(/\s+/g, '-')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      <ExternalLink size={16} />
                      {t('trading.viewOnCMC', 'Ver no CoinMarketCap')}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TradingPage;
