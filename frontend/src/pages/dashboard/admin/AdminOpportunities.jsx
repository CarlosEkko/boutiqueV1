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
  TrendingUp, 
  Plus,
  Edit,
  Percent,
  Clock,
  DollarSign,
  Globe,
  Users,
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REGIONS = [
  { value: 'europe', label: 'Europa' },
  { value: 'middle_east', label: 'Médio Oriente' },
  { value: 'brazil', label: 'Brasil' },
];

const TIERS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

const AdminOpportunities = () => {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'lending',
    fixed_rate: '',
    variable_rate: '',
    duration_days: '',
    min_investment: '',
    max_investment: '',
    total_pool: '',
    risk_level: 'medium',
    currency: 'USDT',
    allowed_regions: ['europe', 'middle_east', 'brazil'],
    allowed_tiers: ['standard', 'premium', 'vip']
  });

  useEffect(() => {
    fetchOpportunities();
  }, [token]);

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
      duration_days: '',
      min_investment: '',
      max_investment: '',
      total_pool: '',
      risk_level: 'medium',
      currency: 'USDT',
      allowed_regions: ['europe', 'middle_east', 'brazil'],
      allowed_tiers: ['standard', 'premium', 'vip']
    });
    setEditingOpp(null);
    setShowCreateForm(false);
  };

  const createOpportunity = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        fixed_rate: parseFloat(formData.fixed_rate) || 0,
        variable_rate: parseFloat(formData.variable_rate) || 0,
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
          <p className="text-gray-400 text-sm mt-1">Criar e gerir pools de investimento</p>
        </div>
        <div className="flex gap-2">
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

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white font-light">
              {editingOpp ? 'Editar Oportunidade' : 'Nova Oportunidade de Investimento'}
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
                      type="number"
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
                      type="number"
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

              {/* Investment Limits */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300">Duração (dias)</Label>
                  <Input
                    name="duration_days"
                    type="number"
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
                    type="number"
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
                    type="number"
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
                    type="number"
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
                  {editingOpp ? 'Guardar Alterações' : 'Criar Oportunidade'}
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
        ) : opportunities.length > 0 ? (
          opportunities.map((opp) => {
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
                      {(opp.allowed_regions || []).map(r => r.charAt(0).toUpperCase()).join(', ')}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users size={12} />
                      {(opp.allowed_tiers || []).map(t => t.charAt(0).toUpperCase()).join(', ')}
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
                          className="border-red-600 text-red-400 hover:bg-red-600/20"
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
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <TrendingUp className="mx-auto text-gray-600 mb-4" size={48} />
              <h3 className="text-xl text-white mb-2">Nenhuma Oportunidade</h3>
              <p className="text-gray-400">
                Clique em "Nova Oportunidade" para criar um pool de investimento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminOpportunities;
