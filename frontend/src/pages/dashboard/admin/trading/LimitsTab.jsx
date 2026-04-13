import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Users, Save, Loader2 } from 'lucide-react';

const formatWithSpaces = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  const parts = num.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${parts[0]}.${parts[1]}`;
};

const FormattedNumberInput = ({ value, onChange, className, ...props }) => {
  const [focused, setFocused] = React.useState(false);
  const [localValue, setLocalValue] = React.useState('');
  const displayValue = focused ? localValue : formatWithSpaces(value);

  return (
    <Input type="text" inputMode="decimal" value={displayValue}
      onFocus={() => { setFocused(true); setLocalValue(value?.toString() || ''); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => { const raw = e.target.value.replace(/\s/g, ''); setLocalValue(raw); if (onChange) onChange({ target: { value: raw } }); }}
      className={className} {...props} />
  );
};

const TIERS = ['broker', 'standard', 'premium', 'vip', 'institucional'];

const LimitsTab = ({
  limits, selectedTier, setSelectedTier, saving, saveLimits, updateLimitField,
}) => {
  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users size={20} className="text-gold-400" />Limites por Tier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          {TIERS.map(tier => (
            <button key={tier}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${selectedTier === tier ? 'bg-gold-500 text-black' : 'bg-zinc-800 text-gray-400 hover:text-white'}`}
              onClick={() => setSelectedTier(tier)} data-testid={`tier-${tier}-btn`}>
              {tier}
            </button>
          ))}
        </div>

        {limits[selectedTier] && (
          <>
            <div>
              <h3 className="text-lg text-gold-400 mb-4">Limites Diarios (USD)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm text-gray-400 mb-1 block">Compra</label>
                  <FormattedNumberInput value={limits[selectedTier].daily_buy_limit} onChange={(e) => updateLimitField('daily_buy_limit', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" data-testid="daily-buy-limit-input" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Venda</label>
                  <FormattedNumberInput value={limits[selectedTier].daily_sell_limit} onChange={(e) => updateLimitField('daily_sell_limit', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Conversao</label>
                  <FormattedNumberInput value={limits[selectedTier].daily_swap_limit} onChange={(e) => updateLimitField('daily_swap_limit', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg text-gold-400 mb-4">Limites Mensais (USD)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm text-gray-400 mb-1 block">Compra</label>
                  <FormattedNumberInput value={limits[selectedTier].monthly_buy_limit} onChange={(e) => updateLimitField('monthly_buy_limit', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Venda</label>
                  <FormattedNumberInput value={limits[selectedTier].monthly_sell_limit} onChange={(e) => updateLimitField('monthly_sell_limit', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Conversao</label>
                  <FormattedNumberInput value={limits[selectedTier].monthly_swap_limit} onChange={(e) => updateLimitField('monthly_swap_limit', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg text-gold-400 mb-4">Por Transacao (USD)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-sm text-gray-400 mb-1 block">Min. Compra</label>
                  <FormattedNumberInput value={limits[selectedTier].min_buy_amount} onChange={(e) => updateLimitField('min_buy_amount', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Max. Compra</label>
                  <FormattedNumberInput value={limits[selectedTier].max_buy_amount} onChange={(e) => updateLimitField('max_buy_amount', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Min. Venda</label>
                  <FormattedNumberInput value={limits[selectedTier].min_sell_amount} onChange={(e) => updateLimitField('min_sell_amount', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
                <div><label className="text-sm text-gray-400 mb-1 block">Max. Venda</label>
                  <FormattedNumberInput value={limits[selectedTier].max_sell_amount} onChange={(e) => updateLimitField('max_sell_amount', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" /></div>
              </div>
            </div>

            <Button className="bg-gold-500 hover:bg-gold-600 text-black" onClick={saveLimits} disabled={saving} data-testid="save-limits-btn">
              {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
              {saving ? 'Salvando...' : `Salvar Limites ${selectedTier}`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LimitsTab;
