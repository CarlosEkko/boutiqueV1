import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  ArrowDownToLine, 
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Banknote
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
];

const AdminFiatWithdrawals = () => {
  const { token } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [expandedWithdrawal, setExpandedWithdrawal] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [token]);

  const fetchWithdrawals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/fiat-withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(response.data || []);
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
      toast.error('Erro ao carregar levantamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId) => {
    setProcessing(withdrawalId);
    try {
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${withdrawalId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Levantamento aprovado com sucesso!');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar levantamento');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawalId) => {
    const reason = window.prompt('Motivo da rejeição:');
    if (!reason) return;
    
    setProcessing(withdrawalId);
    try {
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${withdrawalId}/reject`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Levantamento rejeitado');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar levantamento');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', label: 'Pendente' },
      processing: { color: 'bg-blue-900/30 text-blue-400 border-blue-800/30', label: 'Processando' },
      approved: { color: 'bg-green-900/30 text-green-400 border-green-800/30', label: 'Aprovado' },
      completed: { color: 'bg-green-900/30 text-green-400 border-green-800/30', label: 'Concluído' },
      rejected: { color: 'bg-red-900/30 text-red-400 border-red-800/30', label: 'Rejeitado' },
    };
    const { color, label } = config[status] || config.pending;
    return (
      <Badge className={`${color} border`}>
        {label}
      </Badge>
    );
  };

  const getCurrencySymbol = (code) => {
    return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || code;
  };

  const formatCurrency = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol} ${parseFloat(amount).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesStatus = !statusFilter || w.status === statusFilter;
    const matchesCurrency = !currencyFilter || w.currency === currencyFilter;
    return matchesStatus && matchesCurrency;
  });

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-fiat-withdrawals">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <ArrowDownToLine className="text-gold-400" />
            Pedidos de Levantamento
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-1">Aprovar pedidos de levantamento em moeda fiat</p>
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2"
          >
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="processing">Processando</option>
            <option value="completed">Concluído</option>
            <option value="rejected">Rejeitado</option>
          </select>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2"
          >
            <option value="">Todas as Moedas</option>
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <Button
            onClick={fetchWithdrawals}
            variant="outline"
            size="icon"
            className="border-gold-800/30"
          >
            <RefreshCw size={16} className="text-gold-400" />
          </Button>
        </div>
      </div>

      {/* Withdrawals List */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-4">
          {filteredWithdrawals.length > 0 ? (
            <div className="space-y-3">
              {filteredWithdrawals.map(withdrawal => {
                const isExpanded = expandedWithdrawal === withdrawal.id;
                const fee = withdrawal.fee || 0;
                const netAmount = withdrawal.amount - fee;
                const isPending = withdrawal.status === 'pending';
                
                return (
                  <div 
                    key={withdrawal.id}
                    className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden"
                  >
                    {/* Header Row */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                      onClick={() => setExpandedWithdrawal(isExpanded ? null : withdrawal.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Banknote className="text-green-400" size={20} />
                        <div>
                          <span className="text-white font-medium">
                            {formatCurrency(withdrawal.amount, withdrawal.currency)}
                          </span>
                          <span className="text-gray-400 ml-2">
                            (Líquido: {formatCurrency(netAmount, withdrawal.currency)})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm hidden md:block">
                          {withdrawal.user_email}
                        </span>
                        {getStatusBadge(withdrawal.status)}
                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-700/50">
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                          <div>
                            <p className="text-gray-500 text-sm">Valor Bruto</p>
                            <p className="text-white">{formatCurrency(withdrawal.amount, withdrawal.currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Taxa</p>
                            <p className="text-white">{formatCurrency(fee, withdrawal.currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Valor Líquido</p>
                            <p className="text-green-400 font-medium">{formatCurrency(netAmount, withdrawal.currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Data do Pedido</p>
                            <p className="text-white">{formatDate(withdrawal.created_at)}</p>
                          </div>
                        </div>

                        {/* Bank Details */}
                        {withdrawal.bank_details && (
                          <div className="border-t border-zinc-700/50 pt-4">
                            <h3 className="text-gold-400 font-medium mb-3">Dados Bancários do Cliente</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {withdrawal.bank_details.bank_name && (
                                <div>
                                  <p className="text-gray-500 text-sm">Banco</p>
                                  <p className="text-white">{withdrawal.bank_details.bank_name}</p>
                                </div>
                              )}
                              {withdrawal.bank_details.account_holder && (
                                <div>
                                  <p className="text-gray-500 text-sm">Titular</p>
                                  <p className="text-white">{withdrawal.bank_details.account_holder}</p>
                                </div>
                              )}
                              {withdrawal.bank_details.iban && (
                                <div>
                                  <p className="text-gray-500 text-sm">IBAN</p>
                                  <p className="text-white font-mono text-sm">{withdrawal.bank_details.iban}</p>
                                </div>
                              )}
                              {withdrawal.bank_details.swift_bic && (
                                <div>
                                  <p className="text-gray-500 text-sm">SWIFT/BIC</p>
                                  <p className="text-white font-mono">{withdrawal.bank_details.swift_bic}</p>
                                </div>
                              )}
                              {withdrawal.bank_details.account_number && (
                                <div>
                                  <p className="text-gray-500 text-sm">Nº Conta</p>
                                  <p className="text-white">{withdrawal.bank_details.account_number}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Reference Note */}
                        {withdrawal.reference && (
                          <div className="mt-4 bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                            <p className="text-green-400 text-sm">
                              Referência: {withdrawal.reference}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && (
                          <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-700/50">
                            <Button
                              onClick={() => handleApprove(withdrawal.id)}
                              disabled={processing === withdrawal.id}
                              className="bg-green-600 hover:bg-green-500"
                            >
                              {processing === withdrawal.id ? (
                                <Loader2 className="animate-spin mr-2" size={16} />
                              ) : (
                                <CheckCircle size={16} className="mr-2" />
                              )}
                              Aprovar
                            </Button>
                            <Button
                              onClick={() => handleReject(withdrawal.id)}
                              disabled={processing === withdrawal.id}
                              variant="outline"
                              className="border-red-800/30 text-red-400 hover:bg-red-900/30"
                            >
                              <XCircle size={16} className="mr-2" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <ArrowDownToLine className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Levantamentos</h3>
              <p className="text-gray-400">Nenhum pedido de levantamento fiat pendente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFiatWithdrawals;
