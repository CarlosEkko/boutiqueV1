/**
 * useOTCDeskEngine
 * ----------------------------------------------------------------------------
 * Client-side mock engine that simulates a professional OTC Desk exactly as
 * described in the "Documento Técnico – Crypto OTC Desk". It is a drop-in
 * replacement for a future backend WebSocket feed (/api/ws/otc-desk) and REST
 * endpoints (/api/otc-desk/rfq, /api/otc-desk/execute).
 *
 * Responsibilities
 *   • Maintain a random-walk market feed per asset (mid / bid / ask / vol)
 *   • Pricing Engine — firm quote with the canonical spread formula
 *   • Risk & Inventory Engine — inventory skew pushed back into pricing
 *   • Hedge Engine — mock latency + slippage, emits a hedge leg per trade
 *   • PnL Engine — cash PnL, unrealized PnL, equity-curve time series
 *
 * Swap plan
 *   When the backend engine ships, replace this hook with a thin wrapper that
 *   opens `WS /api/ws/otc-desk` and calls `POST /api/otc-desk/rfq|execute`.
 *   The component API (getQuote, executeQuote, snapshot) is deliberately kept
 *   identical so the UI layer does not change.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Default assets — Top-5 vs USDT. The institutional admin will later be able
 * to add / remove assets from a settings panel (see ROADMAP Fase 4).
 */
export const DEFAULT_ASSETS = [
  { symbol: 'BTC',  quote: 'USDT', seedPrice: 65000,  sigma: 35,   liquidity: 800,     invFactor: 0.00040 },
  { symbol: 'ETH',  quote: 'USDT', seedPrice: 3500,   sigma: 4,    liquidity: 8000,    invFactor: 0.00025 },
  { symbol: 'SOL',  quote: 'USDT', seedPrice: 180,    sigma: 0.8,  liquidity: 60000,   invFactor: 0.00020 },
  { symbol: 'BNB',  quote: 'USDT', seedPrice: 620,    sigma: 1.6,  liquidity: 12000,   invFactor: 0.00025 },
  { symbol: 'XRP',  quote: 'USDT', seedPrice: 0.60,   sigma: 0.004, liquidity: 5_000_000, invFactor: 0.00018 },
];

const BASE_MARGIN_BPS = 25;   // 0.25% institutional base margin
const VOL_FACTOR      = 0.45; // volatility premium multiplier
const QUOTE_TTL_MS    = 15000;// firm quote valid for 15s
const HEDGE_LATENCY   = 600;  // ms — simulated venue latency
const TICK_MS         = 500;  // market tick cadence

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();

