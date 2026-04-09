import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { FormattedNumberInput } from '../../../components/FormattedNumberInput';
import {
  ArrowLeftRight, Calculator, Search, Eye, MoreVertical, TrendingUp,
  Plus, ChevronRight, RefreshCw, Trash2, Edit, Filter, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-600',
  qualification: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  compliance: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  negotiation: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  executing: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  settled: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  closed: 'bg-zinc-500/15 text-zinc-300 border-zinc-600',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const NEXT_STATUS = {
  draft: 'qualification',
  qualification: 'compliance',
  compliance: 'negotiation',
  negotiation: 'approved',
  approved: 'executing',
  executing: 'settled',
  settled: 'closed',
};

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', AED: 'د.إ', BRL: 'R$' };

const OTCDealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);
  const [refPrices, setRefPrices] = useState({});
  const navigate = useNavigate();
  const { t } = useLanguage();

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals`, { headers: getHeaders() });
      if (res.ok) setDeals(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/otc-deals/team-members`, { headers: getHeaders() });
      if (res.ok) setTeamMembers(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchDeals(); fetchTeam(); }, []);

  const advanceStatus = async (dealId, newStatus) => {
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}/status?status=${newStatus}`, {
        method: 'PUT', headers: getHeaders()
      });
      if (res.ok) {
        toast.success(`${t('otc.deals.statusUpdated')} ${t(`otc.deals.statusLabels.${newStatus}`) || newStatus}`);
        fetchDeals();
      } else {
        const err = await res.json();
        toast.error(err.detail || t('otc.deals.errorUpdateStatus'));
      }
    } catch (e) { toast.error(t('otc.deals.connectionError')); }
  };

  const deleteDeal = async (dealId) => {
    if (!window.confirm(t('otc.deals.confirmDelete'))) return;
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) { toast.success(t('otc.deals.dealDeleted')); fetchDeals(); }
    } catch (e) { toast.error(t('otc.deals.errorDelete')); }
  };

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchSearch = !searchTerm || 
        d.deal_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [deals, searchTerm, filterStatus]);

  const fmt = (v, curr = 'EUR') => {
    const sym = CURRENCY_SYMBOLS[curr] || '€';
    return v >= 1000000 ? `${sym}${(v/1000000).toFixed(1)}M` : `${sym}${(v/1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2" data-testid="otc-deals-title">
          <ArrowLeftRight className="text-yellow-500" size={24} />
          {t('otc.deals.title')}
        </h1>
        <Button onClick={() => { setEditingDeal(null); setShowModal(true); }} className="bg-yellow-500 text-black hover:bg-yellow-400 font-semibold" data-testid="new-deal-btn">
          <Plus size={16} className="mr-2" /> {t('otc.deals.newDeal')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('otc.deals.searchPlaceholder')} className="bg-zinc-900 border-zinc-800 text-white pl-10" data-testid="deals-search" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white w-40" data-testid="deals-status-filter">
            <SelectValue placeholder={t('otc.status')} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-white">{t('otc.deals.all')}</SelectItem>
            {Object.keys(STATUS_COLORS).map(k => (
              <SelectItem key={k} value={k} className="text-white">{t(`otc.deals.statusLabels.${k}`) || k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={fetchDeals} className="text-zinc-400 hover:text-white" data-testid="deals-refresh">
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="deals-table">
            <thead>
              <tr className="border-b border-zinc-800">
                {[t('otc.deals.headers.id'), t('otc.deals.headers.client'), t('otc.deals.headers.type'), t('otc.deals.headers.asset'), t('otc.deals.headers.qty'), t('otc.deals.headers.value'), t('otc.deals.headers.gross'), t('otc.deals.headers.net'), t('otc.deals.headers.margin'), t('otc.deals.headers.broker'), t('otc.deals.headers.status'), t('otc.deals.headers.actions')].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-zinc-500">{t('otc.deals.loading')}</td></tr>
              ) : filteredDeals.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-zinc-500">{t('otc.deals.noDeals')}</td></tr>
              ) : filteredDeals.map(deal => {
                const sc = STATUS_COLORS[deal.status] || STATUS_COLORS.draft;
                const curr = deal.reference_currency || 'EUR';
                return (
                  <tr key={deal.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors" data-testid={`deal-row-${deal.id}`}>
                    <td className="px-4 py-3 text-yellow-400 text-sm font-mono">{deal.deal_number}</td>
                    <td className="px-4 py-3 text-white text-sm">{deal.client_name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={deal.deal_type === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}>
                        {deal.deal_type === 'buy' ? t('otc.deals.buy') : t('otc.deals.sell')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{deal.asset}</td>
                    <td className="px-4 py-3 text-zinc-300 text-sm">{deal.quantity?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{fmt(deal.total_value, curr)}</td>
                    <td className="px-4 py-3 text-yellow-400 text-sm">{deal.gross_pct}%</td>
                    <td className="px-4 py-3 text-zinc-400 text-sm">{deal.net_pct}%</td>
                    <td className="px-4 py-3 text-emerald-400 text-sm font-medium">{fmt(deal.kbex_margin, curr)}</td>
                    <td className="px-4 py-3 text-zinc-300 text-sm">{deal.broker_name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge 
                        className={`${sc} text-xs border ${['compliance', 'qualification'].includes(deal.status) ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => ['compliance', 'qualification'].includes(deal.status) ? navigate(`/dashboard/crm/compliance/${deal.id}`) : null}
                        data-testid={`status-badge-${deal.id}`}
                      >
                        {t(`otc.deals.statusLabels.${deal.status}`) || deal.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {NEXT_STATUS[deal.status] && (
                          <Button variant="ghost" size="sm" className="text-yellow-500 hover:text-yellow-400 p-1" title={`${t('otc.deals.advanceTo')} ${t(`otc.deals.statusLabels.${NEXT_STATUS[deal.status]}`) || ''}`} onClick={() => advanceStatus(deal.id, NEXT_STATUS[deal.status])} data-testid={`advance-${deal.id}`}>
                            <ChevronRight size={16} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300 p-1.5 hover:bg-purple-500/10 rounded" title={t('otc.deals.forensicCompliance')} onClick={() => navigate(`/dashboard/crm/compliance/${deal.id}`)} data-testid={`compliance-${deal.id}`}>
                          <Shield size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white p-1" title={t('otc.deals.edit')} onClick={() => { setEditingDeal(deal); setShowModal(true); }} data-testid={`edit-${deal.id}`}>
                          <Edit size={14} />
                        </Button>
                        {deal.status === 'draft' && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 p-1" title={t('otc.deals.delete')} onClick={() => deleteDeal(deal.id)} data-testid={`delete-${deal.id}`}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <DealModal
        open={showModal}
        onClose={() => setShowModal(false)}
        deal={editingDeal}
        teamMembers={teamMembers}
        onSaved={() => { setShowModal(false); fetchDeals(); }}
      />
    </div>
  );
};

// ============ DEAL MODAL ============
const DealModal = ({ open, onClose, deal, teamMembers, onSaved }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    deal_type: 'buy', asset: 'BTC', quantity: 100, reference_price: 58200,
    reference_currency: 'EUR', condition: 'premium', condition_pct: 2,
    gross_pct: 4, net_pct: 2, broker_id: '', broker_name: '', broker_type: 'internal',
    member_id: '', member_name: '', broker_share_pct: 50, commission_currency: 'EUR',
    client_name: '', client_email: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [livePrice, setLivePrice] = useState(null);
  const [otcClients, setOtcClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  // Fetch OTC clients
  useEffect(() => {
    if (!open) return;
    const fetchClients = async () => {
      try {
        const res = await fetch(`${API}/api/otc/clients`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOtcClients(data.clients || data || []);
        }
      } catch (e) { console.error('Failed to fetch OTC clients:', e); }
    };
    fetchClients();
  }, [open]);

  useEffect(() => {
    if (deal) {
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
        notes: deal.notes || ''
      });
    } else {
      setForm(f => ({ ...f, reference_price: 58200 }));
    }
  }, [deal, open]);

  // Fetch live price
  useEffect(() => {
    if (!open) return;
    const fetchPrice = async () => {
      try {
        const res = await fetch(`${API}/api/otc-deals/reference-price/${form.asset}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setLivePrice(data);
          if (!deal) {
            const priceKey = `price_${form.reference_currency.toLowerCase()}`;
            setForm(f => ({ ...f, reference_price: data[priceKey] || data.price_eur || 0 }));
          }
        }
      } catch (e) { console.error(e); }
    };
    fetchPrice();
  }, [form.asset, form.reference_currency, open]);

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
    const decimals = forceDecimals != null ? forceDecimals : (abs < 10 ? 6 : 4);
    const parts = (v || 0).toFixed(decimals).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sym}${intPart}.${parts[1]}`;
  };

  // Pair toggle state: 'unit' = price per asset unit, 'pair' = inverted pair rate
  const [priceView, setPriceView] = useState('unit');

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = deal ? `${API}/api/otc-deals/deals/${deal.id}` : `${API}/api/otc-deals/deals`;
      const method = deal ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      if (res.ok) {
        toast.success(deal ? t('otc.deals.modal.dealUpdated') : t('otc.deals.modal.dealCreated'));
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.detail || t('otc.deals.modal.errorSaving'));
      }
    } catch (e) { toast.error(t('otc.deals.connectionError')); }
    finally { setSaving(false); }
  };

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="text-yellow-500" size={20} />
            {deal ? t('otc.deals.modal.editTitle') : t('otc.deals.modal.createTitle')}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">{t('otc.deals.modal.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Deal Type */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.dealType')}</Label>
              <div className="flex rounded-lg overflow-hidden border border-zinc-800" data-testid="modal-deal-type">
                <button onClick={() => updateField('deal_type', 'buy')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.deal_type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>
                  {t('otc.deals.buyClient')}
                </button>
                <button onClick={() => updateField('deal_type', 'sell')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.deal_type === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>
                  {t('otc.deals.sellSupplier')}
                </button>
              </div>
            </div>

            {/* Client - OTC Client Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 relative">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.clientName')}</Label>
                <Input
                  value={form.client_name}
                  onChange={e => {
                    updateField('client_name', e.target.value);
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  placeholder="Pesquisar cliente OTC..."
                  className="bg-zinc-900 border-zinc-800 text-white"
                  data-testid="modal-client-name"
                  autoComplete="off"
                />
                {showClientDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {otcClients
                      .filter(c => {
                        const term = (clientSearch || form.client_name || '').toLowerCase();
                        if (!term) return true;
                        return (c.entity_name || c.contact_name || '').toLowerCase().includes(term) ||
                               (c.contact_email || '').toLowerCase().includes(term);
                      })
                      .slice(0, 10)
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                          data-testid={`client-option-${c.id}`}
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
                    {otcClients.filter(c => {
                      const term = (clientSearch || form.client_name || '').toLowerCase();
                      if (!term) return true;
                      return (c.entity_name || c.contact_name || '').toLowerCase().includes(term) ||
                             (c.contact_email || '').toLowerCase().includes(term);
                    }).length === 0 && (
                      <p className="px-3 py-2 text-zinc-500 text-xs">Nenhum cliente encontrado</p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.email')}</Label>
                <Input value={form.client_email} onChange={e => updateField('client_email', e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-client-email" readOnly />
              </div>
            </div>

            {/* Asset, Qty, Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.asset')}</Label>
                <Select value={form.asset} onValueChange={v => updateField('asset', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-asset"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['BTC', 'ETH', 'USDT', 'USDC'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.quantity')}</Label>
                <FormattedNumberInput value={form.quantity} onChange={v => updateField('quantity', parseFloat(v) || 0)} className="bg-zinc-900 border-zinc-800 text-white" placeholder="100 000" data-testid="modal-quantity" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.refCurrency')}</Label>
                <Select value={form.reference_currency} onValueChange={v => updateField('reference_currency', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-currency"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['EUR', 'USD', 'AED', 'BRL'].map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference Price with Fiat/Crypto toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.refPrice')}</Label>
                <div className="flex bg-zinc-800 rounded-full p-0.5" data-testid="price-view-toggle">
                  <button
                    type="button"
                    onClick={() => setPriceView('unit')}
                    className={`px-3 py-1 text-xs rounded-full transition-all font-medium ${
                      priceView === 'unit'
                        ? 'bg-gold-600/80 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    data-testid="price-view-unit"
                  >
                    {form.reference_currency}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceView('pair')}
                    className={`px-3 py-1 text-xs rounded-full transition-all font-medium ${
                      priceView === 'pair'
                        ? 'bg-gold-600/80 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    data-testid="price-view-pair"
                  >
                    {form.asset}
                  </button>
                </div>
              </div>
              {priceView === 'unit' ? (
                <div>
                  <div className="relative">
                    <FormattedNumberInput value={form.reference_price} onChange={v => updateField('reference_price', parseFloat(v) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-36" placeholder="0.8654" data-testid="modal-ref-price" />
                    {livePrice && (() => {
                      const rawPrice = livePrice[`price_${form.reference_currency.toLowerCase()}`] || livePrice.price_eur || 0;
                      const fixedParts = rawPrice.toFixed(4).split('.');
                      const intFormatted = fixedParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                      return (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1 cursor-pointer" onClick={() => {
                          updateField('reference_price', rawPrice);
                        }}>
                          <TrendingUp size={12} /> KBEX: {sym}{intFormatted}.{fixedParts[1]}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      value={form.reference_price > 0 ? (1 / form.reference_price).toFixed(6) : ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        if (val && val > 0) updateField('reference_price', 1 / val);
                      }}
                      className="bg-zinc-900 border-zinc-800 text-white pr-36"
                      placeholder="1.1685"
                      data-testid="modal-pair-rate"
                    />
                    {livePrice && (() => {
                      const pk = `price_${form.reference_currency.toLowerCase()}`;
                      const up = livePrice[pk] || livePrice.price_eur || 0;
                      return up > 0 ? (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1 cursor-pointer" onClick={() => updateField('reference_price', up)}>
                          <TrendingUp size={12} /> KBEX: {(1 / up).toFixed(6)}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.condition')}</Label>
              <div className="flex gap-3">
                <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                  <button onClick={() => updateField('condition', 'premium')} className={`px-4 py-2 text-sm font-medium ${form.condition === 'premium' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500'}`}>{t('otc.deals.modal.premium')}</button>
                  <button onClick={() => updateField('condition', 'discount')} className={`px-4 py-2 text-sm font-medium ${form.condition === 'discount' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500'}`}>{t('otc.deals.modal.discount')}</button>
                </div>
                <div className="relative flex-1">
                  <Input type="number" step="any" value={form.condition_pct} onChange={e => updateField('condition_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" data-testid="modal-condition-pct" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Gross/Net */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.gross')}</Label>
                <div className="relative">
                  <Input type="number" step="any" value={form.gross_pct} onChange={e => updateField('gross_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" data-testid="modal-gross" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.net')}</Label>
                <div className="relative">
                  <Input type="number" step="any" value={form.net_pct} onChange={e => updateField('net_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" data-testid="modal-net" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Broker & Member */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.broker')}</Label>
                <Select value={form.broker_id || '_none'} onValueChange={v => {
                  if (v === '_none') { updateField('broker_id', ''); updateField('broker_name', ''); return; }
                  const m = teamMembers.find(t => t.id === v);
                  updateField('broker_id', v); updateField('broker_name', m?.name || ''); updateField('broker_type', 'internal');
                }}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-broker"><SelectValue placeholder={t('otc.deals.modal.select')} /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="_none" className="text-zinc-500">{t('otc.deals.modal.none')}</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.kbexBroker')}</Label>
                <Select value={form.member_id || '_none'} onValueChange={v => {
                  if (v === '_none') { updateField('member_id', ''); updateField('member_name', ''); return; }
                  const m = teamMembers.find(t => t.id === v);
                  updateField('member_id', v); updateField('member_name', m?.name || '');
                }}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-member"><SelectValue placeholder={t('otc.deals.modal.select')} /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="_none" className="text-zinc-500">{t('otc.deals.modal.none')}</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broker share & Commission currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.brokerMargin')}</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input type="number" step="any" value={form.broker_share_pct} onChange={e => updateField('broker_share_pct', Math.min(100, parseFloat(e.target.value) || 0))} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="5" data-testid="modal-broker-share" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                  </div>
                  <span className="text-zinc-500 text-xs whitespace-nowrap">KBEX: {100 - form.broker_share_pct}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">{t('otc.deals.modal.commCurrency')}</Label>
                <Select value={form.commission_currency} onValueChange={v => updateField('commission_currency', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-comm-currency"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['EUR', 'USD', 'BTC', 'ETH', 'USDT', 'USDC'].map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calculator */}
          <div className="lg:col-span-1">
            <Card className="bg-zinc-900 border-yellow-500/30 shadow-lg shadow-yellow-500/5 sticky top-4" data-testid="modal-calculator">
              <CardHeader className="pb-2">
                <CardTitle className="text-yellow-500 flex items-center gap-2 text-base"><Calculator size={16} />{t('otc.deals.modal.calculator')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {priceView === 'pair' ? (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">Par {form.reference_currency}/{form.asset}</span>
                        <span className="text-white font-mono">{form.reference_price > 0 ? (1 / form.reference_price).toPrecision(6) : '—'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">{t('otc.deals.modal.adjPrice')} ({form.condition === 'premium' ? '+' : '-'}{form.condition_pct}%)</span>
                        <span className="text-white font-medium font-mono">{calc.adj > 0 ? (1 / calc.adj).toPrecision(6) : '—'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">Preço Ref. (1 {form.asset})</span>
                        <span className="text-white font-mono">{fmtVal(form.reference_price)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-zinc-800">
                        <span className="text-zinc-500">{t('otc.deals.modal.adjPrice')} ({form.condition === 'premium' ? '+' : '-'}{form.condition_pct}%)</span>
                        <span className="text-white font-medium">{fmtVal(calc.adj)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.totalValue')}</span>
                    <span className="text-white font-bold">{fmtVal(calc.total)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.gross')} ({form.gross_pct}%)</span>
                    <span className="text-yellow-400 font-medium">{fmtVal(calc.gross)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">{t('otc.deals.modal.net')} ({form.net_pct}%)</span>
                    <span className="text-zinc-300">{fmtVal(calc.net)}</span>
                  </div>
                </div>

                {/* MARGEM CORRETORES */}
                <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-3 space-y-2">
                  <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">Margem Corretores</p>
                  <p className="text-xl font-bold text-white">{fmtVal(calc.margin)}</p>
                  <p className="text-zinc-500 text-xs">Gross - Net = {form.gross_pct}% - {form.net_pct}% = {calc.commissionPct.toFixed(1)}%</p>
                  <div className="space-y-1.5 pt-2 border-t border-zinc-700/30 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t('otc.deals.modal.broker')} ({calc.brokerPct.toFixed(1)}%)</span>
                      <span className="text-emerald-400 font-medium">{fmtVal(calc.brokerComm)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">{t('otc.deals.modal.kbexBroker')} ({calc.kbexBrokerPct.toFixed(1)}%)</span>
                      <span className="text-emerald-400 font-medium">{fmtVal(calc.memberComm)}</span>
                    </div>
                  </div>
                </div>

                {/* RECEITA KBEX */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-1">
                  <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">Receita KBEX</p>
                  <p className="text-xl font-bold text-white">{fmtVal(calc.net)}</p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-5 mt-2" data-testid="modal-save-btn">
                  {saving ? t('otc.deals.modal.saving') : deal ? t('otc.deals.modal.update') : t('otc.deals.modal.create')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTCDealsPage;
