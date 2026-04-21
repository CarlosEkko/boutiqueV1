import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { 
  TrendingUp, 
  Plus,
  Percent,
  Clock,
  DollarSign,
  Globe,
  Users,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Filter,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REGIONS = [
  { value: 'europe', label: 'Europa' },
  { value: 'middle_east', label: 'Médio Oriente' },
  { value: 'latam', label: 'LATAM' },
];

const TIERS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

const STATUSES = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Aberto' },
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

const AdminOpportunities = () => {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingOpp, setDeletingOpp] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    region: 'all',
    tier: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'lending',
    fixed_rate: '',
    variable_rate: '',
    indexante_base: '',
    inflation_adjustment: false,
    current_inflation: '',
    duration_days: '',
    min_investment: '',
    max_investment: '',
    total_pool: '',
    risk_level: 'medium',
    currency: 'USDT',
    allowed_regions: ['europe', 'middle_east', 'latam'],
    allowed_tiers: ['broker', 'standard', 'premium', 'vip', 'institucional']
  });

  useEffect(() => {
    fetchOpportunities();
  }, [token]);

  useEffect(() => {
    applyFilters();
  }, [opportunities, filters]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/admin/opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpportunities(response.data);
    } catch (err) {
      toast.error('Erro ao carregar oportunidades');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...opportunities];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(opp => opp.status === filters.status);
    }

    // Filter by region
    if (filters.region !== 'all') {
      filtered = filtered.filter(opp => 
        (opp.allowed_regions || []).includes(filters.region)
      );
    }

    // Filter by tier
    if (filters.tier !== 'all') {
      filtered = filtered.filter(opp => 
        (opp.allowed_tiers || []).includes(filters.tier)
      );
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(opp => 
        opp.name?.toLowerCase().includes(search) ||
        opp.description?.toLowerCase().includes(search)
      );
    }

    setFilteredOpportunities(filtered);
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      region: 'all',
      tier: 'all',
      search: ''
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.region !== 'all' || filters.tier !== 'all' || filters.search;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleRegion = (region) => {
    setFormData(prev => {
      const current = prev.allowed_regions || [];
      if (current.includes(region)) {
        return { ...prev, allowed_regions: current.filter(r => r !== region) };
      } else {
        return { ...prev, allowed_regions: [...current, region] };
      }
    });
  };

  const toggleTier = (tier) => {
    setFormData(prev => {
      const current = prev.allowed_tiers || [];
      if (current.includes(tier)) {
        return { ...prev, allowed_tiers: current.filter(t => t !== tier) };
      } else {
        return { ...prev, allowed_tiers: [...current, tier] };
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'lending',
      fixed_rate: '',
      variable_rate: '',
      indexante_base: '',
      inflation_adjustment: false,
      current_inflation: '',
      duration_days: '',
      min_investment: '',
      max_investment: '',
      total_pool: '',
      risk_level: 'medium',
      currency: 'USDT',
      allowed_regions: ['europe', 'middle_east', 'latam'],
      allowed_tiers: ['broker', 'standard', 'premium', 'vip', 'institucional']
    });
    setShowCreateForm(false);
  };

  const createOpportunity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        fixed_rate: parseFloat(formData.fixed_rate) || 0,
        variable_rate: parseFloat(formData.variable_rate) || 0,
        indexante_base: parseFloat(formData.indexante_base) || 0,
        inflation_adjustment: formData.inflation_adjustment,
        current_inflation: parseFloat(formData.current_inflation) || 0,
        expected_roi: (parseFloat(formData.fixed_rate) || 0) + (parseFloat(formData.variable_rate) || 0),
        duration_days: parseInt(formData.duration_days) || 30,
        min_investment: parseFloat(formData.min_investment) || 100,
        max_investment: parseFloat(formData.max_investment) || 100000,
        total_pool: parseFloat(formData.total_pool) || 1000000,
      };

      await axios.post(`${API_URL}/api/admin/opportunities`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Oportunidade criada com sucesso');
      resetForm();
      fetchOpportunities();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar oportunidade');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/admin/opportunities/${id}/status/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Status atualizado para ${status}`);
      fetchOpportunities();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const confirmDelete = (opp) => {
    setDeletingOpp(opp);
    setShowDeleteDialog(true);
  };

  const deleteOpportunity = async () => {
    if (!deletingOpp) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/admin/opportunities/${deletingOpp.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Oportunidade eliminada com sucesso');
      setShowDeleteDialog(false);
      setDeletingOpp(null);
      fetchOpportunities();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar oportunidade');
    } finally {
      setDeleting(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'bg-green-500/20 text-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400';
      case 'active': return 'bg-blue-500/20 text-blue-400';
      case 'completed': return 'bg-gray-500/20 text-gray-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const totalExpectedROI = (parseFloat(formData.fixed_rate) || 0) + (parseFloat(formData.variable_rate) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white">Oportunidades de Investimento</h1>
          <p className="text-gray-400 text-sm mt-1">
            {filteredOpportunities.length} de {opportunities.length} oportunidades
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className={`border-zinc-700 ${hasActiveFilters ? 'text-gold-400 border-gold-500' : 'text-gray-300'}`}
          >
            <Filter size={16} className="mr-2" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 bg-gold-500 text-black text-xs rounded">
                {[filters.status !== 'all', filters.region !== 'all', filters.tier !== 'all', filters.search].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            onClick={fetchOpportunities}
            variant="outline"
            className="border-zinc-700 text-gray-300"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gold-500 hover:bg-gold-400 text-black"
          >
            <Plus size={18} className="mr-2" />
            {showCreateForm ? 'Cancelar' : 'Nova Oportunidade'}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <Label className="text-gray-400 text-xs">Pesquisar</Label>
                <Input
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Nome ou descrição..."
                  className="bg-zinc-800 border-zinc-700 text-white mt-1"
                />
              </div>

              {/* Status Filter */}
              <div className="w-40">
                <Label className="text-gray-400 text-xs">Estado</Label>
                <Select 
                  value={filters.status} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Filter */}
              <div className="w-40">
                <Label className="text-gray-400 text-xs">Região</Label>
                <Select 
                  value={filters.region} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, region: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">Todas</SelectItem>
                    {REGIONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tier Filter */}
              <div className="w-40">
                <Label className="text-gray-400 text-xs">Tier</Label>
                <Select 
                  value={filters.tier} 
                  onValueChange={(v) => setFilters(prev => ({ ...prev, tier: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all">Todos</SelectItem>
                    {TIERS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-gray-400 hover:text-white"
                >
                  <X size={14} className="mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white font-light">
              Nova Oportunidade de Investimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOpportunity} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-gray-300">Nome</Label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ex: Pool de Empréstimo USDT"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-300">Descrição</Label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descreva a oportunidade de investimento..."
                    rows={3}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Tipo</Label>
                  <Select value={formData.type} onValueChange={(v) => handleSelectChange('type', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="lending">Empréstimo (Lending)</SelectItem>
                      <SelectItem value="staking">Staking</SelectItem>
                      <SelectItem value="liquidity">Liquidez</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Moeda</Label>
                  <Select value={formData.currency} onValueChange={(v) => handleSelectChange('currency', v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="KBEX">KBEX</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ROI Configuration */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Percent size={18} className="text-gold-400" />
                  Configuração de Retorno (ROI)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Taxa Fixa (%)</Label>
                    <Input
                      name="fixed_rate"
                      type="number" step="any"
                      step="0.01"
                      value={formData.fixed_rate}
                      onChange={handleChange}
                      placeholder="ex: 5"
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Retorno garantido</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">Taxa Variável (%)</Label>
                    <Input
                      name="variable_rate"
                      type="number" step="any"
                      step="0.01"
                      value={formData.variable_rate}
                      onChange={handleChange}
                      placeholder="ex: 3"
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Depende da performance</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">ROI Total Esperado (%)</Label>
                    <div className="bg-zinc-700/50 border border-zinc-600 rounded-lg px-3 py-2 mt-1">
                      <span className="text-2xl font-light text-green-400">{totalExpectedROI.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indexante — Inflation-Adjusted Rate */}
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <TrendingUp size={18} className="text-amber-400" />
                    Indexante (Ajuste por Inflação)
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-zinc-400">Ativar</span>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, inflation_adjustment: !f.inflation_adjustment }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${formData.inflation_adjustment ? 'bg-amber-500' : 'bg-zinc-700'}`}
                      data-testid="inflation-toggle"
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.inflation_adjustment ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                </div>

                {formData.inflation_adjustment && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300">Indexante Médio Base (% ao mês)</Label>
                        <Input
                          name="indexante_base"
                          type="number"
                          step="0.01"
                          value={formData.indexante_base}
                          onChange={handleChange}
                          placeholder="ex: 12.64"
                          className="bg-zinc-800 border-zinc-700 text-white mt-1"
                          data-testid="indexante-base"
                        />
                        <p className="text-xs text-gray-500 mt-1">Taxa base mensal antes do ajuste</p>
                      </div>
                      <div>
                        <Label className="text-gray-300">Inflação Mensal Real PT (%)</Label>
                        <Input
                          name="current_inflation"
                          type="number"
                          step="0.01"
                          value={formData.current_inflation}
                          onChange={handleChange}
                          placeholder="ex: 0.3"
                          className="bg-zinc-800 border-zinc-700 text-white mt-1"
                          data-testid="inflation-rate"
                        />
                        <p className="text-xs text-gray-500 mt-1">Inflação mensal real em Portugal (INE)</p>
                      </div>
                    </div>

                    {/* Calculation Preview */}
                    {(parseFloat(formData.indexante_base) > 0) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-3">
                        <p className="text-amber-400 text-xs uppercase tracking-wider font-semibold">Cálculo do Ajuste</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Indexante Base</span>
                            <span className="text-white font-mono">{parseFloat(formData.indexante_base || 0).toFixed(2)}% /mês</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Inflação Mensal</span>
                            <span className="text-white font-mono">{parseFloat(formData.current_inflation || 0).toFixed(2)}%</span>
                          </div>
                          <div className="border-t border-amber-500/20 pt-2">
                            <p className="text-zinc-500 text-xs mb-2">
                              Fórmula: Taxa ajustada = Indexante Base × (1 + Inflação Mensal / 100)
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-amber-400 font-medium">Taxa Mensal Ajustada</span>
                              <span className="text-amber-400 font-bold text-xl font-mono">
                                {(parseFloat(formData.indexante_base || 0) * (1 + parseFloat(formData.current_inflation || 0) / 100)).toFixed(4)}%
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-amber-500/20 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400">Taxa Anual Equivalente</span>
                              <span className="text-emerald-400 font-bold font-mono">
                                {((parseFloat(formData.indexante_base || 0) * (1 + parseFloat(formData.current_inflation || 0) / 100)) * 12).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-zinc-500 text-xs mt-2 italic">
                          Este indexante ajusta-se todos os meses conforme a inflação mensal real em Portugal.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Investment Limits */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300">Duração (dias)</Label>
                  <Input
                    name="duration_days"
                    type="number" step="any"
                    value={formData.duration_days}
                    onChange={handleChange}
                    placeholder="ex: 90"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Investimento Mín.</Label>
                  <Input
                    name="min_investment"
                    type="number" step="any"
                    value={formData.min_investment}
                    onChange={handleChange}
                    placeholder="ex: 1000"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Investimento Máx.</Label>
                  <Input
                    name="max_investment"
                    type="number" step="any"
                    value={formData.max_investment}
                    onChange={handleChange}
                    placeholder="ex: 100000"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Pool Total</Label>
                  <Input
                    name="total_pool"
                    type="number" step="any"
                    value={formData.total_pool}
                    onChange={handleChange}
                    placeholder="ex: 1000000"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </div>

              {/* Risk Level */}
              <div>
                <Label className="text-gray-300">Nível de Risco</Label>
                <Select value={formData.risk_level} onValueChange={(v) => handleSelectChange('risk_level', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Restrictions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Regions */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Globe size={18} className="text-blue-400" />
                    Regiões Permitidas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {REGIONS.map((region) => (
                      <button
                        key={region.value}
                        type="button"
                        onClick={() => toggleRegion(region.value)}
                        className={`px-3 py-2 rounded-lg border transition-all ${
                          formData.allowed_regions?.includes(region.value)
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }`}
                      >
                        {formData.allowed_regions?.includes(region.value) && (
                          <CheckCircle size={14} className="inline mr-1" />
                        )}
                        {region.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Tiers */}
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Users size={18} className="text-purple-400" />
                    Tiers de Cliente Permitidos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {TIERS.map((tier) => (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => toggleTier(tier.value)}
                        className={`px-3 py-2 rounded-lg border transition-all ${
                          formData.allowed_tiers?.includes(tier.value)
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                            : 'bg-zinc-800 border-zinc-700 text-gray-400 hover:border-zinc-600'
                        }`}
                      >
                        {formData.allowed_tiers?.includes(tier.value) && (
                          <CheckCircle size={14} className="inline mr-1" />
                        )}
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm} className="border-zinc-700 text-gray-300">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-400 text-black">
                  Criar Oportunidade
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Opportunities List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-gold-400" size={32} />
          </div>
        ) : filteredOpportunities.length > 0 ? (
          filteredOpportunities.map((opp) => {
            const progress = ((opp.current_pool || 0) / opp.total_pool) * 100;
            const fixedRate = opp.fixed_rate || 0;
            const variableRate = opp.variable_rate || 0;
            
            return (
              <Card key={opp.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg text-white font-medium">{opp.name}</h3>
                      <p className="text-sm text-gray-400">{opp.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskColor(opp.risk_level)}>
                        {opp.risk_level}
                      </Badge>
                      <Badge className={getStatusColor(opp.status)}>
                        {opp.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {opp.description}
                  </p>

                  {/* ROI Breakdown */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-gray-400">Taxa Fixa</p>
                      <p className="text-lg text-green-400 font-medium">{fixedRate}%</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-xs text-gray-400">Taxa Variável</p>
                      <p className="text-lg text-yellow-400 font-medium">{variableRate}%</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <DollarSign className="mx-auto text-blue-400 mb-1" size={16} />
                      <p className="text-lg text-white">{formatNumber(opp.total_pool, 0)}</p>
                      <p className="text-xs text-gray-400">{opp.currency}</p>
                    </div>
                  </div>

                  {/* Restrictions */}
                  <div className="flex gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Globe size={12} />
                      {(opp.allowed_regions || []).map(r => {
                        const region = REGIONS.find(reg => reg.value === r);
                        return region?.label?.charAt(0) || r.charAt(0).toUpperCase();
                      }).join(', ') || 'Todas'}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users size={12} />
                      {(opp.allowed_tiers || []).map(t => t.charAt(0).toUpperCase()).join(', ') || 'Todos'}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock size={12} />
                      {opp.duration_days} dias
                    </div>
                  </div>

                  {/* Pool Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Progresso do Pool</span>
                      <span className="text-white">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatNumber(opp.current_pool || 0, 0)} / {formatNumber(opp.total_pool, 0)} {opp.currency}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {opp.status === 'open' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateStatus(opp.id, 'active')}
                          className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          Iniciar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(opp.id, 'cancelled')}
                          className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {opp.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(opp.id, 'completed')}
                        className="bg-green-600 hover:bg-green-500 text-white"
                      >
                        Concluir
                      </Button>
                    )}
                    {/* Delete Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => confirmDelete(opp)}
                      className="border-red-600 text-red-400 hover:bg-red-600/20 ml-auto"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <TrendingUp className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-xl text-white mb-2">
                {hasActiveFilters ? 'Nenhum Resultado' : 'Nenhuma Oportunidade'}
              </h3>
              <p className="text-gray-400">
                {hasActiveFilters 
                  ? 'Nenhuma oportunidade corresponde aos filtros selecionados.'
                  : 'Clique em "Nova Oportunidade" para criar um pool de investimento.'}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" className="mt-4 border-zinc-700 text-gray-300">
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-400" size={20} />
              Eliminar Oportunidade
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem a certeza que deseja eliminar esta oportunidade?
              Esta ação não pode ser revertida.
            </DialogDescription>
          </DialogHeader>
          
          {deletingOpp && (
            <div className="space-y-3 py-4">
              <div className="p-4 bg-zinc-800 rounded-lg">
                <p className="text-white font-medium">{deletingOpp.name}</p>
                <p className="text-gray-400 text-sm">{deletingOpp.type} • {formatNumber(deletingOpp.total_pool, 0)} {deletingOpp.currency}</p>
              </div>
              
              {(deletingOpp.current_pool || 0) > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={16} />
                  <p className="text-yellow-400 text-sm">
                    Este pool tem {formatNumber(deletingOpp.current_pool || 0, 0)} {deletingOpp.currency} investidos.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-zinc-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={deleteOpportunity}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {deleting ? (
                <RefreshCw className="animate-spin mr-2" size={16} />
              ) : (
                <Trash2 size={16} className="mr-2" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOpportunities;
