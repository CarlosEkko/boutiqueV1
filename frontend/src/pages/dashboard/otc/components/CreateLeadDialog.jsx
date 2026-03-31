import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Card, CardContent } from '../../../../components/ui/card';
import { UserPlus, ChevronRight, Mail, Building, TrendingUp, User, Link, Eye, CreditCard, DollarSign, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

export const CreateLeadDialog = ({
  open, onOpenChange, formData, setFormData, enums,
  showExistingWarning, existingContact, checkingContact,
  checkExistingContact, handleCreateLead, handleCreateClientDirect,
  setShowExistingWarning, setExistingContact, resetForm,
  openNewDeal, openDetail, open360View,
}) => {
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
                  <div><Label className="text-gray-400 text-sm">Entidade *</Label><Input value={formData.entity_name} onChange={e => setFormData({...formData, entity_name: e.target.value})} onBlur={e => checkExistingContact('entity_name', e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Nome da empresa" /></div>
                  <div><Label className="text-gray-400 text-sm">País *</Label><Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="bg-zinc-800 border-zinc-700" placeholder="Portugal" /></div>
                  <div><Label className="text-gray-400 text-sm">Fonte</Label>
                    <Select value={formData.source} onValueChange={v => setFormData({...formData, source: v})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {enums?.sources?.map(s => <SelectItem key={s} value={s} className="text-white hover:bg-zinc-700 capitalize">{s.replace(/_/g, ' ')}</SelectItem>) || <SelectItem value="website" className="text-white">Website</SelectItem>}
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
                  <div><Label className="text-gray-400 text-sm">Nome *</Label><Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} onBlur={e => checkExistingContact('contact_name', e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="Nome completo" /></div>
                  <div><Label className="text-gray-400 text-sm">Email *</Label><Input value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} onBlur={e => checkExistingContact('email', e.target.value)} className="bg-zinc-800 border-zinc-700" placeholder="email@empresa.com" type="email" /></div>
                  <div><Label className="text-gray-400 text-sm">Telefone</Label><Input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="bg-zinc-800 border-zinc-700" placeholder="+351..." /></div>
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
                    <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="buy" className="text-white">Compra</SelectItem><SelectItem value="sell" className="text-white">Venda</SelectItem><SelectItem value="both" className="text-white">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-gray-400 text-sm">Ativo</Label>
                  <Select value={formData.target_asset} onValueChange={v => setFormData({...formData, target_asset: v})}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'ADA', 'DOGE', 'Other'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-gray-400 text-sm">Volume Est. (USD)</Label><Input type="number" value={formData.estimated_volume_usd} onChange={e => setFormData({...formData, estimated_volume_usd: e.target.value})} className="bg-zinc-800 border-zinc-700" placeholder="100,000" /></div>
                <div><Label className="text-gray-400 text-sm">Volume/Operação</Label><Input type="number" value={formData.volume_per_operation} onChange={e => setFormData({...formData, volume_per_operation: e.target.value})} className="bg-zinc-800 border-zinc-700" placeholder="50,000" /></div>
              </div>
              <div><Label className="text-gray-400 text-sm">Notas</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700" rows={2} placeholder="Informação adicional..." /></div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4 flex gap-3">
          <Button variant="outline" className="border-zinc-600 text-gray-400" onClick={() => { onOpenChange(false); resetForm(); }}>Cancelar</Button>
          <Button className="bg-gold-500 hover:bg-gold-400 text-black font-medium" onClick={handleCreateLead} disabled={!formData.entity_name || !formData.contact_name || !formData.contact_email} data-testid="create-lead-submit">Criar Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
