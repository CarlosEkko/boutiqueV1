/**
 * useOTCDeskBackend
 * ----------------------------------------------------------------------------
 * Production hook — drop-in replacement for `useOTCDeskEngine` (the client-side
 * mock). Reads live desk state from the backend quant engine and issues RFQ /
 * Execute / Reset via REST.
 *
 * Polling strategy
 *   • GET /api/otc-desk/state      — every 2 s (market + inventory + PnL + hedges)
 *   • GET /api/otc-desk/pnl-series — every 10 s (equity curve, kept light)
 *
 * Shape contract
 *   The public return is kept identical to the mock hook so that
 *   `InstitutionalDesk.jsx` + its child components consume either engine
 *   interchangeably. Backend snake_case fields are normalised to the
 *   frontend's camelCase (spreadBps, expiresAt, validForMs, slippageBps…).
 */

import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;
const STATE_POLL_MS = 2000;
const CURVE_POLL_MS = 10000;

// Re-exported so existing imports keep working ({ DEFAULT_ASSETS, useOTCDesk… }).
export const DEFAULT_ASSETS = [
  { symbol: 'BTC', quote: 'USDT' },
  { symbol: 'ETH', quote: 'USDT' },
  { symbol: 'SOL', quote: 'USDT' },
  { symbol: 'BNB', quote: 'USDT' },
  { symbol: 'XRP', quote: 'USDT' },
];

// ---------------------------------------------------------------------------
// Normalisation helpers (snake_case ⇒ camelCase expected by components)
// ---------------------------------------------------------------------------
const normaliseQuote = (q) => {
  if (!q) return null;
  return {
    id:           q.id,
    symbol:       q.symbol,
    size:         q.size,
    side:         q.side,
    mid:          q.mid,
    price:        q.price,
    spreadPct:    q.spread_pct ?? q.spreadPct,
    spreadBps:    q.spread_bps ?? q.spreadBps,
    notional:     q.notional,
    components:   q.components,
    createdMs:    q.created_ms ?? q.createdMs,
    expiresAt:    q.expires_ms ?? q.expiresAt,
    validForMs:   q.valid_for_ms ?? q.validForMs,
  };
};

const normaliseHedge = (h) => ({
  id:             h.id,
  ts:             h.ts,
  symbol:         h.symbol,
  side:           h.side,
  size:           h.size,
  price:          h.price,
  slippageBps:    h.slippage_bps ?? h.slippageBps,
  slippageCost:   h.slippage_cost ?? h.slippageCost,
  hedgeNotional:  h.hedge_notional ?? h.hedgeNotional,
  linkedQuoteId:  h.linked_quote_id ?? h.linkedQuoteId,
});

