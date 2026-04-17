import React from 'react';
import { Badge } from '../../../../components/ui/badge';
import { 
  Shield, AlertTriangle, Mail, Phone, 
  Globe, Linkedin, MessageCircle, Building2,
  ExternalLink, Database, CheckCircle, XCircle
} from 'lucide-react';

const LEVEL_CFG = {
  very_low: { color: '#ef4444', label: 'Very Low', text: 'text-red-400' },
  low: { color: '#f97316', label: 'Low', text: 'text-orange-400' },
  review: { color: '#eab308', label: 'Moderate', text: 'text-yellow-400' },
  high: { color: '#22c55e', label: 'High', text: 'text-green-400' },
  very_high: { color: '#10b981', label: 'Very High', text: 'text-emerald-400' },
  unknown: { color: '#6b7280', label: 'Unknown', text: 'text-gray-400' },
};

const MiniGauge = ({ score = 0, size = 100 }) => {
  const normalized = Math.min(Math.max(score / 1000, 0), 1);
  const cx = size / 2, cy = size / 2 + 4, r = size / 2 - 10;
  const startAngle = -180, sweepAngle = 180 * normalized;
  const polar = (a) => { const rad = a * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
  const arc = (s, e) => { const a = polar(s), b = polar(e); return `M ${a.x} ${a.y} A ${r} ${r} 0 ${Math.abs(e-s) > 180 ? 1 : 0} 1 ${b.x} ${b.y}`; };
  const needleAngle = startAngle + sweepAngle;
  const nRad = needleAngle * Math.PI / 180;
  const tip = { x: cx + (r - 8) * Math.cos(nRad), y: cy + (r - 8) * Math.sin(nRad) };
  let fill = '#ef4444';
  if (score >= 700) fill = '#10b981'; else if (score >= 500) fill = '#22c55e'; else if (score >= 300) fill = '#eab308'; else if (score >= 150) fill = '#f97316';

  return (
    <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
      <path d={arc(-180, 0)} fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
      {score > 0 && <path d={arc(-180, -180 + sweepAngle)} fill="none" stroke={fill} strokeWidth="8" strokeLinecap="round" opacity="0.85" />}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2.5" fill="#18181b" stroke="white" strokeWidth="1.5" />
    </svg>
  );
};

const Dot = ({ ok }) => ok ? <CheckCircle size={10} className="text-green-400" /> : <XCircle size={10} className="text-gray-700" />;

const TrustScoreGauge = ({ data }) => {
  if (!data) return null;

  const score = data.combined_score ?? 0;
  const level = data.risk_level || 'unknown';
  const cfg = LEVEL_CFG[level] || LEVEL_CFG.unknown;
  const emailScore = data.email_risk?.score;
  const phoneScore = data.phone_risk?.score;

  return (
    <div data-testid="trust-score-gauge">
      {/* Top Row: Gauge + Scores */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative shrink-0">
          <MiniGauge score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-base font-bold text-white font-mono leading-none">{score}</span>
            <span className={`text-[8px] font-semibold ${cfg.text} uppercase`}>{cfg.label}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-zinc-800/50 rounded px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-0.5"><Mail size={10} className="text-blue-400" /><span className="text-[9px] text-gray-500 uppercase">Email</span></div>
              <span className="text-sm font-mono font-bold text-white">{emailScore ?? '—'}</span>
              <span className="text-[9px] text-gray-500 ml-1 capitalize">{data.email_risk?.score_cluster || ''}</span>
            </div>
            <div className="bg-zinc-800/50 rounded px-2.5 py-1.5">
              <div className="flex items-center gap-1 mb-0.5"><Phone size={10} className="text-green-400" /><span className="text-[9px] text-gray-500 uppercase">Phone</span></div>
              <span className="text-sm font-mono font-bold text-white">{phoneScore ?? '—'}</span>
              <span className="text-[9px] text-gray-500 ml-1 capitalize">{data.phone_risk?.score_cluster || ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1"><span className="text-[10px] text-gray-600">RISK</span><span className={`text-xs font-bold ${(data.red_flags?.length || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{data.red_flags?.length || 0}</span></div>
            <div className="flex items-center gap-1"><span className="text-[10px] text-gray-600">TRUST</span><span className={`text-xs font-bold ${score >= 500 ? 'text-green-400' : 'text-yellow-400'}`}>{score >= 700 ? 5 : score >= 500 ? 4 : score >= 300 ? 3 : score >= 150 ? 2 : 1}/5</span></div>
          </div>
        </div>
      </div>

      {/* Summary + Connected Accounts side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* Summary */}
        <div className="bg-zinc-800/30 rounded-lg p-2.5 border border-zinc-800/50">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Shield size={10} className="text-gold-400" />Summary</h5>
          <div className="space-y-1 text-[11px]">
            {data.email_risk?.status && <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-white capitalize">{data.email_risk.status}</span></div>}
            {data.email_risk?.is_disposable != null && <div className="flex justify-between"><span className="text-gray-500">Disposable</span><span className={data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{data.email_risk.is_disposable ? 'Yes' : 'No'}</span></div>}
            {data.email_risk?.is_free != null && <div className="flex justify-between"><span className="text-gray-500">Free Provider</span><span className={data.email_risk.is_free ? 'text-yellow-400' : 'text-green-400'}>{data.email_risk.is_free ? 'Yes' : 'No'}</span></div>}
            {data.email_risk?.domain && <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-white">{data.email_risk.domain}</span></div>}
            {data.email_risk?.company_name && <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="text-white truncate ml-2">{data.email_risk.company_name}</span></div>}
            {data.email_risk?.first_seen_days != null && <div className="flex justify-between"><span className="text-gray-500">Email Age</span><span className="text-white">{data.email_risk.first_seen_days}d</span></div>}
            {data.email_risk?.data_breaches_count != null && <div className="flex justify-between"><span className="text-gray-500">Breaches</span><span className={data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{data.email_risk.data_breaches_count}</span></div>}
            {data.phone_risk?.number_type && <div className="flex justify-between"><span className="text-gray-500">Phone Type</span><span className={data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{data.phone_risk.number_type}</span></div>}
            {data.phone_risk?.current_network && <div className="flex justify-between"><span className="text-gray-500">Carrier</span><span className="text-white truncate ml-2">{data.phone_risk.current_network}</span></div>}
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="bg-zinc-800/30 rounded-lg p-2.5 border border-zinc-800/50">
          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Globe size={10} className="text-gold-400" />Connected Accounts</h5>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><Linkedin size={11} className="text-blue-500" /><span className="text-gray-400">LinkedIn</span></div><Dot ok={data.email_risk?.has_linkedin} /></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><ExternalLink size={11} className="text-red-400" /><span className="text-gray-400">Google</span></div><Dot ok={data.email_risk?.has_google} /></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><Building2 size={11} className="text-blue-400" /><span className="text-gray-400">Office 365</span></div><Dot ok={data.email_risk?.has_office365} /></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><ExternalLink size={11} className="text-gray-400" /><span className="text-gray-400">Twitter/X</span></div><Dot ok={data.email_risk?.has_twitter} /></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><Database size={11} className="text-yellow-500" /><span className="text-gray-400">Binance</span></div><Dot ok={data.email_risk?.has_binance} /></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><MessageCircle size={11} className="text-green-500" /><span className="text-gray-400">WhatsApp</span></div><Dot ok={data.phone_risk?.has_whatsapp} /></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><MessageCircle size={11} className="text-blue-400" /><span className="text-gray-400">Telegram</span></div><Dot ok={data.phone_risk?.has_telegram} /></div>
          </div>
        </div>
      </div>

      {/* Red Flags */}
      {data.red_flags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          <AlertTriangle size={11} className="text-red-400" />
          {data.red_flags.map((f, i) => (
            <Badge key={i} className="bg-red-900/40 text-red-400 text-[9px] px-1.5 py-0 border border-red-500/30">{f}</Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrustScoreGauge;
