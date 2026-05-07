/**
 * OTCPoliciesSection — Admin editor for the per-tier OTC Desk policy matrix.
 *
 * Each tier (standard / premium / vip / institutional) has:
 *   • white_glove_enabled    — allow CRM manual workflow (human approval).
 *   • instant_firm_enabled   — allow firm algorithmic quotes via the desk.
 *   • instant_max_usdt       — hard cap on instant RFQ notional (USDT).
 *   • auto_execute_enabled   — may the client self-execute without trader approval?
 *   • auto_execute_max_usdt  — cap for self-execution (≤ instant_max).
 *
 * Rows are edited in-place. Save is per-row to avoid accidental mass updates.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ShieldCheck, Save, RefreshCw } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';

const API = process.env.REACT_APP_BACKEND_URL;

const TIERS = [
  { id: 'standard',       label: 'Standard',       badge: 'text-zinc-300 bg-zinc-800/60 border-zinc-700' },
  { id: 'premium',        label: 'Premium',        badge: 'text-sky-300 bg-sky-900/20 border-sky-700/60' },
  { id: 'vip',            label: 'VIP',            badge: 'text-gold-300 bg-gold-900/20 border-gold-700/60' },
  { id: 'institutional',  label: 'Institutional',  badge: 'text-emerald-300 bg-emerald-900/20 border-emerald-700/60' },
];

const fmtUsd = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export default function OTCPoliciesSection({ token }) {
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState({}); // tier -> policy
  const [saving, setSaving] = useState({}); // tier -> bool

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/otc-policies`, { headers });
      const byTier = {};
      (data.policies || []).forEach((p) => { byTier[p.tier] = p; });
      setPolicies(byTier);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  const patch = (tier, field, value) => {
    setPolicies((prev) => ({
      ...prev,
      [tier]: { ...(prev[tier] || { tier }), [field]: value },
    }));
  };

  const save = async (tier) => {
    const p = policies[tier];
    if (!p) return;
    // Client-side guard matches backend
    if (Number(p.auto_execute_max_usdt || 0) > Number(p.instant_max_usdt || 0)) {
      toast.error('Auto-execute cap cannot exceed instant cap.');
      return;
    }
    setSaving((s) => ({ ...s, [tier]: true }));
    try {
      await axios.put(
        `${API}/api/otc-policies/${tier}`,
        {
          white_glove_enabled: !!p.white_glove_enabled,
          instant_firm_enabled: !!p.instant_firm_enabled,
          instant_max_usdt: Number(p.instant_max_usdt || 0),
          auto_execute_enabled: !!p.auto_execute_enabled,
          auto_execute_max_usdt: Number(p.auto_execute_max_usdt || 0),
        },
        { headers },
      );
      toast.success(`${tier} policy saved`);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving((s) => ({ ...s, [tier]: false }));
    }
  };

  return (
    <Card data-testid="otc-policies-section" className="bg-zinc-950/80 border border-gold-800/25 p-6">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-md bg-gold-950/30 border border-gold-800/40">
            <ShieldCheck size={15} className="text-gold-400" />
          </div>
          <div>
            <h2 className="text-base font-light text-white tracking-wide">
              Tier Policy Matrix
              <span className="text-gold-400"> — OTC service model per client tier</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
              Map each client tier to the allowed OTC modes. Instant = algorithmic firm quote
              from the desk engine. White-glove = manual quote via CRM. Auto-execute lets the
              client self-sign within a strict cap; otherwise a trader approves each deal.
            </p>
          </div>
        </div>
        <Button
          data-testid="otc-policies-reload"
          variant="ghost"
          size="sm"
          onClick={load}
          className="text-zinc-400 hover:text-gold-300"
        >
          <RefreshCw size={13} className="mr-1.5" />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-500">Loading policies…</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1080px] grid grid-cols-12 gap-3 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-950/60 rounded-t-md border border-b-0 border-zinc-800/60">
            <div className="col-span-2">Tier</div>
            <div className="col-span-1 text-center">White-Glove</div>
            <div className="col-span-1 text-center">Instant</div>
            <div className="col-span-2 text-right">Instant Max (USDT)</div>
            <div className="col-span-1 text-center">Auto-Exec</div>
            <div className="col-span-2 text-right">Auto-Exec Max (USDT)</div>
            <div className="col-span-2 text-right text-zinc-600 normal-case tracking-normal">Effective</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          <div className="border border-zinc-800/60 rounded-b-md divide-y divide-zinc-900 min-w-[1080px]">
            {TIERS.map((t) => {
              const p = policies[t.id] || { tier: t.id };
              return (
                <div
                  key={t.id}
                  data-testid={`policy-row-${t.id}`}
                  className="grid grid-cols-12 gap-3 px-3 py-3 items-center text-xs"
                >
                  <div className="col-span-2">
                    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-sm border uppercase tracking-widest ${t.badge}`}>
                      {t.label}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      data-testid={`policy-${t.id}-whiteglove`}
                      checked={!!p.white_glove_enabled}
                      onCheckedChange={(v) => patch(t.id, 'white_glove_enabled', v)}
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      data-testid={`policy-${t.id}-instant`}
                      checked={!!p.instant_firm_enabled}
                      onCheckedChange={(v) => patch(t.id, 'instant_firm_enabled', v)}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <Input
                      data-testid={`policy-${t.id}-instant-max`}
                      type="number"
                      value={p.instant_max_usdt ?? ''}
                      onChange={(e) => patch(t.id, 'instant_max_usdt', e.target.value)}
                      disabled={!p.instant_firm_enabled}
                      className="h-8 text-right bg-zinc-900 border-zinc-800 text-xs tabular-nums disabled:opacity-40"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Switch
                      data-testid={`policy-${t.id}-auto`}
                      checked={!!p.auto_execute_enabled}
                      onCheckedChange={(v) => patch(t.id, 'auto_execute_enabled', v)}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <Input
                      data-testid={`policy-${t.id}-auto-max`}
                      type="number"
                      value={p.auto_execute_max_usdt ?? ''}
                      onChange={(e) => patch(t.id, 'auto_execute_max_usdt', e.target.value)}
                      disabled={!p.auto_execute_enabled}
                      className="h-8 text-right bg-zinc-900 border-zinc-800 text-xs tabular-nums disabled:opacity-40"
                    />
                  </div>
                  <div className="col-span-2 text-right text-[10px] text-zinc-500 leading-tight">
                    {p.instant_firm_enabled
                      ? <>Instant ≤ <span className="text-zinc-300 tabular-nums">{fmtUsd(p.instant_max_usdt)}</span></>
                      : <span className="text-zinc-600">Manual only</span>}
                    <br />
                    {p.auto_execute_enabled
                      ? <>Auto ≤ <span className="text-zinc-300 tabular-nums">{fmtUsd(p.auto_execute_max_usdt)}</span></>
                      : <span className="text-zinc-600">Trader approves</span>}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      data-testid={`policy-${t.id}-save`}
                      size="sm"
                      onClick={() => save(t.id)}
                      disabled={!!saving[t.id]}
                      className="bg-gold-400 hover:bg-gold-300 text-black h-7"
                    >
                      <Save size={12} className="mr-1" />
                      {saving[t.id] ? '…' : 'Save'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-zinc-600 mt-3 italic">
            Backend invariant: <code className="text-gold-500/80">auto_execute_max_usdt ≤ instant_max_usdt</code>.
            Changes apply immediately across the Trading Desk and the CRM OTC modal.
          </p>
        </div>
      )}
    </Card>
  );
}
