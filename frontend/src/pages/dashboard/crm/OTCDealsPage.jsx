import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import OTCDealModal from '../../../components/otc/OTCDealModal';
import {
  ArrowLeftRight, Search, Eye, MoreVertical, TrendingUp,
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

  useEffect(() => { fetchDeals(); fetchTeam(); }, [fetchDeals, fetchTeam]);

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
      const res = await fetch(`${API}/api/otc/deals/${dealId}`, { method: 'DELETE', headers: getHeaders() });
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
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 p-1" title={t('otc.deals.delete')} onClick={() => deleteDeal(deal.id)} data-testid={`delete-${deal.id}`}>
                          <Trash2 size={14} />
                        </Button>
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
      <OTCDealModal
        open={showModal}
        onClose={() => setShowModal(false)}
        deal={editingDeal}
        teamMembers={teamMembers}
        onSaved={() => { setShowModal(false); fetchDeals(); }}
        mode="deal"
      />
    </div>
  );
};

export default OTCDealsPage;
