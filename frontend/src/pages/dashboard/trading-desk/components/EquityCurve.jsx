/**
 * EquityCurve — desk PnL over time (recharts).
 */
import React from 'react';
import { Card } from '../../../../components/ui/card';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const fmt = (v) => Number(v || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const TooltipBox = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { t, pnl } = payload[0].payload;
  return (
    <div className="bg-zinc-950/95 border border-gold-800/40 px-3 py-2 rounded-md text-xs">
      <div className="text-zinc-500">
        {new Date(t).toLocaleTimeString('en-GB', { hour12: false })}
      </div>
      <div className={pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
        PnL <span className="tabular-nums">{fmt(pnl)}</span> USDT
      </div>
    </div>
  );
};

export default function EquityCurve({ series }) {
  const data = series.map((p) => ({ ...p }));
  const last = data[data.length - 1]?.pnl ?? 0;

  return (
    <Card
      data-testid="otc-desk-equity-curve"
      className="bg-zinc-950/80 border border-gold-800/25 p-5 h-full"
    >
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">
            Equity Curve
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Cumulative PnL — cash + unrealized + slippage
          </p>
        </div>
        <div className={`text-3xl font-light tabular-nums ${last >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {fmt(last)}
          <span className="text-[11px] tracking-widest uppercase text-zinc-500 ml-2">USDT</span>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4af37" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              tickFormatter={(t) => new Date(t).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: '#52525b', fontSize: 10 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={{ fill: '#52525b', fontSize: 10 }}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
              width={56}
              tickFormatter={(v) => Number(v).toLocaleString('en-US')}
            />
            <Tooltip content={<TooltipBox />} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke="#d4af37"
              strokeWidth={1.5}
              fill="url(#eqGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
