/**
 * RFQPanel — Request For Quote + execution widget.
 *   1. size + side → Get Quote  (pricing engine)
 *   2. Firm quote with countdown → Execute  (inventory + PnL + hedge)
 */
import React, { useEffect, useState } from 'react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Zap, Timer } from 'lucide-react';

const fmtUsd = (v) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

export default function RFQPanel({
  symbol, market, activeQuote, onGetQuote, onExecute, onCancel,
}) {
  const [size, setSize] = useState('1');
  const [side, setSide] = useState('buy');
  const [remaining, setRemaining] = useState(0);

  // countdown for the firm quote validity window
  useEffect(() => {
    if (!activeQuote) { setRemaining(0); return; }
    const t = setInterval(() => {
      const left = Math.max(0, activeQuote.expiresAt - Date.now());
      setRemaining(left);
      if (left === 0) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, [activeQuote]);

  const handleQuote = () => {
    const s = Number(size);
    if (!s || s <= 0) { toast.error('Size must be greater than zero'); return; }
    const q = onGetQuote?.(symbol, s, side);
    if (!q) toast.error('Unable to price request');
  };

  const handleExecute = () => {
    const res = onExecute?.();
    if (!res) { toast.error('Quote expired — request a new price'); return; }
    toast.success('Trade filled', {
      description: `${res.quote.side.toUpperCase()} ${res.quote.size} ${res.quote.symbol} @ ${fmtUsd(res.quote.price)} (spread capture ${fmtUsd(res.spreadCapture)} USDT)`,
    });
  };

  const validPct = activeQuote
    ? Math.max(0, Math.min(100, (remaining / activeQuote.validForMs) * 100))
    : 0;

  const mid = market[symbol]?.mid ?? 0;

  return (
    <Card
      data-testid="otc-desk-rfq-panel"
      className="bg-zinc-950/80 border border-gold-800/25 p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">
            Request for Quote
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Firm price, single-click execution
          </p>
        </div>
        <span className="text-[10px] tracking-widest uppercase text-zinc-500">
          {symbol} / USDT
        </span>
      </div>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          data-testid="rfq-side-buy"
          onClick={() => setSide('buy')}
          className={`py-3 rounded-md text-sm font-medium tracking-wide transition
            ${side === 'buy'
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800/70'}`}
        >
          <ArrowUp size={14} className="inline -mt-0.5 mr-1.5" />
          Buy {symbol}
        </button>
        <button
          type="button"
          data-testid="rfq-side-sell"
          onClick={() => setSide('sell')}
          className={`py-3 rounded-md text-sm font-medium tracking-wide transition
            ${side === 'sell'
              ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/50'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800/70'}`}
        >
          <ArrowDown size={14} className="inline -mt-0.5 mr-1.5" />
          Sell {symbol}
        </button>
      </div>

      <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
        Size ({symbol})
      </label>
      <Input
        data-testid="rfq-size-input"
        type="number"
        min="0"
        step="0.01"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        className="bg-zinc-900 border-zinc-800 text-white tabular-nums text-lg"
      />
      <div className="flex items-center justify-between mt-1.5 text-[11px] text-zinc-500">
        <span>Reference mid: <span className="text-zinc-300 tabular-nums">{fmtUsd(mid)}</span></span>
        <span>≈ notional <span className="text-zinc-300 tabular-nums">{fmtUsd((Number(size) || 0) * mid)}</span> USDT</span>
      </div>

      {/* Firm quote card */}
      {activeQuote && activeQuote.symbol === symbol ? (
        <div className="mt-5 bg-gradient-to-br from-gold-500/10 to-transparent border border-gold-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-widest uppercase text-gold-400">Firm Quote</span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Timer size={11} />
              <span className="tabular-nums">{(remaining / 1000).toFixed(1)}s</span>
            </span>
          </div>
          <div className="text-3xl font-light tabular-nums text-white mb-2">
            {fmtUsd(activeQuote.price)}
            <span className="text-[11px] tracking-widest uppercase text-zinc-500 ml-2">USDT</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded overflow-hidden mb-3">
            <div
              className="h-full bg-gold-400 transition-all"
              style={{ width: `${validPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="text-zinc-500">Spread</div>
              <div className="text-gold-300 tabular-nums">{activeQuote.spreadBps.toFixed(1)} bps</div>
            </div>
            <div>
              <div className="text-zinc-500">Notional</div>
              <div className="text-white tabular-nums">{fmtUsd(activeQuote.notional)} USDT</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              data-testid="rfq-execute-btn"
              onClick={handleExecute}
              disabled={remaining === 0}
              className="flex-1 bg-gold-400 hover:bg-gold-300 text-black font-medium disabled:opacity-40"
            >
              <Zap size={14} className="mr-1.5" />
              Execute Trade
            </Button>
            <Button
              data-testid="rfq-cancel-btn"
              variant="ghost"
              onClick={onCancel}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          data-testid="rfq-get-quote-btn"
          onClick={handleQuote}
          className="w-full mt-5 bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 font-medium"
        >
          Get Firm Quote
        </Button>
      )}
    </Card>
  );
}
