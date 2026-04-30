import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Target,
  DollarSign,
  Calendar,
  RefreshCw,
  Save,
  TrendingUp,
  User,
  Handshake,
  Building2,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';
import { useLanguage } from '../../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRYPTOCURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 'Outro'];

const CRMDeals = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [filter, setFilter] = useState({ search: '', stage: '' });
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    lead_id: '',
    supplier_id: '',
    client_id: '',
    contact_id: '',
    stage: 'qualification',
    amount: '',
    currency: 'EUR',
    cryptocurrency: '',
    crypto_amount: '',
    probability: 50,
    expected_close_date: '',
    assigned_to: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    fetchDeals();
    fetchStages();
    fetchSuppliers();
    fetchLeads();
  }, [filter]);

  const fetchDeals = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.stage) params.append('stage', filter.stage);
      
      const response = await axios.get(`${API_URL}/api/crm/deals?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(response.data);
    } catch (err) {
      console.error('Error fetching deals:', err);
      toast.error('Erro ao carregar negociações');
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/enums/deal-stages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStages(response.data);
    } catch (err) {
      console.error('Error fetching stages:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/suppliers?is_active=true&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(response.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/leads?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      lead_id: '',
      supplier_id: '',
      client_id: '',
      contact_id: '',
      stage: 'qualification',
      amount: '',
      currency: 'EUR',
      cryptocurrency: '',
      crypto_amount: '',
      probability: 50,
      expected_close_date: '',
      assigned_to: '',
      notes: '',
      tags: []
    });
    setEditingDeal(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (deal) => {
    setForm({
      ...deal,
      amount: deal.amount || '',
      crypto_amount: deal.crypto_amount || '',
      probability: deal.probability || 50,
      expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
      tags: deal.tags || []
    });
    setEditingDeal(deal.id);
    setShowModal(true);
  };

  const saveDeal = async () => {
    try {
      const data = {
        ...form,
        amount: form.amount ? parseFloat(form.amount) : 0,
        crypto_amount: form.crypto_amount ? parseFloat(form.crypto_amount) : null,
        probability: parseInt(form.probability) || 0,
        expected_close_date: form.expected_close_date || null,
        lead_id: form.lead_id || null,
        supplier_id: form.supplier_id || null
      };

      if (editingDeal) {
        await axios.put(`${API_URL}/api/crm/deals/${editingDeal}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Negociação atualizada!');
      } else {
        await axios.post(`${API_URL}/api/crm/deals`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Negociação criada!');
      }
      
      setShowModal(false);
      resetForm();
      fetchDeals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar negociação');
    }
  };

  const deleteDeal = async (id) => {
    if (!window.confirm('Tem certeza que deseja eliminar esta negociação?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/crm/deals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Negociação eliminada!');
      fetchDeals();
    } catch (err) {
      toast.error('Erro ao eliminar negociação');
    }
  };

  const getStageColor = (stage) => {
    const colors = {
      qualification: 'bg-blue-500/20 text-blue-400',
      proposal: 'bg-purple-500/20 text-purple-400',
      negotiation: 'bg-orange-500/20 text-orange-400',
      closed_won: 'bg-green-500/20 text-green-400',
      closed_lost: 'bg-red-500/20 text-red-400'
    };
    return colors[stage] || 'bg-gray-500/20 text-gray-400';
  };

  const getStageLabel = (stage) => {
    const labels = {
      qualification: 'Qualificação',
      proposal: 'Proposta',
      negotiation: 'Negociação',
      closed_won: 'Ganho',
      closed_lost: 'Perdido'
    };
    return labels[stage] || stage;
  };

  const formatCurrency = (value, currency = 'EUR') => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(value || 0);
  };

  // Group deals by stage for pipeline view
  const pipelineStages = ['qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Negociações</h1>
          <p className="text-gray-400">Pipeline de vendas e negociações</p>
        </div>
        <Button onClick={openNewModal} className="bg-gold-500 hover:bg-gold-400 text-black">
          <Plus size={16} className="mr-2" />
          Nova Negociação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar negociações..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <select
          value={filter.stage}
          onChange={(e) => setFilter({ ...filter, stage: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Todos Estágios</option>
          {stages.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Button variant="outline" onClick={fetchDeals} className="border-zinc-700">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Pipeline View */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : deals.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Target size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400">Nenhuma negociação encontrada</p>
            <Button onClick={openNewModal} className="mt-4 bg-gold-500 hover:bg-gold-400 text-black">
              <Plus size={16} className="mr-2" /> Criar Primeira Negociação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {pipelineStages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const stageTotal = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
            
            return (
              <div key={stage} className="space-y-3">
                {/* Stage Header */}
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={`border-0 ${getStageColor(stage)}`}>
                        {getStageLabel(stage)}
                      </Badge>
                      <span className="text-gray-400 text-sm">({stageDeals.length})</span>
                    </div>
                    <div className="text-gold-400 text-sm font-medium mt-1">
                      {formatCurrency(stageTotal)}
                    </div>
                  </div>
                </div>

                {/* Stage Deals */}
                <div className="space-y-2">
                  {stageDeals.map(deal => (
                    <Card 
                      key={deal.id} 
                      className="bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-gold-500/30 transition-colors"
                      onClick={() => openEditModal(deal)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium text-sm truncate flex-1">
                            {deal.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); deleteDeal(deal.id); }}
                            className="text-red-400 h-6 w-6 p-0"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                        
                        <div className="text-gold-400 font-bold text-lg mb-2">
                          {formatCurrency(deal.amount, deal.currency)}
                        </div>

                        {deal.cryptocurrency && (
                          <div className="text-xs text-gray-400 mb-2">
                            {deal.crypto_amount} {deal.cryptocurrency}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Percent size={10} />
                            {deal.probability}%
                          </div>
                          {deal.expected_close_date && (
                            <div className="flex items-center gap-1">
                              <Calendar size={10} />
                              {formatDate(deal.expected_close_date)}
                            </div>
                          )}
                        </div>

                        {(deal.supplier_name || deal.lead_name) && (
                          <div className="mt-2 pt-2 border-t border-zinc-800">
                            {deal.supplier_name && (
                              <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Handshake size={10} /> {deal.supplier_name}
                              </div>
                            )}
                            {deal.lead_name && (
                              <div className="text-xs text-gray-400 flex items-center gap-1">
                                <User size={10} /> {deal.lead_name}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? t('tier23Modals.crmDeal.edit') : t('tier23Modals.crmDeal.new')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title & Stage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Título *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Nome da negociação"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Estágio</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {stages.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes da negociação..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={2}
              />
            </div>

            {/* Related Entities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fornecedor</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Lead</label>
                <select
                  value={form.lead_id}
                  onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Valor</label>
                <Input
                  type="number" step="any"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="100000"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Moeda</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Probabilidade (%)</label>
                <Input
                  type="number" step="any"
                  min="0"
                  max="100"
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Crypto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Criptomoeda</label>
                <select
                  value={form.cryptocurrency}
                  onChange={(e) => setForm({ ...form, cryptocurrency: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {CRYPTOCURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Quantidade Crypto</label>
                <Input
                  type="number" step="any"
                  step="0.00000001"
                  value={form.crypto_amount}
                  onChange={(e) => setForm({ ...form, crypto_amount: e.target.value })}
                  placeholder="0.5"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Close Date */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Data Prevista de Fecho</label>
              <Input
                type="date"
                value={form.expected_close_date}
                onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionais..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={saveDeal} className="bg-emerald-500 hover:bg-emerald-600">
              <Save size={16} className="mr-2" />
              {editingDeal ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMDeals;
