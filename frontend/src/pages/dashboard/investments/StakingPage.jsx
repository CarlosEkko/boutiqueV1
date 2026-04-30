import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  Coins, TrendingUp, ArrowUpCircle, ArrowDownCircle,
  Loader2, AlertCircle, ChevronRight, ChevronLeft,
  Check, Clock, Gift, History, Layers
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── crypto colour map ─── */
const ASSET_COLORS = {
  ETH: { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-400', accent: '#818cf8' },
  SOL: { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-400', accent: '#a78bfa' },
  MATIC: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', accent: '#c084fc' },
  ATOM: { bg: 'bg-sky-500/15', border: 'border-sky-500/30', text: 'text-sky-400', accent: '#38bdf8' },
  OSMO: { bg: 'bg-fuchsia-500/15', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', accent: '#e879f9' },
};

const ASSET_ICONS = {
  ETH: '⟠', SOL: '◎', MATIC: '⬡', ATOM: '⚛', OSMO: '🧬',
};

const StakingPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  /* ─── state ─── */
  const [assets, setAssets] = useState([]);
  const [providers, setProviders] = useState([]);
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('positions');

  /* wizard state */
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedValidator, setSelectedValidator] = useState(null);
  const [amount, setAmount] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');

  /* unstake */
  const [unstakeOpen, setUnstakeOpen] = useState(false);
  const [unstakePos, setUnstakePos] = useState(null);
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [unstakeLoading, setUnstakeLoading] = useState(false);

  /* ─── fetch ─── */
  useEffect(() => { fetchAll(); }, [token]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [assetsR, posR, sumR, histR] = await Promise.all([
        fetch(`${API}/api/staking/assets`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/positions`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/summary`, { headers }).then(r => r.json()),
        fetch(`${API}/api/staking/history`, { headers }).then(r => r.json()),
      ]);
      setAssets(assetsR.assets || []);
      setPositions(posR.positions || []);
      setSummary(sumR.summary || null);
      setHistory(histR.history || []);
    } catch (e) {
      console.error('Staking fetch error:', e);
    }
    setLoading(false);
  };

  /* ─── fetch providers for selected asset ─── */
  const fetchProviders = async (chain) => {
    try {
      const res = await fetch(`${API}/api/staking/providers?chain=${chain}`, { headers });
      const data = await res.json();
      setProviders(data.providers || []);
    } catch {
      setProviders([]);
    }
  };

  /* ─── wizard helpers ─── */
  const resetWizard = () => {
    setStep(1);
    setSelectedAsset(null);
    setSelectedValidator(null);
    setAmount('');
    setSelectedProvider('');
    setNote('');
    setAmountError('');
    setProviders([]);
  };

  const openWizard = () => { resetWizard(); setWizardOpen(true); };

  const selectAsset = (asset) => {
    setSelectedAsset(asset);
    setSelectedValidator(null);
    setAmount('');
    setAmountError('');
    fetchProviders(asset.id);
    // ETH has validator types → go to step 2, others skip to step 3
    if (asset.validator_types && asset.validator_types.length > 0) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const selectValidatorType = (vt) => {
    setSelectedValidator(vt);
    setAmount('');
    setAmountError('');
    setStep(3);
  };

  const validateAmount = (val) => {
    const num = parseFloat(val);
    if (!val || isNaN(num) || num <= 0) {
      setAmountError('Insira um montante válido');
      return false;
    }
    if (!selectedAsset) return false;

    if (num < selectedAsset.min_stake) {
      setAmountError(`Mínimo: ${selectedAsset.min_stake} ${selectedAsset.symbol}`);
      return false;
    }

    if (selectedAsset.id === 'ETH' && selectedValidator) {
      if (selectedValidator.id === 'compounding') {
        if (num < 32 || num > 2048) {
          setAmountError('Compounding: 32 a 2048 ETH');
          return false;
        }
      } else if (selectedValidator.id === 'legacy') {
        if (num < 32 || num % 32 !== 0) {
          setAmountError('Legacy: múltiplos exatos de 32 ETH');
          return false;
        }
      }
    }

    setAmountError('');
    return true;
  };

  const goToProvider = () => {
    if (validateAmount(amount)) setStep(4);
  };

  const goToReview = () => {
    if (!selectedProvider) {
      toast.error('Selecione um provider');
      return;
    }
    setStep(5);
  };

  /* ─── submit stake ─── */
  const handleStake = async () => {
    setSubmitting(true);
    try {
      const provObj = providers.find(p => p.id === selectedProvider);
      const body = {
        asset_id: selectedAsset.id,
        validator_type: selectedValidator?.id || null,
        provider_id: selectedProvider,
        provider_name: provObj?.name || selectedProvider,
        amount: parseFloat(amount),
        note,
      };
      const res = await fetch(`${API}/api/staking/stake`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Staking iniciado com sucesso');
        setWizardOpen(false);
        resetWizard();
        fetchAll();
      } else {
        toast.error(data.detail || 'Erro ao submeter staking');
      }
    } catch {
      toast.error('Erro de conexão');
    }
    setSubmitting(false);
  };

  /* ─── unstake ─── */
  const openUnstake = (pos) => {
    setUnstakePos(pos);
    setUnstakeAmount('');
    setUnstakeOpen(true);
  };

  const handleUnstake = async () => {
    const num = parseFloat(unstakeAmount);
    if (!num || num <= 0) { toast.error('Montante inválido'); return; }
    if (num > unstakePos.amount) { toast.error('Montante superior ao staked'); return; }
    setUnstakeLoading(true);
    try {
      const res = await fetch(`${API}/api/staking/unstake`, {
        method: 'POST', headers,
        body: JSON.stringify({ position_id: unstakePos.id, amount: num }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setUnstakeOpen(false);
        fetchAll();
      } else {
        toast.error(data.detail || 'Erro');
      }
    } catch { toast.error('Erro de conexão'); }
    setUnstakeLoading(false);
  };

  /* ─── claim rewards ─── */
  const handleClaim = async (pos) => {
    try {
      const res = await fetch(`${API}/api/staking/claim-rewards`, {
        method: 'POST', headers,
        body: JSON.stringify({ position_id: pos.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) { toast.success(data.message); fetchAll(); }
      else { toast.error(data.detail || 'Erro'); }
    } catch { toast.error('Erro de conexão'); }
  };

  /* ─── total steps for ETH vs others ─── */
  const totalSteps = selectedAsset?.validator_types?.length > 0 ? 5 : 4;
  const adjustedStep = (selectedAsset?.validator_types?.length > 0) ? step : (step <= 1 ? step : step - 1);

  /* ─── format date ─── */
  const fmtDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const statusColor = (s) => {
    if (s === 'active') return 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20';
    if (s === 'pending') return 'bg-amber-400/10 text-amber-400 border border-amber-400/20';
    if (s === 'unstaking') return 'bg-rose-400/10 text-rose-400 border border-rose-400/20';
    return 'bg-zinc-700 text-zinc-300';
  };

  const tabs = [
    { key: 'positions', label: 'Posições', icon: Layers },
    { key: 'history', label: 'Histórico', icon: History },
  ];

  /* ─── RENDER ─── */
  if (loading) return (
    <div className="flex items-center justify-center h-64" data-testid="staking-loading">
      <Loader2 className="animate-spin text-amber-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-8" data-testid="staking-page">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-amber-500 uppercase tracking-[0.2em] font-medium mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Delegated Staking
          </p>
          <h1 className="text-3xl font-light text-white" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="staking-title">
            Staking
          </h1>
        </div>
        <Button
          onClick={openWizard}
          className="bg-amber-500 text-zinc-950 font-medium px-6 hover:bg-amber-400 transition-colors"
          data-testid="new-stake-btn"
        >
          <ArrowUpCircle size={16} className="mr-2" /> Novo Stake
        </Button>
      </div>

      {/* ═══ SUMMARY CARDS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Posições Ativas" value={summary?.active_positions ?? 0} testId="summary-active" />
        <SummaryCard label="Pendentes" value={summary?.pending_positions ?? 0} testId="summary-pending" />
        <SummaryCard label="Total Posições" value={summary?.total_positions ?? 0} testId="summary-total" />
        <SummaryCard label="Ativos Staked" value={summary?.by_asset?.length ?? 0} testId="summary-assets" highlight />
      </div>

      {/* ═══ BY-ASSET BREAKDOWN ═══ */}
      {summary?.by_asset?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {summary.by_asset.map(a => {
            const colors = ASSET_COLORS[a.asset] || ASSET_COLORS.ETH;
            return (
              <Card key={a.asset} className={`bg-zinc-900/60 border ${colors.border}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-lg`}>
                    {ASSET_ICONS[a.asset] || '●'}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${colors.text}`}>{a.total_staked} {a.asset}</p>
                    <p className="text-xs text-zinc-500">{a.count} posição(ões)</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative
              ${activeTab === tab.key
                ? 'text-amber-500'
                : 'text-zinc-500 hover:text-zinc-300'}`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon size={15} /> {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-amber-500" />
            )}
          </button>
        ))}
      </div>

      {/* ═══ POSITIONS ═══ */}
      {activeTab === 'positions' && (
        <div className="space-y-3" data-testid="positions-list">
          {positions.length === 0 ? (
            <Card className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Coins className="mx-auto text-zinc-700 mb-4" size={40} />
                <p className="text-zinc-400 font-light text-lg">Sem posições de staking</p>
                <p className="text-xs text-zinc-600 mt-2">Clique em "Novo Stake" para começar</p>
              </CardContent>
            </Card>
          ) : positions.map(pos => {
            const colors = ASSET_COLORS[pos.asset_id] || ASSET_COLORS.ETH;
            return (
              <Card key={pos.id} className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors" data-testid={`position-${pos.id}`}>
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-lg ${colors.bg} flex items-center justify-center text-xl shrink-0`}>
                      {ASSET_ICONS[pos.asset_id] || '●'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium">{pos.asset_name || pos.asset_id}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {pos.validator_type && <span className="capitalize">{pos.validator_type} · </span>}
                        {pos.provider_name || pos.provider_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-right">
                      <p className="text-white font-semibold tabular-nums">{pos.amount} {pos.asset_id}</p>
                      <p className="text-xs text-zinc-500">{fmtDate(pos.created_at)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-medium ${statusColor(pos.status)}`}>
                      {pos.status}
                    </span>
                    <div className="flex gap-1.5">
                      {pos.status === 'active' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-amber-500 hover:bg-amber-500/10 h-8 px-2.5" onClick={() => handleClaim(pos)} data-testid={`claim-${pos.id}`}>
                            <Gift size={14} className="mr-1" /> Claim
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-400 hover:bg-rose-400/10 h-8 px-2.5" onClick={() => openUnstake(pos)} data-testid={`unstake-${pos.id}`}>
                            <ArrowDownCircle size={14} className="mr-1" /> Unstake
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {activeTab === 'history' && (
        <div className="space-y-2" data-testid="staking-history">
          {history.length === 0 ? (
            <Card className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-12 text-center text-zinc-500">Sem histórico de staking</CardContent>
            </Card>
          ) : history.map((h, i) => (
            <Card key={h.id || i} className="bg-zinc-900/40 border-zinc-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    h.action === 'stake' ? 'bg-emerald-400' :
                    h.action === 'unstake' ? 'bg-rose-400' : 'bg-amber-400'
                  }`} />
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{h.action?.replace('_', ' ')}</p>
                    <p className="text-xs text-zinc-500">
                      {h.amount} {h.asset_id}
                      {h.validator_type && <span className="ml-1 text-zinc-600">· {h.validator_type}</span>}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">{fmtDate(h.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STAKE WIZARD MODAL
         ═══════════════════════════════════════════ */}
      <Dialog open={wizardOpen} onOpenChange={(v) => { if (!v) { setWizardOpen(false); resetWizard(); } }}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-2xl p-0 gap-0 [&>button]:text-zinc-400" data-testid="stake-wizard">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-amber-500 uppercase tracking-[0.2em] font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {step <= 1 && `01 · ${t('stakingModals.steps.asset')}`}
                {step === 2 && `02 · ${t('stakingModals.steps.validator')}`}
                {step === 3 && (selectedAsset?.validator_types?.length > 0 ? `03 · ${t('stakingModals.steps.amount')}` : `02 · ${t('stakingModals.steps.amount')}`)}
                {step === 4 && (selectedAsset?.validator_types?.length > 0 ? `04 · ${t('stakingModals.steps.provider')}` : `03 · ${t('stakingModals.steps.provider')}`)}
                {step === 5 && (selectedAsset?.validator_types?.length > 0 ? `05 · ${t('stakingModals.steps.confirm')}` : `04 · ${t('stakingModals.steps.confirm')}`)}
              </p>
              <p className="text-xs text-zinc-600">{Math.min(step, totalSteps)} / {totalSteps}</p>
            </div>
            <div className="w-full h-px bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(Math.min(step, totalSteps) / totalSteps) * 100}%` }} />
            </div>
          </div>

          <div className="p-6 min-h-[340px]">
            {/* ─── STEP 1: SELECT ASSET ─── */}
            {step === 1 && (
              <div data-testid="wizard-step-asset">
                <h3 className="text-xl font-light text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('stakingModals.selectAsset')}
                </h3>
                <p className="text-sm text-zinc-500 mb-6">{t('stakingModals.selectAssetDesc')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assets.map(asset => {
                    const c = ASSET_COLORS[asset.id] || ASSET_COLORS.ETH;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => selectAsset(asset)}
                        className={`text-left p-4 rounded-lg border ${c.border} ${c.bg} hover:brightness-125 transition-all group`}
                        data-testid={`asset-${asset.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{ASSET_ICONS[asset.id]}</span>
                            <div>
                              <p className="text-white font-medium">{asset.name}</p>
                              <p className="text-xs text-zinc-500">{asset.chain}</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                          <p className="text-xs text-zinc-500">{t('stakingModals.apy')}</p>
                          <p className={`text-sm font-medium ${c.text}`}>{asset.apy_range}</p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-500">{t('stakingModals.min')}</p>
                          <p className="text-xs text-zinc-400">{asset.min_stake} {asset.symbol}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── STEP 2: VALIDATOR TYPE (ETH only) ─── */}
            {step === 2 && selectedAsset && (
              <div data-testid="wizard-step-validator">
                <h3 className="text-xl font-light text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('stakingModals.validatorType')}
                </h3>
                <p className="text-sm text-zinc-500 mb-6">{t('stakingModals.validatorTypeDesc')} {selectedAsset.symbol}</p>
                <div className="space-y-3">
                  {selectedAsset.validator_types.map(vt => (
                    <button
                      key={vt.id}
                      onClick={() => selectValidatorType(vt)}
                      className="w-full text-left p-5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-amber-500/30 hover:bg-zinc-900 transition-all group"
                      data-testid={`validator-${vt.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium text-lg">{vt.name}</p>
                          <p className="text-sm text-zinc-500 mt-1">{vt.description}</p>
                        </div>
                        <ChevronRight size={18} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <div className="flex gap-6 mt-4 pt-3 border-t border-zinc-800">
                        <div>
                          <p className="text-xs text-zinc-600">{t('stakingModals.apy')}</p>
                          <p className="text-sm text-emerald-400 font-medium">{vt.apy}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600">{t('stakingModals.minimum')}</p>
                          <p className="text-sm text-zinc-300">{vt.min_amount} ETH</p>
                        </div>
                        {vt.max_amount && (
                          <div>
                            <p className="text-xs text-zinc-600">{t('stakingModals.maximum')}</p>
                            <p className="text-sm text-zinc-300">{vt.max_amount} ETH</p>
                          </div>
                        )}
                        {vt.increment && (
                          <div>
                            <p className="text-xs text-zinc-600">{t('stakingModals.increment')}</p>
                            <p className="text-sm text-zinc-300">{vt.increment} ETH</p>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" className="mt-4 text-zinc-500 hover:text-white" onClick={() => { setStep(1); setSelectedAsset(null); }}>
                  <ChevronLeft size={16} className="mr-1" /> {t('stakingModals.back')}
                </Button>
              </div>
            )}

            {/* ─── STEP 3: AMOUNT ─── */}
            {step === 3 && selectedAsset && (
              <div data-testid="wizard-step-amount">
                <h3 className="text-xl font-light text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('stakingModals.amount')}
                </h3>
                <p className="text-sm text-zinc-500 mb-6">
                  {t('stakingModals.amountDesc')} {selectedAsset.symbol} {t('stakingModals.forStaking')}
                  {selectedValidator && <span className="text-amber-500/80"> ({selectedValidator.name})</span>}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-zinc-400 mb-2 block font-medium">{t('stakingModals.amount')} ({selectedAsset.symbol})</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => { setAmount(e.target.value); if (e.target.value) validateAmount(e.target.value); }}
                        placeholder={`${t('stakingModals.min')}: ${selectedValidator?.min_amount || selectedAsset.min_stake}`}
                        className="bg-zinc-900 border-zinc-800 text-white text-lg py-6 pr-16 focus:border-amber-500/50"
                        data-testid="stake-amount-input"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">
                        {selectedAsset.symbol}
                      </span>
                    </div>
                    {amountError && (
                      <p className="text-rose-400 text-xs mt-2 flex items-center gap-1" data-testid="amount-error">
                        <AlertCircle size={12} /> {amountError}
                      </p>
                    )}
                  </div>

                  {/* Quick amount buttons for ETH */}
                  {selectedAsset.id === 'ETH' && (
                    <div className="flex flex-wrap gap-2">
                      {(selectedValidator?.id === 'legacy'
                        ? [32, 64, 96, 128, 160, 192, 224, 256]
                        : [32, 64, 128, 256, 512, 1024, 2048]
                      ).map(v => (
                        <button
                          key={v}
                          onClick={() => { setAmount(String(v)); validateAmount(String(v)); }}
                          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors
                            ${amount === String(v) ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                          data-testid={`quick-amount-${v}`}
                        >
                          {v} ETH
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Validation hints */}
                  <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('stakingModals.rules')}</p>
                    {selectedValidator ? (
                      <ul className="space-y-1 text-xs text-zinc-400">
                        <li className="flex items-center gap-2">
                          <Check size={12} className="text-emerald-400" /> {t('stakingModals.minimum')}: {selectedValidator.min_amount} {selectedAsset.symbol}
                        </li>
                        {selectedValidator.max_amount && (
                          <li className="flex items-center gap-2">
                            <Check size={12} className="text-emerald-400" /> {t('stakingModals.maximum')}: {selectedValidator.max_amount} {selectedAsset.symbol}
                          </li>
                        )}
                        {selectedValidator.increment && (
                          <li className="flex items-center gap-2">
                            <Check size={12} className="text-emerald-400" /> {t('stakingModals.multiplesOf')} {selectedValidator.increment} {selectedAsset.symbol}
                          </li>
                        )}
                      </ul>
                    ) : (
                      <ul className="space-y-1 text-xs text-zinc-400">
                        <li className="flex items-center gap-2">
                          <Check size={12} className="text-emerald-400" /> {t('stakingModals.minimum')}: {selectedAsset.min_stake} {selectedAsset.symbol}
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={12} className="text-emerald-400" /> {t('stakingModals.estimatedApy')}: {selectedAsset.apy_range}
                        </li>
                      </ul>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <Button variant="ghost" className="text-zinc-500 hover:text-white" onClick={() => {
                    if (selectedAsset.validator_types?.length > 0) { setStep(2); setSelectedValidator(null); }
                    else { setStep(1); setSelectedAsset(null); }
                  }}>
                    <ChevronLeft size={16} className="mr-1" /> {t('stakingModals.back')}
                  </Button>
                  <Button
                    onClick={goToProvider}
                    disabled={!amount || !!amountError}
                    className="bg-amber-500 text-zinc-950 font-medium px-6 hover:bg-amber-400 disabled:opacity-40"
                    data-testid="amount-next-btn"
                  >
                    {t('stakingModals.continue')} <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ─── STEP 4: SELECT PROVIDER ─── */}
            {step === 4 && (
              <div data-testid="wizard-step-provider">
                <h3 className="text-xl font-light text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('stakingModals.selectProvider')}
                </h3>
                <p className="text-sm text-zinc-500 mb-6">{t('stakingModals.selectProviderDesc')}</p>

                {providers.length === 0 ? (
                  <div className="space-y-4">
                    <Card className="bg-zinc-900/40 border-zinc-800">
                      <CardContent className="p-8 text-center">
                        <AlertCircle className="mx-auto text-amber-500/50 mb-3" size={32} />
                        <p className="text-zinc-400">{t('stakingModals.noProviderAvailable')} {selectedAsset?.symbol}</p>
                        <p className="text-xs text-zinc-600 mt-2">{t('stakingModals.enterManualId')}</p>
                      </CardContent>
                    </Card>
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-medium">{t('stakingModals.providerIdManual')}</label>
                      <Input
                        value={selectedProvider}
                        onChange={e => setSelectedProvider(e.target.value)}
                        placeholder={t('stakingModals.providerIdPh')}
                        className="bg-zinc-900 border-zinc-800 text-white focus:border-amber-500/50"
                        data-testid="provider-manual-input"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {providers.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProvider(p.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-all
                          ${selectedProvider === p.id
                            ? 'border-amber-500/50 bg-amber-500/5'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}
                        data-testid={`provider-${p.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{p.name || p.id}</p>
                            <p className="text-xs text-zinc-500">{p.chain}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {p.apy && (
                              <div className="text-right">
                                <p className="text-xs text-zinc-600">{t('stakingModals.apy')}</p>
                                <p className="text-sm text-emerald-400 font-medium">{p.apy}%</p>
                              </div>
                            )}
                            {p.fee && (
                              <div className="text-right">
                                <p className="text-xs text-zinc-600">{t('stakingModals.fee')}</p>
                                <p className="text-sm text-zinc-400">{p.fee}%</p>
                              </div>
                            )}
                            {selectedProvider === p.id && (
                              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                <Check size={12} className="text-zinc-950" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-6">
                  <Button variant="ghost" className="text-zinc-500 hover:text-white" onClick={() => setStep(3)}>
                    <ChevronLeft size={16} className="mr-1" /> {t('stakingModals.back')}
                  </Button>
                  <Button
                    onClick={goToReview}
                    disabled={!selectedProvider}
                    className="bg-amber-500 text-zinc-950 font-medium px-6 hover:bg-amber-400 disabled:opacity-40"
                    data-testid="provider-next-btn"
                  >
                    {t('stakingModals.review')} <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ─── STEP 5: REVIEW & CONFIRM ─── */}
            {step === 5 && (
              <div data-testid="wizard-step-review">
                <h3 className="text-xl font-light text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('stakingModals.confirmStaking')}
                </h3>
                <p className="text-sm text-zinc-500 mb-6">{t('stakingModals.confirmStakingDesc')}</p>

                <div className="bg-zinc-900/60 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                  <ReviewRow label={t('stakingModals.rowAsset')} value={`${selectedAsset?.name} (${selectedAsset?.symbol})`} icon={ASSET_ICONS[selectedAsset?.id]} />
                  {selectedValidator && <ReviewRow label={t('stakingModals.rowValidator')} value={selectedValidator.name} />}
                  <ReviewRow label={t('stakingModals.rowAmount')} value={`${amount} ${selectedAsset?.symbol}`} highlight />
                  <ReviewRow label={t('stakingModals.rowProvider')} value={providers.find(p => p.id === selectedProvider)?.name || selectedProvider} />
                  <ReviewRow label={t('stakingModals.rowApy')} value={selectedValidator?.apy || selectedAsset?.apy_range || '-'} />
                </div>

                <div className="mt-4">
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">{t('stakingModals.note')}</label>
                  <Input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={t('stakingModals.notePh')}
                    className="bg-zinc-900 border-zinc-800 text-white focus:border-amber-500/50"
                    data-testid="stake-note-input"
                  />
                </div>

                <div className="flex items-center justify-between mt-6">
                  <Button variant="ghost" className="text-zinc-500 hover:text-white" onClick={() => setStep(4)}>
                    <ChevronLeft size={16} className="mr-1" /> {t('stakingModals.back')}
                  </Button>
                  <Button
                    onClick={handleStake}
                    disabled={submitting}
                    className="bg-amber-500 text-zinc-950 font-medium px-8 hover:bg-amber-400"
                    data-testid="stake-confirm-btn"
                  >
                    {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <ArrowUpCircle size={16} className="mr-2" />}
                    {submitting ? t('stakingModals.processing') : t('stakingModals.confirmStake')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ UNSTAKE MODAL ═══ */}
      <Dialog open={unstakeOpen} onOpenChange={setUnstakeOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-md [&>button]:text-zinc-400" data-testid="unstake-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ArrowDownCircle className="text-rose-400" size={20} /> {t('stakingModals.unstake')}
            </DialogTitle>
          </DialogHeader>
          {unstakePos && (
            <div className="space-y-4 py-2">
              <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('stakingModals.position')}</p>
                <p className="text-white font-medium">{unstakePos.asset_name || unstakePos.asset_id}</p>
                <p className="text-sm text-zinc-400">{t('stakingModals.staked')}: {unstakePos.amount} {unstakePos.asset_id}</p>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block font-medium">{t('stakingModals.amountToWithdraw')}</label>
                <Input
                  type="number"
                  value={unstakeAmount}
                  onChange={e => setUnstakeAmount(e.target.value)}
                  placeholder={`${t('stakingModals.max')}: ${unstakePos.amount}`}
                  className="bg-zinc-900 border-zinc-800 text-white focus:border-amber-500/50"
                  data-testid="unstake-amount-input"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnstakeOpen(false)} className="text-zinc-500">{t('stakingModals.cancel')}</Button>
            <Button onClick={handleUnstake} disabled={unstakeLoading} className="bg-rose-600 hover:bg-rose-500 text-white" data-testid="unstake-confirm-btn">
              {unstakeLoading ? <Loader2 className="animate-spin" size={16} /> : t('stakingModals.confirmUnstake')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Small components ─── */
const SummaryCard = ({ label, value, testId, highlight }) => (
  <Card className="bg-zinc-900/60 border border-zinc-800">
    <CardContent className="p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${highlight ? 'text-amber-500' : 'text-white'}`} data-testid={testId}>{value}</p>
    </CardContent>
  </Card>
);

const ReviewRow = ({ label, value, icon, highlight }) => (
  <div className="flex items-center justify-between p-4">
    <p className="text-sm text-zinc-500">{label}</p>
    <p className={`text-sm font-medium ${highlight ? 'text-amber-500 text-lg' : 'text-white'} flex items-center gap-2`}>
      {icon && <span className="text-lg">{icon}</span>}
      {value}
    </p>
  </div>
);

export default StakingPage;
