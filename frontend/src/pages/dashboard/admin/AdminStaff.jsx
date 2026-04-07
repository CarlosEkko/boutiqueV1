import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
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
} from '../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { 
  UserCog, 
  Plus,
  Edit,
  Trash2,
  Shield,
  Globe,
  Mail,
  User,
  Key,
  CheckCircle,
  XCircle,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminStaff = () => {
  const { token, user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [demoSections, setDemoSections] = useState([]);
  const [demoAuthorized, setDemoAuthorized] = useState(false);
  const [availableSections, setAvailableSections] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    phone: '',
    internal_role: 'support',
    region: 'europe'
  });

  const roles = [
    { value: 'admin', label: 'Admin', description: 'Acesso total ao sistema', color: 'purple' },
    { value: 'global_manager', label: 'Global Manager', description: 'Gestão global de todas regiões', color: 'blue' },
    { value: 'manager', label: 'Manager', description: 'Gestão regional', color: 'blue' },
    { value: 'sales_manager', label: 'Manager de Vendas', description: 'Líder da equipa de vendas', color: 'green' },
    { value: 'sales', label: 'Vendas', description: 'Representante de vendas', color: 'green' },
    { value: 'finance_general', label: 'Financeiro Geral', description: 'Supervisão financeira global', color: 'emerald' },
    { value: 'finance_local', label: 'Financeiro Local', description: 'Financeiro regional', color: 'emerald' },
    { value: 'finance', label: 'Financeiro', description: 'Operações financeiras', color: 'emerald' },
    { value: 'support_manager', label: 'Suporte Manager', description: 'Líder da equipa de suporte', color: 'gold' },
    { value: 'support_agent', label: 'Agente de Suporte', description: 'Atendimento ao cliente', color: 'gold' }
  ];

  const regions = [
    { value: 'global', label: 'Global', flag: '🌐' },
    { value: 'europe', label: 'Europa', flag: '🇪🇺' },
    { value: 'mena', label: 'MENA', flag: '🌍' },
    { value: 'latam', label: 'LATAM', flag: '🌎' }
  ];

  useEffect(() => {
    fetchStaff();
  }, [token]);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/internal-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaff(response.data);
    } catch (err) {
      toast.error('Falha ao carregar equipa interna');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.email || !formData.name || !formData.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/admin/internal-users`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Membro da equipa criado com sucesso');
      setShowCreateModal(false);
      resetForm();
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao criar membro');
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaff) return;

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        internal_role: formData.internal_role,
        region: formData.region,
        is_active: formData.is_active
      };

      await axios.put(`${API_URL}/api/admin/internal-users/${selectedStaff.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Save demo permissions
      await axios.put(`${API_URL}/api/demo/permissions/${selectedStaff.id}`, 
        { sections: demoAuthorized ? demoSections : [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Membro atualizado com sucesso');
      setShowEditModal(false);
      setSelectedStaff(null);
      resetForm();
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao atualizar membro');
    }
  };

  const handleDeactivate = async (staffId) => {
    if (staffId === currentUser?.id) {
      toast.error('Não pode desativar a si mesmo');
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/internal-users/${staffId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Membro desativado');
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao desativar membro');
    }
  };

  const handlePermanentDelete = async () => {
    if (!staffToDelete) return;
    
    if (staffToDelete.id === currentUser?.id) {
      toast.error('Não pode eliminar a si mesmo');
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/admin/internal-users/${staffToDelete.id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Membro eliminado permanentemente');
      fetchStaff();
      setShowDeleteDialog(false);
      setStaffToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao eliminar membro');
    }
  };

  const handleReactivate = async (staffId) => {
    try {
      await axios.put(`${API_URL}/api/admin/internal-users/${staffId}`, 
        { is_active: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Membro reativado');
      fetchStaff();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao reativar membro');
    }
  };

  const openEditModal = async (member) => {
    setSelectedStaff(member);
    setFormData({
      email: member.email,
      name: member.name,
      password: '',
      phone: member.phone || '',
      internal_role: member.internal_role,
      region: member.region,
      is_active: member.is_active
    });
    // Fetch demo permissions for this user
    try {
      const [permRes, secRes] = await Promise.all([
        axios.get(`${API_URL}/api/demo/permissions/${member.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/demo/sections`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDemoAuthorized(permRes.data.demo_authorized);
      setDemoSections(permRes.data.sections || []);
      setAvailableSections(secRes.data.sections);
    } catch {
      setDemoAuthorized(false);
      setDemoSections([]);
    }
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      phone: '',
      internal_role: 'support',
      region: 'europe'
    });
  };

  const getRoleBadge = (role) => {
    const roleConfig = roles.find(r => r.value === role) || { color: 'gray', label: role };
    const colorClasses = {
      purple: 'bg-purple-900/30 text-purple-400 border-purple-800/30',
      blue: 'bg-blue-900/30 text-blue-400 border-blue-800/30',
      green: 'bg-green-900/30 text-green-400 border-green-800/30',
      emerald: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30',
      gold: 'bg-gold-900/30 text-gold-400 border-gold-800/30',
      gray: 'bg-gray-900/30 text-gray-400 border-gray-800/30'
    };
    return (
      <Badge className={`${colorClasses[roleConfig.color]} border`}>
        {roleConfig.label}
      </Badge>
    );
  };

  const getRegionBadge = (region) => {
    const regionConfig = regions.find(r => r.value === region) || { flag: '🌐', label: region };
    return (
      <span className="flex items-center gap-1 text-sm text-gray-400">
        <span>{regionConfig.flag}</span>
        <span>{regionConfig.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">{t('admin.common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <UserCog className="text-gold-400" />
            {t('admin.staff.title')}
          </h1>
          <p className="text-gray-400 mt-1">{t('admin.staff.subtitle')}</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="bg-gold-500 hover:bg-gold-400"
        >
          <Plus size={18} className="mr-2" />
          {t('admin.staff.addStaff')}
        </Button>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roles.map((role) => (
          <Card key={role.value} className="bg-zinc-900/30 border-gold-800/10">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {getRoleBadge(role.value)}
              </div>
              <p className="text-xs text-gray-500">{role.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gold-800/20 pb-2">
        <Button
          variant={activeTab === 'active' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('active')}
          className={activeTab === 'active' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}
        >
          <CheckCircle size={16} className="mr-2" />
          {t('admin.staff.active')} ({staff.filter(m => m.is_active !== false).length})
        </Button>
        <Button
          variant={activeTab === 'inactive' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inactive')}
          className={activeTab === 'inactive' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}
        >
          <XCircle size={16} className="mr-2" />
          Inativos ({staff.filter(m => m.is_active === false).length})
        </Button>
      </div>

      {/* Staff List */}
      <div className="space-y-3">
        {staff.filter(m => activeTab === 'active' ? m.is_active !== false : m.is_active === false).length > 0 ? (
          staff.filter(m => activeTab === 'active' ? m.is_active !== false : m.is_active === false).map((member) => (
            <Card key={member.id} className={`border ${member.is_active ? 'bg-zinc-900/50 border-gold-800/20' : 'bg-zinc-950/50 border-red-900/20 opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      member.internal_role === 'admin' ? 'bg-purple-500/20' :
                      member.internal_role === 'manager' ? 'bg-blue-500/20' :
                      member.internal_role === 'local_manager' ? 'bg-green-500/20' :
                      'bg-gold-500/20'
                    }`}>
                      <span className={`font-bold ${
                        member.internal_role === 'admin' ? 'text-purple-400' :
                        member.internal_role === 'manager' ? 'text-blue-400' :
                        member.internal_role === 'local_manager' ? 'text-green-400' :
                        'text-gold-400'
                      }`}>
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{member.name}</p>
                        {!member.is_active && (
                          <Badge className="bg-red-900/30 text-red-400 text-xs">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Role & Region */}
                    <div className="hidden md:flex items-center gap-3">
                      {getRoleBadge(member.internal_role)}
                      {getRegionBadge(member.region)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {activeTab === 'active' ? (
                        <>
                          <Button
                            onClick={() => openEditModal(member)}
                            size="sm"
                            variant="outline"
                            className="border-gold-800/30 text-gold-400 hover:bg-gold-900/30"
                          >
                            <Edit size={14} className="mr-1" />
                            Editar
                          </Button>
                          {member.id !== currentUser?.id && (
                            <Button
                              onClick={() => handleDeactivate(member.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                              title="Desativar"
                            >
                              <XCircle size={14} />
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleReactivate(member.id)}
                            size="sm"
                            variant="outline"
                            className="border-green-800/30 text-green-400 hover:bg-green-900/30"
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Reativar
                          </Button>
                          {member.id !== currentUser?.id && (
                            <Button
                              onClick={() => {
                                setStaffToDelete(member);
                                setShowDeleteDialog(true);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                              title="Eliminar Permanentemente"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Role & Region */}
                <div className="flex md:hidden items-center gap-3 mt-3 pt-3 border-t border-gold-800/10">
                  {getRoleBadge(member.internal_role)}
                  {getRegionBadge(member.region)}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <UserCog className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">
                {activeTab === 'active' ? 'Sem Membros Ativos' : 'Sem Membros Inativos'}
              </h3>
              <p className="text-gray-400">
                {activeTab === 'active' 
                  ? 'Crie o primeiro membro da equipa interna.' 
                  : 'Não existem membros inativos.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-red-400">
              <Trash2 className="text-red-400" />
              Eliminar Permanentemente
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-900/20 rounded-lg border border-red-800/30">
              <p className="text-red-300 text-sm">
                <strong>Atenção!</strong> Esta ação é irreversível. O membro será eliminado permanentemente do sistema.
              </p>
            </div>
            
            {staffToDelete && (
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-gray-400 text-xs uppercase mb-1">Membro a eliminar</p>
                <p className="text-white font-medium">{staffToDelete.name}</p>
                <p className="text-gray-400 text-sm">{staffToDelete.email}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setStaffToDelete(null);
              }}
              className="border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePermanentDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              <Trash2 size={16} className="mr-2" />
              Eliminar Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="text-gold-400" size={20} />
              Novo Membro da Equipa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Nome *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome completo"
                  className="pl-10 bg-zinc-800 border-gold-800/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@kbex.io"
                  className="pl-10 bg-zinc-800 border-gold-800/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Password *</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Password segura"
                  className="pl-10 bg-zinc-800 border-gold-800/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+351 900 000 000"
                className="bg-zinc-800 border-gold-800/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white font-medium">Função *</Label>
                <Select
                  value={formData.internal_role}
                  onValueChange={(value) => setFormData({...formData, internal_role: value})}
                >
                  <SelectTrigger className="bg-zinc-800/80 border-gold-500/50 text-white hover:border-gold-400 hover:bg-zinc-700/80 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/50">
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value} className="text-white hover:bg-gold-900/30 focus:bg-gold-900/30">
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white font-medium">Região *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({...formData, region: value})}
                >
                  <SelectTrigger className="bg-zinc-800/80 border-gold-500/50 text-white hover:border-gold-400 hover:bg-zinc-700/80 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/50">
                    {regions.map((region) => (
                      <SelectItem key={region.value} value={region.value} className="text-white hover:bg-gold-900/30 focus:bg-gold-900/30">
                        {region.flag} {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-gold-800/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-gold-500 hover:bg-gold-400"
            >
              <CheckCircle size={16} className="mr-2" />
              Criar Membro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="text-gold-400" size={20} />
              Editar Membro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Nome</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-zinc-800 border-gold-800/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Email</Label>
              <Input
                value={formData.email}
                disabled
                className="bg-zinc-950 border-gold-800/20 text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-zinc-800 border-gold-800/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white font-medium">Função</Label>
                <Select
                  value={formData.internal_role}
                  onValueChange={(value) => setFormData({...formData, internal_role: value})}
                >
                  <SelectTrigger className="bg-zinc-800/80 border-gold-500/50 text-white hover:border-gold-400 hover:bg-zinc-700/80 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/50">
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value} className="text-white hover:bg-gold-900/30 focus:bg-gold-900/30">
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white font-medium">Região</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) => setFormData({...formData, region: value})}
                >
                  <SelectTrigger className="bg-zinc-800/80 border-gold-500/50 text-white hover:border-gold-400 hover:bg-zinc-700/80 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-gold-500/50">
                    {regions.map((region) => (
                      <SelectItem key={region.value} value={region.value} className="text-white hover:bg-gold-900/30 focus:bg-gold-900/30">
                        {region.flag} {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div>
                <p className="text-white text-sm">Estado da Conta</p>
                <p className="text-xs text-gray-500">Ativar ou desativar acesso</p>
              </div>
              <Button
                onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                size="sm"
                variant={formData.is_active ? "default" : "outline"}
                className={formData.is_active 
                  ? "bg-green-600 hover:bg-green-500" 
                  : "border-red-900/30 text-red-400"
                }
              >
                {formData.is_active ? (
                  <><CheckCircle size={14} className="mr-1" /> Ativo</>
                ) : (
                  <><XCircle size={14} className="mr-1" /> Inativo</>
                )}
              </Button>
            </div>

            {/* Demo Permissions */}
            <div className="space-y-3 p-3 bg-amber-950/20 rounded-lg border border-amber-800/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={16} className="text-amber-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Demo Mode</p>
                    <p className="text-xs text-gray-500">Secções visíveis na demonstração</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const newAuth = !demoAuthorized;
                    setDemoAuthorized(newAuth);
                    if (newAuth && demoSections.length === 0) {
                      setDemoSections(availableSections.map(s => s.id));
                    }
                    if (!newAuth) setDemoSections([]);
                  }}
                  size="sm"
                  variant={demoAuthorized ? "default" : "outline"}
                  className={demoAuthorized 
                    ? "bg-amber-600 hover:bg-amber-500 text-white" 
                    : "border-gray-700 text-gray-400"
                  }
                  data-testid="demo-auth-toggle"
                >
                  {demoAuthorized ? "Ativado" : "Desativado"}
                </Button>
              </div>
              
              {demoAuthorized && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-800/20">
                  {availableSections.map((section) => (
                    <label
                      key={section.id}
                      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all text-xs ${
                        demoSections.includes(section.id) 
                          ? 'bg-amber-900/30 border border-amber-700/40 text-amber-300'
                          : 'bg-zinc-800/40 border border-zinc-700/30 text-gray-500'
                      }`}
                      data-testid={`demo-section-${section.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={demoSections.includes(section.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDemoSections([...demoSections, section.id]);
                          } else {
                            setDemoSections(demoSections.filter(s => s !== section.id));
                          }
                        }}
                        className="accent-amber-500 w-3.5 h-3.5"
                      />
                      <span>{section.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="border-gold-800/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-gold-500 hover:bg-gold-400"
            >
              <CheckCircle size={16} className="mr-2" />
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminStaff;
