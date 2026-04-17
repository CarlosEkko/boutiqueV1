import React, { useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { 
  Shield, AlertTriangle, Mail, Phone, 
  Globe, Linkedin, MessageCircle, Building2,
  ExternalLink, Database, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Music, ShoppingBag
} from 'lucide-react';

const LEVEL_CFG = {
  very_low: { label: 'VERY LOW', text: 'text-red-400', bg: '#fecaca', textColor: '#dc2626' },
  low: { label: 'LOW', text: 'text-orange-400', bg: '#fed7aa', textColor: '#ea580c' },
  review: { label: 'MODERATE', text: 'text-yellow-500', bg: '#fef3c7', textColor: '#d97706' },
  high: { label: 'HIGH', text: 'text-green-400', bg: '#d1fae5', textColor: '#059669' },
  very_high: { label: 'VERY HIGH', text: 'text-emerald-400', bg: '#a7f3d0', textColor: '#047857' },
  unknown: { label: 'UNKNOWN', text: 'text-gray-400', bg: '#e5e7eb', textColor: '#6b7280' },
};

const BigGauge = ({ score = 0, size = 280 }) => {
  const normalized = Math.min(Math.max(score / 1000, 0), 1);
  const cx = size / 2;
  const cy = size / 2 + 15;
  const outerR = size / 2 - 15;
  const innerR = outerR - 30;
  const startAngle = -180;
  const endAngle = 0;
  const sweepAngle = (endAngle - startAngle) * normalized;

  const polar = (r, angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (r, start, end) => {
    const s = polar(r, start);
    const e = polar(r, end);
    const largeArc = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  // Colored arc (filled portion) — use thick arc
  const arcR = (outerR + innerR) / 2;
  const arcWidth = outerR - innerR;

  // Needle
  const needleAngle = startAngle + sweepAngle;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = outerR - 5;
  const needleTip = { x: cx + needleLen * Math.cos(needleRad), y: cy + needleLen * Math.sin(needleRad) };

  // Tick marks (major every 100, minor every 50)
  const ticks = [];
  for (let val = 0; val <= 1000; val += 50) {
    const angle = startAngle + (val / 1000) * (endAngle - startAngle);
    const isMajor = val % 100 === 0;
    const tickOuterR = outerR + 2;
    const tickInnerR = isMajor ? innerR - 2 : innerR + 8;
    const outer = polar(tickOuterR, angle);
    const inner = polar(tickInnerR, angle);
    ticks.push({ outer, inner, isMajor, val, angle });
  }

  // Number labels (every 100)
  const labels = [];
  for (let val = 0; val <= 1000; val += 100) {
    const angle = startAngle + (val / 1000) * (endAngle - startAngle);
    const labelR = innerR - 16;
    const pos = polar(labelR, angle);
    labels.push({ val, pos, angle });
  }

  return (
    <svg width={size} height={size / 2 + 35} viewBox={`0 0 ${size} ${size / 2 + 35}`}>
      {/* Background arc */}
      <path d={arcPath(arcR, startAngle, endAngle)} fill="none" stroke="#2a2a2e" strokeWidth={arcWidth} strokeLinecap="butt" />

      {/* Filled arc (amber/gold) */}
      {score > 0 && (
        <path d={arcPath(arcR, startAngle, startAngle + sweepAngle)} fill="none" stroke="#d4a017" strokeWidth={arcWidth} strokeLinecap="butt" opacity="0.9" />
      )}

      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <line key={i} x1={tick.inner.x} y1={tick.inner.y} x2={tick.outer.x} y2={tick.outer.y}
          stroke={tick.isMajor ? '#71717a' : '#3f3f46'} strokeWidth={tick.isMajor ? 2 : 1} />
      ))}

      {/* Number labels */}
      {labels.map((label, i) => (
        <text key={i} x={label.pos.x} y={label.pos.y}
          fill="#a1a1aa" fontSize="11" fontWeight="500" fontFamily="monospace"
          textAnchor="middle" dominantBaseline="middle">
          {label.val}
        </text>
      ))}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
        stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="#18181b" stroke="#ffffff" strokeWidth="2.5" />
    </svg>
  );
};

const AccountRow = ({ icon: Icon, name, available, color }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center gap-2">
      <Icon size={13} className={color} />
      <span className="text-gray-400 text-xs">{name}</span>
    </div>
    <span className={`text-xs font-medium ${available ? 'text-green-400' : 'text-gray-600'}`}>{available ? 'Yes' : 'No'}</span>
  </div>
);

