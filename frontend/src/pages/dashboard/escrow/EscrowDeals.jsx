import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Lock, Plus, Search, Filter, ChevronDown, ChevronRight,
  FileText, Clock, DollarSign, Shield, CheckCircle, XCircle,
  AlertTriangle, ArrowRight, X, Users, Banknote, ArrowLeftRight,
  Calendar, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import CreateEscrowModal from './CreateEscrowModal';
import EscrowDealDetail from './EscrowDealDetail';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: 'bg-zinc-500/20 text-zinc-400', dot: 'bg-zinc-400' },
  awaiting_deposit: { label: 'Aguardando Depósito', color: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-400' },
  funded: { label: 'Financiado', color: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' },
  in_verification: { label: 'Em Verificação', color: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-400' },
  ready_for_settlement: { label: 'Pronto p/ Liquidação', color: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
  settled: { label: 'Liquidado', color: 'bg-green-500/20 text-green-400', dot: 'bg-green-400' },
  closed: { label: 'Encerrado', color: 'bg-zinc-500/20 text-zinc-400', dot: 'bg-zinc-400' },
  disputed: { label: 'Em Disputa', color: 'bg-red-500/20 text-red-400', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-300', dot: 'bg-red-300' },
  expired: { label: 'Expirado', color: 'bg-zinc-500/20 text-zinc-500', dot: 'bg-zinc-500' },
};

const DEAL_TYPE_LABELS = {
  block_trade: 'Block Trade',
  stablecoin_swap: 'Stablecoin Swap',
  cross_chain: 'Cross-Chain',
  crypto_fiat: 'Crypto/Fiat',
  crypto_crypto: 'Crypto/Crypto',
};

const EscrowDeals = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deals, setDeals] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === 'true');
  const [selectedDeal, setSelectedDeal] = useState(null);

  const fetchDeals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('deal_type', typeFilter);
      params.append('limit', '50');

      const res = await axios.get(`${API_URL}/api/escrow/deals?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeals(res.data.deals || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Erro ao carregar deals');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, typeFilter]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowCreate(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleDealCreated = (newDeal) => {
    setShowCreate(false);
    fetchDeals();
    toast.success(`Deal ${newDeal.deal_id} criado com sucesso`);
  };

  const handleDealUpdated = () => {
    fetchDeals();
    if (selectedDeal) {
      axios.get(`${API_URL}/api/escrow/deals/${selectedDeal.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setSelectedDeal(res.data)).catch(() => {});
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (selectedDeal) {
    return (
      <EscrowDealDetail
        deal={selectedDeal}
        onBack={() => setSelectedDeal(null)}
        onUpdate={handleDealUpdated}
      />
    );
  }

  return (
    <div className="p-6 space-y-5" data-testid="escrow-deals-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escrow Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} deals registados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDeals} data-testid="refresh-deals-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="new-deal-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Deal
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por ID, buyer, seller, asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
            data-testid="search-deals-input"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          data-testid="toggle-filters-btn"
        >
          <Filter className="w-4 h-4 mr-1" />
          Filtros
          {(statusFilter || typeFilter) && (
            <Badge className="ml-1 bg-emerald-500/20 text-emerald-400 text-[10px]">
              {[statusFilter, typeFilter].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Bar */}
      {showFilters && (
        <Card className="p-4 border border-white/10 bg-white/[0.02] flex flex-wrap gap-3 items-center">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm"
              data-testid="status-filter-select"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm"
              data-testid="type-filter-select"
            >
              <option value="">Todos</option>
              {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {(statusFilter || typeFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
              className="mt-4"
            >
              <X className="w-3 h-3 mr-1" /> Limpar
            </Button>
          )}
        </Card>
      )}

      {/* Deals List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <Card className="p-12 border border-white/5 bg-white/[0.02] text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-medium mb-2">Nenhum Escrow Deal</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie o primeiro deal para começar a utilizar o módulo de custódia profissional
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="empty-create-deal-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Criar Escrow Deal
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => {
            const sc = STATUS_CONFIG[deal.status] || { label: deal.status, color: 'bg-zinc-500/20 text-zinc-400', dot: 'bg-zinc-400' };
            return (
              <Card
                key={deal.id}
                className="p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer group"
                onClick={() => setSelectedDeal(deal)}
                data-testid={`deal-row-${deal.deal_id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status dot */}
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-emerald-400" />
                    </div>
                    {/* Deal info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{deal.deal_id}</span>
                        <Badge className={`${sc.color} text-[10px] px-2`}>{sc.label}</Badge>
                        <Badge className="bg-white/5 text-muted-foreground text-[10px] px-2">
                          {DEAL_TYPE_LABELS[deal.deal_type] || deal.deal_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ArrowLeftRight className="w-3 h-3" />
                          {deal.quantity_a} {deal.asset_a} &harr; {deal.quantity_b} {deal.asset_b}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {deal.buyer?.name || 'N/A'} &harr; {deal.seller?.name || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold">${(deal.ticket_size || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Banknote className="w-3 h-3" />
                        Fee: ${(deal.fee_total || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(deal.created_at)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateEscrowModal
          onClose={() => setShowCreate(false)}
          onCreated={handleDealCreated}
        />
      )}
    </div>
  );
};

export default EscrowDeals;
