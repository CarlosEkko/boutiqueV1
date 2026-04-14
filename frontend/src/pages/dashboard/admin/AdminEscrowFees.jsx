import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { Shield, Save, RefreshCw, Plus, Trash2, Calculator } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('kryptobox_token')}`, 'Content-Type': 'application/json' });

export default function AdminEscrowFees() {
  const [tiers, setTiers] = useState([]);
  const [edited, setEdited] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testAmount, setTestAmount] = useState('');
  const [testResult, setTestResult] = useState(null);

  const fetchTiers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/kbex-rates/escrow-fees`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTiers(data.tiers || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);

  const data = edited || tiers;
  const hasEdits = edited !== null;

  const updateTier = (index, field, value) => {
    const current = [...(edited || tiers)];
    current[index] = { ...current[index], [field]: parseFloat(value) || 0 };
    setEdited(current);
  };

  const addTier = () => {
    const current = [...(edited || tiers)];
    const lastMax = current.length > 0 ? current[current.length - 1].max_amount : 0;
    current.push({ min_amount: lastMax > 0 ? lastMax + 1 : 0, max_amount: -1, fee_pct: 0.25, min_fee: 0 });
    setEdited(current);
  };

  const removeTier = (index) => {
    const current = [...(edited || tiers)];
    current.splice(index, 1);
    setEdited(current);
  };

  const saveTiers = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/kbex-rates/escrow-fees`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ tiers: edited }),
      });
      if (res.ok) {
        toast.success('Escrow fees atualizados');
        setEdited(null);
        fetchTiers();
      }
    } catch (e) { toast.error('Erro ao guardar'); }
    setSaving(false);
  };

  const seedDefaults = async () => {
    const res = await fetch(`${API}/api/kbex-rates/escrow-fees/seed`, { method: 'POST', headers: getHeaders() });
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.seeded} tiers criados`);
      fetchTiers();
    }
  };

  const calculateFee = async () => {
    if (!testAmount) return;
    try {
      const res = await fetch(`${API}/api/kbex-rates/escrow-fees/calculate?amount=${testAmount}`, { headers: getHeaders() });
      if (res.ok) setTestResult(await res.json());
    } catch (e) { console.error(e); }
  };

  const fmtEur = (v) => v < 0 ? '∞' : `€${Number(v).toLocaleString('pt-PT')}`;

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-gold-500" size={24} /></div>;

  return (
    <div className="space-y-6" data-testid="admin-escrow-fees">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={24} className="text-gold-500" /> Escrow Fees
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Tabela de fees por ticket size</p>
        </div>
        <div className="flex gap-2">
          {data.length === 0 && (
            <Button onClick={seedDefaults} variant="outline" className="border-zinc-700 text-zinc-300" data-testid="seed-escrow-btn">
              <RefreshCw size={14} className="mr-1" /> Seed Defaults
            </Button>
          )}
          <Button onClick={addTier} variant="outline" className="border-zinc-700 text-zinc-300" data-testid="add-tier-btn">
            <Plus size={14} className="mr-1" /> Adicionar Tier
          </Button>
          {hasEdits && (
            <Button onClick={saveTiers} disabled={saving} className="bg-gold-600 hover:bg-gold-500 text-black" data-testid="save-escrow-btn">
              <Save size={14} className="mr-1" /> {saving ? 'A guardar...' : `Guardar (${data.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Fee Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-zinc-500 py-3 px-4 font-medium">Ticket Size</th>
                  <th className="text-center text-zinc-500 py-3 px-4 font-medium">De (EUR)</th>
                  <th className="text-center text-zinc-500 py-3 px-4 font-medium">Até (EUR)</th>
                  <th className="text-center text-gold-500 py-3 px-4 font-medium">Fee Escrow KBEX (%)</th>
                  <th className="text-center text-amber-400 py-3 px-4 font-medium">Fee Mínima (EUR)</th>
                  <th className="text-center text-zinc-500 py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((tier, i) => (
                  <tr key={i} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${hasEdits ? 'bg-gold-500/5' : ''}`}>
                    <td className="py-3 px-4 text-zinc-300 text-xs font-medium">
                      {fmtEur(tier.min_amount)} — {fmtEur(tier.max_amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <Input type="number" min="0" step="1" value={tier.min_amount}
                          onChange={e => updateTier(i, 'min_amount', e.target.value)}
                          className="w-32 bg-zinc-800 border-zinc-700 text-white text-center text-sm h-8"
                          data-testid={`escrow-min-${i}`} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center gap-1">
                        <Input type="number" step="1" value={tier.max_amount}
                          onChange={e => updateTier(i, 'max_amount', e.target.value)}
                          className="w-32 bg-zinc-800 border-zinc-700 text-white text-center text-sm h-8"
                          data-testid={`escrow-max-${i}`} />
                        <span className="text-zinc-600 text-[10px] whitespace-nowrap">-1=∞</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <Input type="number" min="0" step="0.05" value={tier.fee_pct}
                          onChange={e => updateTier(i, 'fee_pct', e.target.value)}
                          className="w-24 bg-zinc-800 border-zinc-700 text-white text-center text-sm h-8"
                          data-testid={`escrow-fee-${i}`} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        <Input type="number" min="0" step="100" value={tier.min_fee}
                          onChange={e => updateTier(i, 'min_fee', e.target.value)}
                          className="w-32 bg-zinc-800 border-zinc-700 text-white text-center text-sm h-8"
                          data-testid={`escrow-minfee-${i}`} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => removeTier(i)} className="text-red-500/40 hover:text-red-400 transition-colors" data-testid={`escrow-remove-${i}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      Nenhum tier configurado. Use "Seed Defaults" ou "Adicionar Tier".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fee Calculator */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-zinc-400 flex items-center gap-2">
            <Calculator size={14} className="text-gold-500" /> Simulador de Fee
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-sm">€</span>
              <Input
                type="number"
                min="0"
                placeholder="Valor do deal..."
                value={testAmount}
                onChange={e => { setTestAmount(e.target.value); setTestResult(null); }}
                onKeyDown={e => e.key === 'Enter' && calculateFee()}
                className="w-48 bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                data-testid="fee-calc-input"
              />
            </div>
            <Button onClick={calculateFee} variant="outline" size="sm" className="border-zinc-700 text-zinc-300 h-9" data-testid="fee-calc-btn">
              Calcular
            </Button>
            {testResult && (
              <div className="flex items-center gap-4 ml-4 text-sm">
                <span className="text-zinc-400">Tier: <span className="text-white">{testResult.tier_range}</span></span>
                <span className="text-zinc-400">Fee: <span className="text-gold-400 font-semibold">{testResult.fee_pct}%</span></span>
                <span className="text-zinc-400">Calculado: <span className="text-white">€{testResult.fee_calculated?.toLocaleString('pt-PT')}</span></span>
                <span className="text-zinc-400">Final: <span className="text-emerald-400 font-bold">€{testResult.fee_final?.toLocaleString('pt-PT')}</span></span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
