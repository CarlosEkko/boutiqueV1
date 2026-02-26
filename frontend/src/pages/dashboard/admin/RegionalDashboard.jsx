import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { 
  Users, 
  Globe,
  Ticket,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  UserPlus,
  Shield,
  Crown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RegionalDashboard = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegionalStats();
  }, [token]);

  const fetchRegionalStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats/regional`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load regional stats', err);
      setError('Falha ao carregar estatísticas regionais');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const regionNames = {
    europe: { name: 'Europa', flag: '🇪🇺', color: 'blue' },
    mena: { name: 'MENA', flag: '🌍', color: 'amber' },
    latam: { name: 'LATAM', flag: '🌎', color: 'green' }
  };

  const MetricCard = ({ value, label, icon: Icon, color = 'gold' }) => (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
        <Icon className={`text-${color}-400`} size={20} />
      </div>
      <div>
        <p className="text-2xl font-light text-white">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  );

  const RegionCard = ({ regionKey, data }) => {
    const region = regionNames[regionKey];
    const colorClasses = {
      blue: 'from-blue-900/30 to-blue-950/50 border-blue-800/30',
      amber: 'from-amber-900/30 to-amber-950/50 border-amber-800/30',
      green: 'from-green-900/30 to-green-950/50 border-green-800/30'
    };

    return (
      <Card className={`bg-gradient-to-br ${colorClasses[region.color]} border`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{region.flag}</span>
            <span className="text-white font-medium">{region.name}</span>
            {data.tickets.urgent > 0 && (
              <span className="ml-auto flex items-center gap-1 text-red-400 text-sm">
                <AlertTriangle size={16} />
                {data.tickets.urgent} urgente{data.tickets.urgent > 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Clients Section */}
          <div>
            <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <Users size={14} /> Clientes
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                value={data.clients.total} 
                label="Total" 
                icon={Users}
                color={region.color}
              />
              <MetricCard 
                value={data.clients.approved} 
                label="Aprovados" 
                icon={CheckCircle}
                color="green"
              />
              <MetricCard 
                value={data.clients.pending} 
                label="Pendentes" 
                icon={Clock}
                color="gold"
              />
              <MetricCard 
                value={data.clients.new_this_month} 
                label="Novos (30d)" 
                icon={UserPlus}
                color="purple"
              />
            </div>
          </div>

          {/* Tiers Section */}
          <div>
            <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <Crown size={14} /> Níveis de Membership
            </h4>
            <div className="flex gap-4">
              <div className="flex-1 bg-zinc-900/50 rounded-lg p-3 text-center">
                <p className="text-xl font-light text-gray-300">{data.tiers.standard}</p>
                <p className="text-xs text-gray-500">Standard</p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-gold-900/30 to-gold-950/50 rounded-lg p-3 text-center border border-gold-800/20">
                <p className="text-xl font-light text-gold-400">{data.tiers.premium}</p>
                <p className="text-xs text-gold-600">Premium</p>
              </div>
              <div className="flex-1 bg-gradient-to-br from-purple-900/30 to-purple-950/50 rounded-lg p-3 text-center border border-purple-800/20">
                <p className="text-xl font-light text-purple-400">{data.tiers.elite}</p>
                <p className="text-xs text-purple-600">Elite</p>
              </div>
            </div>
          </div>

          {/* KYC Section */}
          <div>
            <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <Shield size={14} /> KYC Status
            </h4>
            <div className="flex gap-2">
              <div className="flex-1 bg-green-900/20 rounded-lg p-2 text-center">
                <p className="text-lg font-light text-green-400">{data.kyc.approved}</p>
                <p className="text-xs text-green-600">Aprovados</p>
              </div>
              <div className="flex-1 bg-gold-900/20 rounded-lg p-2 text-center">
                <p className="text-lg font-light text-gold-400">{data.kyc.pending}</p>
                <p className="text-xs text-gold-600">Pendentes</p>
              </div>
              <div className="flex-1 bg-zinc-800/50 rounded-lg p-2 text-center">
                <p className="text-lg font-light text-gray-400">{data.kyc.not_started}</p>
                <p className="text-xs text-gray-500">Não Iniciados</p>
              </div>
            </div>
          </div>

          {/* Tickets Section */}
          <div>
            <h4 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <Ticket size={14} /> Tickets de Suporte
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded-lg p-2 text-center ${data.tickets.open > 0 ? 'bg-blue-900/30' : 'bg-zinc-800/30'}`}>
                <p className={`text-lg font-light ${data.tickets.open > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                  {data.tickets.open}
                </p>
                <p className="text-xs text-gray-500">Abertos</p>
              </div>
              <div className={`rounded-lg p-2 text-center ${data.tickets.in_progress > 0 ? 'bg-gold-900/30' : 'bg-zinc-800/30'}`}>
                <p className={`text-lg font-light ${data.tickets.in_progress > 0 ? 'text-gold-400' : 'text-gray-500'}`}>
                  {data.tickets.in_progress}
                </p>
                <p className="text-xs text-gray-500">Em Progresso</p>
              </div>
              <div className="bg-green-900/20 rounded-lg p-2 text-center">
                <p className="text-lg font-light text-green-400">{data.tickets.resolved}</p>
                <p className="text-xs text-green-600">Resolvidos</p>
              </div>
            </div>
          </div>

          {/* Staff */}
          <div className="pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Equipa Interna:</span>
              <span className="text-white">{data.staff.count} membro{data.staff.count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Globe className="text-gold-400" />
            Dashboard Regional
          </h1>
          <p className="text-gray-400 mt-1">Métricas por região geográfica</p>
        </div>
      </div>

      {/* Global Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                <Users className="text-gold-400" size={24} />
              </div>
              <div>
                <p className="text-3xl font-light text-white">{stats?.global_summary?.total_clients || 0}</p>
                <p className="text-sm text-gray-400">Total Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Ticket className="text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-3xl font-light text-white">{stats?.global_summary?.total_active_tickets || 0}</p>
                <p className="text-sm text-gray-400">Tickets Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${stats?.global_summary?.total_urgent_tickets > 0 ? 'bg-red-500/20' : 'bg-green-500/20'} flex items-center justify-center`}>
                <AlertTriangle className={stats?.global_summary?.total_urgent_tickets > 0 ? 'text-red-400' : 'text-green-400'} size={24} />
              </div>
              <div>
                <p className={`text-3xl font-light ${stats?.global_summary?.total_urgent_tickets > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {stats?.global_summary?.total_urgent_tickets || 0}
                </p>
                <p className="text-sm text-gray-400">Tickets Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Globe className="text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-3xl font-light text-white">{stats?.global_summary?.regions_count || 0}</p>
                <p className="text-sm text-gray-400">Regiões Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stats?.regions && Object.entries(stats.regions).map(([regionKey, data]) => (
          <RegionCard key={regionKey} regionKey={regionKey} data={data} />
        ))}
      </div>
    </div>
  );
};

export default RegionalDashboard;
