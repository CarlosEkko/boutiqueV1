import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  ArrowUpToLine, 
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', flag: '🇶🇦' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
];

const AdminFiatDeposits = () => {
  const { token } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [expandedDeposit, setExpandedDeposit] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchDeposits();
  }, [token]);

  const fetchDeposits = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/bank-transfers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeposits(response.data || []);
    } catch (err) {
      console.error('Failed to fetch deposits:', err);
      if (err.response?.status === 403) {
        toast.error('Sem permissão para aceder aos depósitos. Acesso restrito ao departamento financeiro.');
      } else {
        toast.error('Erro ao carregar depósitos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId) => {
    setProcessing(depositId);
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${depositId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Depósito aprovado com sucesso!');
      fetchDeposits();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : Array.isArray(errorDetail) 
          ? errorDetail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
          : 'Erro ao aprovar depósito';
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (depositId) => {
    const reason = window.prompt('Motivo da rejeição:');
    if (!reason) return;
    
    setProcessing(depositId);
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${depositId}/reject`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Depósito rejeitado');
      fetchDeposits();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : Array.isArray(errorDetail) 
          ? errorDetail.map(e => e.msg || e.message || JSON.stringify(e)).join(', ')
          : 'Erro ao rejeitar depósito';
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', label: 'Pendente' },
      awaiting_approval: { color: 'bg-orange-900/30 text-orange-400 border-orange-800/30', label: 'Aguardando Aprovação' },
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
  const filteredDeposits = deposits.filter(d => {
    const matchesStatus = !statusFilter || d.status === statusFilter;
    const matchesCurrency = !currencyFilter || d.currency === currencyFilter;
    return matchesStatus && matchesCurrency;
  });

  const pendingCount = deposits.filter(d => d.status === 'pending' || d.status === 'awaiting_approval').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-fiat-deposits">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <ArrowUpToLine className="text-gold-400" />
            Depósitos Fiat
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-1">Aprovar depósitos de transferência bancária</p>
        </div>
        <Button
          onClick={fetchDeposits}
          variant="outline"
          className="border-gold-800/30 text-gold-400"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2"
        >
          <option value="">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="awaiting_approval">Aguardando Aprovação</option>
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
      </div>

      {/* Deposits List */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="text-gold-400" size={20} />
            <h2 className="text-lg text-white font-medium">Transferências Bancárias</h2>
          </div>

          {filteredDeposits.length > 0 ? (
            <div className="space-y-3">
              {filteredDeposits.map(deposit => {
                const isExpanded = expandedDeposit === deposit.id;
                const fee = deposit.fee || 0;
                const netAmount = deposit.amount - fee;
                const isPending = deposit.status === 'pending' || deposit.status === 'awaiting_approval';
                
                return (
                  <div 
                    key={deposit.id}
                    className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden"
                  >
                    {/* Header Row */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                      onClick={() => setExpandedDeposit(isExpanded ? null : deposit.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Badge className="bg-blue-900/30 text-blue-400 border border-blue-800/30">
                          Depósito
                        </Badge>
                        <div>
                          <span className="text-white font-medium">
                            {deposit.currency} {parseFloat(deposit.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                          </span>
                          <span className="text-gray-400 ml-2">
                            Ref: {deposit.reference || deposit.id?.slice(0, 10)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm hidden md:block">
                          {deposit.user_email}
                        </span>
                        {getStatusBadge(deposit.status)}
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
                            <p className="text-white">{formatCurrency(deposit.amount, deposit.currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Taxa</p>
                            <p className="text-white">{formatCurrency(fee, deposit.currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Valor Líquido</p>
                            <p className="text-green-400 font-medium">{formatCurrency(netAmount, deposit.currency)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Data do Pedido</p>
                            <p className="text-white">{formatDate(deposit.created_at)}</p>
                          </div>
                        </div>

                        {/* Bank Details */}
                        {deposit.bank_details && (
                          <div className="border-t border-zinc-700/50 pt-4">
                            <h3 className="text-gold-400 font-medium mb-3">Dados Bancários do Cliente</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {deposit.bank_details.bank_name && (
                                <div>
                                  <p className="text-gray-500 text-sm">Banco</p>
                                  <p className="text-white">{deposit.bank_details.bank_name}</p>
                                </div>
                              )}
                              {deposit.bank_details.account_holder && (
                                <div>
                                  <p className="text-gray-500 text-sm">Titular</p>
                                  <p className="text-white">{deposit.bank_details.account_holder}</p>
                                </div>
                              )}
                              {deposit.bank_details.iban && (
                                <div>
                                  <p className="text-gray-500 text-sm">IBAN</p>
                                  <p className="text-white font-mono text-sm">{deposit.bank_details.iban}</p>
                                </div>
                              )}
                              {deposit.bank_details.swift_bic && (
                                <div>
                                  <p className="text-gray-500 text-sm">SWIFT/BIC</p>
                                  <p className="text-white font-mono">{deposit.bank_details.swift_bic}</p>
                                </div>
                              )}
                              {deposit.bank_details.account_number && (
                                <div>
                                  <p className="text-gray-500 text-sm">Nº Conta</p>
                                  <p className="text-white">{deposit.bank_details.account_number}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* User Info */}
                        <div className="border-t border-zinc-700/50 pt-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-500 text-sm">Email do Cliente</p>
                              <p className="text-white">{deposit.user_email}</p>
                            </div>
                            {deposit.user_name && (
                              <div>
                                <p className="text-gray-500 text-sm">Nome do Cliente</p>
                                <p className="text-white">{deposit.user_name}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reference Note */}
                        {deposit.reference && (
                          <div className="mt-4 bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                            <p className="text-green-400 text-sm">
                              Referência: {deposit.reference}
                            </p>
                          </div>
                        )}

                        {/* Proof Document */}
                        {deposit.proof_document_url && (
                          <div className="mt-4">
                            <a 
                              href={`${API_URL}${deposit.proof_document_url}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-gold-400 flex items-center gap-2 hover:underline"
                            >
                              <FileText size={16} />
                              Ver Comprovativo
                            </a>
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && (
                          <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-700/50">
                            <Button
                              onClick={() => handleApprove(deposit.id)}
                              disabled={processing === deposit.id}
                              className="bg-green-600 hover:bg-green-500"
                            >
                              {processing === deposit.id ? (
                                <Loader2 className="animate-spin mr-2" size={16} />
                              ) : (
                                <CheckCircle size={16} className="mr-2" />
                              )}
                              Aprovar
                            </Button>
                            <Button
                              onClick={() => handleReject(deposit.id)}
                              disabled={processing === deposit.id}
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
              <ArrowUpToLine className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Depósitos</h3>
              <p className="text-gray-400">Nenhum depósito pendente de aprovação.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFiatDeposits;
