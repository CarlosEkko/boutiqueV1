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
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Globe,
  RefreshCw,
  Save,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Building2,
  DollarSign,
  Shield,
  Eye,
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import ScheduleMeetingDialog from '../components/ScheduleMeetingDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

import { COUNTRIES } from '../../../utils/countries';

const REGIONS = ['Europe', 'Middle East', 'Brazil', 'North America', 'Asia', 'Other'];

const SOURCES = ['Website', 'Referência', 'LinkedIn', 'Evento', 'Cold Call', 'Parceiro', 'Outro'];

const CRYPTOCURRENCIES = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'SOL', 'Outro'];

const CRMLeads = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [filter, setFilter] = useState({ search: '', status: '', is_qualified: '' });
  const [detailLead, setDetailLead] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [meetingLead, setMeetingLead] = useState(null);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    country: '',
    region: '',
    source: '',
    status: 'new',
    interest: '',
    interested_cryptos: [],
    estimated_volume: '',
    preferred_currency: 'EUR',
    is_qualified: false,
    qualification_score: 0,
    assigned_to: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    fetchLeads();
    fetchStatuses();
  }, [filter]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.status) params.append('status', filter.status);
      if (filter.is_qualified !== '') params.append('is_qualified', filter.is_qualified);
      
      const response = await axios.get(`${API_URL}/api/crm/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/crm/enums/lead-statuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatuses(response.data);
    } catch (err) {
      console.error('Error fetching statuses:', err);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      country: '',
      region: '',
      source: '',
      status: 'new',
      interest: '',
      interested_cryptos: [],
      estimated_volume: '',
      preferred_currency: 'EUR',
      is_qualified: false,
      qualification_score: 0,
      assigned_to: '',
      notes: '',
      tags: []
    });
    setEditingLead(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (lead) => {
    setForm({
      ...lead,
      estimated_volume: lead.estimated_volume || '',
      qualification_score: lead.qualification_score || 0,
      interested_cryptos: lead.interested_cryptos || [],
      tags: lead.tags || []
    });
    setEditingLead(lead.id);
    setShowModal(true);
  };

  const saveLead = async () => {
    try {
      const data = {
        ...form,
        estimated_volume: form.estimated_volume ? parseFloat(form.estimated_volume) : null,
        qualification_score: parseInt(form.qualification_score) || 0
      };

      if (editingLead) {
        await axios.put(`${API_URL}/api/crm/leads/${editingLead}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Lead atualizado!');
      } else {
        await axios.post(`${API_URL}/api/crm/leads`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Lead criado!');
      }
      
      setShowModal(false);
      resetForm();
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar lead');
    }
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Tem certeza que deseja eliminar este lead?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/crm/leads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead eliminado!');
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao eliminar lead');
    }
  };

  const sendRegistrationEmail = async (id) => {
    if (!window.confirm('Enviar email de registo para este lead?')) return;
    
    try {
      const res = await axios.post(`${API_URL}/api/crm/leads/${id}/send-registration`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Email de registo enviado com sucesso!');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar email de registo');
    }
  };

  const convertToOTC = async (id) => {
    if (!window.confirm('Converter este lead em Lead OTC?')) return;
    
    try {
      await axios.post(`${API_URL}/api/crm/leads/${id}/convert-to-otc`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead convertido para OTC com sucesso!');
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao converter para OTC');
    }
  };

  const riskScan = async (id) => {
    try {
      toast.info('A analisar Risk Intelligence...');
      const res = await axios.post(`${API_URL}/api/crm/leads/${id}/risk-scan`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Risk Intelligence completo');
      fetchLeads();
      if (detailLead?.id === id) {
        setDetailLead(prev => ({ ...prev, risk_intelligence_data: res.data.risk_intelligence_data }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro no Risk Intelligence');
    }
  };

  const openDetail = (lead) => {
    setDetailLead(lead);
    setShowDetailModal(true);
  };

  const toggleCrypto = (crypto) => {
    setForm(prev => ({
      ...prev,
      interested_cryptos: prev.interested_cryptos.includes(crypto)
        ? prev.interested_cryptos.filter(c => c !== crypto)
        : [...prev.interested_cryptos, crypto]
    }));
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

  const getStatusLabel = (status) => {
    const labels = {
      new: 'Novo',
      contacted: 'Contactado',
      qualified: 'Qualificado',
      proposal: 'Proposta',
      negotiation: 'Negociação',
      won: 'Ganho',
      lost: 'Perdido'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400">Gerir potenciais clientes e oportunidades</p>
        </div>
        <Button onClick={openNewModal} className="bg-gold-500 hover:bg-gold-400 text-black">
          <Plus size={16} className="mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Pesquisar leads..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="pl-9 bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Todos Status</option>
          {statuses.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filter.is_qualified}
          onChange={(e) => setFilter({ ...filter, is_qualified: e.target.value })}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
        >
          <option value="">Qualificação</option>
          <option value="true">Qualificados</option>
          <option value="false">Não Qualificados</option>
        </select>
        <Button variant="outline" onClick={fetchLeads} className="border-zinc-700">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <UserPlus size={48} className="mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400">Nenhum lead encontrado</p>
            <Button onClick={openNewModal} className="mt-4 bg-gold-500 hover:bg-gold-400 text-black">
              <Plus size={16} className="mr-2" /> Adicionar Primeiro Lead
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => (
            <Card key={lead.id} className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      lead.is_qualified ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                    }`}>
                      {lead.is_qualified ? (
                        <CheckCircle size={24} className="text-emerald-400" />
                      ) : (
                        <UserPlus size={24} className="text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{lead.name}</span>
                        {lead.company_name && (
                          <span className="text-gray-400 text-sm flex items-center gap-1">
                            <Building2 size={12} /> {lead.company_name}
                          </span>
                        )}
                        {lead.risk_intelligence_data?.combined_score != null && (() => {
                          const s = lead.risk_intelligence_data.combined_score;
                          const cfg = s >= 700 ? { bg: 'bg-green-900/40', text: 'text-green-400', label: 'Confiável' }
                            : s >= 500 ? { bg: 'bg-emerald-900/40', text: 'text-emerald-400', label: 'Alto' }
                            : s >= 300 ? { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: 'Revisão' }
                            : s >= 150 ? { bg: 'bg-orange-900/40', text: 'text-orange-400', label: 'Baixo' }
                            : { bg: 'bg-red-900/40', text: 'text-red-400', label: 'Risco' };
                          return <Badge className={`${cfg.bg} ${cfg.text} text-[10px]`} data-testid={`risk-score-crm-${lead.id}`}>RI {s} — {cfg.label}</Badge>;
                        })()}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {lead.email}
                          </span>
                        )}
                        {lead.country && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {lead.country}
                          </span>
                        )}
                        {lead.source && (
                          <span className="flex items-center gap-1">
                            <Globe size={12} /> {lead.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Estimated Volume */}
                    {lead.estimated_volume && (
                      <div className="text-right hidden md:block">
                        <div className="text-xs text-gray-400">Volume Estimado</div>
                        <div className="text-gold-400 font-medium flex items-center gap-1">
                          <DollarSign size={14} />
                          {new Intl.NumberFormat('pt-PT').format(lead.estimated_volume)}
                        </div>
                      </div>
                    )}

                    {/* Cryptos */}
                    {lead.interested_cryptos?.length > 0 && (
                      <div className="hidden md:flex items-center gap-1">
                        {lead.interested_cryptos.slice(0, 2).map(crypto => (
                          <Badge key={crypto} className="bg-zinc-800 text-gray-300 border-0 text-xs">
                            {crypto}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Status */}
                    <Badge className={`border-0 ${getStatusColor(lead.status)}`}>
                      {getStatusLabel(lead.status)}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!lead.risk_intelligence_data && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => riskScan(lead.id)}
                          className="border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                          title="Risk Intelligence Scan"
                          data-testid={`risk-scan-crm-${lead.id}`}
                        >
                          <Shield size={14} />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(lead)}
                        className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-900/30"
                        title="Ver Detalhes"
                        data-testid={`detail-crm-${lead.id}`}
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setMeetingLead(lead); setShowMeetingDialog(true); }}
                        className="border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                        title="Agendar Reunião"
                        data-testid={`schedule-meeting-crm-${lead.id}`}
                      >
                        <Video size={14} />
                      </Button>
                      {lead.status !== 'won' && lead.status !== 'lost' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => convertToOTC(lead.id)}
                            className="border-gold-600/50 text-gold-400 hover:bg-gold-900/30"
                            title="Converter em Lead OTC"
                            data-testid={`convert-to-otc-${lead.id}`}
                          >
                            <TrendingUp size={14} className="mr-1" />
                            <span className="hidden lg:inline text-xs">OTC</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendRegistrationEmail(lead.id)}
                            className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-900/30"
                            title="Enviar Email de Registo"
                            data-testid={`send-registration-${lead.id}`}
                          >
                            <Mail size={14} />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(lead)}
                        className="border-gold-600/50 text-gold-400"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLead(lead.id)}
                        className="border-red-600/50 text-red-400"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lead Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do lead"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Empresa</label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Nome da empresa"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email</label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+351 123 456 789"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">País</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Região</label>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Lead Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Fonte</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="">Selecionar...</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  {statuses.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Score (0-100)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.qualification_score}
                  onChange={(e) => setForm({ ...form, qualification_score: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>

            {/* Interest */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Interesse</label>
              <Input
                value={form.interest}
                onChange={(e) => setForm({ ...form, interest: e.target.value })}
                placeholder="No que está interessado? (ex: Compra de BTC, OTC trading)"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Cryptos */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Criptomoedas de Interesse</label>
              <div className="flex flex-wrap gap-2">
                {CRYPTOCURRENCIES.map(crypto => (
                  <Badge
                    key={crypto}
                    className={`cursor-pointer transition-colors ${
                      form.interested_cryptos.includes(crypto)
                        ? 'bg-gold-500 text-black'
                        : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                    }`}
                    onClick={() => toggleCrypto(crypto)}
                  >
                    {crypto}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Volume Estimado</label>
                <Input
                  type="number"
                  value={form.estimated_volume}
                  onChange={(e) => setForm({ ...form, estimated_volume: e.target.value })}
                  placeholder="100000"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Moeda Preferida</label>
                <select
                  value={form.preferred_currency}
                  onChange={(e) => setForm({ ...form, preferred_currency: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                  <option value="BRL">BRL</option>
                </select>
              </div>
            </div>

            {/* Qualification */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_qualified}
                  onChange={(e) => setForm({ ...form, is_qualified: e.target.checked })}
                  className="w-4 h-4"
                />
                <CheckCircle size={16} className="text-emerald-400" />
                Lead Qualificado
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Notas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Notas adicionais sobre o lead..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={saveLead} className="bg-emerald-500 hover:bg-emerald-600">
              <Save size={16} className="mr-2" />
              {editingLead ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Modal with Risk Intelligence */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-white flex items-center gap-2">
              <UserPlus className="text-gold-400" size={20} />
              {detailLead?.name || 'Lead'}
              {detailLead?.company_name && <span className="text-gray-400 text-sm">— {detailLead.company_name}</span>}
            </DialogTitle>
          </DialogHeader>

          {detailLead && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2 mb-3"><UserPlus size={16} /> Informação de Contacto</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Nome:</span><span className="text-white">{detailLead.name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="text-white">{detailLead.email || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Telefone:</span><span className="text-white">{detailLead.phone || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">País:</span><span className="text-white">{detailLead.country || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Origem:</span><Badge className="bg-zinc-700 text-gray-300 text-xs">{detailLead.source || '-'}</Badge></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2 mb-3"><TrendingUp size={16} /> Interesse</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">Interesse:</span><span className="text-white">{detailLead.interest || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Volume:</span><span className="text-gold-400 font-mono">{detailLead.estimated_volume ? `$${new Intl.NumberFormat('pt-PT').format(detailLead.estimated_volume)}` : '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Moeda:</span><span className="text-white">{detailLead.preferred_currency || 'EUR'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Status:</span><Badge className={`border-0 ${getStatusColor(detailLead.status)}`}>{getStatusLabel(detailLead.status)}</Badge></div>
                      {detailLead.interested_cryptos?.length > 0 && (
                        <div className="flex justify-between items-center"><span className="text-gray-500">Cryptos:</span><div className="flex gap-1">{detailLead.interested_cryptos.map(c => <Badge key={c} className="bg-zinc-700 text-gray-300 text-xs">{c}</Badge>)}</div></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Intelligence */}
              <Card className="bg-zinc-800/50 border-zinc-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white flex items-center gap-2"><Shield size={16} className="text-blue-400" />Risk Intelligence</h4>
                    <button onClick={() => riskScan(detailLead.id)}
                      className="text-xs text-gray-500 hover:text-blue-400 flex items-center gap-1" data-testid="rescan-risk-crm"><RefreshCw size={12} /> {detailLead.risk_intelligence_data ? 'Re-scan' : 'Scan'}</button>
                  </div>
                  {detailLead.risk_intelligence_data ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
                          <p className="text-gray-500 text-[10px] uppercase mb-1">Score Global</p>
                          <p className={`text-2xl font-mono font-bold ${(detailLead.risk_intelligence_data.combined_score||0) >= 700 ? 'text-green-400' : (detailLead.risk_intelligence_data.combined_score||0) >= 500 ? 'text-emerald-400' : (detailLead.risk_intelligence_data.combined_score||0) >= 300 ? 'text-yellow-400' : (detailLead.risk_intelligence_data.combined_score||0) >= 150 ? 'text-orange-400' : 'text-red-400'}`}>{detailLead.risk_intelligence_data.combined_score ?? '—'}</p>
                          <p className="text-gray-500 text-[10px] capitalize">{detailLead.risk_intelligence_data.risk_level || ''}</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
                          <p className="text-gray-500 text-[10px] uppercase mb-1">Email</p>
                          <p className="text-xl font-mono text-white">{detailLead.risk_intelligence_data.email_risk?.score ?? '—'}</p>
                          <p className="text-gray-500 text-[10px] capitalize">{detailLead.risk_intelligence_data.email_risk?.score_cluster || ''}</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-900/50 rounded-lg">
                          <p className="text-gray-500 text-[10px] uppercase mb-1">Telefone</p>
                          <p className="text-xl font-mono text-white">{detailLead.risk_intelligence_data.phone_risk?.score ?? '—'}</p>
                          <p className="text-gray-500 text-[10px] capitalize">{detailLead.risk_intelligence_data.phone_risk?.score_cluster || ''}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {detailLead.risk_intelligence_data.email_risk?.status && <div className="flex justify-between"><span className="text-gray-500">Email Status:</span><span className="text-white capitalize">{detailLead.risk_intelligence_data.email_risk.status}</span></div>}
                        {detailLead.risk_intelligence_data.email_risk?.is_disposable != null && <div className="flex justify-between"><span className="text-gray-500">Descartável:</span><span className={detailLead.risk_intelligence_data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{detailLead.risk_intelligence_data.email_risk.is_disposable ? 'Sim' : 'Não'}</span></div>}
                        {detailLead.risk_intelligence_data.email_risk?.has_linkedin != null && <div className="flex justify-between"><span className="text-gray-500">LinkedIn:</span><span className={detailLead.risk_intelligence_data.email_risk.has_linkedin ? 'text-green-400' : 'text-gray-500'}>{detailLead.risk_intelligence_data.email_risk.has_linkedin ? 'Sim' : 'Não'}</span></div>}
                        {detailLead.risk_intelligence_data.email_risk?.company_name && <div className="flex justify-between"><span className="text-gray-500">Empresa:</span><span className="text-white">{detailLead.risk_intelligence_data.email_risk.company_name}</span></div>}
                        {detailLead.risk_intelligence_data.email_risk?.data_breaches_count != null && <div className="flex justify-between"><span className="text-gray-500">Data Breaches:</span><span className={detailLead.risk_intelligence_data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{detailLead.risk_intelligence_data.email_risk.data_breaches_count}</span></div>}
                        {detailLead.risk_intelligence_data.phone_risk?.has_whatsapp != null && <div className="flex justify-between"><span className="text-gray-500">WhatsApp:</span><span className={detailLead.risk_intelligence_data.phone_risk.has_whatsapp ? 'text-green-400' : 'text-gray-500'}>{detailLead.risk_intelligence_data.phone_risk.has_whatsapp ? 'Sim' : 'Não'}</span></div>}
                        {detailLead.risk_intelligence_data.phone_risk?.number_type && <div className="flex justify-between"><span className="text-gray-500">Tipo Telefone:</span><span className={detailLead.risk_intelligence_data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{detailLead.risk_intelligence_data.phone_risk.number_type}</span></div>}
                        {detailLead.risk_intelligence_data.phone_risk?.current_network && <div className="flex justify-between"><span className="text-gray-500">Operadora:</span><span className="text-white">{detailLead.risk_intelligence_data.phone_risk.current_network}</span></div>}
                      </div>
                      {detailLead.risk_intelligence_data.red_flags?.length > 0 && (
                        <div className="mt-3 p-2 bg-red-950/30 border border-red-900/30 rounded-lg">
                          <p className="text-red-400 text-xs font-medium mb-1">Red Flags:</p>
                          <div className="flex flex-wrap gap-1">{detailLead.risk_intelligence_data.red_flags.map((f, i) => <Badge key={i} className="bg-red-900/40 text-red-400 text-[10px]">{f}</Badge>)}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Shield size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sem análise de risco disponível</p>
                      <Button size="sm" variant="outline" onClick={() => riskScan(detailLead.id)} className="mt-2 border-blue-600/50 text-blue-400">
                        <Shield size={14} className="mr-1" /> Executar Scan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {detailLead.notes && (
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium text-purple-400 mb-2">Notas</h4>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{detailLead.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <ScheduleMeetingDialog
        open={showMeetingDialog}
        onClose={() => setShowMeetingDialog(false)}
        lead={meetingLead}
        leadType="crm"
      />
    </div>
  );
};

export default CRMLeads;
