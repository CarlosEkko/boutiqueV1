import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Settings, Save, Loader2 } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from './useAdminTrading';

const FiatFeesTab = ({
  allFees, selectedFeeCurrency, setSelectedFeeCurrency,
  savingCurrency, saveFees, updateFeeField,
}) => {
  if (!allFees) return null;

  const FeeSection = ({ title, feeField, spreadField, minField }) => (
    <div>
      <h3 className="text-lg text-gold-400 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
          <Input type="number" step="0.1"
            value={allFees[selectedFeeCurrency]?.[feeField] || 0}
            onChange={(e) => updateFeeField(selectedFeeCurrency, feeField, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" data-testid={`${feeField.replace('_percent', '')}-input`} />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
          <Input type="number" step="0.1"
            value={allFees[selectedFeeCurrency]?.[spreadField] || 0}
            onChange={(e) => updateFeeField(selectedFeeCurrency, spreadField, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Taxa Minima ({selectedFeeCurrency})</label>
          <Input type="number" step="0.5"
            value={allFees[selectedFeeCurrency]?.[minField] || 0}
            onChange={(e) => updateFeeField(selectedFeeCurrency, minField, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings size={20} className="text-gold-400" />Configuracao de Taxas por Moeda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2 pb-4 border-b border-zinc-700">
          {SUPPORTED_CURRENCIES.map(curr => (
            <button key={curr.code}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                selectedFeeCurrency === curr.code ? 'bg-gold-500 text-black font-medium' : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
              }`}
              onClick={() => setSelectedFeeCurrency(curr.code)} data-testid={`fee-currency-${curr.code}`}>
              <span>{curr.flag}</span><span>{curr.code}</span>
            </button>
          ))}
        </div>

        <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SUPPORTED_CURRENCIES.find(c => c.code === selectedFeeCurrency)?.flag}</span>
            <div>
              <h3 className="text-lg text-white font-medium">
                {SUPPORTED_CURRENCIES.find(c => c.code === selectedFeeCurrency)?.name} ({selectedFeeCurrency})
              </h3>
              <p className="text-gray-400 text-sm">Configurar taxas para transacoes em {selectedFeeCurrency}</p>
            </div>
          </div>
        </div>

        <FeeSection title="Taxas de Compra" feeField="buy_fee_percent" spreadField="buy_spread_percent" minField="min_buy_fee" />
        <FeeSection title="Taxas de Venda" feeField="sell_fee_percent" spreadField="sell_spread_percent" minField="min_sell_fee" />
        <FeeSection title="Taxas de Conversao" feeField="swap_fee_percent" spreadField="swap_spread_percent" minField="min_swap_fee" />

        <Button className="bg-gold-500 hover:bg-gold-600 text-black"
          onClick={() => saveFees(selectedFeeCurrency)} disabled={savingCurrency === selectedFeeCurrency}
          data-testid="save-fees-btn">
          {savingCurrency === selectedFeeCurrency ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
          {savingCurrency === selectedFeeCurrency ? 'Salvando...' : `Salvar Taxas ${selectedFeeCurrency}`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FiatFeesTab;
