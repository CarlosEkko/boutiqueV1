import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  X, ArrowRight, ArrowLeft, Lock, DollarSign, Users, Shield,
  FileText, Check, ArrowLeftRight, Calculator
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEAL_TYPES = [
  { value: 'block_trade', label: 'Block Trade', desc: 'Grande volume de um ativo' },
  { value: 'stablecoin_swap', label: 'Stablecoin Swap', desc: 'Troca entre stablecoins' },
  { value: 'cross_chain', label: 'Cross-Chain', desc: 'Troca entre blockchains diferentes' },
  { value: 'crypto_fiat', label: 'Crypto/Fiat', desc: 'Conversão crypto para moeda fiat' },
  { value: 'crypto_crypto', label: 'Crypto/Crypto', desc: 'Troca entre criptomoedas' },
];

const FEE_SCHEDULES = [
  { value: 'standard', label: 'Standard', rate: '0.5%', min: '$50' },
  { value: 'premium', label: 'Premium', rate: '0.3%', min: '$100' },
  { value: 'institutional', label: 'Institucional', rate: '0.1%', min: '$250' },
  { value: 'custom', label: 'Custom', rate: 'Personalizado', min: '-' },
];

const STEPS = ['Tipo & Ativos', 'Contrapartes', 'Fees & Liquidação', 'Revisão'];

