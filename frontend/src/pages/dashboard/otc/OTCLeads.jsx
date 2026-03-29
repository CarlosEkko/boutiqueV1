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
  ChevronRight,
  UserCheck,
  Clock,
  Trash2,
  Archive,
  AlertTriangle,
  Link2,
  User,
  FileText,
  Settings,
  Send,
  CreditCard
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
  
  // Existing contact check
  const [existingContact, setExistingContact] = useState(null);
  const [checkingContact, setCheckingContact] = useState(false);
  const [showExistingWarning, setShowExistingWarning] = useState(false);
  const [show360Modal, setShow360Modal] = useState(false);
  const [selected360User, setSelected360User] = useState(null);
  
  // Workflow states
  const [showPreQualDialog, setShowPreQualDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [workflowEnums, setWorkflowEnums] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [preQualData, setPreQualData] = useState({
    client_type: '',
    first_operation_value: '',
    expected_frequency: '',
    estimated_monthly_volume: '',
    operation_objective: '',
    operation_objective_detail: '',
    fund_source: '',
    fund_source_detail: '',
    settlement_channel: '',
    bank_jurisdiction: '',
    notes: ''
  });
  const [setupData, setSetupData] = useState({
    daily_limit: '',
    monthly_limit: '',
    settlement_method: '',
    account_manager_id: '',
    communication_channel_type: 'email',
    notes: ''
  });
  
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
    trading_frequency: 'one_shot',
    volume_per_operation: '',
    execution_timeframe: 'flexible',
    preferred_settlement_methods: [],
    current_exchange: '',
    problem_to_solve: '',
    notes: ''
  });

  useEffect(() => {
    fetchEnums();
    fetchWorkflowEnums();
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

  const fetchWorkflowEnums = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/otc/workflow/stages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkflowEnums(response.data);
    } catch (err) {
      console.error('Failed to fetch workflow enums:', err);
    }
  };

  // Verify if client exists (Stage 2)
  const handleVerifyClient = async (leadId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/otc/leads/${leadId}/verify-client`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVerificationResult(response.data);
      toast.success(response.data.message);
      fetchLeads();
      return response.data;
    } catch (err) {
      toast.error('Erro ao verificar cliente');
      return null;
    }
  };

  // Send onboarding email (Stage 2)
  const handleSendOnboardingEmail = async (leadId) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/otc/leads/${leadId}/send-onboarding-email`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.simulated) {
        toast.info('Email simulado (Brevo não configurado)');
      } else {
        toast.success('Email de onboarding enviado!');
      }
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao enviar email');
    }
  };

  // Submit pre-qualification (Stage 3)
  const handleSubmitPreQual = async () => {
    if (!selectedLead) return;
    
    try {
      const response = await axios.post(
        `${API_URL}/api/otc/leads/${selectedLead.id}/pre-qualification`,
        preQualData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pré-qualificação submetida!');
      if (response.data.red_flags_detected?.length > 0) {
        toast.warning(`Red flags detectados: ${response.data.red_flags_detected.join(', ')}`);
      }
      setShowPreQualDialog(false);
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao submeter pré-qualificação');
    }
  };

  // Submit operational setup (Stage 4)
  const handleSubmitSetup = async () => {
    if (!selectedLead) return;
    
    try {
      const response = await axios.post(
        `${API_URL}/api/otc/leads/${selectedLead.id}/operational-setup`,
        setupData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Setup operacional completo!');
      setShowSetupDialog(false);
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao submeter setup operacional');
    }
  };

  // Add red flag
  const handleAddRedFlag = async (leadId, flagType, notes) => {
    try {
      await axios.post(
        `${API_URL}/api/otc/leads/${leadId}/add-red-flag?flag_type=${flagType}&notes=${encodeURIComponent(notes || '')}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Red flag adicionada');
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao adicionar red flag');
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

  // Check if email, entity name or contact name already exists
  const checkExistingContact = async (field, value) => {
    if (!value || value.length < 3) {
      return;
    }
    
    setCheckingContact(true);
    try {
      const params = new URLSearchParams();
      if (field === 'email') params.append('email', value);
      if (field === 'entity_name') params.append('entity_name', value);
      if (field === 'contact_name') params.append('contact_name', value);
      
      const response = await axios.get(
        `${API_URL}/api/otc/check-existing?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const data = response.data;
      if (data.existing_otc_client || data.existing_user || data.existing_lead) {
        setExistingContact(data);
        setShowExistingWarning(true);
      }
    } catch (err) {
      console.error('Failed to check existing contact:', err);
    } finally {
      setCheckingContact(false);
    }
  };

  // Legacy function for backward compatibility
  const checkExistingEmail = (email) => checkExistingContact('email', email);

  // Open 360° view modal
  const open360View = (contact) => {
    setSelected360User(contact);
    setShow360Modal(true);
  };

  // Create OTC Client directly (skip lead workflow)
  const handleCreateClientDirect = async () => {
    if (!existingContact?.existing_user) return;
    
    try {
      const user = existingContact.existing_user;
      const params = new URLSearchParams({
        entity_name: formData.entity_name || user.company_name || `${user.first_name} ${user.last_name}`,
        contact_name: formData.contact_name || `${user.first_name} ${user.last_name}`,
        contact_email: user.email,
        country: formData.country || 'Portugal',
        user_id: user.id
      });
      
      if (formData.contact_phone) params.append('contact_phone', formData.contact_phone);
      
      await axios.post(`${API_URL}/api/otc/clients/create-direct?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Cliente OTC criado com sucesso!');
      setShowCreateDialog(false);
      setShowExistingWarning(false);
      setExistingContact(null);
      resetForm();
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar cliente');
    }
  };

  const resetForm = () => {
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
      trading_frequency: 'one_shot',
      volume_per_operation: '',
      execution_timeframe: 'flexible',
      preferred_settlement_methods: [],
      current_exchange: '',
      problem_to_solve: '',
      notes: ''
    });
    setExistingContact(null);
    setShowExistingWarning(false);
  };

  const handleCreateLead = async () => {
    try {
      const payload = {
        ...formData,
        estimated_volume_usd: parseFloat(formData.estimated_volume_usd) || 0,
        volume_per_operation: formData.volume_per_operation ? parseFloat(formData.volume_per_operation) : null
      };
      
      await axios.post(`${API_URL}/api/otc/leads`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Lead criado com sucesso');
      setShowCreateDialog(false);
      setShowExistingWarning(false);
      resetForm();
      fetchLeads();
    } catch (err) {
      toast.error('Erro ao criar lead');
    }
  };

  const handleAdvanceToKYC = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/advance-to-kyc`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Lead avançado para KYC');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao avançar para KYC');
    }
  };

  const handleApproveKYC = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/approve-kyc`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('KYC aprovado!');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao aprovar KYC');
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

  const handleConvertToClient = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/convert-to-client`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Lead convertido para cliente OTC!');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao converter para cliente');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Tem certeza que deseja eliminar este lead? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/api/otc/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Lead eliminado com sucesso');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar lead');
    }
  };

  const handleArchiveLead = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Lead arquivado com sucesso');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao arquivar lead');
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
      lost: 'bg-red-900/30 text-red-400',
      archived: 'bg-zinc-900/30 text-zinc-400'
    };
    const labels = {
      new: 'Novo',
      contacted: 'Contactado',
      pre_qualified: 'Pré-Qualificado',
      not_qualified: 'Não Qualificado',
      kyc_pending: 'KYC Pendente',
      kyc_approved: 'KYC Aprovado',
      active_client: 'Cliente Ativo',
      lost: 'Perdido',
      archived: 'Arquivado'
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
              <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all" className="text-white hover:bg-zinc-700">Todos Status</SelectItem>
                <SelectItem value="new" className="text-white hover:bg-zinc-700">Novo</SelectItem>
                <SelectItem value="contacted" className="text-white hover:bg-zinc-700">Contactado</SelectItem>
                <SelectItem value="pre_qualified" className="text-white hover:bg-zinc-700">Pré-Qualificado</SelectItem>
                <SelectItem value="not_qualified" className="text-white hover:bg-zinc-700">Não Qualificado</SelectItem>
                <SelectItem value="active_client" className="text-white hover:bg-zinc-700">Cliente Ativo</SelectItem>
                <SelectItem value="archived" className="text-white hover:bg-zinc-700">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-gold-500/30">
                <SelectItem value="all" className="text-white hover:bg-zinc-700">Todas Origens</SelectItem>
                <SelectItem value="website" className="text-white hover:bg-zinc-700">Website</SelectItem>
                <SelectItem value="referral" className="text-white hover:bg-zinc-700">Referência</SelectItem>
                <SelectItem value="linkedin" className="text-white hover:bg-zinc-700">LinkedIn</SelectItem>
                <SelectItem value="event" className="text-white hover:bg-zinc-700">Evento</SelectItem>
                <SelectItem value="broker" className="text-white hover:bg-zinc-700">Broker</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={fetchLeads} variant="outline" className="border-gold-500/30">
              <RefreshCw size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gold-400">Carregando...</div>
        </div>
      ) : leads.length > 0 ? (
        <div className="space-y-3">
          {leads.map((lead) => {
            // Define status icon and colors
            const getStatusIcon = (status) => {
              switch(status) {
                case 'active_client':
                case 'kyc_approved':
                  return { icon: CheckCircle, bgColor: 'bg-green-500/20', iconColor: 'text-green-400', borderColor: 'border-green-500/30' };
                case 'pre_qualified':
                case 'contacted':
                  return { icon: Clock, bgColor: 'bg-purple-500/20', iconColor: 'text-purple-400', borderColor: 'border-purple-500/30' };
                case 'kyc_pending':
                  return { icon: Clock, bgColor: 'bg-yellow-500/20', iconColor: 'text-yellow-400', borderColor: 'border-yellow-500/30' };
                case 'not_qualified':
                case 'lost':
                  return { icon: XCircle, bgColor: 'bg-red-500/20', iconColor: 'text-red-400', borderColor: 'border-red-500/30' };
                case 'archived':
                  return { icon: Archive, bgColor: 'bg-gray-500/20', iconColor: 'text-gray-400', borderColor: 'border-gray-500/30' };
                default: // new
                  return { icon: UserPlus, bgColor: 'bg-blue-500/20', iconColor: 'text-blue-400', borderColor: 'border-blue-500/30' };
              }
            };
            
            const statusConfig = getStatusIcon(lead.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card 
                key={lead.id} 
                className={`bg-zinc-900/80 border ${statusConfig.borderColor} hover:bg-zinc-900 transition-all cursor-pointer`}
                onClick={() => { setSelectedLead(lead); setShowDetailDialog(true); }}
                data-testid={`lead-card-${lead.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-5">
                    {/* Status Icon */}
                    <div className={`w-14 h-14 rounded-xl ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <StatusIcon size={28} className={statusConfig.iconColor} />
                    </div>
                    
                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium text-lg">{lead.contact_name || 'Lead'}</h3>
                        <span className="text-gray-500">•</span>
                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                          <Building size={14} />
                          {lead.entity_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {lead.contact_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe size={14} />
                          {lead.country || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <TrendingUp size={14} />
                          {lead.source?.replace('_', ' ') || 'Website'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Volume */}
                    <div className="text-right flex-shrink-0 mr-4">
                      <p className="text-gray-400 text-xs uppercase mb-1">Volume Estimado</p>
                      <p className="text-gold-400 font-mono text-xl">
                        $ {formatNumber(lead.estimated_volume_usd || 0)}
                      </p>
                    </div>
                    
                    {/* Asset Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className="bg-zinc-700 text-gray-300 font-mono">{lead.target_asset || 'BTC'}</Badge>
                      {lead.transaction_type === 'both' && (
                        <Badge className="bg-zinc-700 text-gray-300 font-mono">ETH</Badge>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(lead.status)}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Workflow Action Buttons based on status */}
                      
                      {/* New Lead -> Verify Client */}
                      {lead.status === 'new' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-blue-500/30 text-blue-400 hover:bg-blue-900/20"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const result = await handleVerifyClient(lead.id);
                            if (result) {
                              setSelectedLead(lead);
                              setVerificationResult(result);
                              // Show appropriate next step based on result
                              if (result.action_needed === 'start_onboarding') {
                                if (window.confirm('Cliente não existe. Enviar email de onboarding?')) {
                                  await handleSendOnboardingEmail(lead.id);
                                }
                              } else if (result.action_needed === 'proceed_to_otc') {
                                toast.success('Cliente existente com KYC válido. Prosseguir para pré-qualificação.');
                              }
                            }
                          }}
                          title="Verificar Cliente"
                          data-testid={`verify-lead-${lead.id}`}
                        >
                          <UserCheck size={18} />
                        </Button>
                      )}
                      
                      {/* Contacted -> Pre-Qualification */}
                      {lead.status === 'contacted' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-purple-500/30 text-purple-400 hover:bg-purple-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setPreQualData({
                              client_type: '',
                              first_operation_value: lead.volume_per_operation || '',
                              expected_frequency: lead.trading_frequency || '',
                              estimated_monthly_volume: lead.estimated_volume_usd || '',
                              operation_objective: '',
                              operation_objective_detail: '',
                              fund_source: '',
                              fund_source_detail: '',
                              settlement_channel: '',
                              bank_jurisdiction: '',
                              notes: ''
                            });
                            setShowPreQualDialog(true);
                          }}
                          title="Pré-Qualificação"
                          data-testid={`prequal-lead-${lead.id}`}
                        >
                          <FileText size={18} />
                        </Button>
                      )}
                      
                      {/* Pre-Qualified -> KYC */}
                      {lead.status === 'pre_qualified' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdvanceToKYC(lead.id);
                          }}
                          title="Avançar para KYC"
                          data-testid={`kyc-lead-${lead.id}`}
                        >
                          <ChevronRight size={18} />
                        </Button>
                      )}
                      
                      {/* KYC Pending -> Approve */}
                      {lead.status === 'kyc_pending' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveKYC(lead.id);
                          }}
                          title="Aprovar KYC"
                          data-testid={`approve-kyc-${lead.id}`}
                        >
                          <CheckCircle size={18} />
                        </Button>
                      )}
                      
                      {/* KYC Approved -> Setup Operacional */}
                      {lead.status === 'kyc_approved' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                            setSetupData({
                              daily_limit: lead.daily_limit_set || '100000',
                              monthly_limit: lead.monthly_limit_set || '1000000',
                              settlement_method: lead.settlement_method_defined || '',
                              account_manager_id: lead.assigned_to || '',
                              communication_channel_type: lead.communication_channel_type || 'email',
                              notes: ''
                            });
                            setShowSetupDialog(true);
                          }}
                          title="Setup Operacional"
                          data-testid={`setup-lead-${lead.id}`}
                        >
                          <Settings size={18} />
                        </Button>
                      )}
                      
                      {/* Setup Pending -> Convert to Client */}
                      {lead.status === 'setup_pending' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-green-500/30 text-green-400 hover:bg-green-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertToClient(lead.id);
                          }}
                          title="Converter para Cliente"
                          data-testid={`convert-lead-${lead.id}`}
                        >
                          <UserPlus size={18} />
                        </Button>
                      )}
                      
                      {/* Edit/View Button */}
                      <Button
                        size="icon"
                        variant="outline"
                        className="w-10 h-10 border-gold-500/30 text-gold-400 hover:bg-gold-900/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                          setShowDetailDialog(true);
                        }}
                        title="Ver Detalhes"
                        data-testid={`view-lead-${lead.id}`}
                      >
                        <Edit size={18} />
                      </Button>
                      
                      {/* Delete Button */}
                      {lead.status !== 'active_client' && (
                        <Button
                          size="icon"
                          variant="outline"
                          className="w-10 h-10 border-red-500/30 text-red-400 hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(lead.id);
                          }}
                          title="Eliminar Lead"
                          data-testid={`delete-lead-${lead.id}`}
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-12 text-center">
            <UserPlus className="mx-auto mb-4 text-gray-500" size={48} />
            <h3 className="text-xl text-white mb-2">Sem Leads</h3>
            <p className="text-gray-400">Crie o primeiro lead OTC para começar.</p>
          </CardContent>
        </Card>
      )}

      {/* Create Lead Dialog - Multi-Step Wizard */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-gold-400 flex items-center gap-2 text-xl">
              <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
                <UserPlus size={18} className="text-gold-400" />
              </div>
              Novo Lead OTC
            </DialogTitle>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-black font-bold text-sm">1</div>
                <span className="text-gold-400 text-sm font-medium">Dados & Verificação</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm">2</div>
                <span className="text-zinc-400 text-sm">Pré-Qualificação</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm">3</div>
                <span className="text-zinc-400 text-sm">Setup Operacional</span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* EXISTING CONTACT WARNING - REDESIGNED */}
            {showExistingWarning && existingContact && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/80 via-zinc-900 to-zinc-950">
                {/* Animated Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 animate-pulse" />
                
                {/* Header */}
                <div className="relative p-5 border-b border-amber-500/30 bg-amber-950/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                          <AlertTriangle size={28} className="text-black" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center animate-bounce">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-amber-400 font-bold text-2xl">Contacto Já Existe</h3>
                        <p className="text-amber-200/70 text-sm mt-1">Este contacto já está registado no sistema KBEX</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowExistingWarning(false)}
                      className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
                    >
                      <XCircle size={20} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="relative p-5 space-y-4">
                  {/* Existing OTC Client */}
                  {existingContact.existing_otc_client && (
                    <div className="group p-5 rounded-xl bg-gradient-to-r from-green-950/60 to-green-900/30 border border-green-500/40 hover:border-green-400 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 cursor-pointer"
                         onClick={() => open360View(existingContact.existing_otc_client)}>
                      <div className="flex items-center gap-5">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <Building className="text-white" size={32} />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider border border-green-500/30">
                              ✓ Cliente OTC Activo
                            </span>
                            <Badge className="bg-green-600 text-white border-0 shadow-lg">
                              {existingContact.existing_otc_client.status?.replace('_', ' ') || 'Ativo'}
                            </Badge>
                          </div>
                          <p className="text-white font-bold text-xl group-hover:text-green-300 transition-colors">
                            {existingContact.existing_otc_client.entity_name}
                          </p>
                          <p className="text-green-300/80 text-sm mt-1 flex items-center gap-2">
                            <Mail size={14} />
                            {existingContact.existing_otc_client.contact_email}
                          </p>
                        </div>
                        
                        {/* Action */}
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={(e) => { e.stopPropagation(); open360View(existingContact.existing_otc_client); }}
                            className="bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30"
                          >
                            <Eye size={16} className="mr-2" /> Ver Visão 360°
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); /* TODO: Create deal */ }}
                            className="border-green-500/50 text-green-400 hover:bg-green-900/30"
                          >
                            <Plus size={16} className="mr-2" /> Nova Operação
                          </Button>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      {existingContact.existing_otc_client.total_volume && (
                        <div className="mt-4 pt-4 border-t border-green-500/20 grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-green-400 text-xs uppercase">Volume Total</p>
                            <p className="text-white font-mono text-lg">${formatNumber(existingContact.existing_otc_client.total_volume || 0)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 text-xs uppercase">Operações</p>
                            <p className="text-white font-mono text-lg">{existingContact.existing_otc_client.deal_count || 0}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 text-xs uppercase">Desde</p>
                            <p className="text-white font-mono text-lg">{existingContact.existing_otc_client.created_at?.split('T')[0] || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Existing Platform User */}
                  {existingContact.existing_user && (
                    <div className="group p-5 rounded-xl bg-gradient-to-r from-blue-950/60 to-blue-900/30 border border-blue-500/40 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
                         onClick={() => open360View(existingContact.existing_user)}>
                      <div className="flex items-center gap-5">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <User className="text-white" size={32} />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                              Utilizador Registado
                            </span>
                            <Badge className={`${existingContact.existing_user.kyc_status === 'approved' ? 'bg-green-600' : 'bg-yellow-600'} text-white border-0 shadow-lg`}>
                              KYC: {existingContact.existing_user.kyc_status || 'Pendente'}
                            </Badge>
                          </div>
                          <p className="text-white font-bold text-xl group-hover:text-blue-300 transition-colors">
                            {existingContact.existing_user.first_name} {existingContact.existing_user.last_name}
                          </p>
                          <p className="text-blue-300/80 text-sm mt-1 flex items-center gap-2">
                            <Mail size={14} />
                            {existingContact.existing_user.email}
                          </p>
                        </div>
                        
                        {/* Action */}
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={(e) => { e.stopPropagation(); open360View(existingContact.existing_user); }}
                            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                          >
                            <Eye size={16} className="mr-2" /> Ver Visão 360°
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleCreateClientDirect(); }}
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-900/30"
                          >
                            <UserPlus size={16} className="mr-2" /> Criar Cliente OTC
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Existing Lead */}
                  {existingContact.existing_lead && (
                    <div className="group p-5 rounded-xl bg-gradient-to-r from-purple-950/60 to-purple-900/30 border border-purple-500/40 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                         onClick={() => { setSelectedLead(existingContact.existing_lead); setShowDetailDialog(true); setShowCreateDialog(false); }}>
                      <div className="flex items-center gap-5">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <UserPlus className="text-white" size={32} />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
                              Lead OTC Existente
                            </span>
                            <Badge className="bg-purple-600 text-white border-0 shadow-lg">
                              {existingContact.existing_lead.status?.replace('_', ' ') || 'Novo'}
                            </Badge>
                          </div>
                          <p className="text-white font-bold text-xl group-hover:text-purple-300 transition-colors">
                            {existingContact.existing_lead.entity_name}
                          </p>
                          <p className="text-purple-300/80 text-sm mt-1 flex items-center gap-2">
                            <Mail size={14} />
                            {existingContact.existing_lead.contact_email}
                          </p>
                        </div>
                        
                        {/* Action */}
                        <Button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedLead(existingContact.existing_lead); 
                            setShowDetailDialog(true); 
                            setShowCreateDialog(false); 
                          }}
                          className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                        >
                          <Eye size={16} className="mr-2" /> Ver Lead
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Footer Actions */}
                <div className="relative p-5 border-t border-amber-500/20 bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <p className="text-amber-200/60 text-sm">
                      💡 Pode utilizar o registo existente ou criar um novo lead
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowExistingWarning(false)}
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-900/30"
                    >
                      Ignorar e Criar Novo Lead
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Contact Information Card */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <User size={16} />
                  Informação de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Nome da Entidade *</Label>
                    <Input
                      value={formData.entity_name}
                      onChange={(e) => setFormData({...formData, entity_name: e.target.value})}
                      onBlur={(e) => checkExistingContact('entity_name', e.target.value)}
                      placeholder="Empresa ou Nome"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Nome do Contacto *</Label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                      onBlur={(e) => checkExistingContact('contact_name', e.target.value)}
                      placeholder="Nome completo"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Email *</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                      onBlur={(e) => checkExistingContact('email', e.target.value)}
                      placeholder="email@empresa.com"
                      className={`bg-zinc-800 border-zinc-700 text-white ${checkingContact ? 'opacity-50' : ''}`}
                    />
                    {checkingContact && <p className="text-xs text-gold-400 animate-pulse">🔍 Verificando contacto existente...</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Telefone</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                      placeholder="+351 ..."
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">País *</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      placeholder="PT, BR, AE..."
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Origem</Label>
                    <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="website" className="text-white hover:bg-zinc-700">Website</SelectItem>
                        <SelectItem value="referral" className="text-white hover:bg-zinc-700">Referência</SelectItem>
                        <SelectItem value="linkedin" className="text-white hover:bg-zinc-700">LinkedIn</SelectItem>
                        <SelectItem value="event" className="text-white hover:bg-zinc-700">Evento</SelectItem>
                        <SelectItem value="broker" className="text-white hover:bg-zinc-700">Broker</SelectItem>
                        <SelectItem value="cold_outreach" className="text-white hover:bg-zinc-700">Cold Outreach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Trading Profile Card */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <TrendingUp size={16} />
                  Perfil de Trading (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Volume Estimado Total (USD)</Label>
                    <Input
                      type="number"
                      value={formData.estimated_volume_usd}
                      onChange={(e) => setFormData({...formData, estimated_volume_usd: e.target.value})}
                      placeholder="100000"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Asset Pretendido</Label>
                    <Select value={formData.target_asset} onValueChange={(v) => setFormData({...formData, target_asset: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="BTC" className="text-white hover:bg-zinc-700">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH" className="text-white hover:bg-zinc-700">Ethereum (ETH)</SelectItem>
                        <SelectItem value="USDT" className="text-white hover:bg-zinc-700">Tether (USDT)</SelectItem>
                        <SelectItem value="USDC" className="text-white hover:bg-zinc-700">USD Coin (USDC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Tipo de Transação</Label>
                    <Select value={formData.transaction_type} onValueChange={(v) => setFormData({...formData, transaction_type: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectItem value="buy" className="text-white hover:bg-zinc-700">Compra</SelectItem>
                        <SelectItem value="sell" className="text-white hover:bg-zinc-700">Venda</SelectItem>
                        <SelectItem value="both" className="text-white hover:bg-zinc-700">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Notes Card */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <FileText size={16} />
                  Notas (Opcional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notas sobre o lead, contexto da primeira conversa, etc..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)} 
              className="border-zinc-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateLead}
              className="bg-gold-500 text-black hover:bg-gold-600"
              disabled={!formData.entity_name || !formData.contact_name || !formData.contact_email || !formData.country || loading}
            >
              {loading ? 'Criando...' : (
                <>
                  <UserPlus size={16} className="mr-2" />
                  Criar Lead
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog - Redesigned like 360° Modal */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-gold-400 flex items-center gap-2 text-xl">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Building size={18} className="text-purple-400" />
              </div>
              Lead OTC - {selectedLead?.entity_name}
            </DialogTitle>
            {selectedLead && (
              <p className="text-gray-400 text-sm mt-1">
                {selectedLead.contact_name} - {selectedLead.contact_email}
              </p>
            )}
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-6 py-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">Status:</span>
                  {getStatusBadge(selectedLead.status)}
                </div>
                <span className="text-gray-500 text-sm">
                  Criado: {new Date(selectedLead.created_at).toLocaleDateString('pt-PT')}
                </span>
              </div>
              
              {/* Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Info Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                      <User size={16} />
                      Informação de Contacto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nome:</span>
                      <span className="text-white">{selectedLead.contact_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selectedLead.contact_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Telefone:</span>
                      <span className="text-white">{selectedLead.contact_phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">País:</span>
                      <span className="text-white">{selectedLead.country || '-'}</span>
                    </div>
                    {selectedLead.jurisdiction && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Jurisdição:</span>
                        <span className="text-white">{selectedLead.jurisdiction}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Origem:</span>
                      <Badge className="bg-zinc-800 text-gray-300 capitalize">{selectedLead.source?.replace('_', ' ')}</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Trading Profile Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                      <TrendingUp size={16} />
                      Perfil de Trading
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volume Total:</span>
                      <span className="text-gold-400 font-mono font-medium">${formatNumber(selectedLead.estimated_volume_usd || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Por Operação:</span>
                      <span className="text-white font-mono">${formatNumber(selectedLead.volume_per_operation || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Asset:</span>
                      <span className="text-white">{selectedLead.target_asset || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Tipo:</span>
                      <Badge className="bg-blue-900/30 text-blue-400 uppercase">{selectedLead.transaction_type || '-'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Frequência:</span>
                      <Badge className="bg-zinc-800 text-gray-300">
                        {selectedLead.trading_frequency === 'one_shot' ? 'Única' :
                         selectedLead.trading_frequency === 'daily' ? 'Diário' :
                         selectedLead.trading_frequency === 'weekly' ? 'Semanal' :
                         selectedLead.trading_frequency === 'multiple_daily' ? 'Múltiplas/Dia' :
                         selectedLead.trading_frequency || '-'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Timeframe:</span>
                      <span className="text-white">
                        {selectedLead.execution_timeframe === 'within_24h' ? '24h' :
                         selectedLead.execution_timeframe === 'within_48h' ? '48h' :
                         selectedLead.execution_timeframe === 'within_week' ? '1 semana' :
                         selectedLead.execution_timeframe === 'flexible' ? 'Flexível' :
                         selectedLead.execution_timeframe || '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Settlement Methods Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                      <Building size={16} />
                      Liquidação & Exchange
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">Métodos Preferidos:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLead.preferred_settlement_methods && selectedLead.preferred_settlement_methods.length > 0 ? (
                          selectedLead.preferred_settlement_methods.map((method, idx) => (
                            <Badge key={idx} className="bg-gold-500/20 text-gold-400 uppercase text-xs">
                              {method}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500">Não especificado</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Exchange Atual:</span>
                      <span className="text-white">{selectedLead.current_exchange || '-'}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Notes Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                      <FileText size={16} />
                      Notas & Necessidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedLead.problem_to_solve && (
                      <div>
                        <span className="text-gray-400 text-sm">Problema/Necessidade:</span>
                        <p className="text-white text-sm mt-1 whitespace-pre-wrap bg-zinc-800/50 p-2 rounded">{selectedLead.problem_to_solve}</p>
                      </div>
                    )}
                    {selectedLead.notes && (
                      <div>
                        <span className="text-gray-400 text-sm">Notas Adicionais:</span>
                        <p className="text-white text-sm mt-1 whitespace-pre-wrap bg-zinc-800/50 p-2 rounded">{selectedLead.notes}</p>
                      </div>
                    )}
                    {!selectedLead.problem_to_solve && !selectedLead.notes && (
                      <p className="text-gray-500 text-center py-4">Sem notas registadas</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-800">
                {selectedLead.status === 'new' || selectedLead.status === 'contacted' ? (
                  <div className="flex gap-3">
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
                  <Button 
                    onClick={() => handleAdvanceToKYC(selectedLead.id)}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <ChevronRight size={16} className="mr-2" />
                    Avançar para KYC
                  </Button>
                ) : selectedLead.status === 'kyc_pending' ? (
                  <div className="flex gap-3">
                    <Button 
                      onClick={() => handleApproveKYC(selectedLead.id)}
                      className="flex-1 bg-green-600 hover:bg-green-500"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Aprovar KYC
                    </Button>
                    <Button
                      onClick={() => handlePreQualify(selectedLead.id, false)}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <XCircle size={16} className="mr-2" />
                      Rejeitar KYC
                    </Button>
                  </div>
                ) : selectedLead.status === 'kyc_approved' ? (
                  <Button 
                    onClick={() => handleConvertToClient(selectedLead.id)}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <UserCheck size={16} className="mr-2" />
                    Converter para Cliente
                  </Button>
                ) : null}
                
                {/* Delete/Archive buttons */}
                {selectedLead.status !== 'active_client' && (
                  <div className="flex gap-3 mt-3">
                    <Button
                      onClick={() => handleArchiveLead(selectedLead.id)}
                      variant="outline"
                      className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-900/30"
                    >
                      <Archive size={16} className="mr-2" />
                      Arquivar
                    </Button>
                    <Button
                      onClick={() => handleDeleteLead(selectedLead.id)}
                      variant="outline"
                      className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* 360° Client View Modal */}
      <Dialog open={show360Modal} onOpenChange={setShow360Modal}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-gold-400 flex items-center gap-2 text-xl">
              <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
                <Eye size={18} className="text-gold-400" />
              </div>
              Visão 360° do Cliente
            </DialogTitle>
            {selected360User && (
              <p className="text-gray-400 text-sm mt-1">
                {selected360User.entity_name || `${selected360User.first_name} ${selected360User.last_name}`} - {selected360User.contact_email || selected360User.email}
              </p>
            )}
          </DialogHeader>
          
          {selected360User && (
            <div className="space-y-6 py-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-zinc-800 pb-3">
                <Button size="sm" className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30">
                  Resumo
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  Trading
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  Carteiras
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  Atividade
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                  Suporte
                </Button>
              </div>
              
              {/* Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Info Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                      <User size={16} />
                      Informação Pessoal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nome:</span>
                      <span className="text-white">{selected360User.contact_name || `${selected360User.first_name || ''} ${selected360User.last_name || ''}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selected360User.contact_email || selected360User.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Telefone:</span>
                      <span className="text-white">{selected360User.contact_phone || selected360User.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">País:</span>
                      <span className="text-white">{selected360User.country || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Região:</span>
                      <Badge className="bg-blue-900/30 text-blue-400">{selected360User.region || 'Europa'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Nível:</span>
                      <Badge className="bg-zinc-800 text-white">{selected360User.client_tier || 'Standard'}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">KYC:</span>
                      <Badge className={`${selected360User.kyc_status === 'approved' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                        {selected360User.kyc_status === 'approved' ? 'Aprovado' : 'Pendente'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Registado:</span>
                      <span className="text-white">{selected360User.created_at ? new Date(selected360User.created_at).toLocaleDateString('pt-PT') : '-'}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Trading Profile Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                      <TrendingUp size={16} />
                      Perfil de Trading
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Volume Total:</span>
                      <span className="text-white font-mono">€{formatNumber(selected360User.total_volume || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Ordens:</span>
                      <span className="text-white">{selected360User.total_orders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Compras:</span>
                      <span className="text-green-400">{selected360User.buy_orders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vendas:</span>
                      <span className="text-red-400">{selected360User.sell_orders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Média por Ordem:</span>
                      <span className="text-white font-mono">€{formatNumber(selected360User.avg_order_value || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Frequência:</span>
                      <Badge className="bg-zinc-800 text-gray-300">{selected360User.trading_frequency || 'Nenhuma'}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Última Trade:</span>
                      <span className="text-white">{selected360User.last_trade_at ? new Date(selected360User.last_trade_at).toLocaleDateString('pt-PT') : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Pares Favoritos:</span>
                      <span className="text-white">{selected360User.favorite_pairs || '-'}</span>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Account Manager Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                      <Building size={16} />
                      Account Manager
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selected360User.account_manager ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                          <User className="text-gold-400" size={20} />
                        </div>
                        <div>
                          <p className="text-white">{selected360User.account_manager}</p>
                          <p className="text-gray-400 text-sm">Account Manager</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Sem account manager atribuído</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Quick Summary Card */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                      <TrendingUp size={16} />
                      Resumo Rápido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Carteiras:</span>
                      <span className="text-white">{selected360User.wallets_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Transações:</span>
                      <span className="text-white">{selected360User.transactions_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ordens:</span>
                      <span className="text-white">{selected360User.orders_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Investimentos:</span>
                      <span className="text-white">{selected360User.investments_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tickets:</span>
                      <span className="text-white">{selected360User.tickets_count || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Action Buttons */}
              {existingContact?.existing_user && !existingContact?.existing_otc_client && (
                <div className="pt-4 border-t border-zinc-800">
                  <Button
                    onClick={() => { setShow360Modal(false); handleCreateClientDirect(); }}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <Link2 size={16} className="mr-2" />
                    Criar Cliente OTC (Associar a Este Utilizador)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-Qualification Dialog - Step 2 */}
      <Dialog open={showPreQualDialog} onOpenChange={setShowPreQualDialog}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-gold-400 text-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <FileText size={18} className="text-purple-400" />
              </div>
              Pré-Qualificação - {selectedLead?.entity_name}
            </DialogTitle>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">✓</div>
                <span className="text-green-400 text-sm">Dados & Verificação</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-black font-bold text-sm">2</div>
                <span className="text-gold-400 text-sm font-medium">Pré-Qualificação</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-white font-bold text-sm">3</div>
                <span className="text-zinc-400 text-sm">Setup Operacional</span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {/* Client Type */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <User size={14} />
                  Tipo de Cliente *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={preQualData.client_type} onValueChange={(v) => setPreQualData({...preQualData, client_type: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="retail" className="text-white hover:bg-zinc-700">Retalho</SelectItem>
                    <SelectItem value="hnwi" className="text-white hover:bg-zinc-700">HNWI (Alto Património)</SelectItem>
                    <SelectItem value="company" className="text-white hover:bg-zinc-700">Empresa</SelectItem>
                    <SelectItem value="fund_institution" className="text-white hover:bg-zinc-700">Fundo / Instituição</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Expected Volume */}
            <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <DollarSign size={14} />
                  Volume Esperado *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Valor 1ª Operação (USD)</Label>
                    <Input
                      type="number"
                      value={preQualData.first_operation_value}
                      onChange={(e) => setPreQualData({...preQualData, first_operation_value: e.target.value})}
                      placeholder="50000"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Volume Mensal (USD)</Label>
                    <Input
                      type="number"
                      value={preQualData.estimated_monthly_volume}
                      onChange={(e) => setPreQualData({...preQualData, estimated_monthly_volume: e.target.value})}
                      placeholder="200000"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Frequência</Label>
                    <Select value={preQualData.expected_frequency} onValueChange={(v) => setPreQualData({...preQualData, expected_frequency: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="one_shot" className="text-white hover:bg-zinc-700">Única</SelectItem>
                        <SelectItem value="weekly" className="text-white hover:bg-zinc-700">Semanal</SelectItem>
                        <SelectItem value="daily" className="text-white hover:bg-zinc-700">Diária</SelectItem>
                        <SelectItem value="multiple_daily" className="text-white hover:bg-zinc-700">Múltiplas/Dia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operation Objective */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <TrendingUp size={14} />
                  Objectivo *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={preQualData.operation_objective} onValueChange={(v) => setPreQualData({...preQualData, operation_objective: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="trading" className="text-white hover:bg-zinc-700">Trading</SelectItem>
                    <SelectItem value="treasury" className="text-white hover:bg-zinc-700">Tesouraria</SelectItem>
                    <SelectItem value="arbitrage" className="text-white hover:bg-zinc-700">Arbitragem</SelectItem>
                    <SelectItem value="remittances" className="text-white hover:bg-zinc-700">Remessas</SelectItem>
                    <SelectItem value="otc_b2b" className="text-white hover:bg-zinc-700">OTC B2B</SelectItem>
                    <SelectItem value="other" className="text-white hover:bg-zinc-700">Outras</SelectItem>
                  </SelectContent>
                </Select>
                {preQualData.operation_objective === 'other' && (
                  <Input
                    value={preQualData.operation_objective_detail}
                    onChange={(e) => setPreQualData({...preQualData, operation_objective_detail: e.target.value})}
                    placeholder="Especificar..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                )}
              </CardContent>
            </Card>

            {/* Fund Source */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <Building size={14} />
                  Fonte dos Fundos *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={preQualData.fund_source} onValueChange={(v) => setPreQualData({...preQualData, fund_source: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="income" className="text-white hover:bg-zinc-700">Rendimentos</SelectItem>
                    <SelectItem value="company" className="text-white hover:bg-zinc-700">Empresa</SelectItem>
                    <SelectItem value="crypto_holdings" className="text-white hover:bg-zinc-700">Crypto Holdings</SelectItem>
                    <SelectItem value="asset_sale" className="text-white hover:bg-zinc-700">Venda de Ativos</SelectItem>
                    <SelectItem value="inheritance" className="text-white hover:bg-zinc-700">Herança</SelectItem>
                    <SelectItem value="investment_returns" className="text-white hover:bg-zinc-700">Investimentos</SelectItem>
                    <SelectItem value="other" className="text-white hover:bg-zinc-700">Outros</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={preQualData.fund_source_detail}
                  onChange={(e) => setPreQualData({...preQualData, fund_source_detail: e.target.value})}
                  placeholder="Detalhes adicionais..."
                  className="bg-zinc-800 border-zinc-700 text-white text-sm"
                />
              </CardContent>
            </Card>

            {/* Settlement Channel */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <CreditCard size={14} />
                  Canal Liquidação *
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Select value={preQualData.settlement_channel} onValueChange={(v) => setPreQualData({...preQualData, settlement_channel: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="bank_transfer" className="text-white hover:bg-zinc-700">Transf. Bancária</SelectItem>
                    <SelectItem value="stablecoins" className="text-white hover:bg-zinc-700">Stablecoins</SelectItem>
                    <SelectItem value="on_chain" className="text-white hover:bg-zinc-700">On-Chain</SelectItem>
                    <SelectItem value="off_chain" className="text-white hover:bg-zinc-700">Off-Chain</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-gray-400 text-xs">Jurisdição Bancária</Label>
                  <Input
                    value={preQualData.bank_jurisdiction}
                    onChange={(e) => setPreQualData({...preQualData, bank_jurisdiction: e.target.value})}
                    placeholder="PT, DE, UK, AE..."
                    className="bg-zinc-800 border-zinc-700 text-white text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Red Flags Section - Interactive Checkboxes */}
          <Card className="bg-red-950/30 border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle size={16} />
                Bandeiras Vermelhas (Marque se detectar)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 'high_risk_country', label: 'País de Alto Risco (FATF)' },
                  { value: 'incompatible_activities', label: 'Actividades Incompatíveis' },
                  { value: 'excessive_urgency', label: 'Pressa Excessiva' },
                  { value: 'unable_to_justify_funds', label: 'Incapaz Justificar Fundos' },
                  { value: 'inconsistent_answers', label: 'Respostas Inconsistentes' },
                  { value: 'pep_exposure', label: 'Exposição PEP' },
                ].map((flag) => (
                  <label key={flag.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-red-900/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={(preQualData.red_flags || []).includes(flag.value)}
                      onChange={(e) => {
                        const flags = preQualData.red_flags || [];
                        if (e.target.checked) {
                          setPreQualData({...preQualData, red_flags: [...flags, flag.value]});
                        } else {
                          setPreQualData({...preQualData, red_flags: flags.filter(f => f !== flag.value)});
                        }
                      }}
                      className="w-4 h-4 rounded border-red-500/50 bg-zinc-800 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-red-200 text-sm">{flag.label}</span>
                  </label>
                ))}
              </div>
              {(preQualData.red_flags || []).length > 0 && (
                <div className="mt-3">
                  <Label className="text-red-300 text-xs">Notas sobre Red Flags</Label>
                  <Textarea
                    value={preQualData.red_flags_notes || ''}
                    onChange={(e) => setPreQualData({...preQualData, red_flags_notes: e.target.value})}
                    placeholder="Detalhes sobre as bandeiras vermelhas detectadas..."
                    className="bg-zinc-900 border-red-500/30 text-white mt-1"
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="mt-4">
            <Label className="text-gray-400 text-sm">Notas Adicionais</Label>
            <Textarea
              value={preQualData.notes}
              onChange={(e) => setPreQualData({...preQualData, notes: e.target.value})}
              placeholder="Outras observações sobre a pré-qualificação..."
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
              rows={2}
            />
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowPreQualDialog(false)} className="border-zinc-700 text-gray-300">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitPreQual}
              className="bg-gold-500 text-black hover:bg-gold-600"
              disabled={!preQualData.client_type || !preQualData.fund_source || !preQualData.settlement_channel || !preQualData.operation_objective}
            >
              <CheckCircle size={16} className="mr-2" />
              Submeter Pré-Qualificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operational Setup Dialog - Step 3 */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <DialogTitle className="text-gold-400 text-xl flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Settings size={18} className="text-cyan-400" />
              </div>
              Setup Operacional - {selectedLead?.entity_name}
            </DialogTitle>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">✓</div>
                <span className="text-green-400 text-sm">Dados & Verificação</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">✓</div>
                <span className="text-green-400 text-sm">Pré-Qualificação</span>
              </div>
              <ChevronRight size={16} className="text-zinc-600" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-black font-bold text-sm">3</div>
                <span className="text-gold-400 text-sm font-medium">Setup Operacional</span>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Access & Manager Section */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                  <UserCheck size={16} />
                  Acesso & Atribuição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Gestor de Conta *</Label>
                    <Select 
                      value={setupData.account_manager_id} 
                      onValueChange={(v) => setSetupData({...setupData, account_manager_id: v})}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Selecionar gestor" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="carlos" className="text-white hover:bg-zinc-700">Carlos Santos (Admin)</SelectItem>
                        <SelectItem value="maria" className="text-white hover:bg-zinc-700">Maria Silva (Manager)</SelectItem>
                        <SelectItem value="joao" className="text-white hover:bg-zinc-700">João Costa (Trader)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Acesso Portal OTC</Label>
                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setupData.portal_access || false}
                          onChange={(e) => setSetupData({...setupData, portal_access: e.target.checked})}
                          className="w-4 h-4 rounded border-cyan-500/50 bg-zinc-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-white text-sm">Conceder acesso ao Portal OTC</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Limits Section */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-gold-400 text-sm flex items-center gap-2">
                  <DollarSign size={16} />
                  Limites de Trading *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Limite Diário (USD)</Label>
                    <Input
                      type="number"
                      value={setupData.daily_limit}
                      onChange={(e) => setSetupData({...setupData, daily_limit: e.target.value})}
                      placeholder="100000"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    <p className="text-xs text-gray-500">Máximo por dia em operações OTC</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Limite Mensal (USD)</Label>
                    <Input
                      type="number"
                      value={setupData.monthly_limit}
                      onChange={(e) => setSetupData({...setupData, monthly_limit: e.target.value})}
                      placeholder="1000000"
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    <p className="text-xs text-gray-500">Volume máximo mensal permitido</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settlement Section */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-400 text-sm flex items-center gap-2">
                  <CreditCard size={16} />
                  Método de Liquidação *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Método Principal</Label>
                    <Select value={setupData.settlement_method} onValueChange={(v) => setSetupData({...setupData, settlement_method: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Selecionar método" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="sepa" className="text-white hover:bg-zinc-700">SEPA (EUR)</SelectItem>
                        <SelectItem value="swift" className="text-white hover:bg-zinc-700">SWIFT (Internacional)</SelectItem>
                        <SelectItem value="pix" className="text-white hover:bg-zinc-700">PIX (Brasil)</SelectItem>
                        <SelectItem value="faster_payments" className="text-white hover:bg-zinc-700">Faster Payments (UK)</SelectItem>
                        <SelectItem value="usdt_trc20" className="text-white hover:bg-zinc-700">USDT TRC-20</SelectItem>
                        <SelectItem value="usdt_erc20" className="text-white hover:bg-zinc-700">USDT ERC-20</SelectItem>
                        <SelectItem value="usdc_erc20" className="text-white hover:bg-zinc-700">USDC ERC-20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Dados Bancários/Wallet</Label>
                    <Input
                      value={setupData.settlement_details || ''}
                      onChange={(e) => setSetupData({...setupData, settlement_details: e.target.value})}
                      placeholder="IBAN, Wallet Address..."
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Communication Section */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-purple-400 text-sm flex items-center gap-2">
                  <Mail size={16} />
                  Canal de Comunicação *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Tipo de Canal</Label>
                    <Select value={setupData.communication_channel_type} onValueChange={(v) => setSetupData({...setupData, communication_channel_type: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="email" className="text-white hover:bg-zinc-700">Email</SelectItem>
                        <SelectItem value="telegram" className="text-white hover:bg-zinc-700">Telegram</SelectItem>
                        <SelectItem value="whatsapp" className="text-white hover:bg-zinc-700">WhatsApp</SelectItem>
                        <SelectItem value="signal" className="text-white hover:bg-zinc-700">Signal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">
                      {setupData.communication_channel_type === 'email' ? 'Email' : 
                       setupData.communication_channel_type === 'telegram' ? 'Username/Group ID' :
                       setupData.communication_channel_type === 'whatsapp' ? 'Número WhatsApp' : 'Contacto'}
                    </Label>
                    <Input
                      value={setupData.communication_channel_id || ''}
                      onChange={(e) => setSetupData({...setupData, communication_channel_id: e.target.value})}
                      placeholder={
                        setupData.communication_channel_type === 'email' ? 'email@empresa.com' :
                        setupData.communication_channel_type === 'telegram' ? '@username ou -123456789' :
                        setupData.communication_channel_type === 'whatsapp' ? '+351 912 345 678' : 'Contacto'
                      }
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div>
              <Label className="text-gray-400 text-sm">Notas do Setup</Label>
              <Textarea
                value={setupData.notes}
                onChange={(e) => setSetupData({...setupData, notes: e.target.value})}
                placeholder="Instruções especiais, horários preferenciais de contacto, etc..."
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button variant="outline" onClick={() => setShowSetupDialog(false)} className="border-zinc-700 text-gray-300">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitSetup}
              className="bg-gold-500 text-black hover:bg-gold-600"
              disabled={!setupData.daily_limit || !setupData.monthly_limit || !setupData.settlement_method || !setupData.account_manager_id}
            >
              <CheckCircle size={16} className="mr-2" />
              Completar Setup & Activar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OTCLeads;
