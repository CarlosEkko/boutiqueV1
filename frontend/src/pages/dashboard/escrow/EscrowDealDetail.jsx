import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  ArrowLeft, Lock, DollarSign, Users, Shield, CheckCircle, XCircle,
  AlertTriangle, Clock, FileText, ArrowRight, ArrowLeftRight,
  Banknote, Calendar, ChevronDown, ChevronUp, Play, Ban, Scale
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-zinc-500/20 text-zinc-400', border: 'border-zinc-500/30' },
  awaiting_deposit: { label: 'Aguardando Depósito', color: 'bg-amber-500/20 text-amber-400', border: 'border-amber-500/30' },
  funded: { label: 'Financiado', color: 'bg-blue-500/20 text-blue-400', border: 'border-blue-500/30' },
  in_verification: { label: 'Em Verificação', color: 'bg-purple-500/20 text-purple-400', border: 'border-purple-500/30' },
  ready_for_settlement: { label: 'Pronto p/ Liquidação', color: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/30' },
  settled: { label: 'Liquidado', color: 'bg-green-500/20 text-green-400', border: 'border-green-500/30' },
  closed: { label: 'Encerrado', color: 'bg-zinc-500/20 text-zinc-400', border: 'border-zinc-500/30' },
  disputed: { label: 'Em Disputa', color: 'bg-red-500/20 text-red-400', border: 'border-red-500/30' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-300', border: 'border-red-500/30' },
  expired: { label: 'Expirado', color: 'bg-zinc-500/20 text-zinc-500', border: 'border-zinc-500/30' },
};

const STATUS_FLOW = ['draft', 'awaiting_deposit', 'funded', 'in_verification', 'ready_for_settlement', 'settled', 'closed'];

const NEXT_STATUS_MAP = {
  draft: 'awaiting_deposit',
  awaiting_deposit: 'funded',
  funded: 'in_verification',
  in_verification: 'ready_for_settlement',
  ready_for_settlement: 'settled',
  settled: 'closed',
};

const NEXT_ACTION_LABELS = {
  draft: 'Aguardar Depósito',
  awaiting_deposit: 'Confirmar Financiamento',
  funded: 'Iniciar Verificação',
  in_verification: 'Aprovar para Liquidação',
  ready_for_settlement: 'Liquidar (Settle)',
  settled: 'Encerrar Deal',
};

const COMPLIANCE_LABELS = {
  buyer_kyc: 'KYC Buyer',
  seller_kyc: 'KYC Seller',
  aml_check: 'AML Check',
  source_of_funds: 'Source of Funds',
};

const COMPLIANCE_STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  requires_review: 'bg-purple-500/20 text-purple-400',
};

