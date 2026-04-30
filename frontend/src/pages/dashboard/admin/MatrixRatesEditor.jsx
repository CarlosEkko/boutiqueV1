import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Save, RefreshCw, Layers, Plus, Trash2, Info, ChevronDown, ChevronUp,
  AlertTriangle, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * MatrixRatesEditor — unified admin editor for kbex_rates.
 *
 * Displays the full pricing matrix per product: rows = tiers, columns =
 * (buy spread, buy fee, sell spread, sell fee, min fee USD) for the default
 * asset="*" plus an expandable "Asset Overrides" panel that lists every row
 * where asset != "*" and lets admins edit or delete them.
 *
 * All edits are staged in local state until "Guardar" is clicked — the PUT
 * endpoint is idempotent and accepts a bulk payload, so one click persists
 * everything.
 */

const API = process.env.REACT_APP_BACKEND_URL;
const getHeaders = () => ({
  Authorization: `Bearer ${sessionStorage.getItem('kryptobox_token')}`,
  'Content-Type': 'application/json',
});

const TIER_LABELS = {
  broker: 'Broker', standard: 'Standard', premium: 'Premium', vip: 'VIP', institucional: 'Instituc.',
};
const TIER_COLORS = {
  broker: 'bg-blue-500/20 text-blue-300',
  standard: 'bg-zinc-500/20 text-zinc-300',
  premium: 'bg-amber-500/20 text-amber-300',
  vip: 'bg-purple-500/20 text-purple-300',
  institucional: 'bg-emerald-500/20 text-emerald-300',
};
const PRODUCT_LABELS = {
  otc: 'OTC Desk',
  exchange: 'Exchange',
  escrow: 'Escrow',
  spot: 'Spot / Trading',
  multisign: 'Multi-Sign',
};

const FIELDS = [
  { key: 'buy_spread_pct', label: 'Spread Compra', color: 'text-emerald-300' },
  { key: 'buy_fee_pct', label: 'Fee Compra', color: 'text-emerald-400/70' },
  { key: 'sell_spread_pct', label: 'Spread Venda', color: 'text-red-300' },
  { key: 'sell_fee_pct', label: 'Fee Venda', color: 'text-red-400/70' },
  { key: 'min_fee_usd', label: 'Mín USD', color: 'text-zinc-400' },
];

const keyOf = (product, tier, asset) => `${product}::${tier}::${asset}`;

