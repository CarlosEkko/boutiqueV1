import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { 
  Kanban,
  RefreshCw,
  ArrowRight,
  Clock,
  DollarSign,
  Building,
  ChevronRight,
  Calculator,
  Send,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCPipeline = () => {
  const { token } = useAuth();
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealDialog, setShowDealDialog] = useState(false);
  
  // Create Quote Dialog
  const [showCreateQuoteDialog, setShowCreateQuoteDialog] = useState(false);
  const [marketPrice, setMarketPrice] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  
  // Quote Form
  const [quoteForm, setQuoteForm] = useState({
    spread_percent: 1.0,
    fees: 0,
    valid_for_minutes: 5,
    is_manual: false,
    manual_price: ''
  });

  const stages = [
    { key: 'rfq', label: 'RFQ', color: 'border-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' },
    { key: 'quote', label: 'Quote', color: 'border-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400' },
    { key: 'acceptance', label: 'Aceitacao', color: 'border-gold-500', bgColor: 'bg-gold-500/10', textColor: 'text-gold-400' },
    { key: 'execution', label: 'Execucao', color: 'border-orange-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-400' },
    { key: 'settlement', label: 'Liquidacao', color: 'border-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
    { key: 'invoice', label: 'Invoice', color: 'border-teal-500', bgColor: 'bg-teal-500/10', textColor: 'text-teal-400' },
  ];

  useEffect(() => {
    fetchPipeline();
  }, [token]);

  // Auto-refresh market price every second when quote dialog is open
  useEffect(() => {
    if (showCreateQuoteDialog && selectedDeal && !quoteForm.is_manual) {
      const interval = setInterval(() => {
        fetchMarketPrice(selectedDeal.base_asset, selectedDeal.quote_asset, true);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [showCreateQuoteDialog, selectedDeal, quoteForm.is_manual]);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/otc/deals/pipeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPipeline(response.data);
    } catch (err) {
      console.error('Failed to fetch pipeline:', err);
      toast.error('Erro ao carregar pipeline');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketPrice = async (baseAsset, quoteAsset, silent = false) => {
    if (!silent) setFetchingPrice(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/otc/market-price?base_asset=${baseAsset}&quote_asset=${quoteAsset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMarketPrice(response.data);
    } catch (err) {
      console.error('Failed to fetch market price:', err);
      if (!silent) toast.error('Erro ao buscar preco de mercado');
    } finally {
      if (!silent) setFetchingPrice(false);
    }
  };

  const handleMoveStage = async (dealId, newStage) => {
    try {
      await axios.post(
        `${API_URL}/api/otc/deals/${dealId}/move-stage?new_stage=${newStage}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Deal movido para ' + newStage);
      fetchPipeline();
      setShowDealDialog(false);
    } catch (err) {
      toast.error('Erro ao mover deal');
    }
  };

  const openCreateQuoteDialog = async (deal) => {
    setSelectedDeal(deal);
    setQuoteForm({
      spread_percent: 1.0,
      fees: 0,
      valid_for_minutes: 5,
      is_manual: false,
      manual_price: ''
    });
    setMarketPrice(null);
    setShowDealDialog(false);
    setShowCreateQuoteDialog(true);
    
    // Fetch market price
    await fetchMarketPrice(deal.base_asset, deal.quote_asset);
  };

  const calculateFinalPrice = () => {
    if (!selectedDeal) return 0;
    
    const basePrice = quoteForm.is_manual && quoteForm.manual_price 
      ? parseFloat(quoteForm.manual_price) 
      : (marketPrice?.price || 0);
    
    const spreadAmount = basePrice * (quoteForm.spread_percent / 100);
    
    // Buy: client pays more, Sell: client receives less
    if (selectedDeal.transaction_type === 'buy') {
      return basePrice + spreadAmount;
    } else {
      return basePrice - spreadAmount;
    }
  };

  const calculateTotalValue = () => {
    if (!selectedDeal) return 0;
    return selectedDeal.amount * calculateFinalPrice();
  };

  const handleCreateQuote = async () => {
    if (!selectedDeal) return;
    
    try {
      const payload = {
        deal_id: selectedDeal.id,
        spread_percent: quoteForm.spread_percent,
        fees: quoteForm.fees,
        valid_for_minutes: quoteForm.valid_for_minutes,
        is_manual: quoteForm.is_manual,
        market_price: quoteForm.is_manual && quoteForm.manual_price 
          ? parseFloat(quoteForm.manual_price) 
          : null
      };
      
      await axios.post(`${API_URL}/api/otc/quotes`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Cotacao criada e enviada!');
      setShowCreateQuoteDialog(false);
      fetchPipeline();
    } catch (err) {
      console.error('Failed to create quote:', err);
      toast.error(err.response?.data?.detail || 'Erro ao criar cotacao');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNextStage = (currentStage) => {
    const idx = stages.findIndex(s => s.key === currentStage);
    if (idx >= 0 && idx < stages.length - 1) {
      return stages[idx + 1].key;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Kanban className="text-gold-400" />
            Pipeline OTC
          </h1>
          <p className="text-gray-400 mt-1">Visualizacao Kanban das operacoes OTC</p>
        </div>
        <Button
          onClick={fetchPipeline}
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageData = pipeline[stage.key] || { deals: [], count: 0, total_value: 0 };
          
          return (
            <div key={stage.key} className="flex-shrink-0 w-72">
              {/* Stage Header */}
              <div className={`p-3 rounded-t-lg border-t-4 ${stage.color} bg-zinc-900/80`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-medium ${stage.textColor}`}>{stage.label}</h3>
                  <Badge className="bg-zinc-700">{stageData.count}</Badge>
                </div>
                {stageData.total_value > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ${formatNumber(stageData.total_value)}
                  </p>
                )}
              </div>
              
              {/* Stage Cards */}
              <div className={`min-h-[400px] p-2 rounded-b-lg ${stage.bgColor} border border-t-0 border-zinc-800`}>
                <div className="space-y-2">
                  {stageData.deals && stageData.deals.length > 0 ? (
                    stageData.deals.map((deal) => (
                      <Card 
                        key={deal.id} 
                        className="bg-zinc-900 border-zinc-800 hover:border-gold-500/30 cursor-pointer transition-colors"
                        onClick={() => { setSelectedDeal(deal); setShowDealDialog(true); }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400 font-mono">{deal.deal_number}</span>
                            <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                              {deal.transaction_type?.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <p className="text-white font-medium text-sm mb-2">{deal.client_name}</p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                            <span className="text-gold-400 font-mono">
                              {formatNumber(deal.amount)} {deal.base_asset}
                            </span>
                            <ArrowRight size={12} />
                            <span>{deal.quote_asset}</span>
                          </div>
                          
                          {deal.total_value && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <DollarSign size={12} />
                              <span className="text-white">${formatNumber(deal.total_value)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <Clock size={12} />
                            <span>{formatDate(deal.created_at)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Sem deals
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Building size={20} />
              {selectedDeal?.deal_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Cliente</p>
                  <p className="text-white">{selectedDeal.client_name}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Tipo</p>
                  <Badge className={selectedDeal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                    {selectedDeal.transaction_type?.toUpperCase()}
                  </Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Quantidade</p>
                  <p className="text-gold-400 font-mono">{formatNumber(selectedDeal.amount)} {selectedDeal.base_asset}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Moeda</p>
                  <p className="text-white">{selectedDeal.quote_asset}</p>
                </div>
                
                {selectedDeal.final_price && (
                  <>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-400 text-xs uppercase mb-1">Preco</p>
                      <p className="text-white font-mono">${formatNumber(selectedDeal.final_price)}</p>
                    </div>
                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-400 text-xs uppercase mb-1">Valor Total</p>
                      <p className="text-gold-400 font-mono">${formatNumber(selectedDeal.total_value)}</p>
                    </div>
                  </>
                )}
                
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Stage</p>
                  <Badge className="bg-gold-900/30 text-gold-400">{selectedDeal.stage?.replace('_', ' ')}</Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Criado</p>
                  <p className="text-white text-sm">{formatDate(selectedDeal.created_at)}</p>
                </div>
              </div>
              
              {selectedDeal.notes && (
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Notas</p>
                  <p className="text-white whitespace-pre-wrap text-sm">{selectedDeal.notes}</p>
                </div>
              )}
              
              {/* Actions based on stage */}
              <div className="pt-4 border-t border-gold-800/20 space-y-2">
                {/* For RFQ stage: Show Create Quote button */}
                {selectedDeal.stage === 'rfq' && (
                  <Button
                    onClick={() => openCreateQuoteDialog(selectedDeal)}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                    data-testid="create-quote-btn"
                  >
                    <Calculator size={16} className="mr-2" />
                    Criar Cotacao
                  </Button>
                )}
                
                {/* For other stages: Show Move to Next Stage button */}
                {selectedDeal.stage !== 'rfq' && getNextStage(selectedDeal.stage) && (
                  <Button
                    onClick={() => handleMoveStage(selectedDeal.id, getNextStage(selectedDeal.stage))}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <ChevronRight size={16} className="mr-2" />
                    Mover para {stages.find(s => s.key === getNextStage(selectedDeal.stage))?.label}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateQuoteDialog} onOpenChange={setShowCreateQuoteDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Calculator size={20} />
              Criar Cotacao
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedDeal && `Deal ${selectedDeal.deal_number} - ${selectedDeal.client_name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-6 py-4">
              {/* Deal Summary */}
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Operacao</p>
                    <Badge className={selectedDeal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                      {selectedDeal.transaction_type === 'buy' ? 'COMPRA' : 'VENDA'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Quantidade</p>
                    <p className="text-white font-mono text-lg">{formatNumber(selectedDeal.amount)} {selectedDeal.base_asset}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Moeda</p>
                    <p className="text-white text-lg">{selectedDeal.quote_asset}</p>
                  </div>
                </div>
              </div>

              {/* Market Price */}
              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-400 text-sm font-medium flex items-center gap-2">
                      <Zap size={16} />
                      Preco de Mercado
                    </p>
                    {fetchingPrice ? (
                      <p className="text-white text-2xl font-mono mt-1">Carregando...</p>
                    ) : marketPrice ? (
                      <p className="text-white text-2xl font-mono mt-1">
                        ${formatNumber(marketPrice.price)} {selectedDeal.quote_asset}
                      </p>
                    ) : (
                      <p className="text-yellow-400 text-sm mt-1">Preco nao disponivel - use manual</p>
                    )}
                  </div>
                  <Button
                    onClick={() => fetchMarketPrice(selectedDeal.base_asset, selectedDeal.quote_asset)}
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 text-blue-400"
                    disabled={fetchingPrice}
                  >
                    <RefreshCw size={14} className={fetchingPrice ? 'animate-spin' : ''} />
                  </Button>
                </div>
              </div>

              {/* Quote Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modo de Preco</Label>
                  <Select 
                    value={quoteForm.is_manual ? 'manual' : 'auto'} 
                    onValueChange={(v) => setQuoteForm({...quoteForm, is_manual: v === 'manual'})}
                  >
                    <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                      <SelectItem value="auto" className="text-white hover:bg-zinc-700">
                        <span className="flex items-center gap-2">
                          <Zap size={14} /> Semi-Automatico
                        </span>
                      </SelectItem>
                      <SelectItem value="manual" className="text-white hover:bg-zinc-700">
                        <span className="flex items-center gap-2">
                          <Calculator size={14} /> Manual
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {quoteForm.is_manual && (
                  <div className="space-y-2">
                    <Label>Preco Manual ({selectedDeal.quote_asset})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quoteForm.manual_price}
                      onChange={(e) => setQuoteForm({...quoteForm, manual_price: e.target.value})}
                      placeholder="Ex: 65000.00"
                      className="bg-zinc-800 border-gold-500/30"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Spread (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={quoteForm.spread_percent}
                    onChange={(e) => setQuoteForm({...quoteForm, spread_percent: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-800 border-gold-500/30"
                  />
                  <p className="text-xs text-gray-500">
                    {selectedDeal.transaction_type === 'buy' ? 'Adicionado ao preco' : 'Subtraido do preco'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Taxas Adicionais ({selectedDeal.quote_asset})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={quoteForm.fees}
                    onChange={(e) => setQuoteForm({...quoteForm, fees: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-800 border-gold-500/30"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Validade (minutos)</Label>
                  <Select 
                    value={String(quoteForm.valid_for_minutes)} 
                    onValueChange={(v) => setQuoteForm({...quoteForm, valid_for_minutes: parseInt(v)})}
                  >
                    <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                      <SelectItem value="2" className="text-white hover:bg-zinc-700">2 minutos</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-zinc-700">5 minutos</SelectItem>
                      <SelectItem value="10" className="text-white hover:bg-zinc-700">10 minutos</SelectItem>
                      <SelectItem value="15" className="text-white hover:bg-zinc-700">15 minutos</SelectItem>
                      <SelectItem value="30" className="text-white hover:bg-zinc-700">30 minutos</SelectItem>
                      <SelectItem value="60" className="text-white hover:bg-zinc-700">1 hora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quote Preview */}
              <div className="p-4 bg-gold-900/20 rounded-lg border border-gold-500/30">
                <h4 className="text-gold-400 font-medium mb-3 flex items-center gap-2">
                  <DollarSign size={18} />
                  Resumo da Cotacao
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Preco Base</p>
                    <p className="text-white font-mono">
                      ${formatNumber(quoteForm.is_manual && quoteForm.manual_price ? parseFloat(quoteForm.manual_price) : (marketPrice?.price || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Spread ({quoteForm.spread_percent}%)</p>
                    <p className="text-white font-mono">
                      ${formatNumber((quoteForm.is_manual && quoteForm.manual_price ? parseFloat(quoteForm.manual_price) : (marketPrice?.price || 0)) * (quoteForm.spread_percent / 100))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Preco Final</p>
                    <p className="text-gold-400 font-mono text-xl">
                      ${formatNumber(calculateFinalPrice())}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Valor Total</p>
                    <p className="text-gold-400 font-mono text-xl">
                      ${formatNumber(calculateTotalValue())}
                    </p>
                  </div>
                </div>
                
                {quoteForm.fees > 0 && (
                  <div className="mt-3 pt-3 border-t border-gold-500/20">
                    <p className="text-gray-400 text-sm">+ Taxas: <span className="text-white">${formatNumber(quoteForm.fees)}</span></p>
                    <p className="text-gold-400 font-mono text-lg mt-1">
                      Total com Taxas: ${formatNumber(calculateTotalValue() + quoteForm.fees)}
                    </p>
                  </div>
                )}
              </div>

              {/* Warning for manual mode without price */}
              {quoteForm.is_manual && !quoteForm.manual_price && (
                <div className="p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30 flex items-center gap-2">
                  <AlertTriangle className="text-yellow-400" size={18} />
                  <p className="text-yellow-400 text-sm">Insira um preco manual para continuar</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateQuoteDialog(false)} className="border-zinc-600">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateQuote}
              className="bg-gold-500 hover:bg-gold-400 text-black"
              disabled={
                (quoteForm.is_manual && !quoteForm.manual_price) ||
                (!quoteForm.is_manual && !marketPrice)
              }
              data-testid="submit-quote-btn"
            >
              <Send size={16} className="mr-2" />
              Criar e Enviar Cotacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCPipeline;
