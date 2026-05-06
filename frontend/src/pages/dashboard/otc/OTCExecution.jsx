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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { 
  Zap,
  RefreshCw,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle,
  Eye,
  Building,
  Wallet,
  Send,
  AlertTriangle,
  FileText,
  Play,
  ChevronRight,
  Hash,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCExecution = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Dialogs
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [executionData, setExecutionData] = useState(null);
  
  // Form states
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsTxHash, setFundsTxHash] = useState('');
  const [executedPrice, setExecutedPrice] = useState('');
  const [deliveryTxHash, setDeliveryTxHash] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkingFunds, setCheckingFunds] = useState(false);
  const [autoWatch, setAutoWatch] = useState(true);
  const [approveComment, setApproveComment] = useState('');
  const [sendingDelivery, setSendingDelivery] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  // Auto-poll Fireblocks/Revolut for funds while a pending execution is open
  useEffect(() => {
    if (!autoWatch || !executionData) return;
    if (executionData.status !== 'pending_funds') return;
    const id = setInterval(() => {
      handleCheckFunds(true); // silent
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWatch, executionData?.id, executionData?.status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch deals in acceptance and execution stages
      const [acceptanceRes, executionRes, settlementRes] = await Promise.all([
        axios.get(`${API_URL}/api/otc/deals?stage=acceptance`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/otc/deals?stage=execution`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/otc/deals?stage=settlement`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setDeals([
        ...(acceptanceRes.data.deals || []),
        ...(executionRes.data.deals || []),
        ...(settlementRes.data.deals || [])
      ]);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openExecutionDialog = async (deal) => {
    setSelectedDeal(deal);
    setExecutionData(null);
    setFundsAmount('');
    setFundsTxHash('');
    setExecutedPrice('');
    setDeliveryTxHash('');
    setDeliveryAddress('');
    setShowExecutionDialog(true);
    
    // If deal has execution_id, fetch execution details
    if (deal.execution_id) {
      try {
        const response = await axios.get(`${API_URL}/api/otc/executions/${deal.execution_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExecutionData(response.data);
      } catch (err) {
        console.error('Failed to fetch execution:', err);
      }
    }
  };

  const handleStartExecution = async () => {
    if (!selectedDeal) return;
    
    try {
      const response = await axios.post(
        `${API_URL}/api/otc/deals/${selectedDeal.id}/start-execution`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Execução iniciada!');
      setExecutionData(response.data.execution);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao iniciar execução');
    }
  };

  const handleConfirmFunds = async () => {
    if (!executionData || !fundsAmount) return;
    
    try {
      await axios.post(
        `${API_URL}/api/otc/executions/${executionData.id}/confirm-funds`,
        null,
        { 
          params: { amount: parseFloat(fundsAmount), tx_hash: fundsTxHash || null },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      toast.success('Fundos confirmados!');
      // Refresh execution data
      const response = await axios.get(`${API_URL}/api/otc/executions/${executionData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExecutionData(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar fundos');
    }
  };

  const handleCompleteExecution = async () => {
    if (!executionData || !executedPrice) return;
    
    try {
      await axios.post(
        `${API_URL}/api/otc/executions/${executionData.id}/complete`,
        null,
        { 
          params: { 
            executed_price: parseFloat(executedPrice),
            delivery_tx_hash: deliveryTxHash || null,
            delivery_address: deliveryAddress || null
          },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      toast.success('Execução concluída! Deal movido para liquidação.');
      setShowExecutionDialog(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao completar execução');
    }
  };

  const refreshExecution = async (id) => {
    try {
      const res = await axios.get(`${API_URL}/api/otc/executions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExecutionData(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to refresh execution', err);
    }
  };

  const handleSetFundingMode = async (mode) => {
    if (!executionData) return;
    try {
      await axios.post(
        `${API_URL}/api/otc/executions/${executionData.id}/set-funding-mode`,
        null,
        { params: { funding_type: mode }, headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(mode === 'prefunded' ? 'Modo definido: Pre-funded' : 'Modo definido: Post-funded');
      await refreshExecution(executionData.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao definir modo de funding');
    }
  };

  const handleCheckFunds = async (silent = false) => {
    if (!executionData) return;
    setCheckingFunds(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/otc/executions/${executionData.id}/check-funds`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { detected, expected, expected_asset, source, funds_ok, auto_advanced } = res.data;
      if (!silent) {
        if (funds_ok) toast.success(`Fundos detectados: ${detected} ${expected_asset} via ${source}`);
        else toast.info(`Detectado ${detected || 0} / esperado ${expected} ${expected_asset} (${source})`);
      } else if (auto_advanced) {
        toast.success(`Fundos detectados automaticamente! ${detected} ${expected_asset}`);
      }
      await refreshExecution(executionData.id);
    } catch (err) {
      if (!silent) toast.error(err.response?.data?.detail || 'Erro na verificação de fundos');
    } finally {
      setCheckingFunds(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!executionData || !executedPrice) return;
    try {
      await axios.post(
        `${API_URL}/api/otc/executions/${executionData.id}/execute-trade`,
        null,
        {
          params: { executed_price: parseFloat(executedPrice) },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Trade executado. Aguardando aprovação para entrega.');
      await refreshExecution(executionData.id);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao executar trade');
    }
  };

  const handleApproveDelivery = async () => {
    if (!executionData) return;
    try {
      const res = await axios.post(
        `${API_URL}/api/otc/executions/${executionData.id}/approve-delivery`,
        null,
        {
          params: { comment: approveComment || null },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const { approvals_count, approvals_required, fully_approved } = res.data;
      toast.success(`Aprovação registada (${approvals_count}/${approvals_required})${fully_approved ? ' — pronto para envio' : ''}`);
      setApproveComment('');
      await refreshExecution(executionData.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar entrega');
    }
  };

  const handleSendDelivery = async () => {
    if (!executionData) return;
    setSendingDelivery(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/otc/executions/${executionData.id}/send-delivery`,
        null,
        {
          params: { delivery_address: deliveryAddress || null, fee_level: 'MEDIUM' },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(`Entrega enviada via ${res.data.venue}. TX: ${res.data.tx_hash || 'manual'}`);
      setShowExecutionDialog(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar entrega');
    } finally {
      setSendingDelivery(false);
    }
  };
  const getExecutionStatusBadge = (status) => {
    const styles = {
      pending_funds: 'bg-yellow-900/30 text-yellow-400',
      funds_received: 'bg-blue-900/30 text-blue-400',
      executing: 'bg-purple-900/30 text-purple-400',
      executed: 'bg-green-900/30 text-green-400',
      failed: 'bg-red-900/30 text-red-400'
    };
    const labels = {
      pending_funds: 'Aguardando Fundos',
      funds_received: 'Fundos Recebidos',
      executing: 'Executando',
      executed: 'Executado',
      failed: 'Falhou'
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const getStageBadge = (stage) => {
    const styles = {
      acceptance: 'bg-gold-900/30 text-gold-400',
      execution: 'bg-orange-900/30 text-orange-400',
      settlement: 'bg-green-900/30 text-green-400'
    };
    const labels = {
      acceptance: 'Aceito',
      execution: 'Em Execução',
      settlement: 'Liquidação'
    };
    return <Badge className={styles[stage]}>{labels[stage] || stage}</Badge>;
  };

  const pendingDeals = deals.filter(d => d.stage === 'acceptance');
  const executingDeals = deals.filter(d => d.stage === 'execution');
  const completedDeals = deals.filter(d => d.stage === 'settlement');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Zap className="text-gold-400" />
            Execução OTC
          </h1>
          <p className="text-gray-400 mt-1">Gestão de execuções de operações OTC</p>
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
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pendentes Execução</p>
                <p className="text-2xl font-light text-white">{pendingDeals.length}</p>
              </div>
              <div className="p-3 bg-gold-500/20 rounded-lg">
                <Clock className="text-gold-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Em Execução</p>
                <p className="text-2xl font-light text-white">{executingDeals.length}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Zap className="text-orange-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Em Liquidação</p>
                <p className="text-2xl font-light text-white">{completedDeals.length}</p>
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
            Pendentes ({pendingDeals.length})
          </TabsTrigger>
          <TabsTrigger value="executing" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Em Execução ({executingDeals.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Liquidação ({completedDeals.length})
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
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Aceito Em</th>
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
                            <span className="text-gray-400">{formatDate(deal.accepted_at)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => openExecutionDialog(deal)}
                              className="bg-gold-500 hover:bg-gold-400 text-black"
                              size="sm"
                            >
                              <Play size={14} className="mr-1" />
                              Iniciar Execução
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Clock className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Deals Pendentes</h3>
                  <p className="text-gray-400">Deals aceitos aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executing Tab */}
        <TabsContent value="executing" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {executingDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Operação</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Iniciado</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executingDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{deal.client_name}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
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
                            <span className="text-gray-400">{formatDate(deal.executed_at)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => openExecutionDialog(deal)}
                              className="bg-orange-500 hover:bg-orange-400 text-black"
                              size="sm"
                            >
                              <Eye size={14} className="mr-1" />
                              Gerenciar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Zap className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Nenhuma Execução em Andamento</h3>
                  <p className="text-gray-400">Inicie uma execução a partir dos deals pendentes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {completedDeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Operação</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Liquidado</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedDeals.map((deal) => (
                        <tr key={deal.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{deal.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{deal.client_name}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Badge className={deal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
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
                          <td className="p-4">
                            {getStageBadge(deal.stage)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Nenhum Deal em Liquidação</h3>
                  <p className="text-gray-400">Deals finalizados aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Dialog */}
      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Zap size={20} />
              {selectedDeal?.stage === 'acceptance' ? t('tier23Modals.otcExec.start') : t('tier23Modals.otcExec.manage')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedDeal && `Deal ${selectedDeal.deal_number} - ${selectedDeal.client_name}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-6 py-4">
              {/* Deal Summary */}
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Tipo</p>
                    <Badge className={selectedDeal.transaction_type === 'buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}>
                      {selectedDeal.transaction_type === 'buy' ? (
                        <><TrendingUp size={12} className="mr-1" /> COMPRA</>
                      ) : (
                        <><TrendingDown size={12} className="mr-1" /> VENDA</>
                      )}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Quantidade</p>
                    <p className="text-white font-mono">{formatNumber(selectedDeal.amount)} {selectedDeal.base_asset}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Preço</p>
                    <p className="text-white font-mono">${formatNumber(selectedDeal.final_price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase mb-1">Valor Total</p>
                    <p className="text-gold-400 font-mono">${formatNumber(selectedDeal.total_value || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Stage: Acceptance - Start Execution */}
              {selectedDeal.stage === 'acceptance' && !executionData && (
                <div className="p-4 bg-gold-900/20 rounded-lg border border-gold-500/30">
                  <h4 className="text-gold-400 font-medium mb-2">Pronto para Executar</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    Clique abaixo para iniciar o processo de execução. O sistema irá criar um registro de execução e aguardar a confirmação dos fundos.
                  </p>
                  <Button
                    onClick={handleStartExecution}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <Play size={16} className="mr-2" />
                    Iniciar Execução
                  </Button>
                </div>
              )}

              {/* Execution in Progress */}
              {executionData && (
                <>
                  {/* Execution Status */}
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium">Status da Execução</h4>
                      {getExecutionStatusBadge(executionData.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Fundos Esperados</p>
                        <p className="text-white font-mono">
                          {formatNumber(executionData.funds_expected)} {executionData.funds_expected_asset}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">A Entregar</p>
                        <p className="text-gold-400 font-mono">
                          {formatNumber(executionData.delivery_amount)} {executionData.delivery_asset}
                        </p>
                      </div>
                      {executionData.funds_received > 0 && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase mb-1">Fundos Recebidos</p>
                          <p className="text-green-400 font-mono">
                            {formatNumber(executionData.funds_received)} {executionData.funds_expected_asset}
                          </p>
                        </div>
                      )}
                      {executionData.funds_tx_hash && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase mb-1">TX Hash (Fundos)</p>
                          <p className="text-white font-mono text-xs truncate">{executionData.funds_tx_hash}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Funding Mode selector — visible until trader confirms */}
                  {!executionData.funding_type_confirmed && (
                    <div className="p-4 bg-blue-900/15 rounded-lg border border-blue-500/30">
                      <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                        <Wallet size={18} /> Modo de Funding
                      </h4>
                      <p className="text-gray-400 text-xs mb-3">
                        {executionData.funding_type_suggested
                          ? `Sugerido pelo cliente: ${executionData.funding_type_suggested}`
                          : 'Confirme o fluxo de fundos antes de continuar:'}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleSetFundingMode('prefunded')}
                          variant={executionData.funding_type === 'prefunded' ? 'default' : 'outline'}
                          className={executionData.funding_type === 'prefunded' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/20'}
                          data-testid="funding-mode-prefunded"
                        >
                          Pre-funded
                          <span className="block text-xs opacity-70">Cliente já enviou os fundos</span>
                        </Button>
                        <Button
                          onClick={() => handleSetFundingMode('post_funded')}
                          variant={executionData.funding_type === 'post_funded' ? 'default' : 'outline'}
                          className={executionData.funding_type === 'post_funded' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'border-purple-500/40 text-purple-300 hover:bg-purple-900/20'}
                          data-testid="funding-mode-post"
                        >
                          Post-funded
                          <span className="block text-xs opacity-70">Cliente envia, depois entregamos</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 1: Funds detection (auto + manual fallback) */}
                  {executionData.funding_type_confirmed && executionData.status === 'pending_funds' && (
                    <div className="p-4 bg-yellow-900/15 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-yellow-300 font-medium flex items-center gap-2">
                          <Wallet size={18} />
                          Passo 1: Receção de Fundos ({executionData.funding_type === 'prefunded' ? 'Pre-funded' : 'Post-funded'})
                        </h4>
                        <label className="text-xs text-gray-400 flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={autoWatch} onChange={e => setAutoWatch(e.target.checked)} data-testid="auto-watch-toggle" />
                          Auto-watch (30s)
                        </label>
                      </div>
                      <div className="bg-zinc-900/60 rounded-md p-3 mb-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Esperado</p>
                          <p className="text-white font-mono">{formatNumber(executionData.funds_expected)} {executionData.funds_expected_asset}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Detectado</p>
                          <p className={(executionData.detected_balance || 0) >= (executionData.funds_expected || 0) && executionData.detected_balance > 0 ? 'text-emerald-400 font-mono' : 'text-zinc-300 font-mono'}>
                            {formatNumber(executionData.detected_balance || 0)} {executionData.funds_expected_asset}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Fonte</p>
                          <p className="text-zinc-300 text-xs">{executionData.detected_source || '—'}</p>
                          {executionData.last_balance_check_at && (
                            <p className="text-zinc-500 text-xs truncate">{formatDate(executionData.last_balance_check_at)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <Button
                          onClick={() => handleCheckFunds(false)}
                          disabled={checkingFunds}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black"
                          data-testid="btn-check-funds"
                        >
                          <RefreshCw size={14} className={`mr-2 ${checkingFunds ? 'animate-spin' : ''}`} />
                          Verificar Agora ({executionData.funds_expected_asset && ['BTC','ETH','USDT','USDC','BNB','SOL','XRP','ADA','MATIC'].includes(executionData.funds_expected_asset.toUpperCase()) ? 'Cofre' : 'Banco/EMI'})
                        </Button>
                      </div>
                      <details className="text-xs">
                        <summary className="text-gray-400 cursor-pointer">Confirmar manualmente</summary>
                        <div className="space-y-2 pt-3">
                          <Input
                            type="number" step="any"
                            value={fundsAmount}
                            onChange={(e) => setFundsAmount(e.target.value)}
                            placeholder={String(executionData.funds_expected)}
                            className="bg-zinc-800 border-gold-500/30"
                          />
                          <Input
                            value={fundsTxHash}
                            onChange={(e) => setFundsTxHash(e.target.value)}
                            placeholder="TX hash / referência bancária (opcional)"
                            className="bg-zinc-800 border-gold-500/30"
                          />
                          <Button
                            onClick={handleConfirmFunds}
                            disabled={!fundsAmount}
                            variant="outline"
                            size="sm"
                            className="w-full border-yellow-500/40 text-yellow-300"
                          >
                            Confirmar Manualmente
                          </Button>
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Step 2: Execute Trade (no money moved) */}
                  {executionData.status === 'funds_received' && (
                    <div className="p-4 bg-blue-900/15 rounded-lg border border-blue-500/30">
                      <h4 className="text-blue-300 font-medium mb-3 flex items-center gap-2">
                        <Zap size={18} /> Passo 2: Executar Trade
                      </h4>
                      <p className="text-gray-400 text-xs mb-3">
                        Marca o trade como executado. <strong>Os fundos só são enviados ao cliente após aprovação no Passo 3.</strong>
                      </p>
                      <div className="space-y-2">
                        <Label>Preço de Execução ({selectedDeal.quote_asset})</Label>
                        <Input
                          type="number" step="any"
                          value={executedPrice}
                          onChange={(e) => setExecutedPrice(e.target.value)}
                          placeholder={String(selectedDeal.final_price || 0)}
                          className="bg-zinc-800 border-gold-500/30"
                        />
                        <Button
                          onClick={handleExecuteTrade}
                          disabled={!executedPrice}
                          className="w-full bg-blue-500 hover:bg-blue-400 text-white"
                          data-testid="btn-execute-trade"
                        >
                          <Zap size={16} className="mr-2" /> Executar Trade
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Approve & Send Delivery (multi-sign) */}
                  {executionData.status === 'executing' && (
                    <div className="p-4 bg-emerald-900/15 rounded-lg border border-emerald-500/30">
                      <h4 className="text-emerald-300 font-medium mb-3 flex items-center gap-2">
                        <Send size={18} /> Passo 3: Aprovar e Enviar Entrega
                      </h4>
                      <div className="bg-zinc-900/60 rounded-md p-3 mb-3 text-sm">
                        <p className="text-gray-500 text-xs mb-1">Aprovações:</p>
                        {(executionData.delivery_approvals || []).length === 0 ? (
                          <p className="text-zinc-400 italic text-xs">Nenhuma ainda</p>
                        ) : (
                          <ul className="space-y-1">
                            {executionData.delivery_approvals.map((a, i) => (
                              <li key={i} className="text-emerald-300 text-xs flex items-center gap-2">
                                <CheckCircle size={12} />
                                <span>{a.user_name} ({a.role}) — {formatDate(a.approved_at)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {!executionData.delivery_approved_at && (
                        <div className="space-y-2 mb-3">
                          <Input
                            value={approveComment}
                            onChange={e => setApproveComment(e.target.value)}
                            placeholder="Comentário de aprovação (opcional)"
                            className="bg-zinc-800 border-gold-500/30"
                          />
                          <Button
                            onClick={handleApproveDelivery}
                            variant="outline"
                            className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/20"
                            data-testid="btn-approve-delivery"
                          >
                            <CheckCircle size={14} className="mr-2" /> Aprovar Entrega
                          </Button>
                        </div>
                      )}
                      {executionData.delivery_approved_at && (
                        <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                          <Label>Endereço/IBAN de Entrega</Label>
                          <Input
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder={['BTC','ETH','USDT','USDC'].includes((executionData.delivery_asset || '').toUpperCase()) ? 'bc1q... / 0x...' : 'IBAN'}
                            className="bg-zinc-800 border-gold-500/30"
                          />
                          <Button
                            onClick={handleSendDelivery}
                            disabled={sendingDelivery}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black"
                            data-testid="btn-send-delivery"
                          >
                            <Send size={16} className={`mr-2 ${sendingDelivery ? 'animate-pulse' : ''}`} />
                            {sendingDelivery ? 'A enviar...' : 'Enviar Agora (Cofre / EMI)'}
                          </Button>
                          <p className="text-xs text-gray-500 italic">
                            Crypto via cofre institucional · Fiat via EMI integrado
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Completed */}
                  {executionData.status === 'executed' && (
                    <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle size={20} />
                        <span className="font-medium">Execução Concluída</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        O deal foi movido para a fase de liquidação.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecutionDialog(false)} className="border-zinc-600">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCExecution;
