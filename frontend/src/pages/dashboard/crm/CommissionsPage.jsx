import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  DollarSign, Clock, CheckCircle, Banknote, Users, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const COMMISSION_STATUS = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  approved: { label: 'Aprovado', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  paid: { label: 'Pago', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rejected: { label: 'Rejeitado', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const CommissionsPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(new Set());

  const token = sessionStorage.getItem('kryptobox_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    try {
      const [commsRes, summRes] = await Promise.all([
        fetch(`${API}/api/otc-deals/commissions`, { headers }),
        fetch(`${API}/api/otc-deals/commissions/summary`, { headers }),
      ]);
      if (commsRes.ok) setCommissions(await commsRes.json());
      if (summRes.ok) setSummary(await summRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [token]);

  const updateStatus = async (commissionId, newStatus) => {
    try {
      const res = await fetch(`${API}/api/otc-deals/commissions/${commissionId}/status`, {
        method: 'PUT', headers, body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(`Comissão ${COMMISSION_STATUS[newStatus]?.label?.toLowerCase()}`);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro');
      }
    } catch (e) { toast.error('Erro de conexão'); }
  };

  const bulkUpdate = async (newStatus) => {
    if (selected.size === 0) return;
    try {
      const res = await fetch(`${API}/api/otc-deals/commissions/bulk-update?status=${newStatus}`, {
        method: 'PUT', headers, body: JSON.stringify(Array.from(selected))
      });
      if (res.ok) {
        toast.success(`${selected.size} comissões atualizadas`);
        setSelected(new Set());
        fetchData();
      }
    } catch (e) { toast.error('Erro'); }
  };

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return commissions;
    return commissions.filter(c => c.status === filterStatus);
  }, [commissions, filterStatus]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const kpis = summary ? [
    { label: 'Total Gerado', value: summary.total_generated, icon: DollarSign, color: 'text-yellow-500', border: 'border-yellow-500/20' },
    { label: 'Pendente Aprovação', value: summary.pending_approval, icon: Clock, color: 'text-orange-400', border: 'border-orange-500/20' },
    { label: 'Aprovado', value: summary.approved, icon: CheckCircle, color: 'text-blue-400', border: 'border-blue-500/20' },
    { label: 'Pago', value: summary.paid, icon: Banknote, color: 'text-emerald-400', border: 'border-emerald-500/20' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2" data-testid="commissions-title">
          <Banknote className="text-yellow-500" size={24} />
          Dashboard de Comissões
        </h1>
        <Button variant="ghost" onClick={fetchData} className="text-zinc-400 hover:text-white" data-testid="commissions-refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="commissions-kpis">
          {kpis.map(kpi => (
            <Card key={kpi.label} className={`bg-zinc-900 border ${kpi.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className={kpi.color} size={20} />
                  <span className="text-zinc-600 text-xs">{kpi.label}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.color}`}>€{kpi.value?.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broker Summary */}
        {summary && (
          <Card className="bg-zinc-900 border-zinc-800" data-testid="broker-summary">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Users size={16} className="text-yellow-500" /> Resumo por Corretor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.brokers?.map((b, i) => (
                <div key={b.name || i} className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium">{b.name}</span>
                    {b.role?.includes('Externo') && <Badge className="bg-zinc-800 text-zinc-500 text-[10px]">Externo</Badge>}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-yellow-400">Total: €{b.total?.toLocaleString()}</span>
                    <span className="text-orange-400">Pend: €{b.pending?.toLocaleString()}</span>
                    <span className="text-emerald-400">Pago: €{b.paid?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {(!summary.brokers || summary.brokers.length === 0) && (
                <p className="text-zinc-500 text-sm text-center py-4">Sem dados</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Commission Table */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2" data-testid="commissions-table-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">Comissões Detalhadas</CardTitle>
            <div className="flex gap-2 items-center">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all" className="text-white">Todos</SelectItem>
                  {Object.entries(COMMISSION_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-white">{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected.size > 0 && (
                <div className="flex gap-1">
                  <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-xs" onClick={() => bulkUpdate('approved')} data-testid="bulk-approve">
                    Aprovar ({selected.size})
                  </Button>
                  <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs" onClick={() => bulkUpdate('paid')} data-testid="bulk-pay">
                    Pagar ({selected.size})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="commissions-table">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-3 py-2 w-8"><input type="checkbox" className="accent-yellow-500" onChange={e => {
                      if (e.target.checked) setSelected(new Set(filtered.map(c => c.id)));
                      else setSelected(new Set());
                    }} /></th>
                    {['Negócio', 'Beneficiário', 'Papel', 'Valor', 'Moeda', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-zinc-500 text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-6 text-zinc-500">Sem comissões</td></tr>
                  ) : filtered.map(c => {
                    const cs = COMMISSION_STATUS[c.status] || COMMISSION_STATUS.pending;
                    return (
                      <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30" data-testid={`commission-row-${c.id}`}>
                        <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="accent-yellow-500" /></td>
                        <td className="px-3 py-2.5 text-yellow-400 text-xs font-mono">{c.deal_number}</td>
                        <td className="px-3 py-2.5 text-white text-sm">{c.beneficiary_name}</td>
                        <td className="px-3 py-2.5 text-zinc-400 text-sm">{c.role}</td>
                        <td className="px-3 py-2.5 text-white text-sm font-medium">€{c.amount?.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-zinc-400 text-sm">{c.currency}</td>
                        <td className="px-3 py-2.5"><Badge className={`${cs.color} text-xs border`}>{cs.label}</Badge></td>
                        <td className="px-3 py-2.5">
                          {c.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2" onClick={() => updateStatus(c.id, 'approved')} data-testid={`approve-${c.id}`}>Aprovar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-red-400 hover:text-red-300 text-xs px-2" onClick={() => updateStatus(c.id, 'rejected')} data-testid={`reject-${c.id}`}>Rejeitar</Button>
                            </div>
                          )}
                          {c.status === 'approved' && (
                            <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-500 text-white text-xs px-2" onClick={() => updateStatus(c.id, 'paid')} data-testid={`pay-${c.id}`}>Pagar</Button>
                          )}
                          {c.status === 'paid' && <span className="text-zinc-600 text-xs">Concluído</span>}
                          {c.status === 'rejected' && <span className="text-red-600 text-xs">Rejeitado</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommissionsPage;
