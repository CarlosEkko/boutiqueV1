import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { ChevronDown, ArrowDownUp, RefreshCw } from 'lucide-react';

// Demo data
const btcPrice = 58065.44;
const eurSymbol = '€';

export const ExchangePrototypes = () => {
  const [option1Value, setOption1Value] = useState('');
  const [option1Mode, setOption1Mode] = useState('fiat');
  
  const [option2Value, setOption2Value] = useState('');
  const [option2Currency, setOption2Currency] = useState('EUR');
  const [option2Open, setOption2Open] = useState(false);
  
  const [option3Fiat, setOption3Fiat] = useState('');
  const [option3Crypto, setOption3Crypto] = useState('');
  
  const [option4Value, setOption4Value] = useState('');
  const [option4Mode, setOption4Mode] = useState('fiat');

  return (
    <div className="p-8 bg-zinc-950 min-h-screen space-y-8">
      <h1 className="text-3xl font-light text-white mb-8">Protótipos Exchange - Escolha o Design</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* OPÇÃO 1: Segmented Control Minimalista */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Opção 1: Segmented Control</CardTitle>
            <p className="text-gray-400 text-sm">Toggle discreto acima do input</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Montante</span>
              <div className="flex bg-zinc-800 rounded-full p-0.5">
                <button
                  onClick={() => setOption1Mode('fiat')}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    option1Mode === 'fiat' 
                      ? 'bg-amber-600/80 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  EUR
                </button>
                <button
                  onClick={() => setOption1Mode('crypto')}
                  className={`px-3 py-1 text-xs rounded-full transition-all ${
                    option1Mode === 'crypto' 
                      ? 'bg-amber-600/80 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  BTC
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {option1Mode === 'fiat' ? eurSymbol : ''}
              </span>
              <Input
                type="number"
                value={option1Value}
                onChange={(e) => setOption1Value(e.target.value)}
                placeholder="0.00"
                className={`bg-zinc-800 border-zinc-700 text-white ${option1Mode === 'fiat' ? 'pl-8' : 'pr-14'}`}
              />
              {option1Mode === 'crypto' && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">BTC</span>
              )}
            </div>
            {option1Value && (
              <p className="text-xs text-gray-500">
                ≈ {option1Mode === 'fiat' 
                  ? `${(parseFloat(option1Value) / btcPrice).toFixed(6)} BTC`
                  : `${eurSymbol}${(parseFloat(option1Value) * btcPrice).toLocaleString()}`
                }
              </p>
            )}
          </CardContent>
        </Card>

        {/* OPÇÃO 2: Dropdown no Input */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Opção 2: Dropdown no Input</CardTitle>
            <p className="text-gray-400 text-sm">Selector integrado no campo</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm text-gray-400 block">Montante</label>
            <div className="relative">
              <Input
                type="number"
                value={option2Value}
                onChange={(e) => setOption2Value(e.target.value)}
                placeholder="0.00"
                className="bg-zinc-800 border-zinc-700 text-white pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setOption2Open(!option2Open)}
                  className="flex items-center gap-1 px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-sm text-white transition-colors"
                >
                  {option2Currency}
                  <ChevronDown size={14} className={`transition-transform ${option2Open ? 'rotate-180' : ''}`} />
                </button>
                {option2Open && (
                  <div className="absolute right-0 mt-1 bg-zinc-700 border border-zinc-600 rounded shadow-xl z-10">
                    <button
                      onClick={() => { setOption2Currency('EUR'); setOption2Open(false); }}
                      className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600"
                    >
                      EUR
                    </button>
                    <button
                      onClick={() => { setOption2Currency('BTC'); setOption2Open(false); }}
                      className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-600"
                    >
                      BTC
                    </button>
                  </div>
                )}
              </div>
            </div>
            {option2Value && (
              <p className="text-xs text-gray-500">
                ≈ {option2Currency === 'EUR' 
                  ? `${(parseFloat(option2Value) / btcPrice).toFixed(6)} BTC`
                  : `${eurSymbol}${(parseFloat(option2Value) * btcPrice).toLocaleString()}`
                }
              </p>
            )}
          </CardContent>
        </Card>

        {/* OPÇÃO 3: Dois Campos com Swap */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Opção 3: Campos Duplos + Swap</CardTitle>
            <p className="text-gray-400 text-sm">Dois campos interligados (estilo Uniswap)</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Você paga</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{eurSymbol}</span>
                <Input
                  type="number"
                  value={option3Fiat}
                  onChange={(e) => {
                    setOption3Fiat(e.target.value);
                    setOption3Crypto(e.target.value ? (parseFloat(e.target.value) / btcPrice).toFixed(6) : '');
                  }}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700 text-white pl-8"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 font-medium">EUR</span>
              </div>
            </div>
            
            <div className="flex justify-center py-1">
              <button className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors">
                <ArrowDownUp size={16} className="text-amber-500" />
              </button>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 block mb-1">Você recebe</label>
              <div className="relative">
                <Input
                  type="number"
                  value={option3Crypto}
                  onChange={(e) => {
                    setOption3Crypto(e.target.value);
                    setOption3Fiat(e.target.value ? (parseFloat(e.target.value) * btcPrice).toFixed(2) : '');
                  }}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700 text-white pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 font-medium">BTC</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OPÇÃO 4: Ícone Swap Lateral */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Opção 4: Swap Icon</CardTitle>
            <p className="text-gray-400 text-sm">Botão de troca ao lado do input</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm text-gray-400 block">
              Montante em {option4Mode === 'fiat' ? 'EUR' : 'BTC'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {option4Mode === 'fiat' ? eurSymbol : ''}
                </span>
                <Input
                  type="number"
                  value={option4Value}
                  onChange={(e) => setOption4Value(e.target.value)}
                  placeholder="0.00"
                  className={`bg-zinc-800 border-zinc-700 text-white ${option4Mode === 'fiat' ? 'pl-8' : ''}`}
                />
                {option4Mode === 'crypto' && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">BTC</span>
                )}
              </div>
              <button
                onClick={() => setOption4Mode(option4Mode === 'fiat' ? 'crypto' : 'fiat')}
                className="px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 rounded-lg transition-colors"
                title="Trocar para BTC/EUR"
              >
                <RefreshCw size={18} className="text-amber-500" />
              </button>
            </div>
            {option4Value && (
              <p className="text-xs text-gray-500">
                ≈ {option4Mode === 'fiat' 
                  ? `${(parseFloat(option4Value) / btcPrice).toFixed(6)} BTC`
                  : `${eurSymbol}${(parseFloat(option4Value) * btcPrice).toLocaleString()}`
                }
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ExchangePrototypes;
