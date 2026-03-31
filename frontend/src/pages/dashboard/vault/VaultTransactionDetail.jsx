import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  ShieldCheck, Clock, CheckCircle, XCircle, ArrowLeft, Send, Copy,
  User, Lock, AlertTriangle, Ban, FileText
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const stepStyles = {
  completed: { diamond: 'bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]', line: 'bg-emerald-500/50', text: 'text-emerald-400' },
  in_progress: { diamond: 'bg-amber-500 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse', line: 'bg-amber-500/30', text: 'text-amber-400' },
  waiting: { diamond: 'bg-amber-500/30 border-amber-500/50', line: 'bg-zinc-700/40', text: 'text-amber-400/60' },
  pending: { diamond: 'bg-zinc-800 border-zinc-700', line: 'bg-zinc-800/40', text: 'text-zinc-500' },
  rejected: { diamond: 'bg-rose-500 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]', line: 'bg-rose-500/50', text: 'text-rose-400' },
  cancelled: { diamond: 'bg-zinc-700 border-zinc-600', line: 'bg-zinc-700/40', text: 'text-zinc-500' },
};

const VaultTransactionDetail = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [signing, setSigning] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  const fetchTx = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/vault/transactions/${id}`, { headers });
      setTx(res.data);
    } catch { navigate('/dashboard/vault'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTx(); }, [fetchTx]);
  useEffect(() => {
    if (tx?.status !== 'pending_signatures') return;
    const iv = setInterval(fetchTx, 10000);
    return () => clearInterval(iv);
  }, [tx?.status]);

  const handleSign = async () => {
    setSigning(true);
    try {
      await axios.post(`${API_URL}/api/vault/transactions/${id}/sign`, { comment }, { headers });
      toast.success('Assinatura registada');
      setComment('');
      fetchTx();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro'); }
    finally { setSigning(false); }
  };

  const handleReject = async () => {
    if (!comment.trim()) { toast.error('Adicione um motivo'); return; }
    setSigning(true);
    try {
      await axios.post(`${API_URL}/api/vault/transactions/${id}/reject`, { comment }, { headers });
      toast.success('Transação rejeitada');
      fetchTx();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro'); }
    finally { setSigning(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancelar esta transação?')) return;
    try {
      await axios.post(`${API_URL}/api/vault/transactions/${id}/cancel`, {}, { headers });
      toast.success('Cancelada');
      fetchTx();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro'); }
  };

  const copyText = (t) => { navigator.clipboard.writeText(t); toast.success('Copiado'); };

  if (loading) return <div className="text-center py-20 text-zinc-500">A carregar...</div>;
  if (!tx) return null;

  const canSign = tx.status === 'pending_signatures' && tx.signatures?.some(
    s => (s.user_id === user?.id || s.email?.toLowerCase() === user?.email?.toLowerCase()) && s.status === 'pending'
  );
  const canCancel = tx.owner_id === user?.id && tx.status === 'pending_signatures';
  const steps = tx.process_steps || [];
  const signedCount = (tx.signatures || []).filter(s => s.status === 'signed').length;

  const timeLeft = tx.time_remaining_seconds > 0
    ? `${Math.floor(tx.time_remaining_seconds / 3600)}h ${Math.floor((tx.time_remaining_seconds % 3600) / 60)}m`
    : '';

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4" data-testid="vault-detail-page">
      <button onClick={() => navigate('/dashboard/vault')} className="text-zinc-500 hover:text-zinc-200 flex items-center gap-2 text-sm transition-colors">
        <ArrowLeft size={18} /> Voltar ao Vault
      </button>

      {/* Hero Header */}
      <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800/60 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              tx.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20' :
              tx.status === 'rejected' ? 'bg-rose-500/10 border border-rose-500/20' :
              'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <Send size={24} className={tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'rejected' ? 'text-rose-400' : 'text-amber-400'} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-light text-zinc-50">Send {tx.asset}</h1>
                <span className="text-zinc-600 text-sm font-mono">{tx.order_number}</span>
              </div>
              <p className="text-zinc-400 text-sm mt-0.5">
                {tx.source_wallet} → {tx.destination_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Amount inline */}
            <div className="text-right mr-4">
              <p className="text-3xl font-mono font-extralight text-zinc-50 tracking-tighter">
                -{new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(tx.amount)}
              </p>
              <p className="text-zinc-500 text-xs">{tx.asset} ({tx.network})</p>
            </div>
            {tx.status === 'pending_signatures' && timeLeft && (
              <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-4 py-2 rounded-full text-sm">
                <Clock size={14} className="mr-1.5" /> {timeLeft}
              </Badge>
            )}
            <Badge className={`border px-4 py-2 rounded-full text-sm ${
              tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              tx.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              tx.status === 'cancelled' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
              'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`} data-testid="vault-tx-status">
              {tx.status === 'completed' ? 'Executed' : tx.status === 'rejected' ? 'Rejected' : tx.status === 'cancelled' ? 'Cancelled' : 'Awaiting Signatures'}
            </Badge>
            {canCancel && (
              <Button variant="outline" onClick={handleCancel} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-full px-4 py-2" data-testid="vault-cancel-btn">
                <Ban size={14} className="mr-1.5" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Left: Details + Actions */}
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800/50">
            <CardContent className="p-8 space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Detalhes da Transação</h3>
              <Row label="Token" value={`${tx.asset} (${tx.network})`} />
              <Row label="Montante" value={<span className="text-red-400 font-mono text-lg">-{new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(tx.amount)}</span>} />
              <div className="border-t border-zinc-800/40 my-2" />
              <Row label="Wallet Origem" value={tx.source_wallet} />
              <Row label="Destino" value={tx.destination_name} />
              <Row label="Endereço" value={
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm truncate max-w-[240px]">{tx.destination_address}</span>
                  <button onClick={() => copyText(tx.destination_address)} className="text-zinc-600 hover:text-zinc-300"><Copy size={14} /></button>
                </div>
              } />
              <Row label="Order Number" value={<span className="font-mono text-sm">{tx.order_number}</span>} />
              {tx.notes && <Row label="Notas" value={<span className="text-zinc-400 text-sm">{tx.notes}</span>} />}
              {tx.execution?.tx_hash && (
                <Row label="TxHash" value={
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-emerald-400 truncate max-w-[240px]">{tx.execution.tx_hash}</span>
                    <button onClick={() => copyText(tx.execution.tx_hash)} className="text-zinc-600 hover:text-zinc-300"><Copy size={14} /></button>
                  </div>
                } />
              )}
            </CardContent>
          </Card>

          {/* Sign / Reject */}
          {canSign && (
            <Card className="bg-zinc-900 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]" data-testid="vault-sign-card">
              <CardContent className="p-8 space-y-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-400 flex items-center gap-2">
                  <Lock size={16} /> A sua assinatura
                </h3>
                <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Comentário (opcional)..."
                  className="bg-zinc-800/50 border-zinc-700/50 text-white text-base rounded-xl py-3" data-testid="vault-sign-comment" />
                <Button onClick={handleSign} disabled={signing} data-testid="vault-sign-btn"
                  className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full font-medium shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] py-3 text-base">
                  <ShieldCheck size={20} className="mr-2" /> {signing ? 'A assinar...' : 'Assinar Transação'}
                </Button>
                <Button onClick={handleReject} disabled={signing} variant="ghost" data-testid="vault-reject-btn"
                  className="w-full text-zinc-500 hover:text-rose-400 rounded-full py-3">
                  <XCircle size={18} className="mr-2" /> Rejeitar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Activity Log */}
          {tx.activity_log?.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800/50">
              <CardContent className="p-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-5 flex items-center gap-2"><FileText size={16} /> Activity Log</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {tx.activity_log.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm py-2 border-b border-zinc-800/30 last:border-0">
                      <span className="text-zinc-600 font-mono whitespace-nowrap">{new Date(log.at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <Badge className={`rounded-full text-xs px-2.5 ${
                        log.action === 'signed' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.action === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                        log.action === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>{log.action}</Badge>
                      <span className="text-zinc-400">{log.by}</span>
                      {log.details && <span className="text-zinc-600 truncate">{log.details}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Process Timeline */}
        <div>
          <Card className="bg-zinc-900 border-zinc-800/50">
            <CardContent className="p-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-10">Process</h3>

              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const st = stepStyles[step.status] || stepStyles.pending;
                  const isLast = idx === steps.length - 1;

                  return (
                    <div key={step.key} className="flex gap-6" data-testid={`vault-step-${step.key}`}>
                      <div className="flex flex-col items-center w-6">
                        <div className={`w-5 h-5 rotate-45 rounded-[3px] border-2 flex-shrink-0 transition-all duration-500 ${st.diamond}`} />
                        {!isLast && <div className={`w-0.5 flex-1 min-h-[60px] transition-all duration-500 ${st.line}`} />}
                      </div>
                      <div className="pb-10 flex-1">
                        <div className="flex items-center gap-3">
                          <span className={`text-base font-medium transition-colors ${st.text}`}>{step.label}</span>
                          {step.status === 'completed' && <CheckCircle size={18} className="text-emerald-400" />}
                          {step.status === 'rejected' && <XCircle size={18} className="text-rose-400" />}
                        </div>

                        {step.key === 'initiated' && step.details && (
                          <div className="mt-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                              <User size={16} className="text-amber-400" />
                            </div>
                            <div className="text-sm">
                              <span className="text-zinc-300">{step.details.by}</span>
                              <span className="text-zinc-600 ml-2">{step.details.email}</span>
                            </div>
                            {step.timestamp && (
                              <span className="text-zinc-600 text-xs ml-auto">{new Date(step.timestamp).toLocaleString('pt-PT')}</span>
                            )}
                          </div>
                        )}

                        {step.key === 'signatures' && step.details && (
                          <div className="mt-4 space-y-4">
                            <p className="text-sm text-zinc-500">
                              {step.details.required} aprovação(ões) necessária(s), {step.details.signed} utilizador(es) aprovaram
                            </p>
                            <div className="space-y-3">
                              {(step.details.signers || []).map((s, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                  s.status === 'signed' ? 'bg-emerald-500/5 border-emerald-500/15' :
                                  s.status === 'rejected' ? 'bg-rose-500/5 border-rose-500/15' :
                                  'bg-zinc-800/30 border-zinc-700/30'
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                                      s.status === 'signed' ? 'bg-emerald-500 border-emerald-400 text-white' :
                                      s.status === 'rejected' ? 'bg-rose-500 border-rose-400 text-white' :
                                      'bg-zinc-800 border-amber-500/30 text-amber-400'
                                    }`}>
                                      {s.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-zinc-200 text-base">{s.name}</p>
                                      <p className="text-zinc-600 text-xs">{s.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {s.comment && <span className="text-zinc-600 text-xs max-w-[150px] truncate">"{s.comment}"</span>}
                                    <Badge className={`rounded-full text-xs px-3 py-1 ${
                                      s.status === 'signed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      s.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                      'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                    }`} data-testid={`vault-signer-${i}`}>
                                      {s.status === 'signed' ? 'Approved' : s.status === 'rejected' ? 'Rejected' : 'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.key === 'risk_check' && step.status === 'completed' && (
                          <p className="mt-3 text-sm text-emerald-400/70">{step.details?.details || 'All checks passed'}</p>
                        )}

                        {step.key === 'execution' && step.details?.tx_hash && (
                          <div className="mt-3 text-sm space-y-1.5">
                            <p className="text-zinc-500">Confirmations: {step.details.confirmations}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">TxHash:</span>
                              <span className="text-emerald-400 font-mono truncate max-w-[280px]">{step.details.tx_hash}</span>
                              <button onClick={() => copyText(step.details.tx_hash)} className="text-zinc-600 hover:text-zinc-300"><Copy size={12} /></button>
                            </div>
                          </div>
                        )}

                        {step.key === 'completed' && step.status === 'completed' && step.timestamp && (
                          <p className="mt-3 text-sm text-emerald-400/70">{new Date(step.timestamp).toLocaleString('pt-PT')}</p>
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

const Row = ({ label, value }) => (
  <div className="flex justify-between items-start py-2.5 border-b border-zinc-800/30 last:border-0">
    <span className="text-zinc-500 text-base">{label}</span>
    <span className="text-zinc-200 text-base text-right">{value}</span>
  </div>
);

export default VaultTransactionDetail;
