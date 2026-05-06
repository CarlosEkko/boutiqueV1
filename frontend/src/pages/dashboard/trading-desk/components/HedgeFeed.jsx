/**
 * HedgeFeed — last N hedge legs pushed by the hedge engine.
 */
import React from 'react';
import { Card } from '../../../../components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';

const fmt = (v, d = 2) => Number(v || 0).toLocaleString('en-US', {
  minimumFractionDigits: d, maximumFractionDigits: d,
});

const timeStr = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour12: false });

export default function HedgeFeed({ fills }) {
  return (
    <Card
      data-testid="otc-desk-hedge-feed"
      className="bg-zinc-950/80 border border-gold-800/25 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">
            Hedge Feed
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Simulated venue fills — latency + slippage model
          </p>
        </div>
        <span className="text-[10px] tracking-widest uppercase text-zinc-500">
          Last {fills.length}
        </span>
      </div>

      {fills.length === 0 ? (
        <div className="py-10 text-center text-xs text-zinc-600">
          No hedge activity yet — execute a quote to generate a leg.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-800/80">
          <div className="grid grid-cols-6 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-950/60">
            <div>Time</div>
            <div>Side</div>
            <div>Pair</div>
            <div className="text-right">Size</div>
            <div className="text-right">Fill</div>
            <div className="text-right">Slippage</div>
          </div>
          <div className="max-h-64 overflow-auto divide-y divide-zinc-900">
            {fills.map((f) => {
              const buy = f.side === 'buy';
              return (
                <div
                  key={f.id}
                  data-testid={`hedge-row-${f.id}`}
                  className="grid grid-cols-6 gap-2 px-3 py-2 text-xs items-center"
                >
                  <div className="text-zinc-500 tabular-nums">{timeStr(f.ts)}</div>
                  <div className={buy ? 'text-emerald-300' : 'text-rose-300'}>
                    {buy
                      ? <><ArrowUp size={11} className="inline -mt-0.5 mr-0.5" />BUY</>
                      : <><ArrowDown size={11} className="inline -mt-0.5 mr-0.5" />SELL</>}
                  </div>
                  <div className="text-white">{f.symbol}</div>
                  <div className="text-right text-zinc-300 tabular-nums">{fmt(f.size, 4)}</div>
                  <div className="text-right text-zinc-300 tabular-nums">{fmt(f.price)}</div>
                  <div className="text-right text-gold-400/80 tabular-nums">
                    {fmt(f.slippageBps, 1)} bps
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