const gaussian = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// ---------------------------------------------------------------------------
// main hook
// ---------------------------------------------------------------------------
export function useOTCDeskEngine(assetsConfig = DEFAULT_ASSETS) {
  // ---- market state --------------------------------------------------------
  const [market, setMarket] = useState(() =>
    Object.fromEntries(assetsConfig.map((a) => [a.symbol, {
      ...a,
      mid: a.seedPrice,
      bid: a.seedPrice,
      ask: a.seedPrice,
      vol: 0,   // rolling realised volatility (std of last N returns)
      history: [a.seedPrice],
    }]))
  );

  // ---- desk state ----------------------------------------------------------
  const [inventory, setInventory] = useState(() =>
    Object.fromEntries(assetsConfig.map((a) => [a.symbol, 0]))
  );
  const [cashPnl, setCashPnl] = useState(0);
  const [slippagePnl, setSlippagePnl] = useState(0);
  const [equityCurve, setEquityCurve] = useState(() => [
    { t: now(), pnl: 0 },
  ]);
  const [hedgeFeed, setHedgeFeed] = useState([]); // last 50 legs

  // ---- active firm quote ---------------------------------------------------
  const [activeQuote, setActiveQuote] = useState(null);
  const quoteTimerRef = useRef(null);

  // -------------------------------------------------------------------------
  // Market tick — random walk, updates mid/bid/ask/vol/history
  // -------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      setMarket((prev) => {
        const next = { ...prev };
        for (const sym of Object.keys(next)) {
          const a = next[sym];
          const drift = gaussian() * a.sigma;
          const mid = Math.max(0.0001, a.mid + drift);
          const history = [...a.history.slice(-199), mid];
          // realised vol — std of the last 60 log returns, annualised roughly
          const recent = history.slice(-60);
          let vol = 0;
          if (recent.length > 5) {
            const rets = recent.slice(1).map((p, i) => Math.log(p / recent[i]));
            const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
            const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
            vol = Math.sqrt(variance);
          }
          // Reference bid/ask using a micro spread (1 bps each side) — this is
          // the public market view, NOT the OTC firm quote (which adds skew).
          const micro = mid * 0.00005;
          next[sym] = {
            ...a,
            mid,
            bid: mid - micro,
            ask: mid + micro,
            vol,
            history,
          };
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // -------------------------------------------------------------------------
  // Unrealized PnL — recompute whenever market or inventory changes.
  // -------------------------------------------------------------------------
  const unrealizedPnl = useMemo(() => {
    let up = 0;
    for (const sym of Object.keys(inventory)) {
      const inv = inventory[sym] || 0;
      if (inv === 0) continue;
      const mid = market[sym]?.mid ?? 0;
      up += inv * mid;
    }
    // Cost basis tracking is not required for the MVP (we mark unrealized PnL
    // as delta × mid from the last equity snapshot). For a simple yet honest
    // representation we compute unrealized as inventory_mtm minus cumulative
    // hedge notionals.
    const invested = hedgeFeed.reduce((s, h) => s + h.hedgeNotional, 0);
    return up - invested;
  }, [inventory, market, hedgeFeed]);

  // -------------------------------------------------------------------------
  // Equity curve — append a point every 2s with total pnl = cash + unrealized
  // -------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      setEquityCurve((prev) => [
        ...prev.slice(-299),
        { t: now(), pnl: cashPnl + unrealizedPnl + slippagePnl },
      ]);
    }, 2000);
    return () => clearInterval(id);
  }, [cashPnl, unrealizedPnl, slippagePnl]);

  // -------------------------------------------------------------------------
  // Pricing Engine — firm quote for a given size/side
  //   Spread = base + size/liquidity + vol * VOL_FACTOR + inventory * invFactor
  //   Buy quote (client buys, desk sells)  ⇒ mid * (1 + spread)
  //   Sell quote (client sells, desk buys) ⇒ mid * (1 - spread)
  // -------------------------------------------------------------------------
  const buildQuote = useCallback((symbol, size, side) => {
    const a = market[symbol];
    if (!a || size <= 0) return null;
    const inv = inventory[symbol] || 0;
    // When desk is long, widen ask (push price up) to attract sellers / deter buyers from hitting us
    const skewSign = side === 'buy' ? (inv < 0 ? 1 : -1) : (inv > 0 ? 1 : -1);
    const baseComponent    = BASE_MARGIN_BPS / 10000;
    const sizeComponent    = size / a.liquidity;
    const volComponent     = a.vol * VOL_FACTOR;
    const invComponent     = Math.abs(inv) * a.invFactor * skewSign * -1; // invert: long inv tightens for sellers
    const spreadPct        = Math.max(0, baseComponent + sizeComponent + volComponent + invComponent);
    const price            = side === 'buy'
      ? a.mid * (1 + spreadPct)
      : a.mid * (1 - spreadPct);
    const notional         = price * size;
    const expiresAt        = now() + QUOTE_TTL_MS;
    return {
      id: uid(),
      symbol, size, side,
      mid: a.mid,
      price,
      spreadPct,
      spreadBps: spreadPct * 10000,
      components: {
        base: baseComponent, size: sizeComponent, vol: volComponent, inv: invComponent,
      },
      notional,
      expiresAt,
      validForMs: QUOTE_TTL_MS,
    };
  }, [market, inventory]);

  const getQuote = useCallback((symbol, size, side) => {
    const q = buildQuote(symbol, Number(size) || 0, side);
    if (!q) return null;
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    setActiveQuote(q);
    quoteTimerRef.current = setTimeout(() => {
      setActiveQuote((curr) => (curr && curr.id === q.id ? null : curr));
    }, QUOTE_TTL_MS);
    return q;
  }, [buildQuote]);

  // -------------------------------------------------------------------------
  // Execution — hits the firm quote, updates inventory + PnL + triggers hedge
  // -------------------------------------------------------------------------
  const executeQuote = useCallback(() => {
    if (!activeQuote || activeQuote.expiresAt < now()) return null;
    const q = activeQuote;
    // Client buys  ⇒ desk sells size of base → inventory decreases
    // Client sells ⇒ desk buys  size of base → inventory increases
    const invDelta = q.side === 'buy' ? -q.size : q.size;
    setInventory((prev) => ({ ...prev, [q.symbol]: (prev[q.symbol] || 0) + invDelta }));

    // Spread capture in quote asset (USDT) — difference between firm price and mid
    const spreadCapture = q.side === 'buy'
      ? (q.price - q.mid) * q.size
      : (q.mid - q.price) * q.size;
    setCashPnl((v) => v + spreadCapture);

    // Trigger simulated hedge after latency — desk rebalances inventory
    const hedgeId = uid();
    setTimeout(() => {
      // slippage ∝ size / liquidity, realised randomly around expected
      const a = market[q.symbol];
      const liquidity = a?.liquidity || 1;
      const slippageBps = (q.size / liquidity) * 10000 * (0.8 + Math.random() * 0.4);
      const hedgeSide = q.side === 'buy' ? 'buy' : 'sell'; // desk hedges in the same direction as client to re-flatten
      const hedgeMid  = a?.mid ?? q.mid;
      const hedgeFillPrice = hedgeSide === 'buy'
        ? hedgeMid * (1 + slippageBps / 10000)
        : hedgeMid * (1 - slippageBps / 10000);
      const hedgeNotional = hedgeFillPrice * q.size * (hedgeSide === 'buy' ? 1 : -1);
      const slippageCost  = Math.abs(hedgeFillPrice - hedgeMid) * q.size;
      setSlippagePnl((v) => v - slippageCost);
      // Net the inventory back to zero (simulated fill)
      const hedgeInvDelta = q.side === 'buy' ? q.size : -q.size;
      setInventory((prev) => ({ ...prev, [q.symbol]: (prev[q.symbol] || 0) + hedgeInvDelta }));
      setHedgeFeed((prev) => [{
        id: hedgeId,
        ts: now(),
        symbol: q.symbol,
        side: hedgeSide,
        size: q.size,
        price: hedgeFillPrice,
        slippageBps,
        slippageCost,
        hedgeNotional,
        linkedQuoteId: q.id,
      }, ...prev].slice(0, 50));
    }, HEDGE_LATENCY);

    setActiveQuote(null);
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);

    return {
      quote: q,
      spreadCapture,
      executionTs: now(),
    };
  }, [activeQuote, market]);

  const cancelQuote = useCallback(() => {
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    setActiveQuote(null);
  }, []);

  // reset helper for testing / QA
  const resetDesk = useCallback(() => {
    setCashPnl(0);
    setSlippagePnl(0);
    setInventory(Object.fromEntries(assetsConfig.map((a) => [a.symbol, 0])));
    setEquityCurve([{ t: now(), pnl: 0 }]);
    setHedgeFeed([]);
    setActiveQuote(null);
  }, [assetsConfig]);

  const totalPnl = cashPnl + unrealizedPnl + slippagePnl;

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
    config: { BASE_MARGIN_BPS, VOL_FACTOR, QUOTE_TTL_MS, HEDGE_LATENCY, TICK_MS },
  };
}
