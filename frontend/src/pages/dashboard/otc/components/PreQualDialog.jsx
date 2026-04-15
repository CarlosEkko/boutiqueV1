import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { FormattedNumberInput } from '../../../../components/FormattedNumberInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../../components/ui/select';
import { Dialog, DialogContent } from '../../../../components/ui/dialog';
import { FileText, ChevronRight, AlertTriangle, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RED_FLAG_CHECKLIST = [
  { id: 'high_risk_country', label: 'País de Alto Risco (GAFI/FATF)', icon: Shield, severity: 'high',
    labels: { pt: 'País de Alto Risco (GAFI/FATF)', en: 'High-Risk Country (FATF)', ar: 'بلد عالي المخاطر', fr: 'Pays à haut risque (GAFI)', es: 'País de Alto Riesgo (GAFI)' } },
  { id: 'incompatible_activities', label: 'Atividades Incompatíveis', icon: AlertTriangle, severity: 'high',
    labels: { pt: 'Atividades Incompatíveis', en: 'Incompatible Activities', ar: 'أنشطة غير متوافقة', fr: 'Activités incompatibles', es: 'Actividades incompatibles' } },
  { id: 'excessive_urgency', label: 'Pressa Excessiva', icon: AlertTriangle, severity: 'medium',
    labels: { pt: 'Pressa Excessiva', en: 'Excessive Urgency', ar: 'استعجال مفرط', fr: 'Urgence excessive', es: 'Urgencia excesiva' } },
  { id: 'unable_to_justify_funds', label: 'Incapacidade de Justificar Fontes dos Fundos', icon: XCircle, severity: 'high',
    labels: { pt: 'Incapacidade de Justificar Fontes dos Fundos', en: 'Unable to Justify Fund Sources', ar: 'عدم القدرة على تبرير مصادر الأموال', fr: 'Incapacité à justifier les sources de fonds', es: 'Incapacidad de justificar fuentes de fondos' } },
  { id: 'inconsistent_answers', label: 'Inconsistência nas Respostas', icon: AlertTriangle, severity: 'medium',
    labels: { pt: 'Inconsistência nas Respostas', en: 'Inconsistent Answers', ar: 'تناقض في الإجابات', fr: 'Incohérence dans les réponses', es: 'Inconsistencia en las respuestas' } },
  { id: 'pep_exposure', label: 'Exposição PEP (Pessoa Politicamente Exposta)', icon: Shield, severity: 'high',
    labels: { pt: 'Exposição PEP (Pessoa Politicamente Exposta)', en: 'PEP Exposure (Politically Exposed Person)', ar: 'شخص مكشوف سياسيا', fr: 'Exposition PEP', es: 'Exposición PEP' } },
  { id: 'sanctions_match', label: 'Correspondência em Listas de Sanções', icon: XCircle, severity: 'critical',
    labels: { pt: 'Correspondência em Listas de Sanções', en: 'Sanctions List Match', ar: 'تطابق قائمة العقوبات', fr: 'Correspondance liste de sanctions', es: 'Coincidencia en lista de sanciones' } },
];

const severityColors = {
  critical: 'border-red-500/50 bg-red-500/10 text-red-400',
  high: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
};

const PreQualDialog = ({
  open, onOpenChange, selectedLead, preQualData, setPreQualData, onSubmit,
}) => {
  const [fatfResult, setFatfResult] = useState(null);
  const [checkingFatf, setCheckingFatf] = useState(false);
  const [redFlags, setRedFlags] = useState([]);
  const [redFlagNotes, setRedFlagNotes] = useState('');

  // Auto-check FATF when dialog opens
  useEffect(() => {
    if (open && selectedLead?.country) {
      checkFatfCountry(selectedLead.country);
    }
    if (open) {
      setRedFlags(preQualData.red_flags_checklist || []);
      setRedFlagNotes(preQualData.red_flags_notes || '');
    }
  }, [open, selectedLead?.country]);

  const checkFatfCountry = async (countryCode) => {
    if (!countryCode) return;
    setCheckingFatf(true);
    try {
      const token = sessionStorage.getItem('kryptobox_token');
      const res = await axios.get(`${API_URL}/api/otc/fatf-check/${countryCode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFatfResult(res.data);
      // Auto-check high-risk country flag
      if (res.data.is_high_risk && !redFlags.includes('high_risk_country')) {
        setRedFlags(prev => [...prev, 'high_risk_country']);
      }
    } catch {
      // Silently fail
    } finally {
      setCheckingFatf(false);
    }
  };

  const toggleFlag = (flagId) => {
    setRedFlags(prev => prev.includes(flagId) ? prev.filter(f => f !== flagId) : [...prev, flagId]);
  };

  const handleSubmit = () => {
    if (!preQualData.client_type) {
      toast.error('Selecione o Tipo de Cliente');
      return;
    }
    setPreQualData({
      ...preQualData,
      red_flags_checklist: redFlags,
      red_flags_notes: redFlagNotes,
    });
    onSubmit();
  };

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
          {/* Client info & FATF auto-check */}
          {fatfResult && fatfResult.is_high_risk && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 flex items-start gap-3">
              <Shield className="text-red-400 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-red-400 text-sm font-medium">
                  GAFI/FATF: {fatfResult.country_name} - {fatfResult.fatf_black_list ? 'Lista Negra' : fatfResult.fatf_grey_list ? 'Lista Cinzenta' : 'Alto Risco'}
                </p>
                <p className="text-red-400/70 text-xs mt-0.5">
                  {fatfResult.fatf_black_list ? 'Jurisdicao sujeita a Apelo de Acao. Diligencia reforçada obrigatoria.' : 'Jurisdicao sob monitorizacao intensificada.'}
                </p>
              </div>
            </div>
          )}
          {checkingFatf && (
            <div className="flex items-center gap-2 text-zinc-500 text-xs"><Loader2 size={14} className="animate-spin" /> A verificar GAFI/FATF...</div>
          )}

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
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100"><SelectValue placeholder="Selecionar" /></SelectTrigger>
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
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100"><SelectValue placeholder="Selecionar" /></SelectTrigger>
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
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-100"><SelectValue placeholder="Selecionar" /></SelectTrigger>
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

          {/* Red Flags Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm text-zinc-400 font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                Bandeiras Vermelhas (GAFI/FATF Compliance)
              </Label>
              {redFlags.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                  {redFlags.length} alerta{redFlags.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {RED_FLAG_CHECKLIST.map(flag => {
                const Icon = flag.icon;
                const isChecked = redFlags.includes(flag.id);
                const isAutoDetected = flag.id === 'high_risk_country' && fatfResult?.is_high_risk;
                return (
                  <button key={flag.id} type="button" onClick={() => toggleFlag(flag.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                      isChecked ? severityColors[flag.severity] : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                    }`} data-testid={`red-flag-${flag.id}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'border-current bg-current/20' : 'border-zinc-600'
                    }`}>
                      {isChecked && <CheckCircle size={14} />}
                    </div>
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 text-sm">{flag.label}</span>
                    {isAutoDetected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        Auto-detectado
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <Label className="text-xs text-zinc-500 mb-1 block">Notas adicionais sobre bandeiras vermelhas</Label>
              <Textarea value={redFlagNotes} onChange={e => setRedFlagNotes(e.target.value)} 
                className="bg-zinc-900 border-zinc-800 text-zinc-100 resize-none focus:border-amber-500/50" rows={2}
                placeholder="Detalhes adicionais sobre os alertas identificados..." />
            </div>
          </div>

          <div>
            <Label className="text-sm text-zinc-400 mb-2 block font-medium">Notas Gerais</Label>
            <Textarea value={preQualData.notes} onChange={e => setPreQualData({...preQualData, notes: e.target.value})} className="bg-zinc-900 border-zinc-800 text-zinc-100 resize-none focus:border-amber-500/50" rows={2} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-8 py-5 flex items-center justify-between">
          <Button variant="outline" className="border-zinc-800 text-zinc-500 hover:text-zinc-300" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <div className="flex items-center gap-3">
            {redFlags.length > 0 && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} /> {redFlags.length} bandeira{redFlags.length > 1 ? 's' : ''} vermelha{redFlags.length > 1 ? 's' : ''}
              </span>
            )}
            <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-8" onClick={handleSubmit}>
              Submeter <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreQualDialog;
