import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../context/AuthContext';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const INITIAL_FORM = {
  entity_name: '', contact_name: '', contact_email: '', contact_phone: '',
  country: '', source: 'website', estimated_volume_usd: '', target_asset: 'BTC',
  transaction_type: 'buy', trading_frequency: 'one_shot', volume_per_operation: '',
  execution_timeframe: 'flexible', preferred_settlement_methods: [],
  current_exchange: '', problem_to_solve: '', notes: '', potential_tier: '',
};

const INITIAL_PREQUAL = {
  client_type: '', first_operation_value: '', expected_frequency: '',
  estimated_monthly_volume: '', operation_objective: '', operation_objective_detail: '',
  fund_source: '', fund_source_detail: '', settlement_channel: '',
  bank_jurisdiction: '', notes: '', red_flags_notes: '',
};

const INITIAL_SETUP = {
  daily_limit: '', monthly_limit: '', settlement_method: '',
  account_manager_id: '', communication_channel_type: 'email', notes: '',
};

const INITIAL_DEAL = {
  transaction_type: 'buy', base_asset: 'BTC', quote_asset: 'EUR',
  amount: '', settlement_method: '', notes: '',
};

export const useOTCLeads = () => {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}` };

  // Core state
  const [leads, setLeads] = useState([]);
  const [enums, setEnums] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);
  const [workflowEnums, setWorkflowEnums] = useState(null);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showPreQualDialog, setShowPreQualDialog] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [show360Modal, setShow360Modal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // Existing contact check
  const [existingContact, setExistingContact] = useState(null);
  const [checkingContact, setCheckingContact] = useState(false);
  const [showExistingWarning, setShowExistingWarning] = useState(false);
  const [selected360User, setSelected360User] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [preQualData, setPreQualData] = useState(INITIAL_PREQUAL);
  const [setupData, setSetupData] = useState(INITIAL_SETUP);
  const [newDealClient, setNewDealClient] = useState(null);
  const [newDealData, setNewDealData] = useState(INITIAL_DEAL);

  useEffect(() => {
    fetchEnums();
    fetchWorkflowEnums();
    fetchLeads();
    fetchTeamMembers();
  }, [token, statusFilter, sourceFilter]);

  // ==================== FETCH ====================
  const fetchEnums = async () => {
    try { const r = await axios.get(`${API_URL}/api/otc/stats/enums`, { headers }); setEnums(r.data); }
    catch (e) { console.error('Failed to fetch enums:', e); }
  };

  const fetchWorkflowEnums = async () => {
    try { const r = await axios.get(`${API_URL}/api/otc/workflow/stages`, { headers }); setWorkflowEnums(r.data); }
    catch (e) { console.error('Failed to fetch workflow enums:', e); }
  };

  const fetchTeamMembers = async () => {
    try {
      const r = await axios.get(`${API_URL}/api/admin/internal-users`, { headers });
      const users = r.data || [];
      setTeamMembers(users);
    } catch (e) { console.error('Failed to fetch team members:', e); }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/otc/leads?limit=50`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (sourceFilter !== 'all') url += `&source=${sourceFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const r = await axios.get(url, { headers });
      setLeads(r.data.leads || []);
      setTotal(r.data.total || 0);
    } catch (e) {
      console.error('Failed to fetch leads:', e);
      toast.error('Erro ao carregar leads');
    } finally { setLoading(false); }
  };

  // ==================== ACTIONS ====================
  const handleVerifyClient = async (leadId) => {
    try {
      const r = await axios.post(`${API_URL}/api/otc/leads/${leadId}/verify-client`, {}, { headers });
      setVerificationResult(r.data);
      toast.success(r.data.message);
      fetchLeads();
      return r.data;
    } catch (e) { toast.error('Erro ao verificar cliente'); return null; }
  };

  const handleSendOnboardingEmail = async (leadId) => {
    try {
      const r = await axios.post(`${API_URL}/api/otc/leads/${leadId}/send-onboarding-email`, {}, { headers });
      r.data.simulated ? toast.info('Email simulado (Brevo não configurado)') : toast.success('Email de onboarding enviado!');
      fetchLeads();
    } catch (e) { toast.error('Erro ao enviar email'); }
  };

  const handleSubmitPreQual = async () => {
    if (!selectedLead) return;
    try {
      const payload = {
        ...preQualData,
        first_operation_value: parseFloat(String(preQualData.first_operation_value).replace(/\s/g, '')) || 0,
        estimated_monthly_volume: parseFloat(String(preQualData.estimated_monthly_volume).replace(/\s/g, '')) || 0,
      };
      const r = await axios.post(`${API_URL}/api/otc/leads/${selectedLead.id}/pre-qualification`, payload, { headers });
      toast.success('Pré-qualificação submetida!');
      if (r.data.red_flags_detected?.length > 0) toast.warning(`Red flags: ${r.data.red_flags_detected.join(', ')}`);
      setShowPreQualDialog(false);
      fetchLeads();
    } catch (e) { toast.error('Erro ao submeter pré-qualificação'); }
  };

  const handleSubmitSetup = async () => {
    if (!selectedLead) return;
    try {
      const payload = {
        ...setupData,
        daily_limit: parseFloat(String(setupData.daily_limit).replace(/\s/g, '')) || 0,
        monthly_limit: parseFloat(String(setupData.monthly_limit).replace(/\s/g, '')) || 0,
      };
      await axios.post(`${API_URL}/api/otc/leads/${selectedLead.id}/operational-setup`, payload, { headers });
      toast.success('Setup operacional completo!');
      setShowSetupDialog(false);
      fetchLeads();
    } catch (e) { toast.error('Erro ao submeter setup operacional'); }
  };

  const handleAddRedFlag = async (leadId, flagType, notes) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/add-red-flag?flag_type=${flagType}&notes=${encodeURIComponent(notes || '')}`, {}, { headers });
      toast.success('Red flag adicionada');
      fetchLeads();
    } catch (e) { toast.error('Erro ao adicionar red flag'); }
  };

  const handleAdvanceToKYC = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/advance-to-kyc`, {}, { headers });
      toast.success('Lead avançado para KYC');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao avançar para KYC'); }
  };

  const handleApproveKYC = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/approve-kyc`, {}, { headers });
      toast.success('KYC aprovado!');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao aprovar KYC'); }
  };

  const handlePreQualify = async (leadId, qualified) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/pre-qualify?qualified=${qualified}`, {}, { headers });
      toast.success(qualified ? 'Lead qualificado' : 'Lead marcado como não qualificado');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (e) { toast.error('Erro ao atualizar lead'); }
  };

  const handleConvertToClient = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/convert-to-client`, {}, { headers });
      toast.success('Lead convertido para cliente OTC!');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao converter para cliente'); }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Tem certeza que deseja eliminar este lead?')) return;
    try {
      await axios.delete(`${API_URL}/api/otc/leads/${leadId}`, { headers });
      toast.success('Lead eliminado com sucesso');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao eliminar lead'); }
  };

  const handleArchiveLead = async (leadId) => {
    try {
      await axios.post(`${API_URL}/api/otc/leads/${leadId}/archive`, {}, { headers });
      toast.success('Lead arquivado com sucesso');
      fetchLeads();
      setShowDetailDialog(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao arquivar lead'); }
  };

  const handleCreateLead = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        estimated_volume_usd: parseFloat(String(formData.estimated_volume_usd).replace(/\s/g, '')) || 0,
        volume_per_operation: formData.volume_per_operation ? parseFloat(String(formData.volume_per_operation).replace(/\s/g, '')) : null,
        potential_tier: formData.potential_tier || null,
      };
      await axios.post(`${API_URL}/api/otc/leads`, payload, { headers });
      toast.success('Lead criado com sucesso');
      setShowCreateDialog(false);
      setShowExistingWarning(false);
      resetForm();
      fetchLeads();
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail.map(d => d.msg || d.message || String(d)).join(', '));
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Erro ao criar lead');
      }
    } finally { setIsSubmitting(false); }
  };

  const handleTrustfullScan = async (leadId) => {
    try {
      toast.info('A analisar Risk Intelligence...');
      const r = await axios.post(`${API_URL}/api/otc/leads/${leadId}/risk-scan`, {}, { headers });
      toast.success('Risk Intelligence completo');
      fetchLeads();
      return r.data.risk_intelligence_data;
    } catch (e) { toast.error('Erro no Risk Intelligence scan'); return null; }
  };

  const checkExistingContact = async (field, value) => {
    if (!value || value.length < 3) return;
    setCheckingContact(true);
    try {
      const params = new URLSearchParams();
      if (field === 'email') params.append('email', value);
      if (field === 'entity_name') params.append('entity_name', value);
      if (field === 'contact_name') params.append('contact_name', value);
      const r = await axios.get(`${API_URL}/api/otc/check-existing?${params.toString()}`, { headers });
      const data = r.data;
      if (data.existing_otc_client || data.existing_user || data.existing_lead) {
        setExistingContact(data);
        setShowExistingWarning(true);
      }
    } catch (e) { console.error('Check existing failed:', e); }
    finally { setCheckingContact(false); }
  };

  const handleCreateClientDirect = async () => {
    if (!existingContact?.existing_user) return;
    try {
      const user = existingContact.existing_user;
      const params = new URLSearchParams({
        entity_name: formData.entity_name || user.company_name || `${user.first_name} ${user.last_name}`,
        contact_name: formData.contact_name || `${user.first_name} ${user.last_name}`,
        contact_email: user.email, country: formData.country || 'Portugal', user_id: user.id,
      });
      if (formData.contact_phone) params.append('contact_phone', formData.contact_phone);
      await axios.post(`${API_URL}/api/otc/clients/create-direct?${params.toString()}`, {}, { headers });
      toast.success('Cliente OTC criado com sucesso!');
      setShowCreateDialog(false);
      setShowExistingWarning(false);
      setExistingContact(null);
      resetForm();
      fetchLeads();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao criar cliente'); }
  };

  const createDeal = async () => {
    if (!newDealClient?.id || !newDealData.amount) { toast.error('Preencha o valor da operação'); return; }
    try {
      await axios.post(`${API_URL}/api/otc/deals`, {
        client_id: newDealClient.id, transaction_type: newDealData.transaction_type,
        base_asset: newDealData.base_asset, quote_asset: newDealData.quote_asset,
        amount: parseFloat(String(newDealData.amount).replace(/\s/g, '')),
        settlement_method: newDealData.settlement_method || null,
        notes: newDealData.notes || null,
      }, { headers });
      toast.success('Operação criada com sucesso!');
      setShowNewDealModal(false);
      setShowCreateDialog(false);
      setShowExistingWarning(false);
    } catch (e) { toast.error(e.response?.data?.detail || 'Erro ao criar operação'); }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setExistingContact(null);
    setShowExistingWarning(false);
  };

  const handleUpdateLead = async (leadId, updateData) => {
    try {
      // Clean numeric values
      const payload = { ...updateData };
      if (payload.estimated_volume_usd !== undefined) {
        payload.estimated_volume_usd = parseFloat(String(payload.estimated_volume_usd).replace(/\s/g, '')) || 0;
      }
      if (payload.volume_per_operation !== undefined) {
        payload.volume_per_operation = payload.volume_per_operation ? parseFloat(String(payload.volume_per_operation).replace(/\s/g, '')) : null;
      }
      const r = await axios.put(`${API_URL}/api/otc/leads/${leadId}`, payload, { headers });
      if (r.data.otc_client_created) {
        toast.success('Cliente OTC criado automaticamente!');
      } else {
        toast.success('Lead atualizado com sucesso');
      }
      fetchLeads();
      if (r.data.lead) setSelectedLead(r.data.lead);
      return r.data;
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erro ao atualizar lead');
      return null;
    }
  };

  const openPreQual = (lead) => {
    setSelectedLead(lead);
    setPreQualData({
      ...INITIAL_PREQUAL,
      first_operation_value: lead.volume_per_operation || '',
      expected_frequency: lead.trading_frequency || '',
      estimated_monthly_volume: lead.estimated_volume_usd || '',
    });
    setShowPreQualDialog(true);
  };

  const openSetup = (lead) => {
    setSelectedLead(lead);
    setSetupData({
      daily_limit: lead.daily_limit_set || '100000',
      monthly_limit: lead.monthly_limit_set || '1000000',
      settlement_method: lead.settlement_method_defined || '',
      account_manager_id: lead.assigned_to || '',
      communication_channel_type: lead.communication_channel_type || 'email',
      notes: '',
    });
    setShowSetupDialog(true);
  };

  const openNewDeal = (client) => {
    setNewDealClient(client);
    setNewDealData({ ...INITIAL_DEAL, settlement_method: client?.default_settlement_method || '' });
    setShowNewDealModal(true);
  };

  const open360View = (contact) => {
    setSelected360User(contact);
    setShow360Modal(true);
  };

  const openDetail = (lead) => {
    setSelectedLead(lead);
    setShowDetailDialog(true);
    setShowCreateDialog(false);
  };

  return {
    // State
    leads, enums, loading, total, searchQuery, statusFilter, sourceFilter,
    teamMembers, workflowEnums, selectedLead, formData, preQualData, setupData,
    newDealClient, newDealData, existingContact, checkingContact, showExistingWarning,
    selected360User, verificationResult, token, isSubmitting,
    // Dialogs
    showCreateDialog, showDetailDialog, showPreQualDialog, showSetupDialog,
    showNewDealModal, show360Modal,
    // Setters
    setSearchQuery, setStatusFilter, setSourceFilter, setSelectedLead,
    setFormData, setPreQualData, setSetupData, setNewDealData,
    setShowCreateDialog, setShowDetailDialog, setShowPreQualDialog,
    setShowSetupDialog, setShowNewDealModal, setShow360Modal,
    setExistingContact, setShowExistingWarning,
    // Actions
    fetchLeads, handleVerifyClient, handleSendOnboardingEmail, handleSubmitPreQual,
    handleSubmitSetup, handleAddRedFlag, handleAdvanceToKYC, handleApproveKYC,
    handlePreQualify, handleConvertToClient, handleDeleteLead, handleArchiveLead,
    handleCreateLead, handleTrustfullScan, handleCreateClientDirect, handleUpdateLead,
    checkExistingContact, createDeal, resetForm,
    openPreQual, openSetup, openNewDeal, open360View, openDetail,
  };
};
