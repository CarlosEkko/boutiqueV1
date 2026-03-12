import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Receipt, 
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/trading/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      toast.error('Erro ao carregar ordens');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (orderId) => {
    setProcessing(orderId);
    try {
      await axios.post(`${API_URL}/api/trading/admin/orders/${orderId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ordem completada com sucesso!');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao completar ordem');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (orderId) => {
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason) return;
    
    setProcessing(orderId);
    try {
      await axios.post(`${API_URL}/api/trading/admin/orders/${orderId}/cancel`, 
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Ordem cancelada');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar ordem');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', label: 'Pendente' },
      processing: { color: 'bg-blue-900/30 text-blue-400 border-blue-800/30', label: 'Processando' },
      completed: { color: 'bg-green-900/30 text-green-400 border-green-800/30', label: 'Concluído' },
      cancelled: { color: 'bg-red-900/30 text-red-400 border-red-800/30', label: 'Cancelado' },
      failed: { color: 'bg-red-900/30 text-red-400 border-red-800/30', label: 'Falhou' },
    };
    const { color, label } = config[status] || config.pending;
    return (
      <Badge className={`${color} border`}>
        {label}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const config = {
      buy: { color: 'bg-green-900/30 text-green-400 border-green-800/30', label: 'Compra', icon: TrendingUp },
      sell: { color: 'bg-red-900/30 text-red-400 border-red-800/30', label: 'Venda', icon: TrendingDown },
      swap: { color: 'bg-purple-900/30 text-purple-400 border-purple-800/30', label: 'Conversão', icon: ArrowRightLeft },
    };
    const { color, label, icon: Icon } = config[type] || config.buy;
    return (
      <Badge className={`${color} border flex items-center gap-1`}>
        <Icon size={12} />
        {label}
      </Badge>
    );
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

  const filteredOrders = orders.filter(o => {
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesType = !typeFilter || o.order_type === typeFilter;
    return matchesStatus && matchesType;
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-orders">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Receipt className="text-gold-400" />
            Ordens de Trading
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-gray-400 mt-1">Gerir e aprovar ordens de compra, venda e conversão</p>
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
            <option value="cancelled">Cancelado</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2"
          >
            <option value="">Todos os Tipos</option>
            <option value="buy">Compra</option>
            <option value="sell">Venda</option>
            <option value="swap">Conversão</option>
          </select>
          <Button
            onClick={fetchOrders}
            variant="outline"
            size="icon"
            className="border-gold-800/30"
          >
            <RefreshCw size={16} className="text-gold-400" />
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-4">
          {filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const isExpanded = expandedOrder === order.id;
                const isPending = order.status === 'pending';
                
                return (
                  <div 
                    key={order.id}
                    className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden"
                  >
                    {/* Header Row */}
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center gap-4">
                        {getTypeBadge(order.order_type)}
                        <div>
                          <span className="text-white font-medium">
                            {order.from_amount} {order.from_asset}
                          </span>
                          <span className="text-gray-400 mx-2">→</span>
                          <span className="text-gold-400">
                            {order.to_amount?.toFixed(6) || '...'} {order.to_asset}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm hidden md:block">
                          {order.user_email}
                        </span>
                        {getStatusBadge(order.status)}
                        {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-zinc-700/50">
                        {/* Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                          <div>
                            <p className="text-gray-500 text-sm">De</p>
                            <p className="text-white">{order.from_amount} {order.from_asset}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Para</p>
                            <p className="text-gold-400">{order.to_amount?.toFixed(6) || 'N/A'} {order.to_asset}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Taxa</p>
                            <p className="text-white">{order.fee_amount?.toFixed(4) || '0'} {order.from_asset}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-sm">Data do Pedido</p>
                            <p className="text-white">{formatDate(order.created_at)}</p>
                          </div>
                        </div>

                        {/* Price Info */}
                        <div className="border-t border-zinc-700/50 pt-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-gray-500 text-sm">Preço de Execução</p>
                              <p className="text-white">{order.price?.toFixed(2) || 'N/A'} {order.currency}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-sm">Método de Pagamento</p>
                              <p className="text-white capitalize">{order.payment_method || 'wallet'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-sm">ID da Ordem</p>
                              <p className="text-white font-mono text-sm">{order.id?.slice(0, 12)}...</p>
                            </div>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="border-t border-zinc-700/50 pt-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-gray-500 text-sm">Email do Cliente</p>
                              <p className="text-white">{order.user_email}</p>
                            </div>
                            {order.user_name && (
                              <div>
                                <p className="text-gray-500 text-sm">Nome do Cliente</p>
                                <p className="text-white">{order.user_name}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {isPending && (
                          <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-700/50">
                            <Button
                              onClick={() => handleComplete(order.id)}
                              disabled={processing === order.id}
                              className="bg-green-600 hover:bg-green-500"
                            >
                              {processing === order.id ? (
                                <Loader2 className="animate-spin mr-2" size={16} />
                              ) : (
                                <CheckCircle size={16} className="mr-2" />
                              )}
                              Completar
                            </Button>
                            <Button
                              onClick={() => handleCancel(order.id)}
                              disabled={processing === order.id}
                              variant="outline"
                              className="border-red-800/30 text-red-400 hover:bg-red-900/30"
                            >
                              <XCircle size={16} className="mr-2" />
                              Cancelar
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
              <Receipt className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Ordens</h3>
              <p className="text-gray-400">Nenhuma ordem de trading encontrada.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrders;
