import React from 'react';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../../components/ui/select';
import { Dialog, DialogContent } from '../../../../components/ui/dialog';
import { Settings, ChevronRight } from 'lucide-react';

const SetupDialog = ({
  open, onOpenChange, selectedLead, setupData, setSetupData, teamMembers, onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto p-0 shadow-2xl">
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-8 pt-8 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Settings size={20} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Setup Operacional</h2>
              <p className="text-zinc-500 text-xs mt-0.5 uppercase tracking-[0.2em]">03 / 03 · {selectedLead?.entity_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-0">
            <div className="flex-1 h-[2px] bg-amber-500 rounded-full" />
            <div className="flex-1 h-[2px] bg-amber-500 rounded-full" />
            <div className="flex-1 h-[2px] bg-amber-500 rounded-full" />
          </div>
        </div>
        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Limite Diario (USD)</Label>
              <FormattedNumberInput value={setupData.daily_limit} onChange={v => setSetupData({...setupData, daily_limit: v})} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="100 000" data-testid="setup-daily-limit" />
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Limite Mensal (USD)</Label>
              <FormattedNumberInput value={setupData.monthly_limit} onChange={v => setSetupData({...setupData, monthly_limit: v})} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="1 000 000" data-testid="setup-monthly-limit" />
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Metodo de Settlement</Label>
              <Select value={setupData.settlement_method} onValueChange={v => setSetupData({...setupData, settlement_method: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="sepa" className="text-zinc-100">SEPA</SelectItem>
                  <SelectItem value="swift" className="text-zinc-100">SWIFT</SelectItem>
                  <SelectItem value="pix" className="text-zinc-100">PIX</SelectItem>
                  <SelectItem value="faster_payments" className="text-zinc-100">Faster Payments</SelectItem>
                  <SelectItem value="usdt_onchain" className="text-zinc-100">USDT On-Chain</SelectItem>
                  <SelectItem value="usdc_onchain" className="text-zinc-100">USDC On-Chain</SelectItem>
                  <SelectItem value="crypto_onchain" className="text-zinc-100">Crypto On-Chain</SelectItem>
                  <SelectItem value="internal" className="text-zinc-100">Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Account Manager</Label>
              <Select value={setupData.account_manager_id} onValueChange={v => setSetupData({...setupData, account_manager_id: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">{teamMembers.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i).map(m => <SelectItem key={m.id} value={m.id} className="text-zinc-100 hover:bg-zinc-800">{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm text-zinc-400 mb-2 block font-medium">Canal de Comunicacao</Label>
            <Select value={setupData.communication_channel_type} onValueChange={v => setSetupData({...setupData, communication_channel_type: v})}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="email" className="text-zinc-100">Email</SelectItem>
                <SelectItem value="whatsapp" className="text-zinc-100">WhatsApp</SelectItem>
                <SelectItem value="telegram" className="text-zinc-100">Telegram</SelectItem>
                <SelectItem value="phone" className="text-zinc-100">Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-zinc-400 mb-2 block font-medium">Notas</Label>
            <Textarea value={setupData.notes} onChange={e => setSetupData({...setupData, notes: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 resize-none focus:border-amber-500/50" rows={2} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-8 py-5 flex items-center justify-between">
          <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-zinc-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-8" onClick={onSubmit}>Guardar Setup <ChevronRight size={16} className="ml-1" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SetupDialog;
