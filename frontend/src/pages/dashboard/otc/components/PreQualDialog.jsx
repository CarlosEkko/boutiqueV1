import React from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../../components/ui/select';
import { Dialog, DialogContent } from '../../../../components/ui/dialog';
import { FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const PreQualDialog = ({
  open, onOpenChange, selectedLead, preQualData, setPreQualData, onSubmit,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border border-zinc-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto p-0 shadow-2xl">
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-8 pt-8 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <FileText size={20} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-50">Pre-Qualificacao</h2>
              <p className="text-zinc-500 text-xs mt-0.5 uppercase tracking-[0.2em]">02 / 03 · {selectedLead?.entity_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-0">
            <div className="flex-1 h-[2px] bg-amber-500 rounded-full" />
            <div className="flex-1 h-[2px] bg-amber-500 rounded-full" />
            <div className="flex-1 h-[2px] bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Tipo de Cliente</Label>
              <Select value={preQualData.client_type} onValueChange={v => setPreQualData({...preQualData, client_type: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="retail" className="text-zinc-100">Retalho</SelectItem>
                  <SelectItem value="hnwi" className="text-zinc-100">HNWI</SelectItem>
                  <SelectItem value="company" className="text-zinc-100">Empresa</SelectItem>
                  <SelectItem value="fund_institution" className="text-zinc-100">Fundo / Instituicao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Valor 1a Operacao (USD)</Label>
              <FormattedNumberInput value={preQualData.first_operation_value} onChange={v => setPreQualData({...preQualData, first_operation_value: v})} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="100 000" data-testid="prequal-first-op" />
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Volume Mensal Est. (USD)</Label>
              <FormattedNumberInput value={preQualData.estimated_monthly_volume} onChange={v => setPreQualData({...preQualData, estimated_monthly_volume: v})} className="bg-zinc-900 border-zinc-800 text-zinc-100" placeholder="1 000 000" data-testid="prequal-monthly-vol" />
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Frequencia</Label>
              <Select value={preQualData.expected_frequency} onValueChange={v => setPreQualData({...preQualData, expected_frequency: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="one_shot" className="text-zinc-100">Unica</SelectItem>
                  <SelectItem value="weekly" className="text-zinc-100">Semanal</SelectItem>
                  <SelectItem value="daily" className="text-zinc-100">Diaria</SelectItem>
                  <SelectItem value="multiple_daily" className="text-zinc-100">Multipla Diaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Objectivo da Operacao</Label>
              <Select value={preQualData.operation_objective} onValueChange={v => setPreQualData({...preQualData, operation_objective: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="trading" className="text-zinc-100">Trading</SelectItem>
                  <SelectItem value="treasury" className="text-zinc-100">Tesouraria</SelectItem>
                  <SelectItem value="arbitrage" className="text-zinc-100">Arbitragem</SelectItem>
                  <SelectItem value="remittances" className="text-zinc-100">Remessas</SelectItem>
                  <SelectItem value="otc_b2b" className="text-zinc-100">OTC B2B</SelectItem>
                  <SelectItem value="other" className="text-zinc-100">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Origem dos Fundos</Label>
              <Select value={preQualData.fund_source} onValueChange={v => setPreQualData({...preQualData, fund_source: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="income" className="text-zinc-100">Rendimento</SelectItem>
                  <SelectItem value="company" className="text-zinc-100">Empresa</SelectItem>
                  <SelectItem value="crypto_holdings" className="text-zinc-100">Holdings Crypto</SelectItem>
                  <SelectItem value="asset_sale" className="text-zinc-100">Venda de Ativos</SelectItem>
                  <SelectItem value="inheritance" className="text-zinc-100">Heranca</SelectItem>
                  <SelectItem value="investment_returns" className="text-zinc-100">Retornos</SelectItem>
                  <SelectItem value="other" className="text-zinc-100">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Canal de Liquidacao</Label>
              <Select value={preQualData.settlement_channel} onValueChange={v => setPreQualData({...preQualData, settlement_channel: v})}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-1 focus:ring-amber-500/30"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="bank_transfer" className="text-zinc-100">Transferencia Bancaria</SelectItem>
                  <SelectItem value="stablecoins" className="text-zinc-100">Stablecoins</SelectItem>
                  <SelectItem value="on_chain" className="text-zinc-100">On-Chain</SelectItem>
                  <SelectItem value="off_chain" className="text-zinc-100">Off-Chain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-zinc-400 mb-2 block font-medium">Jurisdicao Bancaria</Label>
              <Input value={preQualData.bank_jurisdiction} onChange={e => setPreQualData({...preQualData, bank_jurisdiction: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-amber-500/50" placeholder="Ex: Suica, Portugal..." />
            </div>
          </div>
          <div>
            <Label className="text-sm text-zinc-400 mb-2 block font-medium">Red Flags</Label>
            <Textarea value={preQualData.red_flags_notes} onChange={e => setPreQualData({...preQualData, red_flags_notes: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 resize-none focus:border-amber-500/50" rows={2} />
          </div>
          <div>
            <Label className="text-sm text-zinc-400 mb-2 block font-medium">Notas</Label>
            <Textarea value={preQualData.notes} onChange={e => setPreQualData({...preQualData, notes: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 resize-none focus:border-amber-500/50" rows={2} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-8 py-5 flex items-center justify-between">
          <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-zinc-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-8" onClick={() => { if (!preQualData.client_type) { toast.error('Selecione o Tipo de Cliente'); return; } onSubmit(); }}>Submeter <ChevronRight size={16} className="ml-1" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreQualDialog;
