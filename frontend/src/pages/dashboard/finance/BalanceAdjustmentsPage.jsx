import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';
import {
  ArrowLeftRight, Plus, TrendingUp, TrendingDown, Search, RefreshCw,
  User, DollarSign, FileText, Upload, Clock, Filter, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { value: 'correction', label: 'Correcao' },
  { value: 'penalty', label: 'Penalizacao' },
  { value: 'fee', label: 'Taxa' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'refund', label: 'Reembolso' },
  { value: 'chargeback', label: 'Chargeback' },
  { value: 'other', label: 'Outro' },
];

const CATEGORY_COLORS = {
  correction: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  penalty: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  fee: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  bonus: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  refund: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  chargeback: 'bg-red-500/15 text-red-400 border-red-500/30',
  other: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const BalanceAdjustmentsPage = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const fetchAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterType !== 'all') params.append('adjustment_type', filterType);

      const res = await fetch(`${API}/api/finance/balance-adjustments?${params}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.adjustments || []);
        setStats(data.stats || {});
      }
    } catch (e) {
      toast.error('Erro ao carregar ajustes');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType]);

  useEffect(() => { fetchAdjustments(); }, [fetchAdjustments]);

  const filteredAdjustments = adjustments.filter(a => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (a.user_name || '').toLowerCase().includes(s)
      || (a.user_email || '').toLowerCase().includes(s)
      || (a.reason || '').toLowerCase().includes(s);
  });

  const formatCurrency = (amount, currency) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} ${currency}`;
  };

  const formatDate = (iso) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6" data-testid="balance-adjustments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-2">Financeiro</p>
          <h1 className="text-3xl text-zinc-50 font-light flex items-center gap-3">
            <ArrowLeftRight className="text-green-400" size={28} />
            Ajustes de Saldo
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Ajustes manuais de saldo em carteiras de clientes</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-medium"
          data-testid="new-adjustment-btn"
        >
          <Plus size={16} className="mr-2" />
          Novo Ajuste
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Ajustes" value={adjustments.length} color="text-zinc-300" border="border-zinc-700" />
        <StatCard
          label="Total Creditos"
          value={`${(stats.total_credits || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`}
          color="text-emerald-400"
          border="border-emerald-500/20"
          icon={TrendingUp}
        />
        <StatCard
          label="Total Debitos"
          value={`${(stats.total_debits || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`}
          color="text-rose-400"
          border="border-rose-500/20"
          icon={TrendingDown}
        />
        <StatCard
          label="Saldo Liquido"
          value={`${(stats.net || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`}
          color={stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          border="border-zinc-700"
          icon={DollarSign}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex gap-1.5">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'credit', label: 'Creditos', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
            { key: 'debit', label: 'Debitos', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === tab.key
                  ? (tab.color || 'bg-amber-500/20 text-amber-400 border border-amber-500/40')
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              } ${filterType === tab.key && tab.key === 'all' ? 'border border-amber-500/40' : ''}`}
              data-testid={`filter-type-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 bg-zinc-900/60 border-zinc-800 text-zinc-300 h-9" data-testid="filter-category">
            <Filter size={14} className="mr-2 text-zinc-600" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800">
            <SelectItem value="all">Todas Categorias</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <Input
            placeholder="Pesquisar cliente ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900/60 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 h-9"
            data-testid="search-adjustments"
          />
        </div>

        <Button variant="ghost" onClick={fetchAdjustments} className="text-zinc-400 hover:text-white h-9" data-testid="refresh-btn">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw size={24} className="animate-spin text-zinc-600" />
        </div>
      ) : filteredAdjustments.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center">
          <ArrowLeftRight className="mx-auto text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-400 font-medium">Nenhum ajuste encontrado</p>
          <p className="text-zinc-600 text-sm mt-1">Crie o primeiro ajuste de saldo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAdjustments.map(a => (
            <AdjustmentRow key={a.id} a={a} formatCurrency={formatCurrency} formatDate={formatDate} />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateAdjustmentDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); fetchAdjustments(); }}
      />
    </div>
  );
};

const StatCard = ({ label, value, color, border, icon: Icon }) => (
  <div className={`bg-zinc-900/60 border ${border} rounded-lg p-4`}>
    <div className="flex items-center justify-between">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {Icon && <Icon size={16} className="text-zinc-600" />}
    </div>
    <p className={`text-2xl font-light ${color}`}>{value}</p>
  </div>
);

