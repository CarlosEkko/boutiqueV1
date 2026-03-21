import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatNumber } from '../../../utils/formatters';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { 
  UserPlus,
  Search,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Globe,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  Building,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OTCLeads = () => {
  const { token } = useAuth();
  const [leads, setLeads] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  
  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    entity_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    country: '',
    source: 'website',
    estimated_volume_usd: '',
    target_asset: 'BTC',
    transaction_type: 'buy',
    notes: ''
  });

  useEffect(() => {
    fetchEnums();
    fetchLeads();
  }, [token, statusFilter, sourceFilter]);

  const fetchEnums = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/otc/stats/enums`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnums(response.data);
    } catch (err) {
      console.error('Failed to fetch enums:', err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/otc/leads?limit=50`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (sourceFilter !== 'all') url += `&source=${sourceFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeads(response.data.leads || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async () => {
    try {
      await axios.post(`${API_URL}/api/otc/leads`, {
        ...formData,
        estimated_volume_usd: parseFloat(formData.estimated_volume_usd) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Lead criado com sucesso');
      setShowCreateDialog(false);
      setFormData({
        entity_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        country: '',
        source: 'website',
        estimated_volume_usd: '',
        target_asset: 'BTC',
        transaction_type: 'buy',
        notes: ''
      });
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao criar lead');
    }
  };

  const handlePreQualify = async (leadId, qualified) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/pre-qualify?qualified=${qualified}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(qualified ? 'Lead qualificado' : 'Lead marcado como não qualificado');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error('Erro ao atualizar lead');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      new: 'bg-blue-900/30 text-blue-400',
      contacted: 'bg-purple-900/30 text-purple-400',
      pre_qualified: 'bg-gold-900/30 text-gold-400',
      not_qualified: 'bg-gray-900/30 text-gray-400',
      kyc_pending: 'bg-yellow-900/30 text-yellow-400',
      kyc_approved: 'bg-green-900/30 text-green-400',
      active_client: 'bg-green-900/30 text-green-400',
      lost: 'bg-red-900/30 text-red-400'
    };
    const labels = {
      new: 'Novo',
      contacted: 'Contactado',
      pre_qualified: 'Pré-Qualificado',
      not_qualified: 'Não Qualificado',
      kyc_pending: 'KYC Pendente',
      kyc_approved: 'KYC Aprovado',
      active_client: 'Cliente Ativo',
      lost: 'Perdido'
    };
    return <Badge className={colors[status] || 'bg-gray-900/30 text-gray-400'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <UserPlus className="text-gold-400" />
            Leads OTC
          </h1>
          <p className="text-gray-400 mt-1">Gestão de leads para operações OTC</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gold-500 hover:bg-gold-400 text-black"
        >
          <Plus size={16} className="mr-2" />
          Novo Lead
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por nome, email..."
                className="pl-10 bg-zinc-800 border-gold-500/30 text-white"
                onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="contacted">Contactado</SelectItem>
                <SelectItem value="pre_qualified">Pré-Qualificado</SelectItem>
                <SelectItem value="not_qualified">Não Qualificado</SelectItem>
                <SelectItem value="active_client">Cliente Ativo</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all">Todas Origens</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referência</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="broker">Broker</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={fetchLeads} variant="outline" className="border-gold-500/30">
              <RefreshCw size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gold-400">Carregando...</div>
            </div>
          ) : leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold-800/20">
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Entidade</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Contacto</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">País</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Volume Est.</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Asset</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Origem</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-gray-400 text-sm font-medium">Data</th>
                    <th className="text-right p-4 text-gray-400 text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-gold-800/10 hover:bg-gold-900/10">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                            <Building className="text-gold-400" size={18} />
                          </div>
                          <div>
                            <p className="text-white font-medium">{lead.entity_name}</p>
                            <p className="text-gray-400 text-xs">{lead.contact_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-300 text-sm">{lead.contact_email}</p>
                        {lead.contact_phone && (
                          <p className="text-gray-500 text-xs">{lead.contact_phone}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-white">{lead.country}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-gold-400 font-mono">
                          ${formatNumber(lead.estimated_volume_usd || 0)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-zinc-700">{lead.target_asset || '-'}</Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300 capitalize">{lead.source?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-4">{getStatusBadge(lead.status)}</td>
                      <td className="p-4">
                        <span className="text-gray-400 text-sm">{formatDate(lead.created_at)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          onClick={() => { setSelectedLead(lead); setShowDetailDialog(true); }}
                          size="sm"
                          variant="outline"
                          className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
                        >
                          <Eye size={14} className="mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <UserPlus className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">Sem Leads</h3>
              <p className="text-gray-400">Crie o primeiro lead OTC para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <UserPlus size={20} />
              Novo Lead OTC
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Entidade *</Label>
              <Input
                value={formData.entity_name}
                onChange={(e) => setFormData({...formData, entity_name: e.target.value})}
                placeholder="Empresa ou Nome"
                className="bg-zinc-800 border-gold-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Contacto *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                placeholder="Nome completo"
                className="bg-zinc-800 border-gold-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                placeholder="email@empresa.com"
                className="bg-zinc-800 border-gold-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                placeholder="+351 ..."
                className="bg-zinc-800 border-gold-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>País *</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                placeholder="Portugal"
                className="bg-zinc-800 border-gold-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                <SelectTrigger className="bg-zinc-800 border-gold-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-gold-500/30">
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referência</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Volume Estimado (USD)</Label>
              <Input
                type="number"
                value={formData.estimated_volume_usd}
                onChange={(e) => setFormData({...formData, estimated_volume_usd: e.target.value})}
                placeholder="100000"
                className="bg-zinc-800 border-gold-500/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Asset Pretendido</Label>
              <Select value={formData.target_asset} onValueChange={(v) => setFormData({...formData, target_asset: v})}>
                <SelectTrigger className="bg-zinc-800 border-gold-500/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-gold-500/30">
                  <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  <SelectItem value="USDT">Tether (USDT)</SelectItem>
                  <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Notas adicionais sobre o lead..."
                className="bg-zinc-800 border-gold-500/30"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-zinc-600">
              Cancelar
            </Button>
            <Button onClick={handleCreateLead} className="bg-gold-500 hover:bg-gold-400 text-black">
              Criar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gold-400 flex items-center gap-2">
              <Building size={20} />
              {selectedLead?.entity_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Contacto</p>
                  <p className="text-white">{selectedLead.contact_name}</p>
                  <p className="text-gray-400 text-sm">{selectedLead.contact_email}</p>
                  {selectedLead.contact_phone && <p className="text-gray-400 text-sm">{selectedLead.contact_phone}</p>}
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Localização</p>
                  <p className="text-white">{selectedLead.country}</p>
                  {selectedLead.jurisdiction && <p className="text-gray-400 text-sm">{selectedLead.jurisdiction}</p>}
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Volume Estimado</p>
                  <p className="text-gold-400 font-mono text-xl">${formatNumber(selectedLead.estimated_volume_usd || 0)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Asset / Tipo</p>
                  <p className="text-white">{selectedLead.target_asset} - {selectedLead.transaction_type?.toUpperCase()}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Origem</p>
                  <p className="text-white capitalize">{selectedLead.source?.replace('_', ' ')}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Status</p>
                  {getStatusBadge(selectedLead.status)}
                </div>
              </div>
              
              {selectedLead.notes && (
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-gray-400 text-xs uppercase mb-1">Notas</p>
                  <p className="text-white whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              {selectedLead.status === 'new' || selectedLead.status === 'contacted' ? (
                <div className="flex gap-3 pt-4 border-t border-gold-800/20">
                  <Button
                    onClick={() => handlePreQualify(selectedLead.id, true)}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Pré-Qualificar
                  </Button>
                  <Button
                    onClick={() => handlePreQualify(selectedLead.id, false)}
                    variant="outline"
                    className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"
                  >
                    <XCircle size={16} className="mr-2" />
                    Não Qualificado
                  </Button>
                </div>
              ) : selectedLead.status === 'pre_qualified' ? (
                <div className="flex gap-3 pt-4 border-t border-gold-800/20">
                  <Button className="flex-1 bg-gold-500 hover:bg-gold-400 text-black">
                    <ChevronRight size={16} className="mr-2" />
                    Avançar para KYC
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCLeads;
