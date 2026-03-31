import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, ArrowRight, DollarSign, Send, Ban
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending_approval: { label: 'Approval in Progress', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/30', icon: Clock },
  risk_review: { label: 'Risk Review', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30', icon: ShieldCheck },
  signing: { label: 'A Assinar', color: 'bg-purple-900/40 text-purple-400 border-purple-500/30', icon: ShieldCheck },
  sending: { label: 'A Enviar', color: 'bg-orange-900/40 text-orange-400 border-orange-500/30', icon: Send },
  completed: { label: 'Successful', color: 'bg-green-900/40 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rejeitada', color: 'bg-red-900/40 text-red-400 border-red-500/30', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'bg-zinc-700/40 text-gray-400 border-zinc-600/30', icon: Ban },
};

const ApprovalsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/approvals/transactions?status=${filter}`, { headers });
      setTransactions(res.data.transactions || []);
      setPendingCount(res.data.pending_count || 0);
    } catch (err) {
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter(tx => {
    if (!search) return true;
    const q = search.toLowerCase();
    return tx.order_number?.toLowerCase().includes(q)
      || tx.asset?.toLowerCase().includes(q)
      || tx.destination_name?.toLowerCase().includes(q)
      || tx.created_by_name?.toLowerCase().includes(q);
  });

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return '';
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expirado';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}min`;
  };

  const filters = [
    { key: 'all', label: 'Todas' },
    { key: 'pending_approval', label: 'Pendentes', count: pendingCount },
    { key: 'completed', label: 'Concluídas' },
    { key: 'rejected', label: 'Rejeitadas' },
    { key: 'cancelled', label: 'Canceladas' },
  ];

  return (
    <div className="space-y-6" data-testid="approvals-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <ShieldCheck className="text-indigo-400" size={28} />
            Multi-Sign Approvals
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de aprovação multi-assinatura para transações</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-900/50 text-yellow-400 border border-yellow-500/30 px-4 py-2 text-sm" data-testid="pending-badge">
            <AlertTriangle size={14} className="mr-1" /> {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-1 ${
                filter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-zinc-700'
              }`}
              data-testid={`filter-${f.key}`}
            >
              {f.label}
              {f.count > 0 && <Badge className="bg-yellow-600 text-white text-[10px] ml-1 px-1.5">{f.count}</Badge>}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="bg-zinc-800/50 border-zinc-700 text-white pl-9 text-sm"
            data-testid="search-transactions"
          />
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShieldCheck size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-gray-500">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(tx => {
            const cfg = statusConfig[tx.status] || statusConfig.pending_approval;
            const StatusIcon = cfg.icon;
            const approvedCount = (tx.approvals || []).filter(a => a.status === 'approved').length;

            return (
              <Card
                key={tx.id}
                className="bg-zinc-900/70 border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group"
                onClick={() => navigate(`/dashboard/approvals/${tx.id}`)}
                data-testid={`tx-card-${tx.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        tx.status === 'completed' ? 'bg-green-900/30' :
                        tx.status === 'rejected' ? 'bg-red-900/30' :
                        tx.status === 'cancelled' ? 'bg-zinc-800' :
                        'bg-indigo-900/30'
                      }`}>
                        <Send size={20} className={
                          tx.status === 'completed' ? 'text-green-400' :
                          tx.status === 'rejected' ? 'text-red-400' :
                          tx.status === 'cancelled' ? 'text-gray-500' :
                          'text-indigo-400'
                        } />
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">Send {tx.asset}</span>
                          <span className="text-gray-500 text-xs font-mono">{tx.order_number}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{tx.source_wallet} → {tx.destination_name}</span>
                          <span>por {tx.created_by_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-white font-mono font-medium text-lg">
                          -{new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2 }).format(tx.amount)}
                        </p>
                        <p className="text-gray-500 text-xs">{tx.asset} ({tx.network})</p>
                      </div>

                      {/* Status & Approvals */}
                      <div className="text-right min-w-[140px]">
                        <Badge className={`${cfg.color} border text-xs`} data-testid={`tx-status-${tx.id}`}>
                          <StatusIcon size={12} className="mr-1" /> {cfg.label}
                        </Badge>
                        {tx.status === 'pending_approval' && (
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <div className="flex -space-x-1">
                              {Array.from({ length: tx.required_approvals || 3 }).map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full border border-zinc-900 ${
                                  i < approvedCount ? 'bg-green-500' : 'bg-zinc-700'
                                }`} />
                              ))}
                            </div>
                            <span className="text-gray-500 text-[10px] ml-1">{approvedCount}/{tx.required_approvals}</span>
                          </div>
                        )}
                        {tx.status === 'pending_approval' && (
                          <p className="text-gray-600 text-[10px] mt-0.5 flex items-center justify-end gap-1">
                            <Clock size={10} /> {getTimeRemaining(tx.expires_at)}
                          </p>
                        )}
                      </div>

                      <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
