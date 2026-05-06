/**
 * Shared OTC Deal Modal — used by:
 *  - /dashboard/crm/otc-deals (Create / Edit Deal)
 *  - /dashboard/otc/quotes    (Create Quotation from RFQ)
 *
 * mode:
 *   'deal'  → standard create/edit deal (POST or PUT /api/otc-deals/deals)
 *   'quote' → create deal-quote pair (PUT existing deal + POST /api/otc/quotes)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { FormattedNumberInput } from '../FormattedNumberInput';
import { ArrowLeftRight, Calculator, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../i18n';

const API = process.env.REACT_APP_BACKEND_URL;
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', AED: 'د.إ', BRL: 'R$' };

const getHeaders = () => {
  const token = sessionStorage.getItem('kryptobox_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
};

const OTCDealModal = ({
  open,
  onClose,
  deal,                  // existing deal to edit (mode='deal') OR RFQ deal (mode='quote')
  teamMembers = [],
  onSaved,
  mode = 'deal',
}) => {
  const { t } = useLanguage();
  const isQuoteMode = mode === 'quote';

  const [form, setForm] = useState({
    deal_type: 'buy', asset: 'BTC', quantity: 100, reference_price: 0,
    reference_currency: 'EUR', condition: 'premium', condition_pct: 2,
    gross_pct: 4, net_pct: 2, broker_id: '', broker_name: '', broker_type: 'internal',
    member_id: '', member_name: '', broker_share_pct: 50, commission_currency: 'EUR',
    client_name: '', client_email: '', notes: '',
    // quote-only fields (defaults — section removed; formulas unified with deal mode)
    spread_percent: 0, fees: 0, valid_for_minutes: 60,
  });
  const [saving, setSaving] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [otcClients, setOtcClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [priceView, setPriceView] = useState('unit');

  // Fetch OTC clients (deal mode only)
  useEffect(() => {
    if (!open || isQuoteMode) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/otc/clients`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOtcClients(data.clients || data || []);
        }
      } catch { /* ignore */ }
    })();
  }, [open, isQuoteMode]);

  // Initialise form from passed-in deal
  useEffect(() => {
    if (!open) return;
    if (isQuoteMode && deal) {
      // RFQ deal — has base_asset, quote_asset, amount, transaction_type, client_*
      setForm(f => ({
        ...f,
        deal_type: deal.transaction_type === 'sell' ? 'sell' : 'buy',
        asset: deal.base_asset || 'BTC',
        quantity: deal.amount || 0,
        reference_currency: deal.quote_asset || 'EUR',
        commission_currency: deal.quote_asset || 'EUR',
        client_name: deal.client_name || '',
        client_email: deal.client_email || '',
        reference_price: 0,
        spread_percent: 0, fees: 0, valid_for_minutes: 60, notes: '',
      }));
    } else if (deal) {
      setForm({
        deal_type: deal.deal_type || 'buy', asset: deal.asset || 'BTC',
        quantity: deal.quantity || 0, reference_price: deal.reference_price || 0,
        reference_currency: deal.reference_currency || 'EUR',
        condition: deal.condition || 'premium', condition_pct: deal.condition_pct || 0,
        gross_pct: deal.gross_pct || 0, net_pct: deal.net_pct || 0,
        broker_id: deal.broker_id || '', broker_name: deal.broker_name || '',
        broker_type: deal.broker_type || 'internal',
        member_id: deal.member_id || '', member_name: deal.member_name || '',
        broker_share_pct: deal.broker_share_pct || 50,
        commission_currency: deal.commission_currency || 'EUR',
        client_name: deal.client_name || '', client_email: deal.client_email || '',
        notes: deal.notes || '',
        spread_percent: 0, fees: 0, valid_for_minutes: 60,
      });
    } else {
      setForm(f => ({ ...f, reference_price: 58200 }));
    }
  }, [deal, open, isQuoteMode]);

  // Fetch live reference price
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/otc-deals/reference-price/${form.asset}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLivePrice(data);
          // Pre-fill price for new deals AND for quote mode (RFQ)
          if (!deal || isQuoteMode) {
            const priceKey = `price_${form.reference_currency.toLowerCase()}`;
            const newPrice = data[priceKey] || data.price_eur || 0;
            setForm(f => f.reference_price === 0 ? { ...f, reference_price: newPrice } : f);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [form.asset, form.reference_currency, open, deal, isQuoteMode]);

  const calc = useMemo(() => {
    const p = form.reference_price;
    const adj = form.condition === 'premium' ? p * (1 + form.condition_pct / 100) : p * (1 - form.condition_pct / 100);
    const total = form.quantity * adj;
    const gross = total * (form.gross_pct / 100);
    const net = total * (form.net_pct / 100);
    const margin = gross - net;
    const commissionPct = form.gross_pct - form.net_pct;
    const brokerPct = commissionPct * (form.broker_share_pct / 100);
    const kbexBrokerPct = commissionPct - brokerPct;
    const brokerComm = margin * (form.broker_share_pct / 100);
    const memberComm = margin - brokerComm;
    return { adj, total, gross, net, margin, brokerComm, memberComm, commissionPct, brokerPct, kbexBrokerPct };
  }, [form]);

  const sym = CURRENCY_SYMBOLS[form.reference_currency] || '€';
  const fmtVal = (v, forceDecimals) => {
    const abs = Math.abs(v || 0);
    const decimals = forceDecimals != null ? forceDecimals : (abs < 10 ? 4 : 2);
    const parts = (v || 0).toFixed(decimals).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sym}${intPart}.${parts[1]}`;
  };

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isQuoteMode) {
        // Quote mode: 1) PUT deal with negotiated terms 2) POST quote
        const dealUpdate = {
          reference_price: form.reference_price,
          reference_currency: form.reference_currency,
          condition: form.condition,
          condition_pct: form.condition_pct,
          gross_pct: form.gross_pct,
          net_pct: form.net_pct,
          broker_id: form.broker_id,
          broker_name: form.broker_name,
          broker_type: form.broker_type,
          member_id: form.member_id,
          member_name: form.member_name,
          broker_share_pct: form.broker_share_pct,
          commission_currency: form.commission_currency,
          total_value: calc.total,
          adjusted_price: calc.adj,
          notes: form.notes,
        };
        const resDeal = await fetch(`${API}/api/otc-deals/deals/${deal.id}`, {
          method: 'PUT', headers: getHeaders(), body: JSON.stringify(dealUpdate),
        });
        if (!resDeal.ok) throw new Error((await resDeal.json()).detail || 'Failed to update deal');

        const quotePayload = {
          deal_id: deal.id,
          spread_percent: form.spread_percent,
          fees: form.fees,
          valid_for_minutes: form.valid_for_minutes,
          is_manual: true,
          market_price: calc.adj,
        };
        const resQuote = await fetch(`${API}/api/otc/quotes`, {
          method: 'POST', headers: getHeaders(), body: JSON.stringify(quotePayload),
        });
        if (!resQuote.ok) throw new Error((await resQuote.json()).detail || 'Failed to create quote');

        toast.success(t('otc.quotes.createdAndSent', 'Negociação criada e cotação enviada ao cliente!'));
        onSaved && onSaved();
      } else {
        // Deal mode: standard create or update
        const url = deal ? `${API}/api/otc-deals/deals/${deal.id}` : `${API}/api/otc-deals/deals`;
        const method = deal ? 'PUT' : 'POST';
        const payload = { ...form };
        delete payload.spread_percent;
        delete payload.fees;
        delete payload.valid_for_minutes;
        const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) throw new Error((await res.json()).detail || t('otc.deals.modal.errorSaving', 'Erro ao guardar'));
        toast.success(deal ? t('otc.deals.modal.dealUpdated', 'Negociação atualizada') : t('otc.deals.modal.dealCreated', 'Negociação criada'));
        onSaved && onSaved();
      }
    } catch (e) {
      toast.error(e.message || t('otc.deals.connectionError', 'Erro de conexão'));
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = isQuoteMode
    ? t('otc.quotes.createTitle', 'Criar Cotação')
    : (deal ? t('otc.deals.modal.editTitle', 'Editar Negociação') : t('otc.deals.modal.createTitle', 'Criar Negociação'));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="text-yellow-500" size={20} />
            {dialogTitle}
            {isQuoteMode && deal?.deal_number && (
              <span className="text-zinc-500 text-sm font-mono ml-2">{deal.deal_number}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isQuoteMode
              ? t('otc.quotes.subtitle', 'Configure as condições, spread e validade. A negociação será atualizada e a cotação enviada ao cliente.')
              : t('otc.deals.modal.subtitle', 'Configure todos os parâmetros da negociação')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Deal Type */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.dealType', 'Tipo de Negociação')}</Label>
              <div className="flex rounded-lg overflow-hidden border border-zinc-800" data-testid="modal-deal-type">
                <button onClick={() => !isQuoteMode && updateField('deal_type', 'buy')} disabled={isQuoteMode} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.deal_type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'} ${isQuoteMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {t('otc.deals.buyClient', 'Comprar (Cliente)')}
                </button>
                <button onClick={() => !isQuoteMode && updateField('deal_type', 'sell')} disabled={isQuoteMode} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.deal_type === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'} ${isQuoteMode ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {t('otc.deals.sellSupplier', 'Vender (Fornecedor)')}
                </button>
              </div>
            </div>

            {/* Client */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 relative">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.clientName', 'Nome do Cliente')}</Label>
                <Input
                  value={form.client_name}
                  onChange={e => {
                    if (isQuoteMode) return;
                    updateField('client_name', e.target.value);
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => !isQuoteMode && setShowClientDropdown(true)}
                  placeholder={t('otc.deals.modal.clientSearchPh', 'Pesquisar cliente OTC...')}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  readOnly={isQuoteMode}
                  data-testid="modal-client-name"
                  autoComplete="off"
                />
                {!isQuoteMode && showClientDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {otcClients
                      .filter(c => {
                        const term = (clientSearch || form.client_name || '').toLowerCase();
                        if (!term) return true;
                        return (c.entity_name || c.contact_name || '').toLowerCase().includes(term)
                          || (c.contact_email || '').toLowerCase().includes(term);
                      })
                      .slice(0, 10)
                      .map(c => (
                        <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                          onClick={() => {
                            updateField('client_name', c.entity_name || c.contact_name || '');
                            updateField('client_email', c.contact_email || '');
                            setShowClientDropdown(false);
                            setClientSearch('');
                          }}
                        >
                          <p className="text-white text-sm font-medium">{c.entity_name || c.contact_name}</p>
                          <p className="text-zinc-500 text-xs">{c.contact_email}</p>
                        </button>
                      ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.email', 'Email')}</Label>
                <Input value={form.client_email} onChange={e => updateField('client_email', e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-client-email" readOnly />
              </div>
            </div>

            {/* Asset, Qty, Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.asset', 'Ativo')}</Label>
                <Select value={form.asset} onValueChange={v => !isQuoteMode && updateField('asset', v)} disabled={isQuoteMode}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-asset"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['BTC', 'ETH', 'USDT', 'USDC'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.quantity', 'Quantidade')}</Label>
                <FormattedNumberInput value={form.quantity} onChange={v => !isQuoteMode && updateField('quantity', parseFloat(v) || 0)} className="bg-zinc-900 border-zinc-800 text-white" placeholder="100 000" data-testid="modal-quantity" readOnly={isQuoteMode} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.refCurrency', 'Moeda Ref.')}</Label>
                <Select value={form.reference_currency} onValueChange={v => updateField('reference_currency', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-currency"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['EUR', 'USD', 'AED', 'BRL'].map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference Price */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.refPrice', 'Preço de Referência')}</Label>
                <div className="flex bg-zinc-800 rounded-full p-0.5">
                  <button type="button" onClick={() => setPriceView('unit')} className={`px-3 py-1 text-xs rounded-full transition-all font-medium ${priceView === 'unit' ? 'bg-gold-600/80 text-white' : 'text-gray-400 hover:text-white'}`}>{form.reference_currency}</button>
                  <button type="button" onClick={() => setPriceView('pair')} className={`px-3 py-1 text-xs rounded-full transition-all font-medium ${priceView === 'pair' ? 'bg-gold-600/80 text-white' : 'text-gray-400 hover:text-white'}`}>{form.asset}</button>
                </div>
              </div>
              {priceView === 'unit' ? (
                <div className="relative">
                  <FormattedNumberInput value={form.reference_price} onChange={v => updateField('reference_price', parseFloat(v) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-36" placeholder="0.8654" data-testid="modal-ref-price" />
                  {livePrice && (() => {
                    const rawPrice = livePrice[`price_${form.reference_currency.toLowerCase()}`] || livePrice.price_eur || 0;
                    const fixedParts = rawPrice.toFixed(4).split('.');
                    const intFormatted = fixedParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                    return (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1 cursor-pointer" onClick={() => updateField('reference_price', rawPrice)}>
                        <TrendingUp size={12} /> KBEX: {sym}{intFormatted}.{fixedParts[1]}
                      </span>
                    );
                  })()}
                </div>
              ) : (
                <div className="relative">
                  <Input type="number" step="any" value={form.reference_price > 0 ? (1 / form.reference_price).toFixed(6) : ''} onChange={e => { const val = parseFloat(e.target.value); if (val > 0) updateField('reference_price', 1 / val); }} className="bg-zinc-900 border-zinc-800 text-white pr-36" placeholder="1.1685" />
                </div>
              )}
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.condition', 'Condição')}</Label>
              <div className="flex gap-3">
                <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                  <button onClick={() => updateField('condition', 'premium')} className={`px-4 py-2 text-sm font-medium ${form.condition === 'premium' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500'}`}>{t('otc.deals.modal.premium', 'Prémio')}</button>
                  <button onClick={() => updateField('condition', 'discount')} className={`px-4 py-2 text-sm font-medium ${form.condition === 'discount' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500'}`}>{t('otc.deals.modal.discount', 'Desconto')}</button>
                </div>
                <div className="relative flex-1">
                  <Input type="number" value={form.condition_pct} onChange={e => updateField('condition_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Gross/Net */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.gross', 'Bruto')}</Label>
                <div className="relative">
                  <Input type="number" value={form.gross_pct} onChange={e => updateField('gross_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.net', 'Líquido')}</Label>
                <div className="relative">
                  <Input type="number" value={form.net_pct} onChange={e => updateField('net_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Broker & Member */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.broker', 'Broker')}</Label>
                <Select value={form.broker_id || '_none'} onValueChange={v => {
                  if (v === '_none') { updateField('broker_id', ''); updateField('broker_name', ''); return; }
                  const m = teamMembers.find(tm => tm.id === v);
                  updateField('broker_id', v); updateField('broker_name', m?.name || ''); updateField('broker_type', 'internal');
                }}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue placeholder={t('otc.deals.modal.select', 'Selecionar')} /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="_none" className="text-zinc-500">{t('otc.deals.modal.none', 'Nenhum')}</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.kbexBroker', 'Broker KBEX')}</Label>
                <Select value={form.member_id || '_none'} onValueChange={v => {
                  if (v === '_none') { updateField('member_id', ''); updateField('member_name', ''); return; }
                  const m = teamMembers.find(tm => tm.id === v);
                  updateField('member_id', v); updateField('member_name', m?.name || '');
                }}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue placeholder={t('otc.deals.modal.select', 'Selecionar')} /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="_none" className="text-zinc-500">{t('otc.deals.modal.none', 'Nenhum')}</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broker share & Commission currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.brokerMargin', 'Margem Broker')}</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input type="number" value={form.broker_share_pct} onChange={e => updateField('broker_share_pct', Math.min(100, parseFloat(e.target.value) || 0))} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="5" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                  </div>
                  <span className="text-zinc-500 text-xs whitespace-nowrap">KBEX: {100 - form.broker_share_pct}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.commCurrency', 'Moeda Comissão')}</Label>
                <Select value={form.commission_currency} onValueChange={v => updateField('commission_currency', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['EUR', 'USD', 'BTC', 'ETH', 'USDT', 'USDC'].map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quote-only fields removed — formulas unified with deal mode (defaults: spread=0, fees=0, validFor=60min) */}
          </div>

          {/* Calculator */}
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900 border-yellow-500/30 shadow-lg shadow-yellow-500/5 sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-yellow-500 flex items-center gap-2 text-base"><Calculator size={16} />{t('otc.deals.modal.calculator', 'Calculadora')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.refPriceUnit', 'Preço Ref.')} (1 {form.asset})</span>
                    <span className="text-white font-mono">{fmtVal(form.reference_price)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.adjPrice', 'Preço Ajust.')} ({form.condition === 'premium' ? '+' : '-'}{form.condition_pct}%)</span>
                    <span className="text-white font-medium">{fmtVal(calc.adj)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.totalValue', 'Valor Total')}</span>
                    <span className="text-white font-bold">{fmtVal(calc.total)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.gross', 'Bruto')} ({form.gross_pct}%)</span>
                    <span className="text-yellow-400 font-medium">{fmtVal(calc.gross)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.net', 'Líquido')} ({form.net_pct}%)</span>
                    <span className="text-zinc-300">{fmtVal(calc.net)}</span>
                  </div>
                </div>

                <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-3 space-y-2">
                  <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">{t('otc.deals.modal.brokerMarginCard', 'Margem Corretores')}</p>
                  <p className="text-xl font-bold text-white">{fmtVal(calc.margin)}</p>
                  <p className="text-zinc-500 text-xs">{t('otc.deals.modal.commissionFormula', 'Gross - Net')} = {form.gross_pct}% - {form.net_pct}% = {calc.commissionPct.toFixed(1)}%</p>
                  <div className="space-y-1.5 pt-2 border-t border-zinc-700/30 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-400 whitespace-nowrap">{t('otc.deals.modal.broker', 'Broker')} ({calc.brokerPct.toFixed(1)}%)</span>
                      <span className="text-emerald-400 font-medium whitespace-nowrap">{fmtVal(calc.brokerComm)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-400 whitespace-nowrap">{t('otc.deals.modal.kbexBroker', 'Broker KBEX')} ({calc.kbexBrokerPct.toFixed(1)}%)</span>
                      <span className="text-emerald-400 font-medium whitespace-nowrap">{fmtVal(calc.memberComm)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-1">
                  <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">{t('otc.deals.modal.kbexRevenue', 'Receita KBEX')}</p>
                  <p className="text-xl font-bold text-white">{fmtVal(calc.net)}</p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-5 mt-2" data-testid="modal-save-btn">
                  {saving
                    ? t('otc.deals.modal.saving', 'A guardar...')
                    : isQuoteMode
                      ? t('otc.quotes.sendQuote', 'Enviar Cotação')
                      : (deal ? t('otc.deals.modal.update', 'Atualizar') : t('otc.deals.modal.create', 'Criar'))}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTCDealModal;
