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
  Eye,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminFiatDeposits = () => {
  const { token } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${depositId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Depósito aprovado');
      fetchDeposits();
    } catch (err) {
      toast.error('Erro ao aprovar depósito');
    }
  };

  const handleReject = async (depositId) => {
    try {
      await axios.post(`${API_URL}/api/trading/admin/bank-transfers/${depositId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Depósito rejeitado');
      fetchDeposits();
    } catch (err) {
      toast.error('Erro ao rejeitar depósito');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30', icon: Clock },
      approved: { color: 'bg-green-900/30 text-green-400 border-green-800/30', icon: CheckCircle },
      rejected: { color: 'bg-red-900/30 text-red-400 border-red-800/30', icon: XCircle },
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
          <ArrowUpToLine className="text-gold-400" />
          Depósitos Fiat
        </h1>
        <p className="text-gray-400 mt-1">Aprovar depósitos de transferência bancária</p>
      </div>

      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {deposits.length > 0 ? (
            <div className="divide-y divide-gold-800/10">
              {deposits.map(deposit => (
                <div key={deposit.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">
                      {deposit.amount} {deposit.currency}
                    </p>
                    <p className="text-sm text-gray-400">
                      {deposit.user_email} • {new Date(deposit.created_at).toLocaleDateString()}
                    </p>
                    {deposit.proof_url && (
                      <a href={deposit.proof_url} target="_blank" rel="noopener noreferrer" 
                         className="text-xs text-gold-400 flex items-center gap-1 mt-1">
                        <FileText size={12} /> Ver comprovativo
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(deposit.status)}
                    {deposit.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleApprove(deposit.id)}
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Aprovar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReject(deposit.id)}
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
