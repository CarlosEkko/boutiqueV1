import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../../../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent } from '../../../components/ui/card';
import {
  Gem, TrendingUp, Briefcase, Shield, Wallet, Crown, GitBranch,
  History, FlaskConical, ArrowRight, ExternalLink, Info,
} from 'lucide-react';

import AdminKBEXRates from './AdminKBEXRates';
import AdminTradingPage from './AdminTradingPage';
import AdminEscrowFees from './AdminEscrowFees';

/**
 * Tarifário Unificado — central KBEX fees/spreads/rates control panel.
 *
 * Tabs layout: each tab embeds an existing admin screen so we have a single
 * entry point without duplicating business logic. Tabs not yet migrated
 * (Tiers, Wallets, OTC, Referrals) point to the existing standalone routes
 * via a "Open full page" CTA while we incrementally port them in.
 *
 * Extras:
 *   - "E se..." simulator (client-side) — projects the impact of a new KBEX
 *     spread across all products.
 *   - Audit log modal — recent changes with diffs (placeholder backend call,
 *     fails gracefully so the page still renders).
 */

const TABS = [
  { value: 'spread', label: 'KBEX Spread', icon: Gem, accent: 'text-gold-400' },
  { value: 'exchange', label: 'Exchange', icon: TrendingUp, accent: 'text-sky-400' },
  { value: 'otc', label: 'OTC Desk', icon: Briefcase, accent: 'text-violet-400' },
  { value: 'escrow', label: 'Escrow', icon: Shield, accent: 'text-emerald-400' },
  { value: 'wallets', label: 'Wallets', icon: Wallet, accent: 'text-blue-400' },
  { value: 'tiers', label: 'Tiers', icon: Crown, accent: 'text-amber-400' },
  { value: 'referrals', label: 'Comissões', icon: GitBranch, accent: 'text-pink-400' },
];

