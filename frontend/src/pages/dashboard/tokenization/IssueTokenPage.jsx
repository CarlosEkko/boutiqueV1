import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Gem, FilePlus2, Link2, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const BLOCKCHAINS = [
  { value: 'ETH', label: 'Ethereum', icon: 'ETH' },
  { value: 'MATIC_POLYGON', label: 'Polygon', icon: 'MATIC' },
  { value: 'SOL', label: 'Solana', icon: 'SOL' },
  { value: 'BNB_BSC', label: 'BNB Chain', icon: 'BNB' },
  { value: 'AVAX', label: 'Avalanche', icon: 'AVAX' },
  { value: 'BASE', label: 'Base', icon: 'BASE' },
  { value: 'ARB', label: 'Arbitrum', icon: 'ARB' },
  { value: 'XLM', label: 'Stellar', icon: 'XLM' },
  { value: 'XRP', label: 'Ripple', icon: 'XRP' },
];

const IssueTokenPage = () => {
  const { token } = useAuth();
  const [mode, setMode] = useState(null); // 'issue' | 'link'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [issueForm, setIssueForm] = useState({
    name: '', symbol: '', blockchain: '', vault_account_id: '', initial_supply: '0'
  });
  const [linkForm, setLinkForm] = useState({
    collection_id: '', token_id: ''
  });

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleIssue = async () => {
    if (!issueForm.name || !issueForm.symbol || !issueForm.blockchain) {
      toast.error('Preencha nome, símbolo e blockchain'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/collections`, {
        method: 'POST', headers, body: JSON.stringify({
          name: issueForm.name,
          symbol: issueForm.symbol,
          blockchain: issueForm.blockchain,
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        toast.success(data.message || 'Token emitido com sucesso');
      } else { toast.error(data.detail || 'Erro ao emitir token'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setLoading(false);
  };

  const handleLink = async () => {
    if (!linkForm.collection_id || !linkForm.token_id) {
      toast.error('Preencha todos os campos'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/tokens/link`, {
        method: 'POST', headers, body: JSON.stringify(linkForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        toast.success('Token linkado com sucesso');
      } else { toast.error(data.detail || 'Erro ao linkar token'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center space-y-6" data-testid="issue-success">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle className="text-emerald-400" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white">Token {mode === 'issue' ? 'Emitido' : 'Linkado'}</h2>
        <p className="text-zinc-400">A operação foi submetida com sucesso à blockchain.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.href = '/dashboard/tokenization'} className="bg-[#D4AF37] hover:bg-[#C4A030] text-black">
            Ver Tokens
          </Button>
          <Button variant="outline" className="border-zinc-700" onClick={() => { setSuccess(false); setMode(null); }}>
            Criar Outro
          </Button>
        </div>
      </div>
    );
  }

  // Mode selection
  if (!mode) {
    return (
      <div className="space-y-6" data-testid="issue-token-page">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FilePlus2 className="text-[#D4AF37]" size={28} />
            Emitir Token
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Emita um novo token ou linke um token existente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <Card className="bg-zinc-900/60 border-zinc-800 hover:border-[#D4AF37]/40 cursor-pointer transition-all group"
            onClick={() => setMode('issue')} data-testid="issue-new-option">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-[#D4AF37]/20 transition-colors">
                <FilePlus2 className="text-[#D4AF37]" size={28} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Emitir Novo Token</h3>
              <p className="text-zinc-500 text-sm">Crie e implante um novo token EVM, Stellar ou Ripple numa blockchain suportada</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 cursor-pointer transition-all group"
            onClick={() => setMode('link')} data-testid="link-existing-option">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4 group-hover:bg-zinc-700 transition-colors">
                <Link2 className="text-zinc-300" size={28} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Linkar Token Existente</h3>
              <p className="text-zinc-500 text-sm">Associe um token previamente emitido para o gerir através da plataforma</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl" data-testid="issue-form">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={() => setMode(null)}>
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {mode === 'issue' ? <FilePlus2 className="text-[#D4AF37]" size={24} /> : <Link2 className="text-zinc-300" size={24} />}
            {mode === 'issue' ? 'Emitir Novo Token' : 'Linkar Token Existente'}
          </h1>
        </div>
      </div>

      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-6 space-y-5">
          {mode === 'issue' ? (
            <>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Nome do Token</label>
                <Input value={issueForm.name} onChange={e => setIssueForm(p => ({ ...p, name: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="Ex: KBEX Gold Token" data-testid="issue-name" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Símbolo</label>
                <Input value={issueForm.symbol} onChange={e => setIssueForm(p => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="Ex: KBXG" maxLength={10} data-testid="issue-symbol" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Blockchain</label>
                <Select value={issueForm.blockchain} onValueChange={v => setIssueForm(p => ({ ...p, blockchain: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="issue-blockchain">
                    <SelectValue placeholder="Selecionar blockchain" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {BLOCKCHAINS.map(b => (
                      <SelectItem key={b.value} value={b.value} className="text-white">
                        <span className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs w-10">{b.icon}</span>
                          <span>{b.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Vault Account ID</label>
                <Input value={issueForm.vault_account_id} onChange={e => setIssueForm(p => ({ ...p, vault_account_id: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="ID da vault emissora" data-testid="issue-vault" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Supply Inicial</label>
                <Input type="number" value={issueForm.initial_supply} onChange={e => setIssueForm(p => ({ ...p, initial_supply: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="0" data-testid="issue-supply" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Collection ID</label>
                <Input value={linkForm.collection_id} onChange={e => setLinkForm(p => ({ ...p, collection_id: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="ID da coleção" data-testid="link-collection" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Token ID</label>
                <Input value={linkForm.token_id} onChange={e => setLinkForm(p => ({ ...p, token_id: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="ID do token a linkar" data-testid="link-token" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="border-zinc-700 flex-1" onClick={() => setMode(null)}>
              Cancelar
            </Button>
            <Button className="bg-[#D4AF37] hover:bg-[#C4A030] text-black flex-1" disabled={loading}
              onClick={mode === 'issue' ? handleIssue : handleLink} data-testid="submit-btn">
              {loading ? <Loader2 className="animate-spin" size={16} /> : (mode === 'issue' ? 'Emitir Token' : 'Linkar Token')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueTokenPage;