export default function MatrixRatesEditor() {
  const [rates, setRates] = useState([]);
  const [products, setProducts] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState({}); // key -> full row
  const [expandedProduct, setExpandedProduct] = useState('exchange');
  const [filterAsset, setFilterAsset] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);
  const [newOverrideAsset, setNewOverrideAsset] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/kbex-rates/config`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
        setProducts(data.products || []);
        setTiers(data.tiers || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const getRow = useCallback((product, tier, asset) => {
    const k = keyOf(product, tier, asset);
    if (edited[k]) return edited[k];
    return rates.find(r => r.product === product && r.tier === tier && r.asset === asset) || {
      product, tier, asset,
      buy_spread_pct: 0, sell_spread_pct: 0,
      buy_fee_pct: 0, sell_fee_pct: 0, min_fee_usd: 0,
    };
  }, [edited, rates]);

  const setField = (product, tier, asset, field, value) => {
    const k = keyOf(product, tier, asset);
    const current = getRow(product, tier, asset);
    setEdited(prev => ({
      ...prev,
      [k]: { ...current, product, tier, asset, [field]: parseFloat(value) || 0 },
    }));
  };

  const saveAll = async () => {
    const toSave = Object.values(edited);
    if (!toSave.length) { toast.info('Sem alterações pendentes'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/kbex-rates/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ rates: toSave }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`${toSave.length} rates atualizados`);
      setEdited({});
      fetchConfig();
    } catch (e) {
      toast.error('Erro ao guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteOverride = async (product, tier, asset) => {
    if (asset === '*') { toast.error('Não é possível apagar o default'); return; }
    try {
      const url = `${API}/api/kbex-rates/config?product=${product}&tier=${tier}&asset=${encodeURIComponent(asset)}`;
      const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Override ${tier}/${asset} removido`);
      const k = keyOf(product, tier, asset);
      setEdited(prev => { const n = { ...prev }; delete n[k]; return n; });
      fetchConfig();
    } catch (e) {
      toast.error('Erro ao remover: ' + e.message);
    }
  };

  const addOverride = (product) => {
    const asset = (newOverrideAsset || '').trim().toUpperCase();
    if (!asset) { toast.error('Indique o símbolo (ex.: BTC)'); return; }
    // Stage a blank row for every tier so the admin sees a full new column
    setEdited(prev => {
      const next = { ...prev };
      tiers.forEach(tier => {
        const k = keyOf(product, tier, asset);
        if (!next[k] && !rates.find(r => r.product === product && r.tier === tier && r.asset === asset)) {
          const base = rates.find(r => r.product === product && r.tier === tier && r.asset === '*') || {};
          next[k] = {
            product, tier, asset,
            buy_spread_pct: base.buy_spread_pct || 0,
            sell_spread_pct: base.sell_spread_pct || 0,
            buy_fee_pct: base.buy_fee_pct || 0,
            sell_fee_pct: base.sell_fee_pct || 0,
            min_fee_usd: base.min_fee_usd || 0,
          };
        }
      });
      return next;
    });
    setNewOverrideAsset('');
    toast.success(`Coluna ${asset} criada · preencha e grave`);
  };

  // Unique assets (non-*) for the currently expanded product
  const overridesByProduct = useMemo(() => {
    const map = new Map();
    [...rates, ...Object.values(edited)].forEach(r => {
      if (!r || r.asset === '*') return;
      const k = `${r.product}::${r.asset}`;
      if (!map.has(k)) map.set(k, r);
    });
    return Array.from(map.values());
  }, [rates, edited]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold-500" size={20} />
      </div>
    );
  }

  const hasEdits = Object.keys(edited).length > 0;

  return (
    <div className="space-y-5" data-testid="matrix-rates-editor">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <Info size={12} className="text-gold-400" />
          Matriz produto × tier × ativo. Células em branco =&nbsp;
          <span className="text-zinc-300">herda do default</span>. Edite e grave numa só ação.
        </div>
        <div className="flex gap-2">
          {hasEdits && (
            <Badge className="bg-gold-500/20 text-gold-300 border-gold-700/40">
              {Object.keys(edited).length} alterações pendentes
            </Badge>
          )}
          <Button
            onClick={saveAll}
            disabled={saving || !hasEdits}
            className="bg-gold-500 hover:bg-gold-400 text-black font-medium"
            data-testid="matrix-save-btn"
          >
            <Save size={14} className="mr-1.5" />
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </Button>
        </div>
      </div>

      {/* Per-product matrix */}
      {products.map(product => {
        const open = expandedProduct === product;
        const productOverrides = overridesByProduct
          .filter(r => r.product === product)
          .filter(r => !filterAsset || r.asset.includes(filterAsset.toUpperCase()));
        return (
          <Card key={product} className="bg-zinc-950 border-zinc-800">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setExpandedProduct(open ? null : product)}
              data-testid={`matrix-product-${product}`}
            >
              <CardTitle className="flex items-center justify-between text-sm font-light text-white">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-gold-400" />
                  {PRODUCT_LABELS[product] || product}
                  <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 ml-1">
                    {tiers.length} tiers · {productOverrides.length} overrides
                  </Badge>
                </div>
                {open ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
              </CardTitle>
            </CardHeader>

            {open && (
              <CardContent className="pt-0 space-y-5">
                {/* Default (*) matrix */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Default (aplica-se a todos os ativos sem override)
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-zinc-800">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-900/60">
                        <tr>
                          <th className="text-left px-3 py-2 text-[10px] uppercase text-zinc-500 tracking-wider w-32">Tier</th>
                          {FIELDS.map(f => (
                            <th key={f.key} className={`text-center px-2 py-2 text-[10px] uppercase tracking-wider ${f.color}`}>
                              {f.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tiers.map(tier => {
                          const row = getRow(product, tier, '*');
                          const k = keyOf(product, tier, '*');
                          const dirty = !!edited[k];
                          return (
                            <tr key={tier} className={`border-t border-zinc-900 ${dirty ? 'bg-gold-500/[0.03]' : ''}`}>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TIER_COLORS[tier]}`}>
                                  {TIER_LABELS[tier]}
                                </span>
                              </td>
                              {FIELDS.map(f => (
                                <td key={f.key} className="px-2 py-1.5">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={row[f.key] ?? 0}
                                    onChange={(e) => setField(product, tier, '*', f.key, e.target.value)}
                                    className="w-20 mx-auto h-7 bg-zinc-900 border-zinc-800 text-white text-center text-xs focus:border-gold-700/50"
                                    data-testid={`matrix-${product}-${tier}-default-${f.key}`}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Asset overrides panel */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
                  <button
                    type="button"
                    onClick={() => setShowOverrides(!showOverrides)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900/60 transition-colors"
                    data-testid={`matrix-overrides-toggle-${product}`}
                  >
                    <span className="flex items-center gap-2">
                      <Layers size={12} className="text-amber-400" />
                      Asset Overrides ({productOverrides.length})
                    </span>
                    {showOverrides ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showOverrides && (
                    <div className="px-4 py-3 border-t border-zinc-800 space-y-3">
                      {/* New override + filter */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                          <Filter size={11} className="text-zinc-500" />
                          <Input
                            placeholder="Filtrar ativos (BTC, ETH…)"
                            value={filterAsset}
                            onChange={(e) => setFilterAsset(e.target.value.toUpperCase())}
                            className="bg-zinc-900 border-zinc-800 text-white text-xs h-7 uppercase"
                          />
                        </div>
                        <Input
                          placeholder="Novo ativo…"
                          value={newOverrideAsset}
                          onChange={(e) => setNewOverrideAsset(e.target.value.toUpperCase())}
                          className="bg-zinc-900 border-zinc-800 text-white text-xs h-7 w-28 uppercase"
                          data-testid={`matrix-new-override-${product}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addOverride(product)}
                          className="h-7 text-xs border-zinc-700"
                          data-testid={`matrix-add-override-${product}`}
                        >
                          <Plus size={12} className="mr-1" /> Adicionar
                        </Button>
                      </div>

                      {productOverrides.length === 0 ? (
                        <div className="text-center py-4 text-xs text-zinc-500">
                          Sem overrides. Todos os ativos seguem o default acima.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-md border border-zinc-900">
                          <table className="w-full text-xs">
                            <thead className="bg-zinc-900/60">
                              <tr>
                                <th className="text-left px-2 py-1.5 text-[10px] uppercase text-zinc-500 tracking-wider w-20">Ativo</th>
                                <th className="text-left px-2 py-1.5 text-[10px] uppercase text-zinc-500 tracking-wider w-24">Tier</th>
                                {FIELDS.map(f => (
                                  <th key={f.key} className={`text-center px-2 py-1.5 text-[10px] uppercase ${f.color}`}>
                                    {f.label}
                                  </th>
                                ))}
                                <th className="w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Unique assets in this product */}
                              {Array.from(new Set(productOverrides.map(r => r.asset))).sort().map(asset => (
                                tiers.map((tier, ti) => {
                                  const row = getRow(product, tier, asset);
                                  const k = keyOf(product, tier, asset);
                                  const dirty = !!edited[k];
                                  return (
                                    <tr key={`${asset}-${tier}`} className={`border-t border-zinc-900 ${dirty ? 'bg-gold-500/[0.03]' : ''}`}>
                                      <td className="px-2 py-1.5 font-mono text-gold-300">
                                        {ti === 0 ? asset : ''}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TIER_COLORS[tier]}`}>
                                          {TIER_LABELS[tier]}
                                        </span>
                                      </td>
                                      {FIELDS.map(f => (
                                        <td key={f.key} className="px-1 py-1">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={row[f.key] ?? 0}
                                            onChange={(e) => setField(product, tier, asset, f.key, e.target.value)}
                                            className="w-16 mx-auto h-6 bg-zinc-900 border-zinc-800 text-white text-center text-[11px] focus:border-gold-700/50"
                                          />
                                        </td>
                                      ))}
                                      <td className="px-1 py-1">
                                        {ti === 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (window.confirm(`Remover todos os overrides do ativo ${asset} em ${product}?`)) {
                                                tiers.forEach(t => deleteOverride(product, t, asset));
                                              }
                                            }}
                                            className="text-zinc-600 hover:text-red-400 transition-colors"
                                            title={`Remover ${asset}`}
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {!products.length && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-500/5 px-4 py-3 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle size={14} />
          Nenhuma configuração de rates encontrada. Use a tab original do KBEX Spread para fazer seed.
        </div>
      )}
    </div>
  );
}
