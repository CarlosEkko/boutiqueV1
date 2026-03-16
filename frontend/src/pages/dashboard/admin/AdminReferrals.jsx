import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Users,
  UserPlus,
  ArrowLeftRight,
  Trash2,
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  X,
  Filter,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminReferrals = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [referrerStats, setReferrerStats] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReferrer, setFilterReferrer] = useState('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedNewReferrer, setSelectedNewReferrer] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [referralsRes, clientsRes, staffRes] = await Promise.all([
        axios.get(`${API_URL}/api/referrals/all`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/admin/users?user_type=client`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/admin/internal-users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setReferrals(referralsRes.data.referrals || []);
      setReferrerStats(referralsRes.data.referrer_stats || []);
      setClients(clientsRes.data.users || clientsRes.data || []);
      setStaffMembers(staffRes.data.users || staffRes.data || []);
    } catch (err) {
      toast.error('Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const createReferral = async () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/referrals/create`,
        {
          client_id: selectedClient,
          notes: notes || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Referência criada com sucesso');
      setShowCreateModal(false);
      setSelectedClient(null);
      setNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao criar referência');
    }
  };

  const transferReferral = async () => {
    if (!selectedNewReferrer) {
      toast.error('Selecione um novo referenciador');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/referrals/${selectedReferral.id}/transfer`,
        {
          new_referrer_id: selectedNewReferrer,
          reason: transferReason || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Referência transferida com sucesso');
      setShowTransferModal(false);
      setSelectedReferral(null);
      setSelectedNewReferrer('');
      setTransferReason('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao transferir referência');
    }
  };

  const removeReferral = async (referralId) => {
    if (!window.confirm('Tem certeza que deseja remover esta referência?')) return;

    try {
      await axios.delete(`${API_URL}/api/referrals/${referralId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Referência removida');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao remover referência');
    }
  };

  // Filter referrals
  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch = 
      ref.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.referrer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ref.status === filterStatus;
    const matchesReferrer = filterReferrer === 'all' || ref.referrer_id === filterReferrer;
    
    return matchesSearch && matchesStatus && matchesReferrer;
  });

  // Clients without referral
  const availableClients = clients.filter(c => 
    !referrals.find(r => r.client_id === c.id && r.status === 'active')
  );

  // Calculate totals
  const totalEarned = referrals.reduce((sum, r) => sum + (r.total_commissions_earned || 0), 0);
  const totalPending = referrals.reduce((sum, r) => sum + (r.pending_commissions || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <Users className="text-gold-400" />
            Gestão de Referências
          </h1>
          <p className="text-gray-400 mt-1">Gerir referenciação de clientes pela equipa</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchData}
            className="border-zinc-700 text-gray-300"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gold-500 hover:bg-gold-400 text-black"
          >
            <UserPlus size={16} className="mr-2" />
            Nova Referência
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Referências</p>
                <p className="text-2xl font-light text-white">{referrals.length}</p>
              </div>
              <Users className="text-gold-400" size={24} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Referências Ativas</p>
                <p className="text-2xl font-light text-green-400">
                  {referrals.filter(r => r.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-emerald-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Comissões Ganhas</p>
                <p className="text-2xl font-light text-emerald-400">€{totalEarned.toFixed(2)}</p>
              </div>
              <TrendingUp className="text-emerald-400" size={24} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-amber-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Comissões Pendentes</p>
                <p className="text-2xl font-light text-amber-400">€{totalPending.toFixed(2)}</p>
              </div>
              <Clock className="text-amber-400" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrer Stats */}
      {referrerStats.length > 0 && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Desempenho por Referenciador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 px-3 text-gray-400 font-medium">Referenciador</th>
                    <th className="text-center py-2 px-3 text-gray-400 font-medium">Clientes Ativos</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">Comissões Ganhas</th>
                    <th className="text-right py-2 px-3 text-gray-400 font-medium">Pendente</th>
                  </tr>
                </thead>
                <tbody>
                  {referrerStats.map((stat, idx) => (
                    <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-3">
                        <p className="text-white font-medium">{stat.name}</p>
                        <p className="text-sm text-gray-500">{stat.email}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className="bg-gold-500/20 text-gold-400">{stat.active_count}</Badge>
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400">
                        €{(stat.total_earned || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-400">
                        €{(stat.total_pending || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Pesquisar por cliente ou referenciador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">Todos os estados</option>
          <option value="active">Ativas</option>
          <option value="transferred">Transferidas</option>
          <option value="removed">Removidas</option>
        </select>
        <select
          value={filterReferrer}
          onChange={(e) => setFilterReferrer(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">Todos os referenciadores</option>
          {staffMembers.map(staff => (
            <option key={staff.id} value={staff.id}>{staff.name}</option>
          ))}
        </select>
      </div>

      {/* Referrals Table */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/30">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Cliente</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Referenciador</th>
                  <th className="text-center py-3 px-4 text-gray-400 font-medium">Estado</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Comissões</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Data</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      Nenhuma referência encontrada
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((ref) => (
                    <tr key={ref.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <p className="text-white font-medium">{ref.client_name}</p>
                        <p className="text-sm text-gray-500">{ref.client_email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-white">{ref.referrer_name}</p>
                        <p className="text-sm text-gray-500">{ref.referrer_email}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={
                          ref.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          ref.status === 'transferred' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }>
                          {ref.status === 'active' ? 'Ativa' :
                           ref.status === 'transferred' ? 'Transferida' : 'Removida'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="text-emerald-400">€{(ref.total_commissions_earned || 0).toFixed(2)}</p>
                        {ref.pending_commissions > 0 && (
                          <p className="text-xs text-amber-400">
                            (€{ref.pending_commissions.toFixed(2)} pendente)
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(ref.created_at).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {ref.status === 'active' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReferral(ref);
                                setShowTransferModal(true);
                              }}
                              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                            >
                              <ArrowLeftRight size={14} className="mr-1" />
                              Transferir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeReferral(ref.id)}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Referral Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-zinc-900 border-zinc-700 max-w-md w-full">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="text-gold-400" size={20} />
                  Nova Referência
                </span>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Selecionar Cliente</label>
                <select
                  value={selectedClient || ''}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Escolha um cliente...</option>
                  {availableClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {availableClients.length} clientes disponíveis para referenciação
                </p>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Notas (opcional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre esta referência..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  O cliente será atribuído a si ({user?.name}). 
                  Você receberá comissões das transações deste cliente.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border-zinc-600 text-white"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={createReferral}
                  disabled={!selectedClient}
                  className="flex-1 bg-gold-500 hover:bg-gold-400 text-black"
                >
                  Criar Referência
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedReferral && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-zinc-900 border-zinc-700 max-w-md w-full">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ArrowLeftRight className="text-blue-400" size={20} />
                  Transferir Referência
                </span>
                <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Cliente</p>
                <p className="text-white font-medium">{selectedReferral.client_name}</p>
                <p className="text-gray-500 text-sm">{selectedReferral.client_email}</p>
              </div>
              
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-gray-400 text-sm">Referenciador Atual</p>
                <p className="text-white">{selectedReferral.referrer_name}</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Novo Referenciador</label>
                <select
                  value={selectedNewReferrer}
                  onChange={(e) => setSelectedNewReferrer(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Escolha um membro da equipa...</option>
                  {staffMembers
                    .filter(s => s.id !== selectedReferral.referrer_id)
                    .map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.internal_role || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Motivo (opcional)</label>
                <Input
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Razão da transferência..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 border-zinc-600 text-white"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={transferReferral}
                  disabled={!selectedNewReferrer}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Transferir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminReferrals;
