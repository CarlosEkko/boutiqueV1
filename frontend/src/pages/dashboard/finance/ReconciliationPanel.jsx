import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  RefreshCw, AlertTriangle, CheckCircle, Clock, TrendingUp,
  TrendingDown, ArrowLeftRight, Landmark, Loader2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const fmtAmount = (val, cur = '') => {
  const n = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `${n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`.trim();
};

const fmtDate = (iso) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const ReconciliationPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/revolut/reconciliation-overview`, { headers: getHeaders() });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      console.error('Failed to fetch reconciliation overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const syncDeposits = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/api/revolut/sync-deposits`, {
        method: 'POST', headers: getHeaders()
      });
      if (res.ok) {
        const result = await res.json();
        if (result.auto_reconciled > 0) {
          toast.success(`${result.new_deposits} novos depositos. ${result.auto_reconciled} reconciliados automaticamente`);
        } else {
          toast.success(`Sincronizado: ${result.new_deposits} novos depositos`);
        }
        fetchOverview();
      }
    } catch {
      toast.error('Erro ao sincronizar com Revolut');
    }
    setSyncing(false);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-gold-400" size={24} />
      </div>
    );
  }

  if (!data) return null;

  const { summary, by_currency, unreconciled_alerts } = data;
  const hasDiscrepancies = by_currency?.some(d => d.status !== 'match');
  const hasPending = summary?.pending > 0;

  return (
    <div className="space-y-4" data-testid="reconciliation-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Landmark className="text-blue-400" size={20} />
          <h2 className="text-lg text-white font-light">Reconciliacao Bancaria</h2>
          <Badge className="bg-zinc-800 text-gray-400 border-zinc-700 text-[10px]">Ultimos 30 dias</Badge>
          {hasPending && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] animate-pulse">
              {summary.pending} pendentes
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white"
          onClick={syncDeposits} disabled={syncing} data-testid="sync-revolut-btn">
          {syncing ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
          Sync Revolut
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Revolut" value={fmtAmount(summary.revolut_total)} sub={`${summary.revolut_count} depositos`}
          icon={Landmark} color="text-blue-400" border="border-blue-500/20" />
        <SummaryCard label="Plataforma" value={fmtAmount(summary.platform_total)} sub={`${summary.platform_count} depositos`}
          icon={ArrowLeftRight} color="text-emerald-400" border="border-emerald-500/20" />
        <SummaryCard label="Diferenca" value={fmtAmount(summary.difference)}
          icon={summary.difference >= 0 ? TrendingUp : TrendingDown}
          color={Math.abs(summary.difference) < 1 ? 'text-emerald-400' : 'text-amber-400'}
          border={Math.abs(summary.difference) < 1 ? 'border-emerald-500/20' : 'border-amber-500/20'} />
        <SummaryCard label="Reconciliados" value={`${summary.reconciled}/${summary.revolut_count}`}
          sub={`${summary.reconciliation_rate}%`}
          icon={CheckCircle} color="text-emerald-400" border="border-emerald-500/20" />
        <SummaryCard label="Pendentes" value={summary.pending}
          icon={Clock} color={summary.pending > 0 ? 'text-amber-400' : 'text-emerald-400'}
          border={summary.pending > 0 ? 'border-amber-500/20' : 'border-emerald-500/20'} />
      </div>

      {/* Discrepancies by Currency */}
      {by_currency && by_currency.length > 0 && (
        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 gap-2 px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider border-b border-zinc-800">
              <span>Moeda</span>
              <span className="text-right">Revolut</span>
              <span className="text-right">Plataforma</span>
              <span className="text-right">Diferenca</span>
              <span className="text-right">Reconciliados</span>
              <span className="text-right">Pendentes</span>
              <span className="text-right">Status</span>
            </div>
            {by_currency.map(row => (
              <div key={row.currency} className="grid grid-cols-7 gap-2 px-4 py-2.5 text-xs hover:bg-zinc-800/30 items-center border-b border-zinc-800/30 last:border-0">
                <span className="text-white font-medium">{row.currency}</span>
                <span className="text-right text-gray-300 font-mono">{fmtAmount(row.revolut_total)}</span>
                <span className="text-right text-gray-300 font-mono">{fmtAmount(row.platform_total)}</span>
                <span className={`text-right font-mono ${row.status === 'match' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {row.difference > 0 ? '+' : ''}{fmtAmount(row.difference)}
                </span>
                <span className="text-right text-emerald-400">{row.revolut_reconciled}</span>
                <span className={`text-right ${row.revolut_pending > 0 ? 'text-amber-400' : 'text-gray-500'}`}>{row.revolut_pending}</span>
                <div className="flex justify-end">
                  {row.status === 'match' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">OK</Badge>
                  ) : row.status === 'over' ? (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">Excesso</Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">Deficit</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unreconciled Alerts */}
      {unreconciled_alerts && unreconciled_alerts.length > 0 && (
        <Card className="bg-zinc-900/40 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">Depositos Nao Reconciliados</span>
            </div>
            <div className="space-y-2">
              {unreconciled_alerts.map(dep => (
                <div key={dep.transaction_id} className="flex items-center justify-between py-2 px-3 bg-zinc-800/40 rounded-lg text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-mono font-medium">{fmtAmount(dep.amount, dep.currency)}</span>
                    <span className="text-gray-400">{dep.counterparty_name || 'Desconhecido'}</span>
                    {dep.reference && <span className="text-gray-500">Ref: {dep.reference}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{fmtDate(dep.created_at)}</span>
                    <a href="/dashboard/admin/contas-bancarias" className="text-gold-400 hover:text-gold-300">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, sub, icon: Icon, color, border }) => (
  <Card className={`bg-zinc-900/40 ${border} border`}>
    <CardContent className="p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={14} className={color} />}
      </div>
      <p className={`text-lg font-mono font-light ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

export default ReconciliationPanel;
