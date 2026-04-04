import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber, formatDate} from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Textarea } from '../../../components/ui/textarea';
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
  RefreshCw,
  Clock,
  CheckCircle,
  Building,
  Send,
  DollarSign,
  Plus,
  Eye,
  Printer,
  TrendingUp,
  TrendingDown,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCInvoices = () => {
  const { token } = useAuth();
  const [deals, setDeals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Form states
  const [notes, setNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch deals in invoice stage
      const dealsRes = await axios.get(`${API_URL}/api/otc/deals?stage=invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(dealsRes.data.deals || []);
      
      // Fetch all invoices
      const invoicesRes = await axios.get(`${API_URL}/api/otc/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedDeal) return;
    
    try {
      const params = new URLSearchParams({ deal_id: selectedDeal.id });
      if (notes) params.append('notes', notes);
      
      const response = await axios.post(
        `${API_URL}/api/otc/invoices?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Fatura ${response.data.invoice.invoice_number} criada!`);
      setShowCreateDialog(false);
      setNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar fatura');
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await axios.post(
        `${API_URL}/api/otc/invoices/${invoiceId}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Fatura marcada como enviada!');
      fetchData();
      if (selectedInvoice?.id === invoiceId) {
        // Refresh selected invoice
        const response = await axios.get(`${API_URL}/api/otc/invoices/${invoiceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedInvoice(response.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar fatura');
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      const params = new URLSearchParams();
      if (paymentReference) params.append('payment_reference', paymentReference);
      
      await axios.post(
        `${API_URL}/api/otc/invoices/${invoiceId}/mark-paid?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Fatura paga! Deal concluído.');
      setShowDetailDialog(false);
      setPaymentReference('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao marcar como paga');
    }
  };

  const openDetailDialog = async (invoice) => {
    try {
      const response = await axios.get(`${API_URL}/api/otc/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedInvoice(response.data);
      setShowDetailDialog(true);
    } catch (err) {
      toast.error('Erro ao carregar detalhes da fatura');
    }
  };
  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-900/30 text-gray-400',
      sent: 'bg-blue-900/30 text-blue-400',
      paid: 'bg-green-900/30 text-green-400',
      cancelled: 'bg-red-900/30 text-red-400'
    };
    const labels = {
      draft: 'Rascunho',
      sent: 'Enviada',
      paid: 'Paga',
      cancelled: 'Cancelada'
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const pendingDeals = deals.filter(d => d.stage === 'invoice' && !d.invoice_id);
  const draftInvoices = invoices.filter(i => i.status === 'draft');
  const sentInvoices = invoices.filter(i => i.status === 'sent');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <FileText className="text-gold-400" />
            Faturas OTC
          </h1>
          <p className="text-gray-400 mt-1">Gestão de faturas de operações OTC</p>
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
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Por Faturar</p>
                <p className="text-2xl font-light text-white">{pendingDeals.length}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="text-yellow-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rascunhos</p>
                <p className="text-2xl font-light text-white">{draftInvoices.length}</p>
              </div>
              <div className="p-3 bg-gray-500/20 rounded-lg">
                <FileText className="text-gray-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Enviadas</p>
                <p className="text-2xl font-light text-white">{sentInvoices.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Send className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pagas</p>
                <p className="text-2xl font-light text-white">{paidInvoices.length}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900/50 border border-gold-800/20">
          <TabsTrigger value="pending" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Por Faturar ({pendingDeals.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Rascunhos ({draftInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Enviadas ({sentInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Pagas ({paidInvoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
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
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Operação</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor Total</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Liquidado</th>
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
                            <div className="flex items-center gap-2">
                              <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                                {deal.transaction_type === 'buy' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                {deal.transaction_type === 'buy' ? 'COMPRA' : 'VENDA'}
                              </Badge>
                              <span className="text-gray-400">
                                {formatNumber(deal.amount)} {deal.base_asset}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">${formatNumber(deal.total_value || 0)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(deal.settled_at)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => {
                                setSelectedDeal(deal);
                                setShowCreateDialog(true);
                              }}
                              className="bg-gold-500 hover:bg-gold-400 text-black"
                              size="sm"
                            >
                              <Plus size={14} className="mr-1" />
                              Criar Fatura
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
                  <h3 className="text-xl text-white mb-2">Sem Deals para Faturar</h3>
                  <p className="text-gray-400">Deals liquidados aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Draft Tab */}
        <TabsContent value="draft" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {draftInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Fatura</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Descrição</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Total</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Criada</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{invoice.invoice_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{invoice.client_name}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">
                              {formatNumber(invoice.amount)} {invoice.base_asset} @ ${formatNumber(invoice.price)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">${formatNumber(invoice.total)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(invoice.created_at)}</span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              onClick={() => openDetailDialog(invoice)}
                              size="sm"
                              variant="outline"
                              className="border-gold-500/30 text-gold-400"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              onClick={() => handleSendInvoice(invoice.id)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-500"
                            >
                              <Send size={14} className="mr-1" />
                              Enviar
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
                  <h3 className="text-xl text-white mb-2">Sem Rascunhos</h3>
                  <p className="text-gray-400">Faturas em rascunho aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Tab */}
        <TabsContent value="sent" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {sentInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Fatura</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Total</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Enviada</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{invoice.invoice_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{invoice.client_name}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">${formatNumber(invoice.total)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(invoice.sent_at)}</span>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              onClick={() => openDetailDialog(invoice)}
                              size="sm"
                              variant="outline"
                              className="border-gold-500/30 text-gold-400"
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowDetailDialog(true);
                              }}
                              size="sm"
                              className="bg-green-600 hover:bg-green-500"
                            >
                              <DollarSign size={14} className="mr-1" />
                              Paga
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
                  <h3 className="text-xl text-white mb-2">Sem Faturas Enviadas</h3>
                  <p className="text-gray-400">Faturas enviadas aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paid Tab */}
        <TabsContent value="paid" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {paidInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Fatura</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Total</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Paga Em</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Referência</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{invoice.invoice_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{invoice.client_name}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-green-400 font-mono">${formatNumber(invoice.total)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(invoice.paid_at)}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400 font-mono text-sm">{invoice.payment_reference || '-'}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => openDetailDialog(invoice)}
                              size="sm"
                              variant="outline"
                              className="border-gold-500/30 text-gold-400"
                            >
                              <Eye size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Faturas Pagas</h3>
                  <p className="text-gray-400">Faturas pagas aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Plus size={20} />
              Criar Fatura
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedDeal && `Deal ${selectedDeal.deal_number} - ${selectedDeal.client_name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-4 py-4">
              {/* Deal Summary */}
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Cliente</p>
                    <p className="text-white">{selectedDeal.client_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Operação</p>
                    <p className="text-white">{formatNumber(selectedDeal.amount)} {selectedDeal.base_asset}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Preço</p>
                    <p className="text-white font-mono">${formatNumber(selectedDeal.final_price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Subtotal</p>
                    <p className="text-white font-mono">${formatNumber(selectedDeal.total_value || 0)}</p>
                  </div>
                  {selectedDeal.fees > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase mb-1">Taxas</p>
                      <p className="text-white font-mono">${formatNumber(selectedDeal.fees)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Total</p>
                    <p className="text-gold-400 font-mono text-lg">
                      ${formatNumber((selectedDeal.total_value || 0) + (selectedDeal.fees || 0))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações para a fatura..."
                  className="bg-zinc-800 border-gold-500/30 min-h-[100px]"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-zinc-600">
              Cancelar
            </Button>
            <Button onClick={handleCreateInvoice} className="bg-gold-500 hover:bg-gold-400 text-black">
              <FileText size={16} className="mr-2" />
              Criar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <FileText size={20} />
              Fatura {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedInvoice.invoice_number}</h2>
                  <p className="text-gray-400">Emitida em {formatDate(selectedInvoice.created_at)}</p>
                </div>
                <div>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>
              
              {/* Client Info */}
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="text-gray-400 text-sm uppercase mb-2">Faturado a:</h4>
                <p className="text-white text-lg">{selectedInvoice.client_name}</p>
                {selectedInvoice.client_address && (
                  <p className="text-gray-400 text-sm">{selectedInvoice.client_address}</p>
                )}
              </div>
              
              {/* Line Items */}
              <div className="border border-gold-800/20 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left p-3 text-gray-400 text-sm">Descrição</th>
                      <th className="text-right p-3 text-gray-400 text-sm">Qtd</th>
                      <th className="text-right p-3 text-gray-400 text-sm">Preço</th>
                      <th className="text-right p-3 text-gray-400 text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gold-800/20">
                      <td className="p-3 text-white">
                        {selectedInvoice.base_asset} ({selectedInvoice.quote_asset})
                      </td>
                      <td className="p-3 text-right text-white font-mono">
                        {formatNumber(selectedInvoice.amount)}
                      </td>
                      <td className="p-3 text-right text-white font-mono">
                        ${formatNumber(selectedInvoice.price)}
                      </td>
                      <td className="p-3 text-right text-white font-mono">
                        ${formatNumber(selectedInvoice.subtotal)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-zinc-800/30">
                    <tr className="border-t border-gold-800/20">
                      <td colSpan={3} className="p-3 text-right text-gray-400">Subtotal</td>
                      <td className="p-3 text-right text-white font-mono">${formatNumber(selectedInvoice.subtotal)}</td>
                    </tr>
                    {selectedInvoice.fees > 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-right text-gray-400">Taxas</td>
                        <td className="p-3 text-right text-white font-mono">${formatNumber(selectedInvoice.fees)}</td>
                      </tr>
                    )}
                    <tr className="border-t border-gold-800/20">
                      <td colSpan={3} className="p-3 text-right text-white font-bold">Total</td>
                      <td className="p-3 text-right text-gold-400 font-mono text-lg font-bold">
                        ${formatNumber(selectedInvoice.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="p-4 bg-zinc-800/30 rounded-lg">
                  <h4 className="text-gray-400 text-sm uppercase mb-2">Notas:</h4>
                  <p className="text-gray-300">{selectedInvoice.notes}</p>
                </div>
              )}
              
              {/* Actions based on status */}
              {selectedInvoice.status === 'draft' && (
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleSendInvoice(selectedInvoice.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    <Send size={16} className="mr-2" />
                    Marcar como Enviada
                  </Button>
                </div>
              )}
              
              {selectedInvoice.status === 'sent' && (
                <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                  <h4 className="text-green-400 font-medium mb-3">Marcar como Paga</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Referência de Pagamento (opcional)</Label>
                      <Input
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="TRF-123456..."
                        className="bg-zinc-800 border-gold-500/30"
                      />
                    </div>
                    <Button
                      onClick={() => handleMarkPaid(selectedInvoice.id)}
                      className="w-full bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Confirmar Pagamento
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedInvoice.status === 'paid' && (
                <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle size={20} />
                    <span className="font-medium">Fatura Paga</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    Paga em {formatDate(selectedInvoice.paid_at)}
                    {selectedInvoice.payment_reference && (
                      <> | Ref: {selectedInvoice.payment_reference}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="border-zinc-600">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCInvoices;
