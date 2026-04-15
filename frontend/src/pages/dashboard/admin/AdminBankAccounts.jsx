import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { toast } from 'sonner';
import { 
  Landmark, CheckCircle, XCircle, Clock, RefreshCw, 
  Search, Filter, User, Building, Globe, Eye,
  Check, X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminBankAccounts = () => {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Action dialog
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/bank-accounts/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(response.data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      toast.error('Falha ao carregar contas bancárias');
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (account, action) => {
    setSelectedAccount(account);
    setActionType(action);
    setRejectionReason('');
    setShowActionDialog(true);
  };

  const handleAction = async () => {
    if (!selectedAccount || !actionType) return;
    
    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Indique o motivo da rejeição');
      return;
    }

    setSubmitting(true);
    try {
      const updateData = {
        status: actionType === 'approve' ? 'verified' : 'rejected'
      };
      
      if (actionType === 'reject') {
        updateData.rejection_reason = rejectionReason;
      }

      await axios.put(
        `${API_URL}/api/bank-accounts/admin/${selectedAccount.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(actionType === 'approve' ? 'Conta verificada!' : 'Conta rejeitada');
      setShowActionDialog(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha na operação');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-0"><CheckCircle size={12} className="mr-1" /> Verificada</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-0"><Clock size={12} className="mr-1" /> Pendente</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-0"><XCircle size={12} className="mr-1" /> Rejeitada</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-0">{status}</Badge>;
    }
  };

  const maskIBAN = (iban) => {
    if (!iban || iban.length < 8) return iban;
    return iban.slice(0, 4) + ' •••• •••• ' + iban.slice(-4);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.iban?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Count by status
  const pendingCount = accounts.filter(a => a.status === 'pending').length;
  const verifiedCount = accounts.filter(a => a.status === 'verified').length;
  const rejectedCount = accounts.filter(a => a.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Landmark className="text-gold-400" />
            Verificação de Contas Bancárias
          </h1>
          <p className="text-gray-400">Aprovar ou rejeitar contas bancárias de clientes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700"
          onClick={fetchAccounts}
        >
          <RefreshCw size={14} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{accounts.length}</p>
              </div>
              <Landmark className="text-gold-400" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-900/20 border-yellow-800/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
              </div>
              <Clock className="text-yellow-400" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-900/20 border-emerald-800/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm">Verificadas</p>
                <p className="text-2xl font-bold text-emerald-400">{verifiedCount}</p>
              </div>
              <CheckCircle className="text-emerald-400" size={32} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-800/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm">Rejeitadas</p>
                <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
              </div>
              <XCircle className="text-red-400" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Pesquisar por nome, email, banco ou IBAN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-zinc-800 border-zinc-700 text-white">
                <Filter size={16} className="mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-white hover:bg-zinc-700">Todos</SelectItem>
                <SelectItem value="pending" className="text-white hover:bg-zinc-700">Pendentes</SelectItem>
                <SelectItem value="verified" className="text-white hover:bg-zinc-700">Verificadas</SelectItem>
                <SelectItem value="rejected" className="text-white hover:bg-zinc-700">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {filteredAccounts.length > 0 ? (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <Card key={account.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Account Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Building className="text-blue-400" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-medium">{account.bank_name}</h3>
                        {account.is_primary && (
                          <Badge className="bg-gold-500/20 text-gold-400 border-0 text-xs">Principal</Badge>
                        )}
                        {getStatusBadge(account.status)}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <User size={14} className="text-gray-500" />
                        <span className="text-gray-300">{account.user_name}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-400">{account.user_email}</span>
                      </div>

                      {/* Account Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                        {account.iban && (
                          <span className="text-gray-500">
                            <span className="text-gray-400">IBAN:</span> {maskIBAN(account.iban)}
                          </span>
                        )}
                        {account.swift_bic && (
                          <span className="text-gray-500">
                            <span className="text-gray-400">SWIFT:</span> {account.swift_bic}
                          </span>
                        )}
                        {account.account_number && !account.iban && (
                          <span className="text-gray-500">
                            <span className="text-gray-400">Conta:</span> •••• {account.account_number.slice(-4)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          <Globe size={12} className="mr-1" />
                          {account.country}
                        </Badge>
                        <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">
                          {account.currency}
                        </Badge>
                      </div>

                      {account.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-900/20 rounded border border-red-800/30">
                          <p className="text-red-400 text-xs">
                            <strong>Motivo:</strong> {account.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {account.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => openActionDialog(account, 'approve')}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          <Check size={16} className="mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => openActionDialog(account, 'reject')}
                          size="sm"
                          variant="outline"
                          className="border-red-800/30 text-red-400 hover:bg-red-900/30"
                        >
                          <X size={16} className="mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {account.status === 'rejected' && (
                      <Button
                        onClick={() => openActionDialog(account, 'approve')}
                        size="sm"
                        variant="outline"
                        className="border-emerald-800/30 text-emerald-400 hover:bg-emerald-900/30"
                      >
                        <Check size={16} className="mr-1" />
                        Aprovar
                      </Button>
                    )}
                    {account.status === 'verified' && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-800/30">
                        <CheckCircle size={14} className="mr-1" />
                        Verificada
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Landmark className="mx-auto mb-4 text-gray-500" size={48} />
            <h3 className="text-xl text-white mb-2">Sem Contas Bancárias</h3>
            <p className="text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nenhuma conta encontrada com os filtros aplicados.'
                : 'Não existem contas bancárias para verificar.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className={`bg-zinc-900 border-zinc-800 text-white max-w-md ${actionType === 'reject' ? 'border-red-500/30' : 'border-emerald-500/30'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${actionType === 'reject' ? 'text-red-400' : 'text-emerald-400'}`}>
              {actionType === 'approve' ? (
                <><CheckCircle size={20} /> Aprovar Conta Bancária</>
              ) : (
                <><XCircle size={20} /> Rejeitar Conta Bancária</>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {actionType === 'approve' 
                ? 'Confirma que verificou os dados desta conta bancária?'
                : 'Indique o motivo da rejeição para informar o cliente.'}
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && (
            <div className="py-4 space-y-4">
              <div className="p-3 bg-zinc-800/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Cliente</span>
                  <span className="text-white">{selectedAccount.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Banco</span>
                  <span className="text-white">{selectedAccount.bank_name}</span>
                </div>
                {selectedAccount.iban && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">IBAN</span>
                    <span className="text-white font-mono text-sm">{maskIBAN(selectedAccount.iban)}</span>
                  </div>
                )}
              </div>

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label className="text-gray-400">Motivo da Rejeição *</Label>
                  <Input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ex: IBAN inválido, documentos não correspondem..."
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={submitting}
              className={actionType === 'approve' 
                ? 'bg-emerald-600 hover:bg-emerald-500' 
                : 'bg-red-600 hover:bg-red-500'}
            >
              {submitting ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : actionType === 'approve' ? (
                <Check size={16} className="mr-2" />
              ) : (
                <X size={16} className="mr-2" />
              )}
              {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBankAccounts;
