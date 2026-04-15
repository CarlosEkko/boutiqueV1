import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { toast } from 'sonner';
import {
  Shield, ShieldAlert, ShieldX, ShieldCheck, AlertTriangle,
  Ban, Clock, Eye, Search, ChevronLeft, ChevronRight,
  Trash2, Plus, Activity, Lock, Globe, X
} from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

const API = process.env.REACT_APP_BACKEND_URL;

const EVENT_LABELS = {
  failed_login: { label: 'Login Falhado', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  rate_limit: { label: 'Rate Limit', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  turnstile_rejected: { label: 'Turnstile Rejeitado', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  blacklist_blocked: { label: 'Blacklist', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  ip_blacklisted: { label: 'IP Banido', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
};

const SEVERITY_COLORS = {
  low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const SecurityDashboardPage = () => {
  const [period, setPeriod] = useState('24h');
  const [kpis, setKpis] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPages, setEventsPages] = useState(1);
  const [activity, setActivity] = useState([]);
  const [topIps, setTopIps] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterIp, setFilterIp] = useState('');

  // Blacklist modal
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [banIp, setBanIp] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('permanent');

  const token = sessionStorage.getItem('kryptobox_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchDashboard = useCallback(async () => {
    try {
      const [kpiRes, actRes, topRes, blRes] = await Promise.all([
        fetch(`${API}/api/security/dashboard?period=${period}`, { headers }),
        fetch(`${API}/api/security/activity?period=${period}`, { headers }),
        fetch(`${API}/api/security/top-ips?period=${period}`, { headers }),
        fetch(`${API}/api/security/blacklist`, { headers }),
      ]);
      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (actRes.ok) { const d = await actRes.json(); setActivity(d.data || []); }
      if (topRes.ok) setTopIps(await topRes.json());
      if (blRes.ok) setBlacklist(await blRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [period]);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams({ page: eventsPage, limit: 20, period });
    if (filterType !== 'all') params.set('event_type', filterType);
    if (filterSeverity !== 'all') params.set('severity', filterSeverity);
    if (filterIp) params.set('ip', filterIp);

    try {
      const res = await fetch(`${API}/api/security/events?${params}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setEvents(d.events || []);
        setEventsTotal(d.total || 0);
        setEventsPages(d.pages || 1);
      }
    } catch (e) { console.error(e); }
  }, [period, eventsPage, filterType, filterSeverity, filterIp]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addToBlacklist = async () => {
    if (!banIp) return;
    try {
      const body = { ip: banIp, reason: banReason };
      if (banDuration !== 'permanent') body.duration_hours = parseInt(banDuration);
      const res = await fetch(`${API}/api/security/blacklist`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(`IP ${banIp} adicionado à blacklist`);
        setShowBlacklistModal(false);
        setBanIp(''); setBanReason(''); setBanDuration('permanent');
        fetchDashboard();
      } else {
        const d = await res.json();
        toast.error(d.detail || 'Erro');
      }
    } catch (e) { toast.error('Erro ao banir IP'); }
  };

  const removeFromBlacklist = async (ip) => {
    try {
      const res = await fetch(`${API}/api/security/blacklist/${encodeURIComponent(ip)}`, { method: 'DELETE', headers });
      if (res.ok) {
        toast.success(`IP ${ip} removido da blacklist`);
        fetchDashboard();
      }
    } catch (e) { toast.error('Erro'); }
  };

  const quickBanIp = (ip) => {
    setBanIp(ip);
    setBanReason('Actividade suspeita detectada');
    setShowBlacklistModal(true);
  };

  const maxActivity = Math.max(...activity.map(a => a.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="security-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <ShieldAlert className="text-red-400" size={28} />
            Security Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Monitorização de segurança em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800 text-white" data-testid="period-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="24h" className="text-white">24 horas</SelectItem>
              <SelectItem value="7d" className="text-white">7 dias</SelectItem>
              <SelectItem value="30d" className="text-white">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowBlacklistModal(true)} className="bg-red-600 hover:bg-red-500 text-white" data-testid="add-blacklist-btn">
            <Ban size={16} className="mr-2" /> Banir IP
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Eventos', value: kpis?.total_events || 0, icon: Activity, color: 'text-white', bg: 'bg-zinc-800' },
          { label: 'Logins Falhados', value: kpis?.by_type?.failed_login || 0, icon: ShieldX, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: 'Rate Limits', value: kpis?.by_type?.rate_limit || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Turnstile Rejeitados', value: kpis?.by_type?.turnstile_rejected || 0, icon: Lock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'IPs na Blacklist', value: kpis?.active_blacklist || 0, icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((kpi, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800" data-testid={`kpi-${i}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={kpi.color} size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{kpi.value}</p>
                  <p className="text-zinc-500 text-xs">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Chart + Top IPs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2" data-testid="activity-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Activity size={16} className="text-yellow-400" /> Actividade ({period})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-[2px] h-32">
              {activity.map((a, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full rounded-t transition-all bg-gradient-to-t from-red-600/80 to-red-400/60 hover:from-red-500 hover:to-red-300 min-h-[2px]"
                    style={{ height: `${Math.max((a.count / maxActivity) * 100, 2)}%` }}
                  />
                  <div className="absolute -top-8 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {a.label}: {a.count} eventos
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-zinc-600 text-[10px]">{activity[0]?.label}</span>
              <span className="text-zinc-600 text-[10px]">{activity[activity.length - 1]?.label}</span>
            </div>
          </CardContent>
        </Card>

        {/* Top IPs */}
        <Card className="bg-zinc-900 border-zinc-800" data-testid="top-ips">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Globe size={16} className="text-yellow-400" /> Top IPs Suspeitos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-56 overflow-y-auto">
            {topIps.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">Nenhum IP suspeito detectado</p>
            ) : topIps.map((ip, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-zinc-950 rounded-lg border border-zinc-800 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-zinc-300 text-xs font-mono truncate">{ip.ip}</code>
                    {ip.is_blacklisted && <Badge className="bg-red-500/20 text-red-400 text-[10px] border border-red-500/30">Banido</Badge>}
                  </div>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{ip.total_events} eventos | {ip.event_types?.join(', ')}</p>
                </div>
                {!ip.is_blacklisted && (
                  <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 h-7 px-2" onClick={() => quickBanIp(ip.ip)} data-testid={`ban-ip-${i}`}>
                    <Ban size={14} />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Events Table */}
      <Card className="bg-zinc-900 border-zinc-800" data-testid="events-table">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Eye size={16} className="text-yellow-400" /> Eventos de Segurança
              <Badge className="bg-zinc-800 text-zinc-400 text-[10px] border border-zinc-700">{eventsTotal}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Filtrar IP..."
                  value={filterIp}
                  onChange={e => { setFilterIp(e.target.value); setEventsPage(1); }}
                  className="bg-zinc-950 border-zinc-800 text-white text-xs h-8 pl-7 w-36"
                  data-testid="filter-ip"
                />
              </div>
              <Select value={filterType} onValueChange={v => { setFilterType(v); setEventsPage(1); }}>
                <SelectTrigger className="w-36 bg-zinc-950 border-zinc-800 text-white text-xs h-8" data-testid="filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all" className="text-white">Todos os tipos</SelectItem>
                  <SelectItem value="failed_login" className="text-orange-400">Login Falhado</SelectItem>
                  <SelectItem value="rate_limit" className="text-red-400">Rate Limit</SelectItem>
                  <SelectItem value="turnstile_rejected" className="text-purple-400">Turnstile</SelectItem>
                  <SelectItem value="blacklist_blocked" className="text-red-400">Blacklist</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={v => { setFilterSeverity(v); setEventsPage(1); }}>
                <SelectTrigger className="w-28 bg-zinc-950 border-zinc-800 text-white text-xs h-8" data-testid="filter-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all" className="text-white">Severidade</SelectItem>
                  <SelectItem value="low" className="text-blue-400">Low</SelectItem>
                  <SelectItem value="medium" className="text-yellow-400">Medium</SelectItem>
                  <SelectItem value="high" className="text-orange-400">High</SelectItem>
                  <SelectItem value="critical" className="text-red-400">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {events.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="mx-auto text-emerald-400 mb-2" size={32} />
                <p className="text-zinc-500 text-sm">Nenhum evento de segurança detectado</p>
              </div>
            ) : events.map((ev, i) => {
              const evLabel = EVENT_LABELS[ev.event_type] || { label: ev.event_type, color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
              const sevColor = SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.medium;
              return (
                <div key={ev.id || i} className="flex items-center gap-3 p-2 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <div className="w-16 shrink-0">
                    <Badge className={`${evLabel.color} border text-[10px]`}>{evLabel.label}</Badge>
                  </div>
                  <code className="text-zinc-400 text-xs font-mono w-28 shrink-0 truncate">{ev.client_ip}</code>
                  <span className="text-zinc-500 text-xs w-36 shrink-0 truncate">{ev.endpoint}</span>
                  {ev.email && <span className="text-zinc-400 text-xs truncate flex-1">{ev.email}</span>}
                  {!ev.email && <span className="flex-1" />}
                  {ev.details?.reason && <span className="text-zinc-600 text-[10px] truncate max-w-24">{ev.details.reason}</span>}
                  <Badge className={`${sevColor} border text-[10px] shrink-0`}>{ev.severity}</Badge>
                  <span className="text-zinc-600 text-[10px] w-28 shrink-0 text-right">
                    {ev.timestamp ? formatDate(ev.timestamp, true) : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {eventsPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800">
              <span className="text-zinc-500 text-xs">Página {eventsPage} de {eventsPages}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={eventsPage <= 1} onClick={() => setEventsPage(p => p - 1)} className="text-zinc-400 h-7">
                  <ChevronLeft size={14} />
                </Button>
                <Button size="sm" variant="ghost" disabled={eventsPage >= eventsPages} onClick={() => setEventsPage(p => p + 1)} className="text-zinc-400 h-7">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Blacklist */}
      <Card className="bg-zinc-900 border-zinc-800" data-testid="blacklist-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Ban size={16} className="text-red-400" /> IP Blacklist
            <Badge className="bg-red-500/10 text-red-400 text-[10px] border border-red-500/30">{blacklist.length} activos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blacklist.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">Nenhum IP banido</p>
          ) : (
            <div className="space-y-2">
              {blacklist.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-4">
                    <Ban size={16} className="text-red-400" />
                    <div>
                      <code className="text-white text-sm font-mono">{entry.ip}</code>
                      {entry.reason && <p className="text-zinc-500 text-xs mt-0.5">{entry.reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-zinc-500 text-[10px]">por {entry.created_by}</p>
                      <p className="text-zinc-600 text-[10px]">
                        {entry.expires_at ? `Expira: ${formatDate(entry.expires_at, true)}` : 'Permanente'}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400 h-7" onClick={() => removeFromBlacklist(entry.ip)} data-testid={`remove-blacklist-${i}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowBlacklistModal(false)}>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()} data-testid="blacklist-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-medium flex items-center gap-2">
                <Ban className="text-red-400" size={20} /> Banir IP
              </h3>
              <button onClick={() => setShowBlacklistModal(false)} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-500 text-xs uppercase block mb-1">Endereço IP</label>
                <Input value={banIp} onChange={e => setBanIp(e.target.value)} placeholder="192.168.1.1" className="bg-zinc-950 border-zinc-800 text-white" data-testid="ban-ip-input" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs uppercase block mb-1">Motivo</label>
                <Input value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Actividade suspeita..." className="bg-zinc-950 border-zinc-800 text-white" data-testid="ban-reason-input" />
              </div>
              <div>
                <label className="text-zinc-500 text-xs uppercase block mb-1">Duração</label>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white" data-testid="ban-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="permanent" className="text-white">Permanente</SelectItem>
                    <SelectItem value="1" className="text-white">1 hora</SelectItem>
                    <SelectItem value="24" className="text-white">24 horas</SelectItem>
                    <SelectItem value="168" className="text-white">7 dias</SelectItem>
                    <SelectItem value="720" className="text-white">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowBlacklistModal(false)} className="flex-1 text-zinc-400">Cancelar</Button>
              <Button onClick={addToBlacklist} className="flex-1 bg-red-600 hover:bg-red-500 text-white" data-testid="confirm-ban">
                <Ban size={16} className="mr-2" /> Banir IP
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboardPage;
