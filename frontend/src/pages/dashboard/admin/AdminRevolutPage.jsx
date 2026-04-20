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
  AED: '🇦🇪', HKD: '🇭🇰', QAR: '🇶🇦', SAR: '🇸🇦', BRL: '🇧🇷',
  JPY: '🇯🇵', SGD: '🇸🇬', SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰',
};

const fmtAmount = (val, cur) => {
  const n = typeof val === 'number' ? val : parseFloat(val) || 0;
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtAgeSec = (seconds) => {
  if (seconds == null) return '—';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const fmtAge = (isoOrSec) => {
  if (!isoOrSec) return '—';
  let ts;
  if (typeof isoOrSec === 'string' && isoOrSec.includes('T')) {
    ts = Date.parse(isoOrSec);
  } else {
    ts = Number(isoOrSec) * 1000;
  }
  if (!ts || Number.isNaN(ts)) return '—';
  const diff = (Date.now() - ts) / 1000;
  return `${fmtAgeSec(diff)} atrás`;
};

const AdminRevolutPage = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [status, setStatus] = useState(null);
  const [health, setHealth] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [reconciledCount, setReconciledCount] = useState(0);
  const [autoReconciledCount, setAutoReconciledCount] = useState(0);
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
  const [syncingBankDetails, setSyncingBankDetails] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/revolut/status`, { headers });
      setStatus(res.data);
    } catch { setStatus({ connected: false, status: 'error' }); }
  }, [token]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/revolut/health`, { headers });
      setHealth(res.data);
    } catch { /* ignore */ }
  }, [token]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/revolut/accounts`, { headers });
      setAccounts(res.data.accounts || []);
    } catch (err) { console.error('Failed to fetch Revolut accounts', err); }
  }, [token]);

  const fetchDeposits = useCallback(async (filter) => {
    try {
      const res = await axios.get(`${API}/api/revolut/deposits?status=${filter || depositFilter}`, { headers });
      const deps = res.data.deposits || [];
      setDeposits(deps);
      setPendingCount(res.data.pending_count || 0);
      setReconciledCount(res.data.reconciled_count || 0);
      setAutoReconciledCount(deps.filter(d => d.auto_reconciled).length);
    } catch (err) { console.error('Failed to fetch deposits', err); }
  }, [token, depositFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchAccounts(), fetchDeposits(), fetchHealth()]);
    setLoading(false);
  }, [fetchStatus, fetchAccounts, fetchDeposits, fetchHealth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchDeposits(depositFilter); }, [depositFilter]);

  const syncDeposits = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/api/revolut/sync-deposits`, {}, { headers });
      const { new_deposits, auto_reconciled, auto_reconciled_details } = res.data;
      if (auto_reconciled > 0) {
        const names = (auto_reconciled_details || []).map(d => `${d.currency} ${d.amount?.toLocaleString('pt-PT')} → ${d.user_name}`).join(', ');
        toast.success(`${new_deposits} novos depósitos. ${auto_reconciled} reconciliados automaticamente: ${names}`);
      } else {
        toast.success(`Sincronizado: ${new_deposits} novos depósitos`);
      }
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

  // Group accounts: "Main" → Tesouraria & Onboarding, "kbex" → Conciliação de Clientes
  const treasuryAccounts = accounts.filter(a => a.state === 'active' && (a.name || '').toLowerCase().includes('main'));
  const clientAccounts = accounts.filter(a => a.state === 'active' && (a.name || '').toLowerCase().includes('kbex'));
  const otherAccounts = accounts.filter(a => a.state === 'active' && !(a.name || '').toLowerCase().includes('main') && !(a.name || '').toLowerCase().includes('kbex'));

  const treasuryBalanceEUR = treasuryAccounts.reduce((sum, a) => a.currency === 'EUR' ? sum + (a.balance || 0) : sum, 0);
  const clientBalanceEUR = clientAccounts.reduce((sum, a) => a.currency === 'EUR' ? sum + (a.balance || 0) : sum, 0);
  const totalBalance = accounts.reduce((sum, a) => a.currency === 'EUR' ? sum + (a.balance || 0) : sum, 0);

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

  const syncBankDetails = async () => {
    setSyncingBankDetails(true);
    try {
      const res = await axios.post(`${API}/api/revolut/sync-bank-details`, {}, { headers });
      toast.success(`Dados bancários sincronizados: ${res.data.synced} contas`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao sincronizar dados bancários');
    }
    setSyncingBankDetails(false);
  };

  return (
    <div className="space-y-8" data-testid="admin-revolut-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Landmark className="text-gold-400" />
            Contas Bancárias
          </h1>
          <p className="text-gray-400 text-sm mt-1">Saldos, depósitos e reconciliação automática</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-zinc-700" onClick={syncBankDetails} disabled={syncingBankDetails}>
            {syncingBankDetails ? <Loader2 size={14} className="animate-spin mr-2" /> : <Landmark size={14} className="mr-2" />}
            Sincronizar IBAN
          </Button>
          <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchAll}>
            <RefreshCw size={14} className="mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${status?.connected ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-red-900/10 border-red-800/30'}`}>
        <div className="flex items-center gap-3">
          {status?.connected ? (
            <><Link2 size={16} className="text-emerald-400" /><span className="text-emerald-400 text-sm font-medium">Contas Conectadas</span></>
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
            {health?.webhook_signed && (
              <span className="text-emerald-400/80 text-[10px] border border-emerald-800/40 rounded px-1.5 py-0.5 ml-1">
                HMAC
              </span>
            )}
          </div>
        ) : status?.connected ? (
          <span className="text-amber-400 text-xs">Webhook não configurado</span>
        ) : null}
      </div>

      {/* Health Monitor */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Auto-Sync</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${health.background_sync?.running ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
              <span className="text-sm text-white">
                {health.background_sync?.running ? `A cada ${Math.round((health.background_sync?.interval_s || 0) / 60)}min` : 'Parado'}
              </span>
            </div>
            {health.background_sync?.last_run_at && (
              <div className="text-[11px] text-zinc-500 mt-1">
                Última: {fmtAge(health.background_sync.last_run_at)}
              </div>
            )}
            {health.background_sync?.last_error && (
              <div className="text-[11px] text-red-400 mt-1 truncate" title={health.background_sync.last_error}>
                Erro: {health.background_sync.last_error}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Webhook Signed</div>
            <div className="flex items-center gap-2">
              {health.webhook_signed ? (
                <><CheckCircle size={14} className="text-emerald-400" /><span className="text-sm text-emerald-400">Ativo (HMAC-SHA256)</span></>
              ) : (
                <><Link2Off size={14} className="text-amber-400" /><span className="text-sm text-amber-400">Sem signing_secret</span></>
              )}
            </div>
            {health.last_webhook_rejection?.reason && (
              <div className="text-[11px] text-amber-400 mt-1">
                Última rejeição: {fmtAge(`${Date.now() / 1000 - (health.last_webhook_rejection.age_seconds || 0)}`)}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Último Depósito</div>
            <div className="text-sm text-white">
              {health.last_deposit?.amount != null ? `${health.last_deposit.currency} ${health.last_deposit.amount.toLocaleString('pt-PT')}` : '—'}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {health.last_deposit?.age_seconds != null ? `${fmtAgeSec(health.last_deposit.age_seconds)} atrás` : 'Sem dados'}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Última Reconciliação</div>
            <div className="text-sm text-white capitalize">
              {health.last_reconciliation?.event ? health.last_reconciliation.event.replace('_', ' ') : 'Nenhuma'}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {health.last_reconciliation?.age_seconds != null ? `${fmtAgeSec(health.last_reconciliation.age_seconds)} atrás` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs uppercase">Saldo Total EUR</p>
            <p className="text-2xl font-bold text-white mt-1">€ {fmtAmount(totalBalance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/10 border-blue-800/20">
          <CardContent className="p-4">
            <p className="text-blue-400 text-xs uppercase">Tesouraria EUR</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">€ {fmtAmount(treasuryBalanceEUR)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gold-900/10 border-gold-800/20">
          <CardContent className="p-4">
            <p className="text-gold-400 text-xs uppercase">Clientes EUR</p>
            <p className="text-2xl font-bold text-gold-400 mt-1">€ {fmtAmount(clientBalanceEUR)}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/10 border-amber-800/20">
          <CardContent className="p-4">
            <p className="text-amber-400 text-xs uppercase">Dep. Pendentes</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-900/10 border-emerald-800/20">
          <CardContent className="p-4">
            <p className="text-emerald-400 text-xs uppercase">Reconciliados</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{reconciledCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-900/10 border-blue-800/20">
          <CardContent className="p-4">
            <p className="text-blue-400 text-xs uppercase">Auto-Reconciliados</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{autoReconciledCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/30 p-1 rounded-lg w-fit">
        {[
          { key: 'accounts', label: 'Contas', count: treasuryAccounts.length + clientAccounts.length },
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
        <div className="space-y-12">
          {/* Tesouraria & Onboarding (Main) */}
          {treasuryAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-8 bg-blue-500 rounded-full" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Tesouraria & Onboarding</h2>
                  <p className="text-xs text-gray-400">Contas "Main" — Receitas e depósitos de onboarding</p>
                </div>
                <Badge className="bg-blue-500/15 text-blue-400 border-0 ml-auto">{treasuryAccounts.length} contas</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {treasuryAccounts.map(account => (
                  <Card key={account.id} className="bg-zinc-900/50 border-blue-800/20 hover:border-blue-500/40 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CURRENCY_FLAGS[account.currency] || '💱'}</span>
                          <span className="text-white font-medium">{account.currency}</span>
                        </div>
                        <Badge className="bg-blue-500/15 text-blue-400 border-0 text-[10px]">Tesouraria</Badge>
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
            </div>
          )}

          {/* Conciliação de Clientes (kbex) */}
          {clientAccounts.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-8 bg-gold-500 rounded-full" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Conciliação de Clientes</h2>
                  <p className="text-xs text-gray-400">Contas "kbex" — Depósitos e reconciliação de clientes</p>
                </div>
                <Badge className="bg-gold-500/15 text-gold-400 border-0 ml-auto">{clientAccounts.length} contas</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientAccounts.map(account => (
                  <Card key={account.id} className="bg-zinc-900/50 border-gold-800/20 hover:border-gold-500/40 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CURRENCY_FLAGS[account.currency] || '💱'}</span>
                          <span className="text-white font-medium">{account.currency}</span>
                        </div>
                        <Badge className="bg-gold-500/15 text-gold-400 border-0 text-[10px]">Clientes</Badge>
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
            </div>
          )}

          {accounts.filter(a => a.state === 'active').length === 0 && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Landmark className="mx-auto mb-4 text-gray-500" size={48} />
                <h3 className="text-lg text-white mb-2">Sem contas ativas</h3>
                <p className="text-gray-400 text-sm">Conecte a sua conta Revolut Business para ver os saldos.</p>
              </CardContent>
            </Card>
          )}
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
                              dep.auto_reconciled ? (
                                <Badge className="bg-blue-500/15 text-blue-400 border-0 text-[10px]" data-testid={`badge-auto-${dep.transaction_id}`}>
                                  <CheckCircle size={10} className="mr-1" /> Auto
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                                  <CheckCircle size={10} className="mr-1" /> Manual
                                </Badge>
                              )
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px]">Pendente</Badge>
                            )}
                            {dep.matched_reference_code && (
                              <Badge className="bg-violet-500/15 text-violet-400 border-0 text-[10px] font-mono">
                                {dep.matched_reference_code}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">
                            {dep.counterparty_name || dep.reference || 'Transferência recebida'}
                          </p>
                          {dep.reference && dep.reference !== dep.counterparty_name && (
                            <p className="text-gray-500 text-xs mt-0.5 font-mono">
                              Ref: {dep.reference}
                            </p>
                          )}
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
                            {dep.reconciled_at && (
                              <p className="text-gray-500 mt-0.5">{new Date(dep.reconciled_at).toLocaleString('pt-PT')}</p>
                            )}
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
