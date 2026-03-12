import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { 
  Users, 
  Search,
  Mail,
  Phone,
  MapPin,
  Eye,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminClients = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    fetchClients();
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
          <p className="text-gray-400 mt-1">Gestão de clientes e pipeline de vendas</p>
        </div>
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
              className={regionFilter === r ? 'bg-gold-500' : 'border-gold-800/30'}
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
                <div key={client.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                  <div className="flex items-center gap-3">
                    {getRegionBadge(client.region)}
                    {getTierBadge(client.membership_level)}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gold-800/30 text-gold-400"
                    >
                      <Eye size={14} className="mr-1" />
                      Ver
                    </Button>
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
    </div>
  );
};

export default AdminClients;
