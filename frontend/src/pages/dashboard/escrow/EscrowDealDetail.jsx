import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  ArrowLeft, Lock, DollarSign, Users, Shield, CheckCircle, XCircle,
  AlertTriangle, Clock, FileText, ArrowRight, ArrowLeftRight,
  Banknote, Calendar, ChevronDown, ChevronUp, Ban, Scale,
  Upload, Wallet, Hash, ExternalLink, Trash2, Plus, ShieldCheck
} from 'lucide-react';
import { Input } from '../../../components/ui/input';
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
  ready_for_settlement: 'Executar Settlement (DvP)',
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

const EscrowDealDetail = ({ deal: initialDeal, onBack, onUpdate }) => {
  const { token } = useAuth();
  const [deal, setDeal] = useState(initialDeal);
  const [advancing, setAdvancing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [showWhitelist, setShowWhitelist] = useState(false);

  // Deposit form
  const [depositForm, setDepositForm] = useState({ party: 'buyer', amount: '', asset: '', tx_hash: '', source_address: '', notes: '' });
  // Settlement form
  const [settleForm, setSettleForm] = useState({ buyer_destination: '', seller_destination: '', notes: '' });
  // Whitelist form
  const [whitelistForm, setWhitelistForm] = useState({ address: '', label: '', asset: '', party: 'buyer' });

  const refreshDeal = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/escrow/deals/${deal.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeal(res.data);
    } catch {}
  }, [deal.id, token]);

  const sc = STATUS_CONFIG[deal.status] || { label: deal.status, color: 'bg-zinc-500/20 text-zinc-400', border: 'border-zinc-500/30' };

  const advanceStatus = async (newStatus, notes = '') => {
    if (newStatus === 'settled' || newStatus === 'ready_for_settlement') {
      // For settlement, use special flow
      if (newStatus === 'settled') {
        setShowSettle(true);
        return;
      }
    }
    setAdvancing(true);
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/advance`, {
        new_status: newStatus, notes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      refreshDeal();
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao avançar status');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDeposit = async () => {
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/deposit`, {
        party: depositForm.party,
        amount: parseFloat(depositForm.amount),
        asset: depositForm.asset || deal[depositForm.party === 'buyer' ? 'asset_b' : 'asset_a'],
        tx_hash: depositForm.tx_hash || null,
        source_address: depositForm.source_address || null,
        notes: depositForm.notes || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Depósito registado');
      setShowDeposit(false);
      setDepositForm({ party: 'buyer', amount: '', asset: '', tx_hash: '', source_address: '', notes: '' });
      refreshDeal();
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao registar depósito');
    }
  };

  const confirmDeposit = async (depositId, confirmed) => {
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/confirm-deposit`, {
        deposit_id: depositId, confirmed,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(confirmed ? 'Depósito confirmado' : 'Depósito rejeitado');
      refreshDeal();
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const handleSettle = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/settle`, {
        buyer_destination: settleForm.buyer_destination || null,
        seller_destination: settleForm.seller_destination || null,
        notes: settleForm.notes || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Settlement DvP executado com sucesso!');
      setShowSettle(false);
      refreshDeal();
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao executar settlement');
    }
  };

  const openDispute = async () => {
    if (!disputeReason.trim()) { toast.error('Motivo obrigatório'); return; }
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/dispute`, {
        reason: disputeReason,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Disputa aberta');
      setShowDispute(false);
      setDisputeReason('');
      refreshDeal();
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const updateCompliance = async (field, status) => {
    try {
      await axios.put(`${API_URL}/api/escrow/deals/${deal.id}/compliance`, {
        [field]: status,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Compliance atualizado');
      refreshDeal();
      onUpdate();
    } catch (err) {
      toast.error('Erro ao atualizar compliance');
    }
  };

  const addWhitelist = async () => {
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/whitelist`, {
        address: whitelistForm.address,
        label: whitelistForm.label,
        asset: whitelistForm.asset || deal.asset_a,
        party: whitelistForm.party,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Endereço adicionado à whitelist');
      setWhitelistForm({ address: '', label: '', asset: '', party: 'buyer' });
      refreshDeal();
    } catch (err) {
      toast.error('Erro');
    }
  };

  const removeWhitelist = async (addrId) => {
    try {
      await axios.delete(`${API_URL}/api/escrow/deals/${deal.id}/whitelist/${addrId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      refreshDeal();
    } catch {}
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const nextStatus = NEXT_STATUS_MAP[deal.status];
  const nextLabel = NEXT_ACTION_LABELS[deal.status];
  const currentIndex = STATUS_FLOW.indexOf(deal.status);
  const isTerminal = ['closed', 'cancelled', 'expired'].includes(deal.status);
  const canDeposit = ['draft', 'awaiting_deposit'].includes(deal.status);
  const complianceAllApproved = ['buyer_kyc', 'seller_kyc', 'aml_check', 'source_of_funds'].every(
    k => deal.compliance?.[k] === 'approved'
  );

  return (
    <div className="p-6 space-y-5" data-testid="escrow-deal-detail">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="back-to-list-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{deal.deal_id}</h1>
              <Badge className={`${sc.color} text-xs`}>{sc.label}</Badge>
              {deal.compliance?.risk_score != null && (
                <Badge className={`text-[10px] ${deal.compliance.risk_score > 70 ? 'bg-red-500/20 text-red-400' : deal.compliance.risk_score > 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                  Risk: {deal.compliance.risk_score}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {deal.asset_a}/{deal.asset_b} &middot; Ticket: ${(deal.ticket_size || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canDeposit && (
            <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => setShowDeposit(true)} data-testid="register-deposit-btn">
              <Upload className="w-4 h-4 mr-1" /> Registar Depósito
            </Button>
          )}
          {!isTerminal && deal.status !== 'settled' && deal.status !== 'disputed' && (
            <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setShowDispute(!showDispute)} data-testid="open-dispute-btn">
              <AlertTriangle className="w-4 h-4 mr-1" /> Disputa
            </Button>
          )}
          {!isTerminal && deal.status !== 'settled' && deal.status !== 'disputed' && (
            <Button variant="outline" size="sm" className="border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/10" onClick={() => advanceStatus('cancelled', 'Cancelado pelo admin')} data-testid="cancel-deal-btn">
              <Ban className="w-4 h-4 mr-1" /> Cancelar
            </Button>
          )}
          {nextStatus && !isTerminal && deal.status !== 'disputed' && (
            <Button
              onClick={() => deal.status === 'ready_for_settlement' ? setShowSettle(true) : advanceStatus(nextStatus)}
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

      {/* Deposit Modal */}
      {showDeposit && (
        <Card className="p-4 border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-blue-400">Registar Depósito</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Parte</label>
              <select value={depositForm.party} onChange={(e) => setDepositForm({...depositForm, party: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm" data-testid="deposit-party-select">
                <option value="buyer">Buyer ({deal.buyer?.name})</option>
                <option value="seller">Seller ({deal.seller?.name})</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Montante</label>
              <Input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({...depositForm, amount: e.target.value})} placeholder="0.00" className="bg-white/5 border-white/10" data-testid="deposit-amount-input" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Asset</label>
              <Input value={depositForm.asset} onChange={(e) => setDepositForm({...depositForm, asset: e.target.value.toUpperCase()})} placeholder={depositForm.party === 'buyer' ? deal.asset_b : deal.asset_a} className="bg-white/5 border-white/10" data-testid="deposit-asset-input" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">TX Hash</label>
              <Input value={depositForm.tx_hash} onChange={(e) => setDepositForm({...depositForm, tx_hash: e.target.value})} placeholder="0x..." className="bg-white/5 border-white/10" data-testid="deposit-txhash-input" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1 block">Endereço Origem</label>
              <Input value={depositForm.source_address} onChange={(e) => setDepositForm({...depositForm, source_address: e.target.value})} placeholder="0x..." className="bg-white/5 border-white/10" data-testid="deposit-source-input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDeposit(false)}>Cancelar</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleDeposit} disabled={!depositForm.amount} data-testid="submit-deposit-btn">
              Registar
            </Button>
          </div>
        </Card>
      )}

      {/* Settlement Modal */}
      {showSettle && (
        <Card className="p-5 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-emerald-400">Executar Settlement DvP</h3>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 mb-4">
            <div className="text-xs text-muted-foreground mb-2">Resumo da Operação</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{deal.quantity_a} {deal.asset_a}</div>
                <div className="text-xs text-blue-400">{deal.buyer?.name} (Buyer)</div>
              </div>
              <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
              <div className="text-right">
                <div className="text-lg font-bold">{deal.quantity_b} {deal.asset_b}</div>
                <div className="text-xs text-amber-400">{deal.seller?.name} (Seller)</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span className="text-muted-foreground">Fee Total: <strong className="text-emerald-400">${deal.fee_total?.toLocaleString()}</strong></span>
              <span className="text-muted-foreground">Ticket: <strong>${deal.ticket_size?.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Compliance Gate */}
          <div className={`p-3 rounded-lg mb-4 border ${complianceAllApproved ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex items-center gap-2 text-xs font-medium mb-1">
              <ShieldCheck className={`w-4 h-4 ${complianceAllApproved ? 'text-green-400' : 'text-red-400'}`} />
              <span className={complianceAllApproved ? 'text-green-400' : 'text-red-400'}>
                Compliance Gate: {complianceAllApproved ? 'Aprovado' : 'Bloqueado'}
              </span>
            </div>
            {!complianceAllApproved && (
              <div className="text-[10px] text-red-300">Todas as verificações devem estar aprovadas para executar o settlement</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Endereço Destino Buyer</label>
              <Input value={settleForm.buyer_destination} onChange={(e) => setSettleForm({...settleForm, buyer_destination: e.target.value})} placeholder="0x..." className="bg-white/5 border-white/10" data-testid="settle-buyer-dest" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Endereço Destino Seller</label>
              <Input value={settleForm.seller_destination} onChange={(e) => setSettleForm({...settleForm, seller_destination: e.target.value})} placeholder="0x..." className="bg-white/5 border-white/10" data-testid="settle-seller-dest" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-muted-foreground mb-1 block">Notas</label>
            <textarea value={settleForm.notes} onChange={(e) => setSettleForm({...settleForm, notes: e.target.value})} rows={2} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm resize-none" placeholder="Notas de settlement..." data-testid="settle-notes" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettle(false)}>Cancelar</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSettle} disabled={!complianceAllApproved} data-testid="execute-settle-btn">
              Executar Settlement DvP
            </Button>
          </div>
        </Card>
      )}

      {/* Dispute Form */}
      {showDispute && (
        <Card className="p-4 border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Abrir Disputa</h3>
          </div>
          <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Descreva o motivo..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm resize-none mb-3" data-testid="dispute-reason-input" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDispute(false)}>Cancelar</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={openDispute} data-testid="submit-dispute-btn">Confirmar Disputa</Button>
          </div>
        </Card>
      )}

      {/* Status Pipeline */}
      <Card className="p-4 border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between overflow-x-auto gap-1 py-1">
          {STATUS_FLOW.map((s, i) => {
            const cfg = STATUS_CONFIG[s];
            const isActive = s === deal.status;
            const isPast = i < currentIndex;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all
                  ${isActive ? `${cfg.color} ring-1 ${cfg.border}` : isPast ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-muted-foreground opacity-50'}`}>
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

          {/* Deposits */}
          <Card className="p-5 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Depósitos ({deal.deposits?.length || 0})</h3>
              </div>
              {canDeposit && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowDeposit(true)} data-testid="add-deposit-inline-btn">
                  <Plus className="w-3 h-3 mr-1" /> Novo
                </Button>
              )}
            </div>
            {(deal.deposits?.length || 0) === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">Nenhum depósito registado</div>
            ) : (
              <div className="space-y-2">
                {deal.deposits.map((dep, i) => (
                  <div key={dep.id || i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={dep.party === 'buyer' ? 'bg-blue-500/20 text-blue-400 text-[10px]' : 'bg-amber-500/20 text-amber-400 text-[10px]'}>
                          {dep.party}
                        </Badge>
                        <span className="text-sm font-medium">{dep.amount} {dep.asset}</span>
                        <Badge className={dep.confirmed ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-amber-500/20 text-amber-400 text-[10px]'}>
                          {dep.confirmed ? 'Confirmado' : 'Pendente'}
                        </Badge>
                      </div>
                      {dep.tx_hash && (
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {dep.tx_hash.slice(0, 20)}...
                        </div>
                      )}
                    </div>
                    {!dep.confirmed && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => confirmDeposit(dep.id, true)} data-testid={`confirm-dep-${i}`}>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => confirmDeposit(dep.id, false)} data-testid={`reject-dep-${i}`}>
                          <XCircle className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Compliance */}
          <Card className="p-5 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compliance & Risk</h3>
              {complianceAllApproved && (
                <Badge className="bg-green-500/20 text-green-400 text-[10px]">Gate OK</Badge>
              )}
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
                        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => updateCompliance(key, 'approved')} data-testid={`approve-${key}`}>
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {deal.compliance?.risk_score != null && (
              <div className={`mt-3 p-3 rounded-lg border text-xs ${deal.compliance.risk_score > 70 ? 'bg-red-500/5 border-red-500/20 text-red-400' : deal.compliance.risk_score > 40 ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-green-500/5 border-green-500/20 text-green-400'}`}>
                Risk Score: <strong>{deal.compliance.risk_score}</strong> / 100
                {deal.compliance.risk_score > 70 && ' — Alto Risco'}
                {deal.compliance.risk_score > 40 && deal.compliance.risk_score <= 70 && ' — Risco Moderado'}
                {deal.compliance.risk_score <= 40 && ' — Baixo Risco'}
              </div>
            )}
          </Card>

          {/* Settlement Info (if settled) */}
          {deal.settlement && (
            <Card className="p-5 border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <h3 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Settlement Executado</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Asset A:</span> {deal.settlement.quantity_a} {deal.settlement.asset_a}</div>
                <div><span className="text-muted-foreground">Asset B:</span> {deal.settlement.quantity_b} {deal.settlement.asset_b}</div>
                <div><span className="text-muted-foreground">Fee:</span> ${deal.settlement.fee_total?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Executado por:</span> {deal.settlement.executed_by}</div>
                {deal.settlement.buyer_destination && <div className="col-span-2"><span className="text-muted-foreground">Dest. Buyer:</span> <span className="font-mono text-[10px]">{deal.settlement.buyer_destination}</span></div>}
                {deal.settlement.seller_destination && <div className="col-span-2"><span className="text-muted-foreground">Dest. Seller:</span> <span className="font-mono text-[10px]">{deal.settlement.seller_destination}</span></div>}
              </div>
            </Card>
          )}

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
                  <div className="p-2 rounded bg-white/[0.03] mt-2"><strong>Resolução:</strong> {deal.dispute.resolution}</div>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Schedule</span><span className="font-medium capitalize">{deal.fee_schedule}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-medium">{((deal.fee_rate || 0) * 100).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payer</span><span className="font-medium capitalize">{deal.fee_payer}</span></div>
              {deal.volume_discount_pct > 0 && (
                <div className="flex justify-between text-emerald-400"><span>Vol. Discount</span><span className="font-medium">-{(deal.volume_discount_pct * 100).toFixed(0)}% (-${deal.volume_discount?.toLocaleString()})</span></div>
              )}
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between"><span className="text-muted-foreground">Total Fee</span><span className="font-bold text-emerald-400">${(deal.fee_total || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span>${(deal.fee_buyer || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Seller</span><span>${(deal.fee_seller || 0).toLocaleString()}</span></div>
            </div>
          </Card>

          {/* Custody */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custódia</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Locked</span>
                <Badge className={deal.custody?.locked ? 'bg-red-500/20 text-red-400' : 'bg-zinc-500/20 text-zinc-400'}>{deal.custody?.locked ? 'Sim' : 'Não'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer</span>
                <span>{deal.custody?.buyer_deposited ? <span className="text-green-400">{deal.custody.buyer_deposit_amount} depositado</span> : <span className="text-amber-400">Pendente</span>}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller</span>
                <span>{deal.custody?.seller_deposited ? <span className="text-green-400">{deal.custody.seller_deposit_amount} depositado</span> : <span className="text-amber-400">Pendente</span>}</span>
              </div>
            </div>
          </Card>

          {/* Whitelist */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Whitelist</h3>
              </div>
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowWhitelist(!showWhitelist)} data-testid="toggle-whitelist-btn">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {showWhitelist && (
              <div className="space-y-2 mb-3 p-2 rounded border border-white/10 bg-white/[0.02]">
                <Input value={whitelistForm.label} onChange={(e) => setWhitelistForm({...whitelistForm, label: e.target.value})} placeholder="Label" className="bg-white/5 border-white/10 text-xs h-8" data-testid="wl-label" />
                <Input value={whitelistForm.address} onChange={(e) => setWhitelistForm({...whitelistForm, address: e.target.value})} placeholder="Endereço 0x..." className="bg-white/5 border-white/10 text-xs h-8" data-testid="wl-address" />
                <div className="flex gap-2">
                  <select value={whitelistForm.party} onChange={(e) => setWhitelistForm({...whitelistForm, party: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs" data-testid="wl-party">
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                  </select>
                  <Button size="sm" className="h-7 text-xs bg-emerald-600" onClick={addWhitelist} disabled={!whitelistForm.address || !whitelistForm.label} data-testid="add-wl-btn">Adicionar</Button>
                </div>
              </div>
            )}
            {(deal.whitelist?.length || 0) === 0 ? (
              <div className="text-[10px] text-muted-foreground text-center py-2">Nenhum endereço</div>
            ) : (
              <div className="space-y-1">
                {deal.whitelist.map(addr => (
                  <div key={addr.id} className="flex items-center justify-between p-2 rounded bg-white/[0.03] text-[10px]">
                    <div>
                      <div className="font-medium">{addr.label}</div>
                      <div className="text-muted-foreground font-mono">{addr.address.slice(0, 16)}...</div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => removeWhitelist(addr.id)}>
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Metadata */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Informações</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Criado por</span><span>{deal.created_by}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{formatDate(deal.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Atualizado</span><span>{formatDate(deal.updated_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Prazo</span><span>{formatDate(deal.settlement_deadline)}</span></div>
              {deal.otc_deal_id && <div className="flex justify-between"><span className="text-muted-foreground">OTC Deal</span><span className="text-emerald-400">{deal.otc_deal_id}</span></div>}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTimeline(!showTimeline)}>
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
