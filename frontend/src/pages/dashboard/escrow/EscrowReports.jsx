import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  FileText, Download, Calendar, Filter, BarChart3,
  Clock, ArrowLeft, Shield, ChevronDown, ChevronUp,
  Search, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_COLORS = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  awaiting_deposit: 'bg-amber-500/20 text-amber-400',
  funded: 'bg-blue-500/20 text-blue-400',
  in_verification: 'bg-purple-500/20 text-purple-400',
  ready_for_settlement: 'bg-emerald-500/20 text-emerald-400',
  settled: 'bg-green-500/20 text-green-400',
  closed: 'bg-zinc-500/20 text-zinc-400',
  disputed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-red-500/20 text-red-300',
  expired: 'bg-zinc-500/20 text-zinc-500',
};

const AUDIT_TYPE_COLORS = {
  status_change: 'bg-blue-500/20 text-blue-400',
  deposit: 'bg-emerald-500/20 text-emerald-400',
  evidence: 'bg-purple-500/20 text-purple-400',
  dispute_message: 'bg-amber-500/20 text-amber-400',
  settlement: 'bg-green-500/20 text-green-400',
  force_release: 'bg-red-500/20 text-red-400',
};

const EscrowReports = ({ onBack }) => {
  const { token } = useAuth();
  const [tab, setTab] = useState('statement');
  const [loading, setLoading] = useState(false);

  // Statement
  const [statement, setStatement] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Audit
  const [auditDealId, setAuditDealId] = useState('');
  const [auditTrail, setAuditTrail] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStatement = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (filterStatus) params.append('status', filterStatus);
      const res = await axios.get(`${API_URL}/api/escrow/reports/statement?${params}`, { headers });
      setStatement(res.data);
    } catch (err) {
      toast.error('Erro ao carregar extrato');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, filterStatus, token]);

  const fetchAuditTrail = async () => {
    if (!auditDealId.trim()) { toast.error('ID do deal obrigatorio'); return; }
    setLoading(true);
    try {
      // Find the deal by deal_id to get internal id
      const stRes = await axios.get(`${API_URL}/api/escrow/reports/statement`, { headers });
      const match = stRes.data.deals.find(d => d.deal_id === auditDealId || d.id === auditDealId);
      if (!match) { toast.error('Deal nao encontrado'); setLoading(false); return; }
      const res = await axios.get(`${API_URL}/api/escrow/reports/audit-trail/${match.id}`, { headers });
      setAuditTrail(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao carregar audit trail');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (filterStatus) params.append('status', filterStatus);
      const res = await axios.get(`${API_URL}/api/escrow/reports/export?${params}`, { headers });
      const rows = res.data.rows;
      if (!rows.length) { toast.error('Nenhum dado para exportar'); return; }

      // Convert to CSV
      const csvHeaders = Object.keys(rows[0]);
      const csvContent = [
        csvHeaders.join(','),
        ...rows.map(row => csvHeaders.map(h => {
          const val = row[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : (val ?? '');
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kbex_escrow_report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado');
    } catch (err) {
      toast.error('Erro ao exportar');
    }
  };

  useEffect(() => {
    if (tab === 'statement') fetchStatement();
  }, [tab]);

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (v) => {
    return `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 space-y-5" data-testid="escrow-reports-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="reports-back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports & Auditoria</h1>
            <p className="text-sm text-muted-foreground">Extratos, exportacoes e audit trail do escrow</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400" onClick={exportCSV} data-testid="export-csv-btn">
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'statement', label: 'Extrato', icon: FileText },
          { id: 'audit', label: 'Audit Trail', icon: Shield },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors
              ${tab === t.id ? 'bg-white/[0.05] text-white border-b-2 border-emerald-400' : 'text-muted-foreground hover:text-white'}`}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Statement Tab */}
      {tab === 'statement' && (
        <div className="space-y-5">
          {/* Filters */}
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Data Inicio</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white/5 border-white/10 text-xs h-8 w-40" data-testid="filter-date-from" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Data Fim</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white/5 border-white/10 text-xs h-8 w-40" data-testid="filter-date-to" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-md px-3 py-1 text-xs h-8" data-testid="filter-status">
                  <option value="">Todos</option>
                  <option value="draft">Rascunho</option>
                  <option value="awaiting_deposit">Aguardando Deposito</option>
                  <option value="funded">Financiado</option>
                  <option value="settled">Liquidado</option>
                  <option value="disputed">Em Disputa</option>
                  <option value="closed">Encerrado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={fetchStatement} data-testid="apply-filters-btn">
                <RefreshCw className="w-3 h-3 mr-1" /> Aplicar
              </Button>
            </div>
          </Card>

          {/* KPIs */}
          {statement && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 border border-blue-500/20 bg-blue-500/5">
                <div className="text-[10px] text-blue-400 font-medium uppercase mb-1">Total Deals</div>
                <div className="text-2xl font-bold">{statement.total_deals}</div>
              </Card>
              <Card className="p-4 border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-[10px] text-emerald-400 font-medium uppercase mb-1">Volume Total</div>
                <div className="text-2xl font-bold">{formatCurrency(statement.total_volume)}</div>
              </Card>
              <Card className="p-4 border border-amber-500/20 bg-amber-500/5">
                <div className="text-[10px] text-amber-400 font-medium uppercase mb-1">Fees Total</div>
                <div className="text-2xl font-bold">{formatCurrency(statement.total_fees)}</div>
              </Card>
              <Card className="p-4 border border-white/5 bg-white/[0.02]">
                <div className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Por Status</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(statement.by_status || {}).map(([s, c]) => (
                    <Badge key={s} className={`${STATUS_COLORS[s] || 'bg-zinc-500/20 text-zinc-400'} text-[8px] px-1.5`}>{s}: {c}</Badge>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Deals Table */}
          {statement && (
            <Card className="border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Extrato ({statement.total_deals} deals)</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Gerado: {formatDate(statement.generated_at)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground">
                      <th className="text-left p-3 font-medium">Deal ID</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Assets</th>
                      <th className="text-right p-3 font-medium">Ticket</th>
                      <th className="text-right p-3 font-medium">Fee</th>
                      <th className="text-left p-3 font-medium">Buyer</th>
                      <th className="text-left p-3 font-medium">Seller</th>
                      <th className="text-left p-3 font-medium">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statement.deals || []).map((d) => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-3 font-mono font-medium">{d.deal_id}</td>
                        <td className="p-3"><Badge className={`${STATUS_COLORS[d.status] || 'bg-zinc-500/20'} text-[10px]`}>{d.status}</Badge></td>
                        <td className="p-3">{d.asset_a}/{d.asset_b}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(d.ticket_size)}</td>
                        <td className="p-3 text-right text-emerald-400">{formatCurrency(d.fee_total)}</td>
                        <td className="p-3">{d.buyer?.name || 'N/A'}</td>
                        <td className="p-3">{d.seller?.name || 'N/A'}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(d.created_at)}</td>
                      </tr>
                    ))}
                    {(statement.deals || []).length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum deal encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {tab === 'audit' && (
        <div className="space-y-5">
          <Card className="p-4 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase">Pesquisar Audit Trail</span>
            </div>
            <div className="flex gap-3">
              <Input
                value={auditDealId} onChange={(e) => setAuditDealId(e.target.value)}
                placeholder="Deal ID (ex: ESC-20260408-XXXX)"
                className="bg-white/5 border-white/10 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && fetchAuditTrail()}
                data-testid="audit-deal-id-input"
              />
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={fetchAuditTrail} disabled={loading} data-testid="search-audit-btn">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </Card>

          {auditTrail && (
            <Card className="border border-white/5 bg-white/[0.02] overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold">{auditTrail.deal_id}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {auditTrail.total_events} eventos registados | Status: {auditTrail.current_status}
                    </p>
                  </div>
                  <Badge className={`${STATUS_COLORS[auditTrail.current_status] || 'bg-zinc-500/20'} text-xs`}>{auditTrail.current_status}</Badge>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {auditTrail.audit_entries.map((entry, i) => {
                  const typeColor = AUDIT_TYPE_COLORS[entry.type] || 'bg-zinc-500/20 text-zinc-400';
                  return (
                    <div key={i} className="relative pl-6 border-l-2 border-white/10 pb-3">
                      <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-emerald-500 -translate-x-[7px]" />
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${typeColor} text-[8px] px-1.5`}>{entry.type.replace('_', ' ')}</Badge>
                            <span className="text-[10px] text-muted-foreground">{formatDate(entry.timestamp)}</span>
                          </div>
                          <div className="text-sm font-medium">{entry.action}</div>
                          {entry.notes && <div className="text-[10px] text-muted-foreground mt-0.5 italic">{entry.notes}</div>}
                          <div className="text-[10px] text-muted-foreground mt-0.5">{entry.performed_by}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default EscrowReports;
