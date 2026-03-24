import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
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
  FileText,
  Plus,
  RefreshCw,
  Clock,
  DollarSign,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Send,
  Calculator,
  AlertTriangle,
  Zap,
  Eye,
  Building
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCQuotes = () => {
  const { token } = useAuth();
  const [deals, setDeals] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Create Quote Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
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

  // Quote Detail Dialog
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch deals in RFQ stage
      const dealsRes = await axios.get(`${API_URL}/api/otc/deals?stage=rfq`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(dealsRes.data.deals || []);
      
      // Fetch all quotes
      const quotesRes = await axios.get(`${API_URL}/api/otc/quotes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuotes(quotesRes.data.quotes || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketPrice = async (baseAsset, quoteAsset) => {
    setFetchingPrice(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/otc/market-price?base_asset=${baseAsset}&quote_asset=${quoteAsset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMarketPrice(response.data);
    } catch (err) {
      console.error('Failed to fetch market price:', err);
      toast.error('Erro ao buscar preço de mercado');
    } finally {
      setFetchingPrice(false);
    }
  };

  const openCreateDialog = async (deal) => {
    setSelectedDeal(deal);
    setQuoteForm({
      spread_percent: 1.0,
      fees: 0,
      valid_for_minutes: 5,
      is_manual: false,
      manual_price: ''
    });
    setMarketPrice(null);
    setShowCreateDialog(true);
    
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
      
      toast.success('Cotação criada e enviada!');
      setShowCreateDialog(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create quote:', err);
      toast.error(err.response?.data?.detail || 'Erro ao criar cotação');
    }
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/otc/quotes/${quoteId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Cotação aceita! Deal movido para Execução.');
      fetchData();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aceitar cotação');
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/otc/quotes/${quoteId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Cotação rejeitada');
      fetchData();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar cotação');
    }
  };

  const getQuoteStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-900/30 text-yellow-400',
      sent: 'bg-blue-900/30 text-blue-400',
      accepted: 'bg-green-900/30 text-green-400',
      rejected: 'bg-red-900/30 text-red-400',
      expired: 'bg-gray-900/30 text-gray-400'
    };
    const labels = {
      pending: 'Pendente',
      sent: 'Enviada',
      accepted: 'Aceita',
      rejected: 'Rejeitada',
      expired: 'Expirada'
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
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

  const isQuoteExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const pendingDeals = deals.filter(d => d.stage === 'rfq');
  const sentQuotes = quotes.filter(q => q.status === 'sent' && !isQuoteExpired(q.expires_at));
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
  const expiredQuotes = quotes.filter(q => q.status === 'expired' || (q.status === 'sent' && isQuoteExpired(q.expires_at)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <FileText className="text-gold-400" />
            Cotações OTC
          </h1>
          <p className="text-gray-400 mt-1">Gestão de cotações para operações OTC</p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">RFQ Pendentes</p>
                <p className="text-2xl font-light text-white">{pendingDeals.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <FileText className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cotações Enviadas</p>
                <p className="text-2xl font-light text-white">{sentQuotes.length}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Send className="text-yellow-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Aceitas</p>
                <p className="text-2xl font-light text-white">{acceptedQuotes.length}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Expiradas</p>
                <p className="text-2xl font-light text-white">{expiredQuotes.length}</p>
              </div>
              <div className="p-3 bg-gray-500/20 rounded-lg">
                <Clock className="text-gray-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900/50 border border-gold-800/20">
          <TabsTrigger value="pending" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            RFQ Pendentes ({pendingDeals.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Cotações Enviadas ({sentQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* RFQ Pending Tab */}
        <TabsContent value="pending" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gold-400">Carregando...</div>
                </div>
              ) : pendingDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Tipo</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Quantidade</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Par</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Data RFQ</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Building size={16} className="text-gray-400" />
                              <span className="text-white">{deal.client_name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                              {deal.transaction_type === 'buy' ? (
                                <><TrendingUp size={12} className="mr-1" /> COMPRA</>
                              ) : (
                                <><TrendingDown size={12} className="mr-1" /> VENDA</>
                              )}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">{formatNumber(deal.amount)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400">{deal.base_asset}</span>
                            <ArrowRight size={12} className="inline mx-1 text-gray-500" />
                            <span className="text-gray-300">{deal.quote_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(deal.rfq_received_at || deal.created_at)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => openCreateDialog(deal)}
                              className="bg-gold-500 hover:bg-gold-400 text-black"
                              size="sm"
                            >
                              <Calculator size={14} className="mr-1" />
                              Criar Cotação
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem RFQs Pendentes</h3>
                  <p className="text-gray-400">Todos os RFQs foram cotados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Quotes Tab */}
        <TabsContent value="sent" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {sentQuotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Par</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Preço Final</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor Total</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Spread</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Expira</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentQuotes.map((quote) => (
                        <tr key={quote.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{quote.deal_number || quote.deal_id?.slice(0,8)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{quote.base_asset}/{quote.quote_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">${formatNumber(quote.final_price)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">${formatNumber(quote.total_value)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-300">{quote.spread_percent}%</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock size={14} />
                              <span>{formatDate(quote.expires_at)}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {getQuoteStatusBadge(quote.status)}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              onClick={() => { setSelectedQuote(quote); setShowDetailDialog(true); }}
                              size="sm"
                              variant="outline"
                              className="border-gold-500/30 text-gold-400"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              onClick={() => handleAcceptQuote(quote.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-500"
                            >
                              <CheckCircle size={14} />
                            </Button>
                            <Button
                              onClick={() => handleRejectQuote(quote.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                            >
                              <XCircle size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Send className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Cotações Enviadas</h3>
                  <p className="text-gray-400">Crie cotações a partir dos RFQs pendentes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {quotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Par</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Preço</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Origem Preço</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Criada</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{quote.deal_number || quote.deal_id?.slice(0,8)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{quote.base_asset}/{quote.quote_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">${formatNumber(quote.final_price)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">${formatNumber(quote.total_value)}</span>
                          </td>
                          <td className="p-4">
                            <Badge className={quote.price_source === 'binance' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}>
                              {quote.price_source === 'binance' ? (
                                <><Zap size={12} className="mr-1" /> Binance</>
                              ) : (
                                'Manual'
                              )}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(quote.created_at)}</span>
                          </td>
                          <td className="p-4">
                            {getQuoteStatusBadge(isQuoteExpired(quote.expires_at) && quote.status === 'sent' ? 'expired' : quote.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Histórico</h3>
                  <p className="text-gray-400">As cotações aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Calculator size={20} />
              Criar Cotação
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
                    <p className="text-gray-400 text-xs uppercase mb-1">Operação</p>
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
                      Preço de Mercado (Binance)
                    </p>
                    {fetchingPrice ? (
                      <p className="text-white text-2xl font-mono mt-1">Carregando...</p>
                    ) : marketPrice ? (
                      <p className="text-white text-2xl font-mono mt-1">
                        ${formatNumber(marketPrice.price)} {selectedDeal.quote_asset}
                      </p>
                    ) : (
                      <p className="text-yellow-400 text-sm mt-1">Preço não disponível - use manual</p>
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
                  <Label>Modo de Preço</Label>
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
                          <Zap size={14} /> Semi-Automático
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
                    <Label>Preço Manual ({selectedDeal.quote_asset})</Label>
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
                    {selectedDeal.transaction_type === 'buy' ? 'Adicionado ao preço' : 'Subtraído do preço'}
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
                  Resumo da Cotação
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Preço Base</p>
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
                    <p className="text-gray-400 text-sm">Preço Final</p>
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
                  <p className="text-yellow-400 text-sm">Insira um preço manual para continuar</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-zinc-600">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateQuote}
              className="bg-gold-500 hover:bg-gold-400 text-black"
              disabled={
                (quoteForm.is_manual && !quoteForm.manual_price) ||
                (!quoteForm.is_manual && !marketPrice)
              }
            >
              <Send size={16} className="mr-2" />
              Criar e Enviar Cotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <FileText size={20} />
              Detalhes da Cotação
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Par</p>
                  <p className="text-white">{selectedQuote.base_asset}/{selectedQuote.quote_asset}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Quantidade</p>
                  <p className="text-white font-mono">{formatNumber(selectedQuote.amount)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Preço Mercado</p>
                  <p className="text-white font-mono">${formatNumber(selectedQuote.market_price)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Spread</p>
                  <p className="text-white">{selectedQuote.spread_percent}%</p>
                </div>
                <div className="p-3 bg-gold-900/30 rounded-lg">
                  <p className="text-gold-400 text-xs uppercase mb-1">Preço Final</p>
                  <p className="text-gold-400 font-mono text-lg">${formatNumber(selectedQuote.final_price)}</p>
                </div>
                <div className="p-3 bg-gold-900/30 rounded-lg">
                  <p className="text-gold-400 text-xs uppercase mb-1">Valor Total</p>
                  <p className="text-gold-400 font-mono text-lg">${formatNumber(selectedQuote.total_value)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Origem Preço</p>
                  <Badge className={selectedQuote.price_source === 'binance' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}>
                    {selectedQuote.price_source || 'Manual'}
                  </Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Expira</p>
                  <p className="text-white text-sm">{formatDate(selectedQuote.expires_at)}</p>
                </div>
              </div>
              
              {selectedQuote.status === 'sent' && !isQuoteExpired(selectedQuote.expires_at) && (
                <div className="flex gap-3 pt-4 border-t border-gold-800/20">
                  <Button
                    onClick={() => handleAcceptQuote(selectedQuote.id)}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Aceitar Cotação
                  </Button>
                  <Button
                    onClick={() => handleRejectQuote(selectedQuote.id)}
                    variant="outline"
                    className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <XCircle size={16} className="mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCQuotes;
