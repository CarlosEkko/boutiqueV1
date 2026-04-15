import React from 'react';
import { useOTCLeads } from './hooks/useOTCLeads';
import { LeadCard } from './components/LeadCard';
import { CreateLeadDialog } from './components/CreateLeadDialog';
import LeadDetailDialog from './components/LeadDetailDialog';
import PreQualDialog from './components/PreQualDialog';
import SetupDialog from './components/SetupDialog';
import NewDealDialog from './components/NewDealDialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { UserPlus, Search, Plus, RefreshCw } from 'lucide-react';
import ScheduleMeetingDialog from '../components/ScheduleMeetingDialog';
import { useLanguage } from '../../../i18n';

const OTCLeads = () => {
  const hook = useOTCLeads();
  const { t } = useLanguage();
  const [meetingLead, setMeetingLead] = React.useState(null);
  const [showMeetingDialog, setShowMeetingDialog] = React.useState(false);
  const {
    leads, enums, loading, total, searchQuery, statusFilter,
    selectedLead, formData, preQualData, setupData, teamMembers,
    newDealClient, newDealData, existingContact, checkingContact, showExistingWarning,
    workflowEnums, existingEntities,
    showCreateDialog, showDetailDialog, showPreQualDialog, showSetupDialog,
    showNewDealModal,
    setSearchQuery, setStatusFilter, setSelectedLead,
    setFormData, setPreQualData, setSetupData, setNewDealData,
    setShowCreateDialog, setShowDetailDialog, setShowPreQualDialog,
    setShowSetupDialog, setShowNewDealModal,
    setExistingContact, setShowExistingWarning,
    fetchLeads, handleSubmitPreQual, handleSubmitSetup,
    handleAdvanceToKYC, handleApproveKYC, handlePreQualify,
    handleConvertToClient, handleDeleteLead, handleArchiveLead,
    handleCreateLead, handleTrustfullScan, handleCreateClientDirect,
    checkExistingContact, createDeal, resetForm, fetchEntities,
    openPreQual, openSetup, openNewDeal, openDetail,
    isSubmitting, handleUpdateLead,
  } = hook;

  const getStatusBadge = (status) => {
    const colors = {
      new: 'bg-blue-900/30 text-blue-400', contacted: 'bg-purple-900/30 text-purple-400',
      pre_qualified: 'bg-gold-900/30 text-gold-400', not_qualified: 'bg-gray-900/30 text-gray-400',
      kyc_pending: 'bg-yellow-900/30 text-yellow-400', kyc_approved: 'bg-green-900/30 text-green-400',
      active_client: 'bg-green-900/30 text-green-400', lost: 'bg-red-900/30 text-red-400',
      setup_complete: 'bg-emerald-900/30 text-emerald-400',
      archived: 'bg-zinc-900/30 text-zinc-400',
    };
    return <Badge className={colors[status] || 'bg-gray-900/30 text-gray-400'}>{t(`otc.statusLabels.${status}`) || status}</Badge>;
  };

  const STATUS_TABS = [
    { key: 'new', label: 'Novo', active: 'bg-amber-500/20 text-amber-400 border border-amber-500/40' },
    { key: 'contacted', label: 'Contactado', active: 'bg-blue-500/20 text-blue-400 border border-blue-500/40' },
    { key: 'pre_qualified', label: 'Pre-Qualificado', active: 'bg-purple-500/20 text-purple-400 border border-purple-500/40' },
    { key: 'kyc_pending', label: 'KYC Pendente', active: 'bg-orange-500/20 text-orange-400 border border-orange-500/40' },
    { key: 'kyc_approved', label: 'KYC Aprovado', active: 'bg-teal-500/20 text-teal-400 border border-teal-500/40' },
    { key: 'setup_pending', label: 'Setup Pend.', active: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' },
    { key: 'setup_complete', label: 'Setup Completo', active: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' },
    { key: 'not_qualified', label: 'Nao Qualif.', active: 'bg-red-500/20 text-red-400 border border-red-500/40' },
    { key: 'all', label: 'Todos', active: 'bg-zinc-700 text-white' },
  ];

  return (
    <div className="space-y-8" data-testid="otc-leads-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">OTC Desk</p>
          <h1 className="text-3xl text-zinc-50 font-light">Leads</h1>
          <p className="text-zinc-500 text-sm mt-1">{total} leads no pipeline</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6" data-testid="new-lead-btn">
          <Plus size={16} className="mr-2" /> Novo Lead
        </Button>
      </div>

      {/* Status Tabs + Search */}
      <div className="flex flex-col gap-6">
        <div className="flex gap-2 items-center flex-wrap">
          {STATUS_TABS.map(tab => {
            const count = tab.key === 'all' ? total : leads.filter(l => l.status === tab.key).length;
            return (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === tab.key ? tab.active : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                data-testid={`otc-tab-${tab.key}`}>
                {tab.label}<span className="ml-1.5 text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLeads()}
              placeholder="Pesquisar leads..." className="bg-zinc-900 border-zinc-800 text-white pl-10" data-testid="otc-search" />
          </div>
          <Button variant="ghost" onClick={fetchLeads} className="text-zinc-400 hover:text-white"><RefreshCw size={16} /></Button>
        </div>
      </div>

      {/* Lead Cards */}
      <div className="mt-2">
        {loading ? (
          <div className="text-center py-12 text-zinc-600">A carregar...</div>
        ) : leads.length === 0 ? (
          <div className="border border-zinc-800 rounded-xl bg-zinc-900/50 py-20 text-center">
            <UserPlus size={40} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-400 text-base">Nenhum lead encontrado</p>
            <p className="text-zinc-600 text-sm mt-1">Crie o primeiro lead para comecar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} t={t}
                onClick={() => openDetail(lead)} onPreQual={openPreQual} onSetup={openSetup}
                onConvert={handleConvertToClient} onDelete={handleDeleteLead}
                onAdvanceKYC={handleAdvanceToKYC} onApproveKYC={handleApproveKYC} />
            ))}
          </div>
        )}
      </div>

      {/* ===== DIALOGS ===== */}
      <CreateLeadDialog
        open={showCreateDialog} onOpenChange={setShowCreateDialog}
        formData={formData} setFormData={setFormData} enums={enums}
        showExistingWarning={showExistingWarning} existingContact={existingContact}
        checkingContact={checkingContact} checkExistingContact={checkExistingContact}
        handleCreateLead={handleCreateLead} handleCreateClientDirect={handleCreateClientDirect}
        setShowExistingWarning={setShowExistingWarning} setExistingContact={setExistingContact}
        resetForm={resetForm} openNewDeal={openNewDeal} openDetail={openDetail}
        isSubmitting={isSubmitting}
        existingEntities={existingEntities} fetchEntities={fetchEntities}
      />

      <LeadDetailDialog
        open={showDetailDialog} onOpenChange={setShowDetailDialog}
        selectedLead={selectedLead} setSelectedLead={setSelectedLead} t={t}
        getStatusBadge={getStatusBadge}
        onPreQual={openPreQual} onSetup={openSetup} onConvert={handleConvertToClient}
        onDelete={handleDeleteLead} onArchive={handleArchiveLead}
        onAdvanceKYC={handleAdvanceToKYC} onApproveKYC={handleApproveKYC}
        onPreQualify={handlePreQualify} onTrustfullScan={handleTrustfullScan}
        onUpdateLead={handleUpdateLead}
        onScheduleMeeting={(lead) => { setMeetingLead(lead); setShowMeetingDialog(true); }}
      />

      <PreQualDialog
        open={showPreQualDialog} onOpenChange={setShowPreQualDialog}
        selectedLead={selectedLead} preQualData={preQualData}
        setPreQualData={setPreQualData} onSubmit={handleSubmitPreQual}
      />

      <SetupDialog
        open={showSetupDialog} onOpenChange={setShowSetupDialog}
        selectedLead={selectedLead} setupData={setupData}
        setSetupData={setSetupData} teamMembers={teamMembers}
        onSubmit={handleSubmitSetup}
      />

      <NewDealDialog
        open={showNewDealModal} onOpenChange={setShowNewDealModal}
        client={newDealClient} dealData={newDealData}
        setDealData={setNewDealData} onCreateDeal={createDeal} t={t}
      />

      <ScheduleMeetingDialog
        open={showMeetingDialog} onClose={() => setShowMeetingDialog(false)}
        lead={meetingLead} leadType="otc"
      />
    </div>
  );
};

export default OTCLeads;
