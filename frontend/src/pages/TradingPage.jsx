import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Settings, 
  Maximize2,
  ChevronDown,
  Layers,
  Activity,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const TradingPage = () => {
  const { t } = useTranslation();
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [orderType, setOrderType] = useState('limit');
  const [side, setSide] = useState('buy');

  // Mock order book data
  const asks = [
    { price: 64580.00, amount: 0.5234, total: 33815.41 },
    { price: 64575.50, amount: 0.8912, total: 57543.09 },
    { price: 64570.00, amount: 1.2341, total: 79689.44 },
    { price: 64565.00, amount: 0.3456, total: 22313.66 },
    { price: 64560.00, amount: 2.1234, total: 137139.10 },
  ];

  const bids = [
    { price: 64555.00, amount: 0.7823, total: 50507.96 },
    { price: 64550.00, amount: 1.5678, total: 101201.19 },
    { price: 64545.00, amount: 0.4521, total: 29188.69 },
    { price: 64540.00, amount: 0.9876, total: 63757.90 },
    { price: 64535.00, amount: 1.8765, total: 121122.03 },
  ];

  // Mock recent trades
  const recentTrades = [
    { price: 64567.89, amount: 0.1234, time: '12:45:32', side: 'buy' },
    { price: 64565.00, amount: 0.5678, time: '12:45:28', side: 'sell' },
    { price: 64570.00, amount: 0.2345, time: '12:45:25', side: 'buy' },
    { price: 64568.50, amount: 0.8901, time: '12:45:20', side: 'buy' },
    { price: 64560.00, amount: 0.3456, time: '12:45:15', side: 'sell' },
    { price: 64575.00, amount: 0.1234, time: '12:45:10', side: 'buy' },
    { price: 64572.00, amount: 0.6789, time: '12:45:05', side: 'sell' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-32 pb-8">
        <div className="max-w-[1920px] mx-auto px-4">
          {/* Top Bar - Pair Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
            <div className="flex items-center gap-6">
              {/* Pair Selector */}
              <button 
                className="flex items-center gap-2 text-white hover:text-gold-400 transition-colors"
                data-testid="pair-selector"
              >
                <span className="text-xl font-semibold">{selectedPair}</span>
                <ChevronDown size={18} />
              </button>
              
              {/* Price Info */}
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-2xl font-bold text-green-400">$64,567.89</span>
                  <span className="text-gray-500 text-sm ml-2">≈ €59,234.56</span>
                </div>
                <div className="flex items-center gap-1 text-red-400">
                  <TrendingDown size={16} />
                  <span>-2.34%</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">{t('trading.high24h', 'Alta 24h')}</span>
                <span className="text-white ml-2">$66,000.00</span>
              </div>
              <div>
                <span className="text-gray-500">{t('trading.low24h', 'Baixa 24h')}</span>
                <span className="text-white ml-2">$63,500.00</span>
              </div>
              <div>
                <span className="text-gray-500">{t('trading.volume24h', 'Volume 24h')}</span>
                <span className="text-white ml-2">$1.2B</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Settings size={18} />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Maximize2 size={18} />
              </Button>
            </div>
          </div>

          {/* Main Trading Grid */}
          <div className="grid grid-cols-12 gap-4">
            {/* Chart Area */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 h-[500px]" data-testid="chart-container">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-sm bg-gold-500/20 text-gold-400 rounded">1D</button>
                    <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">4H</button>
                    <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">1H</button>
                    <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">15M</button>
                    <button className="px-3 py-1 text-sm text-gray-400 hover:text-white rounded">5M</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <BarChart3 size={16} className="mr-1" />
                      {t('trading.indicators', 'Indicadores')}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Layers size={16} className="mr-1" />
                      {t('trading.depth', 'Profundidade')}
                    </Button>
                  </div>
                </div>
                
                {/* Chart Placeholder */}
                <div className="flex items-center justify-center h-[400px] border border-dashed border-zinc-700 rounded-lg">
                  <div className="text-center">
                    <Activity size={48} className="mx-auto text-gold-400/50 mb-4" />
                    <p className="text-gray-400">{t('trading.chartPlaceholder', 'Gráfico TradingView será integrado aqui')}</p>
                    <p className="text-gray-500 text-sm mt-2">Terminal Pro - Coming Soon</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Book & Trades */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4">
              {/* Order Book */}
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4" data-testid="order-book">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">{t('trading.orderBook', 'Livro de Ofertas')}</h3>
                  <div className="flex gap-1">
                    <button className="p-1 bg-zinc-800 rounded text-gray-400 hover:text-white">
                      <Layers size={14} />
                    </button>
                  </div>
                </div>

                {/* Headers */}
                <div className="grid grid-cols-3 text-xs text-gray-500 mb-2 px-2">
                  <span>{t('trading.price', 'Preço')}(USDT)</span>
                  <span className="text-right">{t('trading.amount', 'Qtd')}(BTC)</span>
                  <span className="text-right">Total</span>
                </div>

                {/* Asks (Sell orders) */}
                <div className="space-y-0.5 mb-2">
                  {asks.slice().reverse().map((order, i) => (
                    <div key={`ask-${i}`} className="grid grid-cols-3 text-xs py-1 px-2 relative hover:bg-red-500/10 cursor-pointer">
                      <div 
                        className="absolute inset-0 bg-red-500/10" 
                        style={{ width: `${(order.amount / 2.5) * 100}%`, right: 0, left: 'auto' }}
                      />
                      <span className="text-red-400 relative z-10">{order.price.toLocaleString()}</span>
                      <span className="text-right text-gray-300 relative z-10">{order.amount.toFixed(4)}</span>
                      <span className="text-right text-gray-400 relative z-10">{(order.total / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>

                {/* Spread */}
                <div className="py-2 px-2 bg-zinc-800/50 rounded text-center">
                  <span className="text-white font-medium">$64,567.89</span>
                  <span className="text-gray-500 text-xs ml-2">Spread: 0.01%</span>
                </div>

                {/* Bids (Buy orders) */}
                <div className="space-y-0.5 mt-2">
                  {bids.map((order, i) => (
                    <div key={`bid-${i}`} className="grid grid-cols-3 text-xs py-1 px-2 relative hover:bg-green-500/10 cursor-pointer">
                      <div 
                        className="absolute inset-0 bg-green-500/10" 
                        style={{ width: `${(order.amount / 2.5) * 100}%`, right: 0, left: 'auto' }}
                      />
                      <span className="text-green-400 relative z-10">{order.price.toLocaleString()}</span>
                      <span className="text-right text-gray-300 relative z-10">{order.amount.toFixed(4)}</span>
                      <span className="text-right text-gray-400 relative z-10">{(order.total / 1000).toFixed(1)}K</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Trades */}
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4" data-testid="recent-trades">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">{t('trading.recentTrades', 'Trades Recentes')}</h3>
                  <Clock size={14} className="text-gray-500" />
                </div>

                <div className="grid grid-cols-3 text-xs text-gray-500 mb-2 px-2">
                  <span>{t('trading.price', 'Preço')}(USDT)</span>
                  <span className="text-right">{t('trading.amount', 'Qtd')}(BTC)</span>
                  <span className="text-right">{t('trading.time', 'Hora')}</span>
                </div>

                <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                  {recentTrades.map((trade, i) => (
                    <div key={i} className="grid grid-cols-3 text-xs py-1 px-2 hover:bg-zinc-800/50">
                      <span className={trade.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {trade.price.toLocaleString()}
                      </span>
                      <span className="text-right text-gray-300">{trade.amount.toFixed(4)}</span>
                      <span className="text-right text-gray-500">{trade.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Form */}
            <div className="col-span-12 lg:col-span-8 xl:col-span-9">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4" data-testid="order-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Buy Side */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        className={`flex-1 py-2 rounded font-medium transition-colors ${
                          side === 'buy' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-zinc-800 text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setSide('buy')}
                        data-testid="buy-btn"
                      >
                        {t('trading.buy', 'Comprar')}
                      </button>
                      <button
                        className={`flex-1 py-2 rounded font-medium transition-colors ${
                          side === 'sell' 
                            ? 'bg-red-500 text-white' 
                            : 'bg-zinc-800 text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setSide('sell')}
                        data-testid="sell-btn"
                      >
                        {t('trading.sell', 'Vender')}
                      </button>
                    </div>

                    {/* Order Type */}
                    <div className="flex gap-2 mb-4">
                      {['limit', 'market', 'stop-limit'].map(type => (
                        <button
                          key={type}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            orderType === type
                              ? 'bg-gold-500/20 text-gold-400'
                              : 'text-gray-400 hover:text-white'
                          }`}
                          onClick={() => setOrderType(type)}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Order Inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t('trading.price', 'Preço')}</label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="64567.89" 
                            className="bg-zinc-800 border-zinc-700 text-white pr-16"
                            disabled={orderType === 'market'}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">USDT</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t('trading.amount', 'Quantidade')}</label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            className="bg-zinc-800 border-zinc-700 text-white pr-16"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">BTC</span>
                        </div>
                      </div>
                      
                      {/* Quick Amount Buttons */}
                      <div className="flex gap-2">
                        {['25%', '50%', '75%', '100%'].map(pct => (
                          <button 
                            key={pct}
                            className="flex-1 py-1 text-xs bg-zinc-800 text-gray-400 rounded hover:bg-zinc-700 hover:text-white transition-colors"
                          >
                            {pct}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Total</label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            className="bg-zinc-800 border-zinc-700 text-white pr-16"
                            readOnly
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">USDT</span>
                        </div>
                      </div>

                      <Button 
                        className={`w-full py-3 font-semibold ${
                          side === 'buy'
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        data-testid="submit-order-btn"
                      >
                        <Zap size={16} className="mr-2" />
                        {side === 'buy' ? t('trading.buyBtc', 'Comprar BTC') : t('trading.sellBtc', 'Vender BTC')}
                      </Button>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="bg-zinc-800/30 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-4">{t('trading.accountInfo', 'Informações da Conta')}</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('trading.available', 'Disponível')} (USDT)</span>
                        <span className="text-white">$50,000.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('trading.available', 'Disponível')} (BTC)</span>
                        <span className="text-white">1.5234 BTC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('trading.inOrders', 'Em Ordens')}</span>
                        <span className="text-gold-400">$5,000.00</span>
                      </div>
                      
                      <hr className="border-zinc-700" />
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('trading.fees', 'Taxa Maker')}</span>
                        <span className="text-white">0.10%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t('trading.fees', 'Taxa Taker')}</span>
                        <span className="text-white">0.10%</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gold-500/10 border border-gold-500/20 rounded-lg">
                      <p className="text-gold-400 text-sm">
                        {t('trading.vipBenefits', 'Membros VIP têm taxas reduzidas. Faça upgrade para desbloquear.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Orders */}
            <div className="col-span-12 lg:col-span-4 xl:col-span-3">
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4" data-testid="open-orders">
                <h3 className="text-white font-medium mb-4">{t('trading.openOrders', 'Ordens Abertas')}</h3>
                
                <div className="text-center py-8 text-gray-500">
                  <p>{t('trading.noOpenOrders', 'Nenhuma ordem aberta')}</p>
                  <p className="text-sm mt-1">{t('trading.placeOrder', 'Faça login para começar a negociar')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TradingPage;
