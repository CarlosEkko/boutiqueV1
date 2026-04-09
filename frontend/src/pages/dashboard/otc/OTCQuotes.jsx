import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber, formatDate} from '../../../utils/formatters';
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
  Building,
  ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', AED: 'د.إ', BRL: 'R$' };

const OTCQuotes = () => {
  const { token } = useAuth();
  const [deals, setDeals] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Create Quote Dialog — full negotiation form
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [marketPrice, setMarketPrice] = useState(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Full negotiation form
  const [negForm, setNegForm] = useState({
    reference_price: 0,
    reference_currency: 'EUR',
    condition: 'premium',
    condition_pct: 2,
    gross_pct: 4,
    net_pct: 2,
    broker_id: '',
    broker_name: '',
    broker_type: 'internal',
    member_id: '',
    member_name: '',
    broker_share_pct: 50,
    commission_currency: 'EUR',
    spread_percent: 1.0,
    fees: 0,
    valid_for_minutes: 5,
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [priceMode, setPriceMode] = useState('unit');
  const [pairRate, setPairRate] = useState('');

  // Quote Detail Dialog
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  // Auto-refresh market price every second when dialog is open
  useEffect(() => {
    if (showCreateDialog && selectedDeal) {
      const interval = setInterval(() => {
        fetchMarketPrice(selectedDeal.base_asset, selectedDeal.quote_asset, true);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [showCreateDialog, selectedDeal]);

  // Fetch team members on mount
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/admin/team-members`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTeamMembers(res.data.members || res.data || []);
      } catch (e) { /* ignore */ }
    };
    fetchTeam();
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
      if (!silent) toast.error('Erro ao buscar preço de mercado');
    } finally {
      if (!silent) setFetchingPrice(false);
    }
  };

  const openCreateDialog = async (deal) => {
    setSelectedDeal(deal);
    setNegForm({
      reference_price: 0,
      reference_currency: deal.quote_asset || 'EUR',
      condition: 'premium',
      condition_pct: 2,
      gross_pct: 4,
      net_pct: 2,
      broker_id: '',
      broker_name: '',
      broker_type: 'internal',
      member_id: '',
      member_name: '',
      broker_share_pct: 50,
      commission_currency: deal.quote_asset || 'EUR',
      spread_percent: 1.0,
      fees: 0,
      valid_for_minutes: 5,
      notes: ''
    });
    setMarketPrice(null);
    setShowCreateDialog(true);
    
    // Fetch market price
    await fetchMarketPrice(deal.base_asset, deal.quote_asset);
  };

  // Update negForm reference price when market price changes
  useEffect(() => {
    if (marketPrice?.price && negForm.reference_price === 0) {
      setNegForm(f => ({ ...f, reference_price: marketPrice.price }));
    }
  }, [marketPrice]);

  // Calculator
  const calc = useMemo(() => {
    const p = negForm.reference_price;
    const adj = negForm.condition === 'premium' ? p * (1 + negForm.condition_pct / 100) : p * (1 - negForm.condition_pct / 100);
    const qty = selectedDeal?.amount || 0;
    const total = qty * adj;
    const gross = total * (negForm.gross_pct / 100);
    const net = total * (negForm.net_pct / 100);
    const margin = gross - net;
    const brokerComm = margin * (negForm.broker_share_pct / 100);
    const memberComm = margin - brokerComm;
    return { adj, total, gross, net, margin, brokerComm, memberComm };
  }, [negForm, selectedDeal]);

  const sym = CURRENCY_SYMBOLS[negForm.reference_currency] || '€';
  const fmtVal = v => {
    const parts = (v || 0).toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sym}${intPart}.${parts[1]}`;
  };

  const calculateFinalPrice = () => {
    if (!selectedDeal) return 0;
    const spreadAmount = calc.adj * (negForm.spread_percent / 100);
    if (selectedDeal.transaction_type === 'buy') {
      return calc.adj + spreadAmount;
    } else {
      return calc.adj - spreadAmount;
    }
  };

  const calculateTotalValue = () => {
    if (!selectedDeal) return 0;
    return selectedDeal.amount * calculateFinalPrice();
  };

  const handleCreateDealAndQuote = async () => {
    if (!selectedDeal) return;
    setSaving(true);
    
    try {
      // 1. Update the deal with negotiation conditions
      const dealUpdate = {
        reference_price: negForm.reference_price,
        reference_currency: negForm.reference_currency,
        condition: negForm.condition,
        condition_pct: negForm.condition_pct,
        gross_pct: negForm.gross_pct,
        net_pct: negForm.net_pct,
        broker_id: negForm.broker_id,
        broker_name: negForm.broker_name,
        broker_type: negForm.broker_type,
        member_id: negForm.member_id,
        member_name: negForm.member_name,
        broker_share_pct: negForm.broker_share_pct,
        commission_currency: negForm.commission_currency,
        total_value: calc.total,
        adjusted_price: calc.adj,
        notes: negForm.notes,
      };
      
      await axios.put(`${API_URL}/api/otc-deals/deals/${selectedDeal.id}`, dealUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Create and send the quote
      const quotePayload = {
        deal_id: selectedDeal.id,
        spread_percent: negForm.spread_percent,
        fees: negForm.fees,
        valid_for_minutes: negForm.valid_for_minutes,
        is_manual: true,
        market_price: calc.adj,
      };
      
      await axios.post(`${API_URL}/api/otc/quotes`, quotePayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Negociação criada e cotação enviada ao cliente!');
      setShowCreateDialog(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create deal + quote:', err);
      toast.error(err.response?.data?.detail || 'Erro ao criar negociação');
    } finally {
      setSaving(false);
    }
  };

  const updateNeg = (field, value) => setNegForm(f => ({ ...f, [field]: value }));

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
                            <Badge className={quote.price_source === 'binance' || quote.price_source === 'market' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}>
                              {quote.price_source === 'binance' || quote.price_source === 'market' ? (
                                <><Zap size={12} className="mr-1" /> Mercado</>
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

      {/* Create Negotiation + Quote Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&>button]:text-zinc-400" data-testid="create-negotiation-dialog">
          <div className="p-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xl font-light" style={{ fontFamily: 'Playfair Display, serif' }}>
              <ArrowLeftRight className="text-yellow-500" size={20} />
              Criar Negociação & Cotação
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              {selectedDeal && `${selectedDeal.deal_number} — ${selectedDeal.client_name} — ${selectedDeal.amount} ${selectedDeal.base_asset}/${selectedDeal.quote_asset}`}
            </p>
          </div>
          
          {selectedDeal && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Left: Form */}
              <div className="lg:col-span-2 space-y-4">
                {/* Deal Info Summary */}
                <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase mb-1">Operação</p>
                      <Badge className={selectedDeal.transaction_type === 'buy' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}>
                        {selectedDeal.transaction_type === 'buy' ? 'COMPRA' : 'VENDA'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase mb-1">Cliente</p>
                      <p className="text-white text-sm font-medium">{selectedDeal.client_name}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase mb-1">Quantidade</p>
                      <p className="text-white font-mono">{formatNumber(selectedDeal.amount)} {selectedDeal.base_asset}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase mb-1">Moeda</p>
                      <p className="text-white">{selectedDeal.quote_asset}</p>
                    </div>
                  </div>
                </div>

                {/* Market Price */}
                <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-400 text-sm font-medium flex items-center gap-2">
                        <Zap size={16} /> Preço de Mercado
                      </p>
                      {fetchingPrice ? (
                        <p className="text-white text-xl font-mono mt-1">Carregando...</p>
                      ) : marketPrice ? (
                        <p className="text-white text-xl font-mono mt-1">
                          {CURRENCY_SYMBOLS[selectedDeal.quote_asset] || '$'}{formatNumber(marketPrice.price)} {selectedDeal.quote_asset}
                        </p>
                      ) : (
                        <p className="text-yellow-400 text-sm mt-1">Insira manualmente</p>
                      )}
                    </div>
                    <Button onClick={() => fetchMarketPrice(selectedDeal.base_asset, selectedDeal.quote_asset)} variant="outline" size="sm" className="border-blue-500/30 text-blue-400" disabled={fetchingPrice}>
                      <RefreshCw size={14} className={fetchingPrice ? 'animate-spin' : ''} />
                    </Button>
                  </div>
                </div>

                {/* Reference Price — with Pair Rate toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Preço de Referência</Label>
                    <div className="flex rounded overflow-hidden border border-zinc-800 text-xs">
                      <button type="button" onClick={() => setPriceMode('unit')} className={`px-3 py-1 font-medium transition-colors ${priceMode === 'unit' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-950 text-zinc-500'}`}>
                        Preço / Unidade
                      </button>
                      <button type="button" onClick={() => setPriceMode('pair')} className={`px-3 py-1 font-medium transition-colors ${priceMode === 'pair' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-950 text-zinc-500'}`}>
                        Taxa de Par
                      </button>
                    </div>
                  </div>

                  {priceMode === 'unit' ? (
                    <div>
                      <p className="text-xs text-zinc-600 mb-1.5">1 {selectedDeal?.base_asset} = ? {selectedDeal?.quote_asset}</p>
                      <div className="relative">
                        <Input type="number" step="any" value={negForm.reference_price} onChange={e => updateNeg('reference_price', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-36" data-testid="neg-ref-price" />
                        {marketPrice && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1 cursor-pointer" onClick={() => updateNeg('reference_price', marketPrice.price)}>
                            <TrendingUp size={12} /> Usar mercado
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-600 mb-1.5">Par {selectedDeal?.quote_asset}/{selectedDeal?.base_asset} (1 {selectedDeal?.quote_asset} = ? {selectedDeal?.base_asset})</p>
                      <Input
                        type="number"
                        step="any"
                        value={pairRate}
                        onChange={e => {
                          const val = e.target.value;
                          setPairRate(val);
                          const num = parseFloat(val);
                          if (num && num > 0) {
                            updateNeg('reference_price', 1 / num);
                          }
                        }}
                        className="bg-zinc-900 border-zinc-800 text-white"
                        placeholder="ex: 1.1685"
                        data-testid="neg-pair-rate"
                      />
                      {pairRate && parseFloat(pairRate) > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Par {selectedDeal?.quote_asset}/{selectedDeal?.base_asset}</span>
                            <span className="text-white font-mono">{parseFloat(pairRate).toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-400">Preço 1 {selectedDeal?.base_asset}</span>
                            <span className="text-amber-400 font-mono font-semibold">{CURRENCY_SYMBOLS[selectedDeal?.quote_asset] || ''}{(1 / parseFloat(pairRate)).toFixed(6)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-amber-500/20 pt-1.5">
                            <span className="text-zinc-400">Valor {selectedDeal?.amount} {selectedDeal?.base_asset}</span>
                            <span className="text-white font-mono font-bold">{CURRENCY_SYMBOLS[selectedDeal?.quote_asset] || ''}{(selectedDeal?.amount * (1 / parseFloat(pairRate))).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Condition */}
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Condição</Label>
                  <div className="flex gap-3">
                    <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                      <button onClick={() => updateNeg('condition', 'premium')} className={`px-4 py-2 text-sm font-medium ${negForm.condition === 'premium' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500'}`}>Premium (+)</button>
                      <button onClick={() => updateNeg('condition', 'discount')} className={`px-4 py-2 text-sm font-medium ${negForm.condition === 'discount' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500'}`}>Desconto (-)</button>
                    </div>
                    <div className="relative flex-1">
                      <Input type="number" step="0.1" value={negForm.condition_pct} onChange={e => updateNeg('condition_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" data-testid="neg-condition-pct" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                    </div>
                  </div>
                </div>

                {/* Gross/Net */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Gross (%)</Label>
                    <div className="relative">
                      <Input type="number" step="0.1" value={negForm.gross_pct} onChange={e => updateNeg('gross_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" data-testid="neg-gross" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Net (%)</Label>
                    <div className="relative">
                      <Input type="number" step="0.1" value={negForm.net_pct} onChange={e => updateNeg('net_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" data-testid="neg-net" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                    </div>
                  </div>
                </div>

                {/* Broker & Member */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Corretor</Label>
                    <Select value={negForm.broker_id || '_none'} onValueChange={v => {
                      if (v === '_none') { updateNeg('broker_id', ''); updateNeg('broker_name', ''); return; }
                      const m = teamMembers.find(t => t.id === v);
                      updateNeg('broker_id', v); updateNeg('broker_name', m?.name || '');
                    }}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="_none" className="text-zinc-500">Nenhum</SelectItem>
                        {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Corretor KBEX</Label>
                    <Select value={negForm.member_id || '_none'} onValueChange={v => {
                      if (v === '_none') { updateNeg('member_id', ''); updateNeg('member_name', ''); return; }
                      const m = teamMembers.find(t => t.id === v);
                      updateNeg('member_id', v); updateNeg('member_name', m?.name || '');
                    }}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="_none" className="text-zinc-500">Nenhum</SelectItem>
                        {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Broker share */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Margem Corretor (%)</Label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input type="number" step="5" value={negForm.broker_share_pct} onChange={e => updateNeg('broker_share_pct', Math.min(100, parseFloat(e.target.value) || 0))} className="bg-zinc-900 border-zinc-800 text-white pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                      </div>
                      <span className="text-zinc-500 text-xs whitespace-nowrap">KBEX: {100 - negForm.broker_share_pct}%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-400 text-xs uppercase tracking-wider">Validade Cotação</Label>
                    <Select value={String(negForm.valid_for_minutes)} onValueChange={v => updateNeg('valid_for_minutes', parseInt(v))}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="2" className="text-white">2 minutos</SelectItem>
                        <SelectItem value="5" className="text-white">5 minutos</SelectItem>
                        <SelectItem value="10" className="text-white">10 minutos</SelectItem>
                        <SelectItem value="15" className="text-white">15 minutos</SelectItem>
                        <SelectItem value="30" className="text-white">30 minutos</SelectItem>
                        <SelectItem value="60" className="text-white">1 hora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Right: Calculator */}
              <div className="lg:col-span-1">
                <Card className="bg-zinc-900 border-yellow-500/30 shadow-lg shadow-yellow-500/5 sticky top-4" data-testid="negotiation-calculator">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-yellow-500 flex items-center gap-2 text-base"><Calculator size={16} /> Calculadora</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">Preço Ajustado</span>
                        <span className="text-white font-medium">{fmtVal(calc.adj)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">Valor Total</span>
                        <span className="text-white font-bold">{fmtVal(calc.total)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">Gross ({negForm.gross_pct}%)</span>
                        <span className="text-yellow-400 font-medium">{fmtVal(calc.gross)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">Net ({negForm.net_pct}%)</span>
                        <span className="text-zinc-300">{fmtVal(calc.net)}</span>
                      </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                      <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">Margem KBEX</p>
                      <p className="text-xl font-bold text-white">{fmtVal(calc.margin)}</p>
                      <div className="space-y-1.5 pt-2 border-t border-yellow-500/20 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Corretor ({negForm.broker_share_pct}%)</span>
                          <span className="text-emerald-400 font-medium">{fmtVal(calc.brokerComm)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">KBEX ({100 - negForm.broker_share_pct}%)</span>
                          <span className="text-emerald-400 font-medium">{fmtVal(calc.memberComm)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quote summary */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 space-y-2">
                      <p className="text-blue-400 text-xs uppercase tracking-wider font-semibold">Cotação ao Cliente</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Spread ({negForm.spread_percent}%)</span>
                          <span className="text-white">{fmtVal(calc.adj * (negForm.spread_percent / 100))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Preço Final</span>
                          <span className="text-blue-400 font-bold">{fmtVal(calculateFinalPrice())}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-blue-500/20">
                          <span className="text-zinc-400">Valor Total</span>
                          <span className="text-blue-400 font-bold text-lg">{fmtVal(calculateTotalValue())}</span>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleCreateDealAndQuote} disabled={saving || negForm.reference_price <= 0} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-5" data-testid="create-deal-quote-btn">
                      {saving ? (
                        <><RefreshCw size={16} className="animate-spin mr-2" /> A processar...</>
                      ) : (
                        <><Send size={16} className="mr-2" /> Criar Negociação & Enviar Cotação</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
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
                  <Badge className={selectedQuote.price_source === 'binance' || selectedQuote.price_source === 'market' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}>
                    {selectedQuote.price_source === 'binance' || selectedQuote.price_source === 'market' ? 'Mercado' : 'Manual'}
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
