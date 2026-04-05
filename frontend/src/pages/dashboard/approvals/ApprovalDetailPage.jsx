import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowLeft, Send, Ban, User, Copy, ExternalLink, Diamond
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusConfig = {
  pending_approval: { label: 'Approval in Progress', color: 'bg-yellow-900/50 text-yellow-400 border-yellow-500/40' },
  completed: { label: 'Successful', color: 'bg-green-900/50 text-green-400 border-green-500/40' },
  rejected: { label: 'Rejected', color: 'bg-red-900/50 text-red-400 border-red-500/40' },
  cancelled: { label: 'Cancelled', color: 'bg-zinc-700/50 text-gray-400 border-zinc-600/40' },
};

const stepStatusStyles = {
  completed: { diamond: 'bg-green-500 border-green-400', line: 'bg-green-500/60', text: 'text-green-400' },
  in_progress: { diamond: 'bg-yellow-500 border-yellow-400 animate-pulse', line: 'bg-yellow-500/40', text: 'text-yellow-400' },
  pending: { diamond: 'bg-zinc-700 border-zinc-600', line: 'bg-zinc-700/40', text: 'text-gray-500' },
  rejected: { diamond: 'bg-red-500 border-red-400', line: 'bg-red-500/60', text: 'text-red-400' },
  cancelled: { diamond: 'bg-zinc-600 border-zinc-500', line: 'bg-zinc-600/40', text: 'text-gray-500' },
};

