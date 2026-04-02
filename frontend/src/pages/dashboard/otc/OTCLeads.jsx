import React from 'react';
import { useOTCLeads } from './hooks/useOTCLeads';
import { LeadCard } from './components/LeadCard';
import { CreateLeadDialog } from './components/CreateLeadDialog';
import { formatNumber } from '../../../utils/formatters';
import { FormattedNumberInput } from '../../../components/FormattedNumberInput';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  UserPlus, Search, Filter, Plus, Building, Mail, Globe, TrendingUp,
  User, FileText, Settings, DollarSign, CreditCard, CheckCircle, XCircle,
  ChevronRight, Trash2, Archive, UserCheck, RefreshCw, Shield, AlertTriangle, Eye,
  Send, Link, Video, Save, Edit,
} from 'lucide-react';
import ScheduleMeetingDialog from '../components/ScheduleMeetingDialog';

const OTCLeads = () => {
  const hook = useOTCLeads();
  const [meetingLead, setMeetingLead] = React.useState(null);
  const [showMeetingDialog, setShowMeetingDialog] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState({});
  const {
    leads, enums, loading, total, searchQuery, statusFilter, sourceFilter,
    selectedLead, formData, preQualData, setupData, teamMembers,
    newDealClient, newDealData, existingContact, checkingContact, showExistingWarning,
    selected360User, workflowEnums, token,
    showCreateDialog, showDetailDialog, showPreQualDialog, showSetupDialog,
    showNewDealModal, show360Modal,
    setSearchQuery, setStatusFilter, setSourceFilter, setSelectedLead,
    setFormData, setPreQualData, setSetupData, setNewDealData,
    setShowCreateDialog, setShowDetailDialog, setShowPreQualDialog,
    setShowSetupDialog, setShowNewDealModal, setShow360Modal,
    setExistingContact, setShowExistingWarning,
    fetchLeads, handleVerifyClient, handleSendOnboardingEmail, handleSubmitPreQual,
    handleSubmitSetup, handleAddRedFlag, handleAdvanceToKYC, handleApproveKYC,
    handlePreQualify, handleConvertToClient, handleDeleteLead, handleArchiveLead,
    handleCreateLead, handleTrustfullScan, handleCreateClientDirect,
    checkExistingContact, createDeal, resetForm,
    openPreQual, openSetup, openNewDeal, open360View, openDetail,
  } = hook;
  const { isSubmitting, handleUpdateLead } = hook;

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const getStatusBadge = (status) => {
    const colors = {
      new: 'bg-blue-900/30 text-blue-400', contacted: 'bg-purple-900/30 text-purple-400',
      pre_qualified: 'bg-gold-900/30 text-gold-400', not_qualified: 'bg-gray-900/30 text-gray-400',
      kyc_pending: 'bg-yellow-900/30 text-yellow-400', kyc_approved: 'bg-green-900/30 text-green-400',
      active_client: 'bg-green-900/30 text-green-400', lost: 'bg-red-900/30 text-red-400',
      archived: 'bg-zinc-900/30 text-zinc-400',
    };
    const labels = {
      new: 'Novo', contacted: 'Contactado', pre_qualified: 'Pré-Qualificado',
      not_qualified: 'Não Qualificado', kyc_pending: 'KYC Pendente', kyc_approved: 'KYC Aprovado',
      active_client: 'Cliente Ativo', lost: 'Perdido', archived: 'Arquivado',
    };
    return <Badge className={colors[status] || 'bg-gray-900/30 text-gray-400'}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="otc-leads-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white flex items-center gap-3">
            <UserPlus className="text-gold-400" /> OTC Leads
          </h1>
          <p className="text-gray-400 mt-1">{total} leads no pipeline</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="new-lead-btn">
            <Plus size={16} className="mr-2" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <Input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); }} onKeyDown={e => e.key === 'Enter' && fetchLeads()}
            placeholder="Pesquisar leads..." className="pl-10 bg-zinc-800 border-gold-500/20" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-zinc-800 border-gold-500/30">
            <SelectItem value="all" className="text-white hover:bg-zinc-700">Todos</SelectItem>
            {['new', 'contacted', 'pre_qualified', 'not_qualified', 'kyc_pending', 'kyc_approved', 'active_client', 'lost', 'archived'].map(s => (
              <SelectItem key={s} value={s} className="text-white hover:bg-zinc-700 capitalize">{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-48 bg-zinc-800 border-gold-500/30 text-white"><SelectValue placeholder="Fonte" /></SelectTrigger>
          <SelectContent className="bg-zinc-800 border-gold-500/30">
            <SelectItem value="all" className="text-white hover:bg-zinc-700">Todas</SelectItem>
            {enums?.sources?.map(s => <SelectItem key={s} value={s} className="text-white hover:bg-zinc-700 capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lead Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">A carregar leads...</div>
      ) : leads.length === 0 ? (
        <Card className="bg-zinc-900/50 border-gold-500/20">
          <CardContent className="py-16 text-center">
            <UserPlus size={48} className="mx-auto mb-4 text-gold-400/30" />
            <p className="text-gray-400 text-lg">Nenhum lead encontrado</p>
            <p className="text-gray-500 text-sm mt-1">Crie o primeiro lead OTC</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead}
              onVerify={handleVerifyClient} onPreQual={openPreQual}
              onAdvanceKYC={handleAdvanceToKYC} onApproveKYC={handleApproveKYC}
              onSetup={openSetup} onConvert={handleConvertToClient}
              onDetail={openDetail} onDelete={handleDeleteLead}
              onRiskScan={handleTrustfullScan}
              onScheduleMeeting={(lead) => { setMeetingLead(lead); setShowMeetingDialog(true); }}
            />
          ))}
        </div>
      )}

      {/* ===== DIALOGS ===== */}
      <CreateLeadDialog
        open={showCreateDialog} onOpenChange={setShowCreateDialog}
        formData={formData} setFormData={setFormData} enums={enums}
        showExistingWarning={showExistingWarning} existingContact={existingContact}
        checkingContact={checkingContact} checkExistingContact={checkExistingContact}
        handleCreateLead={handleCreateLead} handleCreateClientDirect={handleCreateClientDirect}
        setShowExistingWarning={setShowExistingWarning} setExistingContact={setExistingContact}
        resetForm={resetForm} openNewDeal={openNewDeal} openDetail={openDetail} open360View={open360View}
        isSubmitting={isSubmitting}
      />

      {/* Lead Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={(v) => { setShowDetailDialog(v); if (!v) setIsEditing(false); }}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-800 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-gold-400 flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"><Building size={18} className="text-purple-400" /></div>
                Lead OTC - {selectedLead?.entity_name}
              </DialogTitle>
              {selectedLead && !isEditing && (
                <Button size="sm" variant="outline" className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20" data-testid="edit-lead-btn"
                  onClick={() => { setIsEditing(true); setEditData({ notes: selectedLead.notes || '', preferred_settlement_methods: selectedLead.preferred_settlement_methods || [], potential_tier: selectedLead.potential_tier || '', estimated_volume_usd: selectedLead.estimated_volume_usd || '', volume_per_operation: selectedLead.volume_per_operation || '' }); }}>
                  <Edit size={14} className="mr-1" /> Editar
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-400" onClick={() => setIsEditing(false)}>Cancelar</Button>
                  <Button size="sm" className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="save-lead-btn"
                    onClick={async () => { await handleUpdateLead(selectedLead.id, editData); setIsEditing(false); }}>
                    <Save size={14} className="mr-1" /> Guardar
                  </Button>
                </div>
              )}
            </div>
            {selectedLead && <p className="text-gray-400 text-sm mt-1">{selectedLead.contact_name} - {selectedLead.contact_email}</p>}
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">Status:</span>{getStatusBadge(selectedLead.status)}
                  {selectedLead.potential_tier && <Badge className="bg-gold-900/30 text-gold-400 capitalize">{selectedLead.potential_tier}</Badge>}
                  <Button size="sm" variant="outline" className="ml-auto border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                    onClick={() => { setMeetingLead(selectedLead); setShowMeetingDialog(true); }} data-testid="schedule-meeting-otc-detail">
                    <Video size={14} className="mr-1" /> Agendar Reunião
                  </Button>
                </div>
                <span className="text-gray-500 text-sm">Criado: {new Date(selectedLead.created_at).toLocaleDateString('pt-PT')}</span>
              </div>

              {/* Risk Intelligence */}
              {selectedLead.trustfull_data && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-white flex items-center gap-2"><Shield size={16} className="text-blue-400" />Risk Intelligence</h4>
                      <button onClick={async () => { const d = await handleTrustfullScan(selectedLead.id); if (d) setSelectedLead({...selectedLead, trustfull_data: d}); }}
                        className="text-xs text-gray-500 hover:text-blue-400 flex items-center gap-1" data-testid="rescan-risk"><RefreshCw size={12} /> Re-scan</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <p className="text-gray-500 text-[10px] uppercase mb-1">Score Global</p>
                        <p className={`text-2xl font-mono font-bold ${(selectedLead.trustfull_data.combined_score||0) >= 700 ? 'text-green-400' : (selectedLead.trustfull_data.combined_score||0) >= 500 ? 'text-emerald-400' : (selectedLead.trustfull_data.combined_score||0) >= 300 ? 'text-yellow-400' : (selectedLead.trustfull_data.combined_score||0) >= 150 ? 'text-orange-400' : 'text-red-400'}`}>{selectedLead.trustfull_data.combined_score ?? '—'}</p>
                        <p className="text-gray-500 text-[10px] capitalize">{selectedLead.trustfull_data.risk_level || ''}</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <p className="text-gray-500 text-[10px] uppercase mb-1">Email</p>
                        <p className="text-xl font-mono text-white">{selectedLead.trustfull_data.email_risk?.score ?? '—'}</p>
                        <p className="text-gray-500 text-[10px] capitalize">{selectedLead.trustfull_data.email_risk?.score_cluster || ''}</p>
                      </div>
                      <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <p className="text-gray-500 text-[10px] uppercase mb-1">Telefone</p>
                        <p className="text-xl font-mono text-white">{selectedLead.trustfull_data.phone_risk?.score ?? '—'}</p>
                        <p className="text-gray-500 text-[10px] capitalize">{selectedLead.trustfull_data.phone_risk?.score_cluster || ''}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      {selectedLead.trustfull_data.email_risk?.status && <div className="flex justify-between"><span className="text-gray-500">Email Status:</span><span className="text-white capitalize">{selectedLead.trustfull_data.email_risk.status}</span></div>}
                      {selectedLead.trustfull_data.email_risk?.is_disposable != null && <div className="flex justify-between"><span className="text-gray-500">Descartável:</span><span className={selectedLead.trustfull_data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{selectedLead.trustfull_data.email_risk.is_disposable ? 'Sim' : 'Não'}</span></div>}
                      {selectedLead.trustfull_data.email_risk?.has_linkedin != null && <div className="flex justify-between"><span className="text-gray-500">LinkedIn:</span><span className={selectedLead.trustfull_data.email_risk.has_linkedin ? 'text-green-400' : 'text-gray-500'}>{selectedLead.trustfull_data.email_risk.has_linkedin ? 'Sim' : 'Não'}</span></div>}
                      {selectedLead.trustfull_data.email_risk?.company_name && <div className="flex justify-between"><span className="text-gray-500">Empresa:</span><span className="text-white">{selectedLead.trustfull_data.email_risk.company_name}</span></div>}
                      {selectedLead.trustfull_data.email_risk?.data_breaches_count != null && <div className="flex justify-between"><span className="text-gray-500">Data Breaches:</span><span className={selectedLead.trustfull_data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{selectedLead.trustfull_data.email_risk.data_breaches_count}</span></div>}
                      {selectedLead.trustfull_data.phone_risk?.has_whatsapp != null && <div className="flex justify-between"><span className="text-gray-500">WhatsApp:</span><span className={selectedLead.trustfull_data.phone_risk.has_whatsapp ? 'text-green-400' : 'text-gray-500'}>{selectedLead.trustfull_data.phone_risk.has_whatsapp ? 'Sim' : 'Não'}</span></div>}
                      {selectedLead.trustfull_data.phone_risk?.number_type && <div className="flex justify-between"><span className="text-gray-500">Tipo Telefone:</span><span className={selectedLead.trustfull_data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{selectedLead.trustfull_data.phone_risk.number_type}</span></div>}
                      {selectedLead.trustfull_data.phone_risk?.current_network && <div className="flex justify-between"><span className="text-gray-500">Operadora:</span><span className="text-white">{selectedLead.trustfull_data.phone_risk.current_network}</span></div>}
                    </div>
                    {selectedLead.trustfull_data.red_flags?.length > 0 && (
                      <div className="mt-3 p-2 bg-red-950/30 border border-red-900/30 rounded-lg">
                        <p className="text-red-400 text-xs font-medium mb-1">Red Flags:</p>
                        <div className="flex flex-wrap gap-1">{selectedLead.trustfull_data.red_flags.map((f, i) => <Badge key={i} className="bg-red-900/40 text-red-400 text-[10px]">{f}</Badge>)}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><User size={16} />Informação de Contacto</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between"><span className="text-gray-400">Nome:</span><span className="text-white">{selectedLead.contact_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Email:</span><span className="text-white">{selectedLead.contact_email}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Telefone:</span><span className="text-white">{selectedLead.contact_phone || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">País:</span><span className="text-white">{selectedLead.country || '-'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400">Origem:</span><Badge className="bg-zinc-800 text-gray-300 capitalize">{selectedLead.source?.replace('_', ' ')}</Badge></div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><TrendingUp size={16} />Perfil de Trading</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <>
                        <div><Label className="text-gray-400 text-sm">Volume Total (USD)</Label>
                          <FormattedNumberInput value={editData.estimated_volume_usd} onChange={v => setEditData({...editData, estimated_volume_usd: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="1 000 000" data-testid="edit-volume" />
                        </div>
                        <div><Label className="text-gray-400 text-sm">Por Operação (USD)</Label>
                          <FormattedNumberInput value={editData.volume_per_operation} onChange={v => setEditData({...editData, volume_per_operation: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="500 000" data-testid="edit-vol-per-op" />
                        </div>
                        <div><Label className="text-gray-400 text-sm">Tier Potencial</Label>
                          <Select value={editData.potential_tier} onValueChange={v => setEditData({...editData, potential_tier: v})}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="edit-tier"><SelectValue placeholder="Selecionar tier" /></SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                              <SelectItem value="standard" className="text-white">Standard</SelectItem>
                              <SelectItem value="premium" className="text-white">Premium</SelectItem>
                              <SelectItem value="vip" className="text-white">VIP</SelectItem>
                              <SelectItem value="institutional" className="text-white">Institucional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between"><span className="text-gray-400">Volume Total:</span><span className="text-gold-400 font-mono font-medium">${formatNumber(selectedLead.estimated_volume_usd || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Por Operação:</span><span className="text-white font-mono">${formatNumber(selectedLead.volume_per_operation || 0)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Tier:</span><span className="text-gold-400 capitalize">{selectedLead.potential_tier || '-'}</span></div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-gray-400">Asset:</span><span className="text-white">{selectedLead.target_asset || '-'}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-400">Tipo:</span><Badge className="bg-blue-900/30 text-blue-400 uppercase">{selectedLead.transaction_type || '-'}</Badge></div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><Building size={16} />Liquidação</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <div><Label className="text-gray-400 text-sm">Métodos de Liquidação</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {['sepa', 'swift', 'pix', 'usdt_onchain', 'usdc_onchain', 'crypto_onchain'].map(m => (
                            <Badge key={m} className={`cursor-pointer uppercase text-xs ${(editData.preferred_settlement_methods || []).includes(m) ? 'bg-gold-500/30 text-gold-400 border border-gold-500/50' : 'bg-zinc-800 text-gray-400 border border-zinc-700 hover:border-gold-500/30'}`}
                              onClick={() => {
                                const current = editData.preferred_settlement_methods || [];
                                setEditData({...editData, preferred_settlement_methods: current.includes(m) ? current.filter(x => x !== m) : [...current, m]});
                              }}>{m.replace(/_/g, ' ')}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div><span className="text-gray-400 text-sm">Métodos:</span>
                        <div className="flex flex-wrap gap-1 mt-1">{selectedLead.preferred_settlement_methods?.length > 0 ? selectedLead.preferred_settlement_methods.map((m, i) => <Badge key={i} className="bg-gold-500/20 text-gold-400 uppercase text-xs">{m}</Badge>) : <span className="text-gray-500">N/A</span>}</div>
                      </div>
                    )}
                    <div className="flex justify-between"><span className="text-gray-400">Exchange:</span><span className="text-white">{selectedLead.current_exchange || '-'}</span></div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><FileText size={16} />Notas</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <Textarea value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={4} placeholder="Adicionar notas..." data-testid="edit-notes" />
                    ) : (
                      selectedLead.notes ? <p className="text-white text-sm whitespace-pre-wrap bg-zinc-800/50 p-2 rounded">{selectedLead.notes}</p> : <p className="text-gray-500 text-center py-4">Sem notas</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-800">
                {(selectedLead.status === 'new' || selectedLead.status === 'contacted') && (
                  <div className="flex gap-3">
                    <Button onClick={() => handlePreQualify(selectedLead.id, true)} className="flex-1 bg-green-600 hover:bg-green-500"><CheckCircle size={16} className="mr-2" />Pré-Qualificar</Button>
                    <Button onClick={() => handlePreQualify(selectedLead.id, false)} variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"><XCircle size={16} className="mr-2" />Não Qualificado</Button>
                  </div>
                )}
                {selectedLead.status === 'pre_qualified' && <Button onClick={() => handleAdvanceToKYC(selectedLead.id)} className="w-full bg-gold-500 hover:bg-gold-400 text-black"><ChevronRight size={16} className="mr-2" />Avançar para KYC</Button>}
                {selectedLead.status === 'kyc_pending' && (
                  <div className="flex gap-3">
                    <Button onClick={() => handleApproveKYC(selectedLead.id)} className="flex-1 bg-green-600 hover:bg-green-500"><CheckCircle size={16} className="mr-2" />Aprovar KYC</Button>
                    <Button onClick={() => handlePreQualify(selectedLead.id, false)} variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"><XCircle size={16} className="mr-2" />Rejeitar</Button>
                  </div>
                )}
                {selectedLead.status === 'kyc_approved' && <Button onClick={() => handleConvertToClient(selectedLead.id)} className="w-full bg-gold-500 hover:bg-gold-400 text-black"><UserCheck size={16} className="mr-2" />Converter para Cliente</Button>}
                {selectedLead.status !== 'active_client' && (
                  <div className="flex gap-3 mt-3">
                    <Button onClick={() => handleArchiveLead(selectedLead.id)} variant="outline" className="flex-1 border-gray-600 text-gray-400"><Archive size={16} className="mr-2" />Arquivar</Button>
                    <Button onClick={() => handleDeleteLead(selectedLead.id)} variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"><Trash2 size={16} className="mr-2" />Eliminar</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-Qualification Dialog */}
      <Dialog open={showPreQualDialog} onOpenChange={setShowPreQualDialog}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-gold-400 flex items-center gap-2"><FileText className="text-gold-400" />Pré-Qualificação — {selectedLead?.entity_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-gray-400 text-sm">Tipo de Cliente</Label>
                <Select value={preQualData.client_type} onValueChange={v => setPreQualData({...preQualData, client_type: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white"><SelectItem value="individual" className="text-white">Individual</SelectItem><SelectItem value="corporate" className="text-white">Corporativo</SelectItem><SelectItem value="institutional" className="text-white">Institucional</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-gray-400 text-sm">Valor 1ª Operação (USD)</Label>
                <FormattedNumberInput value={preQualData.first_operation_value} onChange={v => setPreQualData({...preQualData, first_operation_value: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="100 000" data-testid="prequal-first-op" /></div>
              <div><Label className="text-gray-400 text-sm">Volume Mensal Est. (USD)</Label>
                <FormattedNumberInput value={preQualData.estimated_monthly_volume} onChange={v => setPreQualData({...preQualData, estimated_monthly_volume: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="1 000 000" data-testid="prequal-monthly-vol" /></div>
              <div><Label className="text-gray-400 text-sm">Frequência</Label>
                <Select value={preQualData.expected_frequency} onValueChange={v => setPreQualData({...preQualData, expected_frequency: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white"><SelectItem value="one_shot" className="text-white">Única</SelectItem><SelectItem value="weekly" className="text-white">Semanal</SelectItem><SelectItem value="daily" className="text-white">Diário</SelectItem><SelectItem value="multiple_daily" className="text-white">Múltiplas/Dia</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-gray-400 text-sm">Objetivo da Operação</Label><Input value={preQualData.operation_objective} onChange={e => setPreQualData({...preQualData, operation_objective: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="Investimento, Hedge, Trading..." /></div>
            <div><Label className="text-gray-400 text-sm">Origem dos Fundos</Label><Input value={preQualData.fund_source} onChange={e => setPreQualData({...preQualData, fund_source: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="Salário, Venda imóvel, etc." /></div>
            <div><Label className="text-gray-400 text-sm">Jurisdição Bancária</Label><Input value={preQualData.bank_jurisdiction} onChange={e => setPreQualData({...preQualData, bank_jurisdiction: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="Portugal, Suíça, etc." /></div>
            <div><Label className="text-gray-400 text-sm">Notas Red Flags</Label><Textarea value={preQualData.red_flags_notes} onChange={e => setPreQualData({...preQualData, red_flags_notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={2} /></div>
            <div><Label className="text-gray-400 text-sm">Notas</Label><Textarea value={preQualData.notes} onChange={e => setPreQualData({...preQualData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowPreQualDialog(false)}>Cancelar</Button>
            <Button className="bg-gold-500 hover:bg-gold-400 text-black" onClick={handleSubmitPreQual}>Submeter Pré-Qualificação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operational Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-gold-400 flex items-center gap-2"><Settings className="text-gold-400" />Setup Operacional — {selectedLead?.entity_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-gray-400 text-sm">Limite Diário (USD)</Label>
                <FormattedNumberInput value={setupData.daily_limit} onChange={v => setSetupData({...setupData, daily_limit: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="100 000" data-testid="setup-daily-limit" /></div>
              <div><Label className="text-gray-400 text-sm">Limite Mensal (USD)</Label>
                <FormattedNumberInput value={setupData.monthly_limit} onChange={v => setSetupData({...setupData, monthly_limit: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="1 000 000" data-testid="setup-monthly-limit" /></div>
              <div><Label className="text-gray-400 text-sm">Método Liquidação</Label>
                <Select value={setupData.settlement_method} onValueChange={v => setSetupData({...setupData, settlement_method: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white"><SelectItem value="bank_transfer" className="text-white">Transferência Bancária</SelectItem><SelectItem value="crypto" className="text-white">Crypto</SelectItem><SelectItem value="both" className="text-white">Ambos</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-gray-400 text-sm">Account Manager</Label>
                <Select value={setupData.account_manager_id} onValueChange={v => setSetupData({...setupData, account_manager_id: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white hover:bg-zinc-700">{m.name}{m.region ? ` (${m.region})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-gray-400 text-sm">Canal de Comunicação</Label>
              <Select value={setupData.communication_channel_type} onValueChange={v => setSetupData({...setupData, communication_channel_type: v})}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white"><SelectItem value="email" className="text-white">Email</SelectItem><SelectItem value="whatsapp" className="text-white">WhatsApp</SelectItem><SelectItem value="telegram" className="text-white">Telegram</SelectItem><SelectItem value="phone" className="text-white">Telefone</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-gray-400 text-sm">Notas</Label><Textarea value={setupData.notes} onChange={e => setSetupData({...setupData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowSetupDialog(false)}>Cancelar</Button>
            <Button className="bg-gold-500 hover:bg-gold-400 text-black" onClick={handleSubmitSetup}>Guardar Setup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Deal Dialog */}
      <Dialog open={showNewDealModal} onOpenChange={setShowNewDealModal}>
        <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-lg">
          <DialogHeader><DialogTitle className="text-gold-400 flex items-center gap-2"><DollarSign className="text-gold-400" />Nova Operação — {newDealClient?.entity_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-gray-400 text-sm">Tipo</Label>
                <Select value={newDealData.transaction_type} onValueChange={v => setNewDealData({...newDealData, transaction_type: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white"><SelectItem value="buy" className="text-white">Compra</SelectItem><SelectItem value="sell" className="text-white">Venda</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-gray-400 text-sm">Valor (USD)</Label>
                <FormattedNumberInput value={newDealData.amount} onChange={v => setNewDealData({...newDealData, amount: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="100 000" data-testid="deal-amount" /></div>
              <div><Label className="text-gray-400 text-sm">Base</Label>
                <Select value={newDealData.base_asset} onValueChange={v => setNewDealData({...newDealData, base_asset: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">{['BTC', 'ETH', 'USDT', 'USDC', 'SOL'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-gray-400 text-sm">Quote</Label>
                <Select value={newDealData.quote_asset} onValueChange={v => setNewDealData({...newDealData, quote_asset: v})}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">{['EUR', 'USD', 'GBP', 'CHF'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-gray-400 text-sm">Notas</Label><Textarea value={newDealData.notes} onChange={e => setNewDealData({...newDealData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-zinc-600" onClick={() => setShowNewDealModal(false)}>Cancelar</Button>
            <Button className="bg-gold-500 hover:bg-gold-400 text-black" onClick={createDeal}>Criar Operação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Meeting Dialog */}
      <ScheduleMeetingDialog
        open={showMeetingDialog}
        onClose={() => setShowMeetingDialog(false)}
        lead={meetingLead}
        leadType="otc"
      />
    </div>
  );
};

export default OTCLeads;
