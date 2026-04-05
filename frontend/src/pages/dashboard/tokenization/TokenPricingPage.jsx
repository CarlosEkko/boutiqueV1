import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { DollarSign, Loader2, AlertCircle, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API = process.env.REACT_APP_BACKEND_URL;

const TokenPricingPage = () => {
  const { token } = useAuth();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({});
  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colRes, pricesRes] = await Promise.all([
        fetch(`${API}/api/tokenization/collections`, { headers }).then(r => r.json()),
        fetch(`${API}/api/tokenization/prices`, { headers }).then(r => r.json()).catch(() => ({ prices: {} })),
      ]);
      setCollections(colRes.collections || []);
      setPrices(pricesRes.prices || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSavePrice = async (colId, tokenSymbol) => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error('Introduza um preço válido'); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/tokenization/prices`, {
        method: 'POST', headers,
        body: JSON.stringify({ collection_id: colId, symbol: tokenSymbol, price_usd: parseFloat(newPrice) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Preço de ${tokenSymbol} atualizado para $${newPrice}`);
        setPrices(prev => ({ ...prev, [colId]: { price_usd: parseFloat(newPrice), updated_at: new Date().toISOString() } }));
        setEditingPrice(null);
        setNewPrice('');
      } else { toast.error(data.detail || 'Erro ao guardar preço'); }
    } catch (e) { toast.error('Erro de conexão'); }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="token-pricing-page">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <DollarSign className="text-[#D4AF37]" size={28} />
          Definir Preço
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Defina o preço de referência dos seus tokens</p>
      </div>

      {/* Pricing Table */}
      <Card className="bg-zinc-900/60 border-zinc-800">
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
            <div className="col-span-4">Token</div>
            <div className="col-span-2">Blockchain</div>
            <div className="col-span-2 text-right">Preço Atual (USD)</div>
            <div className="col-span-2 text-right">Última Atualização</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          {collections.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto text-zinc-600 mb-2" size={24} />
              <p className="text-zinc-500 text-sm">Sem tokens para definir preço</p>
            </div>
          ) : collections.map((col, i) => {
            const colId = col.id || col.contractAddress || `col-${i}`;
            const symbol = col.symbol || col.name?.substring(0, 4)?.toUpperCase() || '???';
            const priceData = prices[colId];
            const currentPrice = priceData?.price_usd;
            const lastUpdated = priceData?.updated_at;
            const isEditing = editingPrice === colId;

            return (
              <div key={colId} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors items-center" data-testid={`price-row-${i}`}>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center">
                    <span className="text-[#D4AF37] font-bold text-xs">{symbol.substring(0, 3)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{col.name || 'Token'}</p>
                    <p className="text-zinc-500 text-xs">{symbol}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">{col.blockchain || col.blockchainDescriptor || 'EVM'}</span>
                </div>
                <div className="col-span-2 text-right">
                  {isEditing ? (
                    <Input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white text-sm h-8 w-28 ml-auto text-right font-mono"
                      placeholder="0.00" autoFocus data-testid={`price-input-${i}`} />
                  ) : (
                    <span className="text-white font-mono font-semibold">
                      {currentPrice ? `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : (
                        <span className="text-zinc-600 flex items-center justify-end gap-1"><Minus size={12} /> Não definido</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-zinc-500 text-xs">
                    {lastUpdated ? formatDate(lastUpdated) : '—'}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  {isEditing ? (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" className="bg-[#D4AF37] hover:bg-[#C4A030] text-black h-8 text-xs" disabled={saving}
                        onClick={() => handleSavePrice(colId, symbol)} data-testid={`save-price-${i}`}>
                        {saving ? <Loader2 className="animate-spin" size={12} /> : <><Save size={12} className="mr-1" /> Guardar</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-zinc-400 h-8 text-xs" onClick={() => { setEditingPrice(null); setNewPrice(''); }}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-[#D4AF37] hover:bg-[#D4AF37]/10 h-8 text-xs"
                      onClick={() => { setEditingPrice(colId); setNewPrice(currentPrice?.toString() || ''); }} data-testid={`edit-price-${i}`}>
                      <DollarSign size={12} className="mr-1" /> Definir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default TokenPricingPage;
