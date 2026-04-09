import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '../../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { toast } from 'sonner';
import {
  Landmark, RefreshCw, CheckCircle, ArrowDownLeft, ArrowUpRight,
  Link2, Link2Off, Search, UserCheck, Loader2, ExternalLink, Wallet
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CURRENCY_FLAGS = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', CHF: '🇨🇭', PLN: '🇵🇱',
  ZAR: '🇿🇦', AUD: '🇦🇺', CAD: '🇨🇦', USDT: '₮', BTC: '₿',
};

const fmtAmount = (val, cur) => {
  const n = typeof val === 'number' ? val : parseFloat(val) || 0;
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const AdminRevolutPage = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [status, setStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reconciledCount, setReconciledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('accounts');
  const [depositFilter, setDepositFilter] = useState('pending');

  // Reconciliation dialog
  const [showReconcileDialog, setShowReconcileDialog] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/revolut/status`, { headers });
      setStatus(res.data);
    } catch { setStatus({ connected: false, status: 'error' }); }
  }, [token]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/revolut/accounts`, { headers });
      setAccounts(res.data.accounts || []);
    } catch { /* */ }
  }, [token]);

  const fetchDeposits = useCallback(async (filter) => {
    try {
      const res = await axios.get(`${API}/api/revolut/deposits?status=${filter || depositFilter}`, { headers });
      setDeposits(res.data.deposits || []);
      setPendingCount(res.data.pending_count || 0);
      setReconciledCount(res.data.reconciled_count || 0);
    } catch { /* */ }
  }, [token, depositFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchAccounts(), fetchDeposits()]);
    setLoading(false);
  }, [fetchStatus, fetchAccounts, fetchDeposits]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchDeposits(depositFilter); }, [depositFilter]);

  const syncDeposits = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/api/revolut/sync-deposits`, {}, { headers });
      toast.success(`Sincronizado: ${res.data.new_deposits} novos depósitos`);
      fetchDeposits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao sincronizar');
    }
    setSyncing(false);
  };

  const openReconcile = async (deposit) => {
    setSelectedDeposit(deposit);
    setSelectedUserId('');
    setUserSearch('');
    setShowReconcileDialog(true);
    try {
      const res = await axios.get(`${API}/api/admin/users`, { headers });
      const allUsers = res.data.users || res.data || [];
      setUsers(allUsers.filter(u => u.role === 'client' || !u.is_admin));
    } catch { setUsers([]); }
  };

  const doReconcile = async () => {
    if (!selectedDeposit || !selectedUserId) return;
    setReconciling(true);
    try {
      const res = await axios.post(
        `${API}/api/revolut/deposits/${selectedDeposit.transaction_id}/reconcile`,
        { user_id: selectedUserId },
        { headers }
      );
      toast.success(res.data.message);
      setShowReconcileDialog(false);
      fetchDeposits();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro na reconciliação');
    }
    setReconciling(false);
  };

  const totalBalance = accounts.reduce((sum, a) => {
    if (a.currency === 'EUR') return sum + (a.balance || 0);
    return sum;
  }, 0);

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-revolut-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Landmark className="text-gold-400" />
            Contas Bancárias — Revolut Business
          </h1>
          <p className="text-gray-400 text-sm mt-1">Saldos, depósitos e reconciliação automática</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchAll}>
            <RefreshCw size={14} className="mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${status?.connected ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-red-900/10 border-red-800/30'}`}>
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <><Link2 size={16} className="text-emerald-400" /><span className="text-emerald-400 text-sm font-medium">Revolut Business Conectado</span></>
          ) : (
            <><Link2Off size={16} className="text-red-400" /><span className="text-red-400 text-sm">Não conectado</span>
              {status?.auth_url && <a href={status.auth_url} target="_blank" rel="noreferrer" className="text-gold-400 underline text-sm ml-2">Autorizar</a>}
            </>
          )}
        </div>
        {status?.webhook ? (
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs">Webhook ativo</span>
          </div>
        ) : status?.connected ? (
          <span className="text-amber-400 text-xs">Webhook não configurado</span>
        ) : null}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs uppercase">Saldo EUR</p>
            <p className="text-2xl font-bold text-white mt-1">€ {fmtAmount(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs uppercase">Contas Ativas</p>
            <p className="text-2xl font-bold text-gold-400 mt-1">{accounts.filter(a => a.state === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/10 border-amber-800/20">
          <CardContent className="p-4">
            <p className="text-amber-400 text-xs uppercase">Depósitos Pendentes</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-900/10 border-emerald-800/20">
          <CardContent className="p-4">
            <p className="text-emerald-400 text-xs uppercase">Reconciliados</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{reconciledCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/30 p-1 rounded-lg w-fit">
        {[
          { key: 'accounts', label: 'Contas', count: accounts.length },
          { key: 'deposits', label: 'Depósitos', count: pendingCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-gold-500/20 text-gold-400' : 'text-gray-400 hover:text-white'}`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.filter(a => a.state === 'active').map(account => (
            <Card key={account.id} className="bg-zinc-900/50 border-zinc-800 hover:border-gold-800/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CURRENCY_FLAGS[account.currency] || '💱'}</span>
                    <span className="text-white font-medium">{account.currency}</span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">Ativa</Badge>
                </div>
                <p className="text-2xl font-bold text-white font-mono">
                  {fmtAmount(account.balance)} <span className="text-sm text-gray-400 font-sans">{account.currency}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {account.name} • Atualizado {new Date(account.updated_at).toLocaleDateString('pt-PT')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-zinc-900/30 p-1 rounded-lg">
              {['pending', 'reconciled', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setDepositFilter(f)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${depositFilter === f ? 'bg-gold-500/20 text-gold-400' : 'text-gray-400 hover:text-white'}`}
                >
                  {f === 'pending' ? 'Pendentes' : f === 'reconciled' ? 'Reconciliados' : 'Todos'}
                </button>
              ))}
            </div>
            <Button onClick={syncDeposits} disabled={syncing} size="sm" className="bg-gold-600 hover:bg-gold-500 text-black">
              {syncing ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
              Sincronizar Depósitos
            </Button>
          </div>

          {deposits.length > 0 ? (
            <div className="space-y-2">
              {deposits.map((dep, i) => (
                <Card key={dep.transaction_id || i} className={`border-zinc-800 ${dep.reconciled ? 'bg-emerald-900/5' : 'bg-zinc-900/50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dep.reconciled ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                          <ArrowDownLeft size={18} className={dep.reconciled ? 'text-emerald-400' : 'text-amber-400'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">
                              +{fmtAmount(dep.amount)} {dep.currency}
                            </p>
                            {dep.reconciled ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                                <CheckCircle size={10} className="mr-1" /> Reconciliado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">Pendente</Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {dep.counterparty_name || dep.reference || 'Transferência recebida'}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {dep.created_at ? new Date(dep.created_at).toLocaleString('pt-PT') : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {dep.reconciled ? (
                          <div className="text-xs text-gray-400">
                            <p className="text-emerald-400">{dep.reconciled_to_name}</p>
                            <p>{dep.reconciled_to_email}</p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => openReconcile(dep)}
                            size="sm"
                            className="bg-gold-600 hover:bg-gold-500 text-black"
                            data-testid={`reconcile-${dep.transaction_id}`}
                          >
                            <UserCheck size={14} className="mr-1" /> Reconciliar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
                <h3 className="text-lg text-white mb-2">Sem depósitos {depositFilter === 'pending' ? 'pendentes' : ''}</h3>
                <p className="text-gray-400 text-sm">
                  Clique em "Sincronizar Depósitos" para verificar novos depósitos na Revolut.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Reconciliation Dialog */}
      <Dialog open={showReconcileDialog} onOpenChange={setShowReconcileDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <UserCheck size={20} /> Reconciliar Depósito
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Atribuir este depósito à carteira fiat de um cliente
            </DialogDescription>
          </DialogHeader>

          {selectedDeposit && (
            <div className="space-y-4 py-2">
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Montante</span>
                  <span className="text-white font-bold text-lg">
                    +{fmtAmount(selectedDeposit.amount)} {selectedDeposit.currency}
                  </span>
                </div>
                {selectedDeposit.counterparty_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">De</span>
                    <span className="text-white">{selectedDeposit.counterparty_name}</span>
                  </div>
                )}
                {selectedDeposit.reference && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Referência</span>
                    <span className="text-white text-sm">{selectedDeposit.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Data</span>
                  <span className="text-white text-sm">
                    {selectedDeposit.created_at ? new Date(selectedDeposit.created_at).toLocaleString('pt-PT') : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-300 text-sm">Selecionar Cliente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Pesquisar por nome ou email..."
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-800 rounded-lg p-1">
                  {filteredUsers.length > 0 ? filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedUserId === u.id
                          ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                          : 'text-gray-300 hover:bg-zinc-800'
                      }`}
                    >
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </button>
                  )) : (
                    <p className="text-gray-500 text-sm text-center py-4">Nenhum cliente encontrado</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconcileDialog(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button
              onClick={doReconcile}
              disabled={!selectedUserId || reconciling}
              className="bg-gold-600 hover:bg-gold-500 text-black"
            >
              {reconciling ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />}
              Confirmar Reconciliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRevolutPage;
