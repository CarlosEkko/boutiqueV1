import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  ShieldCheck, Clock, CheckCircle, XCircle, Plus, Search,
  Send, ArrowRight, AlertTriangle, Users, Lock, Wallet, Ban
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusCfg = {
  pending_signatures: { label: 'Awaiting Signatures', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  completed: { label: 'Executed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: Ban },
};

const VaultDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [txs, setTxs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, txRes] = await Promise.all([
        axios.get(`${API_URL}/api/vault/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/vault/transactions?status=${filter}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(dashRes.data);
      setTxs(txRes.data.transactions || []);
    } catch { toast.error('Erro ao carregar vault'); }
    finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = txs.filter(tx => {
    if (!search) return true;
    const q = search.toLowerCase();
    return tx.order_number?.toLowerCase().includes(q) || tx.asset?.toLowerCase().includes(q) || tx.destination_name?.toLowerCase().includes(q);
  });

  const getTimeLeft = (exp) => {
    if (!exp) return '';
    const d = new Date(exp) - Date.now();
    if (d <= 0) return 'Expired';
    return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
  };

  return (
    <div className="space-y-10" data-testid="vault-dashboard">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800/80 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-zinc-50 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShieldCheck size={22} className="text-amber-400" />
              </div>
              Vault Multi-Sign
            </h1>
            <p className="text-zinc-400 text-sm mt-2 max-w-md">Proteja os seus ativos com assinaturas múltiplas. Cada transação requer aprovação dos seus signatários autorizados.</p>
          </div>
          <Button onClick={() => navigate('/dashboard/vault/new')} className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full px-6 shadow-[0_0_20px_rgba(245,158,11,0.15)]" data-testid="new-vault-tx-btn">
            <Plus size={18} className="mr-2" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mt-2">
          <StatCard icon={AlertTriangle} iconColor="text-amber-400" label="Pendentes" value={stats.pending_signatures} accent="amber" />
          <StatCard icon={CheckCircle} iconColor="text-emerald-400" label="Executadas" value={stats.completed} accent="emerald" />
          <StatCard icon={Users} iconColor="text-blue-400" label="Signatários" value={stats.signatories_count} accent="blue" extra={<span className="text-zinc-500 text-[10px]">Threshold: {stats.threshold}</span>} />
          <StatCard icon={Lock} iconColor="text-amber-400" label="Total Protegido" value={`$${new Intl.NumberFormat('pt-PT').format(stats.total_secured_value)}`} accent="amber" isLarge />
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 p-1 bg-zinc-900/70 rounded-full border border-zinc-800/50">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending_signatures', label: 'Pendentes' },
            { key: 'completed', label: 'Executadas' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} data-testid={`vault-filter-${f.key}`}
              className={`px-5 py-2 rounded-full text-sm transition-all ${filter === f.key ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar transações..."
            className="bg-zinc-900/50 border-zinc-800 text-white pl-9 text-sm rounded-full" data-testid="vault-search" />
        </div>
      </div>

      {/* Transactions */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <ShieldCheck size={36} className="text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-sm">Nenhuma transação encontrada</p>
          <Button onClick={() => navigate('/dashboard/vault/new')} variant="outline" className="mt-4 border-amber-500/30 text-amber-400 rounded-full">
            <Plus size={16} className="mr-1" /> Criar primeira transação
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tx => {
            const cfg = statusCfg[tx.status] || statusCfg.pending_signatures;
            const Icon = cfg.icon;
            const signedCount = (tx.signatures || []).filter(s => s.status === 'signed').length;
            const canSign = tx.status === 'pending_signatures' && tx.signatures?.some(
              s => (s.user_id === user?.id || s.email?.toLowerCase() === user?.email?.toLowerCase()) && s.status === 'pending'
            );

            return (
              <div key={tx.id} onClick={() => navigate(`/dashboard/vault/${tx.id}`)}
                className={`group relative rounded-xl bg-zinc-900 border transition-all duration-300 cursor-pointer hover:-translate-y-0.5 ${
                  canSign ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'border-zinc-800/50 hover:border-zinc-700'
                }`} data-testid={`vault-tx-${tx.id}`}>
                {canSign && <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />}
                <div className="relative p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      tx.status === 'completed' ? 'bg-emerald-500/10' : tx.status === 'rejected' ? 'bg-rose-500/10' : 'bg-amber-500/10'
                    }`}>
                      <Send size={20} className={tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-50 font-medium">Send {tx.asset}</span>
                        <span className="text-zinc-600 text-xs font-mono">{tx.order_number}</span>
                        {canSign && <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px]">Requer sua assinatura</Badge>}
                      </div>
                      <p className="text-zinc-500 text-xs mt-0.5">{tx.source_wallet} → {tx.destination_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-zinc-50 font-mono text-lg font-light tracking-tight">-{new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2 }).format(tx.amount)}</span>
                    <div className="text-right min-w-[120px]">
                      <Badge className={`${cfg.color} border rounded-full text-xs`}><Icon size={12} className="mr-1" />{cfg.label}</Badge>
                      {tx.status === 'pending_signatures' && (
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          {(tx.signatures || []).map((s, i) => (
                            <div key={s.user_id || s.name || i} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                              s.status === 'signed' ? 'bg-emerald-500 border-emerald-400 text-white' :
                              s.status === 'rejected' ? 'bg-rose-500 border-rose-400 text-white' :
                              'bg-zinc-800 border-zinc-600 text-zinc-400'
                            }`} title={`${s.name}: ${s.status}`}>
                              {s.name?.charAt(0)?.toUpperCase()}
                            </div>
                          ))}
                          <span className="text-zinc-600 text-[10px] ml-1">{signedCount}/{tx.required_signatures}</span>
                        </div>
                      )}
                    </div>
                    <ArrowRight size={16} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, iconColor, label, value, accent, extra, isLarge }) => (
  <Card className="bg-zinc-900 border-zinc-800/50 hover:-translate-y-0.5 transition-all duration-300">
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
        <Icon size={16} className={iconColor} />
      </div>
      <p className={`${isLarge ? 'text-xl' : 'text-2xl'} font-mono font-light text-zinc-50 tracking-tight`}>{value}</p>
      {extra && <div className="mt-1">{extra}</div>}
    </CardContent>
  </Card>
);

export default VaultDashboard;
