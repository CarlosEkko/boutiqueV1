import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  Rocket,
  Clock,
  TrendingUp,
  CheckCircle,
  ExternalLink,
  FileText,
  Globe,
  ArrowRight,
  Loader2,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Countdown timer component
const Countdown = ({ targetDate, label }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex gap-2">
        {[
          { val: timeLeft.days, label: 'D' },
          { val: timeLeft.hours, label: 'H' },
          { val: timeLeft.minutes, label: 'M' },
          { val: timeLeft.seconds, label: 'S' },
        ].map((t, i) => (
          <div key={i} className="bg-zinc-800/80 rounded-lg px-3 py-2 text-center min-w-[48px]">
            <p className="text-xl font-bold text-white font-mono">{String(t.val).padStart(2, '0')}</p>
            <p className="text-[10px] text-gray-500">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Progress bar component
const ProgressBar = ({ percent, raised, target, currency = 'USD', t }) => (
  <div>
    <div className="flex justify-between text-sm mb-1.5">
      <span className="text-gray-400">
        {raised?.toLocaleString('en-US', { style: 'currency', currency })} {t ? t('launchpadPage.raised', 'raised') : 'raised'}
      </span>
      <span className="text-gold-400 font-medium">{percent}%</span>
    </div>
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-1000"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
    <div className="flex justify-between text-xs text-gray-500 mt-1">
      <span>0%</span>
      <span>{t ? t('launchpadPage.target', 'Target') : 'Target'}: {target?.toLocaleString('en-US', { style: 'currency', currency })}</span>
    </div>
  </div>
);

const getStatusConfig = (t) => ({
  upcoming: { label: t('launchpadPage.statusUpcoming', 'Em Breve'), color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  active: { label: t('launchpadPage.statusActive', 'Ativo'), color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  completed: { label: t('launchpadPage.statusCompleted', 'Concluído'), color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/30' },
  sold_out: { label: t('launchpadPage.statusSoldOut', 'Esgotado'), color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  cancelled: { label: t('launchpadPage.statusCancelled', 'Cancelado'), color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
});

// Token sale card
const SaleCard = ({ sale, onViewDetails }) => {
  const { t } = useLanguage();
  const statusConfig = getStatusConfig(t);
  const cfg = statusConfig[sale.computed_status] || statusConfig.upcoming;
  const isActive = sale.computed_status === 'active';
  const isUpcoming = sale.computed_status === 'upcoming';

  return (
    <div 
      className={`bg-zinc-900/60 border ${isActive ? 'border-gold-500/30' : 'border-zinc-800/50'} rounded-2xl overflow-hidden hover:border-gold-500/20 transition-all duration-300 group`}
      data-testid={`sale-card-${sale.id}`}
    >
      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-br from-zinc-800 to-zinc-900 overflow-hidden">
        {sale.banner_url ? (
          <img src={sale.banner_url} alt={sale.name} className="w-full h-full object-cover opacity-60" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Rocket size={48} className="text-gold-500/20" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-xs px-2.5 py-1 rounded-full font-medium`}>
            {cfg.label}
          </span>
        </div>
        {sale.logo_url && (
          <div className="absolute bottom-3 left-4">
            <img src={sale.logo_url} alt={sale.symbol} className="w-12 h-12 rounded-full border-2 border-zinc-900 bg-zinc-900" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-medium text-white group-hover:text-gold-400 transition-colors">
              {sale.name}
            </h3>
            <p className="text-sm text-gray-400">{sale.symbol} &middot; {sale.network}</p>
          </div>
          <span className="text-gold-400 font-bold text-lg">${sale.price}</span>
        </div>

        <p className="text-sm text-gray-400 line-clamp-2 mb-4">{sale.description}</p>

        {/* Progress */}
        <ProgressBar
          percent={sale.progress_pct || 0}
          raised={sale.raised_amount || 0}
          target={sale.hard_cap}
          t={t}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('launchpadPage.supply', 'Supply')}</p>
            <p className="text-sm font-medium text-white">{sale.total_supply?.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('launchpadPage.hardCap', 'Hard Cap')}</p>
            <p className="text-sm font-medium text-white">${sale.hard_cap?.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('launchpadPage.participants', 'Participantes')}</p>
            <p className="text-sm font-medium text-white">{sale.total_participants || 0}</p>
          </div>
        </div>

        {/* Countdown or status */}
        {isUpcoming && sale.start_date && (
          <Countdown targetDate={sale.start_date} label={t('launchpadPage.saleStartsIn', 'Sale starts in')} />
        )}
        {isActive && sale.end_date && (
          <Countdown targetDate={sale.end_date} label={t('launchpadPage.saleEndsIn', 'Sale ends in')} />
        )}

        {/* CTA */}
        <Button
          onClick={() => onViewDetails(sale.id)}
          className={`w-full mt-4 ${isActive ? 'bg-gold-500 hover:bg-gold-400 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
          data-testid={`view-sale-${sale.id}`}
        >
          {isActive ? t('launchpadPage.invest', 'Participar') : t('launchpadPage.viewDetails', 'Ver Detalhes')}
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};


const LaunchpadPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchSales = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/launchpad/sales`);
      setSales(res.data.sales || []);
    } catch (err) {
      console.error('Failed to fetch sales', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const filteredSales = activeFilter === 'all'
    ? sales
    : sales.filter(s => s.computed_status === activeFilter);

  // Sort featured first
  const sortedSales = [...filteredSales].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const activeSales = sales.filter(s => s.computed_status === 'active');
  const featuredSale = sales.find(s => s.featured) || activeSales[0] || sales[0];

  const filters = [
    { id: 'all', label: t('launchpadPage.all', 'Todos'), count: sales.length },
    { id: 'active', label: t('launchpadPage.active', 'Ativos'), count: sales.filter(s => s.computed_status === 'active').length },
    { id: 'upcoming', label: t('launchpadPage.upcoming', 'Em Breve'), count: sales.filter(s => s.computed_status === 'upcoming').length },
    { id: 'completed', label: t('launchpadPage.completed', 'Concluídos'), count: sales.filter(s => s.computed_status === 'completed').length },
  ];

  const handleViewDetails = (saleId) => {
    navigate(`/auth?redirect=/dashboard/launchpad&sale=${saleId}`);
  };

  return (
    <div className="min-h-screen bg-black" data-testid="launchpad-public-page">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-sm mb-6">
              <Rocket size={14} />
              KBEX Launchpad
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white mb-4">
              Token <span className="text-gold-400">Launchpad</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t('launchpadPage.heroDescription', 'Acesso exclusivo a token sales curados para investidores qualificados. Participe nas oportunidades mais promissoras do mercado.')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
            {[
              { icon: Rocket, label: t('launchpadPage.listedProjects', 'Projetos Listados'), value: sales.length },
              { icon: Users, label: t('launchpadPage.participants', 'Participantes'), value: sales.reduce((a, s) => a + (s.total_participants || 0), 0) },
              { icon: Target, label: t('launchpadPage.capitalRaised', 'Capital Levantado'), value: `$${(sales.reduce((a, s) => a + (s.raised_amount || 0), 0) / 1000).toFixed(0)}K` },
              { icon: Zap, label: t('launchpadPage.activeSales', 'Sales Ativos'), value: activeSales.length },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 text-center">
                <stat.icon size={20} className="text-gold-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Sale */}
      {featuredSale && (
        <section className="pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-gold-500/5 to-zinc-900/50 border border-gold-500/20 rounded-2xl p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <span className={`${getStatusConfig(t)[featuredSale.computed_status]?.bg} ${getStatusConfig(t)[featuredSale.computed_status]?.color} text-xs px-2.5 py-1 rounded-full font-medium`}>
                    {getStatusConfig(t)[featuredSale.computed_status]?.label}
                  </span>
                  <h2 className="text-3xl font-medium text-white mt-3 mb-2">{featuredSale.name}</h2>
                  <p className="text-gold-400 text-lg mb-3">{featuredSale.symbol} &middot; ${featuredSale.price} {t('launchpadPage.perToken', 'per token')}</p>
                  <p className="text-gray-400 mb-6">{featuredSale.description}</p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleViewDetails(featuredSale.id)}
                      className="bg-gold-500 hover:bg-gold-400 text-black"
                      data-testid="featured-sale-cta"
                    >
                      <Rocket size={16} className="mr-2" /> {t('launchpadPage.participateNow', 'Participar Agora')}
                    </Button>
                    {featuredSale.whitepaper_url && (
                      <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800" asChild>
                        <a href={featuredSale.whitepaper_url} target="_blank" rel="noopener noreferrer">
                          <FileText size={16} className="mr-2" /> {t('launchpadPage.whitepaper', 'Whitepaper')}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <ProgressBar percent={featuredSale.progress_pct} raised={featuredSale.raised_amount || 0} target={featuredSale.hard_cap} t={t} />
                  <div className="mt-6">
                    {featuredSale.computed_status === 'upcoming' && featuredSale.start_date && (
                      <Countdown targetDate={featuredSale.start_date} label={t('launchpadPage.saleStartsIn', 'Sale starts in')} />
                    )}
                    {featuredSale.computed_status === 'active' && featuredSale.end_date && (
                      <Countdown targetDate={featuredSale.end_date} label={t('launchpadPage.saleEndsIn', 'Sale ends in')} />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{t('launchpadPage.tokenPrice', 'Token Price')}</p>
                      <p className="text-lg font-bold text-white">${featuredSale.price}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{t('launchpadPage.hardCap', 'Hard Cap')}</p>
                      <p className="text-lg font-bold text-white">${featuredSale.hard_cap?.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{t('launchpadPage.network', 'Network')}</p>
                      <p className="text-lg font-bold text-white">{featuredSale.network}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Sales */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-white">{t('launchpadPage.tokenSales', 'Token Sales')}</h2>
            <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                    activeFilter === f.id ? 'bg-gold-500/20 text-gold-400' : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid={`filter-${f.id}`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
            </div>
          ) : sortedSales.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
              <Rocket size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">{t('launchpadPage.noSales', 'Nenhum token sale disponível')}</p>
              <p className="text-gray-500 text-sm mt-1">{t('launchpadPage.comingSoon', 'Novas oportunidades serão publicadas em breve')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedSales.map(sale => (
                <SaleCard key={sale.id} sale={sale} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LaunchpadPage;
