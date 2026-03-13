import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Users,
  UserPlus,
  Handshake,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Target,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Plus,
  RefreshCw,
  Calendar
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRMDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [openDeals, setOpenDeals] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes, tasksRes, dealsRes] = await Promise.all([
        axios.get(`${API_URL}/api/crm/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/crm/leads?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/crm/tasks?status=pending&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/crm/deals?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setStats(statsRes.data);
      setRecentLeads(leadsRes.data);
      setPendingTasks(tasksRes.data);
      setOpenDeals(dealsRes.data.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)));
    } catch (err) {
      console.error('Error fetching CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(value || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-500/20 text-blue-400',
      contacted: 'bg-yellow-500/20 text-yellow-400',
      qualified: 'bg-emerald-500/20 text-emerald-400',
      proposal: 'bg-purple-500/20 text-purple-400',
      negotiation: 'bg-orange-500/20 text-orange-400',
      won: 'bg-green-500/20 text-green-400',
      lost: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-500/20 text-gray-400',
      medium: 'bg-blue-500/20 text-blue-400',
      high: 'bg-orange-500/20 text-orange-400',
      urgent: 'bg-red-500/20 text-red-400'
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Dashboard</h1>
          <p className="text-gray-400">Visão geral do relacionamento com clientes e fornecedores</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchDashboardData}
            variant="outline"
            className="border-zinc-700"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Suppliers */}
        <Card 
          className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-gold-500/30 transition-colors"
          onClick={() => navigate('/dashboard/crm/suppliers')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Fornecedores</p>
                <p className="text-2xl font-bold text-white">{stats?.total_suppliers || 0}</p>
                <p className="text-xs text-emerald-400">{stats?.active_suppliers || 0} ativos</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Handshake size={24} className="text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card 
          className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-gold-500/30 transition-colors"
          onClick={() => navigate('/dashboard/crm/leads')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Leads</p>
                <p className="text-2xl font-bold text-white">{stats?.total_leads || 0}</p>
                <p className="text-xs text-blue-400">{stats?.new_leads || 0} novos</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <UserPlus size={24} className="text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deals */}
        <Card 
          className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-gold-500/30 transition-colors"
          onClick={() => navigate('/dashboard/crm/deals')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Negociações</p>
                <p className="text-2xl font-bold text-white">{stats?.total_deals || 0}</p>
                <p className="text-xs text-purple-400">{stats?.open_deals || 0} abertas</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Target size={24} className="text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pipeline</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(stats?.pipeline_value)}</p>
                <p className="text-xs text-gold-400">{formatCurrency(stats?.won_deal_value)} ganhos</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center">
                <DollarSign size={24} className="text-gold-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tasks */}
        <Card 
          className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-gold-500/30 transition-colors"
          onClick={() => navigate('/dashboard/crm/tasks')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Clock size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white font-medium">{stats?.pending_tasks || 0} Tarefas Pendentes</p>
                {stats?.overdue_tasks > 0 && (
                  <p className="text-xs text-red-400">{stats.overdue_tasks} em atraso</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card 
          className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-gold-500/30 transition-colors"
          onClick={() => navigate('/dashboard/crm/contacts')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Users size={20} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white font-medium">{stats?.total_contacts || 0} Contactos</p>
                <p className="text-xs text-gray-400">Pessoas de contacto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verified Suppliers */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">{stats?.verified_suppliers || 0} Verificados</p>
                <p className="text-xs text-gray-400">Fornecedores verificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">Leads Recentes</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard/crm/leads')}
              className="text-gold-400"
            >
              Ver Todos <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserPlus size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum lead registado</p>
                <Button 
                  onClick={() => navigate('/dashboard/crm/leads')}
                  className="mt-4 bg-gold-500 hover:bg-gold-400 text-black"
                  size="sm"
                >
                  <Plus size={14} className="mr-1" /> Adicionar Lead
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map(lead => (
                  <div 
                    key={lead.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                    onClick={() => navigate(`/dashboard/crm/leads?id=${lead.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-400 font-medium">
                          {lead.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{lead.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {lead.company_name && <span>{lead.company_name}</span>}
                          {lead.country && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin size={10} /> {lead.country}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={`border-0 ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-white text-lg">Tarefas Pendentes</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard/crm/tasks')}
              className="text-gold-400"
            >
              Ver Todas <ArrowRight size={14} className="ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div 
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      task.is_overdue ? 'bg-red-900/20 border border-red-800/50' : 'bg-zinc-800/50 hover:bg-zinc-800'
                    }`}
                    onClick={() => navigate(`/dashboard/crm/tasks?id=${task.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        task.is_overdue ? 'bg-red-500/20' : 'bg-orange-500/20'
                      }`}>
                        {task.is_overdue ? (
                          <AlertCircle size={20} className="text-red-400" />
                        ) : (
                          <Clock size={20} className="text-orange-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">{task.title}</p>
                        {task.due_date && (
                          <p className={`text-xs flex items-center gap-1 ${
                            task.is_overdue ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            <Calendar size={10} />
                            {new Date(task.due_date).toLocaleDateString('pt-PT')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`border-0 ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Deals Pipeline */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-white text-lg">Pipeline de Negociações</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard/crm/deals')}
            className="text-gold-400"
          >
            Ver Todas <ArrowRight size={14} className="ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {openDeals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhuma negociação aberta</p>
              <Button 
                onClick={() => navigate('/dashboard/crm/deals')}
                className="mt-4 bg-gold-500 hover:bg-gold-400 text-black"
                size="sm"
              >
                <Plus size={14} className="mr-1" /> Nova Negociação
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openDeals.slice(0, 6).map(deal => (
                <div 
                  key={deal.id}
                  className="p-4 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                  onClick={() => navigate(`/dashboard/crm/deals?id=${deal.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium truncate">{deal.title}</p>
                    <Badge className="border-0 bg-purple-500/20 text-purple-400 text-xs">
                      {deal.stage?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gold-400 font-bold">
                      {formatCurrency(deal.amount, deal.currency)}
                    </span>
                    {deal.probability > 0 && (
                      <span className="text-xs text-gray-400">{deal.probability}%</span>
                    )}
                  </div>
                  {deal.supplier_name && (
                    <p className="text-xs text-gray-400 mt-2 truncate">
                      Fornecedor: {deal.supplier_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={() => navigate('/dashboard/crm/suppliers')}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <Plus size={16} className="mr-2" /> Novo Fornecedor
        </Button>
        <Button 
          onClick={() => navigate('/dashboard/crm/leads')}
          className="bg-blue-600 hover:bg-blue-500"
        >
          <Plus size={16} className="mr-2" /> Novo Lead
        </Button>
        <Button 
          onClick={() => navigate('/dashboard/crm/deals')}
          className="bg-purple-600 hover:bg-purple-500"
        >
          <Plus size={16} className="mr-2" /> Nova Negociação
        </Button>
        <Button 
          onClick={() => navigate('/dashboard/crm/tasks')}
          variant="outline"
          className="border-zinc-700"
        >
          <Plus size={16} className="mr-2" /> Nova Tarefa
        </Button>
      </div>
    </div>
  );
};

export default CRMDashboard;
