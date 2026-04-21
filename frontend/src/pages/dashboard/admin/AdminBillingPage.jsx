import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import {
  Loader2, RefreshCw, CalendarClock, AlertCircle, Ban, Clock,
  Save, Play, Mail, TrendingUp, Euro, UserX, UserCheck, Info, History,
  Shield, Vault, Copy, Check, Activity, Percent, Bitcoin, Landmark,
  AlertTriangle, ShieldAlert, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TIERS = [
  { id: 'broker', label: 'Broker' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
  { id: 'vip', label: 'VIP' },
  { id: 'institucional', label: 'Institucional' },
];

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-PT'); } catch { return iso.slice(0, 10); }
};

const daysUntil = (iso) => {
  if (!iso) return null;
  try {
    const d = Math.floor((new Date(iso) - Date.now()) / (1000 * 60 * 60 * 24));
    return d;
  } catch { return null; }
};

const AdminBillingPage = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  const [config, setConfig] = useState(null);
  const [annualFee, setAnnualFee] = useState(null);
  const [renewals, setRenewals] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [cycleStatus, setCycleStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingFee, setSavingFee] = useState(false);
  const [runningCycle, setRunningCycle] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [historyDialog, setHistoryDialog] = useState({ open: false, user: null, data: null, loading: false });
  const [vault, setVault] = useState(null);
  const [vaultBusy, setVaultBusy] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(null);
  const [health, setHealth] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, ren, pay, cyc, v, hlt] = await Promise.all([
        axios.get(`${API_URL}/api/billing/config`, { headers }),
        axios.get(`${API_URL}/api/billing/renewals`, { headers }),
        axios.get(`${API_URL}/api/billing/payouts`, { headers }),
        axios.get(`${API_URL}/api/billing/cycle-status`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/billing/vault`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/billing/renewals-health`, { headers }).catch(() => ({ data: null })),
      ]);
      setConfig(cfg.data);
      setAnnualFee(cfg.data.annual_fee);
      setRenewals(ren.data);
      setPayouts(pay.data);
      setCycleStatus(cyc.data);
      setVault(v.data);
      setHealth(hlt.data);
    } catch (err) {
      toast.error('Falha ao carregar configuração');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchAll();
    // eslint-disable-next-line
  }, [token]);

  const saveAnnualFee = async () => {
    setSavingFee(true);
    try {
      await axios.put(`${API_URL}/api/billing/annual-fee`, { config: annualFee }, { headers });
      toast.success('Taxa anual guardada');
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao guardar');
    } finally {
      setSavingFee(false);
    }
  };

  const runCycleNow = async () => {
    setRunningCycle(true);
    try {
      const res = await axios.post(`${API_URL}/api/billing/run-cycle`, {}, { headers });
      const r = res.data.result || {};
      toast.success(`Ciclo executado: ${r.created_payments || 0} pendentes, ${r.suspended || 0} suspensos`);
      await fetchAll();
    } catch (err) {
      toast.error('Falha ao correr ciclo');
    } finally {
      setRunningCycle(false);
    }
  };

  const setupVault = async () => {
    if (!window.confirm('Criar vault "KBEX OnBoarding" de custódia institucional? Esta operação é idempotente.')) return;
    setVaultBusy(true);
    try {
      const res = await axios.post(`${API_URL}/api/billing/vault/setup`, {}, { headers });
      toast.success(res.data.already_existed ? 'Vault existente — endereços sincronizados' : 'Vault KBEX OnBoarding criado');
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao criar vault');
    } finally {
      setVaultBusy(false);
    }
  };

  const refreshVault = async () => {
    setVaultBusy(true);
    try {
      await axios.post(`${API_URL}/api/billing/vault/refresh-addresses`, {}, { headers });
      toast.success('Endereços re-sincronizados');
      await fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao sincronizar');
    } finally {
      setVaultBusy(false);
    }
  };

  const copyAddr = (addr, label) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(label);
    setTimeout(() => setCopiedAddr(null), 1500);
    toast.success('Copiado');
  };

  const openHistory = async (user) => {
    setHistoryDialog({ open: true, user, data: null, loading: true });
    try {
      const res = await axios.get(`${API_URL}/api/billing/users/${user.id}/history`, { headers });
      setHistoryDialog({ open: true, user, data: res.data, loading: false });
    } catch {
      toast.error('Falha ao carregar histórico');
      setHistoryDialog({ open: true, user, data: null, loading: false });
    }
  };

  const toggleSuspension = async (userId, currentlySuspended) => {
    const path = currentlySuspended ? 'unsuspend' : 'suspend';
    if (!window.confirm(currentlySuspended ? 'Reativar esta conta?' : 'Suspender esta conta?')) return;
    try {
      await axios.post(`${API_URL}/api/billing/users/${userId}/${path}`,
        { reason: currentlySuspended ? null : 'manual_admin' },
        { headers });
      toast.success(currentlySuspended ? 'Conta reativada' : 'Conta suspensa');
      await fetchAll();
    } catch {
      toast.error('Falha');
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  const counts = renewals?.counts || {};
  const tabData = {
    upcoming: renewals?.upcoming || [],
    pending: renewals?.pending || [],
    overdue: renewals?.overdue || [],
    suspended: renewals?.suspended || [],
  };
  const rows = tabData[activeTab] || [];

  return (
    <div className="space-y-6" data-testid="admin-billing-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-400/80 mb-2">
            <CalendarClock size={14} />
            <span>Cobrança & Renovações</span>
          </div>
          <h1 className="text-3xl font-light text-white">Billing</h1>
          <p className="text-zinc-500 text-sm mt-1">Taxa anual, comissões da equipa e ciclo automático de renovação.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchAll} className="border-zinc-700 text-zinc-300">
            <RefreshCw size={14} className="mr-1.5" /> Atualizar
          </Button>
          <Button
            onClick={runCycleNow}
            disabled={runningCycle}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="run-cycle-btn"
          >
            {runningCycle ? <Loader2 className="animate-spin mr-1.5" size={14} /> : <Play size={14} className="mr-1.5" />}
            Correr Ciclo Agora
          </Button>
        </div>
      </div>

      {/* Cycle status strip */}
      {cycleStatus && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cycleStatus.running ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-zinc-400">Auto-cycle:</span>
            <span className="text-white">
              {cycleStatus.running ? `A cada ${Math.round((cycleStatus.interval_s || 0) / 3600)}h` : 'Parado'}
            </span>
          </div>
          {cycleStatus.last_run_at && (
            <div>
              <span className="text-zinc-500">Última execução:</span>
              <span className="text-zinc-300 ml-1.5">{fmtDate(cycleStatus.last_run_at)}</span>
            </div>
          )}
          {cycleStatus.last_result && (
            <div className="text-zinc-500">
              Último: criados {cycleStatus.last_result.created_payments || 0} ·
              notificados {cycleStatus.last_result.notified_clients || 0} ·
              suspensos {cycleStatus.last_result.suspended || 0}
            </div>
          )}
          {cycleStatus.last_error && (
            <div className="text-red-400">Erro: {cycleStatus.last_error}</div>
          )}
        </div>
      )}

      {/* Renewals Health — KPI panel */}
      {health && <RenewalsHealthPanel health={health} />}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<Clock size={14} />} label="Próximas" value={counts.upcoming || 0} accent="sky" onClick={() => setActiveTab('upcoming')} active={activeTab === 'upcoming'} />
        <KpiCard icon={<Mail size={14} />} label="Pendentes" value={counts.pending || 0} accent="amber" onClick={() => setActiveTab('pending')} active={activeTab === 'pending'} />
        <KpiCard icon={<AlertCircle size={14} />} label="Em Atraso" value={counts.overdue || 0} accent="red" onClick={() => setActiveTab('overdue')} active={activeTab === 'overdue'} />
        <KpiCard icon={<Ban size={14} />} label="Suspensos" value={counts.suspended || 0} accent="zinc" onClick={() => setActiveTab('suspended')} active={activeTab === 'suspended'} />
      </div>

      {/* Renewal table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/70 border-b border-zinc-800">
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest">
                  <th className="p-3 text-left">{activeTab === 'pending' ? 'Cliente' : 'Nome'}</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Tier</th>
                  <th className="p-3 text-left">{activeTab === 'pending' ? 'Montante' : 'Próxima Renovação'}</th>
                  <th className="p-3 text-left">{activeTab === 'pending' ? 'Criado' : 'Estado'}</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">Sem registos nesta categoria.</td>
                  </tr>
                )}
                {rows.map((r, idx) => {
                  const isPending = activeTab === 'pending';
                  const name = r.user_name || r.name;
                  const email = r.user_email || r.email;
                  const tier = r.membership_level || '—';
                  const due = r.annual_fee_next_due;
                  const days = daysUntil(due);
                  return (
                    <tr key={idx} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors" data-testid={`renewal-row-${idx}`}>
                      <td className="p-3 text-zinc-200">{name}</td>
                      <td className="p-3 text-zinc-400">{email}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300 capitalize">{tier}</Badge>
                      </td>
                      <td className="p-3 text-zinc-300 tabular-nums">
                        {isPending
                          ? <><Euro size={12} className="inline mr-1" />{(r.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</>
                          : <>{fmtDate(due)} {days != null && <span className={`ml-2 text-xs ${days < 0 ? 'text-red-400' : days < 7 ? 'text-amber-400' : 'text-zinc-500'}`}>({days >= 0 ? `em ${days}d` : `há ${-days}d`})</span>}</>
                        }
                      </td>
                      <td className="p-3 text-zinc-400">
                        {isPending
                          ? fmtDate(r.created_at)
                          : (r.billing_status === 'suspended'
                              ? <Badge className="bg-red-500/10 border border-red-500/30 text-red-400">Suspenso</Badge>
                              : r.billing_status === 'overdue'
                                ? <Badge className="bg-amber-500/10 border border-amber-500/30 text-amber-400">Em atraso</Badge>
                                : <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Ativo</Badge>)
                        }
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab !== 'pending' && r.id && (
                            <Button size="sm" variant="ghost" onClick={() => openHistory(r)} className="text-zinc-400 hover:bg-zinc-800 hover:text-white" data-testid={`history-btn-${idx}`}>
                              <History size={12} className="mr-1" /> Histórico
                            </Button>
                          )}
                          {activeTab === 'suspended' ? (
                            <Button size="sm" variant="outline" onClick={() => toggleSuspension(r.id, true)} className="border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/20" data-testid={`unsuspend-btn-${idx}`}>
                              <UserCheck size={12} className="mr-1" /> Reativar
                            </Button>
                          ) : activeTab !== 'pending' ? (
                            <Button size="sm" variant="ghost" onClick={() => toggleSuspension(r.id, false)} className="text-red-400 hover:bg-red-900/20" data-testid={`suspend-btn-${idx}`}>
                              <UserX size={12} className="mr-1" /> Suspender
                            </Button>
                          ) : (
                            <span className="text-zinc-600 text-xs">aguarda aprovação</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Institutional Custody Vault */}
      <Card className="bg-zinc-900/50 border-zinc-800" data-testid="billing-vault-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-950/40 ring-1 ring-gold-500/30 flex items-center justify-center">
                <Vault size={18} className="text-gold-400" />
              </div>
              <div>
                <h2 className="text-white font-medium flex items-center gap-2">
                  KBEX OnBoarding Vault
                  <Shield size={12} className="text-emerald-400" />
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Custódia institucional para Taxa de Admissão + Renovações Anuais (BTC / ETH / USDT / USDC)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {vault?.configured ? (
                <Button size="sm" variant="outline" onClick={refreshVault} disabled={vaultBusy} className="border-zinc-700 text-zinc-300" data-testid="vault-refresh-btn">
                  {vaultBusy ? <Loader2 className="animate-spin mr-1.5" size={12} /> : <RefreshCw size={12} className="mr-1.5" />}
                  Sincronizar
                </Button>
              ) : (
                <Button size="sm" onClick={setupVault} disabled={vaultBusy} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="vault-setup-btn">
                  {vaultBusy ? <Loader2 className="animate-spin mr-1.5" size={12} /> : <Vault size={12} className="mr-1.5" />}
                  Criar Vault
                </Button>
              )}
            </div>
          </div>

          {!vault?.configured ? (
            <div className="rounded-md border border-amber-800/40 bg-amber-950/20 p-3 flex gap-2 text-xs text-amber-200/80">
              <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                Vault não configurado. Os endereços de checkout estão a usar o fallback manual em
                <code className="mx-1 text-amber-300">platform_settings.crypto_wallets</code>.
                Clique em <span className="text-gold-400">Criar Vault</span> para provisionar na custódia institucional.
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 flex-wrap">
                <span>Vault ID: <span className="text-white font-mono">{vault.vault_id}</span></span>
                {vault.addresses_refreshed_at && (
                  <span>· Sincronizado: {fmtDate(vault.addresses_refreshed_at)}</span>
                )}
              </div>

              {/* Webhook URL for admin to configure in custody console */}
              <div className="rounded-md border border-blue-900/30 bg-blue-950/20 p-3 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1 font-semibold">
                  URL do Webhook (para configurar na consola de custódia)
                </div>
                <div className="flex items-center gap-2 rounded bg-zinc-950 border border-zinc-800 px-2 py-1.5">
                  <code className="flex-1 text-[11px] text-zinc-300 break-all font-mono">
                    {`${window.location.origin}/api/billing/vault-webhook`}
                  </code>
                  <button
                    onClick={() => copyAddr(`${window.location.origin}/api/billing/vault-webhook`, 'webhook')}
                    className="text-zinc-400 hover:text-blue-400 shrink-0 transition-colors"
                    data-testid="copy-webhook-btn"
                  >
                    {copiedAddr === 'webhook' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <p className="text-[10px] text-blue-300/70 mt-1.5">
                  Depósitos confirmados neste vault vão auto-aprovar o pagamento pendente correspondente (tolerância ±3%).
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(vault.addresses || {}).map(([label, info]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3" data-testid={`vault-addr-${label}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-gold-400 font-semibold">{label}</span>
                        <span className="text-[9px] text-zinc-500">{info.asset_id}</span>
                      </div>
                      {vault.balances?.[info.asset_id] && (
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          Saldo: {vault.balances[info.asset_id].total}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 rounded bg-zinc-950 border border-zinc-800 px-2 py-1.5">
                      <code className="flex-1 text-[11px] text-zinc-300 break-all font-mono">{info.address}</code>
                      <button onClick={() => copyAddr(info.address, label)} className="text-zinc-400 hover:text-gold-400 transition-colors shrink-0">
                        {copiedAddr === label ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Annual Fee — Cycle (operational) */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-medium flex items-center gap-2">
                <TrendingUp size={16} className="text-gold-400" />
                Ciclo de Renovação Anual
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Parâmetros operacionais do ciclo automático. Os montantes por tier são geridos em Configurações da Plataforma.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-zinc-400 text-sm">Ciclo Activo</Label>
              <Switch
                checked={annualFee?.is_active ?? true}
                onCheckedChange={(v) => setAnnualFee({ ...annualFee, is_active: v })}
                data-testid="annual-fee-active-toggle"
              />
            </div>
          </div>

          {/* Read-only tier summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {TIERS.map((t) => (
              <div key={t.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{t.label}</div>
                <div className="text-lg font-light text-white tabular-nums">
                  €{Number(annualFee?.[`${t.id}_eur`] ?? 0).toLocaleString('pt-PT')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-zinc-800 pt-4">
            <NumberField
              label="Notificar N dias antes"
              value={annualFee?.notify_days_before ?? 30}
              onChange={(v) => setAnnualFee({ ...annualFee, notify_days_before: v })}
              dataTestId="notify-days-input"
            />
            <NumberField
              label="Grace period (dias)"
              value={annualFee?.grace_days ?? 15}
              onChange={(v) => setAnnualFee({ ...annualFee, grace_days: v })}
              dataTestId="grace-days-input"
            />
            <NumberField
              label="Suspender após (dias)"
              value={annualFee?.suspend_after_days ?? 30}
              onChange={(v) => setAnnualFee({ ...annualFee, suspend_after_days: v })}
              dataTestId="suspend-days-input"
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.assign('/dashboard/admin/settings')}
              className="border-gold-600/40 text-gold-300 hover:bg-gold-500/10"
              data-testid="goto-settings-from-billing-btn"
            >
              <Settings size={14} className="mr-1.5" /> Editar Montantes em Configurações
            </Button>
            <Button onClick={saveAnnualFee} disabled={savingFee} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-annual-fee-btn">
              {savingFee ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} className="mr-1.5" />}
              Guardar Ciclo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payouts summary */}
      {payouts && payouts.pending_summary && payouts.pending_summary.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-5">
            <h2 className="text-white font-medium mb-3 flex items-center gap-2">
              <Euro size={16} className="text-emerald-400" /> Comissões Pendentes por Equipa
            </h2>
            <div className="space-y-2">
              {payouts.pending_summary.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                  <div>
                    <div className="text-white text-sm">{p.referrer_name || p.referrer_email}</div>
                    <div className="text-[11px] text-zinc-500">{p.count} comissões pendentes</div>
                  </div>
                  <div className="text-gold-400 font-semibold tabular-nums">
                    {p.currency} {p.total_pending.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => !open && setHistoryDialog({ open: false, user: null, data: null, loading: false })}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-400">
              <History size={18} />
              Histórico: {historyDialog.user?.name || historyDialog.user?.email}
            </DialogTitle>
          </DialogHeader>
          {historyDialog.loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gold-400" /></div>
          ) : historyDialog.data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Mini label="Pagamentos" value={historyDialog.data.summary?.total_payments || 0} />
                <Mini label="Renovações" value={historyDialog.data.summary?.annual_count || 0} />
                <Mini label="Upgrades" value={historyDialog.data.summary?.upgrade_count || 0} />
                <Mini label="Total pago" value={`€${(historyDialog.data.summary?.total_paid_eur || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`} />
              </div>
              {(historyDialog.data.payments || []).length === 0 ? (
                <div className="text-center text-zinc-500 py-6">Sem histórico de pagamentos.</div>
              ) : (
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-900 border-b border-zinc-800">
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-wider">
                        <th className="p-2.5 text-left">Tipo</th>
                        <th className="p-2.5 text-left">Tier</th>
                        <th className="p-2.5 text-right">Montante</th>
                        <th className="p-2.5 text-left">Data</th>
                        <th className="p-2.5 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...historyDialog.data.payments].reverse().map((p, i) => (
                        <tr key={i} className="border-t border-zinc-800/60">
                          <td className="p-2.5 capitalize">{p.fee_type || 'admission'}</td>
                          <td className="p-2.5 text-zinc-300 capitalize">
                            {p.target_tier ? `${p.membership_level} → ${p.target_tier}` : p.membership_level}
                          </td>
                          <td className="p-2.5 text-right tabular-nums">€{(p.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          <td className="p-2.5 text-zinc-400">{fmtDate(p.paid_at || p.created_at)}</td>
                          <td className="p-2.5">
                            {p.status === 'paid'
                              ? <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Pago</Badge>
                              : <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">Pendente</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Mini = ({ label, value }) => (
  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    <div className="text-white font-semibold tabular-nums mt-0.5">{value}</div>
  </div>
);

const KpiCard = ({ icon, label, value, accent, onClick, active }) => {
  const colors = {
    sky: { bg: 'bg-sky-950/30', border: 'border-sky-800/40', text: 'text-sky-300' },
    amber: { bg: 'bg-amber-950/30', border: 'border-amber-800/40', text: 'text-amber-300' },
    red: { bg: 'bg-red-950/30', border: 'border-red-800/40', text: 'text-red-300' },
    zinc: { bg: 'bg-zinc-950/30', border: 'border-zinc-800', text: 'text-zinc-300' },
  }[accent] || { bg: 'bg-zinc-900/40', border: 'border-zinc-800', text: 'text-zinc-300' };

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border ${colors.border} ${colors.bg} px-4 py-3 transition-all hover:-translate-y-0.5 ${active ? 'ring-2 ring-gold-500/40' : ''}`}
      data-testid={`kpi-${label.toLowerCase()}`}
    >
      <div className={`flex items-center gap-1.5 ${colors.text} text-[10px] uppercase tracking-wider`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-light text-white mt-1 tabular-nums">{value}</div>
    </button>
  );
};

const NumberField = ({ label, value, onChange, dataTestId }) => (
  <div>
    <Label className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</Label>
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="bg-zinc-900 border-zinc-800 text-white mt-1.5"
      data-testid={dataTestId}
    />
  </div>
);

// ==================== Renewals Health Panel ====================

const fmtEur = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '€0';
  return `€${Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const TIER_ACCENTS = {
  broker: 'text-zinc-300',
  standard: 'text-sky-300',
  premium: 'text-emerald-300',
  vip: 'text-gold-400',
  institucional: 'text-fuchsia-300',
};

const RenewalsHealthPanel = ({ health }) => {
  const {
    projected_annual_revenue_eur = 0,
    active_clients_total = 0,
    active_clients_by_tier = {},
    collected_12m_eur = 0,
    collected_12m_by_type = {},
    monthly_revenue_12m = [],
    auto_approval_rate_12m_pct = 0,
    auto_approval_count_12m = 0,
    payment_method_breakdown_12m = {},
    renewal_rate_12m_pct = 0,
    annual_paid_12m = 0,
    annual_invoices_12m = 0,
    pending_revenue_eur = 0,
    pending_count = 0,
    alerts = [],
  } = health || {};

  // Method breakdown bar (crypto vs bank_transfer vs manual)
  const methodTotal = Object.values(payment_method_breakdown_12m).reduce(
    (s, m) => s + (m?.count || 0), 0
  );
  const cryptoPct = methodTotal ? Math.round(((payment_method_breakdown_12m.crypto?.count || 0) / methodTotal) * 100) : 0;
  const bankPct = methodTotal ? Math.round(((payment_method_breakdown_12m.bank_transfer?.count || 0) / methodTotal) * 100) : 0;
  const manualPct = Math.max(0, 100 - cryptoPct - bankPct);

  // Tier rows (sorted by tier rank)
  const tierOrder = ['broker', 'standard', 'premium', 'vip', 'institucional'];
  const tiers = tierOrder
    .filter((t) => (active_clients_by_tier[t] || 0) > 0)
    .map((t) => ({ tier: t, count: active_clients_by_tier[t] || 0 }));

  return (
    <Card className="bg-zinc-900/50 border-zinc-800" data-testid="renewals-health-panel">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-400/80">
            <Activity size={14} />
            <span>Renewals Health</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-gold-400/30 to-transparent" />
        </div>

        {/* Proactive alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 mb-5" data-testid="health-alerts">
            {alerts.map((a) => <HealthAlert key={a.key} alert={a} />)}
          </div>
        )}

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <HealthKpi
            icon={<Euro size={14} />}
            label="Receita Anual Projectada"
            value={fmtEur(projected_annual_revenue_eur)}
            sub={`${active_clients_total} clientes activos`}
            accent="gold"
            testId="health-projected-revenue"
          />
          <HealthKpi
            icon={<TrendingUp size={14} />}
            label="Cobrado (12m)"
            value={fmtEur(collected_12m_eur)}
            sub={`Admissão ${fmtEur(collected_12m_by_type.admission)} · Anual ${fmtEur(collected_12m_by_type.annual)} · Upgrade ${fmtEur(collected_12m_by_type.upgrade)}`}
            accent="emerald"
            testId="health-collected-12m"
            extra={<Sparkline series={monthly_revenue_12m} />}
          />
          <HealthKpi
            icon={<Percent size={14} />}
            label="Taxa de Renovação (12m)"
            value={`${renewal_rate_12m_pct}%`}
            sub={`${annual_paid_12m} / ${annual_invoices_12m} renovações pagas`}
            accent={renewal_rate_12m_pct >= 90 ? 'emerald' : renewal_rate_12m_pct >= 70 ? 'gold' : 'red'}
            testId="health-renewal-rate"
          />
          <HealthKpi
            icon={<Bitcoin size={14} />}
            label="Auto-aprovação (Webhook)"
            value={`${auto_approval_rate_12m_pct}%`}
            sub={`${auto_approval_count_12m} pagamentos em 12m`}
            accent="gold"
            testId="health-auto-approval"
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tier breakdown */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <UserCheck size={12} />
              Clientes Activos por Tier
            </div>
            {tiers.length === 0 ? (
              <div className="text-zinc-600 text-xs">Sem clientes activos.</div>
            ) : (
              <div className="space-y-2">
                {tiers.map(({ tier, count }) => {
                  const pct = active_clients_total ? (count / active_clients_total) * 100 : 0;
                  return (
                    <div key={tier} className="flex items-center gap-3">
                      <div className={`text-xs w-24 uppercase tracking-wider ${TIER_ACCENTS[tier] || 'text-zinc-300'}`}>
                        {tier}
                      </div>
                      <div className="flex-1 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold-500/80 to-gold-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs tabular-nums text-zinc-300 w-12 text-right">{count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment methods */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <Landmark size={12} />
              Métodos de Pagamento (12m)
            </div>
            {methodTotal === 0 ? (
              <div className="text-zinc-600 text-xs">Ainda sem pagamentos registados.</div>
            ) : (
              <>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-800/40 mb-3">
                  {cryptoPct > 0 && <div className="bg-gold-400" style={{ width: `${cryptoPct}%` }} title={`Crypto ${cryptoPct}%`} />}
                  {bankPct > 0 && <div className="bg-sky-400" style={{ width: `${bankPct}%` }} title={`Banco ${bankPct}%`} />}
                  {manualPct > 0 && <div className="bg-zinc-600" style={{ width: `${manualPct}%` }} title={`Manual ${manualPct}%`} />}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <MethodLegend color="bg-gold-400" label="Crypto" pct={cryptoPct} eur={payment_method_breakdown_12m.crypto?.total_eur || 0} />
                  <MethodLegend color="bg-sky-400" label="Banco" pct={bankPct} eur={payment_method_breakdown_12m.bank_transfer?.total_eur || 0} />
                  <MethodLegend color="bg-zinc-600" label="Manual" pct={manualPct} eur={
                    (payment_method_breakdown_12m.manual?.total_eur || 0)
                    + Object.entries(payment_method_breakdown_12m)
                      .filter(([k]) => !['crypto', 'bank_transfer', 'manual'].includes(k))
                      .reduce((s, [, v]) => s + (v?.total_eur || 0), 0)
                  } />
                </div>
                {pending_count > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                    <span>Pipeline pendente</span>
                    <span className="tabular-nums text-amber-300">
                      {fmtEur(pending_revenue_eur)} <span className="text-zinc-500">· {pending_count} facturas</span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HealthKpi = ({ icon, label, value, sub, accent = 'gold', testId, extra }) => {
  const accents = {
    gold: 'text-gold-400',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
  };
  return (
    <div
      className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 hover:border-zinc-700 transition-colors"
      data-testid={testId}
    >
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${accents[accent] || accents.gold}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-light text-white mt-1.5 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-1 truncate" title={sub}>{sub}</div>}
      {extra}
    </div>
  );
};

const ALERT_STYLES = {
  critical: {
    border: 'border-red-800/60',
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    icon: <ShieldAlert size={14} />,
  },
  warning: {
    border: 'border-amber-800/60',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    icon: <AlertTriangle size={14} />,
  },
  info: {
    border: 'border-sky-800/60',
    bg: 'bg-sky-950/30',
    text: 'text-sky-300',
    icon: <Info size={14} />,
  },
};

const HealthAlert = ({ alert }) => {
  const s = ALERT_STYLES[alert.severity] || ALERT_STYLES.info;
  return (
    <div
      className={`rounded-lg border ${s.border} ${s.bg} px-4 py-3 flex items-start gap-3`}
      data-testid={`health-alert-${alert.key}`}
    >
      <div className={`${s.text} mt-0.5`}>{s.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`${s.text} text-xs font-semibold uppercase tracking-wider`}>{alert.title}</div>
        <div className="text-zinc-300 text-xs mt-0.5 leading-relaxed">{alert.message}</div>
      </div>
    </div>
  );
};

const Sparkline = ({ series = [], height = 30 }) => {
  if (!series || series.length < 2) return null;
  const values = series.map((p) => Number(p.eur) || 0);
  const max = Math.max(...values, 1);
  const width = 140;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = (i * step).toFixed(1);
    const y = (height - (v / max) * (height - 4) - 2).toFixed(1);
    return `${x},${y}`;
  }).join(' ');

  // Area path
  const areaPath = `M 0,${height} L ${points.split(' ').join(' L ')} L ${width},${height} Z`;
  const lastVal = values[values.length - 1];
  const lastX = (values.length - 1) * step;
  const lastY = height - (lastVal / max) * (height - 4) - 2;

  return (
    <div className="mt-2 flex items-center gap-2" title={`Últimos 12 meses: ${series.map(p => p.month + ' €' + Math.round(p.eur)).join(' · ')}`}>
      <svg width={width} height={height} className="overflow-visible flex-shrink-0">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        <polyline points={points} fill="none" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="2.2" fill="#34d399" />
      </svg>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">12m</span>
    </div>
  );
};

const MethodLegend = ({ color, label, pct, eur }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-sm ${color}`} />
      <span className="text-zinc-400">{label}</span>
      <span className="ml-auto text-zinc-300 tabular-nums">{pct}%</span>
    </div>
    <div className="text-[10px] text-zinc-600 pl-3.5 tabular-nums">{fmtEur(eur)}</div>
  </div>
);

export default AdminBillingPage;
