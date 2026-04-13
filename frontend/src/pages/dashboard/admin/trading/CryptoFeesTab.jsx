import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Coins, Search, Save, Loader2 } from 'lucide-react';

const CryptoFeesTab = ({
  cryptoFees, selectedCrypto, setSelectedCrypto, cryptoSearch, setCryptoSearch,
  savingCrypto, saveCryptoFees, updateCryptoFeeField,
}) => {
  const FeeSection = ({ title, feeField, spreadField, minField }) => (
    <div>
      <h4 className="text-lg text-gold-400 mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Taxa (%)</label>
          <Input type="number" step="0.1" value={selectedCrypto[feeField]}
            onChange={(e) => updateCryptoFeeField(feeField, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" data-testid={`crypto-${feeField}-input`} />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Spread (%)</label>
          <Input type="number" step="0.1" value={selectedCrypto[spreadField]}
            onChange={(e) => updateCryptoFeeField(spreadField, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Taxa Minima (USD)</label>
          <Input type="number" step="0.5" value={selectedCrypto[minField]}
            onChange={(e) => updateCryptoFeeField(minField, e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Coins size={20} className="text-gold-400" />Taxas por Criptomoeda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input placeholder="Buscar criptomoeda (BTC, ETH, SOL...)" value={cryptoSearch}
            onChange={(e) => setCryptoSearch(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white pl-10" data-testid="crypto-search-input" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-zinc-800/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm text-gray-400 mb-3 uppercase tracking-wider">Selecione a Cripto</h3>
            <div className="space-y-1">
              {cryptoFees
                .filter(c => c.symbol.toLowerCase().includes(cryptoSearch.toLowerCase()) || c.name.toLowerCase().includes(cryptoSearch.toLowerCase()))
                .map(crypto => (
                  <button key={crypto.symbol}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      selectedCrypto?.symbol === crypto.symbol ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'text-gray-300 hover:bg-zinc-700/50'
                    }`}
                    onClick={() => setSelectedCrypto(crypto)} data-testid={`crypto-select-${crypto.symbol}`}>
                    <span className="font-medium">{crypto.symbol}</span>
                    <span className="text-xs text-gray-500">{crypto.buy_fee_percent}%</span>
                  </button>
                ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedCrypto ? (
              <div className="space-y-6">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h3 className="text-xl text-white font-medium">{selectedCrypto.name}</h3>
                  <p className="text-gold-400">{selectedCrypto.symbol}</p>
                </div>
                <FeeSection title="Taxas de Compra" feeField="buy_fee_percent" spreadField="buy_spread_percent" minField="min_buy_fee" />
                <FeeSection title="Taxas de Venda" feeField="sell_fee_percent" spreadField="sell_spread_percent" minField="min_sell_fee" />
                <FeeSection title="Taxas de Conversao" feeField="swap_fee_percent" spreadField="swap_spread_percent" minField="min_swap_fee" />
                <Button className="bg-gold-500 hover:bg-gold-600 text-black" onClick={saveCryptoFees}
                  disabled={savingCrypto === selectedCrypto.symbol} data-testid="save-crypto-fees-btn">
                  {savingCrypto === selectedCrypto.symbol ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                  {savingCrypto === selectedCrypto.symbol ? 'Salvando...' : `Salvar Taxas ${selectedCrypto.symbol}`}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Selecione uma criptomoeda para configurar</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CryptoFeesTab;
