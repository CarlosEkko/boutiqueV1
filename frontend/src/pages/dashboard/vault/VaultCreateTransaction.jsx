import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import { ShieldCheck, Send, ArrowLeft, ArrowRight, Check, Users, Coins, MapPin, UserCheck, Vault } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', networks: ['Bitcoin'], color: '#F7931A', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', networks: ['ERC20'], color: '#627EEA', icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether', networks: ['TRC20', 'ERC20', 'BEP20'], color: '#26A17B', icon: '₮' },
  { symbol: 'USDC', name: 'USD Coin', networks: ['ERC20', 'TRC20'], color: '#2775CA', icon: '$' },
  { symbol: 'SOL', name: 'Solana', networks: ['Solana'], color: '#9945FF', icon: 'S' },
  { symbol: 'BNB', name: 'BNB', networks: ['BEP20'], color: '#F3BA2F', icon: 'B' },
  { symbol: 'XRP', name: 'Ripple', networks: ['XRP'], color: '#23292F', icon: 'X' },
  { symbol: 'ADA', name: 'Cardano', networks: ['Cardano'], color: '#0033AD', icon: 'A' },
];

const STEP_CONFIG = [
  { num: 1, label: 'Ativo', icon: Coins },
  { num: 2, label: 'Destino', icon: MapPin },
  { num: 3, label: 'Aprovação', icon: UserCheck },
];

