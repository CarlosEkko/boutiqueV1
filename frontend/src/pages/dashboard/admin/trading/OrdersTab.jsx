import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import {
  TrendingUp, CheckCircle, XCircle, RefreshCw, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDate } from '../../../../utils/formatters';

const OrdersTab = ({
  orders, ordersFilter, setOrdersFilter, expandedOrder, setExpandedOrder,
  loading, fetchOrders, completeOrder, cancelOrder,
}) => {
  return (
    <Card className="bg-zinc-900/50 border-gold-800/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2"><TrendingUp size={20} className="text-gold-400" />Ordens de Trading</div>
          <Button variant="ghost" size="sm" onClick={fetchOrders}><RefreshCw size={16} /></Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <select value={ordersFilter.status} onChange={(e) => setOrdersFilter({ ...ordersFilter, status: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" data-testid="orders-status-filter">
            <option value="">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="awaiting_payment">Aguardando Pagamento</option>
            <option value="awaiting_admin_approval">Aguardando Aprovacao</option>
            <option value="processing">Processando</option>
            <option value="completed">Completo</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select value={ordersFilter.type} onChange={(e) => setOrdersFilter({ ...ordersFilter, type: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white" data-testid="orders-type-filter">
            <option value="">Todos os Tipos</option>
            <option value="buy">Compra</option>
            <option value="sell">Venda</option>
            <option value="swap">Conversao</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-gold-400" size={32} /></div>
        ) : orders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Nenhuma ordem encontrada</p>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-zinc-800/50 rounded-lg overflow-hidden" data-testid={`order-card-${order.id}`}>
                <div className="p-4 cursor-pointer hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2 py-1 rounded ${order.order_type === 'buy' ? 'bg-green-500/20 text-green-400' : order.order_type === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {order.order_type === 'buy' ? 'Compra' : order.order_type === 'sell' ? 'Venda' : 'Swap'}
                      </span>
                      <div>
                        <span className="text-white font-medium">{order.crypto_amount?.toFixed(6)} {order.crypto_symbol}</span>
                        <span className="text-gray-400 ml-2">(${order.fiat_amount?.toFixed(2)})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs px-2 py-1 rounded ${order.status === 'completed' ? 'bg-green-500/20 text-green-400' : order.status === 'awaiting_admin_approval' ? 'bg-yellow-500/20 text-yellow-400' : order.status === 'cancelled' || order.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {order.status === 'awaiting_admin_approval' ? 'Aguardando Aprovacao' : order.status}
                      </span>
                      {expandedOrder === order.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>
                </div>
                {expandedOrder === order.id && (
                  <div className="px-4 pb-4 border-t border-zinc-700 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div><span className="text-gray-400 block">Usuario</span><span className="text-white">{order.user_email}</span></div>
                      <div><span className="text-gray-400 block">Preco</span><span className="text-white">${order.execution_price?.toFixed(2)}</span></div>
                      <div><span className="text-gray-400 block">Taxa</span><span className="text-white">${order.fee_amount?.toFixed(2)}</span></div>
                      <div><span className="text-gray-400 block">Data</span><span className="text-white">{formatDate(order.created_at, true)}</span></div>
                    </div>
                    {order.status === 'awaiting_admin_approval' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => completeOrder(order.id)} data-testid={`complete-order-${order.id}`}>
                          <CheckCircle size={16} className="mr-1" />Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => cancelOrder(order.id)} data-testid={`cancel-order-${order.id}`}>
                          <XCircle size={16} className="mr-1" />Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrdersTab;
