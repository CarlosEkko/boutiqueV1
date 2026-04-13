import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { X, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusColors = {
  pending: 'text-yellow-400 bg-yellow-500/10',
  awaiting_payment: 'text-orange-400 bg-orange-500/10',
  awaiting_admin_approval: 'text-amber-400 bg-amber-500/10',
  processing: 'text-blue-400 bg-blue-500/10',
  completed: 'text-green-400 bg-green-500/10',
  cancelled: 'text-gray-400 bg-gray-500/10',
  failed: 'text-red-400 bg-red-500/10',
};

const statusLabels = {
  pending: 'Pending',
  awaiting_payment: 'Awaiting Payment',
  awaiting_admin_approval: 'Awaiting Approval',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

const formatTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const OpenOrders = ({ refreshTrigger }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('open');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/trading/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
    } catch {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders, refreshTrigger]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const cancelOrder = async (orderId) => {
    setCancelling(orderId);
    try {
      await axios.post(`${API_URL}/api/trading/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ordem cancelada');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao cancelar');
    } finally {
      setCancelling(null);
    }
  };

  const openStatuses = ['pending', 'awaiting_payment', 'awaiting_admin_approval', 'processing'];
  const openOrders = orders.filter(o => openStatuses.includes(o.status));
  const historyOrders = orders.filter(o => !openStatuses.includes(o.status));
  const displayOrders = activeTab === 'open' ? openOrders : historyOrders;

  return (
    <div className="flex flex-col h-full text-xs" data-testid="open-orders">
      {/* Tabs */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-zinc-800 shrink-0">
        {[
          { key: 'open', label: `Open Orders (${openOrders.length})` },
          { key: 'history', label: 'Order History' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`text-xs pb-1 border-b-2 transition-colors ${activeTab === tab.key ? 'text-gold-400 border-gold-400' : 'text-gray-500 border-transparent hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-8 gap-2 px-3 py-1 text-[10px] text-gray-500 border-b border-zinc-800/50 shrink-0">
        <span>Date</span>
        <span>Pair</span>
        <span>Type</span>
        <span>Side</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
        <span className="text-right">Status</span>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-gray-500" />
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-gray-600 text-xs">
            {activeTab === 'open' ? 'No open orders' : 'No order history'}
          </div>
        ) : (
          displayOrders.map(order => {
            const isBuy = order.order_type === 'buy';
            const isSwap = order.order_type === 'swap';
            const canCancel = openStatuses.includes(order.status);
            const pair = isSwap
              ? `${order.from_crypto || '?'}/${order.to_crypto || '?'}`
              : `${order.crypto_symbol || '?'}/USDT`;

            return (
              <div key={order.id} className="grid grid-cols-8 gap-2 px-3 py-1.5 hover:bg-zinc-800/30 items-center group">
                <span className="text-gray-400">{formatTime(order.created_at)}</span>
                <span className="text-white font-medium">{pair}</span>
                <span className="text-gray-300 capitalize">{order.order_type}</span>
                <span className={isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                  {isBuy ? 'Buy' : isSwap ? 'Swap' : 'Sell'}
                </span>
                <span className="text-right text-gray-300 font-mono">
                  ${order.execution_price?.toFixed(2) || order.fiat_amount?.toFixed(2) || '-'}
                </span>
                <span className="text-right text-white font-mono">
                  {order.crypto_amount?.toFixed(6) || order.from_amount?.toFixed(6) || '-'}
                </span>
                <span className="text-right text-gray-300 font-mono">
                  ${order.fiat_amount?.toFixed(2) || '-'}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[order.status] || 'text-gray-400'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  {canCancel && (
                    <button onClick={() => cancelOrder(order.id)}
                      disabled={cancelling === order.id}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1"
                      data-testid={`cancel-order-${order.id}`}>
                      {cancelling === order.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OpenOrders;
