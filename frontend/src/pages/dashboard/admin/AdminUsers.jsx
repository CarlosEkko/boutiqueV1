import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber, formatDate} from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useLanguage } from '../../../i18n';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs';
import { 
  Users, 
  CheckCircle, 
  XCircle,
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
  Key,
  Copy,
  RefreshCw,
  Info,
  Wallet,
  History,
  UserCheck,
  Building,
  MapPin,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  UserCog,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminUsers = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved
  const [regionFilter, setRegionFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  
  // Account Manager states
  const [staffMembers, setStaffMembers] = useState([]);
  const [showAssignManagerDialog, setShowAssignManagerDialog] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const regions = [
    { value: 'all', label: 'Todas Regiões', flag: '🌐' },
    { value: 'europe', label: 'Europa', flag: '🇪🇺' },
    { value: 'mena', label: 'MENA', flag: '🌍' },
    { value: 'latam', label: 'LATAM', flag: '🌎' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchStaffMembers();
  }, [token, filter, regionFilter]);

  const fetchStaffMembers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users?user_type=internal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const staff = (response.data || []).filter(u => u.user_type === 'internal' || u.is_admin);
      setStaffMembers(staff);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const assignAccountManager = async () => {
    if (!selectedUser) return;
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${selectedUser.id}/assign-manager`,
        { manager_id: selectedManagerId === 'none' ? null : selectedManagerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(selectedManagerId && selectedManagerId !== 'none' ? 'Account Manager atribuído!' : 'Account Manager removido');
      fetchUsers();
      setShowAssignManagerDialog(false);
      setSelectedUser(null);
      setSelectedManagerId('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atribuir Account Manager');
    }
  };

  const getManagerName = (managerId) => {
    if (!managerId) return null;
    const manager = staffMembers.find(s => s.id === managerId);
    return manager ? manager.name : 'Desconhecido';
  };

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

  const openDetailsDialog = async (user) => {
    setSelectedUser(user);
    setClientDetails(null);
    setShowDetailsDialog(true);
    setLoadingDetails(true);
    
    try {
      const response = await axios.get(`${API_URL}/api/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientDetails(response.data);
    } catch (err) {
      toast.error('Falha ao carregar detalhes do cliente');
      console.error('Error fetching client details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getReferrerInfo = (details) => {
    // Check assigned_to first, then invited_by
    const managerId = details?.assigned_to || details?.invited_by;
    if (!managerId) return null;
    // Find in staff members first, then in users list
    const manager = staffMembers.find(s => s.id === managerId) || users.find(u => u.id === managerId);
    return manager || { id: managerId, name: managerId, email: '' };
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
  const getKYCBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-900/30 text-green-400">{t('status.approved')}</Badge>;
      case 'pending': return <Badge className="bg-gold-800/30 text-gold-400">{t('status.pending')}</Badge>;
      case 'rejected': return <Badge className="bg-red-900/30 text-red-400">{t('status.rejected')}</Badge>;
      default: return <Badge className="bg-gray-900/30 text-gray-400">{t('status.notStarted')}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">{t('status.loading')}</div>
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
                        <Badge className="bg-green-900/30 text-green-400">{t('status.approved')}</Badge>
                      ) : (
                        <Badge className="bg-gold-800/30 text-gold-400">{t('status.pending')}</Badge>
                      )}
                      {getKYCBadge(user.kyc_status)}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {/* Account Manager Badge */}
                      <div className="hidden lg:flex items-center gap-1">
                        <UserCog size={14} className="text-gray-500" />
                        {user.assigned_to ? (
                          <Badge className="bg-green-900/30 text-green-400 text-xs border border-green-800/30">
                            {getManagerName(user.assigned_to)}
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-900/30 text-yellow-400 text-xs border border-yellow-800/30">
                            Sem Manager
                          </Badge>
                        )}
                      </div>
                      
                      {/* Assign Manager Button */}
                      <Button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedUser(user);
                          setSelectedManagerId(user.assigned_to || 'none');
                          setShowAssignManagerDialog(true);
                        }}
                        size="sm"
                        variant="outline"
                        className="border-gold-800/30 text-gold-400 hover:bg-gold-900/30"
                        title="Atribuir Account Manager"
                      >
                        <UserCog size={16} />
                      </Button>
                      
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
                      
                      {/* More Info Button */}
                      <Button
                        onClick={(e) => { e.stopPropagation(); openDetailsDialog(user); }}
                        size="sm"
                        variant="outline"
                        className="border-blue-800/30 text-blue-400 hover:bg-blue-900/30"
                      >
                        <Info size={16} className="mr-1" />
                        Mais Info
                      </Button>
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
                      <span className="text-gray-400 text-sm mr-2">{t('status.kycStatus')}:</span>
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
                          {status === 'not_started' ? t('status.notStarted') : 
                           status === 'pending' ? t('status.pending') :
                           status === 'approved' ? t('status.approved') : t('status.rejected')}
                        </Button>
                      ))}
                    </div>

                    {/* Block/Delete Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gold-800/20">
                      <span className="text-gray-400 text-sm mr-2">{t('status.actions')}:</span>
                      
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
              {t('tier23Modals.adminUsers.block')}
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
              {t('tier23Modals.adminUsers.delete')}
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

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        setShowPasswordDialog(open);
        if (!open) {
          setNewPassword('');
          setGeneratedPassword('');
          setSelectedUser(null);
        }
      }}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <Key size={20} />
              Alterar Password
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Alterar password para <span className="text-white font-medium">{selectedUser?.name}</span> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!generatedPassword ? (
              <>
                {/* Manual Password Input */}
                <div className="space-y-2">
                  <Label className="text-white">Nova Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <Input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 bg-zinc-800 border-gold-500/50 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => resetPassword(false)}
                    disabled={!newPassword || newPassword.length < 6}
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                  >
                    <Key size={16} className="mr-2" />
                    Definir Password
                  </Button>
                  <Button
                    onClick={() => resetPassword(true)}
                    variant="outline"
                    className="flex-1 border-gold-500/50 text-gold-400 hover:bg-gold-900/30"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Gerar Aleatória
                  </Button>
                </div>
              </>
            ) : (
              /* Password Generated - Show Result */
              <div className="space-y-4">
                <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <p className="text-green-400 text-sm mb-2 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Password alterada com sucesso!
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-zinc-800 rounded font-mono text-white text-lg">
                      {generatedPassword}
                    </div>
                    <Button
                      onClick={() => copyToClipboard(generatedPassword)}
                      size="sm"
                      className="bg-gold-500 hover:bg-gold-400"
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>

                <p className="text-gray-400 text-sm">
                  Envie esta password ao utilizador. Por segurança, ele deve alterar após o primeiro login.
                </p>

                <Button
                  onClick={() => setShowPasswordDialog(false)}
                  className="w-full bg-zinc-700 hover:bg-zinc-600"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={(open) => {
        setShowDetailsDialog(open);
        if (!open) {
          setClientDetails(null);
          setSelectedUser(null);
        }
      }}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-400">
              <Info size={20} />
              {t('tier23Modals.clientDetails')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Informação completa de <span className="text-white font-medium">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gold-400">Carregando...</div>
            </div>
          ) : clientDetails ? (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-zinc-800">
                <TabsTrigger value="personal" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <UserCheck size={16} className="mr-2" />
                  Pessoal
                </TabsTrigger>
                <TabsTrigger value="manager" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <Building size={16} className="mr-2" />
                  Manager
                </TabsTrigger>
                <TabsTrigger value="wallets" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <Wallet size={16} className="mr-2" />
                  Carteiras
                </TabsTrigger>
                <TabsTrigger value="transactions" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <History size={16} className="mr-2" />
                  Transações
                </TabsTrigger>
              </TabsList>

              {/* Personal Info Tab */}
              <TabsContent value="personal" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <UserCheck size={14} />
                        <span className="text-xs uppercase">Nome</span>
                      </div>
                      <p className="text-white font-medium">{clientDetails.name || '-'}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Mail size={14} />
                        <span className="text-xs uppercase">Email</span>
                      </div>
                      <p className="text-white font-medium">{clientDetails.email || '-'}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Phone size={14} />
                        <span className="text-xs uppercase">Telefone</span>
                      </div>
                      <p className="text-white font-medium">{clientDetails.phone || 'Não fornecido'}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <MapPin size={14} />
                        <span className="text-xs uppercase">País</span>
                      </div>
                      <p className="text-white font-medium">{clientDetails.country || 'Não fornecido'}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Globe size={14} />
                        <span className="text-xs uppercase">Região</span>
                      </div>
                      <p className="text-white font-medium capitalize">{clientDetails.region || 'Não definida'}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Crown size={14} />
                        <span className="text-xs uppercase">Nível</span>
                      </div>
                      <p className="text-white font-medium capitalize">{clientDetails.membership_level || 'Standard'}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Calendar size={14} />
                        <span className="text-xs uppercase">Registado em</span>
                      </div>
                      <p className="text-white font-medium">{formatDate(clientDetails.created_at)}</p>
                    </div>
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <CheckCircle size={14} />
                        <span className="text-xs uppercase">{t('status.state')}</span>
                      </div>
                      <div className="flex gap-2">
                        {clientDetails.is_approved ? (
                          <Badge className="bg-green-900/30 text-green-400">{t('status.approved')}</Badge>
                        ) : (
                          <Badge className="bg-gold-800/30 text-gold-400">{t('status.pending')}</Badge>
                        )}
                        {clientDetails.is_active === false && (
                          <Badge className="bg-red-900/30 text-red-400">{t('status.blocked')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* KYC Status */}
                  <div className="p-4 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <UserCheck size={14} />
                      <span className="text-xs uppercase">{t('status.kycStatus')}</span>
                    </div>
                    <Badge className={
                      clientDetails.kyc_status === 'approved' ? 'bg-green-900/30 text-green-400' :
                      clientDetails.kyc_status === 'pending' ? 'bg-gold-800/30 text-gold-400' :
                      clientDetails.kyc_status === 'rejected' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-900/30 text-gray-400'
                    }>
                      {clientDetails.kyc_status === 'approved' ? t('status.approved') :
                       clientDetails.kyc_status === 'pending' ? t('status.pending') :
                       clientDetails.kyc_status === 'rejected' ? t('status.rejected') : t('status.notStarted')}
                    </Badge>
                  </div>

                  {/* Invite Code Used */}
                  {clientDetails.invite_code_used && (
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <CreditCard size={14} />
                        <span className="text-xs uppercase">Código de Convite Usado</span>
                      </div>
                      <p className="text-white font-mono">{clientDetails.invite_code_used}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Account Manager Tab */}
              <TabsContent value="manager" className="mt-4">
                <div className="space-y-4">
                  {(clientDetails.assigned_to || clientDetails.invited_by) ? (
                    <div className="p-6 bg-zinc-800/50 rounded-lg">
                      <h4 className="text-lg text-gold-400 mb-4 flex items-center gap-2">
                        <Building size={18} />
                        Account Manager
                      </h4>
                      {(() => {
                        const referrer = getReferrerInfo(clientDetails);
                        if (referrer) {
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-gray-400 text-sm">Nome</span>
                                <p className="text-white mt-1">{referrer.name}</p>
                              </div>
                              {referrer.email && (
                                <div>
                                  <span className="text-gray-400 text-sm">Email</span>
                                  <p className="text-white mt-1">{referrer.email}</p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return <p className="text-gray-400">Manager não encontrado</p>;
                      })()}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-zinc-800/30 rounded-lg">
                      <Building className="mx-auto mb-4 text-gray-500" size={48} />
                      <h3 className="text-xl text-white mb-2">Sem Account Manager</h3>
                      <p className="text-gray-400">Este cliente não foi referenciado por nenhum manager.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Wallets Tab */}
              <TabsContent value="wallets" className="mt-4">
                <div className="space-y-4">
                  {clientDetails.wallets && clientDetails.wallets.length > 0 ? (
                    <>
                      {/* Fiat Wallets */}
                      <div>
                        <h4 className="text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                          <CreditCard size={14} />
                          Carteiras Fiat
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {clientDetails.wallets
                            .filter(w => w.asset_type === 'fiat')
                            .map((wallet, idx) => (
                              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium">{wallet.asset_id || wallet.asset_name || wallet.asset || '-'}</p>
                                  <p className="text-gray-400 text-sm">Fiat</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-white font-mono">{formatNumber(wallet.balance)} {wallet.asset_id || wallet.asset}</p>
                                  {wallet.pending_balance > 0 && (
                                    <p className="text-gold-400 text-xs">Pendente: {formatNumber(wallet.pending_balance)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                        {clientDetails.wallets.filter(w => w.asset_type === 'fiat').length === 0 && (
                          <p className="text-gray-500 text-sm">Sem carteiras fiat</p>
                        )}
                      </div>

                      {/* Crypto Wallets */}
                      <div>
                        <h4 className="text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                          <Wallet size={14} />
                          Carteiras Crypto
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {clientDetails.wallets
                            .filter(w => w.asset_type === 'crypto' || !w.asset_type)
                            .map((wallet, idx) => (
                              <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-white font-medium">{wallet.asset_id || wallet.asset_name || wallet.asset || '-'}</p>
                                  <p className="text-white font-mono">{formatNumber(wallet.balance)} {wallet.asset_id || wallet.asset || ''}</p>
                                </div>
                                {wallet.address && (
                                  <div className="flex items-center gap-2">
                                    <p className="text-gray-400 text-xs font-mono truncate flex-1">{wallet.address}</p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => {
                                        navigator.clipboard.writeText(wallet.address);
                                        toast.success('Endereço copiado');
                                      }}
                                    >
                                      <Copy size={12} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                        {clientDetails.wallets.filter(w => w.asset_type === 'crypto' || !w.asset_type).length === 0 && (
                          <p className="text-gray-500 text-sm">Sem carteiras crypto</p>
                        )}
                      </div>

                      {/* Total Balance Summary */}
                      <div className="p-4 bg-gold-900/20 border border-gold-800/30 rounded-lg">
                        <h4 className="text-gold-400 font-medium mb-2">Resumo</h4>
                        <p className="text-gray-400 text-sm">
                          Total de carteiras: <span className="text-white">{clientDetails.wallets.length}</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-12 text-center bg-zinc-800/30 rounded-lg">
                      <Wallet className="mx-auto mb-4 text-gray-500" size={48} />
                      <h3 className="text-xl text-white mb-2">Sem Carteiras</h3>
                      <p className="text-gray-400">Este cliente ainda não tem carteiras criadas.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="mt-4">
                <div className="space-y-4">
                  {clientDetails.transactions && clientDetails.transactions.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {clientDetails.transactions.map((tx, idx) => (
                        <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              tx.type === 'deposit' || tx.type === 'buy' ? 'bg-green-900/30' : 
                              tx.type === 'withdrawal' || tx.type === 'sell' ? 'bg-red-900/30' : 
                              'bg-blue-900/30'
                            }`}>
                              {tx.type === 'deposit' || tx.type === 'buy' ? (
                                <ArrowDownRight size={16} className="text-green-400" />
                              ) : tx.type === 'withdrawal' || tx.type === 'sell' ? (
                                <ArrowUpRight size={16} className="text-red-400" />
                              ) : (
                                <TrendingUp size={16} className="text-blue-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">{tx.type}</p>
                              <p className="text-gray-400 text-xs">{formatDate(tx.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono ${
                              tx.type === 'deposit' || tx.type === 'buy' ? 'text-green-400' : 
                              tx.type === 'withdrawal' || tx.type === 'sell' ? 'text-red-400' : 
                              'text-white'
                            }`}>
                              {tx.type === 'deposit' || tx.type === 'buy' ? '+' : '-'}
                              {formatNumber(tx.amount)} {tx.asset || tx.currency}
                            </p>
                            <Badge className={
                              tx.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                              tx.status === 'pending' ? 'bg-gold-800/30 text-gold-400' :
                              tx.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                              'bg-gray-900/30 text-gray-400'
                            }>
                              {tx.status === 'completed' ? 'Concluído' :
                               tx.status === 'pending' ? 'Pendente' :
                               tx.status === 'failed' ? 'Falhou' : tx.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-zinc-800/30 rounded-lg">
                      <History className="mx-auto mb-4 text-gray-500" size={48} />
                      <h3 className="text-xl text-white mb-2">Sem Transações</h3>
                      <p className="text-gray-400">Este cliente ainda não realizou nenhuma transação.</p>
                    </div>
                  )}

                  {/* Investments */}
                  {clientDetails.investments && clientDetails.investments.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <TrendingUp size={14} />
                        Investimentos
                      </h4>
                      <div className="space-y-2">
                        {clientDetails.investments.map((inv, idx) => (
                          <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{inv.opportunity_name || 'Investimento'}</p>
                              <p className="text-gray-400 text-xs">{formatDate(inv.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-gold-400 font-mono">{formatNumber(inv.amount)} {inv.currency || 'EUR'}</p>
                              <Badge className={
                                inv.status === 'active' ? 'bg-green-900/30 text-green-400' :
                                inv.status === 'completed' ? 'bg-blue-900/30 text-blue-400' :
                                'bg-gray-900/30 text-gray-400'
                              }>
                                {inv.status === 'active' ? 'Ativo' : inv.status === 'completed' ? 'Concluído' : inv.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="p-12 text-center">
              <AlertTriangle className="mx-auto mb-4 text-red-400" size={48} />
              <h3 className="text-xl text-white mb-2">Erro ao carregar</h3>
              <p className="text-gray-400">Não foi possível carregar os detalhes do cliente.</p>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setShowDetailsDialog(false)}
              className="bg-zinc-700 hover:bg-zinc-600"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Account Manager Dialog */}
      <Dialog open={showAssignManagerDialog} onOpenChange={(open) => {
        setShowAssignManagerDialog(open);
        if (!open) {
          setSelectedUser(null);
          setSelectedManagerId('');
        }
      }}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserCog className="text-gold-400" />
              {t('tier23Modals.adminClients.assignAM')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Client Info */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-gray-400 text-xs uppercase mb-1">Cliente</p>
              <p className="text-white font-medium">{selectedUser?.name}</p>
              <p className="text-gray-400 text-sm">{selectedUser?.email}</p>
            </div>
            
            {/* Current Manager Info */}
            {selectedUser?.assigned_to && (
              <div className="p-3 bg-green-900/20 rounded-lg border border-green-800/30">
                <p className="text-gray-400 text-xs uppercase mb-1">Account Manager Atual</p>
                <p className="text-green-400 font-medium">{getManagerName(selectedUser.assigned_to)}</p>
              </div>
            )}
            
            {/* Manager Selection */}
            <div className="space-y-2">
              <Label className="text-white">Selecionar Account Manager</Label>
              <Select value={selectedManagerId || "none"} onValueChange={setSelectedManagerId}>
                <SelectTrigger className="bg-zinc-800 border-gold-500/30 text-white">
                  <SelectValue placeholder="Escolha um membro da equipa..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-gold-500/30 max-h-60">
                  <SelectItem value="none" className="text-gray-400 hover:bg-zinc-700">
                    <span className="flex items-center gap-2">
                      <X size={14} />
                      Remover Account Manager
                    </span>
                  </SelectItem>
                  {staffMembers.map((staff) => (
                    <SelectItem 
                      key={staff.id} 
                      value={staff.id}
                      className="text-white hover:bg-zinc-700"
                    >
                      <div className="flex flex-col">
                        <span>{staff.name}</span>
                        <span className="text-xs text-gray-400">{staff.email} • {staff.internal_role || 'Admin'}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-gray-500 text-xs">
                O Account Manager será responsável por este cliente.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignManagerDialog(false)}
              className="border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={assignAccountManager}
              className="bg-gold-500 hover:bg-gold-400 text-black"
            >
              <UserCog size={16} className="mr-2" />
              {selectedManagerId && selectedManagerId !== 'none' ? 'Atribuir Manager' : 'Remover Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
