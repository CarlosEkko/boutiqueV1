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
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminFiatWithdrawals = () => {
  const { token } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Levantamento aprovado');
      fetchWithdrawals();
    } catch (err) {
      toast.error('Erro ao aprovar levantamento');
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/fiat-withdrawals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Levantamento rejeitado');
      fetchWithdrawals();
    } catch (err) {
      toast.error('Erro ao rejeitar levantamento');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', icon: Clock },
      approved: { color: 'bg-green-900/30 text-green-400 border-green-800/30', icon: CheckCircle },
      rejected: { color: 'bg-red-900/30 text-red-400 border-red-800/30', icon: XCircle },
      processing: { color: 'bg-blue-900/30 text-blue-400 border-blue-800/30', icon: Clock },
    };
    const { color, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={`${color} border flex items-center gap-1`}>
        <Icon size={12} />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <ArrowDownToLine className="text-gold-400" />
          Levantamentos Fiat
        </h1>
        <p className="text-gray-400 mt-1">Aprovar pedidos de levantamento em moeda fiat</p>
      </div>

      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {withdrawals.length > 0 ? (
            <div className="divide-y divide-gold-800/10">
              {withdrawals.map(withdrawal => (
                <div key={withdrawal.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {withdrawal.amount} {withdrawal.currency}
                    </p>
                    <p className="text-sm text-gray-400">
                      {withdrawal.user_email} • {new Date(withdrawal.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      IBAN: {withdrawal.iban || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(withdrawal.status)}
                    {withdrawal.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(withdrawal.id)}
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Aprovar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReject(withdrawal.id)}
                          className="border-red-800/30 text-red-400 hover:bg-red-900/30"
                        >
                          <XCircle size={14} className="mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
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
