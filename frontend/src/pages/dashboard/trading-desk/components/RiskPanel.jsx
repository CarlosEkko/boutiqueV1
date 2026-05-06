/**
 * RiskPanel — inventory by asset + PnL decomposition.
 */
import React from 'react';
import { Card } from '../../../../components/ui/card';

const fmt = (v, decimals = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '';
  return sign + Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
};

const Tile = ({ label, value, tone = 'neutral', dataTestid }) => {
  const toneCls = tone === 'pos'
    ? 'text-emerald-300'
    : tone === 'neg'
      ? 'text-rose-300'
      : 'text-white';
  return (
    <div
      data-testid={dataTestid}
      className="bg-zinc-950/60 border border-zinc-800 rounded-md p-3.5"
    >
      <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-1.5">{label}</div>
      <div className={`text-xl font-light tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
};

export default function RiskPanel({
  inventory, market, cashPnl, unrealizedPnl, slippagePnl, totalPnl,
}) {
  return (
    <Card
      data-testid="otc-desk-risk-panel"
      className="bg-zinc-950/80 border border-gold-800/25 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">
            Risk &amp; Inventory
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Live desk exposure + PnL decomposition
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Tile
          label="Total PnL"
          value={fmt(totalPnl)}
          tone={totalPnl >= 0 ? 'pos' : 'neg'}
          dataTestid="risk-total-pnl"
        />
        <Tile
          label="Cash PnL"
          value={fmt(cashPnl)}
          tone={cashPnl >= 0 ? 'pos' : 'neg'}
          dataTestid="risk-cash-pnl"
        />
        <Tile
          label="Unrealized"
          value={fmt(unrealizedPnl)}
          tone={unrealizedPnl >= 0 ? 'pos' : 'neg'}
          dataTestid="risk-unrealized-pnl"
        />
        <Tile
          label="Slippage Cost"
          value={fmt(slippagePnl)}
          tone={slippagePnl >= 0 ? 'pos' : 'neg'}
          dataTestid="risk-slippage-pnl"
        />
      </div>

      <div className="text-[10px] tracking-widest uppercase text-zinc-500 mb-2">
        Inventory by asset
      </div>
      <div className="space-y-1">
        {Object.entries(inventory).map(([sym, qty]) => {
          const mid = market[sym]?.mid ?? 0;
          const notional = qty * mid;
          const long = qty > 0;
          const flat = Math.abs(qty) < 1e-8;
          return (
            <div
              key={sym}
              data-testid={`risk-inv-${sym}`}
              className="grid grid-cols-3 items-center px-2.5 py-2 bg-zinc-950/40 border border-zinc-800/80 rounded-md"
            >
              <div className="text-sm text-white font-medium">{sym}</div>
              <div className={`text-right text-sm tabular-nums ${flat ? 'text-zinc-400' : long ? 'text-emerald-300' : 'text-rose-300'}`}>
                {fmt(qty, 6)}
              </div>
              <div className="text-right text-xs text-zinc-500 tabular-nums">
                {fmt(notional)} USDT
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
