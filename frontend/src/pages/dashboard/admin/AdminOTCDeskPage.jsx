/**
 * AdminOTCDeskPage — configuration + observability cockpit for the
 * Institutional OTC Desk. Admin-only.
 *
 * Sections
 *   1) Desk Health  — running status, live PnL, active quotes, daily loss gauge
 *   2) Pricing      — base margin bps, vol factor, TTL, hedge latency
 *   3) Risk Limits  — daily loss, auto-widen trigger + multiplier
 *   4) Asset Universe — CRUD on BTC/ETH/SOL/BNB/XRP… with per-asset limits
 *   5) Trade History — last 100 trades filterable by symbol
 *
 * All edits hit the backend immediately (no deploys required).
 */
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from '../../../components/ui/select';
import {
  Activity, Save, Plus, Trash2, RefreshCw, ShieldAlert, Coins, Settings2, TrendingUp, Link2, Radio,
} from 'lucide-react';
import OTCPoliciesSection from './OTCPoliciesSection';

const API = process.env.REACT_APP_BACKEND_URL;

// Curated list of institutional-grade Binance pairs. Seed prices are
// placeholders — the engine replaces them with the live Binance mid within 2 s.
// Grouped by quote currency for the Select dropdown.
const POPULAR_PAIRS = [
  // USDT
  { group: 'USDT',  ticker: 'BTCUSDT',  quote: 'USDT', seed: 82000,  liquidity: 800,       inv_factor: 0.00040, max_inventory: 5,        max_notional_usdt: 500000 },
  { group: 'USDT',  ticker: 'ETHUSDT',  quote: 'USDT', seed: 3500,   liquidity: 8000,      inv_factor: 0.00025, max_inventory: 80,       max_notional_usdt: 500000 },
  { group: 'USDT',  ticker: 'SOLUSDT',  quote: 'USDT', seed: 180,    liquidity: 60000,     inv_factor: 0.00020, max_inventory: 2500,     max_notional_usdt: 500000 },
  { group: 'USDT',  ticker: 'BNBUSDT',  quote: 'USDT', seed: 620,    liquidity: 12000,     inv_factor: 0.00025, max_inventory: 700,      max_notional_usdt: 500000 },
  { group: 'USDT',  ticker: 'XRPUSDT',  quote: 'USDT', seed: 0.60,   liquidity: 5000000,   inv_factor: 0.00018, max_inventory: 800000,   max_notional_usdt: 500000 },
  { group: 'USDT',  ticker: 'ADAUSDT',  quote: 'USDT', seed: 0.45,   liquidity: 3000000,   inv_factor: 0.00018, max_inventory: 1000000,  max_notional_usdt: 300000 },
  { group: 'USDT',  ticker: 'DOGEUSDT', quote: 'USDT', seed: 0.12,   liquidity: 10000000,  inv_factor: 0.00020, max_inventory: 5000000,  max_notional_usdt: 300000 },
  { group: 'USDT',  ticker: 'AVAXUSDT', quote: 'USDT', seed: 28,     liquidity: 100000,    inv_factor: 0.00025, max_inventory: 15000,    max_notional_usdt: 300000 },
  { group: 'USDT',  ticker: 'LINKUSDT', quote: 'USDT', seed: 13,     liquidity: 200000,    inv_factor: 0.00025, max_inventory: 40000,    max_notional_usdt: 300000 },
  { group: 'USDT',  ticker: 'DOTUSDT',  quote: 'USDT', seed: 5,      liquidity: 500000,    inv_factor: 0.00025, max_inventory: 100000,   max_notional_usdt: 300000 },
  { group: 'USDT',  ticker: 'MATICUSDT',quote: 'USDT', seed: 0.35,   liquidity: 3000000,   inv_factor: 0.00022, max_inventory: 1500000,  max_notional_usdt: 300000 },
  { group: 'USDT',  ticker: 'TONUSDT',  quote: 'USDT', seed: 5,      liquidity: 300000,    inv_factor: 0.00025, max_inventory: 100000,   max_notional_usdt: 300000 },
  // USDC
  { group: 'USDC',  ticker: 'BTCUSDC',  quote: 'USDC', seed: 82000,  liquidity: 500,       inv_factor: 0.00040, max_inventory: 5,        max_notional_usdt: 500000 },
  { group: 'USDC',  ticker: 'ETHUSDC',  quote: 'USDC', seed: 3500,   liquidity: 5000,      inv_factor: 0.00025, max_inventory: 80,       max_notional_usdt: 500000 },
  { group: 'USDC',  ticker: 'SOLUSDC',  quote: 'USDC', seed: 180,    liquidity: 40000,     inv_factor: 0.00022, max_inventory: 2500,     max_notional_usdt: 300000 },
  { group: 'USDC',  ticker: 'XRPUSDC',  quote: 'USDC', seed: 0.60,   liquidity: 2000000,   inv_factor: 0.00020, max_inventory: 500000,   max_notional_usdt: 300000 },
  // EUR
  { group: 'EUR',   ticker: 'BTCEUR',   quote: 'EUR',  seed: 75000,  liquidity: 400,       inv_factor: 0.00042, max_inventory: 3,        max_notional_usdt: 300000 },
  { group: 'EUR',   ticker: 'ETHEUR',   quote: 'EUR',  seed: 3200,   liquidity: 3000,      inv_factor: 0.00028, max_inventory: 50,       max_notional_usdt: 300000 },
  { group: 'EUR',   ticker: 'USDTEUR',  quote: 'EUR',  seed: 0.92,   liquidity: 1000000,   inv_factor: 0.00015, max_inventory: 500000,   max_notional_usdt: 300000 },
  // BTC-quoted (altcoin/BTC)
  { group: 'BTC',   ticker: 'ETHBTC',   quote: 'BTC',  seed: 0.043,  liquidity: 3000,      inv_factor: 0.00025, max_inventory: 50,       max_notional_usdt: 200000 },
  { group: 'BTC',   ticker: 'SOLBTC',   quote: 'BTC',  seed: 0.0022, liquidity: 30000,     inv_factor: 0.00022, max_inventory: 1000,     max_notional_usdt: 200000 },
  { group: 'BTC',   ticker: 'BNBBTC',   quote: 'BTC',  seed: 0.0075, liquidity: 5000,      inv_factor: 0.00025, max_inventory: 300,      max_notional_usdt: 200000 },
];

