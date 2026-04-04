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
  Wallet,
  RefreshCw,
  Clock,
  CheckCircle,
  Building,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Banknote,
  Bitcoin,
  Hash,
  Eye,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCSettlement = () => {
  const { token } = useAuth();
  const [deals, setDeals] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Dialogs
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  
  // Form states
  const [settlementMethod, setSettlementMethod] = useState('sepa');
  const [fiatAmount, setFiatAmount] = useState('');
  const [fiatCurrency, setFiatCurrency] = useState('EUR');
  const [bankReference, setBankReference] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoAsset, setCryptoAsset] = useState('');
  const [txHash, setTxHash] = useState('');
  const [network, setNetwork] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch deals in settlement stage
      const dealsRes = await axios.get(`${API_URL}/api/otc/deals?stage=settlement`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(dealsRes.data.deals || []);
      
      // Fetch all settlements
      const settlementsRes = await axios.get(`${API_URL}/api/otc/settlements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettlements(settlementsRes.data.settlements || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openSettlementDialog = async (deal) => {
    setSelectedDeal(deal);
    setSettlementData(null);
    setSettlementMethod('sepa');
    setFiatAmount('');
    setBankReference('');
    setCryptoAmount('');
    setTxHash('');
    setShowSettlementDialog(true);
    
    // Check if settlement exists
    if (deal.settlement_id) {
      try {
        const response = await axios.get(`${API_URL}/api/otc/settlements/${deal.settlement_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettlementData(response.data);
      } catch (err) {
        console.error('Failed to fetch settlement:', err);
      }
    }
  };

  const handleCreateSettlement = async () => {
    if (!selectedDeal) return;
    
    try {
      const params = new URLSearchParams({
        deal_id: selectedDeal.id,
        method: settlementMethod
      });
      
      if (settlementMethod.includes('onchain')) {
        params.append('crypto_amount', cryptoAmount);
        params.append('crypto_asset', cryptoAsset || selectedDeal.base_asset);
      } else {
        params.append('fiat_amount', fiatAmount || selectedDeal.total_value);
        params.append('fiat_currency', fiatCurrency || selectedDeal.quote_asset);
      }
      
      const response = await axios.post(
        `${API_URL}/api/otc/settlements?${params.toString()}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Liquidação criada!');
      setSettlementData(response.data.settlement);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar liquidação');
    }
  };

  const handleConfirmFiat = async () => {
    if (!settlementData || !bankReference) return;
    
    try {
      await axios.post(
        `${API_URL}/api/otc/settlements/${settlementData.id}/confirm-fiat`,
        null,
        { 
          params: { bank_reference: bankReference, amount: parseFloat(fiatAmount) || settlementData.fiat_amount },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      toast.success('Liquidação fiat confirmada!');
      // Refresh settlement data
      const response = await axios.get(`${API_URL}/api/otc/settlements/${settlementData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettlementData(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar');
    }
  };

  const handleConfirmCrypto = async () => {
    if (!settlementData || !txHash) return;
    
    try {
      await axios.post(
        `${API_URL}/api/otc/settlements/${settlementData.id}/confirm-crypto`,
        null,
        { 
          params: { 
            tx_hash: txHash, 
            amount: parseFloat(cryptoAmount) || settlementData.crypto_amount,
            network: network || null
          },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      toast.success('Liquidação crypto confirmada!');
      const response = await axios.get(`${API_URL}/api/otc/settlements/${settlementData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettlementData(response.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao confirmar');
    }
  };

  const handleCompleteSettlement = async () => {
    if (!settlementData) return;
    
    try {
      await axios.post(
        `${API_URL}/api/otc/settlements/${settlementData.id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Liquidação completa! Deal movido para faturação.');
      setShowSettlementDialog(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao completar');
    }
  };
  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-900/30 text-yellow-400',
      in_progress: 'bg-blue-900/30 text-blue-400',
      completed: 'bg-green-900/30 text-green-400',
      failed: 'bg-red-900/30 text-red-400'
    };
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em Progresso',
      completed: 'Completa',
      failed: 'Falhou'
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const getMethodBadge = (method) => {
    const isCrypto = method?.includes('onchain');
    return (
      <Badge className={isCrypto ? 'bg-orange-900/30 text-orange-400' : 'bg-blue-900/30 text-blue-400'}>
        {isCrypto ? <Bitcoin size={12} className="mr-1" /> : <Banknote size={12} className="mr-1" />}
        {method?.toUpperCase().replace('_', ' ')}
      </Badge>
    );
  };

  const pendingDeals = deals.filter(d => d.stage === 'settlement' && !d.settlement_id);
  const inProgressSettlements = settlements.filter(s => s.status === 'pending' || s.status === 'in_progress');
  const completedSettlements = settlements.filter(s => s.status === 'completed');

  const settlementMethods = [
    { value: 'sepa', label: 'SEPA', type: 'fiat' },
    { value: 'swift', label: 'SWIFT', type: 'fiat' },
    { value: 'pix', label: 'PIX', type: 'fiat' },
    { value: 'faster_payments', label: 'Faster Payments', type: 'fiat' },
    { value: 'usdt_onchain', label: 'USDT On-Chain', type: 'crypto' },
    { value: 'usdc_onchain', label: 'USDC On-Chain', type: 'crypto' },
    { value: 'crypto_onchain', label: 'Crypto On-Chain', type: 'crypto' },
    { value: 'internal', label: 'Interno', type: 'internal' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Wallet className="text-gold-400" />
            Liquidação OTC
          </h1>
          <p className="text-gray-400 mt-1">Gestão de liquidações de operações OTC</p>
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
                <p className="text-gray-400 text-sm">Pendentes</p>
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
                <p className="text-gray-400 text-sm">Em Progresso</p>
                <p className="text-2xl font-light text-white">{inProgressSettlements.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Wallet className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Completas</p>
                <p className="text-2xl font-light text-white">{completedSettlements.length}</p>
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
          <TabsTrigger value="progress" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Em Progresso ({inProgressSettlements.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Completas ({completedSettlements.length})
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
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Executado</th>
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
                            <span className="text-gray-400">{formatDate(deal.executed_at)}</span>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => openSettlementDialog(deal)}
                              className="bg-gold-500 hover:bg-gold-400 text-black"
                              size="sm"
                            >
                              <Play size={14} className="mr-1" />
                              Liquidar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Liquidações Pendentes</h3>
                  <p className="text-gray-400">Deals executados aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* In Progress Tab */}
        <TabsContent value="progress" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {inProgressSettlements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Método</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                        <th className="text-right p-4 text-gray-400 text-sm font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inProgressSettlements.map((settlement) => (
                        <tr key={settlement.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{settlement.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{settlement.client_name}</span>
                          </td>
                          <td className="p-4">
                            {getMethodBadge(settlement.method)}
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">
                              {settlement.fiat_amount ? `${formatNumber(settlement.fiat_amount)} ${settlement.fiat_currency}` : 
                               settlement.crypto_amount ? `${formatNumber(settlement.crypto_amount)} ${settlement.crypto_asset}` : '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(settlement.status)}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              onClick={() => {
                                setSelectedDeal({ id: settlement.deal_id, ...settlement });
                                setSettlementData(settlement);
                                setShowSettlementDialog(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-gold-500/30 text-gold-400"
                            >
                              <Eye size={14} className="mr-1" />
                              Gerir
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Liquidações em Progresso</h3>
                  <p className="text-gray-400">Inicie uma liquidação a partir dos deals pendentes.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-0">
              {completedSettlements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gold-800/20">
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Deal</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Método</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Valor</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Confirmado</th>
                        <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSettlements.map((settlement) => (
                        <tr key={settlement.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">{settlement.deal_number}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-white">{settlement.client_name}</span>
                          </td>
                          <td className="p-4">
                            {getMethodBadge(settlement.method)}
                          </td>
                          <td className="p-4">
                            <span className="text-gold-400 font-mono">
                              {settlement.fiat_amount ? `${formatNumber(settlement.fiat_amount)} ${settlement.fiat_currency}` : 
                               settlement.crypto_amount ? `${formatNumber(settlement.crypto_amount)} ${settlement.crypto_asset}` : '-'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-gray-400">{formatDate(settlement.confirmed_at)}</span>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(settlement.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto mb-4 text-gray-500" size={48} />
                  <h3 className="text-xl text-white mb-2">Sem Liquidações Completas</h3>
                  <p className="text-gray-400">Liquidações finalizadas aparecerão aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settlement Dialog */}
      <Dialog open={showSettlementDialog} onOpenChange={setShowSettlementDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Wallet size={20} />
              {settlementData ? 'Gerir Liquidação' : 'Iniciar Liquidação'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedDeal && `Deal ${selectedDeal.deal_number}`}
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
                      {selectedDeal.transaction_type === 'buy' ? 'COMPRA' : 'VENDA'}
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

              {/* Create Settlement */}
              {!settlementData && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Método de Liquidação</Label>
                    <Select value={settlementMethod} onValueChange={setSettlementMethod}>
                      <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                        {settlementMethods.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-white hover:bg-zinc-700">
                            {m.type === 'crypto' ? '🔸 ' : m.type === 'fiat' ? '💵 ' : '🏠 '}
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {!settlementMethod.includes('onchain') && settlementMethod !== 'internal' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor Fiat</Label>
                        <Input
                          type="number" step="any"
                          step="0.01"
                          value={fiatAmount}
                          onChange={(e) => setFiatAmount(e.target.value)}
                          placeholder={String(selectedDeal.total_value || 0)}
                          className="bg-zinc-800 border-gold-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Moeda</Label>
                        <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
                          <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-gold-500/30 text-white">
                            <SelectItem value="EUR" className="text-white hover:bg-zinc-700">EUR</SelectItem>
                            <SelectItem value="USD" className="text-white hover:bg-zinc-700">USD</SelectItem>
                            <SelectItem value="AED" className="text-white hover:bg-zinc-700">AED</SelectItem>
                            <SelectItem value="BRL" className="text-white hover:bg-zinc-700">BRL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  {settlementMethod.includes('onchain') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantidade Crypto</Label>
                        <Input
                          type="number" step="any"
                          step="0.00000001"
                          value={cryptoAmount}
                          onChange={(e) => setCryptoAmount(e.target.value)}
                          placeholder={String(selectedDeal.amount || 0)}
                          className="bg-zinc-800 border-gold-500/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ativo</Label>
                        <Input
                          value={cryptoAsset}
                          onChange={(e) => setCryptoAsset(e.target.value)}
                          placeholder={selectedDeal.base_asset}
                          className="bg-zinc-800 border-gold-500/30"
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleCreateSettlement}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <Play size={16} className="mr-2" />
                    Criar Liquidação
                  </Button>
                </div>
              )}

              {/* Settlement in Progress */}
              {settlementData && (
                <>
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium">Status da Liquidação</h4>
                      {getStatusBadge(settlementData.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs uppercase mb-1">Método</p>
                        {getMethodBadge(settlementData.method)}
                      </div>
                      {settlementData.fiat_amount && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase mb-1">Valor Fiat</p>
                          <p className="text-white font-mono">{formatNumber(settlementData.fiat_amount)} {settlementData.fiat_currency}</p>
                        </div>
                      )}
                      {settlementData.crypto_amount && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase mb-1">Crypto</p>
                          <p className="text-white font-mono">{formatNumber(settlementData.crypto_amount)} {settlementData.crypto_asset}</p>
                        </div>
                      )}
                      {settlementData.bank_reference && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase mb-1">Ref. Bancária</p>
                          <p className="text-white font-mono text-sm">{settlementData.bank_reference}</p>
                        </div>
                      )}
                      {settlementData.tx_hash && (
                        <div>
                          <p className="text-gray-400 text-xs uppercase mb-1">TX Hash</p>
                          <p className="text-white font-mono text-xs truncate">{settlementData.tx_hash}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirm Fiat */}
                  {settlementData.status === 'pending' && !settlementData.method?.includes('onchain') && (
                    <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                      <h4 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
                        <Banknote size={18} />
                        Confirmar Transferência Fiat
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Referência Bancária</Label>
                          <Input
                            value={bankReference}
                            onChange={(e) => setBankReference(e.target.value)}
                            placeholder="SEPA-123456..."
                            className="bg-zinc-800 border-gold-500/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor Recebido</Label>
                          <Input
                            type="number" step="any"
                            value={fiatAmount}
                            onChange={(e) => setFiatAmount(e.target.value)}
                            placeholder={String(settlementData.fiat_amount)}
                            className="bg-zinc-800 border-gold-500/30"
                          />
                        </div>
                        <Button
                          onClick={handleConfirmFiat}
                          disabled={!bankReference}
                          className="w-full bg-blue-500 hover:bg-blue-400"
                        >
                          Confirmar Fiat
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Confirm Crypto */}
                  {settlementData.status === 'pending' && settlementData.method?.includes('onchain') && (
                    <div className="p-4 bg-orange-900/20 rounded-lg border border-orange-500/30">
                      <h4 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
                        <Bitcoin size={18} />
                        Confirmar Transação On-Chain
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>TX Hash</Label>
                          <Input
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="0x..."
                            className="bg-zinc-800 border-gold-500/30"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                              type="number" step="any"
                              value={cryptoAmount}
                              onChange={(e) => setCryptoAmount(e.target.value)}
                              placeholder={String(settlementData.crypto_amount)}
                              className="bg-zinc-800 border-gold-500/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Network</Label>
                            <Input
                              value={network}
                              onChange={(e) => setNetwork(e.target.value)}
                              placeholder="Ethereum, TRC20..."
                              className="bg-zinc-800 border-gold-500/30"
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleConfirmCrypto}
                          disabled={!txHash}
                          className="w-full bg-orange-500 hover:bg-orange-400 text-black"
                        >
                          Confirmar Crypto
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Complete Settlement */}
                  {settlementData.status === 'in_progress' && (
                    <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                      <h4 className="text-green-400 font-medium mb-2">Liquidação Confirmada</h4>
                      <p className="text-gray-400 text-sm mb-4">
                        Os fundos foram confirmados. Clique abaixo para completar a liquidação e mover o deal para faturação.
                      </p>
                      <Button
                        onClick={handleCompleteSettlement}
                        className="w-full bg-green-500 hover:bg-green-400 text-black"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        Completar Liquidação
                      </Button>
                    </div>
                  )}

                  {/* Already Completed */}
                  {settlementData.status === 'completed' && (
                    <div className="p-4 bg-green-900/20 rounded-lg border border-green-500/30">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle size={20} />
                        <span className="font-medium">Liquidação Completa</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Confirmada em {formatDate(settlementData.confirmed_at)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettlementDialog(false)} className="border-zinc-600">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCSettlement;
