import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber } from '../../../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
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
  Search,
  Eye,
  TrendingUp,
  TrendingDown,
  Wallet,
  History,
  Ticket,
  UserCheck,
  Globe,
  Crown,
  Mail,
  Phone,
  Calendar,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRMClients = () => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [token]);

  useEffect(() => {
    fetchClients();
  }, [token, page, regionFilter, tierFilter, kycFilter]);

  const fetchOverview = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/clients/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOverview(response.data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/crm/clients?skip=${page * limit}&limit=${limit}`;
      if (regionFilter !== 'all') url += `&region=${regionFilter}`;
      if (tierFilter !== 'all') url += `&tier=${tierFilter}`;
      if (kycFilter !== 'all') url += `&kyc_status=${kycFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data.clients || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      toast.error('Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const openClientDetail = async (client) => {
    setSelectedClient(client);
    setShowDetail(true);
    setLoadingDetail(true);
    setClientDetail(null);
    
    try {
      const response = await axios.get(`${API_URL}/api/crm/clients/${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientDetail(response.data);
    } catch (err) {
      toast.error('Falha ao carregar detalhes do cliente');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchClients();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRegionBadge = (region) => {
    const config = {
      europe: { label: 'Europa', color: 'bg-blue-900/30 text-blue-400' },
      mena: { label: 'MENA', color: 'bg-green-900/30 text-green-400' },
      latam: { label: 'LATAM', color: 'bg-yellow-900/30 text-yellow-400' }
    };
    const r = config[region] || { label: region || 'N/A', color: 'bg-gray-900/30 text-gray-400' };
    return <Badge className={r.color}>{r.label}</Badge>;
  };

  const getTierBadge = (tier) => {
    const config = {
      standard: { label: 'Standard', color: 'bg-gray-900/30 text-gray-400' },
      premium: { label: 'Premium', color: 'bg-blue-900/30 text-blue-400' },
      vip: { label: 'VIP', color: 'bg-gold-900/30 text-gold-400' }
    };
    const t = config[tier] || config.standard;
    return <Badge className={t.color}>{t.label}</Badge>;
  };

  const getKYCBadge = (status) => {
    const config = {
      approved: { label: 'Aprovado', color: 'bg-green-900/30 text-green-400' },
      pending: { label: 'Pendente', color: 'bg-gold-900/30 text-gold-400' },
      rejected: { label: 'Rejeitado', color: 'bg-red-900/30 text-red-400' },
      not_started: { label: 'Não Iniciado', color: 'bg-gray-900/30 text-gray-400' }
    };
    const k = config[status] || config.not_started;
    return <Badge className={k.color}>{k.label}</Badge>;
  };

  const getFrequencyBadge = (frequency) => {
    const config = {
      high: { label: 'Alta', color: 'bg-green-900/30 text-green-400' },
      medium: { label: 'Média', color: 'bg-blue-900/30 text-blue-400' },
      low: { label: 'Baixa', color: 'bg-yellow-900/30 text-yellow-400' },
      none: { label: 'Nenhuma', color: 'bg-gray-900/30 text-gray-400' }
    };
    const f = config[frequency] || config.none;
    return <Badge className={f.color}>{f.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <Users className="text-gold-400" />
            Meus Clientes
          </h1>
          <p className="text-gray-400 mt-1">Visão 360° dos seus clientes atribuídos</p>
        </div>
        <Button
          onClick={() => { fetchClients(); fetchOverview(); }}
          variant="outline"
          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
        >
          <RefreshCw size={16} className="mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Users size={14} />
                <span className="text-xs uppercase">Total Clientes</span>
              </div>
              <p className="text-2xl font-light text-white">{formatNumber(overview.total_clients, 0)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Activity size={14} />
                <span className="text-xs uppercase">Ativos (30d)</span>
              </div>
              <p className="text-2xl font-light text-green-400">{formatNumber(overview.active_this_month, 0)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <TrendingUp size={14} />
                <span className="text-xs uppercase">Volume (30d)</span>
              </div>
              <p className="text-2xl font-light text-gold-400">€{formatNumber(overview.total_volume_this_month)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Crown size={14} />
                <span className="text-xs uppercase">VIP</span>
              </div>
              <p className="text-2xl font-light text-gold-400">{overview.by_tier?.vip || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <UserCheck size={14} />
                <span className="text-xs uppercase">KYC Aprovado</span>
              </div>
              <p className="text-2xl font-light text-green-400">{overview.by_kyc?.approved || 0}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Clock size={14} />
                <span className="text-xs uppercase">KYC Pendente</span>
              </div>
              <p className="text-2xl font-light text-yellow-400">{overview.by_kyc?.pending || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por nome, email ou telefone..."
                className="pl-10 bg-zinc-800 border-gold-500/30 text-white"
              />
            </div>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40 bg-zinc-800 border-gold-500/30">
                <Globe size={14} className="mr-2" />
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all">Todas Regiões</SelectItem>
                <SelectItem value="europe">Europa</SelectItem>
                <SelectItem value="mena">MENA</SelectItem>
                <SelectItem value="latam">LATAM</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-40 bg-zinc-800 border-gold-500/30">
                <Crown size={14} className="mr-2" />
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all">Todos Níveis</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-40 bg-zinc-800 border-gold-500/30">
                <UserCheck size={14} className="mr-2" />
                <SelectValue placeholder="KYC" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all">Todos KYC</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="not_started">Não Iniciado</SelectItem>
              </SelectContent>
            </Select>
            
            <Button type="submit" className="bg-gold-500 hover:bg-gold-400 text-black">
              <Search size={16} className="mr-2" />
              Pesquisar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gold-400">Carregando...</div>
            </div>
          ) : clients.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gold-800/20">
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Cliente</th>
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Região</th>
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Nível</th>
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">KYC</th>
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Volume Total</th>
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Frequência</th>
                      <th className="text-left p-4 text-gray-400 text-sm font-medium">Tickets</th>
                      <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                              <span className="text-gold-400 font-bold">
                                {client.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{client.name}</p>
                              <p className="text-gray-400 text-sm">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{getRegionBadge(client.region)}</td>
                        <td className="p-4">{getTierBadge(client.membership_level)}</td>
                        <td className="p-4">{getKYCBadge(client.kyc_status)}</td>
                        <td className="p-4">
                          <span className="text-white font-mono">
                            €{formatNumber(client.trading_stats?.total_volume_eur || 0)}
                          </span>
                        </td>
                        <td className="p-4">{getFrequencyBadge(client.trading_stats?.trading_frequency)}</td>
                        <td className="p-4">
                          {client.pending_tickets > 0 ? (
                            <Badge className="bg-red-900/30 text-red-400">{client.pending_tickets}</Badge>
                          ) : (
                            <span className="text-gray-500">0</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => openClientDetail(client)}
                            size="sm"
                            variant="outline"
                            className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
                          >
                            <Eye size={14} className="mr-1" />
                            Ver 360°
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-gold-800/20">
                <p className="text-gray-400 text-sm">
                  Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total} clientes
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outline"
                    size="sm"
                    className="border-gold-500/30"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * limit >= total}
                    variant="outline"
                    size="sm"
                    className="border-gold-500/30"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Users className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Clientes</h3>
              <p className="text-gray-400">Nenhum cliente encontrado com os filtros selecionados.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-400">
              <Eye size={20} />
              Visão 360° do Cliente
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedClient?.name} - {selectedClient?.email}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gold-400">Carregando...</div>
            </div>
          ) : clientDetail ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-zinc-800">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <BarChart3 size={14} className="mr-1" />
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="trading" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <TrendingUp size={14} className="mr-1" />
                  Trading
                </TabsTrigger>
                <TabsTrigger value="wallets" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <Wallet size={14} className="mr-1" />
                  Carteiras
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <History size={14} className="mr-1" />
                  Atividade
                </TabsTrigger>
                <TabsTrigger value="support" className="data-[state=active]:bg-gold-500 data-[state=active]:text-black">
                  <Ticket size={14} className="mr-1" />
                  Suporte
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personal Info */}
                  <Card className="bg-zinc-800/50 border-gold-800/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gold-400 flex items-center gap-2">
                        <UserCheck size={14} />
                        Informação Pessoal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nome:</span>
                        <span className="text-white">{clientDetail.client?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{clientDetail.client?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Telefone:</span>
                        <span className="text-white">{clientDetail.client?.phone || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">País:</span>
                        <span className="text-white">{clientDetail.client?.country || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Região:</span>
                        {getRegionBadge(clientDetail.client?.region)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nível:</span>
                        {getTierBadge(clientDetail.client?.membership_level)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">KYC:</span>
                        {getKYCBadge(clientDetail.client?.kyc_status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Registado:</span>
                        <span className="text-white">{formatDate(clientDetail.client?.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trading Stats */}
                  <Card className="bg-zinc-800/50 border-gold-800/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gold-400 flex items-center gap-2">
                        <TrendingUp size={14} />
                        Perfil de Trading
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volume Total:</span>
                        <span className="text-white font-mono">€{formatNumber(clientDetail.trading_stats?.total_volume_eur || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Ordens:</span>
                        <span className="text-white">{clientDetail.trading_stats?.total_orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Compras:</span>
                        <span className="text-green-400">{clientDetail.trading_stats?.buy_orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vendas:</span>
                        <span className="text-red-400">{clientDetail.trading_stats?.sell_orders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Média por Ordem:</span>
                        <span className="text-white font-mono">€{formatNumber(clientDetail.trading_stats?.avg_order_value || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Frequência:</span>
                        {getFrequencyBadge(clientDetail.trading_stats?.trading_frequency)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Última Trade:</span>
                        <span className="text-white">{formatDate(clientDetail.trading_stats?.last_trade_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pares Favoritos:</span>
                        <span className="text-gold-400">{clientDetail.trading_stats?.favorite_pairs?.join(', ') || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Manager */}
                  <Card className="bg-zinc-800/50 border-gold-800/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gold-400 flex items-center gap-2">
                        <Building size={14} />
                        Account Manager
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientDetail.account_manager ? (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Nome:</span>
                            <span className="text-white">{clientDetail.account_manager.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-white">{clientDetail.account_manager.email}</span>
                          </div>
                          {clientDetail.account_manager.internal_role && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Função:</span>
                              <span className="text-white capitalize">{clientDetail.account_manager.internal_role}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">Sem account manager atribuído</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card className="bg-zinc-800/50 border-gold-800/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gold-400 flex items-center gap-2">
                        <Activity size={14} />
                        Resumo Rápido
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Carteiras:</span>
                        <span className="text-white">{clientDetail.wallets?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transações:</span>
                        <span className="text-white">{clientDetail.transactions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ordens:</span>
                        <span className="text-white">{clientDetail.orders?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Investimentos:</span>
                        <span className="text-white">{clientDetail.investments?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tickets:</span>
                        <span className="text-white">{clientDetail.tickets?.length || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Trading Tab */}
              <TabsContent value="trading" className="mt-4">
                <div className="space-y-4">
                  <h4 className="text-sm text-gray-400 uppercase">Últimas Ordens</h4>
                  {clientDetail.orders?.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {clientDetail.orders.map((order, idx) => (
                        <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${order.order_type === 'buy' ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                              {order.order_type === 'buy' ? (
                                <ArrowDownRight size={14} className="text-green-400" />
                              ) : (
                                <ArrowUpRight size={14} className="text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">
                                {order.order_type} {order.crypto_asset}
                              </p>
                              <p className="text-gray-400 text-xs">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-mono">{formatNumber(order.crypto_amount)} {order.crypto_asset}</p>
                            <p className="text-gray-400 text-sm">€{formatNumber(order.fiat_amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem ordens registadas</p>
                  )}
                </div>
              </TabsContent>

              {/* Wallets Tab */}
              <TabsContent value="wallets" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clientDetail.wallets?.length > 0 ? (
                    clientDetail.wallets.map((wallet, idx) => (
                      <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{wallet.asset_id || wallet.asset_name || wallet.asset || '-'}</span>
                          <Badge className={wallet.asset_type === 'fiat' ? 'bg-blue-900/30 text-blue-400' : 'bg-gold-900/30 text-gold-400'}>
                            {wallet.asset_type === 'fiat' ? 'Fiat' : 'Crypto'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-mono text-white">{formatNumber(wallet.balance)} {wallet.asset_id || wallet.asset || ''}</p>
                        {wallet.address && (
                          <p className="text-gray-500 text-xs font-mono truncate mt-2">{wallet.address}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8 col-span-2">Sem carteiras</p>
                  )}
                </div>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {clientDetail.activities?.length > 0 ? (
                    clientDetail.activities.map((activity, idx) => (
                      <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'transaction' ? 'bg-blue-900/30' :
                          activity.type === 'order' ? 'bg-green-900/30' :
                          'bg-purple-900/30'
                        }`}>
                          {activity.type === 'transaction' ? (
                            <History size={14} className="text-blue-400" />
                          ) : activity.type === 'order' ? (
                            <TrendingUp size={14} className="text-green-400" />
                          ) : (
                            <Ticket size={14} className="text-purple-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm">{activity.description}</p>
                          <p className="text-gray-500 text-xs">{formatDate(activity.date)}</p>
                        </div>
                        {activity.status && (
                          <Badge className="bg-zinc-700 text-gray-300">{activity.status}</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem atividade registada</p>
                  )}
                </div>
              </TabsContent>

              {/* Support Tab */}
              <TabsContent value="support" className="mt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {clientDetail.tickets?.length > 0 ? (
                    clientDetail.tickets.map((ticket, idx) => (
                      <div key={idx} className="p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-medium">{ticket.subject}</p>
                          <Badge className={
                            ticket.status === 'closed' ? 'bg-gray-900/30 text-gray-400' :
                            ticket.status === 'open' ? 'bg-green-900/30 text-green-400' :
                            'bg-gold-900/30 text-gold-400'
                          }>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{ticket.message?.substring(0, 100)}...</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatDate(ticket.created_at)}</span>
                          {ticket.category && <Badge className="bg-zinc-700">{ticket.category}</Badge>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Sem tickets de suporte</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-gray-500 text-center py-12">Erro ao carregar dados</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMClients;
