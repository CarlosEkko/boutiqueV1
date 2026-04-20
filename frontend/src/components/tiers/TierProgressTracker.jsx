import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Button } from '../ui/button';
import { Vault, ArrowUpRight, Sparkles, AlertTriangle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Tier rank & accent colors
const TIER_RANK = { broker: 0, standard: 1, premium: 2, vip: 3, institucional: 4 };
const TIER_LABELS = { broker: 'Broker', standard: 'Standard', premium: 'Premium', vip: 'VIP', institucional: 'Institucional' };
const NEXT_TIER = { broker: 'standard', standard: 'premium', premium: 'vip', vip: 'institucional', institucional: null };

/**
 * TierProgressTracker
 * Compact vault/cofre usage bar with upsell CTA when near/at limit.
 *
 * Usage:
 *   <TierProgressTracker />           // auto-fetches from /api/omnibus/my-cofres
 *   <TierProgressTracker compact />   // inline slim version for page headers
 */
const TierProgressTracker = ({ compact = false, className = '' }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/omnibus/my-cofres`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setData(res.data);
      } catch {
        /* silent — tracker is opportunistic */
      }
    };
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  if (!data) return null;

  const used = data.cofres_count || 0;
  const max = data.cofres_max || 0;
  const tier = (data.tier || 'standard').toLowerCase();

  if (max <= 0 && used === 0) return null; // Tier has no cofre access (broker-only accounts with 0 max wouldn't show)

  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const remaining = Math.max(0, max - used);
  const atLimit = max > 0 && used >= max;
  const nearLimit = max > 0 && used >= max * 0.8 && !atLimit;
  const next = NEXT_TIER[tier];

  // Accent: emerald (safe) → amber (near) → red (at limit)
  const accent = atLimit
    ? { bar: 'from-red-500 to-red-400', ring: 'ring-red-500/30', text: 'text-red-300', bg: 'bg-red-950/20', border: 'border-red-800/40' }
    : nearLimit
      ? { bar: 'from-amber-500 to-amber-400', ring: 'ring-amber-500/30', text: 'text-amber-300', bg: 'bg-amber-950/20', border: 'border-amber-800/40' }
      : { bar: 'from-gold-500 to-gold-400', ring: 'ring-gold-500/30', text: 'text-gold-300', bg: 'bg-zinc-900/40', border: 'border-zinc-800' };

  const goToTiers = () => navigate('/dashboard/tiers');

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-full border ${accent.border} ${accent.bg} ${className}`}
        data-testid="tier-progress-compact"
      >
        <Vault size={12} className={accent.text} />
        <span className="text-xs tabular-nums text-white font-medium">
          {used}<span className="text-zinc-500">/{max}</span>
        </span>
        <div className="relative w-16 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${accent.bar} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">{TIER_LABELS[tier] || tier}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${accent.border} ${accent.bg} px-5 py-4 ${className}`}
      data-testid="tier-progress-tracker"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent.bg} ring-1 ${accent.ring}`}>
            {atLimit ? <AlertTriangle size={16} className={accent.text} /> : <Vault size={16} className={accent.text} />}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {t('tierTracker.title', 'Cofres ativos')}
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-light text-white tabular-nums">{used}</span>
              <span className="text-sm text-zinc-500 tabular-nums">/ {max}</span>
              <span className={`text-[10px] uppercase tracking-widest ${accent.text} ml-2`}>
                {TIER_LABELS[tier] || tier}
              </span>
            </div>
          </div>
        </div>

        {next && (TIER_RANK[next] ?? 99) > (TIER_RANK[tier] ?? 0) && (
          <Button
            size="sm"
            variant="outline"
            className="border-gold-600/40 text-gold-300 hover:bg-gold-500/10 hover:text-gold-200"
            onClick={goToTiers}
            data-testid="tier-tracker-upgrade-btn"
          >
            <Sparkles size={12} className="mr-1.5" />
            {t('tierTracker.upgradeCta', 'Ver')} {TIER_LABELS[next]}
            <ArrowUpRight size={12} className="ml-1" />
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 relative w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${accent.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Contextual message */}
      <div className="mt-2.5 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>
          {atLimit
            ? t('tierTracker.atLimit', 'Atingiu o limite do seu tier.')
            : nearLimit
              ? `${t('tierTracker.remaining', 'Restam')} ${remaining} ${t('tierTracker.cofres', remaining === 1 ? 'cofre' : 'cofres')}`
              : `${t('tierTracker.available', 'Disponíveis')} ${remaining} ${t('tierTracker.cofres', remaining === 1 ? 'cofre' : 'cofres')}`
          }
        </span>
        <button
          onClick={goToTiers}
          className="text-zinc-500 hover:text-gold-400 underline-offset-2 hover:underline transition-colors"
          data-testid="tier-tracker-learn-more"
        >
          {t('tierTracker.learnMore', 'Ver benefícios')}
        </button>
      </div>
    </div>
  );
};

export default TierProgressTracker;
