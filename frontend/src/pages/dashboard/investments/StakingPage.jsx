import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Coins, TrendingUp, ArrowUpCircle, ArrowDownCircle, Gift, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const StakingPage = () => {
  const { token } = useAuth();
  const [chains, setChains] = useState([]);
  const [providers, setProviders] = useState([]);
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('positions');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [stakeForm, setStakeForm] = useState({ vault_account_id: '', provider_id: '', amount: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [chainsR, providersR, positionsR, summaryR, historyR] = await Promise.all([
        fetch(`${API}/api/staking/chains`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/providers`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/positions`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/summary`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/history`, { headers }).then(r => r.json()),
      ]);
      setChains(chainsR.chains || []);
      setProviders(providersR.providers || []);
      setPositions(positionsR.positions || []);
      setSummary(summaryR.summary || null);
      setHistory(historyR.history || []);
    } catch (e) {
      console.error('Staking fetch error:', e);
    }
    setLoading(false);
  };

  const handleStake = async () => {
    if (!stakeForm.vault_account_id || !stakeForm.provider_id || !stakeForm.amount) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/staking/stake`, {
        method: 'POST', headers, body: JSON.stringify(stakeForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Staking iniciado');
        setShowStakeModal(false);
        setStakeForm({ vault_account_id: '', provider_id: '', amount: '' });
        fetchAll();
      } else {
        toast.error(data.detail || 'Erro ao fazer staking');
      }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const handleUnstake = async () => {
    if (!stakeForm.vault_account_id || !stakeForm.provider_id || !stakeForm.amount) {
      toast.error('Preencha todos os campos'); return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/api/staking/unstake`, {
        method: 'POST', headers, body: JSON.stringify(stakeForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Unstaking iniciado');
        setShowUnstakeModal(false);
        setStakeForm({ vault_account_id: '', provider_id: '', amount: '' });
        fetchAll();
      } else {
        toast.error(data.detail || 'Erro ao fazer unstaking');
      }
    } catch (e) { toast.error('Erro de conexão'); }
    setActionLoading(false);
  };

  const handleClaimRewards = async (position) => {
    try {
      const res = await fetch(`${API}/api/staking/claim-rewards`, {
        method: 'POST', headers,
        body: JSON.stringify({
          vault_account_id: position.vaultAccountId || '',
          provider_id: position.providerId || position.chainDescriptor || '',
        })
      });
      const data = await res.json();
      if (data.success) { toast.success('Claim de recompensas iniciado'); fetchAll(); }
      else { toast.error(data.detail || 'Erro'); }
    } catch (e) { toast.error('Erro de conexão'); }
  };

  const tabs = [
    { key: 'positions', label: 'Posições', icon: Coins },
    { key: 'providers', label: 'Validadores', icon: TrendingUp },
    { key: 'chains', label: 'Redes', icon: RefreshCw },
    { key: 'history', label: 'Histórico', icon: Gift },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64" data-testid="staking-loading">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="staking-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Coins className="text-[#D4AF37]" size={28} />
            Staking
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Gerencie as suas posições de staking delegado</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowStakeModal(true)} className="bg-emerald-600 hover:bg-emerald-500" data-testid="stake-btn">
            <ArrowUpCircle size={16} className="mr-2" /> Stake
          </Button>
          <Button onClick={() => setShowUnstakeModal(true)} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" data-testid="unstake-btn">
            <ArrowDownCircle size={16} className="mr-2" /> Unstake
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Posições Ativas</p>
            <p className="text-2xl font-bold text-white mt-1" data-testid="positions-count">{positions.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Validadores</p>
            <p className="text-2xl font-bold text-white mt-1">{providers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Redes Suportadas</p>
            <p className="text-2xl font-bold text-white mt-1">{chains.length}</p>
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

      {/* Tab Content */}
      {activeTab === 'positions' && (
        <div className="space-y-3" data-testid="positions-list">
          {positions.length === 0 ? (
            <Card className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-8 text-center">
                <AlertCircle className="mx-auto text-zinc-600 mb-3" size={32} />
                <p className="text-zinc-400">Sem posições de staking ativas</p>
                <p className="text-xs text-zinc-500 mt-1">Clique em "Stake" para começar</p>
              </CardContent>
            </Card>
          ) : positions.map((pos, i) => (
            <Card key={i} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                    <Coins className="text-[#D4AF37]" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{pos.chainDescriptor || pos.chain || 'N/A'}</p>
                    <p className="text-xs text-zinc-500">Vault: {pos.vaultAccountId || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-white font-semibold">{pos.amount || pos.stakedAmount || '0'}</p>
                    <p className="text-xs text-emerald-400">{pos.rewardsAmount ? `+${pos.rewardsAmount} rewards` : ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    pos.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                    pos.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-zinc-700 text-zinc-300'
                  }`}>{pos.status || 'active'}</span>
                  {pos.rewardsAmount && parseFloat(pos.rewardsAmount) > 0 && (
                    <Button size="sm" variant="ghost" className="text-[#D4AF37] hover:bg-[#D4AF37]/10" onClick={() => handleClaimRewards(pos)}>
                      <Gift size={14} className="mr-1" /> Claim
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="providers-list">
          {providers.map((prov, i) => (
            <Card key={i} className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-medium">{prov.chainDescriptor ? `Validador ${prov.chainDescriptor}` : `Validador ${i + 1}`}</p>
                  <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-1 rounded">{prov.chainDescriptor || ''}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div>APY: <span className="text-emerald-400 font-medium">{prov.apy || prov.apr || 'N/A'}%</span></div>
                  <div>Min: <span className="text-white">{prov.minStakeAmount || 'N/A'}</span></div>
                  <div>Lock-up: <span className="text-white">{prov.lockupPeriod || 'Flexível'}</span></div>
                  <div>Fee: <span className="text-white">{prov.serviceFee || '0'}%</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
          {providers.length === 0 && (
            <Card className="bg-zinc-900/40 border-zinc-800 col-span-2">
              <CardContent className="p-8 text-center text-zinc-400">Nenhum validador disponível</CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'chains' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="chains-list">
          {chains.map((chain, i) => (
            <Card key={i} className="bg-zinc-900/60 border-zinc-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Coins className="text-[#D4AF37]" size={18} />
                </div>
                <div>
                  <p className="text-white font-medium">{chain.chainDescriptor || chain.name || chain}</p>
                  <p className="text-xs text-zinc-500">{typeof chain === 'object' ? (chain.stakingType || 'Delegated') : ''}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2" data-testid="staking-history">
          {history.length === 0 ? (
            <Card className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-8 text-center text-zinc-400">Sem histórico de staking</CardContent>
            </Card>
          ) : history.map((h, i) => (
            <Card key={i} className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    h.action === 'stake' ? 'bg-emerald-400' :
                    h.action === 'unstake' ? 'bg-red-400' : 'bg-[#D4AF37]'
                  }`} />
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{h.action?.replace('_', ' ')}</p>
                    <p className="text-xs text-zinc-500">{h.amount || ''}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{h.created_at ? new Date(h.created_at).toLocaleString('pt-PT') : ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stake Modal */}
      <Dialog open={showStakeModal} onOpenChange={setShowStakeModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowUpCircle className="text-emerald-400" size={20} /> Stake</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vault Account ID</label>
              <Input value={stakeForm.vault_account_id} onChange={e => setStakeForm(p => ({...p, vault_account_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da vault" data-testid="stake-vault-input" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Validador</label>
              <Select value={stakeForm.provider_id} onValueChange={v => setStakeForm(p => ({...p, provider_id: v}))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700" data-testid="stake-provider-select">
                  <SelectValue placeholder="Selecionar validador" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {providers.map((p, i) => (
                    <SelectItem key={i} value={p.id || p.providerId || `prov-${i}`}>
                      {p.chainDescriptor ? `Validador ${p.chainDescriptor}` : `Validador ${i + 1}`} ({p.chainDescriptor || ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Montante</label>
              <Input type="number" value={stakeForm.amount} onChange={e => setStakeForm(p => ({...p, amount: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="0.00" data-testid="stake-amount-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStakeModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleStake} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500" data-testid="stake-confirm-btn">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Stake'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unstake Modal */}
      <Dialog open={showUnstakeModal} onOpenChange={setShowUnstakeModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowDownCircle className="text-red-400" size={20} /> Unstake</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Vault Account ID</label>
              <Input value={stakeForm.vault_account_id} onChange={e => setStakeForm(p => ({...p, vault_account_id: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="ID da vault" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Validador</label>
              <Select value={stakeForm.provider_id} onValueChange={v => setStakeForm(p => ({...p, provider_id: v}))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue placeholder="Selecionar validador" /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {providers.map((p, i) => (
                    <SelectItem key={i} value={p.id || p.providerId || `prov-${i}`}>
                      {p.chainDescriptor ? `Validador ${p.chainDescriptor}` : `Validador ${i + 1}`} ({p.chainDescriptor || ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Montante</label>
              <Input type="number" value={stakeForm.amount} onChange={e => setStakeForm(p => ({...p, amount: e.target.value}))}
                className="bg-zinc-800 border-zinc-700" placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnstakeModal(false)} className="border-zinc-700">Cancelar</Button>
            <Button onClick={handleUnstake} disabled={actionLoading} className="bg-red-600 hover:bg-red-500" data-testid="unstake-confirm-btn">
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Unstake'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StakingPage;
