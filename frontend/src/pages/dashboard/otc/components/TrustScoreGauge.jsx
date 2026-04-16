import React from 'react';
import { Badge } from '../../../../components/ui/badge';
import { 
  Shield, AlertTriangle, CheckCircle, Mail, Phone, 
  Globe, Linkedin, MessageCircle, Building2, Calendar,
  ExternalLink, Database
} from 'lucide-react';

const GAUGE_COLORS = {
  very_low: { color: '#ef4444', label: 'Very Low', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  low: { color: '#f97316', label: 'Low', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  review: { color: '#eab308', label: 'Moderate', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { color: '#22c55e', label: 'High', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  very_high: { color: '#10b981', label: 'Very High', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  unknown: { color: '#6b7280', label: 'Unknown', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
};

const GaugeSVG = ({ score = 0, maxScore = 1000, size = 220 }) => {
  const normalized = Math.min(Math.max(score / maxScore, 0), 1);
  const startAngle = -180;
  const endAngle = 0;
  const sweepAngle = (endAngle - startAngle) * normalized;
  
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 20;
  
  const polarToCartesian = (angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  
  const createArc = (start, end) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  // Needle
  const needleAngle = startAngle + sweepAngle;
  const needleEnd = polarToCartesian(needleAngle);
  const needleLength = r - 15;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleTip = { x: cx + needleLength * Math.cos(needleRad), y: cy + needleLength * Math.sin(needleRad) };

  // Color based on score
  let fillColor = '#ef4444';
  if (score >= 700) fillColor = '#10b981';
  else if (score >= 500) fillColor = '#22c55e';
  else if (score >= 300) fillColor = '#eab308';
  else if (score >= 150) fillColor = '#f97316';

  // Tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const angle = startAngle + (i / 10) * (endAngle - startAngle);
    const inner = polarToCartesian(angle);
    const outerR = r + 8;
    const rad = (angle * Math.PI) / 180;
    const outer = { x: cx + outerR * Math.cos(rad), y: cy + outerR * Math.sin(rad) };
    const labelR = r + 20;
    const labelPos = { x: cx + labelR * Math.cos(rad), y: cy + labelR * Math.sin(rad) };
    ticks.push({ inner, outer, label: i * 100, labelPos, angle });
  }

  return (
    <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`}>
      {/* Background arc */}
      <path d={createArc(startAngle, endAngle)} fill="none" stroke="#27272a" strokeWidth="16" strokeLinecap="round" />
      
      {/* Filled arc */}
      {score > 0 && (
        <path d={createArc(startAngle, startAngle + sweepAngle)} fill="none" stroke={fillColor} strokeWidth="16" strokeLinecap="round" opacity="0.9" />
      )}
      
      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <g key={i}>
          <line x1={tick.inner.x} y1={tick.inner.y} x2={tick.outer.x} y2={tick.outer.y} stroke="#3f3f46" strokeWidth="1.5" />
          <text x={tick.labelPos.x} y={tick.labelPos.y} fill="#71717a" fontSize="9" textAnchor="middle" dominantBaseline="middle">
            {tick.label}
          </text>
        </g>
      ))}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#18181b" stroke="white" strokeWidth="2" />
    </svg>
  );
};

const ConnectedAccount = ({ icon: Icon, name, available, color = 'text-gray-400' }) => (
  <div className="flex items-center justify-between py-1.5">
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} />
      <span className="text-gray-400 text-xs">{name}</span>
    </div>
    <span className={`text-xs font-medium ${available ? 'text-green-400' : 'text-gray-600'}`}>
      {available ? 'Yes' : 'No'}
    </span>
  </div>
);

const TrustScoreGauge = ({ data }) => {
  if (!data) return null;

  const score = data.combined_score ?? 0;
  const level = data.risk_level || 'unknown';
  const cfg = GAUGE_COLORS[level] || GAUGE_COLORS.unknown;
  const emailScore = data.email_risk?.score;
  const phoneScore = data.phone_risk?.score;

  return (
    <div className="space-y-4" data-testid="trust-score-gauge">
      {/* Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <GaugeSVG score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-6">
            <span className="text-3xl font-bold text-white font-mono">{score}</span>
            <Badge className={`${cfg.bg} ${cfg.text} ${cfg.border} border text-[10px] mt-1`}>{cfg.label.toUpperCase()}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-2">
          <div className="text-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Risk</span>
            <span className={`ml-2 text-sm font-bold ${(data.red_flags?.length || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{data.red_flags?.length || 0}</span>
          </div>
          <div className="text-center">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Trust</span>
            <span className={`ml-2 text-sm font-bold ${score >= 500 ? 'text-green-400' : 'text-yellow-400'}`}>{score >= 700 ? 5 : score >= 500 ? 4 : score >= 300 ? 3 : score >= 150 ? 2 : 1}</span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg p-3 ${emailScore != null ? 'bg-zinc-800/50' : 'bg-zinc-900/30'} border border-zinc-800`}>
          <div className="flex items-center gap-2 mb-1">
            <Mail size={12} className="text-blue-400" />
            <span className="text-[10px] text-gray-500 uppercase">Email Score</span>
          </div>
          <p className="text-lg font-mono font-bold text-white">{emailScore ?? '—'}</p>
          <p className="text-[10px] text-gray-500 capitalize">{data.email_risk?.score_cluster || ''}</p>
        </div>
        <div className={`rounded-lg p-3 ${phoneScore != null ? 'bg-zinc-800/50' : 'bg-zinc-900/30'} border border-zinc-800`}>
          <div className="flex items-center gap-2 mb-1">
            <Phone size={12} className="text-green-400" />
            <span className="text-[10px] text-gray-500 uppercase">Phone Score</span>
          </div>
          <p className="text-lg font-mono font-bold text-white">{phoneScore ?? '—'}</p>
          <p className="text-[10px] text-gray-500 capitalize">{data.phone_risk?.score_cluster || ''}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800 space-y-2">
        <h5 className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
          <Shield size={12} className="text-gold-400" /> Summary
        </h5>
        <div className="space-y-1.5 text-xs">
          {data.email_risk?.status && (
            <div className="flex justify-between"><span className="text-gray-500">Email Status</span><span className={`text-white capitalize`}>{data.email_risk.status}</span></div>
          )}
          {data.email_risk?.is_disposable != null && (
            <div className="flex justify-between"><span className="text-gray-500">Disposable</span><span className={data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{data.email_risk.is_disposable ? 'Yes' : 'No'}</span></div>
          )}
          {data.email_risk?.is_free != null && (
            <div className="flex justify-between"><span className="text-gray-500">Free Provider</span><span className={data.email_risk.is_free ? 'text-yellow-400' : 'text-green-400'}>{data.email_risk.is_free ? 'Yes' : 'No'}</span></div>
          )}
          {data.email_risk?.domain && (
            <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-white">{data.email_risk.domain}</span></div>
          )}
          {data.email_risk?.company_name && (
            <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="text-white">{data.email_risk.company_name}</span></div>
          )}
          {data.email_risk?.company_industry && (
            <div className="flex justify-between"><span className="text-gray-500">Industry</span><span className="text-white">{data.email_risk.company_industry}</span></div>
          )}
          {data.email_risk?.first_seen_days != null && (
            <div className="flex justify-between"><span className="text-gray-500">Email Age</span><span className="text-white">{data.email_risk.first_seen_days} days</span></div>
          )}
          {data.email_risk?.data_breaches_count != null && (
            <div className="flex justify-between"><span className="text-gray-500">Data Breaches</span><span className={data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{data.email_risk.data_breaches_count}</span></div>
          )}
          {data.phone_risk?.number_type && (
            <div className="flex justify-between"><span className="text-gray-500">Phone Type</span><span className={data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{data.phone_risk.number_type}</span></div>
          )}
          {data.phone_risk?.current_network && (
            <div className="flex justify-between"><span className="text-gray-500">Carrier</span><span className="text-white">{data.phone_risk.current_network}</span></div>
          )}
          {data.phone_risk?.country_code && (
            <div className="flex justify-between"><span className="text-gray-500">Phone Country</span><span className="text-white">{data.phone_risk.country_code}</span></div>
          )}
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800">
        <h5 className="text-xs font-medium text-gray-300 flex items-center gap-1.5 mb-2">
          <Globe size={12} className="text-gold-400" /> Connected Accounts
        </h5>
        <div className="space-y-0">
          <ConnectedAccount icon={Linkedin} name="LinkedIn" available={data.email_risk?.has_linkedin} color="text-blue-500" />
          <ConnectedAccount icon={ExternalLink} name="Google" available={data.email_risk?.has_google} color="text-red-400" />
          <ConnectedAccount icon={Building2} name="Office 365" available={data.email_risk?.has_office365} color="text-blue-400" />
          <ConnectedAccount icon={ExternalLink} name="Twitter/X" available={data.email_risk?.has_twitter} color="text-gray-400" />
          <ConnectedAccount icon={Database} name="Binance" available={data.email_risk?.has_binance} color="text-yellow-500" />
          <ConnectedAccount icon={MessageCircle} name="WhatsApp" available={data.phone_risk?.has_whatsapp} color="text-green-500" />
          <ConnectedAccount icon={MessageCircle} name="Telegram" available={data.phone_risk?.has_telegram} color="text-blue-400" />
        </div>
      </div>

      {/* Red Flags */}
      {data.red_flags?.length > 0 && (
        <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/20">
          <h5 className="text-xs font-medium text-red-400 flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} /> Red Flags ({data.red_flags.length})
          </h5>
          <div className="flex flex-wrap gap-1">
            {data.red_flags.map((f, i) => (
              <Badge key={i} className="bg-red-900/40 text-red-400 text-[10px] border border-red-500/30">{f}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustScoreGauge;
