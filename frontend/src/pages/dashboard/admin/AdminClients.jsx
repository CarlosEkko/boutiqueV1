import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
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
  Users, 
  Search,
  Mail,
  Phone,
  Eye,
  UserCog,
  UserPlus,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminClients = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  
  // Dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  useEffect(() => {
    fetchClients();
    fetchStaffMembers();
  }, [token]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users?user_type=client`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/users?user_type=internal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter to get staff members who can be account managers
      const staff = (response.data || []).filter(u => 
        u.user_type === 'internal' || u.is_admin
      );
      setStaffMembers(staff);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const handleAssignManager = async () => {
    if (!selectedClient) return;
    
    try {
      await axios.put(
        `${API_URL}/api/admin/users/${selectedClient.id}/assign-manager`,
        { manager_id: selectedManagerId || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(selectedManagerId ? 'Account Manager atribuído com sucesso!' : 'Account Manager removido');
      fetchClients();
      setShowAssignDialog(false);
      setSelectedClient(null);
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

  const getTierBadge = (tier) => {
    const config = {
      standard: 'bg-gray-900/30 text-gray-400 border-gray-800/30',
      premium: 'bg-blue-900/30 text-blue-400 border-blue-800/30',
      vip: 'bg-gold-900/30 text-gold-400 border-gold-800/30',
    };
    return (
      <Badge className={`${config[tier] || config.standard} border`}>
        {tier?.toUpperCase() || 'STANDARD'}
      </Badge>
    );
  };

  const getRegionBadge = (region) => {
    const config = {
      europe: { label: 'Europa', flag: '🇪🇺' },
      mena: { label: 'MENA', flag: '🌍' },
      latam: { label: 'LATAM', flag: '🌎' },
    };
    const r = config[region] || { label: region, flag: '🌐' };
    return (
      <span className="flex items-center gap-1 text-sm text-gray-400">
        <span>{r.flag}</span>
        <span>{r.label}</span>
      </span>
    );
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === 'all' || client.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Users className="text-gold-400" />
            Clientes
          </h1>
          <p className="text-gray-400 mt-1">Gestão de clientes e atribuição de Account Managers</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Total Clientes</p>
            <p className="text-2xl font-mono text-white">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Com Account Manager</p>
            <p className="text-2xl font-mono text-green-400">
              {clients.filter(c => c.assigned_to).length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Sem Account Manager</p>
            <p className="text-2xl font-mono text-yellow-400">
              {clients.filter(c => !c.assigned_to).length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-sm">Staff Disponível</p>
            <p className="text-2xl font-mono text-gold-400">{staffMembers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome ou email..."
            className="pl-10 bg-zinc-900 border-gold-800/30"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'europe', 'mena', 'latam'].map(r => (
            <Button
              key={r}
              variant={regionFilter === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRegionFilter(r)}
              className={regionFilter === r ? 'bg-gold-500 text-black' : 'border-gold-800/30'}
            >
              {r === 'all' ? 'Todas' : r.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Clients List */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {filteredClients.length > 0 ? (
            <div className="divide-y divide-gold-800/10">
              {filteredClients.map(client => (
                <div key={client.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <span className="text-gold-400 font-bold">
                        {client.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{client.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Mail size={12} />
                        {client.email}
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Phone size={12} />
                          {client.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    {/* Account Manager */}
                    <div className="flex items-center gap-2">
                      <UserCog size={14} className="text-gray-500" />
                      {client.assigned_to ? (
                        <Badge className="bg-green-900/30 text-green-400 border border-green-800/30">
                          {getManagerName(client.assigned_to)}
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-900/30 text-yellow-400 border border-yellow-800/30">
                          Sem Manager
                        </Badge>
                      )}
                    </div>
                    
                    {getRegionBadge(client.region)}
                    {getTierBadge(client.membership_level)}
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-gold-800/30 text-gold-400"
                        onClick={() => {
                          setSelectedClient(client);
                          setSelectedManagerId(client.assigned_to || '');
                          setShowAssignDialog(true);
                        }}
                      >
                        <UserPlus size={14} className="mr-1" />
                        {client.assigned_to ? 'Alterar' : 'Atribuir'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-gold-800/30 text-gray-400"
                      >
                        <Eye size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Clientes</h3>
              <p className="text-gray-400">Nenhum cliente encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Manager Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="bg-zinc-900 border-gold-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserCog className="text-gold-400" />
              Atribuir Account Manager
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Client Info */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-gray-400 text-xs uppercase mb-1">Cliente</p>
              <p className="text-white font-medium">{selectedClient?.name}</p>
              <p className="text-gray-400 text-sm">{selectedClient?.email}</p>
            </div>
            
            {/* Manager Selection */}
            <div className="space-y-2">
              <Label className="text-white">Selecionar Account Manager</Label>
              <Select value={selectedManagerId || "none"} onValueChange={(val) => setSelectedManagerId(val === "none" ? "" : val)}>
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
                O Account Manager será responsável por este cliente e receberá notificações relevantes.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setSelectedClient(null);
                setSelectedManagerId('');
              }}
              className="border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignManager}
              className="bg-gold-500 hover:bg-gold-400 text-black"
            >
              <UserCog size={16} className="mr-2" />
              {selectedManagerId ? 'Atribuir Manager' : 'Remover Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;
