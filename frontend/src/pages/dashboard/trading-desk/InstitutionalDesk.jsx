/**
 * InstitutionalDesk — KBEX Institutional OTC Desk (staff-facing cockpit).
 *
 * Reference doc: "Documento Técnico – Crypto OTC Desk (Arquitetura
 * Profissional)" — implements the Frontend Dashboard layer (Market Panel +
 * RFQ Engine + Risk Panel + PnL / Equity Curve + Hedge Feed).
 *
 * Data source today is a client-side mock engine (useOTCDeskEngine) so the
 * UX can be validated before the backend Quant Engine lands. The surface is
 * deliberately identical to the future `WS /api/ws/otc-desk` stream so the
 * swap is a one-line change.
 */
import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { RotateCcw, Info } from 'lucide-react';
import { toast } from 'sonner';

import { useOTCDeskEngine, DEFAULT_ASSETS } from './useOTCDeskBackend';
import MarketPanel from './components/MarketPanel';
import RFQPanel from './components/RFQPanel';
import RiskPanel from './components/RiskPanel';
import EquityCurve from './components/EquityCurve';
import HedgeFeed from './components/HedgeFeed';
import VenueHealthCard from './components/VenueHealthCard';

export default function InstitutionalDesk() {
  const engine = useOTCDeskEngine(DEFAULT_ASSETS);
  const [selected, setSelected] = useState('BTC');

  const handleReset = () => {
    engine.resetDesk();
    toast.success('Desk reset — inventory and PnL returned to zero.');
  };

  return (
    <div
      data-testid="institutional-otc-desk"
      className="space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-gold-400">
              KBEX
            </span>
            <span className="h-px w-8 bg-gold-400/40" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-zinc-500">
              Institutional
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-white mt-2">
            OTC Desk <span className="text-gold-400">— Trading Cockpit</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl">
            Firm quotes, automated hedging and real-time PnL across the KBEX
            reference asset universe. Powered by our quant pricing engine with
            size, volatility and inventory skew.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-testid="desk-reset-btn"
            variant="ghost"
            onClick={handleReset}
            className="text-zinc-400 hover:text-gold-300"
          >
            <RotateCcw size={14} className="mr-1.5" />
            Reset desk
          </Button>
        </div>
      </div>

      {/* Engine status banner */}
      <div className="flex items-start gap-3 bg-gold-500/5 border border-gold-500/20 rounded-md p-3.5">
        <Info size={16} className="text-gold-400 mt-0.5 shrink-0" />
        <div className="text-[12px] text-zinc-300 leading-relaxed">
          <strong className="text-gold-300">Live engine</strong> — market data
          streamed from our price oracle, pricing &amp; risk computed server-side,
          and desk state persisted on every fill. Hedge execution currently runs
          in <span className="text-gold-300">simulation mode</span>; venue
          connectivity (institutional custody / spot execution) activates in the
          next phase.
        </div>
      </div>

      {/* Row 1 — Market + RFQ + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <MarketPanel
            market={engine.market}
            selected={selected}
            onSelect={(sym) => {
              setSelected(sym);
              engine.cancelQuote();
            }}
          />
        </div>
        <div className="lg:col-span-3">
          <RFQPanel
            symbol={selected}
            market={engine.market}
            activeQuote={engine.activeQuote}
            onGetQuote={engine.getQuote}
            onExecute={engine.executeQuote}
            onCancel={engine.cancelQuote}
          />
        </div>
        <div className="lg:col-span-3">
          <RiskPanel
            inventory={engine.inventory}
            market={engine.market}
            cashPnl={engine.cashPnl}
            unrealizedPnl={engine.unrealizedPnl}
            slippagePnl={engine.slippagePnl}
            totalPnl={engine.totalPnl}
          />
        </div>
      </div>

      {/* Row 2 — Equity Curve + Hedge Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <EquityCurve series={engine.equityCurve} />
        </div>
        <div className="lg:col-span-5">
          <HedgeFeed fills={engine.hedgeFeed} />
        </div>
      </div>

      {/* Row 3 — Venue Health */}
      <VenueHealthCard />
    </div>
  );
}
