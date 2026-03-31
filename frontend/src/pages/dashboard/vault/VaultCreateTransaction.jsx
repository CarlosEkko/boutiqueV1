import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { ShieldCheck, Send, ArrowLeft, ArrowRight, Check, Wallet, Users } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ASSETS = [
  { symbol: 'USDT', name: 'Tether', networks: ['TRC20', 'ERC20', 'BEP20'] },
  { symbol: 'BTC', name: 'Bitcoin', networks: ['Bitcoin'] },
  { symbol: 'ETH', name: 'Ethereum', networks: ['ERC20'] },
  { symbol: 'USDC', name: 'USD Coin', networks: ['ERC20', 'TRC20'] },
];

const VaultCreateTransaction = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [signatories, setSignatories] = useState([]);
  const [selectedSigners, setSelectedSigners] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    asset: 'USDT', network: 'TRC20', amount: '', destination_name: '',
    destination_address: '', source_wallet: 'Main Wallet', notes: ''
  });
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/vault/signatories`, { headers }).then(res => {
      const sigs = (res.data.signatories || []).filter(s => s.role !== 'viewer');
      setSignatories(sigs);
      setSelectedSigners(sigs.map(s => s.id));
    });
  }, []);

  const selectedAsset = ASSETS.find(a => a.symbol === form.asset);

  const canProceed = () => {
    if (step === 1) return form.destination_name && form.destination_address;
    if (step === 2) return form.amount > 0;
    if (step === 3) return selectedSigners.length >= 1;
    return false;
  };

  const toggleSigner = (id) => {
    setSelectedSigners(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/api/vault/transactions`, {
        ...form, amount: parseFloat(form.amount),
        selected_signer_ids: selectedSigners,
      }, { headers });
      toast.success(`Transação ${res.data.order_number} criada`);
      navigate(`/dashboard/vault/${res.data.transaction_id}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro ao criar'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="vault-create-tx">
      <button onClick={() => navigate('/dashboard/vault')} className="text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 text-sm">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <Send size={26} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-light text-zinc-50">Nova Transação</h1>
        <p className="text-zinc-500 text-sm mt-1">Criar uma transação com aprovação multi-assinatura</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              step === s ? 'bg-amber-500 text-zinc-950' : step > s ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
            }`}>
              {step > s ? <Check size={14} /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
          </div>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800/50">
        <CardContent className="p-8">
          {/* Step 1: Destination */}
          {step === 1 && (
            <div className="space-y-5" data-testid="step-destination">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Destino</h2>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-sm">Nome do Destino</Label>
                <Input value={form.destination_name} onChange={e => setForm(f => ({ ...f, destination_name: e.target.value }))}
                  placeholder="Ex: Trading Account #2" className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="dest-name-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-sm">Endereço da Wallet</Label>
                <Input value={form.destination_address} onChange={e => setForm(f => ({ ...f, destination_address: e.target.value }))}
                  placeholder="0x..." className="bg-zinc-800/50 border-zinc-700/50 text-white font-mono text-sm rounded-xl" data-testid="dest-address-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-sm">Wallet Origem</Label>
                <Input value={form.source_wallet} onChange={e => setForm(f => ({ ...f, source_wallet: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="source-wallet-input" />
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {step === 2 && (
            <div className="space-y-5" data-testid="step-amount">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Montante</h2>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-sm">Ativo</Label>
                <div className="grid grid-cols-4 gap-2">
                  {ASSETS.map(a => (
                    <button key={a.symbol} onClick={() => setForm(f => ({ ...f, asset: a.symbol, network: a.networks[0] }))}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        form.asset === a.symbol ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-400 hover:border-zinc-600'
                      }`} data-testid={`asset-${a.symbol}`}>
                      <span className="text-sm font-medium">{a.symbol}</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{a.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              {selectedAsset && selectedAsset.networks.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-sm">Network</Label>
                  <div className="flex gap-2">
                    {selectedAsset.networks.map(n => (
                      <button key={n} onClick={() => setForm(f => ({ ...f, network: n }))}
                        className={`px-4 py-2 rounded-full text-sm border transition-all ${
                          form.network === n ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-zinc-400 text-sm">Montante</Label>
                <div className="relative">
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="bg-zinc-800/50 border-zinc-700/50 text-white text-2xl font-mono font-light rounded-xl pr-20 h-16"
                    data-testid="amount-input" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{form.asset}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-400 text-sm">Notas (opcional)</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Motivo da transação..." className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="notes-input" />
              </div>
            </div>
          )}

          {/* Step 3: Signers */}
          {step === 3 && (
            <div className="space-y-5" data-testid="step-signers">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Selecionar Signatários</h2>
              <p className="text-zinc-500 text-xs">Escolha quem deve aprovar esta transação</p>
              {signatories.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">Nenhum signatário configurado</p>
                  <Button onClick={() => navigate('/dashboard/vault/signatories')} variant="outline" className="mt-3 border-amber-500/30 text-amber-400 rounded-full text-sm">
                    Configurar Signatários
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {signatories.map(s => {
                    const selected = selectedSigners.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSigner(s.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                          selected ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-800/20 border-zinc-700/30 hover:border-zinc-600'
                        }`} data-testid={`select-signer-${s.id}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                            selected ? 'bg-amber-500 border-amber-400 text-zinc-950' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}>{s.name?.charAt(0)?.toUpperCase()}</div>
                          <div className="text-left">
                            <p className="text-zinc-200 text-sm">{s.name}</p>
                            <p className="text-zinc-500 text-xs">{s.email}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selected ? 'bg-amber-500 border-amber-400' : 'bg-zinc-800 border-zinc-700'
                        }`}>
                          {selected && <Check size={12} className="text-zinc-950" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Summary */}
              <Card className="bg-zinc-800/30 border-zinc-700/30">
                <CardContent className="p-4">
                  <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Resumo</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-zinc-500">Ativo</span><span className="text-zinc-200 font-mono">{form.amount} {form.asset} ({form.network})</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Destino</span><span className="text-zinc-200">{form.destination_name}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Signatários</span><span className="text-amber-400">{selectedSigners.length} selecionados</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800/30">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-zinc-400 rounded-full">
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </Button>
            ) : <div />}
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full px-8" data-testid="next-step-btn">
                Continuar <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || !canProceed()}
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-full px-8 shadow-[0_0_20px_rgba(245,158,11,0.15)]" data-testid="submit-vault-tx-btn">
                <ShieldCheck size={18} className="mr-2" /> {submitting ? 'A criar...' : 'Criar Transação'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VaultCreateTransaction;
