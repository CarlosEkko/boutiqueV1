import React, { useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Scale, MessageSquare, FileText, Shield, CheckCircle,
  AlertTriangle, Send, Upload, Clock, User, Gavel,
  ChevronDown, ChevronUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DISPUTE_STATUS_CONFIG = {
  open: { label: 'Aberta', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  under_review: { label: 'Em Revisao', color: 'bg-amber-500/20 text-amber-400', icon: Scale },
  evidence_required: { label: 'Provas Necessarias', color: 'bg-purple-500/20 text-purple-400', icon: FileText },
  resolved_buyer: { label: 'Resolvida (Buyer)', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
  resolved_seller: { label: 'Resolvida (Seller)', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  resolved_split: { label: 'Resolvida (Split)', color: 'bg-cyan-500/20 text-cyan-400', icon: CheckCircle },
  closed: { label: 'Encerrada', color: 'bg-zinc-500/20 text-zinc-400', icon: CheckCircle },
};

const DISPUTE_FLOW = ['open', 'under_review', 'evidence_required'];

const DisputePanel = ({ deal, token, onRefresh }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMessages, setShowMessages] = useState(true);
  const [showEvidence, setShowEvidence] = useState(true);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [showForceRelease, setShowForceRelease] = useState(false);

  const dispute = deal.dispute;
  if (!dispute) return null;

  const sc = DISPUTE_STATUS_CONFIG[dispute.status] || DISPUTE_STATUS_CONFIG.open;
  const StatusIcon = sc.icon;
  const isResolved = dispute.status?.startsWith('resolved') || dispute.status === 'closed';

  const updateDisputeStatus = async (newStatus, notes = '') => {
    try {
      await axios.put(`${API_URL}/api/escrow/deals/${deal.id}/dispute/status`, {
        new_status: newStatus, notes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Status da disputa atualizado`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/dispute/message`, {
        message: message.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('');
      toast.success('Mensagem enviada');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    } finally {
      setSending(false);
    }
  };

  const uploadEvidence = async () => {
    if (!evidenceName.trim()) { toast.error('Nome do ficheiro obrigatorio'); return; }
    setUploading(true);
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/dispute/evidence`, {
        file_name: evidenceName, description: evidenceDesc,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setEvidenceName('');
      setEvidenceDesc('');
      toast.success('Evidencia registada');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    } finally {
      setUploading(false);
    }
  };

  const forceRelease = async (releaseTo) => {
    try {
      await axios.post(`${API_URL}/api/escrow/deals/${deal.id}/admin-force-release`, {
        release_to: releaseTo, notes: releaseNotes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Force release executado: ${releaseTo}`);
      setShowForceRelease(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro');
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="border border-red-500/20 bg-red-500/[0.03] overflow-hidden" data-testid="dispute-panel">
      {/* Header */}
      <div className="p-5 border-b border-red-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Scale className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Dispute Resolution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Aberta por {dispute.opened_by} em {formatDate(dispute.opened_at)}</p>
            </div>
          </div>
          <Badge className={`${sc.color} text-xs`} data-testid="dispute-status-badge">
            <StatusIcon className="w-3 h-3 mr-1" />
            {sc.label}
          </Badge>
        </div>

        {/* Dispute Status Flow */}
        {!isResolved && (
          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            {DISPUTE_FLOW.map((s, i) => {
              const cfg = DISPUTE_STATUS_CONFIG[s];
              const isActive = s === dispute.status;
              const isPast = DISPUTE_FLOW.indexOf(dispute.status) > i;
              return (
                <React.Fragment key={s}>
                  <button
                    onClick={() => !isActive && updateDisputeStatus(s)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer
                      ${isActive ? `${cfg.color} ring-1 ring-current` : isPast ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
                    data-testid={`dispute-status-${s}`}
                  >
                    {isPast && <CheckCircle className="w-3 h-3" />}
                    {isActive && <div className="w-2 h-2 rounded-full bg-current animate-pulse" />}
                    {cfg.label}
                  </button>
                  {i < DISPUTE_FLOW.length - 1 && <span className="text-white/10 text-xs">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Reason */}
      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
        <div className="text-xs text-muted-foreground mb-1">Motivo da Disputa</div>
        <div className="text-sm">{dispute.reason}</div>
      </div>

      {/* Resolution (if resolved) */}
      {dispute.resolution && (
        <div className="p-4 border-b border-green-500/10 bg-green-500/[0.03]">
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="w-3 h-3 text-green-400" />
            <div className="text-xs text-green-400 font-medium">Resolucao</div>
          </div>
          <div className="text-sm">{dispute.resolution}</div>
          {dispute.resolved_by && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Resolvido por {dispute.resolved_by} em {formatDate(dispute.resolved_at)}
            </div>
          )}
        </div>
      )}

      {/* Evidence Section */}
      <div className="border-b border-white/5">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          onClick={() => setShowEvidence(!showEvidence)}
          data-testid="toggle-evidence"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Provas ({dispute.evidence?.length || 0})
            </span>
          </div>
          {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showEvidence && (
          <div className="px-4 pb-4 space-y-2">
            {(dispute.evidence || []).map((ev) => (
              <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-purple-400" />
                    <span className="text-sm font-medium">{ev.file_name}</span>
                  </div>
                  {ev.description && <div className="text-[10px] text-muted-foreground mt-1">{ev.description}</div>}
                  <div className="text-[10px] text-muted-foreground mt-0.5">{ev.uploaded_by} - {formatDate(ev.uploaded_at)}</div>
                </div>
              </div>
            ))}
            {!isResolved && (
              <div className="p-3 rounded-lg border border-dashed border-purple-500/20 bg-purple-500/[0.03] space-y-2">
                <Input
                  value={evidenceName} onChange={(e) => setEvidenceName(e.target.value)}
                  placeholder="Nome do ficheiro (ex: contrato.pdf)"
                  className="bg-white/5 border-white/10 text-xs h-8"
                  data-testid="evidence-name-input"
                />
                <Input
                  value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)}
                  placeholder="Descricao da prova..."
                  className="bg-white/5 border-white/10 text-xs h-8"
                  data-testid="evidence-desc-input"
                />
                <Button size="sm" className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={uploadEvidence} disabled={uploading || !evidenceName} data-testid="upload-evidence-btn">
                  <Upload className="w-3 h-3 mr-1" /> Registar Prova
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Thread */}
      <div className="border-b border-white/5">
        <button
          className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          onClick={() => setShowMessages(!showMessages)}
          data-testid="toggle-messages"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mensagens ({dispute.messages?.length || 0})
            </span>
          </div>
          {showMessages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showMessages && (
          <div className="px-4 pb-4 space-y-3">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {(dispute.messages || []).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-3">Nenhuma mensagem</div>
              )}
              {(dispute.messages || []).map((msg) => (
                <div key={msg.id} className={`p-3 rounded-lg ${msg.sender_role === 'admin' ? 'bg-amber-500/[0.05] border border-amber-500/10' : 'bg-white/[0.03] border border-white/5'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span className="text-[10px] font-medium">{msg.sender}</span>
                      {msg.sender_role === 'admin' && <Badge className="bg-amber-500/20 text-amber-400 text-[8px] px-1">Admin</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(msg.timestamp)}</span>
                  </div>
                  <div className="text-sm">{msg.message}</div>
                </div>
              ))}
            </div>
            {!isResolved && (
              <div className="flex gap-2">
                <Input
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escrever mensagem..."
                  className="bg-white/5 border-white/10 text-xs h-8 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  data-testid="dispute-message-input"
                />
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 px-3" onClick={sendMessage} disabled={sending || !message.trim()} data-testid="send-message-btn">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {!isResolved && (
        <div className="p-4 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Acoes de Resolucao</div>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700" onClick={() => updateDisputeStatus('resolved_buyer', 'Disputa resolvida a favor do Buyer')} data-testid="resolve-buyer-btn">
              Favor Buyer
            </Button>
            <Button size="sm" className="text-xs bg-amber-600 hover:bg-amber-700" onClick={() => updateDisputeStatus('resolved_seller', 'Disputa resolvida a favor do Seller')} data-testid="resolve-seller-btn">
              Favor Seller
            </Button>
            <Button size="sm" className="text-xs bg-cyan-600 hover:bg-cyan-700" onClick={() => updateDisputeStatus('resolved_split', 'Disputa resolvida com split 50/50')} data-testid="resolve-split-btn">
              Split 50/50
            </Button>
          </div>

          <Button
            variant="outline" size="sm"
            className="w-full text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => setShowForceRelease(!showForceRelease)}
            data-testid="toggle-force-release"
          >
            <Shield className="w-3 h-3 mr-1" /> Admin Force Release
          </Button>

          {showForceRelease && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/[0.05] space-y-2">
              <div className="text-[10px] text-red-400 font-medium">Accao irreversivel - Libertar fundos do escrow</div>
              <textarea
                value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)}
                placeholder="Notas de justificacao (obrigatoria)..."
                rows={2} className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs resize-none"
                data-testid="force-release-notes"
              />
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" className="text-[10px] bg-blue-700" onClick={() => forceRelease('buyer')} disabled={!releaseNotes} data-testid="force-release-buyer">Buyer</Button>
                <Button size="sm" className="text-[10px] bg-amber-700" onClick={() => forceRelease('seller')} disabled={!releaseNotes} data-testid="force-release-seller">Seller</Button>
                <Button size="sm" className="text-[10px] bg-red-700" onClick={() => forceRelease('split')} disabled={!releaseNotes} data-testid="force-release-split">Split</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default DisputePanel;
