import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Check,
  Minus,
  Crown,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Visual accent per tier
const TIER_STYLES = {
  broker: {
    border: 'border-slate-700/60',
    bg: 'bg-slate-900/40',
    ring: 'ring-slate-500/30',
    text: 'text-slate-300',
    accent: 'from-slate-500/20 to-transparent',
    dot: 'bg-slate-400',
  },
  standard: {
    border: 'border-violet-800/50',
    bg: 'bg-violet-950/30',
    ring: 'ring-violet-500/30',
    text: 'text-violet-300',
    accent: 'from-violet-500/20 to-transparent',
    dot: 'bg-violet-400',
  },
  premium: {
    border: 'border-sky-800/50',
    bg: 'bg-sky-950/30',
    ring: 'ring-sky-500/30',
    text: 'text-sky-300',
    accent: 'from-sky-500/20 to-transparent',
    dot: 'bg-sky-400',
  },
  vip: {
    border: 'border-gold-700/60',
    bg: 'bg-gradient-to-b from-gold-950/40 to-gold-900/20',
    ring: 'ring-gold-500/40',
    text: 'text-gold-400',
    accent: 'from-gold-500/30 to-transparent',
    dot: 'bg-gold-400',
  },
  institucional: {
    border: 'border-emerald-800/50',
    bg: 'bg-emerald-950/30',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-300',
    accent: 'from-emerald-500/20 to-transparent',
    dot: 'bg-emerald-400',
  },
};

const RANK = { broker: 0, standard: 1, premium: 2, vip: 3, institucional: 4 };

const formatAllocation = (value, currency = 'EUR') => {
  if (typeof value !== 'number') return value;
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
  return `${symbol}${value.toLocaleString('pt-PT')}`;
};

// Render a cell value (bool/number/string)
const ValueCell = ({ value, tierId }) => {
  const style = TIER_STYLES[tierId] || TIER_STYLES.standard;

  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${style.bg} ring-1 ${style.ring}`}>
          <Check size={14} className={style.text} strokeWidth={2.5} />
        </div>
      </div>
    );
  }
  if (value === false || value === 0 || value === '' || value == null) {
    return (
      <div className="flex items-center justify-center">
        <Minus size={14} className="text-zinc-700" />
      </div>
    );
  }
  if (typeof value === 'number') {
    return (
      <div className="flex items-center justify-center">
        <span className={`text-sm font-semibold ${style.text} tabular-nums`}>{value}</span>
      </div>
    );
  }
  // string
  return (
    <div className="flex items-center justify-center">
      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${style.border} ${style.text} font-medium tracking-wide`}>
        {value}
      </span>
    </div>
  );
};

