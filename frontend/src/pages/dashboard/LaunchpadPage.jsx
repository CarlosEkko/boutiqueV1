import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import {
  Rocket,
  Clock,
  CheckCircle,
  ExternalLink,
  FileText,
  ArrowRight,
  Loader2,
  Users,
  Target,
  Zap,
  Coins,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Countdown
const Countdown = ({ targetDate, label }) => {
  const [tl, setTl] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const t = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { clearInterval(t); return; }
      setTl({
        d: Math.floor(diff / 864e5),
        h: Math.floor((diff % 864e5) / 36e5),
        m: Math.floor((diff % 36e5) / 6e4),
        s: Math.floor((diff % 6e4) / 1e3),
      });
    }, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1.5 uppercase">{label}</p>
      <div className="flex gap-1.5">
        {[{ v: tl.d, l: 'D' }, { v: tl.h, l: 'H' }, { v: tl.m, l: 'M' }, { v: tl.s, l: 'S' }].map((x, i) => (
          <div key={i} className="bg-zinc-800/80 rounded px-2.5 py-1.5 text-center min-w-[40px]">
            <p className="text-lg font-bold text-white font-mono">{String(x.v).padStart(2, '0')}</p>
            <p className="text-[9px] text-gray-500">{x.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const statusCfg = {
  upcoming: { label: 'Em Breve', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  active: { label: 'Ativo', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  completed: { label: 'Concluído', color: 'text-gray-400', bg: 'bg-gray-500/15' },
  sold_out: { label: 'Esgotado', color: 'text-red-400', bg: 'bg-red-500/15' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-500/15' },
};

const subStatusCfg = {
  pending: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  confirmed: { label: 'Confirmado', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  distributed: { label: 'Distribuído', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  refunded: { label: 'Reembolsado', color: 'text-red-400', bg: 'bg-red-500/15' },
};

const ClientLaunchpadPage = () => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [sales, setSales] = useState([]);
  const [mySubs, setMySubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subAmount, setSubAmount] = useState('');
  const [subCurrency, setSubCurrency] = useState('EUR');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');

  const fetchData = useCallback(async () => {
    try {
      const [salesRes, subsRes] = await Promise.all([
        axios.get(`${API_URL}/api/launchpad/sales`),
        axios.get(`${API_URL}/api/launchpad/my-subscriptions`, { headers }),
      ]);
      setSales(salesRes.data.sales || []);
      setMySubs(subsRes.data.subscriptions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubscribe = async () => {
    if (!selectedSale || !subAmount) return;
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/launchpad/sales/${selectedSale.id}/subscribe`,
        { amount_tokens: parseFloat(subAmount), payment_currency: subCurrency },
        { headers }
      );
      toast.success(`Subscrito com sucesso! ${res.data.amount_tokens} ${selectedSale.symbol}`);
      setShowSubscribe(false);
      setSubAmount('');
      setSelectedSale(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao subscrever');
    } finally {
      setSubmitting(false);
    }
  };

  const openSubscribe = (sale) => {
    setSelectedSale(sale);
    setSubAmount(sale.min_allocation ? String(sale.min_allocation) : '');
    setShowSubscribe(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-launchpad-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-2">
            <Rocket size={24} className="text-gold-400" />
            Launchpad
          </h1>
          <p className="text-gray-400 text-sm mt-1">Participe em token sales exclusivos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {[
          { id: 'sales', label: 'Token Sales', count: sales.length },
          { id: 'my', label: 'Minhas Subscrições', count: mySubs.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === tab.id ? 'bg-gold-500/20 text-gold-400' : 'text-gray-400 hover:text-white'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Token Sales List */}
      {activeTab === 'sales' && (
        <div className="grid md:grid-cols-2 gap-4">
          {sales.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <Rocket size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum token sale disponível</p>
            </div>
          ) : (
            sales.map(sale => {
              const cfg = statusCfg[sale.computed_status] || statusCfg.upcoming;
              const isActive = sale.computed_status === 'active';
              const alreadySubbed = mySubs.some(s => s.sale_id === sale.id && s.status !== 'refunded');
              return (
                <Card key={sale.id} className={`border-zinc-800 bg-zinc-900/40 ${isActive ? 'border-gold-500/20' : ''}`} data-testid={`sale-${sale.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {sale.logo_url ? (
                          <img src={sale.logo_url} alt={sale.symbol} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold-500/15 flex items-center justify-center">
                            <Coins size={20} className="text-gold-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-medium">{sale.name}</h3>
                          <p className="text-gray-400 text-sm">{sale.symbol} &middot; {sale.network}</p>
                        </div>
                      </div>
                      <Badge className={`${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">{sale.description}</p>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">${(sale.raised_amount || 0).toLocaleString()}</span>
                        <span className="text-gold-400">{sale.progress_pct}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full" style={{ width: `${Math.min(sale.progress_pct, 100)}%` }} />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-zinc-800/50 rounded-lg py-2">
                        <p className="text-xs text-gray-500">Preço</p>
                        <p className="text-sm font-medium text-white">${sale.price}</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg py-2">
                        <p className="text-xs text-gray-500">Hard Cap</p>
                        <p className="text-sm font-medium text-white">${sale.hard_cap?.toLocaleString()}</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg py-2">
                        <p className="text-xs text-gray-500">Supply</p>
                        <p className="text-sm font-medium text-white">{sale.total_supply?.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Countdown */}
                    {sale.computed_status === 'upcoming' && sale.start_date && (
                      <div className="mb-4">
                        <Countdown targetDate={sale.start_date} label="Começa em" />
                      </div>
                    )}
                    {isActive && sale.end_date && (
                      <div className="mb-4">
                        <Countdown targetDate={sale.end_date} label="Termina em" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isActive && !alreadySubbed && (
                        <Button onClick={() => openSubscribe(sale)} className="flex-1 bg-gold-500 hover:bg-gold-400 text-black" data-testid={`subscribe-${sale.id}`}>
                          <Rocket size={14} className="mr-1" /> Participar
                        </Button>
                      )}
                      {alreadySubbed && (
                        <Button disabled className="flex-1 bg-emerald-500/15 text-emerald-400 border-0">
                          <CheckCircle size={14} className="mr-1" /> Já Subscrito
                        </Button>
                      )}
                      {sale.whitepaper_url && (
                        <Button variant="outline" size="icon" className="border-zinc-700 text-gray-400 hover:text-white" asChild>
                          <a href={sale.whitepaper_url} target="_blank" rel="noopener noreferrer">
                            <FileText size={14} />
                          </a>
                        </Button>
                      )}
                      {sale.website_url && (
                        <Button variant="outline" size="icon" className="border-zinc-700 text-gray-400 hover:text-white" asChild>
                          <a href={sale.website_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* My Subscriptions */}
      {activeTab === 'my' && (
        <div className="space-y-3">
          {mySubs.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/20 border border-zinc-800/50 rounded-xl">
              <Target size={40} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Ainda não participou em nenhum token sale</p>
            </div>
          ) : (
            mySubs.map(sub => {
              const cfg = subStatusCfg[sub.status] || subStatusCfg.pending;
              return (
                <Card key={sub.id} className="border-zinc-800 bg-zinc-900/40" data-testid={`sub-${sub.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold-500/15 flex items-center justify-center">
                          <Coins size={20} className="text-gold-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{sub.sale_name}</p>
                          <p className="text-gray-400 text-sm">{sub.amount_tokens?.toLocaleString()} {sub.sale_symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
                        <p className="text-sm text-white mt-1">${sub.amount_usd?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleDateString('pt-PT')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribe && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSubscribe(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()} data-testid="subscribe-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Participar em {selectedSale.name}</h3>
              <button onClick={() => setShowSubscribe(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Token</span>
                <span className="text-white">{selectedSale.symbol}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Preço por token</span>
                <span className="text-white">${selectedSale.price}</span>
              </div>
              {selectedSale.min_allocation > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Mín. alocação</span>
                  <span className="text-white">{selectedSale.min_allocation?.toLocaleString()} {selectedSale.symbol}</span>
                </div>
              )}
              {selectedSale.max_allocation > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Máx. alocação</span>
                  <span className="text-white">{selectedSale.max_allocation?.toLocaleString()} {selectedSale.symbol}</span>
                </div>
              )}
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Disponível</span>
                <span className="text-white">{(selectedSale.total_supply - (selectedSale.tokens_sold || 0)).toLocaleString()} {selectedSale.symbol}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Quantidade de tokens</label>
                <Input
                  type="number"
                  value={subAmount}
                  onChange={e => setSubAmount(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder={`Mín: ${selectedSale.min_allocation || 1}`}
                  data-testid="subscribe-amount"
                />
              </div>

              {subAmount > 0 && (
                <div className="bg-gold-500/10 border border-gold-500/20 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total a pagar</span>
                    <span className="text-gold-400 font-bold text-lg">
                      ${(parseFloat(subAmount) * selectedSale.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubscribe}
                disabled={submitting || !subAmount || parseFloat(subAmount) <= 0}
                className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                data-testid="confirm-subscribe"
              >
                {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Rocket size={16} className="mr-2" />}
                Confirmar Subscrição
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientLaunchpadPage;
