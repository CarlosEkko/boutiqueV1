import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../../../../components/ui/dialog';
import {
  Building, User, TrendingUp, FileText, Settings,
  CheckCircle, XCircle, ChevronRight, Trash2, Archive,
  UserCheck, RefreshCw, Shield, Video, Save, Edit,
} from 'lucide-react';
import { formatNumber, formatDate } from '../../../../utils/formatters';

const LeadDetailDialog = ({
  open, onOpenChange, selectedLead, setSelectedLead, t,
  getStatusBadge, onPreQual, onSetup, onConvert, onDelete,
  onArchive, onAdvanceKYC, onApproveKYC, onPreQualify,
  onTrustfullScan, onUpdateLead, onScheduleMeeting,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const startEdit = () => {
    setIsEditing(true);
    setEditData({
      notes: selectedLead.notes || '',
      preferred_settlement_methods: selectedLead.preferred_settlement_methods || [],
      potential_tier: selectedLead.potential_tier || '',
      estimated_volume_usd: selectedLead.estimated_volume_usd || '',
      volume_per_operation: selectedLead.volume_per_operation || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false); }}>
      <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-gold-400 flex items-center gap-2 text-xl">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center"><Building size={18} className="text-purple-400" /></div>
              {t('otc.leadDetail')} - {selectedLead?.entity_name}
            </DialogTitle>
            {selectedLead && !isEditing && (
              <Button size="sm" variant="outline" className="border-gold-500/30 text-gold-400 hover:bg-gold-900/20" data-testid="edit-lead-btn" onClick={startEdit}>
                <Edit size={14} className="mr-1" /> {t('otc.edit')}
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-400" onClick={() => setIsEditing(false)}>{t('otc.cancel')}</Button>
                <Button size="sm" className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="save-lead-btn"
                  onClick={async () => { await onUpdateLead(selectedLead.id, editData); setIsEditing(false); }}>
                  <Save size={14} className="mr-1" /> {t('otc.save')}
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
                <span className="text-gray-400 text-sm">{t('otc.status')}:</span>{getStatusBadge(selectedLead.status)}
                {selectedLead.potential_tier && <Badge className="bg-gold-900/30 text-gold-400 capitalize">{selectedLead.potential_tier}</Badge>}
                <Button size="sm" variant="outline" className="ml-auto border-blue-600/50 text-blue-400 hover:bg-blue-900/30"
                  onClick={() => onScheduleMeeting(selectedLead)} data-testid="schedule-meeting-otc-detail">
                  <Video size={14} className="mr-1" /> {t('otc.scheduleMeeting')}
                </Button>
              </div>
              <span className="text-gray-500 text-sm">{t('otc.created')}: {formatDate(selectedLead.created_at)}</span>
            </div>

            {/* Risk Intelligence */}
            {selectedLead.trustfull_data && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white flex items-center gap-2"><Shield size={16} className="text-blue-400" />{t('otc.riskIntelligence')}</h4>
                    <button onClick={async () => { const d = await onTrustfullScan(selectedLead.id); if (d) setSelectedLead({...selectedLead, trustfull_data: d}); }}
                      className="text-xs text-gray-500 hover:text-blue-400 flex items-center gap-1" data-testid="rescan-risk"><RefreshCw size={12} /> Re-scan</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">{t('otc.globalScore')}</p>
                      <p className={`text-2xl font-mono font-bold ${(selectedLead.trustfull_data.combined_score||0) >= 700 ? 'text-green-400' : (selectedLead.trustfull_data.combined_score||0) >= 500 ? 'text-emerald-400' : (selectedLead.trustfull_data.combined_score||0) >= 300 ? 'text-yellow-400' : (selectedLead.trustfull_data.combined_score||0) >= 150 ? 'text-orange-400' : 'text-red-400'}`}>{selectedLead.trustfull_data.combined_score ?? '\u2014'}</p>
                      <p className="text-gray-500 text-[10px] capitalize">{selectedLead.trustfull_data.risk_level || ''}</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">Email</p>
                      <p className="text-xl font-mono text-white">{selectedLead.trustfull_data.email_risk?.score ?? '\u2014'}</p>
                      <p className="text-gray-500 text-[10px] capitalize">{selectedLead.trustfull_data.email_risk?.score_cluster || ''}</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <p className="text-gray-500 text-[10px] uppercase mb-1">Telefone</p>
                      <p className="text-xl font-mono text-white">{selectedLead.trustfull_data.phone_risk?.score ?? '\u2014'}</p>
                      <p className="text-gray-500 text-[10px] capitalize">{selectedLead.trustfull_data.phone_risk?.score_cluster || ''}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {selectedLead.trustfull_data.email_risk?.status && <div className="flex justify-between"><span className="text-gray-500">Email Status:</span><span className="text-white capitalize">{selectedLead.trustfull_data.email_risk.status}</span></div>}
                    {selectedLead.trustfull_data.email_risk?.is_disposable != null && <div className="flex justify-between"><span className="text-gray-500">{t('otc.disposable')}:</span><span className={selectedLead.trustfull_data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{selectedLead.trustfull_data.email_risk.is_disposable ? t('otc.yes') : t('otc.no')}</span></div>}
                    {selectedLead.trustfull_data.email_risk?.has_linkedin != null && <div className="flex justify-between"><span className="text-gray-500">LinkedIn:</span><span className={selectedLead.trustfull_data.email_risk.has_linkedin ? 'text-green-400' : 'text-gray-500'}>{selectedLead.trustfull_data.email_risk.has_linkedin ? t('otc.yes') : t('otc.no')}</span></div>}
                    {selectedLead.trustfull_data.email_risk?.company_name && <div className="flex justify-between"><span className="text-gray-500">{t('otc.company')}:</span><span className="text-white">{selectedLead.trustfull_data.email_risk.company_name}</span></div>}
                    {selectedLead.trustfull_data.email_risk?.data_breaches_count != null && <div className="flex justify-between"><span className="text-gray-500">Data Breaches:</span><span className={selectedLead.trustfull_data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{selectedLead.trustfull_data.email_risk.data_breaches_count}</span></div>}
                    {selectedLead.trustfull_data.phone_risk?.has_whatsapp != null && <div className="flex justify-between"><span className="text-gray-500">WhatsApp:</span><span className={selectedLead.trustfull_data.phone_risk.has_whatsapp ? 'text-green-400' : 'text-gray-500'}>{selectedLead.trustfull_data.phone_risk.has_whatsapp ? t('otc.yes') : t('otc.no')}</span></div>}
                    {selectedLead.trustfull_data.phone_risk?.number_type && <div className="flex justify-between"><span className="text-gray-500">{t('otc.phoneType')}:</span><span className={selectedLead.trustfull_data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{selectedLead.trustfull_data.phone_risk.number_type}</span></div>}
                    {selectedLead.trustfull_data.phone_risk?.current_network && <div className="flex justify-between"><span className="text-gray-500">{t('otc.carrier')}:</span><span className="text-white">{selectedLead.trustfull_data.phone_risk.current_network}</span></div>}
                  </div>
                  {selectedLead.trustfull_data.red_flags?.length > 0 && (
                    <div className="mt-3 p-2 bg-red-950/30 border border-red-900/30 rounded-lg">
                      <p className="text-red-400 text-xs font-medium mb-1">Red Flags:</p>
                      <div className="flex flex-wrap gap-1">{selectedLead.trustfull_data.red_flags.map((f, i) => <Badge key={`flag-${f}-${i}`} className="bg-red-900/40 text-red-400 text-[10px]">{f}</Badge>)}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><User size={16} />{t('otc.contactInfo')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-400">{t('otc.name')}:</span><span className="text-white">{selectedLead.contact_name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">{t('otc.email')}:</span><span className="text-white">{selectedLead.contact_email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">{t('otc.phone')}:</span><span className="text-white">{selectedLead.contact_phone || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">{t('otc.country')}:</span><span className="text-white">{selectedLead.country || '-'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">{t('otc.origin')}:</span><Badge className="bg-zinc-800 text-gray-300 capitalize">{t(`otc.sourceLabels.${selectedLead.source}`) || selectedLead.source?.replace('_', ' ')}</Badge></div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><TrendingUp size={16} />{t('otc.tradingProfile')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      <div><Label className="text-gray-400 text-sm">{t('otc.totalVolumeLabel')}</Label>
                        <FormattedNumberInput value={editData.estimated_volume_usd} onChange={v => setEditData({...editData, estimated_volume_usd: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="1 000 000" data-testid="edit-volume" />
                      </div>
                      <div><Label className="text-gray-400 text-sm">{t('otc.perOperationLabel')}</Label>
                        <FormattedNumberInput value={editData.volume_per_operation} onChange={v => setEditData({...editData, volume_per_operation: v})} className="bg-zinc-800 border-zinc-700 text-white" placeholder="500 000" data-testid="edit-vol-per-op" />
                      </div>
                      <div><Label className="text-gray-400 text-sm">{t('otc.potentialTier')}</Label>
                        <Select value={editData.potential_tier} onValueChange={v => setEditData({...editData, potential_tier: v})}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="edit-tier"><SelectValue placeholder={t('otc.selectTier')} /></SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <SelectItem value="broker" className="text-white">Broker</SelectItem>
                            <SelectItem value="standard" className="text-white">Standard</SelectItem>
                            <SelectItem value="premium" className="text-white">Premium</SelectItem>
                            <SelectItem value="vip" className="text-white">VIP</SelectItem>
                            <SelectItem value="institutional" className="text-white">{t('otc.institutional')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-gray-400">{t('otc.totalVolume')}:</span><span className="text-gold-400 font-mono font-medium">${formatNumber(selectedLead.estimated_volume_usd || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">{t('otc.perOperation')}:</span><span className="text-white font-mono">${formatNumber(selectedLead.volume_per_operation || 0)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-400">{t('otc.tier')}:</span><span className="text-gold-400 capitalize">{selectedLead.potential_tier || '-'}</span></div>
                    </>
                  )}
                  <div className="flex justify-between"><span className="text-gray-400">{t('otc.asset')}:</span><span className="text-white">{selectedLead.target_asset || '-'}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-400">{t('otc.type')}:</span><Badge className="bg-blue-900/30 text-blue-400 uppercase">{selectedLead.transaction_type || '-'}</Badge></div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><Building size={16} />{t('otc.settlementLabel') || 'Settlement'}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <div><Label className="text-gray-400 text-sm">{t('otc.settlementMethods')}</Label>
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
                    <div><span className="text-gray-400 text-sm">{t('otc.methods')}:</span>
                      <div className="flex flex-wrap gap-1 mt-1">{selectedLead.preferred_settlement_methods?.length > 0 ? selectedLead.preferred_settlement_methods.map((m, i) => <Badge key={`method-${m}-${i}`} className="bg-gold-500/20 text-gold-400 uppercase text-xs">{m}</Badge>) : <span className="text-gray-500">N/A</span>}</div>
                    </div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-400">Exchange:</span><span className="text-white">{selectedLead.current_exchange || '-'}</span></div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-purple-400 text-sm flex items-center gap-2"><FileText size={16} />{t('otc.notes')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <Textarea value={editData.notes} onChange={e => setEditData({...editData, notes: e.target.value})} className="bg-zinc-800 border-zinc-700 text-white" rows={4} placeholder={t('otc.addNotes')} data-testid="edit-notes" />
                  ) : (
                    selectedLead.notes ? <p className="text-white text-sm whitespace-pre-wrap bg-zinc-800/50 p-2 rounded">{selectedLead.notes}</p> : <p className="text-gray-500 text-center py-4">{t('otc.noNotes')}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-zinc-800">
              {(selectedLead.status === 'new' || selectedLead.status === 'contacted') && (
                <div className="flex gap-3">
                  <Button onClick={() => onPreQual(selectedLead)} className="flex-1 bg-purple-600 hover:bg-purple-500"><FileText size={16} className="mr-2" />{t('otc.preQualification')}</Button>
                  <Button onClick={() => onPreQualify(selectedLead.id, true)} className="flex-1 bg-green-600 hover:bg-green-500"><CheckCircle size={16} className="mr-2" />{t('otc.preQualify')}</Button>
                  <Button onClick={() => onPreQualify(selectedLead.id, false)} variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"><XCircle size={16} className="mr-2" />{t('otc.notQualified')}</Button>
                </div>
              )}
              {selectedLead.status === 'pre_qualified' && <Button onClick={() => onAdvanceKYC(selectedLead.id)} className="w-full bg-gold-500 hover:bg-gold-400 text-black"><ChevronRight size={16} className="mr-2" />{t('otc.advanceToKYC')}</Button>}
              {selectedLead.status === 'kyc_pending' && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                  <Shield size={20} className="mx-auto mb-2 text-amber-500" />
                  <p className="text-amber-400 text-sm font-medium">KYC/KYB em Verificacao</p>
                  <p className="text-zinc-500 text-xs mt-1">A aprovacao e feita em Risco & Conformidade apos verificacao KYC</p>
                </div>
              )}
              {selectedLead.status === 'kyc_approved' && <Button onClick={() => onSetup(selectedLead)} className="w-full bg-gold-500 hover:bg-gold-400 text-black"><Settings size={16} className="mr-2" />Setup Operacional</Button>}
              {selectedLead.status === 'setup_pending' && <Button onClick={() => onConvert(selectedLead.id)} className="w-full bg-emerald-600 hover:bg-emerald-500"><UserCheck size={16} className="mr-2" />{t('otc.convertToClient')}</Button>}
              {selectedLead.status === 'setup_complete' && <Button onClick={() => onConvert(selectedLead.id)} className="w-full bg-emerald-600 hover:bg-emerald-500"><UserCheck size={16} className="mr-2" />{t('otc.convertToClient')}</Button>}
              {selectedLead.status !== 'active_client' && (
                <div className="flex gap-3 mt-3">
                  <Button onClick={() => onArchive(selectedLead.id)} variant="outline" className="flex-1 border-gray-600 text-gray-400"><Archive size={16} className="mr-2" />{t('otc.archive')}</Button>
                  <Button onClick={() => onDelete(selectedLead.id)} variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-900/20"><Trash2 size={16} className="mr-2" />{t('otc.delete')}</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
