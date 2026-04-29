import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Cookie, Users, BarChart3, Megaphone, Loader2, RefreshCw, Globe, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Admin: Cookie consent audit + stats. Read-only.
 * Lists all consent events with timestamps, anonymized IP hash, agent and
 * categories chosen — sufficient for GDPR audit trail without storing PII.
 */
export default function AdminCookieConsentPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [s, e] = await Promise.all([
        axios.get(`${API_URL}/api/legal/cookie-consent/stats`, { headers }),
        axios.get(`${API_URL}/api/legal/cookie-consent/admin?limit=200`, { headers }),
      ]);
      setStats(s.data);
      setEvents(e.data || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso; }
  };
  const detectDevice = (ua = '') => {
    if (/Mobile|iPhone|Android/i.test(ua)) return { Icon: Smartphone, label: 'Mobile' };
    return { Icon: Globe, label: 'Desktop' };
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" data-testid="admin-cookie-consent-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gold-400/80 mb-1">
            <Cookie size={12} /> GDPR Compliance
          </div>
          <h1 className="text-2xl font-light text-white">Consentimento de Cookies</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Registo auditável de todas as escolhas de cookies efetuadas pelos utilizadores.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={load}
          disabled={loading}
          data-testid="cookie-consent-refresh-btn"
          className="border-zinc-700"
        >
          {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={14} className="mr-1.5" />}
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-700/40 bg-red-500/10 text-red-200 text-sm p-4">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Eventos totais" value={stats?.total_events ?? '—'} hint={`Versão da política: ${stats?.policy_version || '—'}`} />
        <StatCard icon={Users} label="Utilizadores únicos" value={stats?.unique_users ?? '—'} hint={`+ ${stats?.anonymous_consents ?? 0} anónimos`} />
        <StatCard icon={BarChart3} label="Opt-in Analytics" value={stats?.currently_optin_analytics ?? '—'} accent="text-sky-400" />
        <StatCard icon={Megaphone} label="Opt-in Marketing" value={stats?.currently_optin_marketing ?? '—'} accent="text-violet-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Aceitam tudo" value={stats?.accept_all_users ?? '—'} accent="text-emerald-400" />
        <StatCard label="Rejeitam não-essenciais" value={stats?.reject_all_users ?? '—'} accent="text-amber-400" />
      </div>

      {/* Events table */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-sm font-light flex items-center justify-between">
            <span>Últimos {events.length} registos</span>
            <span className="text-[11px] text-zinc-500 font-normal">Apenas hash do IP é guardado (RGPD)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex items-center justify-center text-zinc-500">
              <Loader2 className="animate-spin mr-2" size={16} /> A carregar…
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">Sem eventos registados.</div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Utilizador</th>
                    <th className="px-3 py-2 text-left">Origem</th>
                    <th className="px-3 py-2 text-left">Categorias</th>
                    <th className="px-3 py-2 text-left">Idioma</th>
                    <th className="px-3 py-2 text-left">IP (hash)</th>
                    <th className="px-3 py-2 text-left">Versão</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const dev = detectDevice(e.user_agent);
                    const Icon = dev.Icon;
                    return (
                      <tr key={e.id} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{fmt(e.created_at)}</td>
                        <td className="px-3 py-2 text-zinc-400 font-mono text-[11px]">
                          {e.user_id ? e.user_id.slice(0, 8) + '…' : <span className="text-zinc-600">anónimo</span>}
                        </td>
                        <td className="px-3 py-2 text-zinc-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon size={12} className="text-zinc-500" />
                            {e.method}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-700/40 text-[10px]">essential</Badge>
                            {e.categories?.analytics && (
                              <Badge className="bg-sky-500/10 text-sky-300 border border-sky-700/40 text-[10px]">analytics</Badge>
                            )}
                            {e.categories?.marketing && (
                              <Badge className="bg-violet-500/10 text-violet-300 border border-violet-700/40 text-[10px]">marketing</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 uppercase text-[11px]">{e.language || '—'}</td>
                        <td className="px-3 py-2 text-zinc-500 font-mono text-[10px]">{(e.ip_hash || '').slice(0, 12)}…</td>
                        <td className="px-3 py-2 text-zinc-400 text-[11px]">{e.policy_version}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent = 'text-white' }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
        {Icon ? <Icon size={11} /> : null}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-light ${accent}`}>{value}</div>
      {hint && <div className="text-[11px] text-zinc-600 mt-1">{hint}</div>}
    </div>
  );
}
