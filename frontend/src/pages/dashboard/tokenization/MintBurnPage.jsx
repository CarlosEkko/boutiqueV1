import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Flame, Plus, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API = process.env.REACT_APP_BACKEND_URL;

const MintBurnPage = () => {
  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('mint');
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ collection_id: '', vault_account_id: '', amount: '' });

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchData();
    // Check URL params for pre-selected collection
    const params = new URLSearchParams(window.location.search);
    const col = params.get('collection');
    const action = params.get('action');
    if (col) setForm(p => ({ ...p, collection_id: col }));
    if (action === 'burn') setActiveTab('burn');
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colRes, histRes] = await Promise.all([
        fetch(`${API}/api/tokenization/collections`, { headers }).then(r => r.json()),
        fetch(`${API}/api/tokenization/history`, { headers }).then(r => r.json()),
      ]);
      setCollections(colRes.collections || []);
      const mintBurnHistory = (histRes.history || []).filter(h => h.action === 'mint' || h.action === 'burn');
      setHistory(mintBurnHistory);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAction = async () => {
    if (!form.collection_id || !form.vault_account_id || !form.amount) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const endpoint = activeTab === 'mint' ? 'mint' : 'burn';
      const res = await fetch(`${API}/api/tokenization/tokens/${endpoint}`, {
        method: 'POST', headers, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `${activeTab === 'mint' ? 'Mint' : 'Burn'} iniciado`);
        setForm({ collection_id: '', vault_account_id: '', amount: '' });
        fetchData();
      } else { toast.error(data.detail || 'Erro na operação'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="mint-burn-page">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Flame className="text-[#D4AF37]" size={28} />
          Mint & Burn
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Emita novos tokens (Mint) ou destrua tokens existentes (Burn)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Form */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-6 space-y-5">
            {/* Tab Toggle */}
            <div className="flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('mint')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'mint' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                }`} data-testid="mint-tab">
                <Plus size={16} /> Mint
              </button>
              <button
                onClick={() => setActiveTab('burn')}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'burn' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                }`} data-testid="burn-tab">
                <Flame size={16} /> Burn
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Token</label>
                <Select value={form.collection_id} onValueChange={v => setForm(p => ({ ...p, collection_id: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="select-token">
                    <SelectValue placeholder="Selecionar token" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                    {collections.map((col, i) => (
                      <SelectItem key={i} value={col.id || col.contractAddress || `col-${i}`} className="text-white">
                        {col.name || col.symbol || 'Token'} ({col.symbol || '???'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Vault Account ID</label>
                <Input value={form.vault_account_id} onChange={e => setForm(p => ({ ...p, vault_account_id: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white" placeholder="ID da vault" data-testid="vault-input" />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Quantidade</label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white text-lg font-mono" placeholder="0" data-testid="amount-input" />
              </div>

              <Button className={`w-full py-6 text-base font-semibold ${
                activeTab === 'mint' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
              }`} disabled={actionLoading} onClick={handleAction} data-testid="confirm-action-btn">
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> :
                  activeTab === 'mint' ? 'Confirmar Mint' : 'Confirmar Burn'
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-4">Histórico Mint & Burn</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto text-zinc-600 mb-2" size={24} />
                  <p className="text-zinc-500 text-sm">Sem operações registadas</p>
                </div>
              ) : history.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${h.action === 'mint' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-white text-sm font-medium capitalize">{h.action}</p>
                      <p className="text-zinc-500 text-xs">{h.collection_name || h.collection_id?.substring(0, 12) || ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono text-sm">{h.amount || '—'}</p>
                    <p className="text-zinc-500 text-xs">{h.created_at ? formatDate(h.created_at) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MintBurnPage;
