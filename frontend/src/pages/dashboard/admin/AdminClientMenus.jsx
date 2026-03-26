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
} from '../../../components/ui/dialog';
import { 
  Menu,
  Users,
  Edit,
  RotateCcw,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  TrendingUp,
  Shield,
  UserCircle,
  Briefcase,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Menu icons mapping
const menuIcons = {
  portfolio: LayoutDashboard,
  investimentos: TrendingUp,
  transparencia: Shield,
  perfil: UserCircle,
  otc_trading: Briefcase,
};

// Menu colors mapping
const menuColors = {
  portfolio: 'bg-blue-900/30 text-blue-400 border-blue-800/30',
  investimentos: 'bg-green-900/30 text-green-400 border-green-800/30',
  transparencia: 'bg-purple-900/30 text-purple-400 border-purple-800/30',
  perfil: 'bg-orange-900/30 text-orange-400 border-orange-800/30',
  otc_trading: 'bg-amber-900/30 text-amber-400 border-amber-800/30',
};

// Available menus for clients
const AVAILABLE_MENUS = [
  { value: 'portfolio', label: 'Portefólio' },
  { value: 'investimentos', label: 'Investimentos' },
  { value: 'transparencia', label: 'Transparência' },
  { value: 'perfil', label: 'Perfil' },
  { value: 'otc_trading', label: 'OTC Trading' },
];

const AdminClientMenus = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editMenus, setEditMenus] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchClients();
  }, [token]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/client-menus/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    // If client has custom menus, use them; otherwise use all menus as default
    setEditMenus(client.custom_menus || AVAILABLE_MENUS.map(m => m.value));
    setShowEditModal(true);
  };

  const toggleMenu = (menuValue) => {
    setEditMenus(prev => {
      if (prev.includes(menuValue)) {
        return prev.filter(m => m !== menuValue);
      } else {
        return [...prev, menuValue];
      }
    });
  };

  const saveMenuPermissions = async () => {
    if (!selectedClient) return;
    setSaving(true);

    try {
      await axios.put(
        `${API_URL}/api/client-menus/client/${selectedClient.id}`,
        { menus: editMenus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Menus atualizados com sucesso');
      setShowEditModal(false);
      fetchClients();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : Array.isArray(errorDetail) 
          ? errorDetail.map(e => e.msg || e.message || String(e)).join(', ')
          : 'Erro ao atualizar menus';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const resetClientMenus = async (clientId) => {
    try {
      await axios.delete(`${API_URL}/api/client-menus/client/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Menus restaurados para padrão');
      fetchClients();
    } catch (err) {
      const errorDetail = err.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : 'Erro ao restaurar menus';
      toast.error(errorMessage);
    }
  };

  const getTierBadge = (tier) => {
    const tierConfig = {
      standard: { label: 'Standard', className: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
      premium: { label: 'Premium', className: 'bg-gold-900/30 text-gold-400 border-gold-800/30' },
      vip: { label: 'VIP', className: 'bg-purple-900/30 text-purple-400 border-purple-800/30' },
    };
    const config = tierConfig[tier] || tierConfig.standard;
    return <Badge className={`${config.className} border`}>{config.label}</Badge>;
  };

  const MenuBadge = ({ menu }) => {
    const Icon = menuIcons[menu] || Menu;
    const colorClass = menuColors[menu] || 'bg-gray-900/30 text-gray-400 border-gray-800/30';
    const menuInfo = AVAILABLE_MENUS.find(m => m.value === menu);
    
    return (
      <Badge className={`${colorClass} border flex items-center gap-1`}>
        <Icon size={12} />
        {menuInfo?.label || menu}
      </Badge>
    );
  };

  const activeClients = clients.filter(c => c.is_active !== false);
  const inactiveClients = clients.filter(c => c.is_active === false);
  const displayedClients = activeTab === 'active' ? activeClients : inactiveClients;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gold-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <Menu className="text-gold-400" />
          Menus de Clientes
        </h1>
        <p className="text-gray-400 mt-1">
          Configure o acesso de cada cliente aos diferentes menus da plataforma
        </p>
      </div>

      {/* Menus Legend */}
      <Card className="bg-zinc-900/30 border-gold-800/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-400">Menus Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_MENUS.map(menu => (
              <MenuBadge key={menu.value} menu={menu.value} />
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
          Ativos ({activeClients.length})
        </Button>
        <Button
          variant={activeTab === 'inactive' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('inactive')}
          className={activeTab === 'inactive' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}
        >
          <XCircle size={16} className="mr-2" />
          Inativos ({inactiveClients.length})
        </Button>
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {displayedClients.length > 0 ? (
          displayedClients.map((client) => (
            <Card 
              key={client.id} 
              className={`border ${client.is_active !== false
                ? 'bg-zinc-900/50 border-gold-800/20' 
                : 'bg-zinc-950/50 border-red-900/20 opacity-60'}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Client Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <span className="text-gold-400 font-bold">
                        {client.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{client.name}</p>
                        {client.has_custom_menus && (
                          <Badge className="bg-orange-900/30 text-orange-400 text-xs border border-orange-800/30">
                            Personalizado
                          </Badge>
                        )}
                        {client.is_active === false && (
                          <Badge className="bg-red-900/30 text-red-400 text-xs">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{client.email}</p>
                      <div className="mt-1">
                        {getTierBadge(client.membership_level || client.tier)}
                      </div>
                    </div>
                  </div>

                  {/* Menus Access */}
                  <div className="flex-1 lg:px-4">
                    <p className="text-xs text-gray-500 mb-2">Acesso aos Menus:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(client.effective_menus || AVAILABLE_MENUS.map(m => m.value)).map(menu => (
                        <MenuBadge key={menu} menu={menu} />
                      ))}
                      {(!client.effective_menus || client.effective_menus.length === 0) && (
                        <span className="text-gray-500 text-sm">Sem acesso</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => openEditModal(client)}
                      size="sm"
                      variant="outline"
                      className="border-gold-800/30 text-gold-400 hover:bg-gold-900/30"
                    >
                      <Edit size={14} className="mr-1" />
                      Editar
                    </Button>
                    {client.has_custom_menus && (
                      <Button
                        onClick={() => resetClientMenus(client.id)}
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                        title="Restaurar menus padrão"
                      >
                        <RotateCcw size={14} />
                      </Button>
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
                {activeTab === 'active' ? 'Sem Clientes Ativos' : 'Sem Clientes Inativos'}
              </h3>
              <p className="text-gray-400">
                {activeTab === 'active' 
                  ? 'Não existem clientes ativos no sistema.' 
                  : 'Não existem clientes inativos.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Menus Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Menu className="text-gold-400" size={20} />
              Editar Menus - {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-400 mb-4">
              Selecione os menus que este cliente pode acessar.
              Estas permissões personalizam o acesso padrão.
            </p>

            <div className="space-y-3">
              {AVAILABLE_MENUS.map(menu => {
                const Icon = menuIcons[menu.value] || Menu;
                const isChecked = editMenus.includes(menu.value);
                
                return (
                  <div 
                    key={menu.value}
                    onClick={() => toggleMenu(menu.value)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isChecked 
                        ? 'bg-gold-900/20 border border-gold-500/30' 
                        : 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800'
                    }`}
                  >
                    <Checkbox 
                      checked={isChecked}
                      onCheckedChange={() => toggleMenu(menu.value)}
                      className="data-[state=checked]:bg-gold-500 data-[state=checked]:border-gold-500"
                    />
                    <Icon size={20} className={isChecked ? 'text-gold-400' : 'text-gray-500'} />
                    <div className="flex-1">
                      <p className={`font-medium ${isChecked ? 'text-white' : 'text-gray-400'}`}>
                        {menu.label}
                      </p>
                    </div>
                    {isChecked && <CheckCircle size={16} className="text-gold-400" />}
                  </div>
                );
              })}
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
              onClick={saveMenuPermissions}
              disabled={saving}
              className="bg-gold-500 hover:bg-gold-400 text-black"
            >
              {saving ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              Guardar Menus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientMenus;
