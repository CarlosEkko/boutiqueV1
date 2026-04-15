import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  BarChart3, Target, TrendingUp, DollarSign, Briefcase,
  Handshake, Loader2, Clock, CheckCircle, Wallet
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (v) => {
  if (!v) return '€0';
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `€${(v / 1e3).toFixed(1)}K`;
  return `€${v.toFixed(0)}`;
};

const formatNumber = (v) => v ? v.toLocaleString('pt-PT', { maximumFractionDigits: 2 }) : '0';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-medium">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const MyPerformance = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/commercial/my/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetch();
  }, [token]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="text-gold-400 animate-spin" size={32} /></div>;
  if (!data) return <div className="text-gray-500 text-center py-12">Sem dados disponiveis</div>;

  const { seller, kpis, timeline, goals, commissions, commission_summary, recent_deals } = data;

  const tabs = [
    { key: 'overview', label: 'Visao Geral', icon: BarChart3 },
    { key: 'goals', label: 'Objetivos', icon: Target },
    { key: 'commissions', label: 'Comissoes', icon: DollarSign },
    { key: 'deals', label: 'Negocios', icon: Handshake },
  ];

  return (
    <div className="space-y-6" data-testid="my-performance-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-white tracking-tight">A Minha Performance</h1>
        <p className="text-gray-500 text-sm mt-1">Bem-vindo, {seller?.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-gold-400 text-gold-400' : 'border-transparent text-gray-500 hover:text-white'
              }`} data-testid={`my-tab-${tab.key}`}>
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Commission Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gold-500/15 flex items-center justify-center"><Clock size={18} className="text-gold-400" /></div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">A Receber</span>
                </div>
                <p className="text-2xl font-light text-gold-400 font-mono">{formatCurrency(commission_summary.pending)}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center"><CheckCircle size={18} className="text-blue-400" /></div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Aprovado</span>
                </div>
                <p className="text-2xl font-light text-blue-400 font-mono">{formatCurrency(commission_summary.approved)}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center"><Wallet size={18} className="text-emerald-400" /></div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Recebido</span>
                </div>
                <p className="text-2xl font-light text-emerald-400 font-mono">{formatCurrency(commission_summary.paid)}</p>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center"><TrendingUp size={18} className="text-purple-400" /></div>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">Total Ganho</span>
                </div>
                <p className="text-2xl font-light text-purple-400 font-mono">{formatCurrency(commission_summary.total_earned)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Period KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Este Mes', data: kpis.month, color: 'gold' },
              { label: 'Este Ano', data: kpis.year, color: 'blue' },
            ].map(p => (
              <Card key={p.label} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-5">
                  <p className={`text-${p.color}-400 text-xs font-medium uppercase tracking-wider mb-3`}>{p.label}</p>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div><p className="text-gray-500 text-[11px]">Volume</p><p className="text-white font-mono text-sm">{formatCurrency(p.data?.volume)}</p></div>
                    <div><p className="text-gray-500 text-[11px]">Receita</p><p className="text-emerald-400 font-mono text-sm">{formatCurrency(p.data?.revenue)}</p></div>
                    <div><p className="text-gray-500 text-[11px]">Negocios</p><p className="text-white text-sm">{p.data?.deals || 0}</p></div>
                    <div><p className="text-gray-500 text-[11px]">Clientes</p><p className="text-white text-sm">{p.data?.clients || 0}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Timeline Chart */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-5">
              <h3 className="text-white font-medium mb-4">Evolucao (6 meses)</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mgV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} /><stop offset="95%" stopColor="#D4AF37" stopOpacity={0} /></linearGradient>
                      <linearGradient id="mgR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34D399" stopOpacity={0.3} /><stop offset="95%" stopColor="#34D399" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                    <Area type="monotone" dataKey="volume" name="Volume" stroke="#D4AF37" fill="url(#mgV)" strokeWidth={2} />
                    <Area type="monotone" dataKey="revenue" name="Receita" stroke="#34D399" fill="url(#mgR)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Os Meus Objetivos</h2>
          {goals.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800"><CardContent className="p-12 text-center"><Target size={40} className="mx-auto mb-3 text-gray-700" /><p className="text-gray-500">Nenhum objetivo definido</p></CardContent></Card>
          ) : goals.map(g => (
            <Card key={g.id} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{g.description || `${g.metric} - ${g.period}`}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{g.start_date?.split('T')[0]} - {g.end_date?.split('T')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-light font-mono ${g.progress_pct >= 100 ? 'text-emerald-400' : g.progress_pct >= 50 ? 'text-gold-400' : 'text-white'}`}>{g.progress_pct || 0}%</p>
                    <Badge className={`border-0 text-[10px] mt-1 ${g.progress_pct >= 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-gray-400'}`}>{g.progress_pct >= 100 ? 'Atingido' : 'Em progresso'}</Badge>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div className={`h-3 rounded-full transition-all ${g.progress_pct >= 100 ? 'bg-emerald-500' : g.progress_pct >= 50 ? 'bg-gold-500' : 'bg-zinc-600'}`} style={{ width: `${Math.min(g.progress_pct || 0, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-gray-500">Atual: <span className="text-white font-mono">{formatNumber(g.current_value || 0)}</span></span>
                  <span className="text-gray-500">Meta: <span className="text-white font-mono">{formatNumber(g.target_value)}</span></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Commissions Tab */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">As Minhas Comissoes</h2>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gold-500/5 border border-gold-500/20 rounded-xl p-4 text-center">
              <p className="text-gold-400 text-xl font-mono font-light">{formatCurrency(commission_summary.pending)}</p>
              <p className="text-gray-500 text-xs mt-1">Pendente</p>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center">
              <p className="text-blue-400 text-xl font-mono font-light">{formatCurrency(commission_summary.approved)}</p>
              <p className="text-gray-500 text-xs mt-1">Aprovado</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-emerald-400 text-xl font-mono font-light">{formatCurrency(commission_summary.paid)}</p>
              <p className="text-gray-500 text-xs mt-1">Pago</p>
            </div>
          </div>

          {/* Commission list */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-zinc-800/30 text-gray-500 text-[11px] uppercase tracking-wider">
              <div className="col-span-2">Periodo</div><div className="col-span-2">Volume</div><div className="col-span-2">Receita</div>
              <div className="col-span-1">Base</div><div className="col-span-1">Bonus</div><div className="col-span-2">Total</div><div className="col-span-2">Estado</div>
            </div>
            {commissions.length === 0 ? (
              <div className="text-center py-12 text-gray-600"><DollarSign size={32} className="mx-auto mb-2 opacity-30" /><p>Sem comissoes calculadas</p></div>
            ) : commissions.map((c, i) => (
              <div key={c.id} className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                <div className="col-span-2 text-white text-sm">{c.period_label}</div>
                <div className="col-span-2 text-gray-400 font-mono text-xs">{formatCurrency(c.volume)}</div>
                <div className="col-span-2 text-gray-400 font-mono text-xs">{formatCurrency(c.revenue)}</div>
                <div className="col-span-1 text-white font-mono text-xs">{formatCurrency(c.base_commission)}</div>
                <div className="col-span-1 text-emerald-400 font-mono text-xs">+{formatCurrency(c.bonuses)}</div>
                <div className="col-span-2 text-gold-400 font-mono font-medium">{formatCurrency(c.total_commission)}</div>
                <div className="col-span-2">
                  <Badge className={`border-0 text-xs ${
                    c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                    c.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                    c.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                    'bg-gold-500/10 text-gold-400'
                  }`}>{c.status === 'pending' ? 'Pendente' : c.status === 'approved' ? 'Aprovado' : c.status === 'paid' ? 'Pago' : c.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-white">Negocios Recentes</h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-zinc-800/30 text-gray-500 text-[11px] uppercase tracking-wider">
              <div className="col-span-2">Data</div><div className="col-span-3">Cliente</div><div className="col-span-2">Produto</div>
              <div className="col-span-1">Asset</div><div className="col-span-2">Volume</div><div className="col-span-2">Receita</div>
            </div>
            {recent_deals.length === 0 ? (
              <div className="text-center py-12 text-gray-600"><Handshake size={32} className="mx-auto mb-2 opacity-30" /><p>Sem negocios registados</p></div>
            ) : recent_deals.map((d, i) => (
              <div key={d.id} className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                <div className="col-span-2 text-gray-500 text-xs">{d.created_at?.split('T')[0]}</div>
                <div className="col-span-3 text-white text-sm truncate">{d.client_name}</div>
                <div className="col-span-2"><Badge className="bg-zinc-800 text-gray-300 border-0 text-[10px]">{d.product_type}</Badge></div>
                <div className="col-span-1 text-gray-400 text-xs">{d.asset}</div>
                <div className="col-span-2 text-white font-mono text-xs">{formatCurrency(d.volume)}</div>
                <div className="col-span-2 text-emerald-400 font-mono text-xs">{formatCurrency(d.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPerformance;
