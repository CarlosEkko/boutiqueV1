import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import {
  Shield, Wallet, FileSearch, Target, Fingerprint, ShieldCheck, Lock,
  CheckCircle, XCircle, Clock, Copy, Send, Plus, Bitcoin, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';

const API = process.env.REACT_APP_BACKEND_URL;

const CompliancePage = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deal, setDeal] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletForm, setWalletForm] = useState({ address: '', blockchain: 'Bitcoin', wallet_type: 'cold', description: '' });
  const [selectedWalletId, setSelectedWalletId] = useState(null);
  const [checkingOnChain, setCheckingOnChain] = useState(false);
  const [signatureInput, setSignatureInput] = useState('');

  const token = sessionStorage.getItem('kryptobox_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    try {
      const [dealRes, compRes] = await Promise.all([
        fetch(`${API}/api/otc-deals/deals/${dealId}`, { headers }),
        fetch(`${API}/api/otc-deals/deals/${dealId}/compliance`, { headers }),
      ]);
      if (dealRes.ok) setDeal(await dealRes.json());
      if (compRes.ok) {
        const data = await compRes.json();
        setCompliance(data);
        // Auto-select first wallet if none selected
        if (!selectedWalletId && data?.wallets?.length > 0) {
          setSelectedWalletId(data.wallets[0].id);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dealId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedWallet = compliance?.wallets?.find(w => w.id === selectedWalletId) || null;

  const addWallet = async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/wallets`, {
        method: 'POST', headers, body: JSON.stringify(walletForm)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(t('compliance.toast.walletAdded', 'Carteira adicionada'));
        setShowAddWallet(false);
        // Auto-select the newly added wallet
        if (data?.wallet?.id) setSelectedWalletId(data.wallet.id);
        fetchData();
      }
    } catch (e) { toast.error('Erro'); }
  };

  const verifyWallet = async (walletId, status) => {
    try {
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/wallets/${walletId}/verify?status=${status}`, { method: 'PUT', headers });
      toast.success(status === 'verified' ? t('compliance.toast.walletVerified', 'Carteira verificada') : t('compliance.toast.walletRejected', 'Carteira rejeitada'));
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const startSatoshiTest = async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/satoshi-test`, {
        method: 'POST', headers, body: JSON.stringify({ test_type: 'generated' })
      });
      if (res.ok) {
        const data = await res.json();
        const src = data?.satoshi_test?.address_source;
        toast.success(src === 'fireblocks' ? 'Teste iniciado — Endereço KBEX gerado' : 'Teste iniciado');
        fetchData();
      }
    } catch (e) { toast.error('Erro ao iniciar teste'); }
  };

  const verifySatoshi = async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/satoshi-test/verify?status=verified`, { method: 'PUT', headers });
      if (res.ok) {
        const data = await res.json();
        if (data.on_chain_result?.received) {
          toast.success(`Verificado on-chain! TX: ${data.on_chain_result.txid?.slice(0,12)}...`);
        } else {
          toast.success('Teste de Satoshi verificado manualmente');
        }
        fetchData();
      }
    } catch (e) { toast.error('Erro'); }
  };

  const checkSatoshiOnChain = async () => {
    setCheckingOnChain(true);
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/satoshi-test/check-onchain`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.result?.received) {
          toast.success(`Transacção encontrada! TX: ${data.result.txid?.slice(0,16)}...`);
        } else {
          toast.info('Transacção ainda não detectada on-chain');
        }
        fetchData();
      }
    } catch (e) { toast.error('Erro na verificação on-chain'); }
    finally { setCheckingOnChain(false); }
  };

  const requestOwnershipProof = async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof/ownership/request`, {
        method: 'POST', headers,
      });
      if (res.ok) { toast.success('Mensagem de desafio gerada'); fetchData(); }
    } catch (e) { toast.error('Erro'); }
  };

  const submitOwnershipSignature = async () => {
    if (!signatureInput.trim()) { toast.error('Cole a assinatura'); return; }
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof/ownership/submit-signature`, {
        method: 'POST', headers, body: JSON.stringify({ signature: signatureInput.trim() })
      });
      if (res.ok) { toast.success('Assinatura submetida'); setSignatureInput(''); fetchData(); }
    } catch (e) { toast.error('Erro'); }
  };

  const verifyOwnershipProof = async () => {
    try {
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof/ownership/verify?status=verified`, { method: 'PUT', headers });
      toast.success('Prova de Propriedade verificada');
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const checkReservesOnChain = async () => {
    const walletAddr = selectedWallet?.address;
    if (!walletAddr) { toast.error(t('compliance.toast.selectWallet', 'Selecione uma carteira')); return; }
    setCheckingOnChain(true);
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof/reserves/check`, {
        method: 'POST', headers, body: JSON.stringify({
          wallet_address: walletAddr,
          required_amount: deal?.quantity || 0,
          asset: deal?.asset || 'BTC',
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.proof_of_reserves?.sufficient) {
          toast.success(`Reservas verificadas! Saldo: ${data.proof_of_reserves.on_chain_balance} BTC`);
        } else {
          toast.warning(`Saldo insuficiente: ${data.proof_of_reserves?.on_chain_balance || 0} BTC (necessário: ${deal?.quantity} BTC)`);
        }
        fetchData();
      }
    } catch (e) { toast.error('Erro na verificação on-chain'); }
    finally { setCheckingOnChain(false); }
  };

  const verifyReservesProof = async () => {
    try {
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof/reserves/verify?status=verified`, { method: 'PUT', headers });
      toast.success('Prova de Reservas verificada');
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  // Risk score colors: 0-10 scale, 10 = highest risk
  const riskScoreColor = (score) => {
    if (score <= 3) return { stroke: '#22c55e', text: 'text-emerald-400', bg: 'bg-emerald-500/15 text-emerald-400' };
    if (score <= 6) return { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/15 text-yellow-400' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/15 text-red-400' };
  };

  // Wallet status icon: considers both wallet verification AND KYT analysis
  const walletStatusIcon = (wallet) => {
    if (wallet.status === 'failed') return <XCircle className="text-red-400" size={18} />;
    if (wallet.status === 'pending') return <Clock className="text-amber-400" size={18} />;
    // Wallet is "verified" (address approved) — check if KYT was done
    if (wallet.status === 'verified') {
      if (wallet.kyt_status === 'clean') return <CheckCircle className="text-emerald-400" size={18} />;
      if (wallet.kyt_status === 'flagged') return <Shield className="text-orange-400" size={18} />;
      if (wallet.kyt_status === 'rejected') return <XCircle className="text-red-400" size={18} />;
      // Address verified but no KYT analysis done yet
      return <Clock className="text-amber-400" size={18} />;
    }
    return <Clock className="text-zinc-500" size={18} />;
  };

  const statusIcon = (status) => {
    if (status === 'verified') return <CheckCircle className="text-emerald-400" size={18} />;
    if (status === 'pending') return <Clock className="text-amber-400" size={18} />;
    if (status === 'failed') return <XCircle className="text-red-400" size={18} />;
    return <Clock className="text-zinc-500" size={18} />;
  };

  if (loading) return <div className="text-zinc-500 text-center py-8">A carregar...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white mb-2 -ml-2" data-testid="compliance-back">
            <ArrowLeft size={16} className="mr-1" /> Voltar
          </Button>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2" data-testid="compliance-title">
            <Shield className="text-yellow-500" size={22} />
            Compliance Forense
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {deal?.client_name || 'N/A'} — {deal?.deal_number}
          </p>
        </div>
        <Badge className={compliance?.overall_status === 'approved'
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
        } data-testid="compliance-overall-status">
          {compliance?.overall_status === 'approved' ? 'Aprovado' : 'Em Análise'}
        </Badge>
      </div>

      {/* Summary Bar */}
      <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-summary">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { label: 'Carteiras', status: compliance?.wallets?.length > 0 && compliance.wallets.every(w => w.status === 'verified') ? 'pass' : compliance?.wallets?.some(w => w.status === 'verified') ? 'partial' : 'pending' },
              { label: 'KYT', status: compliance?.kyt?.status === 'clean' ? 'pass' : compliance?.kyt?.status === 'flagged' ? 'warn' : 'pending' },
              { label: 'Teste Satoshi', status: compliance?.satoshi_test?.status === 'verified' ? 'pass' : compliance?.satoshi_test?.status === 'pending' ? 'partial' : 'pending' },
              { label: 'Prova de Propriedade', status: compliance?.proof_of_ownership?.status === 'verified' ? 'pass' : ['pending_review', 'awaiting_signature', 'pending'].includes(compliance?.proof_of_ownership?.status) ? 'partial' : 'pending' },
              { label: 'Prova de Reservas', status: compliance?.proof_of_reserves?.status === 'verified' ? 'pass' : ['pending', 'insufficient'].includes(compliance?.proof_of_reserves?.status) ? 'partial' : 'pending' },
            ].map((check, i) => (
              <div key={i} className="flex items-center gap-2">
                {check.status === 'pass' ? <CheckCircle className="text-emerald-400" size={16} /> :
                 check.status === 'partial' ? <Clock className="text-yellow-400" size={16} /> :
                 check.status === 'warn' ? <Shield className="text-orange-400" size={16} /> :
                 <Clock className="text-zinc-600" size={16} />}
                <span className={`text-sm ${check.status === 'pass' ? 'text-emerald-400' : check.status === 'partial' ? 'text-yellow-400' : 'text-zinc-500'}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* === WALLET-CENTRIC LAYOUT === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT: Wallet List */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-wallets">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Wallet className="text-yellow-500" size={18} /> Carteiras de Negociação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {compliance?.wallets?.map(w => {
              const isSelected = w.id === selectedWalletId;
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWalletId(w.id)}
                  data-testid={`wallet-card-${w.id}`}
                  className={`group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-gold-500/50 shadow-lg shadow-gold-500/10 ring-1 ring-gold-500/20'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:shadow-md hover:shadow-zinc-800/30 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-orange-500/30' : 'bg-orange-500/20 group-hover:bg-orange-500/25'
                    }`}>
                      <Bitcoin className="text-orange-400" size={16} />
                    </div>
                    <div>
                      <code className="text-white text-sm">{w.address?.substring(0, 12)}...{w.address?.slice(-6)}</code>
                      <div className="flex gap-2 mt-1">
                        <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{w.blockchain}</Badge>
                        <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{w.wallet_type}</Badge>
                        {w.kyt_status && (
                          <Badge className={`text-[10px] ${w.kyt_status === 'clean' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : w.kyt_status === 'flagged' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'}`}>
                            {w.kyt_status === 'clean' ? t('status.clean') : w.kyt_status === 'flagged' ? t('status.flagged') : t('status.pending')}
                          </Badge>
                        )}
                        {w.kyt_score > 0 && (
                          <Badge className={`text-[10px] font-mono ${riskScoreColor(w.kyt_score).bg}`}>
                            Score: {w.kyt_score}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.status === 'pending' && (
                      <>
                        <Button size="sm" className="h-6 bg-emerald-600 text-white text-[10px] px-2" onClick={(e) => { e.stopPropagation(); verifyWallet(w.id, 'verified'); }}>Verificar</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-red-400 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); verifyWallet(w.id, 'failed'); }}>Rejeitar</Button>
                      </>
                    )}
                    {walletStatusIcon(w)}
                  </div>
                </div>
              );
            })}
            <Button variant="ghost" onClick={() => setShowAddWallet(true)} className="w-full text-zinc-500 hover:text-yellow-400 border border-dashed border-zinc-800 hover:border-yellow-500/30" data-testid="add-wallet-btn">
              <Plus size={14} className="mr-1" /> Adicionar Carteira
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: KYT for selected wallet */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-kyt">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <FileSearch className="text-purple-400" size={18} /> Análise KYT
              {selectedWallet && (
                <code className="text-zinc-500 text-xs font-mono ml-2">{selectedWallet.address?.substring(0, 10)}...{selectedWallet.address?.slice(-4)}</code>
              )}
              <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] ml-auto">Somente Leitura</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedWallet ? (
              <>
                {/* Per-wallet KYT display */}
                {(selectedWallet.kyt_score > 0 || selectedWallet.kyt_status) ? (
                  <>
                    <div className="flex items-center gap-6">
                      <div className="relative w-28 h-28 shrink-0">
                        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="2.5" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={riskScoreColor(selectedWallet.kyt_score || 0).stroke} strokeWidth="2.5" strokeDasharray={`${Math.min((selectedWallet.kyt_score || 0) / 10, 1) * 100}, 100`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`font-bold text-2xl ${riskScoreColor(selectedWallet.kyt_score || 0).text}`}>{selectedWallet.kyt_score || 0}</span>
                          <span className="text-zinc-600 text-[10px] uppercase tracking-wider">/10</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 text-xs uppercase tracking-wider min-w-[50px]">Status:</span>
                          <Badge className={`px-3 py-1 ${
                            selectedWallet.kyt_status === 'clean' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                            selectedWallet.kyt_status === 'flagged' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                            selectedWallet.kyt_status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                            'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {selectedWallet.kyt_status === 'clean' ? t('status.clean') : selectedWallet.kyt_status === 'flagged' ? t('status.flagged') : selectedWallet.kyt_status === 'rejected' ? t('status.rejected') : t('status.pending')}
                          </Badge>
                        </div>
                        {(() => {
                          const realFlags = (selectedWallet.kyt_flags || []).filter(f => 
                            f && !['Clean wallet', 'clean', 'Limpo', 'clean_wallet'].includes(f)
                          );
                          return realFlags.length > 0 ? (
                            <div>
                              <span className="text-zinc-500 text-xs uppercase tracking-wider block mb-2">Tags:</span>
                              <div className="flex flex-wrap gap-2">
                                {realFlags.map((f, i) => (
                                  <Badge key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2.5 py-1">{f}</Badge>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Wallet size={14} />
                          <span>{selectedWallet.blockchain} · {selectedWallet.wallet_type}</span>
                        </div>
                      </div>
                    </div>
                    {selectedWallet.kyt_analyst_notes && (
                      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 mt-4">
                        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Notas do Analista Forense</p>
                        <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedWallet.kyt_analyst_notes}</p>
                      </div>
                    )}
                    {compliance?.kyt?.analyst_notes && (
                      <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 mt-3">
                        <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Notas do Analista Forense</p>
                        <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{compliance.kyt.analyst_notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <FileSearch className="mx-auto text-zinc-600 mb-2" size={28} />
                    <p className="text-zinc-500 text-sm">Análise KYT pendente para esta carteira</p>
                    <p className="text-zinc-600 text-xs mt-1">O Analista Forense irá avaliar esta carteira.</p>
                    <code className="text-zinc-600 text-xs font-mono mt-2 block">{selectedWallet.address}</code>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Wallet className="mx-auto text-zinc-600 mb-2" size={28} />
                <p className="text-zinc-500 text-sm">{t('compliance.selectWalletPrompt', 'Selecione uma carteira')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Satoshi Test — contextual to selected wallet */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-satoshi">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Target className="text-cyan-400" size={18} /> Teste de Satoshi (AB Test)
              {selectedWallet && (
                <code className="text-zinc-500 text-xs font-mono ml-2">{selectedWallet.address?.substring(0, 10)}...{selectedWallet.address?.slice(-4)}</code>
              )}
              {compliance?.satoshi_test?.address_source === 'fireblocks' && (
                <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] ml-auto">KBEX Custody</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedWallet ? (
              <div className="text-center py-4 text-zinc-500 text-sm">{t('compliance.selectWalletPrompt', 'Selecione uma carteira')}</div>
            ) : compliance?.satoshi_test?.status === 'not_started' ? (
              <Button onClick={startSatoshiTest} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white" data-testid="start-satoshi-test">
                <Send size={14} className="mr-2" /> Iniciar Teste para {selectedWallet.address?.substring(0, 8)}...
              </Button>
            ) : (
              <>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 space-y-3">
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Valor de Teste</p>
                    <p className="text-orange-400 font-mono font-bold text-lg">{compliance?.satoshi_test?.test_amount} BTC</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Endereço KBEX {compliance?.satoshi_test?.address_source === 'fireblocks' ? '(Custody)' : ''}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 text-xs font-mono bg-zinc-900 px-2 py-1 rounded flex-1 truncate">{compliance?.satoshi_test?.verification_address}</code>
                      <button onClick={() => copyToClipboard(compliance?.satoshi_test?.verification_address)} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700">
                        <Copy className="text-zinc-400" size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Carteira de Origem</p>
                    <code className="text-zinc-400 text-xs font-mono">{selectedWallet?.address}</code>
                  </div>
                  {compliance?.satoshi_test?.on_chain_result?.received && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs">
                      <p className="text-emerald-400">TX encontrada on-chain</p>
                      <p className="text-zinc-400 font-mono mt-1">{compliance?.satoshi_test?.on_chain_result?.txid?.slice(0,32)}...</p>
                    </div>
                  )}
                </div>
                {compliance?.satoshi_test?.status === 'pending' ? (
                  <div className="space-y-2">
                    {compliance?.satoshi_test?.address_source === 'fireblocks' && (
                      <Button onClick={checkSatoshiOnChain} disabled={checkingOnChain} className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30" variant="outline" data-testid="check-satoshi-onchain">
                        <FileSearch size={14} className="mr-2" /> {checkingOnChain ? 'A verificar...' : 'Verificar On-Chain'}
                      </Button>
                    )}
                    <Button onClick={verifySatoshi} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" data-testid="verify-satoshi">
                      <CheckCircle size={14} className="mr-2" /> Marcar como Verificado
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-emerald-400" size={18} />
                      <span className="text-emerald-400 font-medium text-sm">Verificado</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Proofs — contextual to selected wallet */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-proofs">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Fingerprint className="text-yellow-500" size={18} /> Provas de Verificação
              {selectedWallet && (
                <code className="text-zinc-500 text-xs font-mono ml-2">{selectedWallet.address?.substring(0, 10)}...{selectedWallet.address?.slice(-4)}</code>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedWallet ? (
              <div className="text-center py-4 text-zinc-500 text-sm">{t('compliance.selectWalletPrompt', 'Selecione uma carteira')}</div>
            ) : (
              <>
                {/* Prova de Propriedade */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="text-blue-400" size={16} />
                      <span className="text-white font-medium text-sm">Prova de Propriedade</span>
                    </div>
                    {statusIcon(compliance?.proof_of_ownership?.status === 'awaiting_signature' || compliance?.proof_of_ownership?.status === 'pending_review' ? 'pending' : compliance?.proof_of_ownership?.status)}
                  </div>

                  {(!compliance?.proof_of_ownership?.status || compliance?.proof_of_ownership?.status === 'not_started') && (
                    <Button onClick={requestOwnershipProof} className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30" size="sm" data-testid="request-ownership">
                      <Send size={14} className="mr-2" /> Gerar Mensagem de Desafio
                    </Button>
                  )}

                  {compliance?.proof_of_ownership?.status === 'awaiting_signature' && (
                    <div className="space-y-3">
                      <div className="bg-zinc-900 p-3 rounded border border-blue-500/20">
                        <p className="text-zinc-500 text-xs mb-1">Mensagem a Assinar:</p>
                        <pre className="text-blue-300 text-xs font-mono whitespace-pre-wrap break-all">{compliance?.proof_of_ownership?.challenge_message}</pre>
                        <button onClick={() => copyToClipboard(compliance?.proof_of_ownership?.challenge_message)} className="mt-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
                          <Copy size={12} /> Copiar mensagem
                        </button>
                      </div>
                      <p className="text-zinc-500 text-xs">O cliente deve assinar com a chave privada de <span className="text-zinc-300 font-mono">{selectedWallet.address?.substring(0, 12)}...</span></p>
                      <div>
                        <Label className="text-zinc-400 text-xs uppercase">Assinatura do Cliente</Label>
                        <Input value={signatureInput} onChange={e => setSignatureInput(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white font-mono text-xs mt-1" placeholder="Cole a assinatura aqui (base64 ou hex)..." data-testid="ownership-signature-input" />
                      </div>
                      <Button onClick={submitOwnershipSignature} className="w-full bg-blue-600 hover:bg-blue-500 text-white" size="sm" data-testid="submit-ownership-signature">
                        <Send size={14} className="mr-2" /> Submeter Assinatura
                      </Button>
                    </div>
                  )}

                  {compliance?.proof_of_ownership?.status === 'pending_review' && (
                    <div className="space-y-3">
                      <div className="bg-zinc-900 p-3 rounded border border-yellow-500/20">
                        <p className="text-zinc-500 text-xs mb-1">Assinatura Submetida:</p>
                        <code className="text-yellow-400 text-xs font-mono break-all">{compliance?.proof_of_ownership?.signature?.slice(0, 80)}...</code>
                        <p className="text-zinc-500 text-xs mt-2">Carteira: <span className="text-zinc-300 font-mono">{selectedWallet.address}</span></p>
                      </div>
                      <Button onClick={verifyOwnershipProof} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" size="sm" data-testid="verify-ownership">
                        <CheckCircle size={14} className="mr-2" /> Aprovar Assinatura
                      </Button>
                    </div>
                  )}

                  {compliance?.proof_of_ownership?.status === 'verified' && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                      <CheckCircle className="text-emerald-400" size={16} />
                      <span className="text-emerald-400 text-sm">Propriedade Verificada</span>
                    </div>
                  )}
                </div>

                {/* Prova de Reservas */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-yellow-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="text-yellow-500" size={16} />
                      <span className="text-white font-medium text-sm">Prova de Reservas</span>
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">On-Chain</Badge>
                    </div>
                    {statusIcon(compliance?.proof_of_reserves?.status)}
                  </div>
                  <p className="text-zinc-500 text-xs">Verificação on-chain via Blockstream para <span className="text-zinc-300 font-mono">{selectedWallet.address?.substring(0, 12)}...</span></p>

                  {deal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Reservas Necessárias</span>
                      <span className="text-white font-medium">{deal.quantity} {deal.asset}</span>
                    </div>
                  )}

                  {compliance?.proof_of_reserves?.on_chain_balance != null && (
                    <div className={`p-3 rounded border text-sm ${compliance?.proof_of_reserves?.sufficient ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Saldo On-Chain</span>
                        <span className={compliance?.proof_of_reserves?.sufficient ? 'text-emerald-400 font-mono font-bold' : 'text-red-400 font-mono font-bold'}>
                          {compliance?.proof_of_reserves?.on_chain_balance} BTC
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-zinc-500 text-xs">UTXOs</span>
                        <span className="text-zinc-400 text-xs">{compliance?.proof_of_reserves?.utxo_count}</span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1 font-mono truncate">{compliance?.proof_of_reserves?.wallet_address}</p>
                    </div>
                  )}

                  {(!compliance?.proof_of_reserves?.status || compliance?.proof_of_reserves?.status === 'not_started' || compliance?.proof_of_reserves?.status === 'insufficient') && (
                    <Button onClick={checkReservesOnChain} disabled={checkingOnChain} className="w-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30" size="sm" data-testid="check-reserves-onchain">
                      <FileSearch size={14} className="mr-2" /> {checkingOnChain ? 'A verificar...' : `Verificar Saldo de ${selectedWallet.address?.substring(0, 8)}...`}
                    </Button>
                  )}

                  {compliance?.proof_of_reserves?.status === 'pending' && (
                    <Button onClick={verifyReservesProof} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" size="sm" data-testid="verify-reserves">
                      <CheckCircle size={14} className="mr-2" /> Verificar
                    </Button>
                  )}

                  {compliance?.proof_of_reserves?.status === 'verified' && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                      <CheckCircle className="text-emerald-400" size={16} />
                      <span className="text-emerald-400 text-sm">Reservas Verificadas</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Wallet Dialog */}
      <Dialog open={showAddWallet} onOpenChange={setShowAddWallet}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Carteira</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase">Endereço</Label>
              <Input value={walletForm.address} onChange={e => setWalletForm(f => ({ ...f, address: e.target.value }))} className="bg-zinc-900 border-zinc-800 text-white" placeholder="bc1q..." data-testid="wallet-address-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase">Blockchain</Label>
                <Select value={walletForm.blockchain} onValueChange={v => setWalletForm(f => ({ ...f, blockchain: v }))}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['Bitcoin', 'Ethereum', 'Tron', 'Solana'].map(b => <SelectItem key={b} value={b} className="text-white">{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase">Tipo</Label>
                <Select value={walletForm.wallet_type} onValueChange={v => setWalletForm(f => ({ ...f, wallet_type: v }))}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {[['cold', 'Cold'], ['hot', 'Hot'], ['custodial', 'Custodial']].map(([v, l]) => <SelectItem key={v} value={v} className="text-white">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addWallet} className="w-full bg-yellow-500 text-black hover:bg-yellow-400" data-testid="save-wallet-btn">
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompliancePage;
