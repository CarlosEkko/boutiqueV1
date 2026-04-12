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
  ChevronRight, Handshake, UserPlus, Globe, Shield
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

// ─── Commissions Tab ─────────────────────────────────────────
const CommissionsTab = ({ token }) => {
  const [tables, setTables] = useState([]);
  const [rules, setRules] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTableForm, setShowTableForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showCalcForm, setShowCalcForm] = useState(false);
  const [tableForm, setTableForm] = useState({ name: '', commission_type: 'pct_revenue', rate: '' });
  const [ruleForm, setRuleForm] = useState({ name: '', rule_type: 'bonus', trigger_threshold: '', value: '', value_type: 'pct', split_leader_pct: '' });
  const [calcForm, setCalcForm] = useState({ period_label: '', start_date: '', end_date: '' });
  const [subTab, setSubTab] = useState('tables');

  const fetchAll = async () => {
    try {
      const [tRes, rRes, pRes] = await Promise.all([
        axios.get(`${API_URL}/api/commercial/commission-tables`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/commercial/commission-rules`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/commercial/commissions/payments`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setTables(tRes.data);
      setRules(rRes.data);
      setPayments(pRes.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [token]);

  const createTable = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/commercial/commission-tables`, { ...tableForm, rate: parseFloat(tableForm.rate) }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Tabela criada');
      setShowTableForm(false);
      setTableForm({ name: '', commission_type: 'pct_revenue', rate: '' });
      fetchAll();
    } catch { toast.error('Erro'); }
  };

  const createRule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/commercial/commission-rules`, {
        ...ruleForm,
        trigger_threshold: ruleForm.trigger_threshold ? parseFloat(ruleForm.trigger_threshold) : null,
        value: parseFloat(ruleForm.value),
        split_leader_pct: ruleForm.split_leader_pct ? parseFloat(ruleForm.split_leader_pct) : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Regra criada');
      setShowRuleForm(false);
      fetchAll();
    } catch { toast.error('Erro'); }
  };

  const calculateCommissions = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/commercial/commissions/calculate`, calcForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Comissoes calculadas: ${res.data.commissions?.length || 0} vendedores`);
      setShowCalcForm(false);
      fetchAll();
    } catch { toast.error('Erro ao calcular'); }
  };

  const updatePaymentStatus = async (id, action) => {
    try {
      await axios.put(`${API_URL}/api/commercial/commissions/payments/${id}/${action}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Comissao ${action === 'approve' ? 'aprovada' : action === 'pay' ? 'paga' : 'rejeitada'}`);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro'); }
  };

  if (loading) return <div className="text-gray-400 text-center py-12">A carregar...</div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { key: 'tables', label: 'Tabelas' },
          { key: 'rules', label: 'Regras' },
          { key: 'payments', label: `Pagamentos (${payments.length})` },
        ].map(st => (
          <button key={st.key} onClick={() => setSubTab(st.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === st.key ? 'bg-zinc-800 text-white' : 'text-gray-500 hover:text-white'}`}>
            {st.label}
          </button>
        ))}
      </div>

      {/* Tables Sub-tab */}
      {subTab === 'tables' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">Tabelas de Comissao</h3>
            <Button size="sm" onClick={() => setShowTableForm(!showTableForm)} className="bg-gold-600 hover:bg-gold-500 text-black gap-2 h-8">
              {showTableForm ? <X size={14} /> : <Plus size={14} />} {showTableForm ? 'Cancelar' : 'Nova Tabela'}
            </Button>
          </div>
          {showTableForm && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <form onSubmit={createTable} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label className="text-gray-400 text-xs">Nome</Label><Input value={tableForm.name} onChange={e => setTableForm({...tableForm, name: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="OTC Europa" /></div>
                  <div><Label className="text-gray-400 text-xs">Tipo</Label>
                    <select value={tableForm.commission_type} onChange={e => setTableForm({...tableForm, commission_type: e.target.value})} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 text-white rounded-md mt-1 text-sm">
                      <option value="pct_revenue">% Receita</option><option value="pct_volume">% Volume</option><option value="fixed">Fixa</option><option value="staircase">Escalonada</option>
                    </select>
                  </div>
                  <div><Label className="text-gray-400 text-xs">Taxa (%)</Label><Input type="number" step="0.01" value={tableForm.rate} onChange={e => setTableForm({...tableForm, rate: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" /></div>
                  <div className="flex items-end"><Button type="submit" className="bg-gold-600 hover:bg-gold-500 text-black w-full">Criar</Button></div>
                </form>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {tables.map(t => (
              <div key={t.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.commission_type} | {t.rate}% {t.region ? `| ${t.region}` : ''} {t.product_type ? `| ${t.product_type}` : ''}</p>
                </div>
                <Badge className={`border-0 text-xs ${t.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{t.is_active ? 'Ativa' : 'Inativa'}</Badge>
              </div>
            ))}
            {tables.length === 0 && <div className="text-center py-8 text-gray-500">Nenhuma tabela configurada</div>}
          </div>
        </div>
      )}

      {/* Rules Sub-tab */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">Regras Avancadas</h3>
            <Button size="sm" onClick={() => setShowRuleForm(!showRuleForm)} className="bg-gold-600 hover:bg-gold-500 text-black gap-2 h-8">
              {showRuleForm ? <X size={14} /> : <Plus size={14} />} {showRuleForm ? 'Cancelar' : 'Nova Regra'}
            </Button>
          </div>
          {showRuleForm && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <form onSubmit={createRule} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label className="text-gray-400 text-xs">Nome</Label><Input value={ruleForm.name} onChange={e => setRuleForm({...ruleForm, name: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="Bonus Meta 100%" /></div>
                  <div><Label className="text-gray-400 text-xs">Tipo</Label>
                    <select value={ruleForm.rule_type} onChange={e => setRuleForm({...ruleForm, rule_type: e.target.value})} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 text-white rounded-md mt-1 text-sm">
                      <option value="bonus">Bonus</option><option value="accelerator">Acelerador</option><option value="penalty">Penalizacao</option><option value="split">Split Lider</option>
                    </select>
                  </div>
                  <div><Label className="text-gray-400 text-xs">Threshold (%)</Label><Input type="number" value={ruleForm.trigger_threshold} onChange={e => setRuleForm({...ruleForm, trigger_threshold: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="100" /></div>
                  <div><Label className="text-gray-400 text-xs">Valor (%)</Label><Input type="number" step="0.01" value={ruleForm.value} onChange={e => setRuleForm({...ruleForm, value: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" /></div>
                  {ruleForm.rule_type === 'split' && (
                    <div><Label className="text-gray-400 text-xs">Split Lider (%)</Label><Input type="number" value={ruleForm.split_leader_pct} onChange={e => setRuleForm({...ruleForm, split_leader_pct: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="10" /></div>
                  )}
                  <div className="flex items-end"><Button type="submit" className="bg-gold-600 hover:bg-gold-500 text-black w-full">Criar</Button></div>
                </form>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {rules.map(r => (
              <div key={r.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{r.name}</p>
                  <p className="text-gray-500 text-xs">{r.rule_type} | Threshold: {r.trigger_threshold || '-'}% | Valor: {r.value}%</p>
                </div>
                <Badge className={`border-0 text-xs ${
                  r.rule_type === 'bonus' ? 'bg-emerald-500/10 text-emerald-400' :
                  r.rule_type === 'accelerator' ? 'bg-blue-500/10 text-blue-400' :
                  r.rule_type === 'penalty' ? 'bg-red-500/10 text-red-400' :
                  'bg-gold-500/10 text-gold-400'
                }`}>{r.rule_type}</Badge>
              </div>
            ))}
            {rules.length === 0 && <div className="text-center py-8 text-gray-500">Nenhuma regra configurada</div>}
          </div>
        </div>
      )}

      {/* Payments Sub-tab */}
      {subTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">Calculo e Pagamento</h3>
            <Button size="sm" onClick={() => setShowCalcForm(!showCalcForm)} className="bg-gold-600 hover:bg-gold-500 text-black gap-2 h-8">
              {showCalcForm ? <X size={14} /> : <DollarSign size={14} />} {showCalcForm ? 'Cancelar' : 'Calcular Periodo'}
            </Button>
          </div>
          {showCalcForm && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <form onSubmit={calculateCommissions} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div><Label className="text-gray-400 text-xs">Periodo</Label><Input value={calcForm.period_label} onChange={e => setCalcForm({...calcForm, period_label: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" placeholder="Abril 2026" /></div>
                  <div><Label className="text-gray-400 text-xs">Data Inicio</Label><Input type="date" value={calcForm.start_date} onChange={e => setCalcForm({...calcForm, start_date: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" /></div>
                  <div><Label className="text-gray-400 text-xs">Data Fim</Label><Input type="date" value={calcForm.end_date} onChange={e => setCalcForm({...calcForm, end_date: e.target.value})} required className="bg-zinc-800 border-zinc-700 text-white mt-1" /></div>
                  <div className="flex items-end"><Button type="submit" className="bg-gold-600 hover:bg-gold-500 text-black w-full">Calcular</Button></div>
                </form>
              </CardContent>
            </Card>
          )}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-zinc-800/30 text-gray-500 text-[11px] uppercase tracking-wider">
              <div className="col-span-2">Vendedor</div>
              <div className="col-span-1">Periodo</div>
              <div className="col-span-1">Volume</div>
              <div className="col-span-1">Receita</div>
              <div className="col-span-1">Base</div>
              <div className="col-span-1">Bonus</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-1">Meta</div>
              <div className="col-span-1">Estado</div>
              <div className="col-span-2">Acoes</div>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Nenhuma comissao calculada</div>
            ) : payments.map((p, i) => (
              <div key={p.id} className={`grid grid-cols-12 gap-2 px-5 py-3 items-center text-sm ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
                <div className="col-span-2 text-white truncate">{p.seller_name}</div>
                <div className="col-span-1 text-gray-400 text-xs">{p.period_label}</div>
                <div className="col-span-1 text-gray-400 font-mono text-xs">{formatCurrency(p.volume)}</div>
                <div className="col-span-1 text-gray-400 font-mono text-xs">{formatCurrency(p.revenue)}</div>
                <div className="col-span-1 text-white font-mono text-xs">{formatCurrency(p.base_commission)}</div>
                <div className="col-span-1 text-emerald-400 font-mono text-xs">+{formatCurrency(p.bonuses)}</div>
                <div className="col-span-1 text-gold-400 font-mono text-xs font-bold">{formatCurrency(p.total_commission)}</div>
                <div className="col-span-1 text-gray-400 text-xs">{p.goal_achievement_pct}%</div>
                <div className="col-span-1">
                  <Badge className={`border-0 text-[10px] ${
                    p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                    p.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                    p.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                    'bg-gold-500/10 text-gold-400'
                  }`}>{p.status}</Badge>
                </div>
                <div className="col-span-2 flex gap-1">
                  {p.status === 'pending' && (
                    <>
                      <button onClick={() => updatePaymentStatus(p.id, 'approve')} className="px-2 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20">Aprovar</button>
                      <button onClick={() => updatePaymentStatus(p.id, 'reject')} className="px-2 py-1 text-[10px] bg-red-500/10 text-red-400 rounded hover:bg-red-500/20">Rejeitar</button>
                    </>
                  )}
                  {p.status === 'approved' && (
                    <button onClick={() => updatePaymentStatus(p.id, 'pay')} className="px-2 py-1 text-[10px] bg-gold-500/10 text-gold-400 rounded hover:bg-gold-500/20">Marcar Pago</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Reports Tab ─────────────────────────────────────────────
const ReportsTab = ({ token }) => {
  const [reportType, setReportType] = useState('commissions');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('seller');
  const [auditLogs, setAuditLogs] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/commercial/audit-log?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        setAuditLogs(res.data);
      } catch { /* silent */ }
    };
    fetchAudit();
  }, [token]);

  const generateReport = async (format = 'json') => {
    if (!startDate || !endDate) { toast.error('Selecione as datas'); return; }
    setLoading(true);
    try {
      if (format === 'csv') {
        const url = reportType === 'commissions'
          ? `${API_URL}/api/commercial/reports/commissions?start_date=${startDate}&end_date=${endDate}&format=csv`
          : reportType === 'performance'
          ? `${API_URL}/api/commercial/reports/performance?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}&format=csv`
          : `${API_URL}/api/commercial/reports/deals-audit?start_date=${startDate}&end_date=${endDate}&format=csv`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `relatorio_${reportType}_${startDate}_${endDate}.csv`;
        a.click();
        toast.success('CSV exportado');
      } else {
        const url = reportType === 'commissions'
          ? `${API_URL}/api/commercial/reports/commissions?start_date=${startDate}&end_date=${endDate}`
          : reportType === 'performance'
          ? `${API_URL}/api/commercial/reports/performance?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`
          : `${API_URL}/api/commercial/reports/deals-audit?start_date=${startDate}&end_date=${endDate}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        setReportData(res.data);
      }
    } catch { toast.error('Erro ao gerar relatorio'); }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Report Generator */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-white font-medium">Gerar Relatorio</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Tipo</Label>
              <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 text-white rounded-md mt-1 text-sm">
                <option value="commissions">Comissoes</option>
                <option value="performance">Performance</option>
                <option value="audit">Auditoria Negocios</option>
              </select>
            </div>
            {reportType === 'performance' && (
              <div>
                <Label className="text-gray-400 text-xs">Agrupar por</Label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 text-white rounded-md mt-1 text-sm">
                  <option value="seller">Vendedor</option><option value="product_type">Produto</option><option value="region">Regiao</option>
                </select>
              </div>
            )}
            <div>
              <Label className="text-gray-400 text-xs">Data Inicio</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white mt-1" />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Data Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-white mt-1" />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => generateReport('json')} disabled={loading} className="bg-zinc-700 hover:bg-zinc-600 text-white flex-1">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Ver'}
              </Button>
              <Button onClick={() => generateReport('csv')} disabled={loading} className="bg-gold-600 hover:bg-gold-500 text-black flex-1">CSV</Button>
            </div>
          </div>

          {/* Report Results */}
          {reportData && (
            <div className="mt-4 bg-zinc-800/50 rounded-xl p-4 max-h-[400px] overflow-auto">
              <p className="text-gray-400 text-xs mb-2">{reportData.total || reportData.rows?.length || reportData.commissions?.length || 0} resultados</p>
              <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">{JSON.stringify(reportData, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <div>
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Shield size={16} className="text-gold-400" /> Log de Auditoria
        </h3>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-zinc-800/30 text-gray-500 text-xs uppercase tracking-wider">
            <div className="col-span-2">Data</div>
            <div className="col-span-2">Utilizador</div>
            <div className="col-span-3">Acao</div>
            <div className="col-span-5">Detalhes</div>
          </div>
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Sem registos</div>
          ) : auditLogs.map((l, i) => (
            <div key={l.id} className={`grid grid-cols-12 gap-4 px-5 py-3 items-center text-sm ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}>
              <div className="col-span-2 text-gray-500 text-xs">{l.timestamp?.split('T')[0]} {l.timestamp?.split('T')[1]?.substring(0,5)}</div>
              <div className="col-span-2 text-white text-xs">{l.user_name}</div>
              <div className="col-span-3"><Badge className="bg-zinc-700 text-gray-300 border-0 text-[10px]">{l.action}</Badge></div>
              <div className="col-span-5 text-gray-500 text-xs truncate">{JSON.stringify(l.details).substring(0, 80)}</div>
            </div>
          ))}
        </div>
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
    { key: 'commissions', label: 'Comissoes', icon: DollarSign },
    { key: 'reports', label: 'Relatorios', icon: Briefcase },
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
      {activeTab === 'commissions' && <CommissionsTab token={token} />}
      {activeTab === 'reports' && <ReportsTab token={token} />}
    </div>
  );
};

export default CommercialDashboard;
