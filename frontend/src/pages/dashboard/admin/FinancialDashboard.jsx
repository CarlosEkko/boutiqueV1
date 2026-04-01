import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from 'recharts';
import {
  Landmark, TrendingUp, ArrowUpToLine, ArrowDownToLine,
  RefreshCw, Loader2, Clock, DollarSign, PieChart as PieChartIcon,
  Users, Activity, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CHART_COLORS = [
  '#F7931A', '#627EEA', '#26A17B', '#2775CA', '#9945FF',
  '#D4AF37', '#E84142', '#F0B90B', '#a1a1aa',
];

const fmt = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};

const FinancialDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/finance/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error('Finance dashboard error:', err);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="finance-dashboard-loading">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const { aum, revenue, volume, pending, revenue_trend, asset_distribution, fiat_vs_crypto, top_clients, recent_orders, recent_deposits } = data;

  const statusColor = (s) => {
    const map = { completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30', pending_proof: 'bg-amber-500/20 text-amber-400 border-amber-500/30', submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30', processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30', awaiting_payment: 'bg-amber-500/20 text-amber-400 border-amber-500/30', cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    return map[s] || 'bg-zinc-700/40 text-zinc-300 border-zinc-600';
  };

  const pieData = [
    { name: 'Fiat', value: fiat_vs_crypto.fiat },
    { name: 'Crypto', value: fiat_vs_crypto.crypto },
  ];

  return (
    <div className="space-y-6" data-testid="finance-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight" data-testid="finance-dashboard-title">
            Dashboard Financeiro
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Visão consolidada das métricas financeiras</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-full"
          data-testid="finance-refresh-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          testId="kpi-aum"
          label="AUM Total"
          value={fmt(aum.total_usd)}
          sub={`Fiat: ${fmt(aum.fiat_usd)} · Crypto: ${fmt(aum.crypto_usd)}`}
          icon={Landmark}
          accent="amber"
        />
        <KPICard
          testId="kpi-revenue"
          label="Receita Total"
          value={fmt(revenue.total)}
          sub={`Admissão: ${fmt(revenue.admission_fees)} · Trading: ${fmt(revenue.trading_fees)}`}
          icon={DollarSign}
          accent="emerald"
        />
        <KPICard
          testId="kpi-volume"
          label="Volume 30d"
          value={fmt(volume.d30.volume)}
          sub={`24h: ${fmt(volume.h24.volume)} · 7d: ${fmt(volume.d7.volume)}`}
          icon={TrendingUp}
          accent="blue"
        />
        <KPICard
          testId="kpi-pending"
          label="Operações Pendentes"
          value={pending.deposits + pending.withdrawals + pending.orders}
          sub={`Dep: ${pending.deposits} · Lev: ${pending.withdrawals} · Ord: ${pending.orders}`}
          icon={Clock}
          accent="rose"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-zinc-900 border border-zinc-800/50" data-testid="revenue-trend-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Evolução de Receita (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue_trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: '#a1a1aa', fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#fafafa', fontSize: 12 }}
                    formatter={(v) => [`$${v.toFixed(2)}`, 'Receita']}
                  />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Asset Distribution Pie */}
        <Card className="bg-zinc-900 border border-zinc-800/50" data-testid="asset-distribution-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-amber-500" /> Fiat vs Crypto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    dataKey="value"
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#D4AF37" />
                    <Cell fill="#627EEA" />
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#fafafa', fontSize: 12 }}
                    formatter={(v) => [fmt(v), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown + Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Breakdown Bar */}
        <Card className="bg-zinc-900 border border-zinc-800/50" data-testid="asset-breakdown-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" /> Distribuição por Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={asset_distribution} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" step="any" tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(v) => fmt(v)} />
                  <YAxis dataKey="asset" type="category" tick={{ fill: '#fafafa', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} width={50} />
                  <RechartsTooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#fafafa', fontSize: 12 }}
                    formatter={(v) => [fmt(v), 'Valor']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {asset_distribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients by AUM */}
        <Card className="bg-zinc-900 border border-zinc-800/50" data-testid="top-clients-table">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" /> Top Clientes por AUM
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/50 hover:bg-transparent">
                  <TableHead className="text-zinc-500 text-xs">Cliente</TableHead>
                  <TableHead className="text-zinc-500 text-xs">Região</TableHead>
                  <TableHead className="text-zinc-500 text-xs text-right">AUM (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top_clients.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-zinc-500 py-8">Sem dados</TableCell></TableRow>
                )}
                {top_clients.map((c, i) => (
                  <TableRow key={i} className="border-zinc-800/30 hover:bg-zinc-800/30">
                    <TableCell className="py-2">
                      <div className="text-sm text-white font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500">{c.email}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 capitalize">{c.region || '—'}</Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm text-amber-400">{fmt(c.aum_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-zinc-900 border border-zinc-800/50" data-testid="recent-transactions-table">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <ArrowUpToLine className="w-4 h-4 text-amber-500" /> Transações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/50 hover:bg-transparent">
                <TableHead className="text-zinc-500 text-xs">Tipo</TableHead>
                <TableHead className="text-zinc-500 text-xs">Utilizador</TableHead>
                <TableHead className="text-zinc-500 text-xs">Detalhe</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Valor</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent_orders.map((o, i) => (
                <TableRow key={`o-${i}`} className="border-zinc-800/30 hover:bg-zinc-800/30">
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300 uppercase">{o.order_type}</Badge>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-zinc-300">{o.user_email}</TableCell>
                  <TableCell className="py-2 text-sm text-zinc-400 font-mono">{o.crypto_symbol}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm text-white">${(o.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right">
                    <Badge className={`text-[10px] border ${statusColor(o.status)}`}>{o.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recent_deposits.map((d, i) => (
                <TableRow key={`d-${i}`} className="border-zinc-800/30 hover:bg-zinc-800/30">
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300 uppercase">depósito</Badge>
                  </TableCell>
                  <TableCell className="py-2 text-sm text-zinc-300">{d.user_email}</TableCell>
                  <TableCell className="py-2 text-sm text-zinc-400 font-mono">{d.currency}</TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm text-white">${(d.amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right">
                    <Badge className={`text-[10px] border ${statusColor(d.status)}`}>{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recent_orders.length === 0 && recent_deposits.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-zinc-500 py-8">Sem transações recentes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const KPICard = ({ testId, label, value, sub, icon: Icon, accent }) => {
  const accentMap = {
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'text-rose-500' },
  };
  const a = accentMap[accent] || accentMap.amber;

  return (
    <Card className={`bg-zinc-900 border ${a.border} hover:-translate-y-0.5 transition-all duration-300`} data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500">{label}</p>
            <p className={`text-2xl font-light tracking-tight ${a.text}`}>{value}</p>
            <p className="text-[11px] text-zinc-500 leading-tight">{sub}</p>
          </div>
          <div className={`w-10 h-10 rounded-full ${a.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${a.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialDashboard;