const EscrowDealDetail = ({ deal, onBack, onUpdate }) => {
  const { token, user } = useAuth();
  const [advancing, setAdvancing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);

  const sc = STATUS_CONFIG[deal.status] || { label: deal.status, color: 'bg-zinc-500/20 text-zinc-400', border: 'border-zinc-500/30' };

  const advanceStatus = async (newStatus, notes = '') => {
    setAdvancing(true);
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/advance`, {
        new_status: newStatus,
        notes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao avançar status');
    } finally {
      setAdvancing(false);
    }
  };

  const openDispute = async () => {
    if (!disputeReason.trim()) { toast.error('Motivo da disputa é obrigatório'); return; }
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/dispute`, {
        reason: disputeReason,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Disputa aberta');
      setShowDispute(false);
      setDisputeReason('');
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao abrir disputa');
    }
  };

  const updateCompliance = async (field, status) => {
    try {
      await axios.put(`${API_URL}/api/escrow/deals/${deal.id}/compliance`, {
        [field]: status,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Compliance atualizado');
      onUpdate();
    } catch (err) {
      toast.error('Erro ao atualizar compliance');
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const nextStatus = NEXT_STATUS_MAP[deal.status];
  const nextLabel = NEXT_ACTION_LABELS[deal.status];
  const currentIndex = STATUS_FLOW.indexOf(deal.status);
  const isTerminal = ['closed', 'cancelled', 'expired', 'disputed'].includes(deal.status);

  return (
    <div className="p-6 space-y-5" data-testid="escrow-deal-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="back-to-list-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{deal.deal_id}</h1>
              <Badge className={`${sc.color} text-xs`}>{sc.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {deal.asset_a}/{deal.asset_b} &middot; Ticket: ${(deal.ticket_size || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isTerminal && deal.status !== 'settled' && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => setShowDispute(!showDispute)}
              data-testid="open-dispute-btn"
            >
              <AlertTriangle className="w-4 h-4 mr-1" /> Disputa
            </Button>
          )}
          {!isTerminal && deal.status !== 'settled' && (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/10"
              onClick={() => advanceStatus('cancelled', 'Cancelado pelo admin')}
              data-testid="cancel-deal-btn"
            >
              <Ban className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          )}
          {nextStatus && !isTerminal && (
            <Button
              onClick={() => advanceStatus(nextStatus)}
              disabled={advancing}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="advance-status-btn"
            >
              {advancing ? 'A processar...' : nextLabel}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Dispute Form */}
      {showDispute && (
        <Card className="p-4 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Abrir Disputa</h3>
          </div>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Descreva o motivo da disputa..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm resize-none mb-3"
            data-testid="dispute-reason-input"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDispute(false)}>Cancelar</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={openDispute} data-testid="submit-dispute-btn">
              Confirmar Disputa
            </Button>
          </div>
        </Card>
      )}

      {/* Status Pipeline Visual */}
      <Card className="p-4 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between overflow-x-auto gap-1 py-1">
          {STATUS_FLOW.map((s, i) => {
            const cfg = STATUS_CONFIG[s];
            const isActive = s === deal.status;
            const isPast = i < currentIndex;
            const isFuture = i > currentIndex;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all
                  ${isActive ? `${cfg.color} ring-1 ${cfg.border}` : isPast ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-muted-foreground opacity-50'}`}
                >
                  {isPast && <CheckCircle className="w-3 h-3" />}
                  {isActive && <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                  {cfg.label}
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <ArrowRight className={`w-3 h-3 shrink-0 ${isPast ? 'text-green-500' : 'text-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Deal Details */}
          <Card className="p-5 border border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Detalhes da Operação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-1">Asset A (Entrega)</div>
                <div className="text-lg font-bold">{deal.quantity_a} {deal.asset_a}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-1">Asset B (Pagamento)</div>
                <div className="text-lg font-bold">{deal.quantity_b} {deal.asset_b}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-1">Preço Acordado</div>
                <div className="text-sm font-semibold">${(deal.agreed_price || 0).toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-1">Ticket Size</div>
                <div className="text-sm font-semibold">${(deal.ticket_size || 0).toLocaleString()}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-1">Estrutura</div>
                <div className="text-sm font-semibold">{deal.structure === 'two_sided' ? '2-Sided' : '1-Sided'}</div>
              </div>
            </div>
          </Card>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 border border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase">Buyer</span>
              </div>
              <div className="text-sm font-semibold">{deal.buyer?.name || 'N/A'}</div>
              <div className="text-xs text-muted-foreground mt-1">{deal.buyer?.email || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">{deal.buyer?.phone || 'N/A'}</div>
            </Card>
            <Card className="p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase">Seller</span>
              </div>
              <div className="text-sm font-semibold">{deal.seller?.name || 'N/A'}</div>
              <div className="text-xs text-muted-foreground mt-1">{deal.seller?.email || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">{deal.seller?.phone || 'N/A'}</div>
            </Card>
          </div>

          {/* Compliance */}
          <Card className="p-5 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compliance & Risk</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(COMPLIANCE_LABELS).map(([key, label]) => {
                const status = deal.compliance?.[key] || 'pending';
                const colors = COMPLIANCE_STATUS_COLORS[status] || COMPLIANCE_STATUS_COLORS.pending;
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <span className="text-xs font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={`${colors} text-[10px]`}>{status}</Badge>
                      {status !== 'approved' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={() => updateCompliance(key, 'approved')}
                          data-testid={`approve-${key}`}
                        >
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {deal.compliance?.risk_score && (
              <div className="mt-3 p-2 rounded bg-white/[0.03] text-xs text-muted-foreground">
                Risk Score: <strong>{deal.compliance.risk_score}</strong>
              </div>
            )}
          </Card>

          {/* Dispute Info */}
          {deal.dispute && (
            <Card className="p-5 border border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">Disputa</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div><strong>Motivo:</strong> {deal.dispute.reason}</div>
                <div><strong>Aberta por:</strong> {deal.dispute.opened_by}</div>
                <div><strong>Data:</strong> {formatDate(deal.dispute.opened_at)}</div>
                {deal.dispute.resolution && (
                  <div className="p-2 rounded bg-white/[0.03] mt-2">
                    <strong>Resolução:</strong> {deal.dispute.resolution}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Fees */}
          <Card className="p-4 border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Fee Engine</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-medium capitalize">{deal.fee_schedule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-medium">{((deal.fee_rate || 0) * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payer</span>
                <span className="font-medium capitalize">{deal.fee_payer}</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fee</span>
                <span className="font-bold text-emerald-400">${(deal.fee_total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer</span>
                <span>${(deal.fee_buyer || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller</span>
                <span>${(deal.fee_seller || 0).toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Custody */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custódia</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locked</span>
                <Badge className={deal.custody?.locked ? 'bg-red-500/20 text-red-400' : 'bg-zinc-500/20 text-zinc-400'}>
                  {deal.custody?.locked ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer Deposit</span>
                <span>{deal.custody?.buyer_deposited ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller Deposit</span>
                <span>{deal.custody?.seller_deposited ? 'Sim' : 'Não'}</span>
              </div>
            </div>
          </Card>

          {/* Metadata */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informações</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado por</span>
                <span>{deal.created_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span>{formatDate(deal.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado</span>
                <span>{formatDate(deal.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prazo</span>
                <span>{formatDate(deal.settlement_deadline)}</span>
              </div>
              {deal.otc_deal_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OTC Deal</span>
                  <span className="text-emerald-400">{deal.otc_deal_id}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline ({deal.timeline?.length || 0})</h3>
              </div>
              {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            {showTimeline && (
              <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
                {(deal.timeline || []).slice().reverse().map((entry, i) => (
                  <div key={i} className="relative pl-4 border-l border-white/10">
                    <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-emerald-500 -translate-x-1" />
                    <div className="text-xs font-medium">{entry.action}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.performed_by} &middot; {formatDate(entry.timestamp)}
                    </div>
                    {entry.notes && <div className="text-[10px] text-muted-foreground italic mt-0.5">{entry.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EscrowDealDetail;
