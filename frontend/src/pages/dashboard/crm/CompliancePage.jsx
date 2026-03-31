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

const API = process.env.REACT_APP_BACKEND_URL;

const CompliancePage = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletForm, setWalletForm] = useState({ address: '', blockchain: 'Bitcoin', wallet_type: 'cold', description: '' });

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
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [dealId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addWallet = async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/wallets`, {
        method: 'POST', headers, body: JSON.stringify(walletForm)
      });
      if (res.ok) { toast.success('Carteira adicionada'); setShowAddWallet(false); fetchData(); }
    } catch (e) { toast.error('Erro'); }
  };

  const verifyWallet = async (walletId, status) => {
    try {
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/wallets/${walletId}/verify?status=${status}`, { method: 'PUT', headers });
      toast.success(status === 'verified' ? 'Carteira verificada' : 'Carteira rejeitada');
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const startSatoshiTest = async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/satoshi-test`, {
        method: 'POST', headers, body: JSON.stringify({ test_type: 'generated' })
      });
      if (res.ok) { toast.success('Teste de Satoshi iniciado'); fetchData(); }
    } catch (e) { toast.error('Erro'); }
  };

  const verifySatoshi = async () => {
    try {
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/satoshi-test/verify?status=verified`, { method: 'PUT', headers });
      toast.success('Teste de Satoshi verificado');
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const requestProof = async (proofType) => {
    try {
      const body = { proof_type: proofType };
      if (proofType === 'reserves' && deal) {
        body.amount = deal.quantity;
        body.asset = deal.asset;
      }
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof`, {
        method: 'POST', headers, body: JSON.stringify(body)
      });
      toast.success('Verificação solicitada');
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const verifyProof = async (proofType) => {
    try {
      await fetch(`${API}/api/otc-deals/deals/${dealId}/compliance/proof/${proofType}/verify?status=verified`, { method: 'PUT', headers });
      toast.success('Prova verificada');
      fetchData();
    } catch (e) { toast.error('Erro'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  const statusIcon = (status) => {
    if (status === 'verified') return <CheckCircle className="text-emerald-400" size={18} />;
    if (status === 'pending') return <Clock className="text-yellow-400" size={18} />;
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

      {/* Qualification Summary */}
      <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-summary">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { label: 'Carteiras', status: compliance?.wallets?.length > 0 && compliance.wallets.every(w => w.status === 'verified') ? 'pass' : compliance?.wallets?.some(w => w.status === 'verified') ? 'partial' : 'pending' },
              { label: 'KYT', status: compliance?.kyt?.status === 'clean' ? 'pass' : compliance?.kyt?.status === 'flagged' ? 'warn' : 'pending' },
              { label: 'Teste Satoshi', status: compliance?.satoshi_test?.status === 'verified' ? 'pass' : compliance?.satoshi_test?.status === 'pending' ? 'partial' : 'pending' },
              { label: 'Proof of Ownership', status: compliance?.proof_of_ownership?.status === 'verified' ? 'pass' : compliance?.proof_of_ownership?.status === 'pending' ? 'partial' : 'pending' },
              { label: 'Proof of Reserves', status: compliance?.proof_of_reserves?.status === 'verified' ? 'pass' : compliance?.proof_of_reserves?.status === 'pending' ? 'partial' : 'pending' },
            ].map((check, i) => (
              <div key={i} className="flex items-center gap-2">
                {check.status === 'pass' ? (
                  <CheckCircle className="text-emerald-400" size={16} />
                ) : check.status === 'partial' ? (
                  <Clock className="text-yellow-400" size={16} />
                ) : check.status === 'warn' ? (
                  <Shield className="text-orange-400" size={16} />
                ) : (
                  <Clock className="text-zinc-600" size={16} />
                )}
                <span className={`text-sm ${check.status === 'pass' ? 'text-emerald-400' : check.status === 'partial' ? 'text-yellow-400' : 'text-zinc-500'}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallets */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-wallets">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Wallet className="text-yellow-500" size={18} /> Carteiras de Negociação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {compliance?.wallets?.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Bitcoin className="text-orange-400" size={16} />
                  </div>
                  <div>
                    <code className="text-white text-sm">{w.address?.substring(0, 12)}...{w.address?.slice(-6)}</code>
                    <div className="flex gap-2 mt-1">
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{w.blockchain}</Badge>
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px]">{w.wallet_type}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {w.status === 'pending' && (
                    <>
                      <Button size="sm" className="h-6 bg-emerald-600 text-white text-[10px] px-2" onClick={() => verifyWallet(w.id, 'verified')}>Verificar</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-red-400 text-[10px] px-2" onClick={() => verifyWallet(w.id, 'failed')}>Rejeitar</Button>
                    </>
                  )}
                  {statusIcon(w.status)}
                </div>
              </div>
            ))}
            <Button variant="ghost" onClick={() => setShowAddWallet(true)} className="w-full text-zinc-500 hover:text-yellow-400 border border-dashed border-zinc-800 hover:border-yellow-500/30" data-testid="add-wallet-btn">
              <Plus size={14} className="mr-1" /> Adicionar Carteira
            </Button>
          </CardContent>
        </Card>

        {/* KYT - Read Only (data from KYT Forensic Analyst) */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-kyt">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <FileSearch className="text-purple-400" size={18} /> Análise KYT
              <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] ml-auto">Somente Leitura</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {compliance?.kyt?.status && compliance.kyt.status !== 'pending' ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={(compliance?.kyt?.risk_score || 0) > 60 ? '#22c55e' : (compliance?.kyt?.risk_score || 0) > 30 ? '#eab308' : '#ef4444'} strokeWidth="3" strokeDasharray={`${compliance?.kyt?.risk_score || 0}, 100`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-bold text-lg ${(compliance?.kyt?.risk_score || 0) > 60 ? 'text-emerald-400' : (compliance?.kyt?.risk_score || 0) > 30 ? 'text-yellow-400' : 'text-red-400'}`}>{compliance?.kyt?.risk_score || 0}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-xs uppercase">Status:</span>
                      <Badge className={
                        compliance?.kyt?.status === 'clean' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        compliance?.kyt?.status === 'flagged' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                        compliance?.kyt?.status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                        'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                      }>
                        {compliance?.kyt?.status === 'clean' ? 'Limpo' : compliance?.kyt?.status === 'flagged' ? 'Sinalizado' : compliance?.kyt?.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </Badge>
                    </div>
                    {compliance?.kyt?.flags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {compliance.kyt.flags.map((f, i) => (
                          <Badge key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {compliance?.kyt?.analyst_notes && (
                  <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800">
                    <p className="text-zinc-500 text-xs uppercase mb-1">Notas do Analista Forense</p>
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap">{compliance.kyt.analyst_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <FileSearch className="mx-auto text-zinc-600 mb-2" size={28} />
                <p className="text-zinc-500 text-sm">Análise KYT pendente</p>
                <p className="text-zinc-600 text-xs mt-1">O Analista Forense do departamento Risk & Compliance irá avaliar as carteiras deste negócio.</p>
              </div>
            )}

            {/* Per-wallet KYT details */}
            {compliance?.wallets?.some(w => w.kyt_score > 0 || w.kyt_status) && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Detalhe por Carteira</p>
                {compliance.wallets.filter(w => w.kyt_score > 0 || w.kyt_status).map((w, i) => (
                  <div key={w.id || i} className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <code className="text-zinc-400 text-xs font-mono">{w.address?.substring(0, 10)}...{w.address?.slice(-6)}</code>
                      <Badge className="bg-zinc-800 text-zinc-500 text-[10px]">{w.blockchain}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {w.kyt_score > 0 && (
                        <span className={`text-sm font-bold ${w.kyt_score > 60 ? 'text-emerald-400' : w.kyt_score > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {w.kyt_score}
                        </span>
                      )}
                      {w.kyt_analyst && <span className="text-zinc-600 text-[10px]">{w.kyt_analyst}</span>}
                      <Badge className={
                        w.kyt_status === 'clean' || w.kyt_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 text-[10px]' :
                        w.kyt_status === 'flagged' ? 'bg-orange-500/10 text-orange-400 text-[10px]' :
                        w.kyt_status === 'rejected' ? 'bg-red-500/10 text-red-400 text-[10px]' :
                        'bg-yellow-500/10 text-yellow-400 text-[10px]'
                      }>
                        {w.kyt_status === 'clean' || w.kyt_status === 'verified' ? 'Limpo' : w.kyt_status === 'flagged' ? 'Sinalizado' : w.kyt_status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Satoshi Test */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-satoshi">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Target className="text-cyan-400" size={18} /> Teste de Satoshi (AB Test)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {compliance?.satoshi_test?.status === 'not_started' ? (
              <Button onClick={startSatoshiTest} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white" data-testid="start-satoshi-test">
                <Send size={14} className="mr-2" /> Iniciar Teste
              </Button>
            ) : (
              <>
                <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 space-y-3">
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Valor de Teste</p>
                    <p className="text-orange-400 font-mono font-bold text-lg">{compliance?.satoshi_test?.test_amount} BTC</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">Endereço KBEX</p>
                    <div className="flex items-center gap-2">
                      <code className="text-yellow-400 text-xs font-mono bg-zinc-900 px-2 py-1 rounded flex-1 truncate">{compliance?.satoshi_test?.verification_address}</code>
                      <button onClick={() => copyToClipboard(compliance?.satoshi_test?.verification_address)} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700">
                        <Copy className="text-zinc-400" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                {compliance?.satoshi_test?.status === 'pending' ? (
                  <Button onClick={verifySatoshi} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" data-testid="verify-satoshi">
                    <CheckCircle size={14} className="mr-2" /> Marcar como Verificado
                  </Button>
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

        {/* Proofs */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="compliance-proofs">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Fingerprint className="text-yellow-500" size={18} /> Provas de Verificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Proof of Ownership */}
            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-blue-400" size={16} />
                  <span className="text-white font-medium text-sm">Proof of Ownership</span>
                </div>
                {statusIcon(compliance?.proof_of_ownership?.status)}
              </div>
              {compliance?.proof_of_ownership?.status === 'not_started' && (
                <Button onClick={() => requestProof('ownership')} className="w-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30" size="sm" data-testid="request-ownership">
                  <Send size={14} className="mr-2" /> Solicitar
                </Button>
              )}
              {compliance?.proof_of_ownership?.status === 'pending' && (
                <Button onClick={() => verifyProof('ownership')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" size="sm" data-testid="verify-ownership">
                  <CheckCircle size={14} className="mr-2" /> Verificar
                </Button>
              )}
            </div>

            {/* Proof of Reserves */}
            <div className="p-4 bg-zinc-950 rounded-lg border border-yellow-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="text-yellow-500" size={16} />
                  <span className="text-white font-medium text-sm">Proof of Reserves</span>
                </div>
                {statusIcon(compliance?.proof_of_reserves?.status)}
              </div>
              <p className="text-zinc-500 text-xs">Obrigatório antes da execução</p>
              {deal && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Reservas Necessárias</span>
                  <span className="text-white font-medium">{deal.quantity} {deal.asset}</span>
                </div>
              )}
              {compliance?.proof_of_reserves?.status === 'not_started' && (
                <Button onClick={() => requestProof('reserves')} className="w-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30" size="sm" data-testid="request-reserves">
                  <Send size={14} className="mr-2" /> Solicitar Verificação
                </Button>
              )}
              {compliance?.proof_of_reserves?.status === 'pending' && (
                <Button onClick={() => verifyProof('reserves')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" size="sm" data-testid="verify-reserves">
                  <CheckCircle size={14} className="mr-2" /> Verificar
                </Button>
              )}
            </div>
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
