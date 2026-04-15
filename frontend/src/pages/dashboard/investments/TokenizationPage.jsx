import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Gem, Plus, Flame, Send, Link2, Unlink, Loader2, AlertCircle, RefreshCw, FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API = process.env.REACT_APP_BACKEND_URL;

const BLOCKCHAINS = [
  { value: 'ETH', label: 'Ethereum' },
  { value: 'MATIC_POLYGON', label: 'Polygon' },
  { value: 'SOL', label: 'Solana' },
  { value: 'BNB_BSC', label: 'BNB Chain' },
  { value: 'AVAX', label: 'Avalanche' },
  { value: 'BASE', label: 'Base' },
  { value: 'ARB', label: 'Arbitrum' },
];

const TokenizationPage = () => {
  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collections');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', symbol: '', blockchain: '' });
  const [mintForm, setMintForm] = useState({ collection_id: '', vault_account_id: '', amount: '' });
  const [burnForm, setBurnForm] = useState({ collection_id: '', vault_account_id: '', amount: '' });
  const [issueForm, setIssueForm] = useState({ vault_account_id: '', asset_id: '', blockchain: '', contract_address: '' });

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchAll(); }, [token]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [collectionsR, historyR] = await Promise.all([
        fetch(`${API}/api/tokenization/collections`, { headers }).then(r => r.json()),
        fetch(`${API}/api/tokenization/history`, { headers }).then(r => r.json()),
      ]);
      setCollections(collectionsR.collections || []);
      setHistory(historyR.history || []);
    } catch (e) { console.error('Tokenization fetch error:', e); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.symbol || !createForm.blockchain) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/collections`, {
        method: 'POST', headers, body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Coleção criada');
        setShowCreateModal(false);
        setCreateForm({ name: '', symbol: '', blockchain: '' });
        fetchAll();
      } else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const handleMint = async () => {
    if (!mintForm.collection_id || !mintForm.vault_account_id || !mintForm.amount) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/tokens/mint`, {
        method: 'POST', headers, body: JSON.stringify(mintForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Mint iniciado');
        setShowMintModal(false);
        setMintForm({ collection_id: '', vault_account_id: '', amount: '' });
        fetchAll();
      } else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const handleBurn = async () => {
    if (!burnForm.collection_id || !burnForm.vault_account_id || !burnForm.amount) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/tokens/burn`, {
        method: 'POST', headers, body: JSON.stringify(burnForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Burn iniciado');
        setShowBurnModal(false);
        setBurnForm({ collection_id: '', vault_account_id: '', amount: '' });
        fetchAll();
      } else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const handleIssue = async () => {
    if (!issueForm.vault_account_id || !issueForm.asset_id || !issueForm.blockchain) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/tokens/issue`, {
        method: 'POST', headers, body: JSON.stringify(issueForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Token emitido');
        setShowIssueModal(false);
        setIssueForm({ vault_account_id: '', asset_id: '', blockchain: '', contract_address: '' });
        fetchAll();
      } else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const tabs = [
    { key: 'collections', label: 'Coleções', icon: Gem },
    { key: 'history', label: 'Histórico', icon: RefreshCw },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64" data-testid="tokenization-loading">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="tokenization-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Gem className="text-[#D4AF37]" size={28} />
            Tokenização
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Crie, emita e gerencie tokens em múltiplas blockchains</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowCreateModal(true)} className="bg-[#D4AF37] hover:bg-[#C4A030] text-black" data-testid="create-collection-btn">
            <Plus size={16} className="mr-2" /> Nova Coleção
          </Button>
          <Button onClick={() => setShowIssueModal(true)} variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37]" data-testid="issue-token-btn">
            <FileCode2 size={16} className="mr-2" /> Emitir Token
          </Button>
          <Button onClick={() => setShowMintModal(true)} variant="outline" className="border-emerald-500/30 text-emerald-400" data-testid="mint-btn">
            <Plus size={16} className="mr-2" /> Mint
          </Button>
          <Button onClick={() => setShowBurnModal(true)} variant="outline" className="border-red-500/30 text-red-400" data-testid="burn-btn">
            <Flame size={16} className="mr-2" /> Burn
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Coleções</p>
            <p className="text-2xl font-bold text-white mt-1" data-testid="collections-count">{collections.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Blockchains</p>
            <p className="text-2xl font-bold text-white mt-1">{BLOCKCHAINS.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Ações Registadas</p>
            <p className="text-2xl font-bold text-[#D4AF37] mt-1">{history.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-zinc-800 text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-zinc-400 hover:text-white'
            }`} data-testid={`tab-${tab.key}`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Collections Tab */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="collections-list">
          {collections.length === 0 ? (
            <Card className="bg-zinc-900/40 border-zinc-800 col-span-2">
              <CardContent className="p-8 text-center">
                <AlertCircle className="mx-auto text-zinc-600 mb-3" size={32} />
                <p className="text-zinc-400">Sem coleções de tokens</p>
                <p className="text-xs text-zinc-500 mt-1">Clique em "Nova Coleção" para começar</p>
              </CardContent>
            </Card>
          ) : collections.map((col, i) => (
            <Card key={i} className="bg-zinc-900/60 border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                      <Gem className="text-[#D4AF37]" size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{col.name || col.symbol || 'Coleção'}</p>
                      <p className="text-xs text-zinc-500">{col.symbol || ''}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">{col.blockchain || col.blockchainDescriptor || 'EVM'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>ID: <span className="text-white font-mono">{(col.id || '').substring(0, 12)}...</span></div>
                  <div>Status: <span className={col.status === 'COMPLETED' ? 'text-emerald-400' : 'text-yellow-400'}>{col.status || 'active'}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2" data-testid="tokenization-history">
          {history.length === 0 ? (
            <Card className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-400">Sem histórico de tokenização</CardContent>
            </Card>
          ) : history.map((h, i) => (
            <Card key={i} className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    h.action === 'create_collection' ? 'bg-[#D4AF37]' :
                    h.action === 'mint' ? 'bg-emerald-400' :
                    h.action === 'burn' ? 'bg-red-400' :
                    h.action === 'issue_token' ? 'bg-blue-400' : 'bg-zinc-400'
                  }`} />
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{h.action?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-zinc-500">{h.collection_name || h.asset_id || ''} {h.amount ? `| ${h.amount}` : ''} {h.blockchain ? `| ${h.blockchain}` : ''}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{h.created_at ? formatDate(h.created_at, true) : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="text-[#D4AF37]" size={20} /> Nova Coleção</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nome</label>
              <Input value={createForm.name} onChange={e => setCreateForm(p => ({...p, name: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="Ex: KBEX Gold Token" data-testid="create-name-input" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Símbolo</label>
              <Input value={createForm.symbol} onChange={e => setCreateForm(p => ({...p, symbol: e.target.value.toUpperCase()}))}
                className="bg-zinc-800 border-zinc-700" placeholder="Ex: KBXG" maxLength={10} data-testid="create-symbol-input" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Blockchain</label>
              <Select value={createForm.blockchain} onValueChange={v => setCreateForm(p => ({...p, blockchain: v}))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="create-blockchain-select"><SelectValue placeholder="Selecionar blockchain" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {BLOCKCHAINS.map(b => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleCreate} disabled={actionLoading} className="bg-[#D4AF37] hover:bg-[#C4A030] text-black" data-testid="create-confirm-btn">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Criar Coleção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Token Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileCode2 className="text-blue-400" size={20} /> Emitir Token</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vault Account ID</label>
              <Input value={issueForm.vault_account_id} onChange={e => setIssueForm(p => ({...p, vault_account_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da vault" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Asset ID</label>
              <Input value={issueForm.asset_id} onChange={e => setIssueForm(p => ({...p, asset_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="Ex: ETH_TEST" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Blockchain</label>
              <Select value={issueForm.blockchain} onValueChange={v => setIssueForm(p => ({...p, blockchain: v}))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Selecionar blockchain" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {BLOCKCHAINS.map(b => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Contract Address</label>
              <Input value={issueForm.contract_address} onChange={e => setIssueForm(p => ({...p, contract_address: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="0x..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleIssue} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-500" data-testid="issue-confirm-btn">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Emitir Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mint Modal */}
      <Dialog open={showMintModal} onOpenChange={setShowMintModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="text-emerald-400" size={20} /> Mint Tokens</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Collection ID</label>
              <Input value={mintForm.collection_id} onChange={e => setMintForm(p => ({...p, collection_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da coleção" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vault Account ID</label>
              <Input value={mintForm.vault_account_id} onChange={e => setMintForm(p => ({...p, vault_account_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da vault" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Quantidade</label>
              <Input type="number" value={mintForm.amount} onChange={e => setMintForm(p => ({...p, amount: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMintModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleMint} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500" data-testid="mint-confirm-btn">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Mint'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Burn Modal */}
      <Dialog open={showBurnModal} onOpenChange={setShowBurnModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Flame className="text-red-400" size={20} /> Burn Tokens</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Collection ID</label>
              <Input value={burnForm.collection_id} onChange={e => setBurnForm(p => ({...p, collection_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da coleção" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vault Account ID</label>
              <Input value={burnForm.vault_account_id} onChange={e => setBurnForm(p => ({...p, vault_account_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da vault" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Quantidade</label>
              <Input type="number" value={burnForm.amount} onChange={e => setBurnForm(p => ({...p, amount: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBurnModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleBurn} disabled={actionLoading} className="bg-red-600 hover:bg-red-500" data-testid="burn-confirm-btn">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Burn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TokenizationPage;
