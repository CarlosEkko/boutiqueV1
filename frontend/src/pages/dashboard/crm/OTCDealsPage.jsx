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

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-600' },
  qualification: { label: 'Qualificação', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  compliance: { label: 'Compliance', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  negotiation: { label: 'Negociação', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  executing: { label: 'Executando', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  settled: { label: 'Liquidado', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  closed: { label: 'Fechado', color: 'bg-zinc-500/15 text-zinc-300 border-zinc-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
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
        toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label}`);
        fetchDeals();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao atualizar status');
      }
    } catch (e) { toast.error('Erro de conexão'); }
  };

  const deleteDeal = async (dealId) => {
    if (!window.confirm('Eliminar este negócio?')) return;
    try {
      const res = await fetch(`${API}/api/otc-deals/deals/${dealId}`, { method: 'DELETE', headers: getHeaders() });
      if (res.ok) { toast.success('Negócio eliminado'); fetchDeals(); }
    } catch (e) { toast.error('Erro ao eliminar'); }
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
          Negócios OTC
        </h1>
        <Button onClick={() => { setEditingDeal(null); setShowModal(true); }} className="bg-yellow-500 text-black hover:bg-yellow-400 font-semibold" data-testid="new-deal-btn">
          <Plus size={16} className="mr-2" /> Novo Negócio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar por ID, cliente..." className="bg-zinc-900 border-zinc-800 text-white pl-10" data-testid="deals-search" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white w-40" data-testid="deals-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-white">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
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
                {['ID', 'Cliente/Fornecedor', 'Tipo', 'Ativo', 'Qtd', 'Valor', 'Gross', 'Net', 'Margem', 'Corretor', 'Status', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-zinc-500 text-xs uppercase tracking-wider font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-zinc-500">A carregar...</td></tr>
              ) : filteredDeals.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-zinc-500">Sem negócios</td></tr>
              ) : filteredDeals.map(deal => {
                const sc = STATUS_CONFIG[deal.status] || STATUS_CONFIG.draft;
                const curr = deal.reference_currency || 'EUR';
                return (
                  <tr key={deal.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors" data-testid={`deal-row-${deal.id}`}>
                    <td className="px-4 py-3 text-yellow-400 text-sm font-mono">{deal.deal_number}</td>
                    <td className="px-4 py-3 text-white text-sm">{deal.client_name || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge className={deal.deal_type === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}>
                        {deal.deal_type === 'buy' ? 'Compra' : 'Venda'}
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
                        className={`${sc.color} text-xs border ${['compliance', 'qualification'].includes(deal.status) ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => ['compliance', 'qualification'].includes(deal.status) ? navigate(`/dashboard/crm/compliance/${deal.id}`) : null}
                        data-testid={`status-badge-${deal.id}`}
                      >
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {NEXT_STATUS[deal.status] && (
                          <Button variant="ghost" size="sm" className="text-yellow-500 hover:text-yellow-400 p-1" title={`Avançar para ${STATUS_CONFIG[NEXT_STATUS[deal.status]]?.label}`} onClick={() => advanceStatus(deal.id, NEXT_STATUS[deal.status])} data-testid={`advance-${deal.id}`}>
                            <ChevronRight size={16} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300 p-1.5 hover:bg-purple-500/10 rounded" title="Compliance Forense" onClick={() => navigate(`/dashboard/crm/compliance/${deal.id}`)} data-testid={`compliance-${deal.id}`}>
                          <Shield size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white p-1" title="Editar" onClick={() => { setEditingDeal(deal); setShowModal(true); }} data-testid={`edit-${deal.id}`}>
                          <Edit size={14} />
                        </Button>
                        {deal.status === 'draft' && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 p-1" title="Eliminar" onClick={() => deleteDeal(deal.id)} data-testid={`delete-${deal.id}`}>
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
  const [form, setForm] = useState({
    deal_type: 'buy', asset: 'BTC', quantity: 100, reference_price: 58200,
    reference_currency: 'EUR', condition: 'premium', condition_pct: 2,
    gross_pct: 4, net_pct: 2, broker_id: '', broker_name: '', broker_type: 'internal',
    member_id: '', member_name: '', broker_share_pct: 50, commission_currency: 'EUR',
    client_name: '', client_email: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [livePrice, setLivePrice] = useState(null);

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

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
    const brokerComm = margin * (form.broker_share_pct / 100);
    const memberComm = margin - brokerComm;
    return { adj, total, gross, net, margin, brokerComm, memberComm };
  }, [form]);

  const sym = CURRENCY_SYMBOLS[form.reference_currency] || '€';
  const fmtVal = v => {
    const parts = v.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sym}${intPart}.${parts[1]}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = deal ? `${API}/api/otc-deals/deals/${deal.id}` : `${API}/api/otc-deals/deals`;
      const method = deal ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      if (res.ok) {
        toast.success(deal ? 'Negócio atualizado' : 'Negócio criado');
        onSaved();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao gravar');
      }
    } catch (e) { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  };

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="text-yellow-500" size={20} />
            {deal ? 'Editar Negociação OTC' : 'Criar Negociação OTC'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">Definir condições do negócio e distribuição de comissões</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Deal Type */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Tipo de Negócio</Label>
              <div className="flex rounded-lg overflow-hidden border border-zinc-800" data-testid="modal-deal-type">
                <button onClick={() => updateField('deal_type', 'buy')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.deal_type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>
                  Compra (Cliente)
                </button>
                <button onClick={() => updateField('deal_type', 'sell')} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.deal_type === 'sell' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'}`}>
                  Venda (Fornecedor)
                </button>
              </div>
            </div>

            {/* Client */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Nome do Cliente</Label>
                <Input value={form.client_name} onChange={e => updateField('client_name', e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-client-name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Email</Label>
                <Input value={form.client_email} onChange={e => updateField('client_email', e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-client-email" />
              </div>
            </div>

            {/* Asset, Qty, Currency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Ativo</Label>
                <Select value={form.asset} onValueChange={v => updateField('asset', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-asset"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['BTC', 'ETH', 'USDT', 'USDC'].map(a => <SelectItem key={a} value={a} className="text-white">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Quantidade</Label>
                <FormattedNumberInput value={form.quantity} onChange={v => updateField('quantity', parseFloat(v) || 0)} className="bg-zinc-900 border-zinc-800 text-white" placeholder="100 000" data-testid="modal-quantity" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Moeda Ref.</Label>
                <Select value={form.reference_currency} onValueChange={v => updateField('reference_currency', v)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-currency"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {['EUR', 'USD', 'AED', 'BRL'].map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference Price */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Preço de Referência ({form.reference_currency})</Label>
              <div className="relative">
                <FormattedNumberInput value={form.reference_price} onChange={v => updateField('reference_price', parseFloat(v) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-36" placeholder="120 345.50" data-testid="modal-ref-price" />
                {livePrice && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 flex items-center gap-1">
                    <TrendingUp size={12} /> KBEX: {sym}{((livePrice[`price_${form.reference_currency.toLowerCase()}`] || livePrice.price_eur || 0).toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Condição</Label>
              <div className="flex gap-3">
                <div className="flex rounded-lg overflow-hidden border border-zinc-800 flex-shrink-0">
                  <button onClick={() => updateField('condition', 'premium')} className={`px-4 py-2 text-sm font-medium ${form.condition === 'premium' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-950 text-zinc-500'}`}>Premium (+)</button>
                  <button onClick={() => updateField('condition', 'discount')} className={`px-4 py-2 text-sm font-medium ${form.condition === 'discount' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-950 text-zinc-500'}`}>Desconto (-)</button>
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
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Gross (%)</Label>
                <div className="relative">
                  <Input type="number" step="any" value={form.gross_pct} onChange={e => updateField('gross_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" data-testid="modal-gross" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Net (%)</Label>
                <div className="relative">
                  <Input type="number" step="any" value={form.net_pct} onChange={e => updateField('net_pct', parseFloat(e.target.value) || 0)} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="0.1" data-testid="modal-net" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                </div>
              </div>
            </div>

            {/* Broker & Member */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Corretor</Label>
                <Select value={form.broker_id || '_none'} onValueChange={v => {
                  if (v === '_none') { updateField('broker_id', ''); updateField('broker_name', ''); return; }
                  const m = teamMembers.find(t => t.id === v);
                  updateField('broker_id', v); updateField('broker_name', m?.name || ''); updateField('broker_type', 'internal');
                }}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-broker"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="_none" className="text-zinc-500">Nenhum</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Corretor KBEX</Label>
                <Select value={form.member_id || '_none'} onValueChange={v => {
                  if (v === '_none') { updateField('member_id', ''); updateField('member_name', ''); return; }
                  const m = teamMembers.find(t => t.id === v);
                  updateField('member_id', v); updateField('member_name', m?.name || '');
                }}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white" data-testid="modal-member"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="_none" className="text-zinc-500">Nenhum</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id} className="text-white">{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Broker share & Commission currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Margem Corretor (%)</Label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input type="number" step="any" value={form.broker_share_pct} onChange={e => updateField('broker_share_pct', Math.min(100, parseFloat(e.target.value) || 0))} className="bg-zinc-900 border-zinc-800 text-white pr-8" step="5" data-testid="modal-broker-share" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                  </div>
                  <span className="text-zinc-500 text-xs whitespace-nowrap">KBEX: {100 - form.broker_share_pct}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Moeda Comissão</Label>
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
                <CardTitle className="text-yellow-500 flex items-center gap-2 text-base"><Calculator size={16} />Calculadora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">Preço Ajustado</span>
                    <span className="text-white font-medium">{fmtVal(calc.adj)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">Valor Total</span>
                    <span className="text-white font-bold">{fmtVal(calc.total)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">Gross ({form.gross_pct}%)</span>
                    <span className="text-yellow-400 font-medium">{fmtVal(calc.gross)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-zinc-800">
                    <span className="text-zinc-500">Net ({form.net_pct}%)</span>
                    <span className="text-zinc-300">{fmtVal(calc.net)}</span>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-yellow-500 text-xs uppercase tracking-wider font-semibold">Margem KBEX</p>
                  <p className="text-xl font-bold text-white">{fmtVal(calc.margin)}</p>
                  <div className="space-y-1.5 pt-2 border-t border-yellow-500/20 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Corretor ({form.broker_share_pct}%)</span>
                      <span className="text-emerald-400 font-medium">{fmtVal(calc.brokerComm)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Corretor KBEX ({100 - form.broker_share_pct}%)</span>
                      <span className="text-emerald-400 font-medium">{fmtVal(calc.memberComm)}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-5" data-testid="modal-save-btn">
                  {saving ? 'A gravar...' : deal ? 'Atualizar' : 'Criar Negociação'}
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
