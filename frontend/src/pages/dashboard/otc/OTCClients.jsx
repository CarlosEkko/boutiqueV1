import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber, formatDate} from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  Users,
  Search,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Shield,
  Building,
  Mail,
  Phone,
  DollarSign,
  RefreshCw,
  Link,
  Unlink,
  Settings,
  Wallet,
  User,
  Globe,
  Copy,
  MessageCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRYPTO_COLORS = {
  BTC: 'text-orange-400',
  ETH: 'text-blue-400',
  USDT: 'text-green-400',
  USDC: 'text-blue-300',
  SOL: 'text-purple-400',
  XRP: 'text-gray-300',
  BNB: 'text-yellow-400',
};

const OTCClients = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialogs
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/otc/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data.clients || []);
    } catch (err) {
      toast.error('Erro ao carregar clientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allUsersData = response.data.users || response.data || [];
      setAllUsers(allUsersData);
      const clientUsers = allUsersData.filter(u => u.role === 'client' || u.user_type === 'client');
      setUsers(clientUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const getManagerName = (managerId) => {
    if (!managerId) return null;
    const manager = allUsers.find(u => u.id === managerId);
    return manager ? manager.name : managerId;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handleLinkUser = async () => {
    if (!selectedClient || !selectedUserId) {
      toast.error('Selecione um utilizador');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/otc/clients/${selectedClient.id}/link-user`, 
        { user_id: selectedUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Utilizador associado com sucesso! Agora tem acesso ao Portal OTC Trading.');
      fetchClients();
      setShowPermissionsDialog(false);
      setSelectedUserId('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao associar utilizador');
    }
  };

  const handleUnlinkUser = async (clientId) => {
    if (!window.confirm('Tem certeza que deseja remover o acesso deste utilizador ao Portal OTC Trading?')) {
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/otc/clients/${clientId}/unlink-user`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Acesso ao Portal OTC removido');
      fetchClients();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao remover acesso');
    }
  };

  const handleDeleteClient = async (clientId, entityName) => {
    if (!window.confirm(`Tem certeza que deseja eliminar o cliente "${entityName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/otc/clients/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Cliente OTC eliminado com sucesso');
      fetchClients();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar cliente');
    }
  };

  const handleUpdateLimits = async (clientId, dailyLimit, monthlyLimit) => {
    try {
      await axios.put(`${API_URL}/api/otc/clients/${clientId}`,
        { daily_limit_usd: dailyLimit, monthly_limit_usd: monthlyLimit },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Limites atualizados');
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar limites');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-900/30 text-green-400',
      inactive: 'bg-gray-900/30 text-gray-400',
      suspended: 'bg-red-900/30 text-red-400'
    };
    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso'
    };
    return <Badge className={colors[status] || 'bg-gray-900/30 text-gray-400'}>{labels[status] || status}</Badge>;
  };
  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Users className="text-gold-400" />
            Clientes OTC
          </h1>
          <p className="text-gray-400 mt-1">Gestão de clientes e permissões do Portal OTC Trading</p>
        </div>
        
        <Button onClick={fetchClients} variant="outline" className="border-gold-500/30">
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Clientes</p>
            <p className="text-2xl font-mono text-white">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Clientes Ativos</p>
            <p className="text-2xl font-mono text-green-400">
              {clients.filter(c => c.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Com Acesso Portal</p>
            <p className="text-2xl font-mono text-gold-400">
              {clients.filter(c => c.user_id).length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Sem Acesso Portal</p>
            <p className="text-2xl font-mono text-gray-400">
              {clients.filter(c => !c.user_id).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-gold-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <Input
                placeholder="Pesquisar por nome, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-gold-500/30"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all" className="text-white hover:bg-zinc-700">Todos</SelectItem>
                <SelectItem value="active" className="text-white hover:bg-zinc-700">Ativos</SelectItem>
                <SelectItem value="inactive" className="text-white hover:bg-zinc-700">Inativos</SelectItem>
                <SelectItem value="suspended" className="text-white hover:bg-zinc-700">Suspensos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="bg-zinc-900/50 border-gold-500/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gold-500/20 hover:bg-transparent">
                <TableHead className="text-gray-400">Entidade</TableHead>
                <TableHead className="text-gray-400">Contacto</TableHead>
                <TableHead className="text-gray-400">Manager</TableHead>
                <TableHead className="text-gray-400">Limite Diário</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Acesso Portal</TableHead>
                <TableHead className="text-gray-400 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="border-gold-500/10 hover:bg-zinc-800/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                          <Building size={18} className="text-gold-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{client.entity_name}</p>
                          <p className="text-gray-500 text-sm">{client.country}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-white text-sm">{client.contact_name}</p>
                      <p className="text-gray-500 text-sm">{client.contact_email}</p>
                    </TableCell>
                    <TableCell>
                      {client.account_manager_id ? (
                        <span className="text-gold-400 text-sm">{getManagerName(client.account_manager_id)}</span>
                      ) : (
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-gold-400 font-mono">${formatNumber(client.daily_limit_usd || 0)}</p>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(client.status)}
                    </TableCell>
                    <TableCell>
                      {client.user_id ? (
                        <Badge className="bg-green-900/30 text-green-400">
                          <UserCheck size={14} className="mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-900/30 text-gray-400">
                          <UserX size={14} className="mr-1" />
                          Sem Acesso
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDetailDialog(true);
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowPermissionsDialog(true);
                          }}
                          className="text-gold-400 hover:text-gold-300"
                          title="Gerir Permissões Portal"
                        >
                          <Shield size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClient(client.id, client.entity_name)}
                          className="text-red-400 hover:text-red-300"
                          title="Eliminar Cliente"
                          data-testid={`delete-otc-client-${client.id}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building className="text-gold-400" />
              {selectedClient?.entity_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-4 py-4">
              {/* Contact & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1 flex items-center gap-1">
                    <Mail size={12} /> Contacto
                  </p>
                  <p className="text-white">{selectedClient.contact_name}</p>
                  <p className="text-gray-400 text-sm">{selectedClient.contact_email}</p>
                  {selectedClient.contact_phone && <p className="text-gray-400 text-sm">{selectedClient.contact_phone}</p>}
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1 flex items-center gap-1">
                    <Globe size={12} /> Localização
                  </p>
                  <p className="text-white">{selectedClient.country || '-'}</p>
                  <p className="text-gray-400 text-sm capitalize">{selectedClient.entity_type || 'individual'}</p>
                </div>
              </div>

              {/* Account Manager */}
              <div className="p-3 bg-zinc-800/50 rounded-lg border border-gold-500/10">
                <p className="text-gray-400 text-xs uppercase mb-1 flex items-center gap-1">
                  <User size={12} /> Account Manager
                </p>
                {selectedClient.account_manager_id ? (
                  <p className="text-gold-400 font-medium" data-testid="client-manager">
                    {getManagerName(selectedClient.account_manager_id)}
                  </p>
                ) : (
                  <p className="text-gray-500 italic" data-testid="client-manager">Não atribuído</p>
                )}
              </div>

              {/* Limits & Settlement */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Limite Diário</p>
                  <p className="text-gold-400 font-mono text-xl" data-testid="client-daily-limit">
                    ${formatNumber(selectedClient.daily_limit_usd || 0)}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Limite Mensal</p>
                  <p className="text-gold-400 font-mono text-xl" data-testid="client-monthly-limit">
                    ${formatNumber(selectedClient.monthly_limit_usd || 0)}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Método Liquidação</p>
                  <p className="text-white uppercase">{selectedClient.default_settlement_method || selectedClient.default_settlement || '-'}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Status</p>
                  {getStatusBadge(selectedClient.status)}
                </div>
              </div>

              {/* Communication */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1 flex items-center gap-1">
                    <MessageCircle size={12} /> Contacto Preferido
                  </p>
                  <p className="text-white capitalize">{selectedClient.preferred_contact || 'email'}</p>
                </div>
                {selectedClient.telegram_group && (
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase mb-1">Telegram</p>
                    <p className="text-blue-400">{selectedClient.telegram_group}</p>
                  </div>
                )}
              </div>

              {/* Trading Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Volume Total</p>
                  <p className="text-white font-mono text-lg" data-testid="client-volume">
                    ${formatNumber(selectedClient.total_volume_usd || 0)}
                  </p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Total Operações</p>
                  <p className="text-white font-mono text-lg" data-testid="client-trades">
                    {selectedClient.total_trades || 0}
                  </p>
                </div>
              </div>

              {/* Wallets */}
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-gold-500/20">
                <p className="text-gold-400 font-medium mb-3 flex items-center gap-2">
                  <Wallet size={18} />
                  Carteiras ({selectedClient.wallet_addresses?.length || 0})
                </p>
                {selectedClient.wallet_addresses && selectedClient.wallet_addresses.length > 0 ? (
                  <div className="space-y-3">
                    {selectedClient.wallet_addresses.map((w, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/60 rounded-lg border border-zinc-700/50" data-testid={`wallet-${idx}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <span className={`font-bold text-sm ${CRYPTO_COLORS[w.asset?.toUpperCase()] || 'text-white'}`}>
                              {w.asset?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{w.asset?.toUpperCase() || 'N/A'}</span>
                              {w.network && (
                                <Badge className="bg-zinc-700 text-gray-300 text-xs">{w.network}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-gray-400 text-xs font-mono truncate max-w-[280px]">{w.address}</p>
                              <button
                                onClick={() => copyToClipboard(w.address)}
                                className="text-gray-500 hover:text-gold-400 transition-colors flex-shrink-0"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {w.balance !== undefined && w.balance !== null && (
                          <p className="text-gold-400 font-mono text-sm flex-shrink-0 ml-4">
                            {formatNumber(w.balance)} {w.asset?.toUpperCase()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-sm">Nenhuma carteira configurada</p>
                )}
              </div>
              
              {/* Portal Access Section */}
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-gold-500/20">
                <p className="text-gold-400 font-medium mb-3 flex items-center gap-2">
                  <Shield size={18} />
                  Acesso ao Portal OTC Trading
                </p>
                {selectedClient.user_id ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 flex items-center gap-2">
                        <UserCheck size={16} />
                        Acesso Ativo
                      </p>
                      <p className="text-gray-400 text-sm">User ID: {selectedClient.user_id}</p>
                    </div>
                    <Button
                      onClick={() => handleUnlinkUser(selectedClient.id)}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <Unlink size={16} className="mr-2" />
                      Remover Acesso
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 flex items-center gap-2">
                      <UserX size={16} />
                      Sem acesso ao portal
                    </p>
                    <Button
                      onClick={() => {
                        setShowDetailDialog(false);
                        setShowPermissionsDialog(true);
                      }}
                      className="bg-gold-500 hover:bg-gold-400 text-black"
                    >
                      <Link size={16} className="mr-2" />
                      Conceder Acesso
                    </Button>
                  </div>
                )}
              </div>

              {/* Delete Client */}
              <div className="pt-4 border-t border-zinc-700/50">
                <Button
                  onClick={() => handleDeleteClient(selectedClient.id, selectedClient.entity_name)}
                  variant="outline"
                  className="w-full border-red-600/50 text-red-400 hover:bg-red-900/20"
                  data-testid="delete-client-detail-btn"
                >
                  <Trash2 size={16} className="mr-2" />
                  Eliminar Cliente OTC
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="text-gold-400" />
              Conceder Acesso ao Portal OTC
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-gray-400 text-xs uppercase mb-1">Cliente OTC</p>
              <p className="text-white">{selectedClient?.entity_name}</p>
              <p className="text-gray-400 text-sm">{selectedClient?.contact_email}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Selecionar Utilizador Registado</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                  <SelectValue placeholder="Escolha um utilizador..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-gold-500/30 max-h-60">
                  {users.map((user) => (
                    <SelectItem 
                      key={user.id} 
                      value={user.id}
                      className="text-white hover:bg-zinc-700"
                    >
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-gray-500 text-xs">
                O utilizador selecionado terá acesso ao Portal OTC Trading e poderá criar pedidos de cotação.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPermissionsDialog(false)}
              className="border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLinkUser}
              disabled={!selectedUserId}
              className="bg-gold-500 hover:bg-gold-400 text-black"
            >
              <UserCheck size={16} className="mr-2" />
              Conceder Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCClients;