export default function AdminTarifarioPage() {
  const [tab, setTab] = useState('spread');
  const [auditOpen, setAuditOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5" data-testid="admin-tarifario-page">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold-400/80 mb-1">
            <Gem size={12} /> Central de Tarifas
          </div>
          <h1 className="text-2xl font-light text-white">Tarifário Unificado</h1>
          <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
            Fonte única de todos os fees, spreads e taxas da plataforma.
            O <span className="text-gold-400">KBEX Spread</span> é a referência mestre —
            todas as outras tabelas derivam dela em cascata.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSimOpen(true)}
            className="border-zinc-700"
            data-testid="tarifario-simulator-btn"
          >
            <FlaskConical size={14} className="mr-1.5 text-sky-400" />
            Simulador "E se..."
          </Button>
          <Button
            variant="outline"
            onClick={() => setAuditOpen(true)}
            className="border-zinc-700"
            data-testid="tarifario-audit-btn"
          >
            <History size={14} className="mr-1.5" />
            Histórico
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-zinc-950 border border-zinc-800 p-1 h-auto flex-wrap justify-start gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-zinc-900 data-[state=active]:border data-[state=active]:border-gold-700/30 rounded-md px-3 py-2 text-xs"
                data-testid={`tarifario-tab-${t.value}`}
              >
                <Icon size={13} className={`mr-1.5 ${t.accent}`} />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Inherit banner — visible on every non-spread tab */}
        {tab !== 'spread' && (
          <div className="mt-4 rounded-lg border border-gold-700/30 bg-gold-950/10 px-4 py-2.5 flex items-center gap-3 text-xs">
            <Info size={13} className="text-gold-400 shrink-0" />
            <span className="text-zinc-300">
              Este módulo <span className="text-zinc-500">herda o preço base do</span>{' '}
              <button
                type="button"
                onClick={() => setTab('spread')}
                className="text-gold-400 hover:underline underline-offset-4"
              >
                KBEX Spread
              </button>
              <span className="text-zinc-500">. Qualquer alteração na referência mestre propaga-se em tempo real.</span>
            </span>
          </div>
        )}

        <TabsContent value="spread" className="mt-4">
          <AdminKBEXRates />
        </TabsContent>

        <TabsContent value="exchange" className="mt-4">
          <EmbedRef label="Taxas & Limites" path="/dashboard/admin/trading" />
          <AdminTradingPage />
        </TabsContent>

        <TabsContent value="escrow" className="mt-4">
          <EmbedRef label="Escrow Fees" path="/dashboard/admin/escrow-fees" />
          <AdminEscrowFees />
        </TabsContent>

        {/* Tabs still linking out to the standalone page. Inlining pending. */}
        <TabsContent value="otc" className="mt-4">
          <ExternalTab
            title="OTC Desk — Spreads por volume"
            path="/dashboard/admin/kbex-rates"
            hint="Os spreads OTC são definidos no produto 'OTC Desk' dentro do KBEX Spread, por Tier e escalão de volume."
          />
        </TabsContent>

        <TabsContent value="wallets" className="mt-4">
          <ExternalTab
            title="Wallets — Depósitos & Levantamentos"
            path="/dashboard/admin/trading"
            hint="Configure fees SEPA, Swift, Stripe Cartão e custos on-chain na tab 'Fiat Fees' / 'Fiat Withdrawals' da página Taxas & Limites."
          />
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          <ExternalTab
            title="Tiers — Admission fees & Renovações anuais"
            path="/dashboard/admin/tiers"
            hint="Cada tier tem uma taxa de admissão única e uma renovação anual. A edição continua na página dedicada."
          />
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <ExternalTab
            title="Comissões — Afiliados e Brokers"
            path="/dashboard/admin/referrals"
            hint="Percentagens de comissão por tipo de transação (admission, annual, trading, OTC). Edite por broker na página de referências."
          />
        </TabsContent>
      </Tabs>

      {/* Audit log dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="bg-black border-zinc-800 max-w-3xl" data-testid="tarifario-audit-dialog">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <History size={16} className="text-gold-400" /> Histórico de Alterações
            </DialogTitle>
          </DialogHeader>
          <AuditLogPanel />
        </DialogContent>
      </Dialog>

      {/* Simulator dialog */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="bg-black border-zinc-800 max-w-2xl" data-testid="tarifario-simulator-dialog">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FlaskConical size={16} className="text-sky-400" /> Simulador "E se..."
            </DialogTitle>
          </DialogHeader>
          <SimulatorPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Subcomponents ----------

function EmbedRef({ label, path }) {
  return (
    <div className="flex items-center justify-end mb-2">
      <Link
        to={path}
        className="text-[11px] text-zinc-500 hover:text-gold-300 inline-flex items-center gap-1 transition-colors"
        data-testid={`tarifario-embed-ref-${path}`}
      >
        Abrir {label} em página inteira <ExternalLink size={10} />
      </Link>
    </div>
  );
}

function ExternalTab({ title, path, hint }) {
  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardContent className="py-10 px-6 text-center">
        <div className="max-w-lg mx-auto">
          <h3 className="text-white font-light text-lg mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 mb-5">{hint}</p>
          <Button asChild className="bg-gold-500 hover:bg-gold-400 text-black font-medium" data-testid={`tarifario-external-${path}`}>
            <Link to={path}>
              Abrir página dedicada <ArrowRight size={14} className="ml-1.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogPanel() {
  // Best-effort backend call; we render an empty state gracefully if the
  // collection does not exist yet. Admins can populate it by editing any of
  // the existing admin pages which already persist to their own audit
  // collections (kbex_rates_audit, tiers_audit, etc).
  const [entries, setEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const API = process.env.REACT_APP_BACKEND_URL;
    const token = sessionStorage.getItem('kryptobox_token');
    (async () => {
      try {
        // Aggregate from kbex-rates audit as a starting point.
        const res = await fetch(`${API}/api/kbex-rates/audit?limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('no_audit_endpoint');
        const data = await res.json();
        if (!cancelled) setEntries(data.entries || data || []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="py-8 text-center text-zinc-500 text-sm">A carregar histórico…</div>;
  }

  if (!entries.length) {
    return (
      <div className="py-8 text-center" data-testid="audit-empty">
        <History size={32} className="mx-auto text-zinc-700 mb-3" />
        <div className="text-zinc-400 text-sm mb-1">Sem alterações registadas</div>
        <div className="text-zinc-600 text-xs max-w-md mx-auto">
          O histórico é preenchido automaticamente sempre que um admin altera qualquer fee, spread ou taxa. Cada entrada guarda quem, quando e o valor anterior/novo.
        </div>
      </div>
    );
  }

  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso; }
  };

  return (
    <div className="max-h-[500px] overflow-y-auto -mx-1 px-1 space-y-2">
      {entries.map((e, i) => (
        <div key={e.id || i} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm" data-testid={`audit-entry-${i}`}>
          <div className="flex items-center justify-between mb-1 text-[11px] text-zinc-500">
            <span>{e.admin_email || e.user || '—'}</span>
            <span>{fmt(e.created_at || e.ts)}</span>
          </div>
          <div className="text-white">
            {e.action || 'update'} · <span className="text-zinc-400">{e.target || e.product || ''}</span>
          </div>
          {(e.before != null || e.after != null) && (
            <div className="mt-1 text-xs font-mono text-zinc-400">
              <span className="text-red-400">{JSON.stringify(e.before)}</span>
              <span className="text-zinc-600 mx-1.5">→</span>
              <span className="text-emerald-400">{JSON.stringify(e.after)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SimulatorPanel() {
  // Client-side impact projection — a thin lever that lets the admin see the
  // cascading effect of a new base KBEX spread before committing any change
  // to the database.
  const [base, setBase] = React.useState(0.62); // current effective %
  const [next, setNext] = React.useState(0.80);

  const delta = Number((next - base).toFixed(3));
  const deltaPct = base ? (delta / base) * 100 : 0;

  // Rough illustrative model — real numbers should come from audit+analytics
  // aggregations once available.
  const rows = [
    { label: 'Exchange · Tier Broker', current: base + 0.30, next: next + 0.30 },
    { label: 'Exchange · Tier VIP', current: base + 0.08, next: next + 0.08 },
    { label: 'OTC Desk · 100k–500k', current: base - 0.22, next: next - 0.22 },
    { label: 'OTC Desk · >5M (custom)', current: base - 0.40, next: next - 0.40 },
    { label: 'Escrow standard (effective)', current: base + 0.20, next: next + 0.20 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-zinc-400">Spread efetivo atual (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={base}
            onChange={(e) => setBase(parseFloat(e.target.value || 0))}
            className="bg-zinc-900 border-zinc-700 text-white mt-1"
            data-testid="simulator-base-input"
          />
        </div>
        <div>
          <Label className="text-xs text-zinc-400">Novo spread proposto (%)</Label>
          <Input
            type="number"
            step="0.01"
            value={next}
            onChange={(e) => setNext(parseFloat(e.target.value || 0))}
            className="bg-zinc-900 border-sky-700 text-white mt-1 focus:border-sky-400"
            data-testid="simulator-next-input"
          />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-zinc-500">Delta absoluto</span>
          <span className={`font-mono ${delta > 0 ? 'text-amber-300' : delta < 0 ? 'text-emerald-300' : 'text-zinc-400'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(3)} pp
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Variação relativa</span>
          <span className={`font-mono ${deltaPct > 0 ? 'text-amber-300' : deltaPct < 0 ? 'text-emerald-300' : 'text-zinc-400'}`}>
            {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)} %
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Produto</th>
              <th className="px-3 py-2 text-right">Atual</th>
              <th className="px-3 py-2 text-right">Projetado</th>
              <th className="px-3 py-2 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const d = r.next - r.current;
              return (
                <tr key={i} className="border-t border-zinc-900">
                  <td className="px-3 py-2 text-zinc-300">{r.label}</td>
                  <td className="px-3 py-2 text-right text-zinc-400 font-mono">{r.current.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right text-white font-mono">{r.next.toFixed(2)}%</td>
                  <td className={`px-3 py-2 text-right font-mono ${d > 0 ? 'text-amber-300' : d < 0 ? 'text-emerald-300' : 'text-zinc-500'}`}>
                    {d > 0 ? '+' : ''}{d.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-zinc-600 leading-relaxed">
        Nota: valores ilustrativos. A simulação assume offsets constantes por produto — os desvios reais podem variar consoante a configuração em tempo real de cada Tier e Produto no KBEX Spread.
      </div>
    </div>
  );
}
