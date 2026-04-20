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
  Shield, Vault, Copy, Check,
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, ren, pay, cyc, v] = await Promise.all([
        axios.get(`${API_URL}/api/billing/config`, { headers }),
        axios.get(`${API_URL}/api/billing/renewals`, { headers }),
        axios.get(`${API_URL}/api/billing/payouts`, { headers }),
        axios.get(`${API_URL}/api/billing/cycle-status`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/billing/vault`, { headers }).catch(() => ({ data: null })),
      ]);
      setConfig(cfg.data);
      setAnnualFee(cfg.data.annual_fee);
      setRenewals(ren.data);
      setPayouts(pay.data);
      setCycleStatus(cyc.data);
      setVault(v.data);
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
    if (!window.confirm('Criar vault "KBEX OnBoarding" no Fireblocks? Esta operação é idempotente.')) return;
    setVaultBusy(true);
    try {
      const res = await axios.post(`${API_URL}/api/billing/vault/setup`, {}, { headers });
      toast.success(res.data.already_existed ? 'Vault existente — endereços sincronizados' : 'Vault KBEX OnBoarding criado no Fireblocks');
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
      toast.success('Endereços re-sincronizados do Fireblocks');
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

      {/* Fireblocks Billing Vault */}
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
                  Custódia Fireblocks para Taxa de Admissão + Renovações Anuais (BTC / ETH / USDT / USDC)
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
                Clique em <span className="text-gold-400">Criar Vault</span> para provisionar no Fireblocks.
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

              {/* Webhook URL for admin to configure in Fireblocks console */}
              <div className="rounded-md border border-blue-900/30 bg-blue-950/20 p-3 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-1 font-semibold">
                  URL do Webhook (para configurar na consola Fireblocks)
                </div>
                <div className="flex items-center gap-2 rounded bg-zinc-950 border border-zinc-800 px-2 py-1.5">
                  <code className="flex-1 text-[11px] text-zinc-300 break-all font-mono">
                    {`${window.location.origin}/api/billing/fireblocks-webhook`}
                  </code>
                  <button
                    onClick={() => copyAddr(`${window.location.origin}/api/billing/fireblocks-webhook`, 'webhook')}
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

      {/* Annual Fee config */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-medium flex items-center gap-2">
                <TrendingUp size={16} className="text-gold-400" />
                Taxa Anual (recorrente)
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Distinta da Taxa de Admissão. Cobrada todos os anos no aniversário.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-zinc-400 text-sm">Ativa</Label>
              <Switch
                checked={annualFee?.is_active ?? true}
                onCheckedChange={(v) => setAnnualFee({ ...annualFee, is_active: v })}
                data-testid="annual-fee-active-toggle"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {TIERS.map((t) => (
              <div key={t.id} className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-zinc-500">{t.label}</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 text-sm">€</span>
                  <Input
                    type="number"
                    value={annualFee?.[`${t.id}_eur`] ?? 0}
                    onChange={(e) => setAnnualFee({ ...annualFee, [`${t.id}_eur`]: parseFloat(e.target.value) || 0 })}
                    className="bg-zinc-900 border-zinc-800 text-white h-9"
                    data-testid={`annual-fee-${t.id}`}
                  />
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

          <div className="mt-5 flex justify-end">
            <Button onClick={saveAnnualFee} disabled={savingFee} className="bg-gold-500 hover:bg-gold-600 text-black" data-testid="save-annual-fee-btn">
              {savingFee ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} className="mr-1.5" />}
              Guardar Taxa Anual
            </Button>
          </div>

          <div className="mt-4 rounded-md border border-blue-900/30 bg-blue-950/20 p-3 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-300/80">
              Taxa de Admissão (entrada única) é configurada em <span className="text-gold-400">Configurações da Plataforma</span>.
              As comissões da equipa (admissão inicial + anual) estão na mesma página.
            </div>
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

export default AdminBillingPage;
