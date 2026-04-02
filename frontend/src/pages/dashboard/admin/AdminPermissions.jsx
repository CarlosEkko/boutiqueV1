import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog';
import { 
  Lock, 
  Users,
  Edit,
  RotateCcw,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Settings,
  Settings2,
  Landmark,
  Headphones,
  Shield,
  Save,
  Briefcase,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const departmentIcons = {
  portfolio: LayoutDashboard,
  admin: Settings,
  management: Settings2,
  finance: Landmark,
  crm: Users,
  support: Headphones,
  otc_desk: Briefcase,
};

const departmentColors = {
  portfolio: 'bg-blue-900/30 text-blue-400 border-blue-800/30',
  admin: 'bg-purple-900/30 text-purple-400 border-purple-800/30',
  management: 'bg-orange-900/30 text-orange-400 border-orange-800/30',
  finance: 'bg-green-900/30 text-green-400 border-green-800/30',
  crm: 'bg-pink-900/30 text-pink-400 border-pink-800/30',
  support: 'bg-gold-900/30 text-gold-400 border-gold-800/30',
  otc_desk: 'bg-amber-900/30 text-amber-400 border-amber-800/30',
};

const AdminPermissions = () => {
  const { token, user: currentUser } = useAuth();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPermissions, setEditPermissions] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [staffRes, deptsRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api/permissions/staff-with-permissions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/permissions/departments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/permissions/roles`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setStaff(staffRes.data);
      setDepartments(deptsRes.data.departments);
      setRoles(rolesRes.data.roles);
    } catch (err) {
      toast.error('Falha ao carregar dados de permissões');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditPermissions(user.effective_departments || []);
    setShowEditModal(true);
  };

  const toggleDepartment = (deptValue) => {
    setEditPermissions(prev => {
      if (prev.includes(deptValue)) {
        return prev.filter(d => d !== deptValue);
      } else {
        return [...prev, deptValue];
      }
    });
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    try {
      await axios.put(
        `${API_URL}/api/permissions/user/${selectedUser.id}`,
        { departments: editPermissions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Permissões atualizadas com sucesso');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      toast.error('Falha ao atualizar permissões');
    }
  };

  const resetPermissions = async (userId) => {
    try {
      await axios.delete(`${API_URL}/api/permissions/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Permissões restauradas para padrão do cargo');
      fetchData();
    } catch (err) {
      toast.error('Falha ao restaurar permissões');
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
      fetchData();
      setShowDeleteDialog(false);
      setStaffToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Falha ao eliminar membro');
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = roles.find(r => r.value === role);
    return (
      <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700">
        {roleConfig?.label || role || 'N/A'}
      </Badge>
    );
  };

  const DepartmentBadge = ({ dept }) => {
    const Icon = departmentIcons[dept] || Shield;
    const colorClass = departmentColors[dept] || 'bg-gray-900/30 text-gray-400 border-gray-800/30';
    const deptInfo = departments.find(d => d.value === dept);
    
    return (
      <Badge className={`${colorClass} border flex items-center gap-1`}>
        <Icon size={12} />
        {deptInfo?.label || dept}
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <Lock className="text-gold-400" />
          Gestão de Permissões
        </h1>
        <p className="text-gray-400 mt-1">
          Configure o acesso de cada membro da equipa aos diferentes departamentos
        </p>
      </div>

      {/* Department Legend */}
      <Card className="bg-zinc-900/30 border-gold-800/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-400">Departamentos Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {departments.map(dept => (
              <DepartmentBadge key={dept.value} dept={dept.value} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gold-800/20 pb-2">
        <Button
          variant={activeTab === 'active' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('active')}
          className={activeTab === 'active' ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}
        >
          <CheckCircle size={16} className="mr-2" />
          Ativos ({staff.filter(m => m.is_active !== false).length})
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

      {/* Staff Permissions List */}
      <div className="space-y-3">
        {staff.filter(m => activeTab === 'active' ? m.is_active !== false : m.is_active === false).length > 0 ? (
          staff.filter(m => activeTab === 'active' ? m.is_active !== false : m.is_active === false).map((member) => (
            <Card 
              key={member.id} 
              className={`border ${member.is_active 
                ? 'bg-zinc-900/50 border-gold-800/20' 
                : 'bg-zinc-950/50 border-red-900/20 opacity-60'}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <span className="text-gold-400 font-bold">
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{member.name}</p>
                        {member.has_custom_permissions && (
                          <Badge className="bg-orange-900/30 text-orange-400 text-xs border border-orange-800/30">
                            Personalizado
                          </Badge>
                        )}
                        {!member.is_active && (
                          <Badge className="bg-red-900/30 text-red-400 text-xs">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{member.email}</p>
                      <div className="mt-1">
                        {getRoleBadge(member.role)}
                      </div>
                    </div>
                  </div>

                  {/* Departments Access */}
                  <div className="flex-1 lg:px-4">
                    <p className="text-xs text-gray-500 mb-2">Acesso aos Departamentos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {member.effective_departments?.map(dept => (
                        <DepartmentBadge key={dept} dept={dept} />
                      ))}
                      {(!member.effective_departments || member.effective_departments.length === 0) && (
                        <span className="text-gray-500 text-sm">Sem acesso</span>
                      )}
                    </div>
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
                        {member.has_custom_permissions && (
                          <Button
                            onClick={() => resetPermissions(member.id)}
                            size="sm"
                            variant="outline"
                            className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                            title="Restaurar permissões do cargo"
                          >
                            <RotateCcw size={14} />
                          </Button>
                        )}
                      </>
                    ) : (
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
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <Users className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">
                {activeTab === 'active' ? 'Sem Membros Ativos' : 'Sem Membros Inativos'}
              </h3>
              <p className="text-gray-400">
                {activeTab === 'active' 
                  ? 'Crie membros da equipa em "Gestão de Equipa" primeiro.' 
                  : 'Não existem membros inativos.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Permissions Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="text-gold-400" size={20} />
              Editar Permissões - {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 pr-1">
            <p className="text-sm text-gray-400 mb-4">
              Selecione os departamentos que este utilizador pode acessar.
              Estas permissões sobrepõem as permissões padrão do cargo.
            </p>

            <div className="space-y-3">
              {departments.map(dept => {
                const Icon = departmentIcons[dept.value] || Shield;
                const isChecked = editPermissions.includes(dept.value);
                const isRoleDefault = selectedUser?.role_departments?.includes(dept.value);
                
                return (
                  <div 
                    key={dept.value}
                    onClick={() => toggleDepartment(dept.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isChecked 
                        ? 'bg-gold-900/20 border border-gold-500/30' 
                        : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800'
                    }`}
                  >
                    <Checkbox 
                      checked={isChecked}
                      onCheckedChange={() => toggleDepartment(dept.value)}
                      className="data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500"
                    />
                    <Icon size={20} className={isChecked ? 'text-gold-400' : 'text-gray-500'} />
                    <div className="flex-1">
                      <p className={`font-medium ${isChecked ? 'text-white' : 'text-gray-400'}`}>
                        {dept.label}
                      </p>
                      {isRoleDefault && (
                        <p className="text-xs text-gray-500">Padrão do cargo</p>
                      )}
                    </div>
                    {isChecked && <CheckCircle size={16} className="text-gold-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="border-gold-800/30"
            >
              Cancelar
            </Button>
            <Button
              onClick={savePermissions}
              className="bg-gold-500 hover:bg-gold-400"
            >
              <Save size={16} className="mr-2" />
              Guardar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-red-400">
              <Trash2 className="text-red-400" />
              Eliminar Permanentemente
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-900/20 rounded-lg border border-red-800/30">
              <p className="text-red-300 text-sm">
                <strong>Atenção!</strong> O membro será eliminado permanentemente do sistema, incluindo todas as suas permissões personalizadas.
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
    </div>
  );
};

export default AdminPermissions;
