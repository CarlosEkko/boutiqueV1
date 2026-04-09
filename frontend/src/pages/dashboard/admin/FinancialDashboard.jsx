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
  Users, Activity, BarChart3, Fuel, AlertTriangle, CheckCircle, Send,
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
  const [sendingAlert, setSendingAlert] = useState(false);

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

  const { aum, revenue, volume, pending, revenue_trend, asset_distribution, fiat_vs_crypto, top_clients, recent_orders, recent_deposits, gas_station } = data;

  const statusColor = (s) => {
    const map = { completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30', pending_proof: 'bg-amber-500/20 text-amber-400 border-amber-500/30', submitted: 'bg-blue-500/20 text-blue-400 border-blue-500/30', processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30', awaiting_payment: 'bg-amber-500/20 text-amber-400 border-amber-500/30', cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    return map[s] || 'bg-zinc-700/40 text-zinc-300 border-zinc-600';
  };

  const sendGasAlert = async () => {
    setSendingAlert(true);
    try {
      const res = await axios.post(`${API_URL}/api/finance/gas-station/check-alerts`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.alert_sent) {
        toast.success(`Alerta enviado para ${res.data.email_sent_to}`);
      } else {
        toast.info(res.data.message || 'Sem alerta necessário');
      }
    } catch (err) {
      toast.error('Erro ao enviar alerta');
    } finally { setSendingAlert(false); }
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
          value={pending.deposits + pending.withdrawals + pending.orders + (pending.crypto_withdrawals || 0)}
          sub={`Dep: ${pending.deposits} · Lev: ${pending.withdrawals} · Ord: ${pending.orders} · Crypto: ${pending.crypto_withdrawals || 0}`}
          icon={Clock}
          accent="rose"
        />
      </div>

      {/* Gas Station Monitoring */}
      {gas_station && (
        <Card className={`bg-zinc-900 border ${gas_station.health === 'critical' ? 'border-red-500/50 shadow-red-900/20 shadow-lg' : gas_station.health === 'warning' ? 'border-amber-500/40' : 'border-emerald-500/30'}`} data-testid="gas-station-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Fuel className={`w-4 h-4 ${gas_station.health === 'critical' ? 'text-red-500' : gas_station.health === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`} />
                Gas Station
                <Badge className={`ml-2 text-[10px] uppercase font-bold ${gas_station.health === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : gas_station.health === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {gas_station.health === 'critical' ? 'Crítico' : gas_station.health === 'warning' ? 'Baixo' : 'Saudável'}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                {gas_station.health !== 'healthy' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendGasAlert}
                    disabled={sendingAlert}
                    className={`text-xs rounded-full ${gas_station.health === 'critical' ? 'border-red-500/40 text-red-400 hover:bg-red-900/20' : 'border-amber-500/40 text-amber-400 hover:bg-amber-900/20'}`}
                    data-testid="send-gas-alert-btn"
                  >
                    {sendingAlert ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                    Enviar Alerta
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(gas_station.assets || []).map((a) => (
                <div key={a.asset_id} className={`rounded-lg p-4 border ${a.status === 'critical' ? 'bg-red-950/30 border-red-500/30' : a.status === 'warning' ? 'bg-amber-950/20 border-amber-500/20' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 font-mono tracking-wider">{a.asset_id.replace('_', ' ')}</span>
                    {a.status === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                     a.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                     <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <p className={`text-lg font-mono font-light ${a.status === 'critical' ? 'text-red-400' : a.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {a.available < 0.001 ? a.available.toExponential(2) : a.available.toFixed(6)}
                  </p>
                  {a.fiat_value != null && (
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">≈ ${a.fiat_value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1">Disponível</p>
                </div>
              ))}
            </div>
            {gas_station.warnings?.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Avisos</p>
                {gas_station.warnings.map((w, i) => (
                  <p key={i} className={`text-xs ${w.includes('CRÍTICO') ? 'text-red-400' : 'text-amber-400'} mb-1 font-mono`}>
                    {w}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