const AdjustmentRow = ({ a, formatCurrency, formatDate }) => {
  const isCredit = a.adjustment_type === 'credit';
  const catColor = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.other;
  const catLabel = CATEGORIES.find(c => c.value === a.category)?.label || a.category;

  return (
    <Card className="bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700/60 transition-all" data-testid={`adjustment-row-${a.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: User info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isCredit ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              {isCredit ? <TrendingUp className="text-emerald-400" size={18} /> : <TrendingDown className="text-rose-400" size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-zinc-200 truncate">{a.user_name || a.user_email}</p>
                <Badge className={`${catColor} border text-[10px] px-1.5 py-0`}>{catLabel}</Badge>
              </div>
              <p className="text-xs text-zinc-500 truncate">{a.reason}</p>
            </div>
          </div>

          {/* Center: Amount */}
          <div className="text-right">
            <p className={`text-sm font-medium ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(a.effective_amount, a.currency)}
            </p>
            <p className="text-[11px] text-zinc-600">
              {a.previous_balance?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {'->'} {a.new_balance?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Right: Meta */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {a.document_url && (
              <a href={`${API}${a.document_url}`} target="_blank" rel="noopener noreferrer"
                className="text-zinc-500 hover:text-blue-400 transition-colors" title="Ver documento">
                <FileText size={16} />
              </a>
            )}
            <div className="text-right hidden md:block">
              <p className="text-[11px] text-zinc-600">{formatDate(a.created_at)}</p>
              <p className="text-[10px] text-zinc-700">{a.admin_name}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CreateAdjustmentDialog = ({ open, onClose, onSuccess }) => {
  const [clients, setClients] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('debit');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [document, setDocument] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  const getHeaders = () => {
    const token = sessionStorage.getItem('kryptobox_token');
    return { 'Authorization': `Bearer ${token}` };
  };

  // Search clients
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      try {
        setLoadingClients(true);
        const params = clientSearch ? `?search=${encodeURIComponent(clientSearch)}` : '';
        const res = await fetch(`${API}/api/finance/clients-list${params}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients || []);
        }
      } catch (e) { /* ignore */ }
      finally { setLoadingClients(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, open]);

  // Fetch wallets when client is selected
  useEffect(() => {
    if (!selectedClient) { setWallets([]); return; }
    (async () => {
      try {
        const res = await fetch(`${API}/api/finance/client-wallets/${selectedClient.id}`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          let clientWallets = data.wallets || [];
          // If no wallets, show default currencies so admin can still adjust
          if (clientWallets.length === 0) {
            clientWallets = [
              { asset_id: 'EUR', asset_name: 'Euro', balance: 0, asset_type: 'fiat' },
              { asset_id: 'USD', asset_name: 'US Dollar', balance: 0, asset_type: 'fiat' },
              { asset_id: 'GBP', asset_name: 'British Pound', balance: 0, asset_type: 'fiat' },
              { asset_id: 'USDT', asset_name: 'Tether', balance: 0, asset_type: 'crypto' },
              { asset_id: 'USDC', asset_name: 'USD Coin', balance: 0, asset_type: 'crypto' },
              { asset_id: 'BTC', asset_name: 'Bitcoin', balance: 0, asset_type: 'crypto' },
              { asset_id: 'ETH', asset_name: 'Ethereum', balance: 0, asset_type: 'crypto' },
            ];
          }
          setWallets(clientWallets);
        }
      } catch (e) { /* ignore */ }
    })();
  }, [selectedClient]);

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedCurrency('');
    setAdjustmentType('debit');
    setAmount('');
    setCategory('');
    setReason('');
    setDocument(null);
    setClientSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedClient || !selectedCurrency || !amount || !category || !reason) {
      toast.error('Preencha todos os campos obrigatorios');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', selectedClient.id);
      formData.append('currency', selectedCurrency);
      formData.append('amount', parseFloat(amount).toString());
      formData.append('adjustment_type', adjustmentType);
      formData.append('category', category);
      formData.append('reason', reason);
      if (document) formData.append('document', document);

      const res = await fetch(`${API}/api/finance/balance-adjustments`, {
        method: 'POST',
        headers: { 'Authorization': getHeaders()['Authorization'] },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Ajuste aplicado: ${data.adjustment.effective_amount > 0 ? '+' : ''}${data.adjustment.effective_amount} ${data.adjustment.currency}`);
        resetForm();
        onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao criar ajuste');
      }
    } catch (e) {
      toast.error('Erro ao criar ajuste');
    } finally {
      setSubmitting(false);
    }
  };

  const currentWallet = wallets.find(w => w.asset_id === selectedCurrency);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-light flex items-center gap-3">
            <ArrowLeftRight className="text-amber-400" size={22} />
            Novo Ajuste de Saldo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Cliente *</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <User size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{selectedClient.name}</p>
                    <p className="text-xs text-zinc-500">{selectedClient.email}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(null); setWallets([]); setSelectedCurrency(''); }}
                  className="text-zinc-500 hover:text-white h-7 text-xs" data-testid="change-client-btn">
                  Alterar
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <Input
                    placeholder="Pesquisar cliente por nome ou email..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
                    data-testid="client-search-input"
                  />
                </div>
                {loadingClients ? (
                  <div className="flex justify-center py-4"><RefreshCw size={16} className="animate-spin text-zinc-600" /></div>
                ) : clients.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-zinc-800 rounded-lg p-1">
                    {clients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-zinc-800/60 transition-colors"
                        data-testid={`client-option-${c.id}`}
                      >
                        <User size={14} className="text-zinc-500" />
                        <div>
                          <p className="text-sm text-zinc-300">{c.name}</p>
                          <p className="text-[11px] text-zinc-600">{c.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : clientSearch ? (
                  <p className="text-xs text-zinc-600 text-center py-2">Nenhum cliente encontrado</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Currency Selection */}
          {selectedClient && (
            <div className="space-y-2">
              <Label className="text-sm text-zinc-400">Carteira / Moeda *</Label>
              {wallets.length === 0 ? (
                <p className="text-xs text-zinc-600">Nenhuma carteira encontrada</p>
              ) : (
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300" data-testid="currency-select">
                    <SelectValue placeholder="Selecionar moeda" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    {wallets.map(w => (
                      <SelectItem key={w.asset_id} value={w.asset_id}>
                        {w.asset_name || w.asset_id} - Saldo: {w.balance?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {currentWallet && (
                <p className="text-xs text-zinc-500">
                  Saldo actual: <span className={currentWallet.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {currentWallet.balance?.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {selectedCurrency}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Tipo de Ajuste *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAdjustmentType('credit')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                  adjustmentType === 'credit'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                }`}
                data-testid="type-credit"
              >
                <TrendingUp size={16} />
                Credito (+)
              </button>
              <button
                onClick={() => setAdjustmentType('debit')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                  adjustmentType === 'debit'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                }`}
                data-testid="type-debit"
              >
                <TrendingDown size={16} />
                Debito (-)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Valor *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
                data-testid="amount-input"
              />
            </div>
            {amount && currentWallet && (
              <p className="text-xs text-zinc-500">
                Novo saldo: <span className={
                  (currentWallet.balance + (adjustmentType === 'credit' ? parseFloat(amount) : -parseFloat(amount))) >= 0
                    ? 'text-emerald-400' : 'text-rose-400'
                }>
                  {(currentWallet.balance + (adjustmentType === 'credit' ? parseFloat(amount) : -parseFloat(amount)))
                    .toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {selectedCurrency}
                </span>
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-300" data-testid="category-select">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Motivo / Descricao *</Label>
            <Textarea
              placeholder="Descreva o motivo do ajuste..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-600 min-h-[80px]"
              data-testid="reason-input"
            />
          </div>

          {/* Document Upload */}
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Documento de Suporte</Label>
            <div className="flex items-center gap-3">
              <label
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors cursor-pointer text-sm"
                data-testid="upload-document"
              >
                <Upload size={16} />
                {document ? document.name : 'Carregar ficheiro'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setDocument(e.target.files[0] || null)}
                />
              </label>
              {document && (
                <Button variant="ghost" size="sm" onClick={() => setDocument(null)} className="text-zinc-500 hover:text-rose-400 h-7 text-xs">
                  Remover
                </Button>
              )}
            </div>
            <p className="text-[11px] text-zinc-600">PDF, JPG ou PNG (max 10MB)</p>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={handleClose} className="text-zinc-400" data-testid="cancel-btn">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedClient || !selectedCurrency || !amount || !category || !reason}
            className={`font-medium ${
              adjustmentType === 'credit'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
            data-testid="submit-adjustment-btn"
          >
            {submitting ? (
              <RefreshCw size={16} className="animate-spin mr-2" />
            ) : adjustmentType === 'credit' ? (
              <TrendingUp size={16} className="mr-2" />
            ) : (
              <TrendingDown size={16} className="mr-2" />
            )}
            {submitting ? 'A processar...' : `Aplicar ${adjustmentType === 'credit' ? 'Credito' : 'Debito'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BalanceAdjustmentsPage;
