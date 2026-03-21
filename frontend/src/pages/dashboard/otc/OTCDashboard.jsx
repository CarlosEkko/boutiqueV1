import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Briefcase,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  UserPlus,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/otc/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch OTC dashboard:', err);
      toast.error('Erro ao carregar dashboard OTC');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Carregando dashboard OTC...</div>
      </div>
    );
  }

  const pipelineStages = [
    { key: 'rfq', label: 'RFQ', color: 'bg-blue-500' },
    { key: 'quote', label: 'Quote', color: 'bg-purple-500' },
    { key: 'acceptance', label: 'Aceitação', color: 'bg-gold-500' },
    { key: 'execution', label: 'Execução', color: 'bg-orange-500' },
    { key: 'settlement', label: 'Liquidação', color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Briefcase className="text-gold-400" />
            OTC Desk
          </h1>
          <p className="text-gray-400 mt-1">Gestão de operações Over-The-Counter</p>
        </div>
        <Button
          onClick={fetchDashboard}
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Volume Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <DollarSign size={14} />
              <span className="text-xs uppercase">Volume 24h</span>
            </div>
            <p className="text-2xl font-light text-gold-400">
              ${formatNumber(data?.volume?.['24h'] || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <TrendingUp size={14} />
              <span className="text-xs uppercase">Volume 7d</span>
            </div>
            <p className="text-2xl font-light text-white">
              ${formatNumber(data?.volume?.['7d'] || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <BarChart3 size={14} />
              <span className="text-xs uppercase">Volume 30d</span>
            </div>
            <p className="text-2xl font-light text-white">
              ${formatNumber(data?.volume?.['30d'] || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900/50 border-green-800/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <DollarSign size={14} />
              <span className="text-xs uppercase">Receita Total</span>
            </div>
            <p className="text-2xl font-light text-green-400">
              ${formatNumber(data?.revenue?.total || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Leads Card */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <UserPlus size={18} />
              Leads OTC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-3xl font-light text-white">{data?.leads?.total || 0}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="text-center p-3 bg-blue-900/20 rounded-lg">
                <p className="text-3xl font-light text-blue-400">{data?.leads?.new || 0}</p>
                <p className="text-xs text-gray-400">Novos</p>
              </div>
              <div className="text-center p-3 bg-gold-900/20 rounded-lg">
                <p className="text-3xl font-light text-gold-400">{data?.leads?.qualified || 0}</p>
                <p className="text-xs text-gray-400">Qualificados</p>
              </div>
              <div className="text-center p-3 bg-green-900/20 rounded-lg">
                <p className="text-3xl font-light text-green-400">{data?.leads?.converted || 0}</p>
                <p className="text-xs text-gray-400">Convertidos</p>
              </div>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg text-center">
              <span className="text-gray-400">Taxa de Conversão: </span>
              <span className="text-gold-400 font-bold">{data?.leads?.conversion_rate || 0}%</span>
            </div>
            <Button 
              onClick={() => navigate('/dashboard/otc/leads')}
              className="w-full bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
            >
              Ver Leads
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Clients Card */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <Users size={18} />
              Clientes OTC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-3xl font-light text-white">{data?.clients?.total || 0}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="text-center p-3 bg-green-900/20 rounded-lg">
                <p className="text-3xl font-light text-green-400">{data?.clients?.active || 0}</p>
                <p className="text-xs text-gray-400">Ativos</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/dashboard/otc/clients')}
              className="w-full bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
            >
              Ver Clientes
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Deals Card */}
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
              <Target size={18} />
              Deals OTC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-2xl font-light text-white">{data?.deals?.total || 0}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
              <div className="text-center p-3 bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-light text-blue-400">{data?.deals?.active || 0}</p>
                <p className="text-xs text-gray-400">Ativos</p>
              </div>
              <div className="text-center p-3 bg-green-900/20 rounded-lg">
                <p className="text-2xl font-light text-green-400">{data?.deals?.completed || 0}</p>
                <p className="text-xs text-gray-400">Completos</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/dashboard/otc/pipeline')}
              className="w-full bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
            >
              Ver Pipeline
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardHeader>
          <CardTitle className="text-lg text-gold-400 flex items-center gap-2">
            <Target size={18} />
            Pipeline OTC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {pipelineStages.map((stage, idx) => {
              const count = data?.deals?.pipeline?.[stage.key] || 0;
              return (
                <React.Fragment key={stage.key}>
                  <div className="flex-1 min-w-[120px]">
                    <div className={`${stage.color} rounded-lg p-4 text-center`}>
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-xs text-white/80">{stage.label}</p>
                    </div>
                  </div>
                  {idx < pipelineStages.length - 1 && (
                    <ArrowRight size={20} className="text-gray-500 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OTCDashboard;
