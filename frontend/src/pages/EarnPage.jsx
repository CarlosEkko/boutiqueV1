import React, { useState } from 'react';
import { useLanguage } from '../i18n';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  Coins,
  TrendingUp,
  Clock,
  Shield,
  Lock,
  Unlock,
  Calculator,
  Info,
  ChevronRight,
  Wallet,
  Percent
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const EarnPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('flexible');
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Staking opportunities
  const flexibleStaking = [
    { asset: 'BTC', name: 'Bitcoin', apy: 3.5, minAmount: 0.001, tvl: '125M', icon: '₿' },
    { asset: 'ETH', name: 'Ethereum', apy: 4.2, minAmount: 0.01, tvl: '89M', icon: 'Ξ' },
    { asset: 'USDT', name: 'Tether', apy: 8.5, minAmount: 100, tvl: '234M', icon: '₮' },
    { asset: 'USDC', name: 'USD Coin', apy: 8.2, minAmount: 100, tvl: '178M', icon: '$' },
    { asset: 'SOL', name: 'Solana', apy: 6.8, minAmount: 1, tvl: '45M', icon: '◎' },
    { asset: 'BNB', name: 'BNB', apy: 5.5, minAmount: 0.1, tvl: '67M', icon: '♦' },
  ];

  const lockedStaking = [
    { asset: 'BTC', name: 'Bitcoin', periods: [
      { days: 30, apy: 5.0 },
      { days: 60, apy: 6.5 },
      { days: 90, apy: 8.0 },
    ], minAmount: 0.01, tvl: '89M' },
    { asset: 'ETH', name: 'Ethereum', periods: [
      { days: 30, apy: 6.0 },
      { days: 60, apy: 7.5 },
      { days: 90, apy: 9.0 },
    ], minAmount: 0.1, tvl: '56M' },
    { asset: 'USDT', name: 'Tether', periods: [
      { days: 30, apy: 10.0 },
      { days: 60, apy: 11.5 },
      { days: 90, apy: 13.0 },
    ], minAmount: 500, tvl: '145M' },
  ];

  const tabs = [
    { id: 'flexible', label: t('earn.flexible', 'Flexível'), icon: Unlock },
    { id: 'locked', label: t('earn.locked', 'Bloqueado'), icon: Lock },
    { id: 'defi', label: t('earn.defi', 'DeFi'), icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-light text-white mb-4">
              {t('earn.title', 'Ganhe com seus Ativos')}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('earn.subtitle', 'Coloque seus criptoativos para trabalhar. Ganhe rendimentos passivos com staking flexível ou bloqueado.')}
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: t('earn.totalStaked', 'Total em Staking'), value: '$892M', icon: Wallet },
              { label: t('earn.avgApy', 'APY Médio'), value: '7.2%', icon: Percent },
              { label: t('earn.stakingAssets', 'Ativos Disponíveis'), value: '25+', icon: Coins },
              { label: t('earn.activeUsers', 'Usuários Ativos'), value: '45K+', icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 text-center">
                <stat.icon className="mx-auto text-gold-400 mb-2" size={24} />
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid={`earn-tab-${tab.id}`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flexible Staking */}
          {activeTab === 'flexible' && (
            <div className="space-y-4" data-testid="flexible-staking">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Unlock className="text-gold-400" size={20} />
                  <h2 className="text-xl text-white font-medium">
                    {t('earn.flexibleStaking', 'Staking Flexível')}
                  </h2>
                </div>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  <Info size={14} />
                  {t('earn.flexibleInfo', 'Resgate a qualquer momento')}
                </p>
              </div>

              <div className="grid gap-4">
                {flexibleStaking.map((item, i) => (
                  <div 
                    key={item.asset}
                    className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 hover:border-gold-500/30 transition-all cursor-pointer"
                    data-testid={`stake-${item.asset.toLowerCase()}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center text-black font-bold text-xl">
                          {item.icon}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{item.asset}</h3>
                          <p className="text-gray-500 text-sm">{item.name}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-center">
                          <p className="text-green-400 text-2xl font-bold">{item.apy}%</p>
                          <p className="text-gray-500 text-xs">APY</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white">{item.minAmount} {item.asset}</p>
                          <p className="text-gray-500 text-xs">{t('earn.minAmount', 'Mínimo')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white">${item.tvl}</p>
                          <p className="text-gray-500 text-xs">TVL</p>
                        </div>
                        <Button 
                          className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30"
                        >
                          {t('earn.stake', 'Fazer Staking')}
                          <ChevronRight size={16} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Staking */}
          {activeTab === 'locked' && (
            <div className="space-y-4" data-testid="locked-staking">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="text-gold-400" size={20} />
                  <h2 className="text-xl text-white font-medium">
                    {t('earn.lockedStaking', 'Staking Bloqueado')}
                  </h2>
                </div>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  <Info size={14} />
                  {t('earn.lockedInfo', 'Maior APY, período fixo')}
                </p>
              </div>

              <div className="grid gap-6">
                {lockedStaking.map((item) => (
                  <div 
                    key={item.asset}
                    className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6"
                    data-testid={`locked-${item.asset.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center text-black font-bold text-xl">
                        {item.asset.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{item.asset}</h3>
                        <p className="text-gray-500 text-sm">{item.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {item.periods.map((period) => (
                        <div 
                          key={period.days}
                          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 text-center hover:border-gold-500/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <Clock size={14} className="text-gray-500" />
                            <span className="text-gray-400 text-sm">{period.days} {t('earn.days', 'dias')}</span>
                          </div>
                          <p className="text-green-400 text-2xl font-bold">{period.apy}%</p>
                          <p className="text-gray-500 text-xs">APY</p>
                          <Button 
                            size="sm"
                            className="mt-3 w-full bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30"
                          >
                            {t('earn.select', 'Selecionar')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DeFi Staking */}
          {activeTab === 'defi' && (
            <div className="text-center py-16" data-testid="defi-staking">
              <Coins size={64} className="mx-auto text-gold-400/50 mb-6" />
              <h2 className="text-2xl text-white mb-4">
                {t('earn.defiComingSoon', 'DeFi Staking - Em Breve')}
              </h2>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                {t('earn.defiDescription', 'Acesse os melhores protocolos DeFi diretamente da sua conta KBEX. Yield farming, liquidity pools e mais.')}
              </p>
              <Button className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30">
                {t('earn.notifyMe', 'Notificar-me')}
              </Button>
            </div>
          )}

          {/* Calculator Section */}
          <div className="mt-16 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-800/50 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="text-gold-400" size={28} />
              <h2 className="text-2xl text-white font-medium">
                {t('earn.calculator', 'Calculadora de Rendimentos')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">{t('earn.selectAsset', 'Selecione o Ativo')}</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white">
                    <option>BTC - Bitcoin</option>
                    <option>ETH - Ethereum</option>
                    <option>USDT - Tether</option>
                    <option>USDC - USD Coin</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">{t('earn.amount', 'Quantidade')}</label>
                  <Input 
                    type="number" step="any" 
                    placeholder="1.0" 
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">{t('earn.period', 'Período')}</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white">
                    <option>{t('earn.flexible', 'Flexível')}</option>
                    <option>30 {t('earn.days', 'dias')}</option>
                    <option>60 {t('earn.days', 'dias')}</option>
                    <option>90 {t('earn.days', 'dias')}</option>
                  </select>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-6">
                <h3 className="text-gray-400 text-sm mb-4">{t('earn.estimatedEarnings', 'Rendimentos Estimados')}</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('earn.daily', 'Diário')}</span>
                    <span className="text-white font-medium">0.000095 BTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('earn.monthly', 'Mensal')}</span>
                    <span className="text-white font-medium">0.00291 BTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('earn.yearly', 'Anual')}</span>
                    <span className="text-green-400 font-medium text-xl">0.035 BTC</span>
                  </div>
                  
                  <hr className="border-zinc-700" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('earn.aproxValue', 'Valor Aprox. (USD)')}</span>
                    <span className="text-gold-400 font-medium">≈ $2,259.88</span>
                  </div>
                </div>

                <Button className="w-full mt-6 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white">
                  {t('earn.startStaking', 'Começar Staking')}
                </Button>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-8 flex items-start gap-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
            <Shield className="text-gold-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-white font-medium mb-1">{t('earn.securityTitle', 'Seus Ativos Estão Seguros')}</h3>
              <p className="text-gray-400 text-sm">
                {t('earn.securityDescription', 'Todos os ativos em staking são protegidos por custódia institucional e seguros. A KBEX utiliza as melhores práticas de segurança do setor para proteger seus investimentos.')}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EarnPage;
