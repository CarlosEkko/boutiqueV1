import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Settings2, Loader2, AlertCircle, Send, Wallet, FileCode2, Copy, ExternalLink, Unlink, RefreshCw, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const TokenManagementPage = () => {
  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [transferForm, setTransferForm] = useState({
    asset_id: '', source_vault_id: '', destination_address: '', amount: '', note: ''
  });

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/collections`, { headers });
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleTransfer = async () => {
    if (!transferForm.asset_id || !transferForm.source_vault_id || !transferForm.destination_address || !transferForm.amount) {
      toast.error('Preencha todos os campos obrigatórios'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/tokenization/tokens/transfer`, {
        method: 'POST', headers, body: JSON.stringify(transferForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Transferência submetida');
        setShowTransferModal(false);
        setTransferForm({ asset_id: '', source_vault_id: '', destination_address: '', amount: '', note: '' });
      } else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const handleUnlink = async (colId) => {
    try {
      const res = await fetch(`${API}/api/tokenization/tokens/unlink`, {
        method: 'POST', headers, body: JSON.stringify({ collection_id: colId, token_id: colId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Token deslinkado');
        fetchCollections();
      } else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro'); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  const filtered = collections.filter(c =>
    !searchTerm ||
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.symbol || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="token-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings2 className="text-[#D4AF37]" size={28} />
            Gestão de Tokens
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Contratos, wallets, transferências e operações avançadas</p>
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300" onClick={fetchCollections}>
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="bg-zinc-900 border-zinc-800 text-white pl-10" placeholder="Pesquisar tokens..." data-testid="search-tokens" />
      </div>

      {/* Token Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <Card className="bg-zinc-900/40 border-zinc-800 col-span-2">
            <CardContent className="p-8 text-center">
              <AlertCircle className="mx-auto text-zinc-600 mb-2" size={24} />
              <p className="text-zinc-500">{searchTerm ? 'Nenhum resultado' : 'Sem tokens'}</p>
            </CardContent>
          </Card>
        ) : filtered.map((col, i) => {
          const colId = col.id || col.contractAddress || `col-${i}`;
          const symbol = col.symbol || '???';
          const blockchain = col.blockchain || col.blockchainDescriptor || 'EVM';
          const contractAddr = col.contractAddress || col.contract_address || '';

          return (
            <Card key={colId} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-all" data-testid={`mgmt-card-${i}`}>
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
                      <span className="text-[#D4AF37] font-bold text-xs">{symbol.substring(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{col.name || 'Token'}</p>
                      <div className="flex gap-2 mt-0.5">
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px]">{blockchain}</Badge>
                        <Badge className={`text-[10px] ${col.status === 'COMPLETED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'}`}>
                          {col.status || 'active'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                {contractAddr && (
                  <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-zinc-500 text-xs mb-0.5">Contrato</p>
                      <p className="text-white font-mono text-xs">{contractAddr.substring(0, 20)}...{contractAddr.substring(contractAddr.length - 8)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-zinc-400 h-7 w-7 p-0" onClick={() => copyToClipboard(contractAddr)}>
                        <Copy size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-zinc-400 h-7 w-7 p-0" onClick={() => window.open(`https://etherscan.io/address/${contractAddr}`, '_blank')}>
                        <ExternalLink size={12} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ID */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">ID:</span>
                  <span className="text-zinc-300 font-mono">{colId.substring(0, 24)}...</span>
                  <Button size="sm" variant="ghost" className="text-zinc-500 h-5 w-5 p-0" onClick={() => copyToClipboard(colId)}>
                    <Copy size={10} />
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-zinc-800">
                  <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white text-xs h-8 flex-1"
                    onClick={() => { setSelectedToken(col); setTransferForm(p => ({ ...p, asset_id: colId })); setShowTransferModal(true); }}>
                    <Send size={12} className="mr-1.5" /> Transferir
                  </Button>
                  <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white text-xs h-8 flex-1">
                    <Wallet size={12} className="mr-1.5" /> Wallet
                  </Button>
                  <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white text-xs h-8 flex-1">
                    <FileCode2 size={12} className="mr-1.5" /> Contrato
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 text-xs h-8"
                    onClick={() => handleUnlink(colId)}>
                    <Unlink size={12} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transfer Modal */}
      <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="text-[#D4AF37]" size={20} /> Transferir Token</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vault de Origem</label>
              <Input value={transferForm.source_vault_id} onChange={e => setTransferForm(p => ({ ...p, source_vault_id: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da vault de origem" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Endereço de Destino</label>
              <Input value={transferForm.destination_address} onChange={e => setTransferForm(p => ({ ...p, destination_address: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 font-mono text-sm" placeholder="0x..." />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Quantidade</label>
              <Input type="number" value={transferForm.amount} onChange={e => setTransferForm(p => ({ ...p, amount: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 font-mono" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nota (opcional)</label>
              <Input value={transferForm.note} onChange={e => setTransferForm(p => ({ ...p, note: e.target.value }))}
                className="bg-zinc-800 border-zinc-700" placeholder="Nota da transferência" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleTransfer} disabled={actionLoading} className="bg-[#D4AF37] hover:bg-[#C4A030] text-black">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Transferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TokenManagementPage;
