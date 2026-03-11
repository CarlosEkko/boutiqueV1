import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  ArrowDownToLine,
  Banknote,
  Building2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  History
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CURRENCIES = [
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', symbol: '$' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪', symbol: 'د.إ' },
  { code: 'BRL', name: 'Real Brasileiro', flag: '🇧🇷', symbol: 'R$' },
];

const FiatWithdrawalPage = () => {
  const { token } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [wallets, setWallets] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('request'); // 'request' or 'history'
  const [expandedWithdrawal, setExpandedWithdrawal] = useState(null);
  
  // Form state
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_holder: '',
    iban: '',
    swift_bic: '',
    account_number: '',
    routing_number: ''
  });
  
  // Calculated values
  const [fee, setFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  useEffect(() => {
    fetchWallets();
    fetchWithdrawals();
  }, [token]);

  useEffect(() => {
    // Calculate fee (0.5% with minimum 5)
    const amountNum = parseFloat(amount) || 0;
    const calculatedFee = Math.max(amountNum * 0.005, 5);
    const calculatedNet = amountNum - calculatedFee;
    
    setFee(amountNum > 0 ? calculatedFee : 0);
    setNetAmount(amountNum > 0 ? Math.max(calculatedNet, 0) : 0);
  }, [amount]);

  const fetchWallets = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/wallets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter only fiat wallets
      const fiatWallets = response.data.filter(w => 
        ['EUR', 'USD', 'AED', 'BRL'].includes(w.asset_id)
      );
      setWallets(fiatWallets);
    } catch (err) {
      console.error('Failed to fetch wallets', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/my-withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(response.data);
    } catch (err) {
      console.error('Failed to fetch withdrawals', err);
    }
  };

  const getWalletBalance = (currency) => {
    const wallet = wallets.find(w => w.asset_id === currency);
    return wallet?.available_balance || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Insira um valor válido');
      return;
    }

    const balance = getWalletBalance(selectedCurrency);
    if (amountNum > balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    if (!bankDetails.bank_name || !bankDetails.account_holder) {
      toast.error('Preencha o nome do banco e titular da conta');
      return;
    }

    if (!bankDetails.iban && !bankDetails.account_number) {
      toast.error('Preencha o IBAN ou número da conta');
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/trading/fiat-withdrawal`, {
        currency: selectedCurrency,
        amount: amountNum,
        ...bankDetails
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Pedido de levantamento enviado com sucesso!');
      
      // Reset form
      setAmount('');
      setBankDetails({
        bank_name: '',
        account_holder: '',
        iban: '',
        swift_bic: '',
        account_number: '',
        routing_number: ''
      });
      
      // Refresh data
      fetchWallets();
      fetchWithdrawals();
      setActiveTab('history');
      
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelWithdrawal = async (withdrawalId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return;
    
    try {
      await axios.post(`${API_URL}/api/trading/fiat-withdrawal/${withdrawalId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Pedido cancelado');
      fetchWithdrawals();
      fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      processing: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
      cancelled: 'bg-gray-500/20 text-gray-400'
    };
    const labels = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluído',
      rejected: 'Rejeitado',
      cancelled: 'Cancelado'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-400" size={20} />;
      case 'rejected': return <XCircle className="text-red-400" size={20} />;
      case 'processing': return <Loader2 className="text-blue-400 animate-spin" size={20} />;
      case 'cancelled': return <XCircle className="text-gray-400" size={20} />;
      default: return <Clock className="text-yellow-400" size={20} />;
    }
  };

  const currencyInfo = CURRENCIES.find(c => c.code === selectedCurrency);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">Levantamento Fiat</h1>
        <p className="text-gray-400 mt-1">Transfira fundos para sua conta bancária</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-5 py-2.5 rounded-lg transition-colors font-medium flex items-center gap-2 ${
            activeTab === 'request' 
              ? 'bg-gold-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('request')}
        >
          <ArrowDownToLine size={18} />
          Novo Pedido
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg transition-colors font-medium flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'bg-gold-500 text-black' 
              : 'text-gray-400 hover:text-white hover:bg-zinc-800'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          Histórico ({withdrawals.length})
        </button>
      </div>

      {/* Request Form */}
      {activeTab === 'request' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="bg-zinc-900/50 border-gold-800/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowDownToLine size={20} className="text-gold-400" />
                  Solicitar Levantamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Currency Selection */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Selecione a Moeda</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {CURRENCIES.map(curr => {
                        const balance = getWalletBalance(curr.code);
                        return (
                          <button
                            key={curr.code}
                            type="button"
                            onClick={() => setSelectedCurrency(curr.code)}
                            className={`p-4 rounded-lg border transition-all ${
                              selectedCurrency === curr.code
                                ? 'border-gold-500 bg-gold-500/10'
                                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                            }`}
                          >
                            <div className="text-2xl mb-1">{curr.flag}</div>
                            <div className="text-white font-medium">{curr.code}</div>
                            <div className="text-gray-400 text-sm">
                              {curr.symbol}{balance.toFixed(2)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Valor a Levantar</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {currencyInfo?.symbol}
                      </span>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-zinc-800 border-zinc-700 text-white pl-10 text-lg"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Disponível: {currencyInfo?.symbol}{getWalletBalance(selectedCurrency).toFixed(2)}
                    </p>
                  </div>

                  {/* Bank Details */}
                  <div className="border-t border-zinc-800 pt-6">
                    <h3 className="text-lg text-gold-400 mb-4 flex items-center gap-2">
                      <Building2 size={20} />
                      Dados Bancários para Recebimento
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Nome do Banco *</label>
                        <Input
                          value={bankDetails.bank_name}
                          onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                          placeholder="Ex: Banco de Portugal"
                          className="bg-zinc-800 border-zinc-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Titular da Conta *</label>
                        <Input
                          value={bankDetails.account_holder}
                          onChange={(e) => setBankDetails({...bankDetails, account_holder: e.target.value})}
                          placeholder="Nome completo"
                          className="bg-zinc-800 border-zinc-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">IBAN</label>
                        <Input
                          value={bankDetails.iban}
                          onChange={(e) => setBankDetails({...bankDetails, iban: e.target.value})}
                          placeholder="PT50 0000 0000 0000 0000 0000 0"
                          className="bg-zinc-800 border-zinc-700 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">SWIFT/BIC</label>
                        <Input
                          value={bankDetails.swift_bic}
                          onChange={(e) => setBankDetails({...bankDetails, swift_bic: e.target.value})}
                          placeholder="BNPAFRPP"
                          className="bg-zinc-800 border-zinc-700 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Número da Conta</label>
                        <Input
                          value={bankDetails.account_number}
                          onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value})}
                          placeholder="Para USD ou outros"
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Routing Number (USD)</label>
                        <Input
                          value={bankDetails.routing_number}
                          onChange={(e) => setBankDetails({...bankDetails, routing_number: e.target.value})}
                          placeholder="Para transferências EUA"
                          className="bg-zinc-800 border-zinc-700 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gold-500 hover:bg-gold-600 text-black py-6 text-lg"
                    disabled={submitting || !amount || parseFloat(amount) <= 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={20} />
                        Processando...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="mr-2" size={20} />
                        Solicitar Levantamento
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card className="bg-zinc-900/50 border-gold-800/20 sticky top-4">
              <CardHeader>
                <CardTitle className="text-white">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Valor</span>
                  <span className="text-white">
                    {currencyInfo?.symbol}{parseFloat(amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa (0.5%)</span>
                  <span className="text-red-400">
                    -{currencyInfo?.symbol}{fee.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-zinc-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor Líquido</span>
                    <span className="text-green-400 text-xl font-medium">
                      {currencyInfo?.symbol}{netAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 mt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-gray-400">
                      <p className="mb-2">O levantamento será processado em até 2 dias úteis após aprovação.</p>
                      <p>Taxa mínima: {currencyInfo?.symbol}5.00</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History size={20} className="text-gold-400" />
              Histórico de Levantamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <ArrowDownToLine className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">Nenhum levantamento realizado</p>
                <Button
                  className="mt-4 bg-gold-500 hover:bg-gold-600 text-black"
                  onClick={() => setActiveTab('request')}
                >
                  Fazer Primeiro Levantamento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map(withdrawal => {
                  const curr = CURRENCIES.find(c => c.code === withdrawal.currency);
                  return (
                    <div 
                      key={withdrawal.id}
                      className="bg-zinc-800/50 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                        onClick={() => setExpandedWithdrawal(
                          expandedWithdrawal === withdrawal.id ? null : withdrawal.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getStatusIcon(withdrawal.status)}
                            <div>
                              <span className="text-white font-medium">
                                {curr?.symbol}{withdrawal.amount?.toFixed(2)} {withdrawal.currency}
                              </span>
                              <span className="text-gray-400 ml-2 text-sm">
                                → {curr?.symbol}{withdrawal.net_amount?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getStatusBadge(withdrawal.status)}
                            <span className="text-gray-500 text-sm">
                              {new Date(withdrawal.created_at).toLocaleDateString('pt-PT')}
                            </span>
                            {expandedWithdrawal === withdrawal.id ? (
                              <ChevronUp size={18} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={18} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedWithdrawal === withdrawal.id && (
                        <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-gray-400">Valor Bruto</p>
                              <p className="text-white">{curr?.symbol}{withdrawal.amount?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Taxa</p>
                              <p className="text-red-400">-{curr?.symbol}{withdrawal.fee_amount?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Valor Líquido</p>
                              <p className="text-green-400">{curr?.symbol}{withdrawal.net_amount?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Data</p>
                              <p className="text-white">{new Date(withdrawal.created_at).toLocaleString('pt-PT')}</p>
                            </div>
                          </div>

                          <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
                            <p className="text-gray-400 text-sm mb-2">Conta de Destino</p>
                            <p className="text-white">{withdrawal.bank_name}</p>
                            <p className="text-gray-400">{withdrawal.account_holder}</p>
                            {withdrawal.iban && (
                              <p className="text-gray-400 font-mono text-sm">{withdrawal.iban}</p>
                            )}
                          </div>

                          {withdrawal.rejection_reason && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                              <p className="text-red-400 text-sm">
                                <strong>Motivo da rejeição:</strong> {withdrawal.rejection_reason}
                              </p>
                            </div>
                          )}

                          {withdrawal.transaction_reference && (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                              <p className="text-green-400 text-sm">
                                <strong>Referência:</strong> {withdrawal.transaction_reference}
                              </p>
                            </div>
                          )}

                          {withdrawal.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => cancelWithdrawal(withdrawal.id)}
                            >
                              <XCircle size={16} className="mr-1" />
                              Cancelar Pedido
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FiatWithdrawalPage;
