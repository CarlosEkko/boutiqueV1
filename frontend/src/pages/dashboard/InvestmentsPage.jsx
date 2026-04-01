import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { 
  TrendingUp, 
  Clock, 
  DollarSign,
  Percent,
  AlertTriangle,
  CheckCircle,
  Wallet,
  RefreshCw,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InvestmentsPage = () => {
  const { token, user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t } = useLanguage();
  const [opportunities, setOpportunities] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [investAmount, setInvestAmount] = useState('');
  const [investing, setInvesting] = useState(false);
  const [showInvestDialog, setShowInvestDialog] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('opportunities');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [oppResponse, invResponse] = await Promise.all([
        // Use the endpoint that only returns eligible opportunities
        axios.get(`${API_URL}/api/dashboard/investments/opportunities`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/dashboard/investments/my`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setOpportunities(oppResponse.data);
      setMyInvestments(invResponse.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async (currency) => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/wallets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const wallet = response.data.find(w => w.asset_id === currency);
      setWalletBalance(wallet?.available_balance || 0);
    } catch (err) {
      setWalletBalance(0);
    }
  };

  const openInvestDialog = (opp) => {
    setSelectedOpp(opp);
    setInvestAmount('');
    fetchWalletBalance(opp.currency);
    setShowInvestDialog(true);
  };

  const handleInvest = async () => {
    if (!selectedOpp || !investAmount) return;
    
    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Insira um valor válido');
      return;
    }

    if (amount < selectedOpp.min_investment) {
      toast.error(`Investimento mínimo é ${formatNumber(selectedOpp.min_investment)} ${selectedOpp.currency}`);
      return;
    }

    if (amount > selectedOpp.max_investment) {
      toast.error(`Investimento máximo é ${formatNumber(selectedOpp.max_investment)} ${selectedOpp.currency}`);
      return;
    }

    if (amount > walletBalance) {
      toast.error('Saldo insuficiente');
      return;
    }

    setInvesting(true);
    try {
      await axios.post(
        `${API_URL}/api/dashboard/investments/${selectedOpp.id}/invest?amount=${amount}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Investimento realizado com sucesso!');
      setShowInvestDialog(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao investir');
    } finally {
      setInvesting(false);
    }
  };

  const calculateExpectedReturn = () => {
    if (!selectedOpp || !investAmount) return 0;
    const amount = parseFloat(investAmount) || 0;
    const fixedRate = selectedOpp.fixed_rate || 0;
    const variableRate = selectedOpp.variable_rate || 0;
    const totalRate = (fixedRate + variableRate) / 100;
    return amount * totalRate;
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400';
      case 'active': return 'bg-blue-500/20 text-blue-400';
      case 'completed': return 'bg-gray-500/20 text-gray-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate portfolio stats
  const totalInvested = myInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalExpectedReturn = myInvestments.reduce((sum, inv) => sum + (inv.expected_return || 0), 0);
  const activeInvestments = myInvestments.filter(inv => inv.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white">Investimentos</h1>
          <p className="text-gray-400 text-sm mt-1">Explore oportunidades e gira os seus investimentos</p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          className="border-zinc-700 text-gray-300"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Investido</p>
                <p className="text-2xl font-light text-white">
                  {formatNumber(totalInvested)} USDT
                </p>
              </div>
              <Wallet className="text-gold-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Retorno Esperado</p>
                <p className="text-2xl font-light text-green-400">
                  +{formatNumber(totalExpectedReturn)} USDT
                </p>
              </div>
              <TrendingUp className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Investimentos Ativos</p>
                <p className="text-2xl font-light text-blue-400">{activeInvestments}</p>
              </div>
              <Clock className="text-blue-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">ROI Médio</p>
                <p className="text-2xl font-light text-purple-400">
                  {totalInvested > 0 ? ((totalExpectedReturn / totalInvested) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <Percent className="text-purple-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="opportunities" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Oportunidades
          </TabsTrigger>
          <TabsTrigger value="my-investments" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
            Os Meus Investimentos
          </TabsTrigger>
        </TabsList>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-gold-400" size={32} />
            </div>
          ) : opportunities.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <TrendingUp className="mx-auto text-gray-600 mb-4" size={48} />
                <h3 className="text-xl text-white mb-2">Sem Oportunidades Disponíveis</h3>
                <p className="text-gray-400">
                  Não há oportunidades de investimento disponíveis de momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {opportunities.map((opp) => {
                const progress = ((opp.current_pool || 0) / opp.total_pool) * 100;
                const fixedRate = opp.fixed_rate || 0;
                const variableRate = opp.variable_rate || 0;
                const totalROI = fixedRate + variableRate;
                
                return (
                  <Card 
                    key={opp.id} 
                    className="bg-zinc-900 border-zinc-800 transition-all hover:border-gold-500/50"
                  >
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg text-white font-medium">{opp.name}</h3>
                          <p className="text-sm text-gray-400 capitalize">{opp.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskColor(opp.risk_level)}>
                            {opp.risk_level === 'low' ? 'Baixo' : opp.risk_level === 'medium' ? 'Médio' : 'Alto'}
                          </Badge>
                          <Badge className={getStatusColor(opp.status)}>
                            {opp.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {opp.description || 'Oportunidade de investimento com retorno garantido.'}
                      </p>

                      {/* ROI Breakdown */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <p className="text-xs text-gray-400 mb-1">Taxa Fixa</p>
                          <p className="text-lg text-green-400 font-semibold">{fixedRate}%</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <p className="text-xs text-gray-400 mb-1">Taxa Variável</p>
                          <p className="text-lg text-yellow-400 font-semibold">{variableRate}%</p>
                        </div>
                        <div className="text-center p-3 bg-gold-500/10 rounded-lg border border-gold-500/30">
                          <p className="text-xs text-gold-400 mb-1">ROI Total</p>
                          <p className="text-lg text-gold-400 font-bold">{totalROI}%</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock size={14} />
                          <span>{opp.duration_days} dias</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <DollarSign size={14} />
                          <span>Mín: {formatNumber(opp.min_investment, 0)} {opp.currency}</span>
                        </div>
                      </div>

                      {/* Pool Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Pool</span>
                          <span className="text-white">{progress.toFixed(1)}% preenchido</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatNumber(opp.current_pool || 0, 0)} / {formatNumber(opp.total_pool, 0)} {opp.currency}
                        </p>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => openInvestDialog(opp)}
                        disabled={opp.status !== 'open' && opp.status !== 'active'}
                        className="w-full bg-gold-500 hover:bg-gold-400 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Investir Agora
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* My Investments Tab */}
        <TabsContent value="my-investments" className="mt-6">
          {myInvestments.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-12 text-center">
                <Wallet className="mx-auto text-gray-600 mb-4" size={48} />
                <h3 className="text-xl text-white mb-2">Sem Investimentos</h3>
                <p className="text-gray-400 mb-4">
                  Ainda não fez nenhum investimento.
                </p>
                <Button
                  onClick={() => setActiveTab('opportunities')}
                  className="bg-gold-500 hover:bg-gold-400 text-black"
                >
                  Ver Oportunidades
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myInvestments.map((inv) => {
                const opp = inv.opportunity || {};
                const fixedReturn = inv.amount * ((inv.fixed_rate || 0) / 100);
                const variableReturn = inv.amount * ((inv.variable_rate || 0) / 100);
                
                return (
                  <Card key={inv.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg text-white font-medium">{opp.name || 'Investimento'}</h3>
                            <Badge className={getStatusColor(inv.status)}>
                              {inv.status === 'active' ? 'Ativo' : inv.status === 'completed' ? 'Concluído' : inv.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Valor Investido</p>
                              <p className="text-white font-medium">{formatNumber(inv.amount)} {inv.currency}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Retorno Fixo</p>
                              <p className="text-green-400 font-medium">+{formatNumber(fixedReturn)} {inv.currency}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Retorno Variável</p>
                              <p className="text-yellow-400 font-medium">+{formatNumber(variableReturn)} {inv.currency}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Maturidade</p>
                              <p className="text-white">{formatDate(inv.maturity_date)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-gray-400 text-sm">Retorno Total</p>
                          <p className="text-2xl text-gold-400 font-light">
                            +{formatNumber(inv.expected_return)} {inv.currency}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Invest Dialog */}
      <Dialog open={showInvestDialog} onOpenChange={setShowInvestDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="text-gold-400" size={20} />
              Investir
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedOpp?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOpp && (
            <div className="space-y-4 py-4">
              {/* ROI Info */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-zinc-800 rounded">
                  <p className="text-xs text-gray-400">Fixo</p>
                  <p className="text-green-400 font-medium">{selectedOpp.fixed_rate}%</p>
                </div>
                <div className="text-center p-2 bg-zinc-800 rounded">
                  <p className="text-xs text-gray-400">Variável</p>
                  <p className="text-yellow-400 font-medium">{selectedOpp.variable_rate}%</p>
                </div>
                <div className="text-center p-2 bg-zinc-800 rounded">
                  <p className="text-xs text-gray-400">Duração</p>
                  <p className="text-white font-medium">{selectedOpp.duration_days}d</p>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg">
                <span className="text-gray-400">Saldo Disponível</span>
                <span className="text-white font-medium">
                  {formatNumber(walletBalance)} {selectedOpp.currency}
                </span>
              </div>

              {/* Amount Input */}
              <div>
                <Label className="text-gray-300">Valor a Investir</Label>
                <div className="relative mt-1">
                  <Input
                    type="number" step="any"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder={`Mín: ${formatNumber(selectedOpp.min_investment, 0)}`}
                    className="bg-zinc-800 border-zinc-700 text-white pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {selectedOpp.currency}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mín: {formatNumber(selectedOpp.min_investment, 0)}</span>
                  <span>Máx: {formatNumber(selectedOpp.max_investment, 0)}</span>
                </div>
              </div>

              {/* Expected Return */}
              {investAmount && parseFloat(investAmount) > 0 && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">Retorno Esperado</span>
                    <span className="text-green-400 font-bold text-lg">
                      +{formatNumber(calculateExpectedReturn())} {selectedOpp.currency}
                    </span>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={16} />
                <p className="text-yellow-400 text-xs">
                  O retorno variável depende da performance do investimento e pode variar.
                  O capital investido ficará bloqueado durante {selectedOpp.duration_days} dias.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInvestDialog(false)}
              className="border-zinc-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvest}
              disabled={investing || !investAmount || parseFloat(investAmount) <= 0}
              className="bg-gold-500 hover:bg-gold-400 text-black"
            >
              {investing ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : (
                <CheckCircle size={16} className="mr-2" />
              )}
              Confirmar Investimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvestmentsPage;