const CreateEscrowModal = ({ onClose, onCreated }) => {
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feePreview, setFeePreview] = useState(null);

  const [form, setForm] = useState({
    deal_type: 'crypto_crypto',
    structure: 'two_sided',
    asset_a: 'BTC',
    asset_b: 'USDT',
    quantity_a: '',
    quantity_b: '',
    agreed_price: '',
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    seller_name: '',
    seller_email: '',
    seller_phone: '',
    fee_schedule: 'standard',
    fee_payer: 'split',
    custom_fee_rate: '',
    custom_fee_min: '',
    settlement_deadline_hours: 24,
    settlement_type: 'crypto_crypto',
    notes: '',
    otc_deal_id: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Calculate fee preview when relevant fields change
  useEffect(() => {
    const qty = parseFloat(form.quantity_a);
    const price = parseFloat(form.agreed_price);
    if (qty > 0 && price > 0) {
      const ticketSize = qty * price;
      const params = new URLSearchParams({
        ticket_size: ticketSize.toString(),
        schedule: form.fee_schedule,
        payer: form.fee_payer,
      });
      if (form.fee_schedule === 'custom' && form.custom_fee_rate) {
        params.append('custom_rate', form.custom_fee_rate);
      }
      if (form.fee_schedule === 'custom' && form.custom_fee_min) {
        params.append('custom_min', form.custom_fee_min);
      }
      axios.post(`${API_URL}/api/escrow/calculate-fee?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setFeePreview(res.data)).catch(() => {});
    }
  }, [form.quantity_a, form.agreed_price, form.fee_schedule, form.fee_payer, form.custom_fee_rate, form.custom_fee_min, token]);

  const canAdvance = () => {
    if (step === 0) return form.deal_type && form.asset_a && form.asset_b && form.quantity_a && form.quantity_b && form.agreed_price;
    if (step === 1) return form.buyer_name && form.seller_name;
    if (step === 2) return form.fee_schedule && form.fee_payer;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        deal_type: form.deal_type,
        structure: form.structure,
        asset_a: form.asset_a,
        asset_b: form.asset_b,
        quantity_a: parseFloat(form.quantity_a),
        quantity_b: parseFloat(form.quantity_b),
        agreed_price: parseFloat(form.agreed_price),
        buyer: { name: form.buyer_name, email: form.buyer_email, phone: form.buyer_phone },
        seller: { name: form.seller_name, email: form.seller_email, phone: form.seller_phone },
        fee_schedule: form.fee_schedule,
        fee_payer: form.fee_payer,
        settlement_deadline_hours: parseInt(form.settlement_deadline_hours) || 24,
        settlement_type: form.settlement_type,
        notes: form.notes || null,
        otc_deal_id: form.otc_deal_id || null,
      };
      if (form.fee_schedule === 'custom') {
        payload.custom_fee_rate = parseFloat(form.custom_fee_rate) || 0;
        payload.custom_fee_min = parseFloat(form.custom_fee_min) || 0;
      }

      const res = await axios.post(`${API_URL}/api/escrow/deals`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onCreated(res.data.deal);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar deal');
    } finally {
      setSubmitting(false);
    }
  };

  const ticketSize = (parseFloat(form.quantity_a) || 0) * (parseFloat(form.agreed_price) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" data-testid="create-escrow-modal">
      <Card className="w-full max-w-2xl bg-[#0a0f0a] border border-white/10 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Novo Escrow Deal</h2>
              <p className="text-xs text-muted-foreground">Passo {step + 1} de {STEPS.length}: {STEPS[step]}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-create-modal">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="flex px-5 pt-3 gap-1 shrink-0">
          {STEPS.map((s, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-white/10'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-5">
              {/* Deal Type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Tipo de Operação</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEAL_TYPES.map(dt => (
                    <div
                      key={dt.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${form.deal_type === dt.value ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}
                      onClick={() => update('deal_type', dt.value)}
                      data-testid={`deal-type-${dt.value}`}
                    >
                      <div className="text-sm font-medium">{dt.label}</div>
                      <div className="text-[10px] text-muted-foreground">{dt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Structure */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Estrutura Escrow</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'one_sided', label: '1-Sided', desc: 'Apenas uma parte deposita' },
                    { value: 'two_sided', label: '2-Sided', desc: 'Ambas as partes depositam' },
                  ].map(s => (
                    <div
                      key={s.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${form.structure === s.value ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}
                      onClick={() => update('structure', s.value)}
                      data-testid={`structure-${s.value}`}
                    >
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assets */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Asset A (Entrega)</label>
                  <Input value={form.asset_a} onChange={(e) => update('asset_a', e.target.value.toUpperCase())} placeholder="BTC" className="bg-white/5 border-white/10" data-testid="asset-a-input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Asset B (Pagamento)</label>
                  <Input value={form.asset_b} onChange={(e) => update('asset_b', e.target.value.toUpperCase())} placeholder="USDT" className="bg-white/5 border-white/10" data-testid="asset-b-input" />
                </div>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd. {form.asset_a}</label>
                  <Input type="number" value={form.quantity_a} onChange={(e) => update('quantity_a', e.target.value)} placeholder="10.0" className="bg-white/5 border-white/10" data-testid="quantity-a-input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Preço Acordado (USD)</label>
                  <Input type="number" value={form.agreed_price} onChange={(e) => update('agreed_price', e.target.value)} placeholder="65000" className="bg-white/5 border-white/10" data-testid="agreed-price-input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd. {form.asset_b}</label>
                  <Input type="number" value={form.quantity_b} onChange={(e) => update('quantity_b', e.target.value)} placeholder="650000" className="bg-white/5 border-white/10" data-testid="quantity-b-input" />
                </div>
              </div>

              {/* Ticket Size Preview */}
              {ticketSize > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-medium">Ticket Size</span>
                  <span className="text-lg font-bold text-emerald-400">${ticketSize.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {/* Buyer */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-400" />
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comprador (Buyer)</label>
                </div>
                <div className="space-y-3 pl-6">
                  <Input value={form.buyer_name} onChange={(e) => update('buyer_name', e.target.value)} placeholder="Nome do comprador *" className="bg-white/5 border-white/10" data-testid="buyer-name-input" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={form.buyer_email} onChange={(e) => update('buyer_email', e.target.value)} placeholder="Email" className="bg-white/5 border-white/10" data-testid="buyer-email-input" />
                    <Input value={form.buyer_phone} onChange={(e) => update('buyer_phone', e.target.value)} placeholder="Telefone" className="bg-white/5 border-white/10" data-testid="buyer-phone-input" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-white/10" />
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Seller */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-amber-400" />
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendedor (Seller)</label>
                </div>
                <div className="space-y-3 pl-6">
                  <Input value={form.seller_name} onChange={(e) => update('seller_name', e.target.value)} placeholder="Nome do vendedor *" className="bg-white/5 border-white/10" data-testid="seller-name-input" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={form.seller_email} onChange={(e) => update('seller_email', e.target.value)} placeholder="Email" className="bg-white/5 border-white/10" data-testid="seller-email-input" />
                    <Input value={form.seller_phone} onChange={(e) => update('seller_phone', e.target.value)} placeholder="Telefone" className="bg-white/5 border-white/10" data-testid="seller-phone-input" />
                  </div>
                </div>
              </div>

              {/* OTC Deal Link */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Link a Deal OTC existente (opcional)</label>
                <Input value={form.otc_deal_id} onChange={(e) => update('otc_deal_id', e.target.value)} placeholder="ID do deal OTC..." className="bg-white/5 border-white/10" data-testid="otc-deal-id-input" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Fee Schedule */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Fee Schedule</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEE_SCHEDULES.map(fs => (
                    <div
                      key={fs.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${form.fee_schedule === fs.value ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}
                      onClick={() => update('fee_schedule', fs.value)}
                      data-testid={`fee-schedule-${fs.value}`}
                    >
                      <div className="text-sm font-medium">{fs.label}</div>
                      <div className="text-[10px] text-muted-foreground">Rate: {fs.rate} | Min: {fs.min}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fee */}
              {form.fee_schedule === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fee Rate (%)</label>
                    <Input type="number" step="0.001" value={form.custom_fee_rate} onChange={(e) => update('custom_fee_rate', e.target.value)} placeholder="0.002" className="bg-white/5 border-white/10" data-testid="custom-rate-input" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fee Mínima ($)</label>
                    <Input type="number" value={form.custom_fee_min} onChange={(e) => update('custom_fee_min', e.target.value)} placeholder="100" className="bg-white/5 border-white/10" data-testid="custom-min-input" />
                  </div>
                </div>
              )}

              {/* Fee Payer */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Quem Paga a Fee</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'buyer', label: 'Buyer' },
                    { value: 'seller', label: 'Seller' },
                    { value: 'split', label: 'Split 50/50' },
                  ].map(fp => (
                    <div
                      key={fp.value}
                      className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${form.fee_payer === fp.value ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}
                      onClick={() => update('fee_payer', fp.value)}
                      data-testid={`fee-payer-${fp.value}`}
                    >
                      <div className="text-sm font-medium">{fp.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee Preview */}
              {feePreview && (
                <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400 uppercase">Fee Preview</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] text-muted-foreground">Total Fee</div>
                      <div className="font-semibold text-emerald-400">${feePreview.fee_total?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Buyer</div>
                      <div className="font-medium">${feePreview.fee_buyer?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Seller</div>
                      <div className="font-medium">${feePreview.fee_seller?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Prazo Liquidação (horas)</label>
                  <Input type="number" value={form.settlement_deadline_hours} onChange={(e) => update('settlement_deadline_hours', e.target.value)} className="bg-white/5 border-white/10" data-testid="deadline-input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo Liquidação</label>
                  <select
                    value={form.settlement_type}
                    onChange={(e) => update('settlement_type', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                    data-testid="settlement-type-select"
                  >
                    <option value="crypto_crypto">Crypto &harr; Crypto</option>
                    <option value="stablecoin_crypto">Stablecoin &harr; Crypto</option>
                    <option value="cross_chain">Cross-Chain</option>
                    <option value="crypto_fiat">Crypto &harr; Fiat</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm resize-none"
                  placeholder="Observações internas..."
                  data-testid="notes-textarea"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resumo do Deal</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted-foreground mb-1">Tipo</div>
                  <div className="text-sm font-medium">{DEAL_TYPES.find(d => d.value === form.deal_type)?.label}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] text-muted-foreground mb-1">Estrutura</div>
                  <div className="text-sm font-medium">{form.structure === 'two_sided' ? '2-Sided' : '1-Sided'}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-2">Operação</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">{form.quantity_a} {form.asset_a}</div>
                    <div className="text-xs text-muted-foreground">@ ${parseFloat(form.agreed_price || 0).toLocaleString()}</div>
                  </div>
                  <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
                  <div className="text-right">
                    <div className="text-lg font-bold">{form.quantity_b} {form.asset_b}</div>
                    <div className="text-xs text-muted-foreground">Ticket: ${ticketSize.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="text-[10px] text-blue-400 mb-1">Buyer</div>
                  <div className="text-sm font-medium">{form.buyer_name}</div>
                  <div className="text-[10px] text-muted-foreground">{form.buyer_email || 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="text-[10px] text-amber-400 mb-1">Seller</div>
                  <div className="text-sm font-medium">{form.seller_name}</div>
                  <div className="text-[10px] text-muted-foreground">{form.seller_email || 'N/A'}</div>
                </div>
              </div>

              {feePreview && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 mb-2">Fees</div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total: <strong>${feePreview.fee_total?.toLocaleString()}</strong></span>
                    <span>Buyer: ${feePreview.fee_buyer?.toLocaleString()}</span>
                    <span>Seller: ${feePreview.fee_seller?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="text-[10px] text-muted-foreground mb-1">Prazo de Liquidação</div>
                <div className="text-sm font-medium">{form.settlement_deadline_hours}h</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex items-center justify-between shrink-0">
          <Button
            variant="ghost"
            onClick={() => step === 0 ? onClose() : setStep(step - 1)}
            data-testid="modal-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="modal-next-btn"
            >
              Seguinte <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="modal-submit-btn"
            >
              {submitting ? 'A criar...' : 'Criar Escrow Deal'}
              <Check className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CreateEscrowModal;