// Keep a tiny rolling price history per asset so the MarketPanel can still
// render the up / down trend arrow (backend doesn't ship history).
const appendHistory = (prev, sym, mid) => {
  const row = prev[sym]?.history || [];
  return { ...row ? { history: [...row.slice(-199), mid] } : { history: [mid] } };
};

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------
export function useOTCDeskEngine(_assetsConfig /* unused — server owns universe */) {
  const { token } = useAuth();
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const [market, setMarket]               = useState({});
  const [inventory, setInventory]         = useState({});
  const [cashPnl, setCashPnl]             = useState(0);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [slippagePnl, setSlippagePnl]     = useState(0);
  const [totalPnl, setTotalPnl]           = useState(0);
  const [equityCurve, setEquityCurve]     = useState([{ t: Date.now(), pnl: 0 }]);
  const [hedgeFeed, setHedgeFeed]         = useState([]);
  const [activeQuote, setActiveQuote]     = useState(null);
  const [config, setConfig]               = useState({
    BASE_MARGIN_BPS: 25, VOL_FACTOR: 0.45, QUOTE_TTL_MS: 15000, HEDGE_LATENCY: 600,
  });

  // Track last history per-asset using a ref so we don't thrash renders.
  const historyRef = useRef({}); // { sym: [mid, mid, …] }

  // -------------------------------------------------------------------------
  // Polling loops
  // -------------------------------------------------------------------------
  const fetchState = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/api/otc-desk/state`, { headers: authHeaders });
      // Merge market — append mid into rolling history (client-side only)
      const nextMarket = {};
      for (const [sym, a] of Object.entries(data.market || {})) {
        const hist = historyRef.current[sym] || [];
        const newHist = [...hist.slice(-199), a.mid];
        historyRef.current[sym] = newHist;
        nextMarket[sym] = { ...a, history: newHist };
      }
      setMarket(nextMarket);
      setInventory(data.inventory || {});
      setCashPnl(data.cash_pnl || 0);
      setUnrealizedPnl(data.unrealized_pnl || 0);
      // backend key is slippage_info (informational); we pipe it to slippagePnl
      // to keep the UI contract unchanged.
      setSlippagePnl(data.slippage_info ?? data.slippage_pnl ?? 0);
      setTotalPnl(data.total_pnl || 0);
      setHedgeFeed((data.hedge_feed || []).map(normaliseHedge));
      if (data.config) {
        setConfig({
          BASE_MARGIN_BPS: data.config.base_margin_bps,
          VOL_FACTOR:      data.config.vol_factor,
          QUOTE_TTL_MS:    data.config.quote_ttl_ms,
          HEDGE_LATENCY:   data.config.hedge_latency_ms,
        });
      }
    } catch (err) {
      // Silent — pulling every 2 s, a single blip shouldn't spam toasts
      if (err?.response?.status === 403) {
        // Only surface auth errors
        // eslint-disable-next-line no-console
        console.warn('[otc-desk] access denied (403)');
      }
    }
  }, [token, authHeaders]);

  const fetchCurve = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/api/otc-desk/pnl-series`, { headers: authHeaders });
      if (Array.isArray(data.series) && data.series.length > 0) {
        setEquityCurve(data.series);
      }
    } catch {/* silent */}
  }, [token, authHeaders]);

  useEffect(() => {
    fetchState();
    fetchCurve();
    const a = setInterval(fetchState, STATE_POLL_MS);
    const b = setInterval(fetchCurve, CURVE_POLL_MS);
    return () => { clearInterval(a); clearInterval(b); };
  }, [fetchState, fetchCurve]);

  // Expire local activeQuote when TTL elapses (the backend expires server-side
  // too — this just prevents the UI from enabling Execute after the deadline).
  useEffect(() => {
    if (!activeQuote) return;
    const ms = Math.max(0, activeQuote.expiresAt - Date.now());
    const t = setTimeout(() => setActiveQuote(null), ms);
    return () => clearTimeout(t);
  }, [activeQuote]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const getQuote = useCallback((symbol, size, side) => {
    if (!token) return null;
    // Fire and forget — RFQPanel already does the "no quote" toast.
    // We still return a stub so the caller can optimistically react (legacy
    // mock returned the quote synchronously); the real quote lands via the
    // awaited post below.
    let resolved = null;
    axios.post(
      `${API}/api/otc-desk/rfq`,
      { symbol, size, side },
      { headers: { ...authHeaders, 'Content-Type': 'application/json' } },
    )
      .then((res) => {
        resolved = normaliseQuote(res.data?.quote);
        setActiveQuote(resolved);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || 'Unable to price request';
        toast.error(msg);
      });
    return resolved || { id: 'pending', expiresAt: Date.now() + 500 };
  }, [token, authHeaders]);

  const executeQuote = useCallback(async () => {
    if (!token || !activeQuote?.id || activeQuote.id === 'pending') return null;
    try {
      const { data } = await axios.post(
        `${API}/api/otc-desk/execute`,
        { quote_id: activeQuote.id },
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } },
      );
      const quote = activeQuote;
      setActiveQuote(null);
      // refresh state soon after — hedge lands ~600 ms later
      setTimeout(fetchState, 700);
      setTimeout(fetchState, 1400);
      const fmt = (v) => Number(v || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      });
      toast.success('Trade filled', {
        description: `${quote.side.toUpperCase()} ${quote.size} ${quote.symbol} @ ${fmt(quote.price)} (spread capture ${fmt(data.spread_capture)} USDT)`,
      });
      return {
        quote,
        spreadCapture: data.spread_capture ?? 0,
        executionTs: data.ts,
      };
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Execution failed';
      toast.error(msg);
      setActiveQuote(null);
      return null;
    }
  }, [token, authHeaders, activeQuote, fetchState]);

  const cancelQuote = useCallback(() => {
    setActiveQuote(null);
  }, []);

  const resetDesk = useCallback(async () => {
    if (!token) return;
    try {
      await axios.post(`${API}/api/otc-desk/reset`, {}, { headers: authHeaders });
      await fetchState();
      await fetchCurve();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Reset failed');
    }
  }, [token, authHeaders, fetchState, fetchCurve]);

  return {
    market,
    inventory,
    cashPnl,
    unrealizedPnl,
    slippagePnl,
    totalPnl,
    equityCurve,
    hedgeFeed,
    activeQuote,
    getQuote,
    executeQuote,
    cancelQuote,
    resetDesk,
    config,
  };
}
