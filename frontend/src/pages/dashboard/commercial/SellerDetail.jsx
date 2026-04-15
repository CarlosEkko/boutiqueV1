import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  Target, DollarSign, Briefcase, Users, Loader2,
  ChevronRight, Handshake
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { API_URL, formatCurrency, formatNumber, ChartTooltip } from './utils';

const SellerDetail = ({ sellerId, token, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/commercial/dashboard/seller/${sellerId}/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [sellerId, token]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="text-gold-400 animate-spin" size={32} /></div>;
  if (!data) return <div className="text-red-400 text-center py-12">Erro ao carregar dados</div>;

  const { seller, kpis, timeline, recent_deals, goals, commissions, product_breakdown, top_clients } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors" data-testid="seller-back-btn">
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-gold-500/15 flex items-center justify-center">
            <span className="text-gold-400 font-bold text-lg">{seller?.name?.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-light text-white">{seller?.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-gray-500 text-sm">{seller?.email}</span>
              <Badge className="bg-zinc-800 text-gray-300 border-0 text-xs">{seller?.internal_role}</Badge>
              <Badge className="bg-blue-500/10 text-blue-400 border-0 text-xs">{seller?.region}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Este Mes', data: kpis.month, color: 'gold' },
          { label: 'Este Ano', data: kpis.year, color: 'blue' },
          { label: 'Total (Lifetime)', data: kpis.lifetime, color: 'emerald' },
        ].map(p => (
          <Card key={p.label} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-5">
              <p className={`text-${p.color}-400 text-xs font-medium uppercase tracking-wider mb-3`}>{p.label}</p>
              <div className="grid grid-cols-2 gap-y-3">
                <div><p className="text-gray-500 text-[11px]">Volume</p><p className="text-white font-mono text-sm">{formatCurrency(p.data?.volume)}</p></div>
                <div><p className="text-gray-500 text-[11px]">Receita</p><p className="text-emerald-400 font-mono text-sm">{formatCurrency(p.data?.revenue)}</p></div>
                <div><p className="text-gray-500 text-[11px]">Negocios</p><p className="text-white text-sm">{p.data?.deals || 0}</p></div>
                <div><p className="text-gray-500 text-[11px]">Clientes</p><p className="text-white text-sm">{p.data?.clients || 0}</p></div>
                <div className="col-span-2"><p className="text-gray-500 text-[11px]">Ticket Medio</p><p className="text-white font-mono text-sm">{formatCurrency(p.data?.avg_ticket)}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-5">
            <h3 className="text-white font-medium mb-4">Evolucao Mensal</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} /><stop offset="95%" stopColor="#D4AF37" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34D399" stopOpacity={0.3} /><stop offset="95%" stopColor="#34D399" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  <Area type="monotone" dataKey="volume" name="Volume" stroke="#D4AF37" fill="url(#gV)" strokeWidth={2} />
                  <Area type="monotone" dataKey="revenue" name="Receita" stroke="#34D399" fill="url(#gR)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-5">
            <h3 className="text-white font-medium mb-4">Breakdown por Produto</h3>
            <div className="h-[240px]">
              {product_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={product_breakdown} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" tick={{ fill: '#e4e4e7', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                    <Bar dataKey="volume" name="Volume" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="revenue" name="Receita" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm"><Briefcase size={28} className="opacity-30 mr-2" /> Sem dados</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {goals.length > 0 && (
        <div>
          <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Target size={16} className="text-gold-400" /> Metas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map(g => (
              <Card key={g.id} className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs">{g.metric} | {g.period} | {g.start_date?.split('T')[0]} - {g.end_date?.split('T')[0]}</span>
                    <Badge className={`border-0 text-xs ${g.progress_pct >= 100 ? 'bg-emerald-500/10 text-emerald-400' : g.progress_pct >= 50 ? 'bg-gold-500/10 text-gold-400' : 'bg-zinc-700 text-gray-300'}`}>{g.progress_pct || 0}%</Badge>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 mb-1.5">
                    <div className={`h-2 rounded-full ${g.progress_pct >= 100 ? 'bg-emerald-500' : g.progress_pct >= 50 ? 'bg-gold-500' : 'bg-zinc-600'}`} style={{ width: `${Math.min(g.progress_pct || 0, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>{formatNumber(g.current_value || 0)}</span><span>{formatNumber(g.target_value)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Users size={16} className="text-blue-400" /> Top Clientes</h3>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {top_clients.length > 0 ? top_clients.map((c, i) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                  <div className="flex items-center gap-3"><span className="text-gray-600 text-xs w-5">{i + 1}</span><span className="text-white text-sm">{c.name}</span></div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400 font-mono">{formatCurrency(c.volume)}</span>
                    <span className="text-emerald-400 font-mono">{formatCurrency(c.revenue)}</span>
                    <Badge className="bg-zinc-800 text-gray-400 border-0 text-[10px]">{c.deals} deals</Badge>
                  </div>
                </div>
              )) : <div className="text-center py-8 text-gray-600 text-sm">Sem clientes</div>}
            </CardContent>
          </Card>
        </div>
        <div>
          <h3 className="text-white font-medium mb-3 flex items-center gap-2"><DollarSign size={16} className="text-emerald-400" /> Comissoes</h3>
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {commissions.length > 0 ? commissions.map((c, i) => (
                <div key={c.id} className={`flex items-center justify-between px-5 py-3 ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                  <div><p className="text-white text-sm">{c.period_label}</p><p className="text-gray-500 text-xs">Base: {formatCurrency(c.base_commission)} + Bonus: {formatCurrency(c.bonuses)}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="text-gold-400 font-mono text-sm font-medium">{formatCurrency(c.total_commission)}</span>
                    <Badge className={`border-0 text-[10px] ${c.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'approved' ? 'bg-blue-500/10 text-blue-400' : 'bg-gold-500/10 text-gold-400'}`}>{c.status}</Badge>
                  </div>
                </div>
              )) : <div className="text-center py-8 text-gray-600 text-sm">Sem comissoes</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium mb-3 flex items-center gap-2"><Handshake size={16} className="text-gold-400" /> Negocios Recentes</h3>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-zinc-800/30 text-gray-500 text-[11px] uppercase tracking-wider">
            <div className="col-span-2">Data</div><div className="col-span-2">Cliente</div><div className="col-span-2">Produto</div>
            <div className="col-span-1">Asset</div><div className="col-span-2">Volume</div><div className="col-span-2">Receita</div><div className="col-span-1">Regiao</div>
          </div>
          {recent_deals.length > 0 ? recent_deals.map((d, i) => (
            <div key={d.id} className={`grid grid-cols-12 gap-3 px-5 py-3 items-center text-sm ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
              <div className="col-span-2 text-gray-500 text-xs">{d.created_at?.split('T')[0]}</div>
              <div className="col-span-2 text-white text-xs truncate">{d.client_name}</div>
              <div className="col-span-2"><Badge className="bg-zinc-800 text-gray-300 border-0 text-[10px]">{d.product_type}</Badge></div>
              <div className="col-span-1 text-gray-400 text-xs">{d.asset}</div>
              <div className="col-span-2 text-white font-mono text-xs">{formatCurrency(d.volume)}</div>
              <div className="col-span-2 text-emerald-400 font-mono text-xs">{formatCurrency(d.revenue)}</div>
              <div className="col-span-1 text-gray-500 text-xs">{d.region}</div>
            </div>
          )) : <div className="text-center py-8 text-gray-600 text-sm">Sem negocios registados</div>}
        </div>
      </div>
    </div>
  );
};

export default SellerDetail;
