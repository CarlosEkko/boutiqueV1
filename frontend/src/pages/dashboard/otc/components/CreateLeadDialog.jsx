import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Card, CardContent } from '../../../../components/ui/card';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import { UserPlus, ChevronRight, Building, User, Eye, DollarSign, CheckCircle, Plus, TrendingUp, Loader2, Search } from 'lucide-react';
import { COUNTRIES } from '../../../../utils/countries';

const SOURCE_LABELS = {
  website: 'Website', referral: 'Referência', linkedin: 'LinkedIn', event: 'Evento',
  broker: 'Broker', cold_outreach: 'Prospecção', existing_client: 'Cliente Existente',
  partner: 'Parceiro', conference: 'Conferência', other: 'Outro',
};

const TIER_OPTIONS = [
  { value: 'broker', label: 'Broker' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
  { value: 'institutional', label: 'Institucional' },
];

export const CreateLeadDialog = ({
  open, onOpenChange, formData, setFormData, enums,
  showExistingWarning, existingContact, checkingContact,
  checkExistingContact, handleCreateLead, handleCreateClientDirect,
  setShowExistingWarning, setExistingContact, resetForm,
  openNewDeal, openDetail, open360View, isSubmitting,
  existingEntities = [], fetchEntities,
}) => {
  const sourceOptions = enums?.sources || ['website', 'referral', 'linkedin', 'event', 'broker', 'cold_outreach', 'existing_client', 'other'];
  const isFormValid = formData.entity_name && formData.contact_name && formData.contact_email && formData.contact_phone;
  
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const entityRef = useRef(null);

  // Close dropdown on click outside
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
      <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <DialogTitle className="text-gold-400 flex items-center gap-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
              <UserPlus size={18} className="text-gold-400" />
            </div>
            Novo Lead OTC
          </DialogTitle>
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
          {/* Existing Contact Warning */}
          {showExistingWarning && existingContact && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/80 via-zinc-900 to-zinc-950">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 animate-pulse" />
              <div className="relative p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Eye size={24} className="text-amber-400" />
                  </div>
                  <div><h3 className="text-amber-400 font-bold text-lg">Contacto Existente Detetado</h3><p className="text-amber-300/60 text-sm">Encontrámos registos correspondentes no sistema</p></div>
                </div>
                {existingContact.existing_otc_client && (
                  <Card className="bg-green-950/50 border-green-500/30 mb-3">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><CheckCircle size={20} className="text-green-400" /></div>
                        <div><p className="text-green-400 font-semibold text-sm">Cliente OTC Ativo</p><p className="text-green-300/60 text-xs">{existingContact.existing_otc_client.entity_name} — {existingContact.existing_otc_client.contact_email}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-900/20" onClick={() => openDetail(existingContact.existing_otc_client)}>Ver Cliente</Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-500 text-white" onClick={() => openNewDeal(existingContact.existing_otc_client)}><Plus size={14} className="mr-1" />Nova Operação</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {existingContact.existing_user && !existingContact.existing_otc_client && (
                  <Card className="bg-blue-950/50 border-blue-500/30 mb-3">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><User size={20} className="text-blue-400" /></div>
                        <div><p className="text-blue-400 font-semibold text-sm">Utilizador Registado</p><p className="text-blue-300/60 text-xs">{existingContact.existing_user.email}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-900/20" onClick={() => open360View(existingContact.existing_user)}>Ver 360°</Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white" onClick={handleCreateClientDirect}><UserPlus size={14} className="mr-1" />Criar Cliente OTC</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {existingContact.existing_lead && (
                  <Card className="bg-purple-950/50 border-purple-500/30 mb-3">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><TrendingUp size={20} className="text-purple-400" /></div>
                        <div><p className="text-purple-400 font-semibold text-sm">Lead Existente</p><p className="text-purple-300/60 text-xs">{existingContact.existing_lead.entity_name} — {existingContact.existing_lead.status}</p></div>
                      </div>
                      <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-900/20" onClick={() => openDetail(existingContact.existing_lead)}>Ver Lead</Button>
                    </CardContent>
                  </Card>
                )}
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" className="border-zinc-600 text-zinc-400" onClick={() => { setShowExistingWarning(false); setExistingContact(null); }}>Ignorar & Continuar</Button>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-white font-medium text-sm flex items-center gap-2"><Building size={16} className="text-gold-400" />Informação da Entidade</h3>
                <div className="space-y-3">
                  <div className="relative" ref={entityRef}>
                    <Label className="text-gray-400 text-sm">Entidade *</Label>
                    <div className="relative">
                      <Input
                        value={entitySearch || formData.entity_name}
                        onChange={e => handleEntitySearchChange(e.target.value)}
                        onFocus={() => setEntityDropdownOpen(true)}
                        className="bg-zinc-800 border-zinc-700 text-white pr-10"
                        placeholder="Pesquisar ou criar nova entidade..."
                        data-testid="lead-entity-name"
                        autoComplete="off"
                      />
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    </div>
                    {entityDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {filteredEntities.length > 0 && filteredEntities.map((entity, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-3 border-b border-zinc-800/50 last:border-0"
                            onClick={() => handleSelectEntity(entity)}
                            data-testid={`entity-option-${idx}`}
                          >
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${entity.type === 'client' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                              <Building size={14} className={entity.type === 'client' ? 'text-green-400' : 'text-blue-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{entity.entity_name}</p>
                              <p className="text-zinc-500 text-xs truncate">{entity.contact_name} · {entity.contact_email}</p>
                            </div>
                            <Badge className={`text-[10px] ${entity.type === 'client' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
                              {entity.type === 'client' ? 'Cliente' : 'Lead'}
                            </Badge>
                          </button>
                        ))}
                        {entitySearch && (
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-3 text-gold-400"
                            onClick={() => { setFormData({ ...formData, entity_name: entitySearch }); setEntityDropdownOpen(false); }}
                            data-testid="entity-create-new"
                          >
                            <div className="w-7 h-7 rounded-md bg-gold-500/20 flex items-center justify-center">
                              <Plus size={14} className="text-gold-400" />
                            </div>
                            <span className="text-sm font-medium">Criar nova: "{entitySearch}"</span>
                          </button>
                        )}
                        {!entitySearch && filteredEntities.length === 0 && (
                          <div className="px-3 py-3 text-zinc-500 text-sm text-center">Comece a escrever para pesquisar...</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div><Label className="text-gray-400 text-sm">País *</Label>
                    <Select value={formData.country} onValueChange={v => setFormData({...formData, country: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="lead-country"><SelectValue placeholder="Selecionar país" /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                        {COUNTRIES.map(c => <SelectItem key={c.code} value={c.name} className="text-white hover:bg-zinc-700">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-gray-400 text-sm">Fonte</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="lead-source"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        {sourceOptions.map(s => (
                          <SelectItem key={s} value={s} className="text-white hover:bg-zinc-700">
                            {SOURCE_LABELS[s] || s.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-gray-400 text-sm">Tier Potencial</Label>
                    <Select value={formData.potential_tier} onValueChange={v => setFormData({...formData, potential_tier: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="lead-tier"><SelectValue placeholder="Selecionar tier" /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                        {TIER_OPTIONS.map(t => <SelectItem key={t.value} value={t.value} className="text-white hover:bg-zinc-700">{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-white font-medium text-sm flex items-center gap-2"><User size={16} className="text-gold-400" />Contacto Principal</h3>
                <div className="space-y-3">
                  <div><Label className="text-gray-400 text-sm">Nome *</Label><Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} onBlur={e => checkExistingContact('contact_name', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" placeholder="Nome completo" data-testid="lead-contact-name" /></div>
                  <div><Label className="text-gray-400 text-sm">Email *</Label><Input value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} onBlur={e => checkExistingContact('email', e.target.value)} className="bg-zinc-800 border-zinc-700 text-white" placeholder="email@empresa.com" type="email" data-testid="lead-contact-email" /></div>
                  <div><Label className="text-gray-400 text-sm">Telefone *</Label><Input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="+351..." data-testid="lead-contact-phone" /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-white font-medium text-sm flex items-center gap-2"><DollarSign size={16} className="text-gold-400" />Interesse OTC</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><Label className="text-gray-400 text-sm">Tipo</Label>
                  <Select value={formData.transaction_type} onValueChange={v => setFormData({...formData, transaction_type: v})}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="lead-tx-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectItem value="buy" className="text-white">Compra</SelectItem>
                      <SelectItem value="sell" className="text-white">Venda</SelectItem>
                      <SelectItem value="both" className="text-white">Ambos</SelectItem>
                      <SelectItem value="swap" className="text-white">Swap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-gray-400 text-sm">Ativo</Label>
                  <Select value={formData.target_asset} onValueChange={v => setFormData({...formData, target_asset: v})}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="lead-asset"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      {['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'ADA', 'DOGE', 'Other'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-gray-400 text-sm">Volume Est. (USD)</Label>
                  <FormattedNumberInput
                    value={formData.estimated_volume_usd}
                    onChange={v => setFormData({...formData, estimated_volume_usd: v})}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="1 000 000"
                    data-testid="lead-volume"
                  />
                </div>
                <div><Label className="text-gray-400 text-sm">Volume/Operação</Label>
                  <FormattedNumberInput
                    value={formData.volume_per_operation}
                    onChange={v => setFormData({...formData, volume_per_operation: v})}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="500 000"
                    data-testid="lead-vol-per-op"
                  />
                </div>
              </div>
              <div><Label className="text-gray-400 text-sm">Notas</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={2} placeholder="Informação adicional..." data-testid="lead-notes" /></div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4 flex gap-3">
          <Button variant="outline" className="border-zinc-600 text-gray-400" onClick={() => { onOpenChange(false); resetForm(); }}>Cancelar</Button>
          <Button
            className="bg-gold-500 hover:bg-gold-400 text-black font-medium"
            onClick={handleCreateLead}
            disabled={!isFormValid || isSubmitting}
            data-testid="create-lead-submit"
          >
            {isSubmitting ? <><Loader2 size={16} className="mr-2 animate-spin" />A criar...</> : 'Criar Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