const TrustScoreGauge = ({ data }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!data) return null;

  const score = data.combined_score ?? 0;
  const level = data.risk_level || 'unknown';
  const cfg = LEVEL_CFG[level] || LEVEL_CFG.unknown;
  const riskCount = data.red_flags?.length || 0;
  const trustLevel = score >= 700 ? 5 : score >= 500 ? 4 : score >= 300 ? 3 : score >= 150 ? 2 : score > 0 ? 1 : 0;

  return (
    <div data-testid="trust-score-gauge">
      {/* Big Gauge */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <BigGauge score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-8">
            <span className="text-4xl font-bold text-white font-mono leading-none">{score}</span>
            <span className="mt-1.5 px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
              style={{ backgroundColor: cfg.bg, color: cfg.textColor }}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* RISK / TRUST */}
        <div className="flex items-center gap-10 -mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium tracking-wider">RISK</span>
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${riskCount > 0 ? 'bg-red-400/20 text-red-400' : 'bg-green-400/20 text-green-400'}`}>{riskCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium tracking-wider">TRUST</span>
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${trustLevel >= 4 ? 'bg-green-400/20 text-green-400' : trustLevel >= 2 ? 'bg-yellow-400/20 text-yellow-400' : 'bg-red-400/20 text-red-400'}`}>{trustLevel}</span>
          </div>
        </div>
      </div>

      {/* Red Flags */}
      {riskCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 justify-center">
          {data.red_flags.map((f, i) => (
            <Badge key={i} className="bg-red-900/40 text-red-400 text-[9px] px-1.5 py-0 border border-red-500/30">{f}</Badge>
          ))}
        </div>
      )}

      {/* Collapsible Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1.5 w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          showDetails
            ? 'bg-zinc-800 text-white border border-zinc-700'
            : 'text-gray-500 hover:text-white hover:bg-zinc-800/50 border border-zinc-800'
        }`}
        data-testid="toggle-risk-details"
      >
        <Shield size={13} />
        Details
        {showDetails ? <ChevronUp size={13} className="ml-auto" /> : <ChevronDown size={13} className="ml-auto" />}
      </button>

      {showDetails && (
        <div className="mt-2 space-y-2">
          {/* Email & Phone Scores */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-800">
              <div className="flex items-center gap-1.5 mb-1"><Mail size={12} className="text-blue-400" /><span className="text-[10px] text-gray-500 uppercase">Email Score</span></div>
              <span className="text-lg font-mono font-bold text-white">{data.email_risk?.score ?? '—'}</span>
              <span className="text-[10px] text-gray-500 ml-1.5 capitalize">{data.email_risk?.score_cluster || ''}</span>
            </div>
            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-800">
              <div className="flex items-center gap-1.5 mb-1"><Phone size={12} className="text-green-400" /><span className="text-[10px] text-gray-500 uppercase">Phone Score</span></div>
              <span className="text-lg font-mono font-bold text-white">{data.phone_risk?.score ?? '—'}</span>
              <span className="text-[10px] text-gray-500 ml-1.5 capitalize">{data.phone_risk?.score_cluster || ''}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/50">
            <h5 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield size={11} className="text-gold-400" /> Summary
            </h5>
            <div className="space-y-1.5 text-xs">
              {data.email_risk?.status && <div className="flex justify-between"><span className="text-gray-500">Email Status</span><span className="text-white capitalize">{data.email_risk.status}</span></div>}
              {data.email_risk?.is_disposable != null && <div className="flex justify-between"><span className="text-gray-500">Disposable</span><span className={data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{data.email_risk.is_disposable ? 'Yes' : 'No'}</span></div>}
              {data.email_risk?.is_free != null && <div className="flex justify-between"><span className="text-gray-500">Free Provider</span><span className={data.email_risk.is_free ? 'text-yellow-400' : 'text-green-400'}>{data.email_risk.is_free ? 'Yes' : 'No'}</span></div>}
              {data.email_risk?.domain && <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-white">{data.email_risk.domain}</span></div>}
              {data.email_risk?.company_name && <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="text-white">{data.email_risk.company_name}</span></div>}
              {data.email_risk?.company_industry && <div className="flex justify-between"><span className="text-gray-500">Industry</span><span className="text-white">{data.email_risk.company_industry}</span></div>}
              {data.email_risk?.first_seen_days != null && <div className="flex justify-between"><span className="text-gray-500">Email Age</span><span className="text-white">{data.email_risk.first_seen_days} days</span></div>}
              {data.email_risk?.data_breaches_count != null && <div className="flex justify-between"><span className="text-gray-500">Data Breaches</span><span className={data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{data.email_risk.data_breaches_count}</span></div>}
              {data.phone_risk?.number_type && <div className="flex justify-between"><span className="text-gray-500">Phone Type</span><span className={data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{data.phone_risk.number_type}</span></div>}
              {data.phone_risk?.current_network && <div className="flex justify-between"><span className="text-gray-500">Carrier</span><span className="text-white">{data.phone_risk.current_network}</span></div>}
              {data.phone_risk?.country_code && <div className="flex justify-between"><span className="text-gray-500">Phone Country</span><span className="text-white">{data.phone_risk.country_code}</span></div>}
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/50">
            <h5 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe size={11} className="text-gold-400" /> Connected Accounts
            </h5>
            <div className="space-y-0.5">
              <AccountRow icon={Linkedin} name="LinkedIn" available={data.email_risk?.has_linkedin} color="text-blue-500" />
              <AccountRow icon={ExternalLink} name="Google" available={data.email_risk?.has_google} color="text-red-400" />
              <AccountRow icon={Building2} name="Office 365" available={data.email_risk?.has_office365} color="text-blue-400" />
              <AccountRow icon={ExternalLink} name="Twitter/X" available={data.email_risk?.has_twitter} color="text-gray-400" />
              <AccountRow icon={Database} name="PayPal" available={data.email_risk?.has_paypal} color="text-blue-600" />
              <AccountRow icon={Music} name="Spotify" available={data.email_risk?.has_spotify} color="text-green-500" />
              <AccountRow icon={ShoppingBag} name="Amazon" available={data.email_risk?.has_amazon} color="text-orange-400" />
              <AccountRow icon={MessageCircle} name="WhatsApp" available={data.phone_risk?.has_whatsapp} color="text-green-500" />
              <AccountRow icon={MessageCircle} name="Telegram" available={data.phone_risk?.has_telegram} color="text-blue-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustScoreGauge;
