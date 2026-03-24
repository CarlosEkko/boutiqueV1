import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { formatNumber } from '../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { 
  Briefcase,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ArrowRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Send,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientOTCPortal = () => {
  const { token, user } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals');
  
  // RFQ Dialog
  const [showRFQDialog, setShowRFQDialog] = useState(false);
  const [rfqForm, setRfqForm] = useState({
    transaction_type: 'buy',
    base_asset: 'BTC',
    quote_asset: 'EUR',
    amount: '',
    notes: ''
  });
  
  // Quote Detail Dialog
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Check if user is an OTC client
      const clientRes = await axios.get(`${API_URL}/api/otc/client/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientData(clientRes.data);
      
      // Fetch client's deals
      const dealsRes = await axios.get(`${API_URL}/api/otc/client/deals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(dealsRes.data.deals || []);
      
      // Fetch client's quotes
      const quotesRes = await axios.get(`${API_URL}/api/otc/client/quotes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuotes(quotesRes.data.quotes || []);
      
    } catch (err) {
      console.error('Failed to fetch OTC data:', err);
      if (err.response?.status === 404) {
        setClientData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRFQ = async () => {
    if (!rfqForm.amount || parseFloat(rfqForm.amount) <= 0) {
      toast.error('Insira uma quantidade válida');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/otc/client/rfq`, {
        ...rfqForm,
        amount: parseFloat(rfqForm.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Pedido de cotação enviado!');
      setShowRFQDialog(false);
      setRfqForm({
        transaction_type: 'buy',
        base_asset: 'BTC',
        quote_asset: 'EUR',
        amount: '',
        notes: ''
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar pedido');
    }
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/otc/client/quotes/${quoteId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Cotação aceite! A equipa OTC irá processar.');
      setShowQuoteDialog(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aceitar cotação');
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      await axios.post(`${API_URL}/api/otc/client/quotes/${quoteId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Cotação rejeitada');
      setShowQuoteDialog(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar cotação');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDealStageBadge = (stage) => {
    const styles = {
      rfq: 'bg-blue-900/30 text-blue-400',
      quote: 'bg-yellow-900/30 text-yellow-400',
      acceptance: 'bg-gold-900/30 text-gold-400',
      execution: 'bg-orange-900/30 text-orange-400',
      settlement: 'bg-purple-900/30 text-purple-400',
      invoice: 'bg-cyan-900/30 text-cyan-400',
      completed: 'bg-green-900/30 text-green-400'
    };
    const labels = {
      rfq: 'Aguarda Cotação',
      quote: 'Cotação Enviada',
      acceptance: 'Aceite',
      execution: 'Em Execução',
      settlement: 'Liquidação',
      invoice: 'Faturação',
      completed: 'Concluído'
    };
    return <Badge className={styles[stage]}>{labels[stage] || stage}</Badge>;
  };

  const getQuoteStatusBadge = (status, expiresAt) => {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    if (status === 'sent' && isExpired) {
      return <Badge className="bg-gray-900/30 text-gray-400">Expirada</Badge>;
    }
    const styles = {
      sent: 'bg-yellow-900/30 text-yellow-400',
      accepted: 'bg-green-900/30 text-green-400',
      rejected: 'bg-red-900/30 text-red-400',
      expired: 'bg-gray-900/30 text-gray-400'
    };
    const labels = {
      sent: 'Pendente',
      accepted: 'Aceite',
      rejected: 'Rejeitada',
      expired: 'Expirada'
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  // If not an OTC client, show onboarding message
  if (!loading && !clientData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="text-gold-400" size={32} />
          <div>
            <h1 className="text-3xl font-light text-white">OTC Trading</h1>
            <p className="text-gray-400">Operações de grande volume com atendimento personalizado</p>
          </div>
        </div>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-12 text-center">
            <Briefcase className="mx-auto mb-4 text-gold-400" size={64} />
            <h2 className="text-2xl text-white mb-4">Bem-vindo ao OTC Desk</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-6">
              O nosso serviço OTC é destinado a operações de grande volume (mínimo $50,000). 
              Se pretende negociar volumes significativos com atendimento personalizado, 
              contacte-nos para se tornar um cliente OTC.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                className="bg-gold-500 hover:bg-gold-400 text-black"
                onClick={() => window.open('mailto:otc@kbex.io', '_blank')}
              >
                <Send size={16} className="mr-2" />
                Contactar OTC Desk
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDeals = deals.filter(d => !['completed'].includes(d.stage));
  const pendingQuotes = quotes.filter(q => q.status === 'sent' && (!q.expires_at || new Date(q.expires_at) > new Date()));
  const completedDeals = deals.filter(d => d.stage === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="text-gold-400" size={32} />
          <div>
            <h1 className="text-3xl font-light text-white">OTC Trading</h1>
            <p className="text-gray-400">Bem-vindo, {clientData?.entity_name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchData}
            variant="outline"
            className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowRFQDialog(true)}
            className="bg-gold-500 hover:bg-gold-400 text-black"
          >
            <Plus size={16} className="mr-2" />
            Novo Pedido de Cotação
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Deals Ativos</p>
                <p className="text-2xl font-light text-white">{activeDeals.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Clock className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Cotações Pendentes</p>
                <p className="text-2xl font-light text-white">{pendingQuotes.length}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <FileText className="text-yellow-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Concluídos</p>
                <p className="text-2xl font-light text-white">{completedDeals.length}</p>
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
                <p className="text-gray-400 text-sm">Limite Diário</p>
                <p className="text-2xl font-light text-gold-400">${formatNumber(clientData?.daily_limit_usd || 0)}</p>
              </div>
              <div className="p-3 bg-gold-500/20 rounded-lg">
                <DollarSign className="text-gold-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Quotes Alert */}
      {pendingQuotes.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-yellow-400" size={24} />
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">Tem {pendingQuotes.length} cotação(ões) pendente(s)</p>
                <p className="text-gray-400 text-sm">Verifique as cotações e aceite ou rejeite antes que expirem.</p>
              </div>
              <Button
                onClick={() => setActiveTab('quotes')}
                variant="outline"
                className="border-yellow-500/30 text-yellow-400"
              >
                Ver Cotações
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900/50 border border-gold-800/20">
          <TabsTrigger value="deals" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Meus Deals ({deals.length})
          </TabsTrigger>
          <TabsTrigger value="quotes" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Cotações ({pendingQuotes.length} pendentes)
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gold-400">Carregando...</div>
                </div>
              ) : activeDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Operação</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Quantidade</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Fase</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
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
                            <span className="text-white font-mono">{formatNumber(deal.amount)} {deal.base_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">
                              {deal.total_value ? `$${formatNumber(deal.total_value)}` : '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            {getDealStageBadge(deal.stage)}
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(deal.created_at)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Briefcase className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Deals Ativos</h3>
                  <p className="text-gray-400 mb-4">Crie um pedido de cotação para começar.</p>
                  <Button
                    onClick={() => setShowRFQDialog(true)}
                    className="bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <Plus size={16} className="mr-2" />
                    Novo Pedido de Cotação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="mt-4">
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
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Total</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Expira</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr key={quote.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{quote.deal_number}</span>
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
                            <span className="text-gray-400">{formatDate(quote.expires_at)}</span>
                          </td>
                          <td className="p-4">
                            {getQuoteStatusBadge(quote.status, quote.expires_at)}
                          </td>
                          <td className="p-4 text-right">
                            {quote.status === 'sent' && (!quote.expires_at || new Date(quote.expires_at) > new Date()) && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={() => handleAcceptQuote(quote.id)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-500"
                                >
                                  <CheckCircle size={14} className="mr-1" />
                                  Aceitar
                                </Button>
                                <Button
                                  onClick={() => handleRejectQuote(quote.id)}
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/30 text-red-400 hover:bg-red-900/20"
                                >
                                  <XCircle size={14} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Cotações</h3>
                  <p className="text-gray-400">Cotações recebidas aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {completedDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Operação</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Quantidade</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor Final</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Concluído</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                              {deal.transaction_type === 'buy' ? 'COMPRA' : 'VENDA'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-white font-mono">{formatNumber(deal.amount)} {deal.base_asset}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-mono">${formatNumber(deal.total_value || 0)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(deal.updated_at)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Histórico</h3>
                  <p className="text-gray-400">Deals concluídos aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create RFQ Dialog */}
      <Dialog open={showRFQDialog} onOpenChange={setShowRFQDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Plus size={20} />
              Novo Pedido de Cotação (RFQ)
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Preencha os detalhes da operação que pretende realizar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <Select 
                  value={rfqForm.transaction_type} 
                  onValueChange={(v) => setRfqForm({...rfqForm, transaction_type: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectItem value="buy" className="text-white hover:bg-zinc-700">
                      <span className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-400" /> Comprar
                      </span>
                    </SelectItem>
                    <SelectItem value="sell" className="text-white hover:bg-zinc-700">
                      <span className="flex items-center gap-2">
                        <TrendingDown size={14} className="text-red-400" /> Vender
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ativo</Label>
                <Select 
                  value={rfqForm.base_asset} 
                  onValueChange={(v) => setRfqForm({...rfqForm, base_asset: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectItem value="BTC" className="text-white hover:bg-zinc-700">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH" className="text-white hover:bg-zinc-700">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDT" className="text-white hover:bg-zinc-700">Tether (USDT)</SelectItem>
                    <SelectItem value="USDC" className="text-white hover:bg-zinc-700">USD Coin (USDC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={rfqForm.amount}
                  onChange={(e) => setRfqForm({...rfqForm, amount: e.target.value})}
                  placeholder="1.5"
                  className="bg-zinc-800 border-gold-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda de Pagamento</Label>
                <Select 
                  value={rfqForm.quote_asset} 
                  onValueChange={(v) => setRfqForm({...rfqForm, quote_asset: v})}
                >
                  <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                    <SelectItem value="EUR" className="text-white hover:bg-zinc-700">Euro (EUR)</SelectItem>
                    <SelectItem value="USD" className="text-white hover:bg-zinc-700">Dólar (USD)</SelectItem>
                    <SelectItem value="AED" className="text-white hover:bg-zinc-700">Dirham (AED)</SelectItem>
                    <SelectItem value="BRL" className="text-white hover:bg-zinc-700">Real (BRL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={rfqForm.notes}
                onChange={(e) => setRfqForm({...rfqForm, notes: e.target.value})}
                placeholder="Informações adicionais sobre o pedido..."
                className="bg-zinc-800 border-gold-500/30"
                rows={3}
              />
            </div>
            
            {/* Summary */}
            {rfqForm.amount && (
              <div className="p-4 bg-gold-900/20 rounded-lg border border-gold-500/30">
                <h4 className="text-gold-400 font-medium mb-2">Resumo do Pedido</h4>
                <p className="text-white">
                  {rfqForm.transaction_type === 'buy' ? 'Comprar' : 'Vender'}{' '}
                  <span className="font-mono text-gold-400">{rfqForm.amount} {rfqForm.base_asset}</span>
                  {' '}em {rfqForm.quote_asset}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  A equipa OTC irá enviar uma cotação em breve.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRFQDialog(false)} className="border-zinc-600">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateRFQ} 
              className="bg-gold-500 hover:bg-gold-400 text-black"
              disabled={!rfqForm.amount}
            >
              <Send size={16} className="mr-2" />
              Enviar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientOTCPortal;