const ApprovalDetailPage = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTx = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/approvals/transactions/${id}`, { headers });
      setTx(res.data);
    } catch {
      toast.error('Transação não encontrada');
      navigate('/dashboard/approvals');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  // Refresh every 15s if pending
  useEffect(() => {
    if (tx?.status !== 'pending_approval') return;
    const interval = setInterval(fetchTx, 15000);
    return () => clearInterval(interval);
  }, [tx?.status, fetchTx]);

  const handleApprove = async () => {
    setActing(true);
    try {
      await axios.post(`${API_URL}/api/approvals/transactions/${id}/approve`, { comment }, { headers });
      toast.success('Aprovação registada');
      setComment('');
      fetchTx();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar');
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!comment.trim()) { toast.error('Adicione um comentário para rejeitar'); return; }
    setActing(true);
    try {
      await axios.post(`${API_URL}/api/approvals/transactions/${id}/reject`, { comment }, { headers });
      toast.success('Transação rejeitada');
      fetchTx();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar');
    } finally { setActing(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancelar esta transação?')) return;
    try {
      await axios.post(`${API_URL}/api/approvals/transactions/${id}/cancel`, {}, { headers });
      toast.success('Transação cancelada');
      fetchTx();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const getTimeRemaining = () => {
    if (!tx?.time_remaining_seconds) return '';
    const s = tx.time_remaining_seconds;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}min left`;
  };

  // Check if current user can approve
  const canApprove = tx?.status === 'pending_approval' &&
    tx?.approvals?.some(a => a.user_id === user?.id && a.status === 'pending');

  const canCancel = tx?.status === 'pending_approval' &&
    (tx?.created_by === user?.id || user?.is_admin);

  if (loading) return <div className="text-center py-16 text-gray-500">A carregar...</div>;
  if (!tx) return null;

  const cfg = statusConfig[tx.status] || statusConfig.pending_approval;
  const steps = tx.process_steps || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="approval-detail-page">
      {/* Back button */}
      <button onClick={() => navigate('/dashboard/approvals')} className="text-gray-500 hover:text-white flex items-center gap-1 text-sm transition-colors">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-900/30 flex items-center justify-center">
            <Send size={24} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-white">Send {tx.asset}</h1>
            <p className="text-gray-500 text-sm font-mono">{tx.order_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${cfg.color} border px-4 py-2 text-sm`} data-testid="tx-detail-status">
            {cfg.label}
          </Badge>
          {tx.status === 'pending_approval' && (
            <Badge className="bg-zinc-800 text-gray-400 border border-zinc-700 px-3 py-2 text-sm flex items-center gap-1">
              <Clock size={14} /> {getTimeRemaining()}
            </Badge>
          )}
          {canCancel && (
            <Button variant="outline" size="sm" onClick={handleCancel}
              className="border-red-500/30 text-red-400 hover:bg-red-900/30" data-testid="cancel-tx-btn">
              <Ban size={14} className="mr-1" /> Cancel Request
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Transaction Details (2 cols) */}
        <div className="col-span-2 space-y-4">
          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Detalhes da Transação</h3>

              <div className="space-y-3">
                <DetailRow label="Token" value={`${tx.asset} (${tx.network})`} />
                <DetailRow label="Montante" value={
                  <span className="text-red-400 font-mono text-lg font-medium">
                    -{new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2 }).format(tx.amount)}
                  </span>
                } />
                <div className="border-t border-zinc-800 pt-3" />
                <DetailRow label="Wallet Origem" value={tx.source_wallet} />
                <DetailRow label="Destino" value={tx.destination_name} />
                <DetailRow label="Endereço" value={
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs truncate max-w-[180px]">{tx.destination_address}</span>
                    <button onClick={() => copyToClipboard(tx.destination_address)} className="text-gray-500 hover:text-white">
                      <Copy size={12} />
                    </button>
                  </div>
                } />
                <DetailRow label="Order Number" value={<span className="font-mono text-xs">{tx.order_number}</span>} />
                {tx.notes && <DetailRow label="Notas" value={<span className="text-gray-300 text-xs">{tx.notes}</span>} />}
                {tx.send_details?.tx_hash && (
                  <DetailRow label="TxID" value={
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-green-400 truncate max-w-[180px]">{tx.send_details.tx_hash}</span>
                      <button onClick={() => copyToClipboard(tx.send_details.tx_hash)} className="text-gray-500 hover:text-white">
                        <Copy size={12} />
                      </button>
                    </div>
                  } />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approve / Reject Actions */}
          {canApprove && (
            <Card className="bg-zinc-900/70 border-indigo-500/30" data-testid="approval-actions">
              <CardContent className="p-5 space-y-3">
                <h3 className="text-sm font-medium text-indigo-400 uppercase tracking-wider">A sua decisão</h3>
                <Input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Comentário (obrigatório para rejeição)..."
                  className="bg-zinc-800 border-zinc-700 text-white text-sm"
                  data-testid="approval-comment-input"
                />
                <div className="flex gap-2">
                  <Button onClick={handleApprove} disabled={acting}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white" data-testid="approve-btn">
                    <CheckCircle size={16} className="mr-1" /> Aprovar
                  </Button>
                  <Button onClick={handleReject} disabled={acting} variant="outline"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-900/30" data-testid="reject-btn">
                    <XCircle size={16} className="mr-1" /> Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Process Timeline (3 cols) */}
        <div className="col-span-3">
          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardContent className="p-5">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6">Process</h3>

              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const styles = stepStatusStyles[step.status] || stepStatusStyles.pending;
                  const isLast = idx === steps.length - 1;

                  return (
                    <div key={step.key} className="flex gap-4" data-testid={`process-step-${step.key}`}>
                      {/* Timeline line + diamond */}
                      <div className="flex flex-col items-center w-6">
                        <div className={`w-4 h-4 rotate-45 rounded-sm border-2 ${styles.diamond} flex-shrink-0`} />
                        {!isLast && <div className={`w-0.5 flex-1 min-h-[40px] ${styles.line}`} />}
                      </div>

                      {/* Content */}
                      <div className="pb-6 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${styles.text}`}>{step.label}</span>
                          {step.status === 'completed' && <CheckCircle size={14} className="text-green-400" />}
                          {step.status === 'rejected' && <XCircle size={14} className="text-red-400" />}
                        </div>

                        {/* Step-specific content */}
                        {step.key === 'request_submitted' && step.details && (
                          <div className="mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-900/50 flex items-center justify-center">
                                <User size={12} className="text-indigo-400" />
                              </div>
                              <span>{step.details.sender_name}</span>
                              <span className="text-gray-600">{step.details.sender_email}</span>
                            </div>
                            {step.details.timestamp && (
                              <p className="mt-1 text-gray-600">{formatDate(step.details.timestamp, true)}</p>
                            )}
                          </div>
                        )}

                        {step.key === 'approval' && step.details && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs text-gray-500">
                              {step.details.required} aprovação(ões) necessária(s), {step.details.approved_count} utilizador(es) aprovaram
                            </p>
                            <div className="space-y-1.5">
                              {(step.details.approvals || []).map((a, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-zinc-800/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                                      a.status === 'approved' ? 'bg-green-900/50 text-green-400' :
                                      a.status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                                      'bg-zinc-700 text-gray-400'
                                    }`}>
                                      {a.user_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                      <span className="text-white text-xs">{a.user_name}</span>
                                      <span className="text-gray-600 text-[10px] ml-2">{a.user_email}</span>
                                    </div>
                                  </div>
                                  <Badge className={`text-[10px] ${
                                    a.status === 'approved' ? 'bg-green-900/40 text-green-400' :
                                    a.status === 'rejected' ? 'bg-red-900/40 text-red-400' :
                                    'bg-zinc-700 text-gray-400'
                                  }`} data-testid={`approver-status-${i}`}>
                                    {a.status === 'approved' ? 'Approved' : a.status === 'rejected' ? 'Rejected' : 'Pending'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.key === 'risk_compliance' && step.status === 'completed' && (
                          <p className="mt-2 text-xs text-green-400/70">{step.details?.details || 'Risk & Compliance checks are successful.'}</p>
                        )}

                        {step.key === 'kbex_signature' && step.status === 'completed' && (
                          <p className="mt-2 text-xs text-green-400/70">{step.details?.details || 'Signed successfully.'}</p>
                        )}

                        {step.key === 'send' && step.details?.tx_hash && (
                          <div className="mt-2 text-xs">
                            <p className="text-gray-500">{step.details.details}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-gray-500">TxID:</span>
                              <span className="text-green-400 font-mono truncate max-w-[200px]">{step.details.tx_hash}</span>
                              <button onClick={() => copyToClipboard(step.details.tx_hash)} className="text-gray-500 hover:text-white">
                                <Copy size={10} />
                              </button>
                            </div>
                          </div>
                        )}

                        {step.key === 'successful' && step.status === 'completed' && step.details?.timestamp && (
                          <p className="mt-2 text-xs text-green-400/70">{formatDate(step.details.timestamp, true)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper component
const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-start">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-white text-sm text-right">{value}</span>
  </div>
);

export default ApprovalDetailPage;
