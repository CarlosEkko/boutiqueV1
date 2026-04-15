import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Bitcoin, 
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  ExternalLink,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCryptoWithdrawals = () => {
  const { token } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedWithdrawal, setExpandedWithdrawal] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchWithdrawals();
  }, [token]);

  const fetchWithdrawals = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crypto-wallets/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWithdrawals(response.data?.withdrawals || []);
    } catch (err) {
      console.error('Failed to fetch crypto withdrawals:', err);
      toast.error('Erro ao carregar levantamentos crypto');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId) => {
    setProcessing(withdrawalId);
    try {
      await axios.post(`${API_URL}/api/crypto-wallets/admin/withdrawals/${withdrawalId}/approve`, 
        { approved: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Levantamento crypto aprovado!');
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
      await axios.post(`${API_URL}/api/crypto-wallets/admin/withdrawals/${withdrawalId}/approve`, 
        { approved: false, admin_note: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Levantamento crypto rejeitado');
      fetchWithdrawals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar levantamento');
    } finally {
      setProcessing(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', label: 'Pendente' },
      approved: { color: 'bg-blue-900/30 text-blue-400 border-blue-800/30', label: 'Aprovado' },
      processing: { color: 'bg-blue-900/30 text-blue-400 border-blue-800/30', label: 'Processando' },
      completed: { color: 'bg-green-900/30 text-green-400 border-green-800/30', label: 'Concluído' },
      rejected: { color: 'bg-red-900/30 text-red-400 border-red-800/30', label: 'Rejeitado' },
      failed: { color: 'bg-red-900/30 text-red-400 border-red-800/30', label: 'Falhou' },
    };
    const { color, label } = config[status] || config.pending;
    return (
      <Badge className={`${color} border`}>
        {label}
      </Badge>
    );
  };
  const getExplorerUrl = (asset, txHash) => {
    const explorers = {
      BTC: `https://blockstream.info/tx/${txHash}`,
      ETH: `https://etherscan.io/tx/${txHash}`,
      SOL: `https://solscan.io/tx/${txHash}`,
      MATIC: `https://polygonscan.com/tx/${txHash}`,
    };
    return explorers[asset] || `https://etherscan.io/tx/${txHash}`;
  };

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesStatus = !statusFilter || w.status === statusFilter;
    return matchesStatus;
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
    <div className="space-y-6" data-testid="admin-crypto-withdrawals">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Bitcoin className="text-gold-400" />
            Levantamentos Crypto
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-1">Aprovar pedidos de levantamento de criptomoedas</p>
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
                const isPending = withdrawal.status === 'pending';
                const fee = withdrawal.network_fee || 0;
                const netAmount = withdrawal.amount - fee;
                
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
                        <Badge className="bg-orange-900/30 text-orange-400 border border-orange-800/30">
                          {withdrawal.asset}
                        </Badge>
                        <div>
                          <span className="text-white font-medium">
                            {withdrawal.amount} {withdrawal.asset}
                          </span>
                          <span className="text-gray-400 ml-2">
                            (Líquido: {netAmount.toFixed(6)} {withdrawal.asset})
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
                            <p className="text-white">{withdrawal.amount} {withdrawal.asset}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Taxa de Rede</p>
                            <p className="text-white">{fee} {withdrawal.asset}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Valor Líquido</p>
                            <p className="text-green-400 font-medium">{netAmount.toFixed(6)} {withdrawal.asset}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Data do Pedido</p>
                            <p className="text-white">{formatDate(withdrawal.created_at)}</p>
                          </div>
                        </div>

                        {/* Destination Address */}
                        <div className="border-t border-zinc-700/50 pt-4">
                          <h3 className="text-gold-400 font-medium mb-3">Endereço de Destino</h3>
                          <div className="flex items-center gap-2 bg-zinc-900/50 p-3 rounded-lg">
                            <p className="text-white font-mono text-sm break-all flex-1">
                              {withdrawal.destination_address}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(withdrawal.destination_address);
                              }}
                              className="text-gold-400"
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                          {withdrawal.network && (
                            <p className="text-gray-400 text-sm mt-2">
                              Rede: <span className="text-white">{withdrawal.network}</span>
                            </p>
                          )}
                        </div>

                        {/* Transaction Hash */}
                        {withdrawal.tx_hash && (
                          <div className="border-t border-zinc-700/50 pt-4 mt-4">
                            <h3 className="text-gold-400 font-medium mb-3">Hash da Transação</h3>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-mono text-sm truncate flex-1">
                                {withdrawal.tx_hash}
                              </p>
                              <a 
                                href={getExplorerUrl(withdrawal.asset, withdrawal.tx_hash)}
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-gold-400 hover:text-gold-300 flex items-center gap-1"
                              >
                                <ExternalLink size={14} />
                                Ver
                              </a>
                            </div>
                          </div>
                        )}

                        {/* User Info */}
                        <div className="border-t border-zinc-700/50 pt-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-500 text-sm">Email do Cliente</p>
                              <p className="text-white">{withdrawal.user_email}</p>
                            </div>
                            {withdrawal.user_name && (
                              <div>
                                <p className="text-gray-500 text-sm">Nome do Cliente</p>
                                <p className="text-white">{withdrawal.user_name}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Admin Note */}
                        {withdrawal.admin_note && (
                          <div className="mt-4 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3">
                            <p className="text-yellow-400 text-sm">
                              Nota do Admin: {withdrawal.admin_note}
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
              <Bitcoin className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Levantamentos Crypto</h3>
              <p className="text-gray-400">Nenhum pedido de levantamento crypto pendente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCryptoWithdrawals;
