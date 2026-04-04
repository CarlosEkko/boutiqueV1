import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminAdmissionFees = () => {
  const { token } = useAuth();
  const [allPayments, setAllPayments] = useState([]);  // All payments for stats
  const [filteredPayments, setFilteredPayments] = useState([]);  // Filtered for table
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');  // Default to 'all' to show everything
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    fetchAllPayments();
  }, []);

  useEffect(() => {
    // Filter payments based on selected filter
    if (filter === 'all') {
      setFilteredPayments(allPayments);
    } else if (filter === 'approved') {
      setFilteredPayments(allPayments.filter(p => p.status === 'approved' || p.status === 'paid'));
    } else {
      setFilteredPayments(allPayments.filter(p => p.status === filter));
    }
  }, [filter, allPayments]);

  const fetchAllPayments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/referrals/admission-fee/payments?status=all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllPayments(response.data);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;
    
    setApproving(true);
    try {
      await axios.post(
        `${API_URL}/api/referrals/admission-fee/${selectedPayment.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pagamento aprovado com sucesso!');
      setShowApproveDialog(false);
      setSelectedPayment(null);
      fetchAllPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar pagamento');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    
    setRejecting(true);
    try {
      await axios.post(
        `${API_URL}/api/referrals/admission-fee/${selectedPayment.id}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pagamento rejeitado');
      setShowRejectDialog(false);
      setSelectedPayment(null);
      fetchAllPayments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao rejeitar pagamento');
    } finally {
      setRejecting(false);
    }
  };
  const formatAmount = (amount, currency) => {
    const symbols = { EUR: '€', USD: '$', AED: 'د.إ', BRL: 'R$' };
    const value = parseFloat(amount || 0);
    const parts = value.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${symbols[currency] || currency} ${parts.join('.')}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400"><Clock size={12} className="mr-1" /> Pendente</Badge>;
      case 'approved':
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle size={12} className="mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400"><XCircle size={12} className="mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  const getTierBadge = (tier) => {
    const colors = {
      broker: 'bg-sky-500/20 text-sky-400',
      standard: 'bg-gray-500/20 text-gray-300',
      premium: 'bg-amber-500/20 text-amber-400',
      vip: 'bg-purple-500/20 text-purple-400',
      institucional: 'bg-emerald-500/20 text-emerald-400'
    };
    return <Badge className={colors[tier] || colors.standard}>{tier?.toUpperCase() || 'STANDARD'}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white">Taxas de Admissão</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerir pagamentos de taxas de admissão dos clientes
          </p>
        </div>
        <Button
          onClick={fetchAllPayments}
          variant="outline"
          className="border-zinc-700 text-gray-300"
        >
          <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pendentes</p>
                <p className="text-2xl font-light text-yellow-400">
                  {allPayments.filter(p => p.status === 'pending').length}
                </p>
              </div>
              <Clock className="text-yellow-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Aprovados</p>
                <p className="text-2xl font-light text-green-400">
                  {allPayments.filter(p => p.status === 'approved' || p.status === 'paid').length}
                </p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rejeitados</p>
                <p className="text-2xl font-light text-red-400">
                  {allPayments.filter(p => p.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="text-red-400" size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total</p>
                <p className="text-2xl font-light text-white">
                  {allPayments.length}
                </p>
              </div>
              <CreditCard className="text-gold-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white font-light">Pagamentos</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-gold-400" size={32} />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-gray-400">Cliente</TableHead>
                  <TableHead className="text-gray-400">Tier</TableHead>
                  <TableHead className="text-gray-400">Valor</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                  <TableHead className="text-gray-400">Estado</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-zinc-800">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                          <User size={16} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{payment.user_name || 'N/A'}</p>
                          <p className="text-gray-500 text-xs">{payment.user_email || payment.user_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTierBadge(payment.tier)}</TableCell>
                    <TableCell className="text-white font-medium">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {formatDate(payment.created_at)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right">
                      {payment.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-500 text-white"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowApproveDialog(true);
                            }}
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowRejectDialog(true);
                            }}
                          >
                            <XCircle size={14} className="mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                      {payment.status === 'approved' && payment.approved_by && (
                        <span className="text-gray-500 text-xs">
                          Por: {payment.approved_by}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-400" size={20} />
              Aprovar Pagamento
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Confirma a aprovação deste pagamento de taxa de admissão?
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="text-white">{selectedPayment.user_name || selectedPayment.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tier:</span>
                {getTierBadge(selectedPayment.tier)}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valor:</span>
                <span className="text-green-400 font-medium">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              className="border-zinc-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {approving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <CheckCircle size={16} className="mr-2" />}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-400" size={20} />
              Rejeitar Pagamento
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem a certeza que deseja rejeitar este pagamento?
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="text-white">{selectedPayment.user_name || selectedPayment.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valor:</span>
                <span className="text-white">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              className="border-zinc-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {rejecting ? <RefreshCw className="animate-spin mr-2" size={16} /> : <XCircle size={16} className="mr-2" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdmissionFees;
