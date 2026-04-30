import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Database, CreditCard, ShieldCheck, Server, Mail, LineChart, KeyRound, Loader2,
} from 'lucide-react';
import { useLanguage } from '../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Public KBEX System Status — pings /api/status/health every 60s and renders
 * a component-level health breakdown. No authentication required.
 */

const COPY = {
  pt: {
    eyebrow: 'Saúde da Plataforma',
    title: 'Estado do Sistema',
    subtitle: 'Visibilidade em tempo real sobre os principais componentes da plataforma KBEX. Atualizado a cada 60 segundos.',
    backHome: 'Voltar ao Início',
    overall: { operational: 'Todos os sistemas operacionais', degraded: 'Desempenho degradado', outage: 'Incidente em curso' },
    status: { operational: 'Operacional', degraded: 'Degradado', outage: 'Indisponível' },
    updatedAt: 'Última atualização',
    refresh: 'Atualizar',
    incidents: { title: 'Incidentes recentes (30 dias)', empty: 'Sem incidentes registados nos últimos 30 dias.' },
    latency: 'Latência',
    components: {
      api: 'API REST',
      database: 'Base de Dados',
      market_data: 'Dados de Mercado',
      payments: 'Gateway de Pagamentos',
      authentication: 'Autenticação',
      trading_engine: 'Motor de Trading',
      kyc: 'KYC / KYB',
      email: 'Email Transacional',
    },
  },
  en: {
    eyebrow: 'Platform Health',
    title: 'System Status',
    subtitle: 'Real-time visibility into the main components of the KBEX platform. Refreshed every 60 seconds.',
    backHome: 'Back to Home',
    overall: { operational: 'All systems operational', degraded: 'Degraded performance', outage: 'Active incident' },
    status: { operational: 'Operational', degraded: 'Degraded', outage: 'Outage' },
    updatedAt: 'Last updated',
    refresh: 'Refresh',
    incidents: { title: 'Recent incidents (30 days)', empty: 'No incidents recorded in the last 30 days.' },
    latency: 'Latency',
    components: {
      api: 'REST API', database: 'Database', market_data: 'Market Data', payments: 'Payment Gateway',
      authentication: 'Authentication', trading_engine: 'Trading Engine', kyc: 'KYC / KYB', email: 'Transactional Email',
    },
  },
  fr: {
    eyebrow: 'Santé de la Plateforme',
    title: 'État du Système',
    subtitle: 'Visibilité en temps réel sur les principaux composants de la plateforme KBEX. Actualisé toutes les 60 secondes.',
    backHome: "Retour à l'accueil",
    overall: { operational: 'Tous les systèmes opérationnels', degraded: 'Performance dégradée', outage: 'Incident en cours' },
    status: { operational: 'Opérationnel', degraded: 'Dégradé', outage: 'Indisponible' },
    updatedAt: 'Dernière mise à jour',
    refresh: 'Actualiser',
    incidents: { title: 'Incidents récents (30 jours)', empty: 'Aucun incident enregistré ces 30 derniers jours.' },
    latency: 'Latence',
    components: {
      api: 'API REST', database: 'Base de Données', market_data: 'Données de Marché', payments: 'Passerelle de Paiement',
      authentication: 'Authentification', trading_engine: 'Moteur de Trading', kyc: 'KYC / KYB', email: 'Email Transactionnel',
    },
  },
  es: {
    eyebrow: 'Salud de la Plataforma',
    title: 'Estado del Sistema',
    subtitle: 'Visibilidad en tiempo real sobre los principales componentes de la plataforma KBEX. Actualizado cada 60 segundos.',
    backHome: 'Volver al inicio',
    overall: { operational: 'Todos los sistemas operativos', degraded: 'Rendimiento degradado', outage: 'Incidente activo' },
    status: { operational: 'Operativo', degraded: 'Degradado', outage: 'Caída' },
    updatedAt: 'Última actualización',
    refresh: 'Actualizar',
    incidents: { title: 'Incidentes recientes (30 días)', empty: 'Sin incidentes registrados en los últimos 30 días.' },
    latency: 'Latencia',
    components: {
      api: 'API REST', database: 'Base de Datos', market_data: 'Datos de Mercado', payments: 'Pasarela de Pagos',
      authentication: 'Autenticación', trading_engine: 'Motor de Trading', kyc: 'KYC / KYB', email: 'Email Transaccional',
    },
  },
  ar: {
    eyebrow: 'حالة المنصة',
    title: 'حالة النظام',
    subtitle: 'رؤية في الوقت الفعلي للمكونات الرئيسية لمنصة KBEX. يتم التحديث كل 60 ثانية.',
    backHome: 'العودة إلى الصفحة الرئيسية',
    overall: { operational: 'جميع الأنظمة تعمل', degraded: 'أداء متدهور', outage: 'حادث نشط' },
    status: { operational: 'تعمل', degraded: 'متدهور', outage: 'توقف' },
    updatedAt: 'آخر تحديث',
    refresh: 'تحديث',
    incidents: { title: 'الحوادث الأخيرة (30 يومًا)', empty: 'لا توجد حوادث مسجلة في آخر 30 يومًا.' },
    latency: 'زمن الاستجابة',
    components: {
      api: 'واجهة API', database: 'قاعدة البيانات', market_data: 'بيانات السوق', payments: 'بوابة الدفع',
      authentication: 'المصادقة', trading_engine: 'محرك التداول', kyc: 'KYC / KYB', email: 'البريد المعاملاتي',
    },
  },
};

