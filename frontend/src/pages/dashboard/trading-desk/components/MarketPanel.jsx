/**
 * MarketPanel — Real-time mid/bid/ask grid for the configured asset universe.
 * Reads from the mock engine today; same shape as the future WS feed.
 */
import React from 'react';
import { Card } from '../../../../components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (v, decimals = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const assetDecimals = (sym) => (sym === 'XRP' ? 5 : 2);

export default function MarketPanel({ market, selected, onSelect }) {
  return (
    <Card
      data-testid="otc-desk-market-panel"
      className="bg-zinc-950/80 border border-gold-800/25 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">
            Market — live feed
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Reference mid price streamed from market data engine
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest text-emerald-400">
            Live
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-[11px] text-zinc-500 uppercase tracking-wider px-2">
        <div className="col-span-1">Pair</div>
        <div className="text-right">Bid</div>
        <div className="text-right">Mid</div>
        <div className="text-right">Ask</div>
        <div className="text-right">Realised σ</div>
      </div>

      <div className="space-y-1 mt-2">
        {Object.entries(market).map(([sym, a]) => {
          const active = sym === selected;
          const prev   = a.history[a.history.length - 2] ?? a.mid;
          const up     = a.mid >= prev;
          const dec    = assetDecimals(sym);
          return (
            <button
              key={sym}
              type="button"
              onClick={() => onSelect?.(sym)}
              data-testid={`otc-market-row-${sym}`}
              className={`w-full grid grid-cols-5 gap-2 items-center px-2 py-2.5 rounded-md transition
                ${active
                  ? 'bg-gold-500/10 ring-1 ring-gold-500/40'
                  : 'hover:bg-zinc-900/60'}`}
            >
              <div className="col-span-1 text-left flex items-center gap-2">
                <span className="text-white font-medium text-sm">{sym}</span>
                <span className="text-zinc-500 text-[10px]">/ {a.quote}</span>
                {up
                  ? <TrendingUp size={12} className="text-emerald-400" />
                  : <TrendingDown size={12} className="text-rose-400" />}
              </div>
              <div className="text-right text-zinc-400 tabular-nums">{fmt(a.bid, dec)}</div>
              <div className={`text-right tabular-nums font-medium ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmt(a.mid, dec)}
              </div>
              <div className="text-right text-zinc-400 tabular-nums">{fmt(a.ask, dec)}</div>
              <div className="text-right text-gold-400/70 tabular-nums">
                {fmt((a.vol || 0) * 100, 3)}%
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
