import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Lock, Shield, DollarSign, AlertTriangle, Clock,
  ArrowRight, Plus, CheckCircle, XCircle, FileText
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-zinc-500/20 text-zinc-400', icon: FileText },
  awaiting_deposit: { label: 'Aguardando Depósito', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
  funded: { label: 'Financiado', color: 'bg-blue-500/20 text-blue-400', icon: DollarSign },
  in_verification: { label: 'Em Verificação', color: 'bg-purple-500/20 text-purple-400', icon: Shield },
  ready_for_settlement: { label: 'Pronto p/ Liquidação', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  settled: { label: 'Liquidado', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  closed: { label: 'Encerrado', color: 'bg-zinc-500/20 text-zinc-400', icon: Lock },
  disputed: { label: 'Em Disputa', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-300', icon: XCircle },
  expired: { label: 'Expirado', color: 'bg-zinc-500/20 text-zinc-500', icon: Clock },
};

const EscrowDashboard = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/escrow/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(res.data);
    } catch (err) {
      toast.error('Erro ao carregar dashboard escrow');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6 space-y-6" data-testid="escrow-dashboard-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white/5 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Deals Ativos',
      value: dashboard?.active_deals || 0,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Fundos em Custódia',
      value: `$${(dashboard?.funds_under_escrow || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: Lock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Fees Cobradas',
      value: `$${(dashboard?.total_fees_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Em Disputa',
      value: dashboard?.disputed_deals || 0,
      icon: AlertTriangle,
      color: dashboard?.disputed_deals > 0 ? 'text-red-400' : 'text-zinc-400',
      bg: dashboard?.disputed_deals > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-500/10 border-zinc-500/20',
    },
  ];

  const secondaryKpis = [
    { label: 'Total Deals', value: dashboard?.total_deals || 0 },
    { label: 'Liquidados', value: dashboard?.settled_deals || 0 },
    { label: 'SLA Médio', value: `${dashboard?.avg_settlement_hours || 0}h` },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="escrow-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escrow OTC</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Custódia profissional DvP para operações OTC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/escrow/reports')}
            className="border-white/10"
            data-testid="escrow-reports-btn"
          >
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </Button>
          <Button
            onClick={() => navigate('/dashboard/escrow/deals?new=true')}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="new-escrow-deal-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Escrow Deal
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className={`p-5 border ${kpi.bg} backdrop-blur-sm`} data-testid={`kpi-${i}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {secondaryKpis.map((kpi, i) => (
          <Card key={i} className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
            <div className="text-lg font-semibold">{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Status Pipeline */}
      <Card className="p-5 border border-white/5 bg-white/[0.02]">
        <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Pipeline de Estados</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(dashboard?.status_breakdown || {}).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-zinc-500/20 text-zinc-400' };
            return (
              <div key={status} className="flex items-center gap-2">
                <Badge className={`${cfg.color} px-3 py-1 text-xs font-medium`}>
                  {cfg.label}: {count}
                </Badge>
              </div>
            );
          })}
          {Object.keys(dashboard?.status_breakdown || {}).length === 0 && (
            <span className="text-sm text-muted-foreground">Nenhum deal criado ainda</span>
          )}
        </div>
      </Card>

      {/* Recent Deals */}
      <Card className="p-5 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deals Recentes</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/escrow/deals')}
            className="text-xs"
            data-testid="view-all-deals-btn"
          >
            Ver Todos <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        {dashboard?.recent_deals?.length > 0 ? (
          <div className="space-y-2">
            {dashboard.recent_deals.map((deal) => {
              const cfg = STATUS_CONFIG[deal.status] || { label: deal.status, color: 'bg-zinc-500/20 text-zinc-400' };
              return (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer border border-white/5"
                  onClick={() => navigate('/dashboard/escrow/deals')}
                  data-testid={`recent-deal-${deal.deal_id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">{deal.deal_id}</span>
                      <div className="text-xs text-muted-foreground">
                        {deal.asset_a}/{deal.asset_b} &middot; {deal.buyer?.name || 'N/A'} &harr; {deal.seller?.name || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">${(deal.ticket_size || 0).toLocaleString()}</span>
                    <Badge className={`${cfg.color} text-[10px]`}>{cfg.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum deal criado ainda</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/dashboard/escrow/deals?new=true')}
              data-testid="create-first-deal-btn"
            >
              Criar primeiro Escrow Deal
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EscrowDashboard;
