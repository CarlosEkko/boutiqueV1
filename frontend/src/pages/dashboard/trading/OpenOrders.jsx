import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { X, Loader2, LogIn } from 'lucide-react';
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

const OpenOrders = ({ refreshTrigger, isLoggedIn }) => {
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

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, token]);

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
  const completedOrders = orders.filter(o => o.status === 'completed');
  const allHistory = orders.filter(o => !openStatuses.includes(o.status));

  // Holdings: group completed buy orders by crypto
  const holdings = {};
  completedOrders.forEach(o => {
    if (o.order_type === 'buy' && o.crypto_symbol) {
      if (!holdings[o.crypto_symbol]) holdings[o.crypto_symbol] = { symbol: o.crypto_symbol, amount: 0, totalCost: 0 };
      holdings[o.crypto_symbol].amount += o.crypto_amount || 0;
      holdings[o.crypto_symbol].totalCost += o.fiat_amount || 0;
    }
  });
  const holdingsList = Object.values(holdings);

  const TABS = [
    { key: 'open', label: `Open Orders(${openOrders.length})` },
    { key: 'history', label: 'Order History' },
    { key: 'trades', label: 'Trade History' },
    { key: 'holdings', label: 'Holdings' },
  ];

  const renderOrders = (list, showCancel = false) => {
    if (!isLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <LogIn size={24} className="mb-2 text-gray-600" />
          <p className="text-xs">Log in to view your orders</p>
        </div>
      );
    }
    if (loading && orders.length === 0) {
      return <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-gray-500" /></div>;
    }
    if (list.length === 0) {
      return <div className="flex items-center justify-center py-8 text-gray-600 text-xs">No orders found</div>;
    }
    return list.map(order => {
      const isBuy = order.order_type === 'buy';
      const isSwap = order.order_type === 'swap';
      const canCancel = showCancel && openStatuses.includes(order.status);
      const pair = isSwap ? `${order.from_crypto || '?'}/${order.to_crypto || '?'}` : `${order.crypto_symbol || '?'}/USDT`;

      return (
        <div key={order.id} className="grid grid-cols-8 gap-2 px-3 py-1.5 hover:bg-zinc-800/30 items-center group">
          <span className="text-gray-400">{formatTime(order.created_at)}</span>
          <span className="text-white font-medium">{pair}</span>
          <span className="text-gray-300 capitalize">{order.order_type}</span>
          <span className={isBuy ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>{isBuy ? 'Buy' : isSwap ? 'Swap' : 'Sell'}</span>
          <span className="text-right text-gray-300 font-mono">${order.execution_price?.toFixed(2) || '-'}</span>
          <span className="text-right text-white font-mono">{order.crypto_amount?.toFixed(6) || '-'}</span>
          <span className="text-right text-gray-300 font-mono">${order.fiat_amount?.toFixed(2) || '-'}</span>
          <div className="flex items-center justify-end gap-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[order.status] || 'text-gray-400'}`}>
              {statusLabels[order.status] || order.status}
            </span>
            {canCancel && (
              <button onClick={() => cancelOrder(order.id)} disabled={cancelling === order.id}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1"
                data-testid={`cancel-order-${order.id}`}>
                {cancelling === order.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
              </button>
            )}
          </div>
        </div>
      );
    });
  };

  const renderHoldings = () => {
    if (!isLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <LogIn size={24} className="mb-2 text-gray-600" />
          <p className="text-xs">Log in to view your holdings</p>
        </div>
      );
    }
    if (holdingsList.length === 0) {
      return <div className="flex items-center justify-center py-8 text-gray-600 text-xs">No holdings</div>;
    }
    return holdingsList.map(h => (
      <div key={h.symbol} className="grid grid-cols-4 gap-2 px-3 py-2 hover:bg-zinc-800/30 items-center">
        <span className="text-white font-medium">{h.symbol}</span>
        <span className="text-right text-white font-mono">{h.amount.toFixed(6)}</span>
        <span className="text-right text-gray-300 font-mono">${h.totalCost.toFixed(2)}</span>
        <span className="text-right text-gray-400 font-mono">${h.amount > 0 ? (h.totalCost / h.amount).toFixed(2) : '0.00'}</span>
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full text-xs" data-testid="open-orders">
      {/* Tab bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-zinc-800 shrink-0">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`text-xs py-1 border-b-2 transition-colors ${activeTab === tab.key ? 'text-gold-400 border-gold-400' : 'text-gray-500 border-transparent hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
        {activeTab === 'trades' && (
          <div className="ml-auto border-b-2 border-transparent">
            <span className="h-1 w-6 bg-[#0ecb81] rounded-full inline-block mr-0.5" />
            <span className="h-1 w-6 bg-[#f6465d] rounded-full inline-block" />
          </div>
        )}
      </div>

      {/* Table header */}
      {(activeTab === 'open' || activeTab === 'history' || activeTab === 'trades') && (
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
      )}

      {activeTab === 'holdings' && (
        <div className="grid grid-cols-4 gap-2 px-3 py-1 text-[10px] text-gray-500 border-b border-zinc-800/50 shrink-0">
          <span>Asset</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total Cost</span>
          <span className="text-right">Avg Price</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'open' && renderOrders(openOrders, true)}
        {activeTab === 'history' && renderOrders(allHistory)}
        {activeTab === 'trades' && renderOrders(completedOrders)}
        {activeTab === 'holdings' && renderHoldings()}
      </div>
    </div>
  );
};

export default OpenOrders;