const COMPONENT_ICONS = {
  api: Server,
  database: Database,
  market_data: LineChart,
  payments: CreditCard,
  authentication: KeyRound,
  trading_engine: Activity,
  kyc: ShieldCheck,
  email: Mail,
};

const STATUS_STYLE = {
  operational: { Icon: CheckCircle2, dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'border-emerald-700/40', bg: 'bg-emerald-500/10' },
  degraded: { Icon: AlertTriangle, dot: 'bg-amber-400', text: 'text-amber-300', ring: 'border-amber-700/40', bg: 'bg-amber-500/10' },
  outage: { Icon: XCircle, dot: 'bg-red-400', text: 'text-red-300', ring: 'border-red-700/40', bg: 'bg-red-500/10' },
};

export default function SystemStatusPage() {
  const { language, isRTL } = useLanguage();
  const langKey = (language || 'EN').toLowerCase();
  const c = COPY[langKey] || COPY.en;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/status/health`, { timeout: 15000 });
      setData(res.data);
    } catch (err) {
      setError(err.message);
      // Even if we fail to reach the API, we know the outage is real — derive
      // a minimal local snapshot so the page still renders something useful.
      setData({
        overall: 'outage',
        updated_at: new Date().toISOString(),
        components: {},
        incidents: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const overall = data?.overall || 'operational';
  const os = STATUS_STYLE[overall];
  const OverallIcon = os.Icon;

  const fmtTime = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleTimeString('pt-PT');
    } catch { return '—'; }
  };

  return (
    <div className={`min-h-screen bg-black text-zinc-200 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid="system-status-page">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-gold-400 transition-colors text-sm mb-10" data-testid="status-back-home">
          <ArrowLeft size={14} className={isRTL ? 'rotate-180' : ''} />
          {c.backHome}
        </Link>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold-400/80 mb-3">
            <Activity size={14} />
            <span>{c.eyebrow}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-4">{c.title}</h1>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">{c.subtitle}</p>
        </div>

        {/* Overall banner */}
        <div className={`rounded-2xl border ${os.ring} ${os.bg} p-6 mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className={`absolute inset-0 rounded-full animate-ping ${os.dot} opacity-60`}></span>
              <span className={`relative block w-3 h-3 rounded-full ${os.dot}`}></span>
            </div>
            <div>
              <div className={`flex items-center gap-2 ${os.text} font-medium`}>
                <OverallIcon size={16} />
                <span>{c.overall[overall]}</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {c.updatedAt}: {fmtTime(data?.updated_at)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            data-testid="status-refresh-btn"
            className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {c.refresh}
          </button>
        </div>

        {/* Components grid */}
        <div className="grid md:grid-cols-2 gap-3 mb-14">
          {Object.entries(c.components).map(([key, label]) => {
            const comp = data?.components?.[key] || { status: 'operational' };
            const s = STATUS_STYLE[comp.status] || STATUS_STYLE.operational;
            const Icon = COMPONENT_ICONS[key] || Server;
            return (
              <div
                key={key}
                data-testid={`status-component-${key}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex items-center gap-4"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-zinc-900/60 flex items-center justify-center text-zinc-300">
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{label}</div>
                  {comp.latency_ms != null && (
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {c.latency}: {comp.latency_ms} ms
                    </div>
                  )}
                </div>
                <div className={`shrink-0 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full ${s.bg} ${s.text} border ${s.ring} flex items-center gap-1.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                  {c.status[comp.status] || comp.status}
                </div>
              </div>
            );
          })}
        </div>

        {/* Incidents */}
        <div>
          <h2 className="text-xl font-light text-white mb-4">{c.incidents.title}</h2>
          {!data?.incidents?.length ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-sm text-zinc-500 text-center" data-testid="status-no-incidents">
              {c.incidents.empty}
            </div>
          ) : (
            <div className="space-y-3">
              {data.incidents.map((inc) => (
                <div key={inc.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-white text-sm font-medium">{inc.title}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {fmtTime(inc.started_at)} — {inc.resolved_at ? fmtTime(inc.resolved_at) : '…'}
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      inc.severity === 'outage' ? 'border-red-700/40 text-red-300 bg-red-500/10' :
                      inc.severity === 'degraded' ? 'border-amber-700/40 text-amber-300 bg-amber-500/10' :
                      'border-zinc-700 text-zinc-400'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                  {inc.updates?.slice(-2).map((u, i) => (
                    <div key={i} className="text-xs text-zinc-400 pl-3 border-l border-zinc-800 mt-1">
                      <span className="text-zinc-600">{fmtTime(u.ts)}</span> · {u.message}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-8 text-xs text-red-400/80">
            Failed to reach status endpoint: {error}
          </div>
        )}
      </div>
    </div>
  );
}
