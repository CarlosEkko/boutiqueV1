import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { Settings, Save, RefreshCw, TrendingUp, Users, AlertTriangle, Crown, ChevronDown, ChevronUp } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('kryptobox_token')}`, 'Content-Type': 'application/json' });

const TIER_LABELS = { broker: 'Broker', standard: 'Standard', premium: 'Premium', vip: 'VIP', institucional: 'Institucional' };
const PRODUCT_LABELS = { otc: 'OTC Desk', exchange: 'Exchange', escrow: 'Escrow', spot: 'Spot Market' };
const TIER_COLORS = { broker: 'bg-blue-500/20 text-blue-400', standard: 'bg-zinc-500/20 text-zinc-300', premium: 'bg-amber-500/20 text-amber-400', vip: 'bg-purple-500/20 text-purple-400', institucional: 'bg-emerald-500/20 text-emerald-400' };

export default function AdminKBEXRates() {
  const [rates, setRates] = useState([]);
  const [products, setProducts] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [tierFees, setTierFees] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState({});
  const [renewalAlerts, setRenewalAlerts] = useState([]);
  const [expandedProduct, setExpandedProduct] = useState('otc');
  const [editedFees, setEditedFees] = useState({});
  const [savingFees, setSavingFees] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/kbex-rates/config`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates);
        setProducts(data.products);
        setTiers(data.tiers);
        setTierFees(data.tier_fees);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/kbex-rates/renewal-alerts`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRenewalAlerts(data.alerts || []);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchConfig(); fetchAlerts(); }, [fetchConfig, fetchAlerts]);

  const seedDefaults = async () => {
    const res = await fetch(`${API}/api/kbex-rates/seed-defaults`, { method: 'POST', headers: getHeaders() });
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.seeded} configurações criadas`);
      fetchConfig();
    }
  };

  const saveFees = async () => {
    setSavingFees(true);
    try {
      const res = await fetch(`${API}/api/kbex-rates/tier-fees`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ fees: editedFees }),
      });
      if (res.ok) {
        toast.success('Fees atualizados');
        setEditedFees({});
        fetchConfig();
      }
    } catch (e) { toast.error('Erro ao guardar fees'); }
    setSavingFees(false);
  };

  const getRate = (product, tier) => {
    const key = `${product}_${tier}`;
    if (edited[key]) return edited[key];
    return rates.find(r => r.product === product && r.tier === tier && r.asset === '*') || { buy_spread_pct: 0, sell_spread_pct: 0 };
  };

  const updateRate = (product, tier, field, value) => {
    const key = `${product}_${tier}`;
    const current = getRate(product, tier);
    setEdited(prev => ({ ...prev, [key]: { ...current, product, tier, asset: '*', [field]: parseFloat(value) || 0 } }));
  };

  const saveAll = async () => {
    setSaving(true);
    const ratesToSave = Object.values(edited).map(r => ({
      product: r.product, tier: r.tier, asset: r.asset || '*',
      buy_spread_pct: r.buy_spread_pct, sell_spread_pct: r.sell_spread_pct,
    }));
    if (ratesToSave.length === 0) { toast.info('Nenhuma alteração'); setSaving(false); return; }
    try {
      const res = await fetch(`${API}/api/kbex-rates/config`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ rates: ratesToSave }),
      });
      if (res.ok) {
        toast.success(`${ratesToSave.length} rates atualizados`);
        setEdited({});
        fetchConfig();
      }
    } catch (e) { toast.error('Erro ao guardar'); }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-gold-500" size={24} /></div>;

  const hasEdits = Object.keys(edited).length > 0;

  return (
    <div className="space-y-6" data-testid="admin-kbex-rates">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={24} className="text-gold-500" /> Configuração KBEX Rates
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Spreads por produto, tier e ativo</p>
        </div>
        <div className="flex gap-2">
          {rates.length === 0 && (
            <Button onClick={seedDefaults} variant="outline" className="border-zinc-700 text-zinc-300" data-testid="seed-defaults-btn">
              <RefreshCw size={14} className="mr-1" /> Seed Defaults
            </Button>
          )}
          {hasEdits && (
            <Button onClick={saveAll} disabled={saving} className="bg-gold-600 hover:bg-gold-500 text-black" data-testid="save-rates-btn">
              <Save size={14} className="mr-1" /> {saving ? 'A guardar...' : `Guardar (${Object.keys(edited).length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Renewal Alerts */}
      {renewalAlerts.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle size={16} /> <span className="font-semibold text-sm">Alertas de Renovação ({renewalAlerts.length})</span>
            </div>
            <div className="space-y-1">
              {renewalAlerts.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-300">{a.name} ({a.email})</span>
                  <span className="text-red-400">Expira: {new Date(a.membership_expires_at).toLocaleDateString('pt-PT')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Fees - Editable */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-zinc-400 flex items-center gap-2"><Crown size={14} className="text-gold-500" /> Fees Anuais por Tier</CardTitle>
            {Object.keys(editedFees).length > 0 && (
              <Button onClick={saveFees} disabled={savingFees} size="sm" className="bg-gold-600 hover:bg-gold-500 text-black text-xs h-7" data-testid="save-fees-btn">
                <Save size={12} className="mr-1" /> {savingFees ? 'A guardar...' : 'Guardar Fees'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-5 gap-3">
            {tiers.map(t => {
              const fee = editedFees[t] !== undefined ? editedFees[t] : tierFees[t];
              const isEdited = editedFees[t] !== undefined;
              return (
                <div key={t} className={`rounded-lg p-3 space-y-2 ${TIER_COLORS[t]} ${isEdited ? 'ring-1 ring-gold-500/50' : ''}`}>
                  <span className="text-xs font-semibold uppercase tracking-wider">{TIER_LABELS[t]}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400">€</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={fee}
                      onChange={e => setEditedFees(prev => ({ ...prev, [t]: parseFloat(e.target.value) || 0 }))}
                      className="bg-black/30 border-zinc-700/50 text-white text-sm h-7 w-full"
                      data-testid={`tier-fee-${t}`}
                    />
                    <span className="text-xs text-zinc-500 whitespace-nowrap">/ano</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rate Tables by Product */}
      {products.map(product => {
        const isExpanded = expandedProduct === product;
        return (
          <Card key={product} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpandedProduct(isExpanded ? null : product)} data-testid={`product-section-${product}`}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold-500" /> {PRODUCT_LABELS[product]}
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs ml-2">{tiers.length} tiers</Badge>
                </CardTitle>
                {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 py-2 px-3 w-40">Tier</th>
                        <th className="text-center text-emerald-500 py-2 px-3">Spread Compra (%)</th>
                        <th className="text-center text-red-400 py-2 px-3">Spread Venda (%)</th>
                        <th className="text-right text-zinc-500 py-2 px-3">Última Atualização</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map(tier => {
                        const rate = getRate(product, tier);
                        const key = `${product}_${tier}`;
                        const isEdited = !!edited[key];
                        return (
                          <tr key={tier} className={`border-b border-zinc-800/50 ${isEdited ? 'bg-gold-500/5' : ''}`}>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[tier]}`}>
                                {TIER_LABELS[tier]}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex justify-center">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={rate.buy_spread_pct}
                                  onChange={e => updateRate(product, tier, 'buy_spread_pct', e.target.value)}
                                  className="w-24 bg-zinc-800 border-zinc-700 text-white text-center text-sm h-8"
                                  data-testid={`rate-buy-${product}-${tier}`}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex justify-center">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={rate.sell_spread_pct}
                                  onChange={e => updateRate(product, tier, 'sell_spread_pct', e.target.value)}
                                  className="w-24 bg-zinc-800 border-zinc-700 text-white text-center text-sm h-8"
                                  data-testid={`rate-sell-${product}-${tier}`}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-zinc-500 text-xs">
                              {rate.updated_at ? new Date(rate.updated_at).toLocaleDateString('pt-PT') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