const ClientTiersPage = () => {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, targetTier: null });
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/client-tiers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setConfig(res.data);
      } catch (err) {
        console.error('Failed to load tiers', err);
        toast.error(t('tiers.errors.loadFailed', 'Falha ao carregar tiers'));
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token, t]);

  const currentTier = config?.current_tier || 'standard';
  const currentRank = RANK[currentTier] ?? 1;

  const openUpgrade = (targetTier) => {
    setUpgradeDialog({ open: true, targetTier });
    setUpgradeMessage('');
  };

  const submitUpgrade = async () => {
    if (!upgradeDialog.targetTier) return;
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/client-tiers/upgrade-request`,
        { target_tier: upgradeDialog.targetTier, message: upgradeMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('tiers.upgrade.success', 'Pedido enviado. O seu Account Manager entrará em contacto.'));
      setUpgradeDialog({ open: false, targetTier: null });
      setUpgradeMessage('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('tiers.upgrade.error', 'Falha ao enviar pedido'));
    } finally {
      setSubmitting(false);
    }
  };

  const tierLabel = (id) => config?.tiers?.find((t2) => t2.id === id)?.label || id;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  if (!config) return null;

  const { tiers, sections } = config;

  return (
    <div className="space-y-6" data-testid="client-tiers-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold-400/80 mb-2">
            <Crown size={14} />
            <span>{t('tiers.eyebrow', 'Programa de Alocação')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white">
            {t('tiers.title', 'Níveis de Cliente')} <span className="text-gold-400">&amp; Benefícios</span>
          </h1>
          <p className="text-zinc-400 mt-3 max-w-2xl">
            {t(
              'tiers.subtitle',
              'Cada tier desbloqueia alocações, ferramentas e serviços dedicados. O seu nível cresce consigo.'
            )}
          </p>
        </div>
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-gold-800/40 bg-gold-950/20">
          <Sparkles size={14} className="text-gold-400" />
          <span className="text-xs uppercase tracking-widest text-zinc-400">{t('tiers.yourTier', 'O seu tier')}</span>
          <span className="text-gold-400 font-semibold">{tierLabel(currentTier)}</span>
        </div>
      </div>

      {/* Tier header cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiers.map((tier) => {
          const style = TIER_STYLES[tier.id] || TIER_STYLES.standard;
          const isCurrent = tier.id === currentTier;
          const isUpgrade = (RANK[tier.id] ?? 99) > currentRank;
          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl border ${style.border} ${style.bg} p-4 overflow-hidden transition-all ${
                isCurrent ? `ring-2 ${style.ring} shadow-[0_0_30px_rgba(212,175,55,0.08)]` : ''
              }`}
              data-testid={`tier-card-${tier.id}`}
            >
              <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${style.accent} blur-2xl pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  {isCurrent && (
                    <Badge className="bg-gold-500/15 text-gold-300 border border-gold-500/30 text-[10px] tracking-widest">
                      {t('tiers.currentBadge', 'ATUAL')}
                    </Badge>
                  )}
                </div>
                <div className={`text-xs uppercase tracking-[0.18em] ${style.text}`}>{tier.label}</div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {t('tiers.minAllocation', 'Alocação Mínima')}
                  </div>
                  <div className="text-2xl font-light text-white mt-1 tabular-nums">
                    {formatAllocation(tier.min_allocation, tier.currency)}
                  </div>
                </div>

                {isUpgrade ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4 border-gold-600/40 text-gold-300 hover:bg-gold-500/10 hover:text-gold-200"
                    onClick={() => openUpgrade(tier.id)}
                    data-testid={`tier-upgrade-btn-${tier.id}`}
                  >
                    <ArrowUpRight size={14} className="mr-1.5" />
                    {t('tiers.upgradeTo', 'Fazer Upgrade')}
                  </Button>
                ) : (
                  <div className="h-9 mt-4 flex items-center justify-center text-[11px] text-zinc-500 tracking-wider">
                    {isCurrent ? t('tiers.activePlan', '— Plano Ativo —') : '\u00A0'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-950/60 backdrop-blur-sm">
        {/* Sticky column header */}
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(180px,1.3fr)_repeat(5,minmax(100px,1fr))] bg-zinc-900/95 border-b border-zinc-800/80 backdrop-blur">
          <div className="p-4 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {t('tiers.feature', 'Característica')}
          </div>
          {tiers.map((tier) => {
            const style = TIER_STYLES[tier.id] || TIER_STYLES.standard;
            return (
              <div key={tier.id} className={`p-4 text-center border-l border-zinc-800/60 ${tier.id === currentTier ? style.bg : ''}`}>
                <div className={`text-xs font-semibold uppercase tracking-widest ${style.text}`}>{tier.label}</div>
              </div>
            );
          })}
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.id}>
            <div className="px-4 py-2.5 bg-zinc-900/40 border-y border-zinc-800/60">
              <div className="text-[10px] uppercase tracking-[0.22em] text-gold-400/70 font-semibold flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-gold-400" />
                {section.label}
              </div>
            </div>
            {section.features.map((feat, idx) => (
              <div
                key={feat.id}
                className={`grid grid-cols-[minmax(180px,1.3fr)_repeat(5,minmax(100px,1fr))] ${
                  idx % 2 === 0 ? 'bg-zinc-950/40' : 'bg-zinc-900/20'
                } hover:bg-zinc-800/30 transition-colors`}
                data-testid={`feature-row-${feat.id}`}
              >
                <div className="p-3.5 text-sm text-zinc-200 font-light">{feat.label}</div>
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-3.5 border-l border-zinc-800/40 flex items-center justify-center ${
                      tier.id === currentTier ? 'bg-gold-500/[0.03]' : ''
                    }`}
                  >
                    <ValueCell value={feat.values[tier.id]} tierId={tier.id} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-start gap-3 text-xs text-zinc-500 px-1">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold-500/60" />
        <p>
          {t(
            'tiers.footerNote',
            'Alocações e benefícios podem ser personalizados para clientes institucionais. Contacte o seu Account Manager para uma proposta dedicada.'
          )}
        </p>
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialog.open} onOpenChange={(open) => !open && setUpgradeDialog({ open: false, targetTier: null })}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-md" data-testid="upgrade-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-400">
              <Crown size={18} />
              {t('tiers.upgrade.title', 'Upgrade para')} {tierLabel(upgradeDialog.targetTier)}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t(
                'tiers.upgrade.description',
                'O seu Account Manager vai analisar o pedido e entrar em contacto para alinhar a transição.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-zinc-500 uppercase tracking-wider">
              {t('tiers.upgrade.messageLabel', 'Mensagem opcional')}
            </div>
            <Textarea
              placeholder={t(
                'tiers.upgrade.messagePlaceholder',
                'Partilhe objectivos, expectativas de alocação ou perguntas...'
              )}
              value={upgradeMessage}
              onChange={(e) => setUpgradeMessage(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white min-h-[120px]"
              data-testid="upgrade-message-textarea"
              maxLength={2000}
            />
            <div className="text-[10px] text-zinc-600 text-right">{upgradeMessage.length}/2000</div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setUpgradeDialog({ open: false, targetTier: null })}
              className="text-zinc-400 hover:text-white"
              data-testid="upgrade-cancel-btn"
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={submitUpgrade}
              disabled={submitting}
              className="bg-gold-500 hover:bg-gold-600 text-black font-medium"
              data-testid="upgrade-submit-btn"
            >
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <ArrowUpRight size={14} className="mr-1.5" />}
              {t('tiers.upgrade.submit', 'Enviar Pedido')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientTiersPage;
