import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
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
  DialogDescription,
} from '../../../components/ui/dialog';
import { 
  Users, 
  CheckCircle, 
  XCircle,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Crown,
  Mail,
  Phone,
  Globe,
  Calendar,
  Ban,
  Trash2,
  AlertTriangle,
  Filter,
  Key,
  Copy,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved
  const [regionFilter, setRegionFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  const regions = [
    { value: 'all', label: 'Todas Regiões', flag: '🌐' },
    { value: 'europe', label: 'Europa', flag: '🇪🇺' },
    { value: 'mena', label: 'MENA', flag: '🌍' },
    { value: 'latam', label: 'LATAM', flag: '🌎' }
  ];

  useEffect(() => {
    fetchUsers();
  }, [token, filter, regionFilter]);

  const fetchUsers = async () => {
    try {
      let url = `${API_URL}/api/admin/users?`;
      if (filter === 'pending') url += 'is_approved=false&';
      if (filter === 'approved') url += 'is_approved=true&';
      if (regionFilter && regionFilter !== 'all') url += `region=${regionFilter}&`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out internal users - only show clients
      const clientUsers = response.data.filter(u => u.user_type !== 'internal');
      setUsers(clientUsers);
    } catch (err) {
      toast.error('Falha ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilizador aprovado');
      fetchUsers();
    } catch (err) {
      toast.error('Falha ao aprovar utilizador');
    }
  };

  const rejectUser = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Acesso revogado');
      fetchUsers();
    } catch (err) {
      toast.error('Falha ao revogar acesso');
    }
  };

  const blockUser = async () => {
    if (!selectedUser) return;
    try {
      await axios.post(`${API_URL}/api/admin/users/${selectedUser.id}/block`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilizador bloqueado');
      setShowBlockDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao bloquear utilizador');
    }
  };

  const unblockUser = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/unblock`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilizador desbloqueado');
      fetchUsers();
    } catch (err) {
      toast.error('Falha ao desbloquear utilizador');
    }
  };

  const deleteUser = async () => {
    if (!selectedUser) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilizador eliminado');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao eliminar utilizador');
    }
  };

  const resetPassword = async (generateRandom = false) => {
    if (!selectedUser) return;
    try {
      const password = generateRandom ? null : newPassword;
      if (!generateRandom && (!newPassword || newPassword.length < 6)) {
        toast.error('Password deve ter pelo menos 6 caracteres');
        return;
      }
      
      const response = await axios.post(
        `${API_URL}/api/admin/users/${selectedUser.id}/reset-password`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: password ? { new_password: password } : {}
        }
      );
      
      setGeneratedPassword(response.data.temporary_password);
      toast.success('Password alterada com sucesso');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao alterar password');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Password copiada para clipboard');
  };

  const openPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setGeneratedPassword('');
    setShowPasswordDialog(true);
  };

  const updateKYC = async (userId, status) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/kyc/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Estado KYC atualizado para ${status}`);
      fetchUsers();
    } catch (err) {
      toast.error('Falha ao atualizar estado KYC');
    }
  };

  const makeAdmin = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/make-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilizador é agora admin');
      fetchUsers();
    } catch (err) {
      toast.error('Falha ao promover utilizador');
    }
  };

  const removeAdmin = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/remove-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Direitos de admin removidos');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao remover direitos');
    }
  };

  const getRegionBadge = (region) => {
    const regionConfig = regions.find(r => r.value === region);
    if (!regionConfig) return null;
    return (
      <span className="flex items-center gap-1 text-sm">
        <span>{regionConfig.flag}</span>
        <span className="text-gray-400">{regionConfig.label}</span>
      </span>
    );
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getKYCBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-900/30 text-green-400">Aprovado</Badge>;
      case 'pending': return <Badge className="bg-gold-800/30 text-gold-400">Pendente</Badge>;
      case 'rejected': return <Badge className="bg-red-900/30 text-red-400">Rejeitado</Badge>;
      default: return <Badge className="bg-gray-900/30 text-gray-400">Não Iniciado</Badge>;
    }
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Users className="text-gold-400" />
            Gestão de Clientes
          </h1>
          <p className="text-gray-400 mt-1">Gerir utilizadores, aprovações e KYC</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-gold-500/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-700 border-2 border-gold-500/40 text-white placeholder:text-gray-400"
              />
            </div>
            
            {/* Region Filter */}
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-52 bg-zinc-700 border-2 border-gold-500/60 text-white hover:border-gold-400 hover:bg-zinc-600 transition-colors font-medium">
                <Globe size={16} className="mr-2 text-gold-400" />
                <SelectValue placeholder="Selecionar Região" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/50">
                {regions.map((region) => (
                  <SelectItem key={region.value} value={region.value} className="text-white hover:bg-gold-900/30 focus:bg-gold-900/30">
                    {region.flag} {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendentes' },
                { value: 'approved', label: 'Aprovados' }
              ].map((f) => (
                <Button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  variant={filter === f.value ? 'default' : 'outline'}
                  size="sm"
                  className={filter === f.value 
                    ? 'bg-gold-500 hover:bg-gold-400 font-medium' 
                    : 'border-2 border-gold-500/60 text-white hover:bg-gold-900/30 font-medium'
                  }
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <Card key={user.id} className={`border ${user.is_active === false ? 'bg-red-950/20 border-red-900/30' : 'bg-zinc-900/50 border-gold-800/20'}`}>
              <CardContent className="p-4">
                {/* User Row */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.is_active === false ? 'bg-red-500/20' : 'bg-gold-500/20'}`}>
                      <span className={`font-bold ${user.is_active === false ? 'text-red-400' : 'text-gold-400'}`}>
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{user.name}</p>
                        {user.is_admin && (
                          <Crown size={14} className="text-gold-400" />
                        )}
                        {user.is_active === false && (
                          <Badge className="bg-red-900/30 text-red-400 text-xs">Bloqueado</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Region & Status Badges */}
                    <div className="hidden md:flex items-center gap-2">
                      {getRegionBadge(user.region)}
                      {user.is_approved ? (
                        <Badge className="bg-green-900/30 text-green-400">Aprovado</Badge>
                      ) : (
                        <Badge className="bg-gold-800/30 text-gold-400">Pendente</Badge>
                      )}
                      {getKYCBadge(user.kyc_status)}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {!user.is_approved && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); approveUser(user.id); }}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Aprovar
                        </Button>
                      )}
                      {user.is_approved && user.is_active !== false && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); rejectUser(user.id); }}
                          size="sm"
                          variant="outline"
                          className="border-gold-800/30 text-gold-400 hover:bg-gold-900/30"
                        >
                          <XCircle size={16} className="mr-1" />
                          Revogar
                        </Button>
                      )}
                    </div>

                    {/* Expand Icon */}
                    {expandedUser === user.id ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedUser === user.id && (
                  <div className="mt-4 pt-4 border-t border-gold-800/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={16} />
                        <span className="text-white">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={16} />
                        <span className="text-white">{user.phone || 'Não fornecido'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Globe size={16} />
                        <span className="text-white">{user.country || 'Não fornecido'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={16} />
                        <span className="text-white">{formatDate(user.created_at)}</span>
                      </div>
                    </div>

                    {/* Region Display */}
                    <div className="mb-4 p-3 bg-zinc-800/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Região:</span>
                        {getRegionBadge(user.region) || <span className="text-gray-500">Não definida</span>}
                      </div>
                    </div>

                    {/* KYC Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-gray-400 text-sm mr-2">Estado KYC:</span>
                      {['not_started', 'pending', 'approved', 'rejected'].map((status) => (
                        <Button
                          key={status}
                          onClick={() => updateKYC(user.id, status)}
                          size="sm"
                          variant={user.kyc_status === status ? 'default' : 'outline'}
                          className={user.kyc_status === status 
                            ? 'bg-gold-500 hover:bg-gold-400' 
                            : 'border-gold-800/30 text-gray-400 hover:text-white text-xs'
                          }
                        >
                          {status === 'not_started' ? 'Não Iniciado' : 
                           status === 'pending' ? 'Pendente' :
                           status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </Button>
                      ))}
                    </div>

                    {/* Admin Toggle */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-gray-400 text-sm mr-2">Direitos Admin:</span>
                      {user.is_admin ? (
                        <Button
                          onClick={() => removeAdmin(user.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                        >
                          <Shield size={14} className="mr-1" />
                          Remover Admin
                        </Button>
                      ) : (
                        <Button
                          onClick={() => makeAdmin(user.id)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-500"
                        >
                          <Crown size={14} className="mr-1" />
                          Tornar Admin
                        </Button>
                      )}
                    </div>

                    {/* Block/Delete Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gold-800/20">
                      <span className="text-gray-400 text-sm mr-2">Ações:</span>
                      
                      {/* Password Reset */}
                      <Button
                        onClick={() => openPasswordDialog(user)}
                        size="sm"
                        variant="outline"
                        className="border-blue-900/30 text-blue-400 hover:bg-blue-900/30"
                      >
                        <Key size={14} className="mr-1" />
                        Alterar Password
                      </Button>

                      {user.is_active === false ? (
                        <Button
                          onClick={() => unblockUser(user.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Desbloquear
                        </Button>
                      ) : (
                        <Button
                          onClick={() => { setSelectedUser(user); setShowBlockDialog(true); }}
                          size="sm"
                          variant="outline"
                          className="border-orange-900/30 text-orange-400 hover:bg-orange-900/30"
                        >
                          <Ban size={14} className="mr-1" />
                          Bloquear
                        </Button>
                      )}
                      <Button
                        onClick={() => { setSelectedUser(user); setShowDeleteDialog(true); }}
                        size="sm"
                        variant="outline"
                        className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <Users className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Utilizadores</h3>
              <p className="text-gray-400">Nenhum utilizador corresponde aos critérios de pesquisa.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <Ban size={20} />
              Bloquear Utilizador
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem a certeza que deseja bloquear <span className="text-white font-medium">{selectedUser?.name}</span>?
              O utilizador não poderá aceder à plataforma.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBlockDialog(false)}
              className="border-gold-800/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={blockUser}
              className="bg-orange-600 hover:bg-orange-500"
            >
              <Ban size={16} className="mr-2" />
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle size={20} />
              Eliminar Utilizador
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem a certeza que deseja eliminar permanentemente <span className="text-white font-medium">{selectedUser?.name}</span>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-gold-800/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={deleteUser}
              className="bg-red-600 hover:bg-red-500"
            >
              <Trash2 size={16} className="mr-2" />
              Eliminar Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
