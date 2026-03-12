import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Receipt, 
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminOrders = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', icon: Clock },
      completed: { color: 'bg-green-900/30 text-green-400 border-green-800/30', icon: CheckCircle },
      cancelled: { color: 'bg-red-900/30 text-red-400 border-red-800/30', icon: XCircle },
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={`${color} border flex items-center gap-1`}>
        <Icon size={12} />
        {status}
      </Badge>
    );
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Receipt className="text-gold-400" />
            Ordens de Trading
          </h1>
          <p className="text-gray-400 mt-1">Gerir e aprovar ordens de compra/venda</p>
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'completed', 'cancelled'].map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-gold-500' : 'border-gold-800/30'}
            >
              {f === 'all' ? 'Todas' : f}
            </Button>
          ))}
        </div>
      </div>

      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {filteredOrders.length > 0 ? (
            <div className="divide-y divide-gold-800/10">
              {filteredOrders.map(order => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {order.order_type?.toUpperCase()} - {order.from_amount} {order.from_asset}
                    </p>
                    <p className="text-sm text-gray-400">
                      {order.user_email} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <Button size="sm" variant="outline" className="border-gold-800/30">
                      <Eye size={14} className="mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
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