const VaultCreateTransaction = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [signatories, setSignatories] = useState([]);
  const [selectedSigners, setSelectedSigners] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [cofres, setCofres] = useState([]);
  const [form, setForm] = useState({
    asset: '', network: '', amount: '', destination_name: '',
    destination_address: '', source_wallet: '', notes: ''
  });
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/vault/signatories`, { headers }).then(res => {
      const sigs = (res.data.signatories || []).filter(s => s.role !== 'viewer');
      setSignatories(sigs);
      setSelectedSigners(sigs.map(s => s.id));
    }).catch((err) => { console.error('Failed to load signatories', err); });

    // Fetch user's cofres
    axios.get(`${API_URL}/api/omnibus/my-cofres`, { headers }).then(res => {
      if (res.data.has_cofres) {
        const list = (res.data.cofres || []).map(c => ({
          id: c._id,
          name: c.cofre_name || 'Cofre',
        }));
        setCofres(list);
        if (list.length > 0) {
          setForm(f => ({ ...f, source_wallet: list[0].name }));
        }
      }
    }).catch((err) => { console.error('Failed to load cofres', err); });
  }, [token]);

  const selectedAsset = ASSETS.find(a => a.symbol === form.asset);

  const canProceed = () => {
    if (step === 1) return form.asset && form.network && form.amount > 0;
    if (step === 2) return form.destination_name && form.destination_address;
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
    <div className="max-w-xl mx-auto space-y-5" data-testid="vault-create-tx">
      <button onClick={() => navigate('/dashboard/vault')} className="text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 text-sm">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Compact Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Send size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-zinc-50">Nova Transação</h1>
          <p className="text-zinc-500 text-xs">Envio com aprovação multi-assinatura</p>
        </div>
      </div>

      {/* Step Bar */}
      <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1">
        {STEP_CONFIG.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-all ${
              isActive ? 'bg-amber-500/10 text-amber-400' : isDone ? 'text-emerald-400' : 'text-zinc-600'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                isActive ? 'bg-amber-500 text-zinc-950' : isDone ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {isDone ? <Check size={12} /> : s.num}
              </div>
              <span className="font-medium hidden sm:inline">{s.label}</span>
              {i < STEP_CONFIG.length - 1 && <div className={`w-4 h-px ml-auto ${isDone ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <Card className="bg-zinc-900 border-zinc-800/50">
        <CardContent className="p-6">
          {/* Step 1: Asset + Network + Amount */}
          {step === 1 && (
            <div className="space-y-5" data-testid="step-asset">
              <div className="space-y-3">
                <Label className="text-zinc-400 text-sm">Selecionar Ativo</Label>
                <div className="grid grid-cols-4 gap-2">
                  {ASSETS.map(a => (
                    <button key={a.symbol} onClick={() => setForm(f => ({ ...f, asset: a.symbol, network: a.networks[0] }))}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        form.asset === a.symbol
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : 'border-zinc-800 bg-zinc-800/20 hover:border-zinc-700'
                      }`} data-testid={`asset-${a.symbol}`}>
                      <div className="w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: a.color }}>
                        {a.icon}
                      </div>
                      <span className={`text-xs font-medium ${form.asset === a.symbol ? 'text-amber-400' : 'text-zinc-400'}`}>{a.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedAsset && selectedAsset.networks.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-sm">Rede</Label>
                  <div className="flex gap-2">
                    {selectedAsset.networks.map(n => (
                      <button key={n} onClick={() => setForm(f => ({ ...f, network: n }))}
                        className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                          form.network === n
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500 hover:border-zinc-600'
                        }`} data-testid={`network-${n}`}>{n}</button>
                    ))}
                  </div>
                </div>
              )}

              {selectedAsset && selectedAsset.networks.length === 1 && (
                <div className="flex items-center gap-2">
                  <Label className="text-zinc-500 text-sm">Rede:</Label>
                  <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">{form.network}</Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Montante</Label>
                <div className="relative">
                  <Input type="number" step="any" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="bg-zinc-800/50 border-zinc-700/50 text-white text-xl font-mono font-light rounded-xl pr-20 h-14"
                    data-testid="amount-input" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">{form.asset || '...'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Notas (opcional)</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Motivo da transação..." className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="notes-input" />
              </div>
            </div>
          )}

          {/* Step 2: Destination */}
          {step === 2 && (
            <div className="space-y-5" data-testid="step-destination">
              {/* Selected asset summary */}
              <div className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: selectedAsset?.color || '#555' }}>
                  {selectedAsset?.icon}
                </div>
                <div>
                  <span className="text-zinc-200 text-sm font-medium">{form.amount} {form.asset}</span>
                  <span className="text-zinc-600 text-xs ml-2">({form.network})</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Nome do Destino</Label>
                <Input value={form.destination_name} onChange={e => setForm(f => ({ ...f, destination_name: e.target.value }))}
                  placeholder="Ex: Trading Kbex Dubai" className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="dest-name-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Endereço da Wallet</Label>
                <Input value={form.destination_address} onChange={e => setForm(f => ({ ...f, destination_address: e.target.value }))}
                  placeholder="0x..." className="bg-zinc-800/50 border-zinc-700/50 text-white font-mono text-sm rounded-xl" data-testid="dest-address-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Cofre de Origem</Label>
                {cofres.length > 0 ? (
                  <Select
                    value={form.source_wallet}
                    onValueChange={v => setForm(f => ({ ...f, source_wallet: v }))}
                  >
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="source-cofre-select">
                      <div className="flex items-center gap-2">
                        <Vault size={14} className="text-amber-500" />
                        <SelectValue placeholder="Selecionar cofre" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {cofres.map(c => (
                        <SelectItem
                          key={c.id}
                          value={c.name}
                          className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                          data-testid={`cofre-option-${c.id}`}
                        >
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.source_wallet} onChange={e => setForm(f => ({ ...f, source_wallet: e.target.value }))}
                    placeholder="Nome do cofre" className="bg-zinc-800/50 border-zinc-700/50 text-white rounded-xl" data-testid="source-wallet-input" />
                )}
              </div>
            </div>
          )}

          {/* Step 3: Signers + Review */}
          {step === 3 && (
            <div className="space-y-5" data-testid="step-signers">
              <h3 className="text-sm font-medium text-zinc-400">Selecionar Signatários</h3>
              {signatories.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={28} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">Nenhum signatário configurado</p>
                  <Button onClick={() => navigate('/dashboard/vault/signatories')} variant="outline" className="mt-3 border-amber-500/30 text-amber-400 rounded-lg text-sm">
                    Configurar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {signatories.map(s => {
                    const selected = selectedSigners.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSigner(s.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          selected ? 'bg-amber-500/5 border-amber-500/20' : 'bg-zinc-800/20 border-zinc-700/30 hover:border-zinc-600'
                        }`} data-testid={`select-signer-${s.id}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
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
              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4 space-y-2 text-sm">
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Resumo</h4>
                <div className="flex justify-between"><span className="text-zinc-500">Ativo</span><span className="text-zinc-200 font-mono">{form.amount} {form.asset}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Rede</span><span className="text-zinc-200">{form.network}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Cofre de Origem</span><span className="text-zinc-200">{form.source_wallet}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Destino</span><span className="text-zinc-200">{form.destination_name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Aprovações</span><span className="text-amber-400">{selectedSigners.length} signatário(s)</span></div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-zinc-800/30">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="text-zinc-400 rounded-lg">
                <ArrowLeft size={16} className="mr-1" /> Voltar
              </Button>
            ) : <div />}
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-lg px-6" data-testid="next-step-btn">
                Continuar <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || !canProceed()}
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-lg px-6 shadow-[0_0_20px_rgba(245,158,11,0.15)]" data-testid="submit-vault-tx-btn">
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
