import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber, formatDate} from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { 
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Crown,
  Target,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  UserCheck,
  XCircle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRMAdvancedDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topClientsPeriod, setTopClientsPeriod] = useState('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/crm/dashboard/advanced`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };
  const getRegionLabel = (region) => {
    const labels = {
      europe: 'Europa',
      mena: 'MENA',
      latam: 'LATAM',
      global: 'Global'
    };
    return labels[region] || region;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Erro ao carregar dados</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <BarChart3 className="text-gold-400" />
            Dashboard Avançado
          </h1>
          <p className="text-gray-400 mt-1">Métricas e análises do CRM</p>
        </div>
        <Button
          onClick={fetchDashboardData}
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Churn Analysis Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <Users size={14} />
              <span className="text-xs uppercase">Total Clientes</span>
            </div>
            <p className="text-2xl font-light text-white">{formatNumber(data.churn_analysis?.total_clients || 0, 0)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle size={14} />
              <span className="text-xs uppercase">Ativos</span>
            </div>
            <p className="text-2xl font-light text-green-400">{formatNumber(data.churn_analysis?.active || 0, 0)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-yellow-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <AlertTriangle size={14} />
              <span className="text-xs uppercase">Em Risco</span>
            </div>
            <p className="text-2xl font-light text-yellow-400">{formatNumber(data.churn_analysis?.at_risk || 0, 0)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-red-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <XCircle size={14} />
              <span className="text-xs uppercase">Churned</span>
            </div>
            <p className="text-2xl font-light text-red-400">{formatNumber(data.churn_analysis?.churned || 0, 0)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-red-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <TrendingDown size={14} />
              <span className="text-xs uppercase">Churn Rate</span>
            </div>
            <p className="text-2xl font-light text-red-400">{data.churn_analysis?.churn_rate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 10 Clients */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
                <Crown size={18} />
                Top 10 Clientes (Volume 30d)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.top_clients?.length > 0 ? (
              <div className="space-y-3">
                {data.top_clients.map((client, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{client.user?.name || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs">{client.order_count} ordens</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gold-400 font-mono">€{formatNumber(client.total_volume)}</p>
                      <Badge className="bg-zinc-700 text-gray-300 text-xs">
                        {getRegionLabel(client.user?.region)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem dados de trading</p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline de Vendas */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <Target size={18} />
              Pipeline de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Leads Funnel */}
            <div>
              <h4 className="text-sm text-gray-400 mb-3">Leads</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white">Novos</span>
                  <Badge className="bg-blue-900/30 text-blue-400">{data.pipeline?.leads?.new || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Contactados</span>
                  <Badge className="bg-purple-900/30 text-purple-400">{data.pipeline?.leads?.contacted || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Qualificados</span>
                  <Badge className="bg-gold-900/30 text-gold-400">{data.pipeline?.leads?.qualified || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white">Em Proposta</span>
                  <Badge className="bg-orange-900/30 text-orange-400">{data.pipeline?.leads?.proposal || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-400">Ganhos</span>
                  <Badge className="bg-green-900/30 text-green-400">{data.pipeline?.leads?.won || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-400">Perdidos</span>
                  <Badge className="bg-red-900/30 text-red-400">{data.pipeline?.leads?.lost || 0}</Badge>
                </div>
              </div>
              <div className="mt-3 p-2 bg-zinc-800/50 rounded text-center">
                <span className="text-gray-400 text-sm">Taxa de Conversão: </span>
                <span className="text-gold-400 font-bold">{data.pipeline?.leads?.conversion_rate || 0}%</span>
              </div>
            </div>

            {/* Deals Value */}
            <div className="pt-4 border-t border-gold-800/20">
              <h4 className="text-sm text-gray-400 mb-3">Negociações</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                  <p className="text-xl font-light text-blue-400">{data.pipeline?.deals?.discovery || 0}</p>
                  <p className="text-xs text-gray-400">Discovery</p>
                </div>
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                  <p className="text-xl font-light text-gold-400">{data.pipeline?.deals?.negotiation || 0}</p>
                  <p className="text-xs text-gray-400">Negociação</p>
                </div>
                <div className="text-center p-2 bg-zinc-800/50 rounded">
                  <p className="text-xl font-light text-green-400">{data.pipeline?.deals?.closed_won || 0}</p>
                  <p className="text-xs text-gray-400">Fechadas</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-gold-900/20 border border-gold-800/30 rounded text-center">
                <span className="text-gray-400 text-sm">Valor Pipeline: </span>
                <span className="text-gold-400 font-bold text-xl">€{formatNumber(data.pipeline?.deals?.pipeline_value || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Stats */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <Globe size={18} />
              Distribuição Regional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['europe', 'mena', 'latam', 'global'].map((region) => {
                const clients = data.regional?.clients?.[region] || 0;
                const volume = data.regional?.volume?.[region] || 0;
                const totalClients = data.churn_analysis?.total_clients || 1;
                const percentage = Math.round((clients / totalClients) * 100);
                
                const colors = {
                  europe: 'bg-blue-500',
                  mena: 'bg-green-500',
                  latam: 'bg-yellow-500',
                  global: 'bg-purple-500'
                };
                
                return (
                  <div key={region} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{getRegionLabel(region)}</span>
                      <div className="text-right">
                        <span className="text-gray-400 text-sm">{clients} clientes</span>
                        <span className="text-gold-400 ml-3">€{formatNumber(volume)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[region]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <UserCheck size={18} />
              Compliance & KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg text-center">
                <p className="text-3xl font-light text-green-400">{data.compliance?.kyc?.approved || 0}</p>
                <p className="text-xs text-gray-400 mt-1">KYC Aprovado</p>
              </div>
              <div className="p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-lg text-center">
                <p className="text-3xl font-light text-yellow-400">{data.compliance?.kyc?.pending || 0}</p>
                <p className="text-xs text-gray-400 mt-1">KYC Pendente</p>
              </div>
              <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-center">
                <p className="text-3xl font-light text-red-400">{data.compliance?.kyc?.rejected || 0}</p>
                <p className="text-xs text-gray-400 mt-1">KYC Rejeitado</p>
              </div>
              <div className="p-3 bg-gray-900/50 border border-gray-800/30 rounded-lg text-center">
                <p className="text-3xl font-light text-gray-400">{data.compliance?.kyc?.not_started || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Não Iniciado</p>
              </div>
            </div>
            
            <div className="p-3 bg-gold-900/20 border border-gold-800/30 rounded-lg text-center mb-4">
              <span className="text-gray-400">Taxa de Aprovação: </span>
              <span className="text-gold-400 font-bold text-xl">{data.compliance?.kyc?.approval_rate || 0}%</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Clock size={14} />
                  <span className="text-xs">Tarefas Pendentes</span>
                </div>
                <p className="text-xl font-light text-white">{data.compliance?.pending_tasks || 0}</p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <AlertTriangle size={14} />
                  <span className="text-xs">Tarefas Atrasadas</span>
                </div>
                <p className="text-xl font-light text-red-400">{data.compliance?.overdue_tasks || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Supplier Performance */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <Building size={18} />
              Performance Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.suppliers?.length > 0 ? (
              <div className="space-y-3">
                {data.suppliers.slice(0, 5).map((supplier, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{supplier.name}</p>
                      <p className="text-gray-400 text-xs">{supplier.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-green-400 font-mono">{supplier.uptime}%</p>
                        <p className="text-xs text-gray-500">Uptime</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gold-400">★ {supplier.rating}</p>
                        <p className="text-xs text-gray-500">Rating</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem fornecedores activos</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <Activity size={18} />
              Actividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_activities?.length > 0 ? (
              <div className="space-y-3">
                {data.recent_activities.map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'order' ? 'bg-green-900/30' :
                      activity.type === 'lead' ? 'bg-blue-900/30' :
                      'bg-purple-900/30'
                    }`}>
                      {activity.type === 'order' ? (
                        <TrendingUp size={14} className="text-green-400" />
                      ) : activity.type === 'lead' ? (
                        <Users size={14} className="text-blue-400" />
                      ) : (
                        <Zap size={14} className="text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.description}</p>
                      <p className="text-gray-500 text-xs">{formatDate(activity.date)}</p>
                    </div>
                    {activity.value > 0 && (
                      <span className="text-gold-400 font-mono text-sm">€{formatNumber(activity.value)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem actividade recente</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMAdvancedDashboard;
