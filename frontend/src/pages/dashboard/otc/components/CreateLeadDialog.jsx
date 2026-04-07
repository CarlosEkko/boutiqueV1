import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import { UserPlus, ChevronRight, Building, User, Eye, DollarSign, CheckCircle, Plus, TrendingUp, Loader2, Search, Shield, AlertTriangle } from 'lucide-react';
import { COUNTRIES } from '../../../../utils/countries';
import { useLanguage } from '../../../../i18n';

const TIER_OPTIONS = [
  { value: 'broker', label: 'Broker' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
  { value: 'institutional', label: 'Institucional' },
];

const STEPS = [
  { num: '01', label: 'VERIFICAÇÃO' },
  { num: '02', label: 'PRÉ-QUALIFICAÇÃO' },
  { num: '03', label: 'SETUP' },
];

export const CreateLeadDialog = ({
  open, onOpenChange, formData, setFormData, enums,
  showExistingWarning, existingContact, checkingContact,
  checkExistingContact, handleCreateLead, handleCreateClientDirect,
  setShowExistingWarning, setExistingContact, resetForm,
  openNewDeal, openDetail, open360View, isSubmitting,
  existingEntities = [], fetchEntities,
}) => {
  const { t } = useLanguage();
  const sourceOptions = enums?.sources || ['website', 'referral', 'linkedin', 'event', 'broker', 'cold_outreach', 'existing_client', 'other'];
  const isFormValid = formData.entity_name && formData.contact_name && formData.contact_email && formData.contact_phone;
  
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const entityRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (entityRef.current && !entityRef.current.contains(e.target)) setEntityDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleEntitySearchChange = (val) => {
    setEntitySearch(val);
    setFormData({ ...formData, entity_name: val });
    setEntityDropdownOpen(true);
  };

  const handleSelectEntity = (entity) => {
    setFormData({
      ...formData,
      entity_name: entity.entity_name,
      contact_name: entity.contact_name || formData.contact_name,
      contact_email: entity.contact_email || formData.contact_email,
      contact_phone: entity.contact_phone || formData.contact_phone,
      country: entity.country || formData.country,
    });
    setEntitySearch(entity.entity_name);
    setEntityDropdownOpen(false);
    if (entity.contact_email) checkExistingContact('email', entity.contact_email);
  };

  const filteredEntities = existingEntities.filter(e =>
    !entitySearch || e.entity_name.toLowerCase().includes(entitySearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto p-0 shadow-2xl" data-testid="create-lead-dialog">
        {/* Premium Header */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <UserPlus size={20} className="text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-50" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {t('otc.createLead.title')}
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5 uppercase tracking-[0.2em]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {STEPS[0].num} / 03 · {STEPS[0].label}
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-0">
            <div className="flex-1 h-[2px] bg-amber-500 rounded-full" />
            <div className="flex-1 h-[2px] bg-zinc-800 rounded-full" />
            <div className="flex-1 h-[2px] bg-zinc-800 rounded-full" />
          </div>
        </div>

        <div className="px-8 py-6 space-y-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {/* Existing Contact Warning — Premium Card */}
          {showExistingWarning && existingContact && (
            <div className="rounded-xl border border-amber-500/30 bg-zinc-900 overflow-hidden" data-testid="existing-contact-warning">
              <div className="px-6 py-4 border-b border-amber-500/20 flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <span className="text-amber-500 text-sm font-semibold uppercase tracking-[0.15em]">Contacto Existente</span>
              </div>
              <div className="p-6 space-y-4">
                {existingContact.existing_otc_client && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-emerald-400/10 flex items-center justify-center">
                        <CheckCircle size={20} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-semibold text-sm">Cliente OTC Ativo</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{existingContact.existing_otc_client.entity_name} — {existingContact.existing_otc_client.contact_email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs" onClick={() => openDetail(existingContact.existing_otc_client)}>Detalhes</Button>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-medium" onClick={() => openNewDeal(existingContact.existing_otc_client)}>
                        <Plus size={12} className="mr-1" />Nova Operação
                      </Button>
                    </div>
                  </div>
                )}
                {existingContact.existing_user && !existingContact.existing_otc_client && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-400/5 border border-blue-400/20">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-blue-400/10 flex items-center justify-center">
                        <User size={20} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-blue-400 font-semibold text-sm">Utilizador Registado</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{existingContact.existing_user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs" onClick={() => open360View(existingContact.existing_user)}>Vista 360</Button>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-medium" onClick={handleCreateClientDirect}>
                        <UserPlus size={12} className="mr-1" />Criar OTC
                      </Button>
                    </div>
                  </div>
                )}
                {/* Validation Checklist */}
                {(existingContact.existing_otc_client || existingContact.existing_user) && (
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {[
                      { ok: existingContact.existing_user?.kyc_status === 'approved', label: 'KYC', okText: 'Atualizado', failText: 'Pendente' },
                      { ok: existingContact.existing_user?.is_approved, label: 'Limites', okText: 'Aprovados', failText: 'Pendente' },
                      { ok: true, label: 'Compliance', okText: 'OK', failText: 'Pendente' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-2.5 p-3 rounded-lg border ${item.ok ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-amber-400/20 bg-amber-400/5'}`}>
                        {item.ok 
                          ? <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                          : <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                        }
                        <div>
                          <p className={`text-xs font-medium ${item.ok ? 'text-emerald-400' : 'text-amber-400'}`}>{item.label}</p>
                          <p className="text-zinc-500 text-[10px]">{item.ok ? item.okText : item.failText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {existingContact.existing_lead && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-purple-400/5 border border-purple-400/20">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-purple-400/10 flex items-center justify-center">
                        <TrendingUp size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-purple-400 font-semibold text-sm">Lead Existente</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{existingContact.existing_lead.entity_name} — {existingContact.existing_lead.status}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs" onClick={() => openDetail(existingContact.existing_lead)}>Ver Lead</Button>
                  </div>
                )}
                <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 text-xs mt-2" onClick={() => { setShowExistingWarning(false); setExistingContact(null); }}>
                  Ignorar & Continuar
                </Button>
              </div>
            </div>
          )}

          {/* Entity & Contact — Two Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entity Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 mb-1">
                <Building size={15} className="text-amber-500" />
                <span className="text-xs text-zinc-400 uppercase tracking-[0.15em] font-semibold">Entidade</span>
              </div>
              <div className="space-y-4">
                <div className="relative" ref={entityRef}>
                  <Label className="text-sm text-zinc-400 mb-2 block font-medium">Nome da Entidade *</Label>
                  <div className="relative">
                    <Input
                      value={entitySearch || formData.entity_name}
                      onChange={e => handleEntitySearchChange(e.target.value)}
                      onFocus={() => setEntityDropdownOpen(true)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 pr-10 rounded-md focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                      placeholder="Pesquisar ou criar entidade..."
                      data-testid="lead-entity-name"
                      autoComplete="off"
                    />
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  </div>
                  {entityDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                      {filteredEntities.length > 0 && filteredEntities.map((entity, idx) => (
                        <button key={idx} type="button" className="w-full px-4 py-3 text-left hover:bg-zinc-800/80 flex items-center gap-3 border-b border-zinc-800/50 last:border-0 transition-colors" onClick={() => handleSelectEntity(entity)} data-testid={`entity-option-${idx}`}>
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${entity.type === 'client' ? 'bg-emerald-400/10' : 'bg-blue-400/10'}`}>
                            <Building size={14} className={entity.type === 'client' ? 'text-emerald-400' : 'text-blue-400'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-zinc-100 text-sm font-medium truncate">{entity.entity_name}</p>
                            <p className="text-zinc-500 text-xs truncate">{entity.contact_name} · {entity.contact_email}</p>
                          </div>
                          <Badge className={`text-[10px] border ${entity.type === 'client' ? 'border-emerald-400/20 text-emerald-400 bg-emerald-400/10' : 'border-blue-400/20 text-blue-400 bg-blue-400/10'}`}>
                            {entity.type === 'client' ? 'Cliente' : 'Lead'}
                          </Badge>
                        </button>
                      ))}
                      {entitySearch && (
                        <button type="button" className="w-full px-4 py-3 text-left hover:bg-zinc-800/80 flex items-center gap-3 text-amber-500 transition-colors" onClick={() => { setFormData({ ...formData, entity_name: entitySearch }); setEntityDropdownOpen(false); }} data-testid="entity-create-new">
                          <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center"><Plus size={14} className="text-amber-500" /></div>
                          <span className="text-sm font-medium">Criar nova: "{entitySearch}"</span>
                        </button>
                      )}
                      {!entitySearch && filteredEntities.length === 0 && (
                        <div className="px-4 py-4 text-zinc-500 text-sm text-center">Comece a escrever para pesquisar...</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm text-zinc-400 mb-2 block font-medium">País *</Label>
                  <Select value={formData.country} onValueChange={v => setFormData({...formData, country: v})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30" data-testid="lead-country"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">{COUNTRIES.map(c => <SelectItem key={c.code} value={c.name} className="text-zinc-100 hover:bg-zinc-800">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-zinc-400 mb-2 block font-medium">Fonte</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100" data-testid="lead-source"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">{sourceOptions.map(s => <SelectItem key={s} value={s} className="text-zinc-100 hover:bg-zinc-800">{t(`otc.sourceLabels.${s}`) || s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-zinc-400 mb-2 block font-medium">Tier</Label>
                    <Select value={formData.potential_tier} onValueChange={v => setFormData({...formData, potential_tier: v})}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100" data-testid="lead-tier"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">{TIER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-zinc-100 hover:bg-zinc-800">{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 mb-1">
                <User size={15} className="text-amber-500" />
                <span className="text-xs text-zinc-400 uppercase tracking-[0.15em] font-semibold">Contacto</span>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-zinc-400 mb-2 block font-medium">Nome *</Label>
                  <Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} onBlur={e => checkExistingContact('contact_name', e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30" data-testid="lead-contact-name" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-400 mb-2 block font-medium">Email *</Label>
                  <Input value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} onBlur={e => checkExistingContact('email', e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30" type="email" data-testid="lead-contact-email" />
                </div>
                <div>
                  <Label className="text-sm text-zinc-400 mb-2 block font-medium">Telefone *</Label>
                  <Input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30" placeholder="+351..." data-testid="lead-contact-phone" />
                </div>
              </div>
            </div>
          </div>

          {/* Trading Profile */}
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <DollarSign size={15} className="text-amber-500" />
              <span className="text-xs text-zinc-400 uppercase tracking-[0.15em] font-semibold">Perfil de Trading</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-zinc-400 mb-2 block font-medium">Tipo</Label>
                <Select value={formData.transaction_type} onValueChange={v => setFormData({...formData, transaction_type: v})}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100" data-testid="lead-tx-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="buy" className="text-zinc-100">Compra</SelectItem>
                    <SelectItem value="sell" className="text-zinc-100">Venda</SelectItem>
                    <SelectItem value="both" className="text-zinc-100">Ambos</SelectItem>
                    <SelectItem value="swap" className="text-zinc-100">Swap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-zinc-400 mb-2 block font-medium">Ativo</Label>
                <Select value={formData.target_asset} onValueChange={v => setFormData({...formData, target_asset: v})}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100" data-testid="lead-asset"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">{['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'ADA', 'DOGE', 'Other'].map(a => <SelectItem key={a} value={a} className="text-zinc-100">{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-zinc-400 mb-2 block font-medium">Volume Estimado (USD)</Label>
                <FormattedNumberInput value={formData.estimated_volume_usd} onChange={v => setFormData({...formData, estimated_volume_usd: v})} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="1 000 000" data-testid="lead-volume" />
              </div>
              <div>
                <Label className="text-sm text-zinc-400 mb-2 block font-medium">Por Operação (USD)</Label>
                <FormattedNumberInput value={formData.volume_per_operation} onChange={v => setFormData({...formData, volume_per_operation: v})} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="500 000" data-testid="lead-vol-per-op" />
              </div>
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Notas</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 resize-none" rows={2} placeholder="Observações adicionais..." data-testid="lead-notes" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-8 py-5 flex items-center justify-between">
          <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 px-6" onClick={() => { onOpenChange(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-8 rounded-md transition-colors"
            onClick={handleCreateLead}
            disabled={!isFormValid || isSubmitting}
            data-testid="create-lead-submit"
          >
            {isSubmitting ? <><Loader2 size={16} className="mr-2 animate-spin" />A criar...</> : <>Criar Lead <ChevronRight size={16} className="ml-1" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
