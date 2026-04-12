import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  BarChart3, Users, Target, TrendingUp, DollarSign, Briefcase,
  ArrowUpRight, ArrowDownRight, Award, Plus, X, Loader2,
  ChevronRight, Handshake, UserPlus, Globe
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (v) => {
  if (!v) return '€0';
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `€${(v / 1e3).toFixed(1)}K`;
  return `€${v.toFixed(0)}`;
};

const formatNumber = (v) => {
  if (!v) return '0';
  return v.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
};

// ─── KPI Card ────────────────────────────────────────────────
const KPICard = ({ label, value, icon: Icon, color, change }) => (
  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-light text-white tracking-tight">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(change)}% vs periodo anterior
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── Sellers Tab ─────────────────────────────────────────────
const SellersTab = ({ token }) => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/commercial/sellers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSellers(res.data);
      } catch { /* silent */ }
      setLoading(false);
    };
    fetch();
  }, [token]);

  if (loading) return <div className="text-gray-400 text-center py-12">A carregar...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Vendedores ({sellers.length})</h2>
      </div>
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-800/30 text-gray-500 text-xs uppercase tracking-wider">
          <div className="col-span-3">Nome</div>
          <div className="col-span-2">Funcao</div>
          <div className="col-span-2">Regiao</div>
          <div className="col-span-2">Contrato</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1"></div>
        </div>
        {sellers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Nenhum vendedor encontrado</div>
        ) : (
          sellers.map((s, i) => (
            <div key={s.id} className={`grid grid-cols-12 gap-4 px-5 py-4 items-center ${i > 0 ? 'border-t border-zinc-800/50' : ''} hover:bg-zinc-800/20`}>
              <div className="col-span-3">
                <p className="text-white text-sm font-medium">{s.name}</p>
                <p className="text-gray-500 text-xs">{s.email}</p>
              </div>
              <div className="col-span-2">
                <Badge className="bg-zinc-800 text-gray-300 border-0 text-xs">{s.internal_role || '-'}</Badge>
              </div>
              <div className="col-span-2 text-gray-400 text-sm">{s.region || '-'}</div>
              <div className="col-span-2">
                <Badge className={`border-0 text-xs ${
                  s.contract_type === 'commission' ? 'bg-gold-500/10 text-gold-400' :
                  s.contract_type === 'hybrid' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-zinc-700 text-gray-300'
                }`}>{s.contract_type || 'N/D'}</Badge>
              </div>
              <div className="col-span-2">
                <Badge className={`border-0 text-xs ${
                  s.seller_status === 'inactive' ? 'bg-red-500/10 text-red-400' :
                  s.seller_status === 'suspended' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-emerald-500/10 text-emerald-400'
                }`}>{s.seller_status || 'ativo'}</Badge>
              </div>
              <div className="col-span-1 text-right">
                <ChevronRight size={16} className="text-gray-600" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ─── Teams Tab ───────────────────────────────────────────────
const TeamsTab = ({ token }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', description: '' });

  const fetchTeams = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/commercial/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeams(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/commercial/teams`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Equipa criada');
      setShowForm(false);
      setForm({ name: '', region: '', description: '' });
      fetchTeams();
    } catch { toast.error('Erro ao criar equipa'); }
  };

  if (loading) return <div className="text-gray-400 text-center py-12">A carregar...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Equipas ({teams.length})</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}
          className="bg-gold-600 hover:bg-gold-500 text-black gap-2 h-8">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancelar' : 'Nova Equipa'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-400 text-xs">Nome</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  required className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="Ex: Equipa Europa" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Regiao</Label>
                <Input value={form.region} onChange={e => setForm({...form, region: e.target.value})}
                  required className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="Ex: europe" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="bg-gold-600 hover:bg-gold-500 text-black w-full">Criar Equipa</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(t => (
          <Card key={t.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium">{t.name}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{t.region}</p>
                </div>
                <Badge className={`border-0 text-xs ${t.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {t.is_active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Users size={14} /> {t.member_count || 0} membros
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">Nenhuma equipa criada</div>
        )}
      </div>
    </div>
  );
};

// ─── Goals Tab ───────────────────────────────────────────────
const GoalsTab = ({ token }) => {
  const [goals, setGoals] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    seller_id: '', period: 'monthly', metric: 'volume',
    target_value: '', start_date: '', end_date: '', description: ''
  });

  const fetchData = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/api/commercial/goals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/commercial/sellers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setGoals(gRes.data);
      setSellers(sRes.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/commercial/goals`, {
        ...form, target_value: parseFloat(form.target_value)
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Meta criada');
      setShowForm(false);
      fetchData();
    } catch { toast.error('Erro ao criar meta'); }
  };

  const getSellerName = (id) => sellers.find(s => s.id === id)?.name || id;

  if (loading) return <div className="text-gray-400 text-center py-12">A carregar...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Metas ({goals.length})</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}
          className="bg-gold-600 hover:bg-gold-500 text-black gap-2 h-8">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Cancelar' : 'Nova Meta'}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-5">
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-400 text-xs">Vendedor</Label>
                <select value={form.seller_id} onChange={e => setForm({...form, seller_id: e.target.value})}
                  required className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 text-white rounded-md mt-1 text-sm">
                  <option value="">Selecionar...</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Metrica</Label>
                <select value={form.metric} onChange={e => setForm({...form, metric: e.target.value})}
                  className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 text-white rounded-md mt-1 text-sm">
                  <option value="volume">Volume</option>
                  <option value="revenue">Receita</option>
                  <option value="deals_count">N. Negocios</option>
                  <option value="new_clients">Novos Clientes</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Valor Alvo</Label>
                <Input type="number" value={form.target_value} onChange={e => setForm({...form, target_value: e.target.value})}
                  required className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="100000" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Data Inicio</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                  required className="bg-zinc-800 border-zinc-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Data Fim</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})}
                  required className="bg-zinc-800 border-zinc-700 text-white mt-1" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="bg-gold-600 hover:bg-gold-500 text-black w-full">Criar Meta</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {goals.map(g => (
          <Card key={g.id} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{getSellerName(g.seller_id)}</p>
                  <p className="text-gray-500 text-xs">{g.metric} | {g.period} | {g.start_date?.split('T')[0]} - {g.end_date?.split('T')[0]}</p>
                </div>
                <Badge className={`border-0 text-xs ${
                  g.progress_pct >= 100 ? 'bg-emerald-500/10 text-emerald-400' :
                  g.progress_pct >= 50 ? 'bg-gold-500/10 text-gold-400' :
                  'bg-zinc-700 text-gray-300'
                }`}>{g.progress_pct || 0}%</Badge>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    g.progress_pct >= 100 ? 'bg-emerald-500' :
                    g.progress_pct >= 50 ? 'bg-gold-500' : 'bg-zinc-600'
                  }`}
                  style={{ width: `${Math.min(g.progress_pct || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{formatNumber(g.current_value || 0)}</span>
                <span>{formatNumber(g.target_value)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {goals.length === 0 && <div className="text-center py-12 text-gray-500">Nenhuma meta definida</div>}
      </div>
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────
const CommercialDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overview, setOverview] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [ovRes, rkRes] = await Promise.all([
        axios.get(`${API_URL}/api/commercial/dashboard/overview?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/commercial/dashboard/sellers-ranking?period=${period}&metric=volume`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);
      setOverview(ovRes.data);
      setRanking(rkRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, [token, period]);

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'sellers', label: 'Vendedores', icon: Users },
    { key: 'teams', label: 'Equipas', icon: Users },
    { key: 'goals', label: 'Metas', icon: Target },
  ];

  return (
    <div className="space-y-6" data-testid="commercial-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white tracking-tight">Gestao Comercial</h1>
          <p className="text-gray-500 text-sm mt-1">Performance, equipas e resultados</p>
        </div>
        {activeTab === 'dashboard' && (
          <div className="flex items-center gap-2">
            {['monthly', 'quarterly', 'annual'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? 'bg-gold-500/15 text-gold-400' : 'text-gray-500 hover:text-white'
                }`}>
                {p === 'monthly' ? 'Mensal' : p === 'quarterly' ? 'Trimestral' : 'Anual'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 pb-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
              data-testid={`tab-${tab.key}`}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="text-gold-400 animate-spin" size={32} />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <KPICard label="Volume Total" value={formatCurrency(overview?.kpis?.total_volume)} icon={TrendingUp} color="bg-blue-500/15 text-blue-400" />
                <KPICard label="Receita Gerada" value={formatCurrency(overview?.kpis?.total_revenue)} icon={DollarSign} color="bg-emerald-500/15 text-emerald-400" />
                <KPICard label="Total Negocios" value={overview?.kpis?.total_deals || 0} icon={Handshake} color="bg-gold-500/15 text-gold-400" />
                <KPICard label="Ticket Medio" value={formatCurrency(overview?.kpis?.avg_ticket)} icon={Briefcase} color="bg-purple-500/15 text-purple-400" />
              </div>

              {/* Team Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-white">{overview?.team_stats?.total_sellers || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">Vendedores</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-white">{overview?.team_stats?.active_sellers || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">Ativos</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-white">{overview?.team_stats?.total_teams || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">Equipas</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-light text-white">{overview?.team_stats?.active_goals || 0}</p>
                  <p className="text-gray-500 text-xs mt-1">Metas Ativas</p>
                </div>
              </div>

              {/* Sellers Ranking */}
              <div>
                <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Award size={18} className="text-gold-400" /> Ranking de Vendedores
                </h2>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-800/30 text-gray-500 text-xs uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">Vendedor</div>
                    <div className="col-span-2">Regiao</div>
                    <div className="col-span-2">Volume</div>
                    <div className="col-span-2">Receita</div>
                    <div className="col-span-2">Negocios</div>
                  </div>
                  {ranking.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Sem dados para o periodo selecionado</div>
                  ) : (
                    ranking.map((r, i) => (
                      <div key={r.id} className={`grid grid-cols-12 gap-4 px-5 py-3.5 items-center ${i > 0 ? 'border-t border-zinc-800/50' : ''} hover:bg-zinc-800/20`}>
                        <div className="col-span-1">
                          <span className={`text-sm font-bold ${i === 0 ? 'text-gold-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {i + 1}
                          </span>
                        </div>
                        <div className="col-span-3">
                          <p className="text-white text-sm font-medium">{r.name}</p>
                          <p className="text-gray-500 text-xs">{r.internal_role}</p>
                        </div>
                        <div className="col-span-2 text-gray-400 text-sm">{r.region}</div>
                        <div className="col-span-2 text-white text-sm font-mono">{formatCurrency(r.total_volume)}</div>
                        <div className="col-span-2 text-emerald-400 text-sm font-mono">{formatCurrency(r.total_revenue)}</div>
                        <div className="col-span-2 text-gray-400 text-sm">{r.deal_count}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Other Tabs */}
      {activeTab === 'sellers' && <SellersTab token={token} />}
      {activeTab === 'teams' && <TeamsTab token={token} />}
      {activeTab === 'goals' && <GoalsTab token={token} />}
    </div>
  );
};

export default CommercialDashboard;
