/**
 * VenueHealthCard — compact monitor of linked Fireblocks venues.
 *  • Fireblocks API latency per venue
 *  • Hedge count + success rate
 *  • Last-hedge "time since"
 *  • Alerts bar (status != APPROVED, high latency, low success)
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '../../../../components/ui/card';
import { useAuth } from '../../../../context/AuthContext';
import { Activity, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const fmt = (v, d = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: d, maximumFractionDigits: d,
  });
};

const timeAgo = (ms) => {
  if (!ms) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

const latencyTone = (ms) => {
  if (ms === null || ms === undefined) return 'text-zinc-500';
  if (ms < 500) return 'text-emerald-300';
  if (ms < 1500) return 'text-amber-300';
  return 'text-rose-300';
};

export default function VenueHealthCard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/otc-desk/venue-health`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setData(res.data);
      } catch { /* silent */ }
    };
    load();
    const i = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(i); };
  }, [token]);

  if (!data || (data.venues || []).length === 0) {
    return null;
  }

  const { venues, alerts, mode } = data;
  const allGood = (alerts || []).length === 0;

  return (
    <Card
      data-testid="venue-health-card"
      className="bg-zinc-950/80 border border-gold-800/25 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs tracking-[0.2em] uppercase text-gold-400">
            Venue Health
          </h3>
          <p className="text-[11px] text-zinc-500 mt-1">
            Linked Fireblocks exchange accounts — live latency &amp; hedge KPIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-widest uppercase text-zinc-500">Mode</span>
          <span className={`text-[10px] tracking-widest uppercase px-2 py-1 rounded-full ${
            mode === 'live'
              ? 'bg-rose-500/15 text-rose-300'
              : mode === 'shadow'
                ? 'bg-gold-500/15 text-gold-300'
                : 'bg-zinc-800 text-zinc-400'
          }`}>{mode}</span>
        </div>
      </div>

      {allGood ? (
        <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md px-3 py-2 mb-4">
          <CheckCircle2 size={13} className="text-emerald-400" />
          <span className="text-[11px] text-emerald-300">All venues healthy</span>
        </div>
      ) : (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-md px-3 py-2 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={13} className="text-rose-400" />
            <span className="text-[11px] text-rose-300 font-medium">
              {alerts.length} alert{alerts.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="text-[11px] text-zinc-300 space-y-0.5 ml-5 list-disc">
            {alerts.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {venues.map((v) => {
          const good = v.status === 'APPROVED';
          return (
            <div
              key={v.venue_id}
              data-testid={`venue-health-row-${v.type}`}
              className="grid grid-cols-12 gap-3 items-center bg-zinc-950/40 border border-zinc-800/80 rounded-md px-3 py-2.5"
            >
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${good ? 'bg-emerald-400' : 'bg-rose-400'} ${good ? 'animate-pulse' : ''}`} />
                  <span className="text-sm text-white font-medium">{v.name}</span>
                </div>
                <div className="text-[10px] tracking-widest uppercase text-zinc-500 mt-0.5">{v.type}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] tracking-widest uppercase text-zinc-500">Latency</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Zap size={10} className="text-zinc-500" />
                  <span className={`text-xs tabular-nums ${latencyTone(v.avg_latency_ms)}`}>
                    {v.avg_latency_ms ? `${Math.round(v.avg_latency_ms)} ms` : '—'}
                  </span>
                  {v.samples_count > 0 && (
                    <span className="text-[9px] text-zinc-600 ml-1">({v.samples_count})</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] tracking-widest uppercase text-zinc-500">Hedges</div>
                <div className="text-xs text-zinc-200 tabular-nums mt-0.5">
                  {v.hedge_count}
                  {v.fail_count > 0 && (
                    <span className="text-rose-300"> / {v.fail_count} fail</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] tracking-widest uppercase text-zinc-500">Success</div>
                <div className="text-xs text-zinc-200 tabular-nums mt-0.5">
                  {v.success_rate !== null ? `${fmt(v.success_rate, 0)}%` : '—'}
                </div>
              </div>
              <div className="col-span-3 text-right">
                <div className="text-[10px] tracking-widest uppercase text-zinc-500">Last hedge</div>
                <div className="text-xs text-zinc-400 mt-0.5">{timeAgo(v.last_hedge_ms)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