const fmt = (v, d = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: d, maximumFractionDigits: d,
  });
};

// ---------------------------------------------------------------------------
// Section primitive
// ---------------------------------------------------------------------------
const Section = ({ icon: Icon, title, subtitle, children, actions }) => (
  <Card className="bg-zinc-950/80 border border-gold-800/25 p-6">
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="h-9 w-9 rounded-md bg-gold-500/10 border border-gold-500/30 grid place-items-center">
            <Icon size={16} className="text-gold-400" />
          </div>
        )}
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">{title}</h3>
          {subtitle && <p className="text-[12px] text-zinc-500 mt-1 max-w-xl">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
    {children}
  </Card>
);

// ---------------------------------------------------------------------------
// 1) Desk Health header
// ---------------------------------------------------------------------------
const DeskHealth = ({ stats }) => {
  if (!stats) return null;
  const live = stats.live || {};
  const d1 = stats.d1?.totals || {};
  const dailyLimit = live.daily_loss_limit_usdt || 0;
  const dailyPnl = live.daily_pnl || 0;
  const dailyPct = dailyLimit > 0 ? Math.min(100, Math.max(0, (-dailyPnl / dailyLimit) * 100)) : 0;
  const tiles = [
    { label: 'Total PnL', value: fmt(live.total_pnl), tone: (live.total_pnl || 0) >= 0 ? 'pos' : 'neg' },
    { label: 'Daily PnL', value: fmt(dailyPnl), tone: dailyPnl >= 0 ? 'pos' : 'neg' },
    { label: 'Active Quotes', value: String(live.active_quotes || 0), tone: 'neutral' },
    { label: '24h Volume', value: fmt(d1.volume_usdt) + ' USDT', tone: 'neutral' },
    { label: '24h Spread Capture', value: fmt(d1.spread_capture) + ' USDT', tone: 'pos' },
  ];
  return (
    <div data-testid="desk-health" className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {tiles.map((t) => (
        <div key={t.label} className="bg-zinc-950/60 border border-zinc-800 rounded-md p-4">
          <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-1.5">{t.label}</div>
          <div className={`text-xl font-light tabular-nums ${
            t.tone === 'pos' ? 'text-emerald-300' : t.tone === 'neg' ? 'text-rose-300' : 'text-white'
          }`}>{t.value}</div>
        </div>
      ))}
      {dailyLimit > 0 && (
        <div className="col-span-2 md:col-span-5 bg-zinc-950/60 border border-zinc-800 rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-widest uppercase text-zinc-500">
              Daily loss utilisation vs {fmt(dailyLimit)} USDT limit
            </span>
            <span className="text-[11px] text-zinc-400 tabular-nums">{dailyPct.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded overflow-hidden">
            <div
              className={`h-full transition-all ${dailyPct > 80 ? 'bg-rose-400' : dailyPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2) Pricing + 3) Risk — inline editors
// ---------------------------------------------------------------------------
const NumberField = ({ label, value, onChange, step = 1, suffix, testId }) => (
  <div>
    <Label className="text-[11px] tracking-widest uppercase text-zinc-500 mb-1 block">{label}</Label>
    <div className="flex items-center gap-2">
      <Input
        data-testid={testId}
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="bg-zinc-900 border-zinc-800 text-white tabular-nums"
      />
      {suffix && <span className="text-[11px] text-zinc-500 whitespace-nowrap">{suffix}</span>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// 4) Asset row edit dialog
// ---------------------------------------------------------------------------
const AssetDialog = ({ open, onClose, initial, onSave }) => {
  const [form, setForm] = useState({
    symbol: '', quote: 'USDT', seed: 1, liquidity: 1000,
    inv_factor: 0.0002, max_inventory: 0, max_notional_usdt: 0,
  });
  useEffect(() => {
    if (initial) setForm({ ...form, ...initial });
    else setForm({ symbol: '', quote: 'USDT', seed: 1, liquidity: 1000, inv_factor: 0.0002, max_inventory: 0, max_notional_usdt: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  const handleSave = async () => {
    if (!form.symbol) { toast.error('Symbol required'); return; }
    await onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-950 border-gold-800/40 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-gold-400">
            {initial?.symbol ? `Edit ${initial.symbol}` : 'Add asset to universe'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          {!initial?.symbol && (
            <div className="col-span-2">
              <Label className="text-[11px] tracking-widest uppercase text-zinc-500 mb-1 block">
                Pick a popular pair (optional)
              </Label>
              <Select
                onValueChange={(ticker) => {
                  const p = POPULAR_PAIRS.find((x) => x.ticker === ticker);
                  if (!p) return;
                  setForm({
                    symbol: p.ticker,
                    quote: p.quote,
                    seed: p.seed,
                    liquidity: p.liquidity,
                    inv_factor: p.inv_factor,
                    max_inventory: p.max_inventory,
                    max_notional_usdt: p.max_notional_usdt,
                  });
                }}
              >
                <SelectTrigger
                  data-testid="asset-preset-select"
                  className="bg-zinc-900 border-zinc-800 text-white h-10"
                >
                  <SelectValue placeholder="— select from curated list —" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white max-h-80">
                  {['USDT', 'USDC', 'EUR', 'BTC'].map((grp) => (
                    <SelectGroup key={grp}>
                      <SelectLabel className="text-gold-400">vs {grp}</SelectLabel>
                      {POPULAR_PAIRS.filter((p) => p.group === grp).map((p) => (
                        <SelectItem key={p.ticker} value={p.ticker} className="focus:bg-gold-500/15">
                          <span className="font-mono text-xs">{p.ticker}</span>
                          <span className="text-zinc-500 ml-2">≈ seed {p.seed} {p.quote}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-600 mt-1">
                Selecting a pair pre-fills all fields below. You can still tweak each value before saving.
              </p>
            </div>
          )}
          <div className="col-span-2 md:col-span-1">
            <Label className="text-[11px] tracking-widest uppercase text-zinc-500 mb-1 block">
              Symbol (base)
            </Label>
            <Input
              data-testid="asset-symbol-input"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase().trim() })}
              className="bg-zinc-900 border-zinc-800 text-white uppercase"
              placeholder="BTC"
              disabled={!!initial?.symbol}
            />
            {!initial?.symbol && (
              <p className="text-[10px] text-zinc-600 mt-1">
                Unique per pair — BTC/USDT and BTC/USDC are considered different symbols (use BTCUSDC for the second).
              </p>
            )}
          </div>
          <div>
            <Label className="text-[11px] tracking-widest uppercase text-zinc-500 mb-1 block">Quote</Label>
            <Input
              value={form.quote}
              onChange={(e) => setForm({ ...form, quote: e.target.value.toUpperCase().trim() })}
              className="bg-zinc-900 border-zinc-800 text-white uppercase"
            />
          </div>
          <NumberField
            label="Seed price"
            value={form.seed}
            step={0.0001}
            onChange={(v) => setForm({ ...form, seed: v })}
            suffix={form.quote}
            testId="asset-seed-input"
          />
          <NumberField
            label="Liquidity (size component denom.)"
            value={form.liquidity}
            onChange={(v) => setForm({ ...form, liquidity: v })}
            suffix={form.symbol || 'base'}
            testId="asset-liquidity-input"
          />
          <NumberField
            label="Inv. factor"
            value={form.inv_factor}
            step={0.00001}
            onChange={(v) => setForm({ ...form, inv_factor: v })}
            testId="asset-inv-factor-input"
          />
          <NumberField
            label="Max inventory"
            value={form.max_inventory}
            step={0.01}
            onChange={(v) => setForm({ ...form, max_inventory: v })}
            suffix={form.symbol || 'base'}
            testId="asset-max-inv-input"
          />
          <NumberField
            label="Max notional"
            value={form.max_notional_usdt}
            onChange={(v) => setForm({ ...form, max_notional_usdt: v })}
            suffix="USDT"
            testId="asset-max-notional-input"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            data-testid="asset-save-btn"
            onClick={handleSave}
            className="bg-gold-400 hover:bg-gold-300 text-black"
          >
            <Save size={14} className="mr-1.5" />Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminOTCDeskPage() {
  const { token } = useAuth();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [stats, setStats] = useState(null);
  const [trades, setTrades] = useState([]);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [venuesData, setVenuesData] = useState(null);

  const loadVenues = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/api/otc-desk/admin/venues`, { headers });
      setVenuesData(data);
    } catch { /* silent */ }
  };

  const load = async () => {
    if (!token) return;
    try {
      const [cfg, st, tr] = await Promise.all([
        axios.get(`${API}/api/otc-desk/admin/config`, { headers }),
        axios.get(`${API}/api/otc-desk/admin/stats`, { headers }),
        axios.get(`${API}/api/otc-desk/admin/trades?limit=100${symbolFilter ? `&symbol=${symbolFilter}` : ''}`, { headers }),
      ]);
      setConfig(cfg.data);
      setStats(st.data);
      setTrades(tr.data.trades || []);
      loadVenues();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to load desk admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token, symbolFilter]);

  // Poll stats every 5 s for the live header
  useEffect(() => {
    if (!token) return;
    const i = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API}/api/otc-desk/admin/stats`, { headers });
        setStats(data);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(i);
  }, [token, headers]);

  // ------------- mutations -------------------------------------------------
  const savePricing = async () => {
    try {
      await axios.put(`${API}/api/otc-desk/admin/config/pricing`, config.pricing, { headers });
      toast.success('Pricing parameters saved');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    }
  };

  const saveRisk = async () => {
    try {
      await axios.put(`${API}/api/otc-desk/admin/config/risk`, config.risk, { headers });
      toast.success('Risk limits saved');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    }
  };

  const deleteAsset = async (symbol) => {
    if (!window.confirm(`Remove ${symbol} from the universe?`)) return;
    try {
      await axios.delete(`${API}/api/otc-desk/admin/assets/${symbol}`, { headers });
      toast.success(`${symbol} removed`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Remove failed');
    }
  };

  const saveAsset = async (form) => {
    try {
      await axios.post(`${API}/api/otc-desk/admin/assets`, form, { headers });
      toast.success(`${form.symbol} saved`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Asset save failed');
    }
  };

  const setHedgeMode = async (mode) => {
    try {
      await axios.put(`${API}/api/otc-desk/admin/venues/mode`, { mode }, { headers });
      toast.success(`Hedge mode: ${mode}`);
      loadVenues();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Mode switch failed');
    }
  };

  const refreshVenues = async () => {
    try {
      await axios.post(`${API}/api/otc-desk/admin/venues/refresh`, {}, { headers });
      await loadVenues();
      toast.success('Venues refreshed from Fireblocks');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Refresh failed');
    }
  };

  // ------------- render ---------------------------------------------------
  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-400" />
      </div>
    );
  }

  return (
    <div data-testid="admin-otc-desk-page" className="space-y-6 pb-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold-400">KBEX</span>
            <span className="h-px w-8 bg-gold-400/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500">Admin</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-white mt-2">
            OTC Desk <span className="text-gold-400">— Configuration</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl">
            Tune pricing parameters, risk limits and the asset universe at runtime.
            Changes are applied immediately — no redeploy required.
          </p>
        </div>
        <Button
          data-testid="admin-reload-btn"
          variant="ghost"
          onClick={load}
          className="text-zinc-400 hover:text-gold-300"
        >
          <RefreshCw size={14} className="mr-1.5" />
          Refresh
        </Button>
      </div>

      <Section icon={Activity} title="Desk Health" subtitle="Live snapshot of PnL, activity and daily loss utilisation.">
        <DeskHealth stats={stats} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          icon={Settings2}
          title="Pricing Parameters"
          subtitle="Components summed into every firm quote."
          actions={
            <Button data-testid="pricing-save-btn" size="sm" onClick={savePricing} className="bg-gold-400 hover:bg-gold-300 text-black">
              <Save size={13} className="mr-1.5" />Save
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Base margin"
              value={config.pricing.base_margin_bps}
              step={0.5}
              onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, base_margin_bps: v } })}
              suffix="bps"
              testId="pricing-base-margin-input"
            />
            <NumberField
              label="Volatility factor"
              value={config.pricing.vol_factor}
              step={0.05}
              onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, vol_factor: v } })}
              suffix="× σ"
              testId="pricing-vol-factor-input"
            />
            <NumberField
              label="Quote TTL"
              value={config.pricing.quote_ttl_ms}
              step={500}
              onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, quote_ttl_ms: v } })}
              suffix="ms"
              testId="pricing-quote-ttl-input"
            />
            <NumberField
              label="Hedge latency"
              value={config.pricing.hedge_latency_ms}
              step={50}
              onChange={(v) => setConfig({ ...config, pricing: { ...config.pricing, hedge_latency_ms: v } })}
              suffix="ms"
              testId="pricing-hedge-latency-input"
            />
          </div>
        </Section>

        <Section
          icon={ShieldAlert}
          title="Risk Limits"
          subtitle="Daily loss guard + auto-widen spreads when inventory utilisation spikes."
          actions={
            <Button data-testid="risk-save-btn" size="sm" onClick={saveRisk} className="bg-gold-400 hover:bg-gold-300 text-black">
              <Save size={13} className="mr-1.5" />Save
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Daily loss limit"
              value={config.risk.daily_loss_limit_usdt}
              step={1000}
              onChange={(v) => setConfig({ ...config, risk: { ...config.risk, daily_loss_limit_usdt: v } })}
              suffix="USDT"
              testId="risk-daily-loss-input"
            />
            <div>
              <Label className="text-[11px] tracking-widest uppercase text-zinc-500 mb-1 block">Auto-widen</Label>
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5">
                <Switch
                  data-testid="risk-auto-widen-toggle"
                  checked={!!config.risk.auto_widen_enabled}
                  onCheckedChange={(v) => setConfig({ ...config, risk: { ...config.risk, auto_widen_enabled: v } })}
                />
                <span className="text-xs text-zinc-300">
                  {config.risk.auto_widen_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <NumberField
              label="Trigger utilisation"
              value={config.risk.auto_widen_trigger_pct}
              step={5}
              onChange={(v) => setConfig({ ...config, risk: { ...config.risk, auto_widen_trigger_pct: v } })}
              suffix="%"
              testId="risk-trigger-pct-input"
            />
            <NumberField
              label="Spread multiplier"
              value={config.risk.auto_widen_multiplier}
              step={0.25}
              onChange={(v) => setConfig({ ...config, risk: { ...config.risk, auto_widen_multiplier: v } })}
              suffix="×"
              testId="risk-multiplier-input"
            />
          </div>
        </Section>
      </div>

      <Section
        icon={Link2}
        title="Venues (Fireblocks)"
        subtitle={`Linked exchange accounts via Fireblocks MPC custody. Current hedge mode controls whether orders are simulated, shadowed or sent live.${venuesData?.last_error ? ' ⚠ ' + venuesData.last_error : ''}`}
        actions={
          <Button
            data-testid="venues-refresh-btn"
            size="sm"
            variant="ghost"
            onClick={refreshVenues}
            className="text-zinc-400 hover:text-gold-300"
          >
            <RefreshCw size={13} className="mr-1.5" />Refresh
          </Button>
        }
      >
        <div className="mb-5">
          <Label className="text-[11px] tracking-widest uppercase text-zinc-500 mb-2 block">
            Hedge Execution Mode
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'simulated', label: 'Simulated', desc: 'Pure in-memory mock' },
              { v: 'shadow', label: 'Shadow', desc: 'Real venue pick, no order sent' },
              { v: 'live', label: 'Live', desc: 'Disabled (Phase 4b)', disabled: true },
            ].map((m) => {
              const active = venuesData?.mode === m.v;
              return (
                <button
                  key={m.v}
                  type="button"
                  disabled={m.disabled}
                  data-testid={`hedge-mode-${m.v}`}
                  onClick={() => !m.disabled && setHedgeMode(m.v)}
                  className={`rounded-md px-3 py-3 text-left transition ${
                    active
                      ? 'bg-gold-500/15 ring-1 ring-gold-500/50'
                      : m.disabled
                        ? 'bg-zinc-900/40 opacity-40 cursor-not-allowed'
                        : 'bg-zinc-900 hover:bg-zinc-800/70'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Radio size={11} className={active ? 'text-gold-400' : 'text-zinc-500'} />
                    <span className={`text-xs font-medium ${active ? 'text-gold-300' : 'text-zinc-300'}`}>
                      {m.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {!venuesData || venuesData.venues.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-600">
            No venues connected. Add exchange accounts in your Fireblocks workspace.
          </div>
        ) : (
          <div className="space-y-2">
            {venuesData.venues.map((v) => (
              <div
                key={v.id}
                data-testid={`venue-row-${v.type}`}
                className="bg-zinc-950/60 border border-zinc-800 rounded-md p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{v.name}</span>
                      <span className="text-[10px] tracking-widest uppercase text-zinc-500">{v.type}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        v.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-1 font-mono">{v.id}</div>
                  </div>
                  <div className="text-[10px] tracking-widest uppercase text-zinc-500">
                    {v.assets.length} asset{v.assets.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {v.assets.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {v.assets.filter(a => a.available > 0).slice(0, 8).map((a) => (
                      <div key={a.id} className="bg-zinc-900 rounded px-2.5 py-1.5 border border-zinc-800/60">
                        <div className="text-[10px] tracking-widest text-zinc-500">{a.id}</div>
                        <div className="text-xs text-zinc-200 tabular-nums">{fmt(a.available, 6)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Coins}
        title="Asset Universe"
        subtitle="Add, edit and remove tradable pairs. Per-asset risk caps feed the pre-trade gate."
        actions={
          <Button
            data-testid="asset-add-btn"
            size="sm"
            onClick={() => { setEditingAsset(null); setDialogOpen(true); }}
            className="bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40"
          >
            <Plus size={13} className="mr-1.5" />Add asset
          </Button>
        }
      >
        <div className="overflow-hidden border border-zinc-800/80 rounded-md">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-950/60">
            <div className="col-span-2">Pair</div>
            <div className="col-span-2 text-right">Live mid</div>
            <div className="col-span-1 text-right">Inventory</div>
            <div className="col-span-2 text-right">Max inv.</div>
            <div className="col-span-2 text-right">Max notional</div>
            <div className="col-span-2 text-right">Liquidity</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y divide-zinc-900">
            {(config.assets || []).map((a) => {
              const sym = a.symbol;
              const mid = stats?.live?.inventory?.[sym] !== undefined
                ? (trades.find(t => t.symbol === sym)?.mid ?? null)
                : null;
              const inv = stats?.live?.inventory?.[sym] ?? 0;
              return (
                <div key={sym} data-testid={`asset-row-${sym}`} className="grid grid-cols-12 gap-2 px-3 py-3 text-xs items-center">
                  <div className="col-span-2 text-white font-medium">
                    {sym}<span className="text-zinc-500 ml-1">/ {a.quote}</span>
                  </div>
                  <div className="col-span-2 text-right text-zinc-300 tabular-nums">{mid ? fmt(mid) : '—'}</div>
                  <div className={`col-span-1 text-right tabular-nums ${inv > 0 ? 'text-emerald-300' : inv < 0 ? 'text-rose-300' : 'text-zinc-400'}`}>
                    {fmt(inv, 6)}
                  </div>
                  <div className="col-span-2 text-right text-zinc-300 tabular-nums">{fmt(a.max_inventory, 2)}</div>
                  <div className="col-span-2 text-right text-zinc-300 tabular-nums">{fmt(a.max_notional_usdt)} USDT</div>
                  <div className="col-span-2 text-right text-zinc-400 tabular-nums">{fmt(a.liquidity, 0)}</div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`asset-edit-${sym}`}
                      onClick={() => { setEditingAsset(a); setDialogOpen(true); }}
                      className="h-7 w-7 text-zinc-400 hover:text-gold-300"
                    >
                      <Settings2 size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`asset-delete-${sym}`}
                      onClick={() => deleteAsset(sym)}
                      className="h-7 w-7 text-zinc-400 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      <OTCPoliciesSection token={token} />

      <Section
        icon={TrendingUp}
        title="Trade History"
        subtitle="Last 100 executions. Filter by symbol to narrow down the ledger."
        actions={
          <div className="flex items-center gap-2">
            <Input
              data-testid="trade-filter-input"
              placeholder="Filter BTC / ETH / …"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
              className="h-8 w-48 bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>
        }
      >
        {trades.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-600">
            No trades recorded in this window.
          </div>
        ) : (
          <div className="overflow-hidden border border-zinc-800/80 rounded-md">
            <div className="grid grid-cols-7 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-950/60">
              <div>Time</div>
              <div>Pair</div>
              <div>Side</div>
              <div className="text-right">Size</div>
              <div className="text-right">Price</div>
              <div className="text-right">Spread</div>
              <div className="text-right">Capture</div>
            </div>
            <div className="max-h-96 overflow-auto divide-y divide-zinc-900">
              {trades.map((t) => (
                <div key={t.trade_id} data-testid={`trade-row-${t.trade_id}`} className="grid grid-cols-7 gap-2 px-3 py-2 text-xs items-center">
                  <div className="text-zinc-500 tabular-nums">{new Date(t.ts).toLocaleTimeString('en-GB', { hour12: false })}</div>
                  <div className="text-white">{t.symbol}</div>
                  <div className={t.side === 'buy' ? 'text-emerald-300' : 'text-rose-300'}>{t.side.toUpperCase()}</div>
                  <div className="text-right text-zinc-300 tabular-nums">{fmt(t.size, 6)}</div>
                  <div className="text-right text-zinc-300 tabular-nums">{fmt(t.price)}</div>
                  <div className="text-right text-gold-400/80 tabular-nums">{fmt(t.spread_bps, 1)} bps</div>
                  <div className="text-right text-emerald-300 tabular-nums">{fmt(t.spread_capture)} USDT</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <AssetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editingAsset}
        onSave={saveAsset}
      />
    </div>
  );
}
