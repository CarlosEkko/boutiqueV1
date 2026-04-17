import React, { useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { 
  Shield, AlertTriangle, Mail, Phone, 
  Globe, Linkedin, MessageCircle, Building2,
  ExternalLink, Database, ChevronDown, ChevronUp
} from 'lucide-react';

const LEVEL_CFG = {
  very_low: { color: '#ef4444', label: 'Very Low', text: 'text-red-400' },
  low: { color: '#f97316', label: 'Low', text: 'text-orange-400' },
  review: { color: '#eab308', label: 'Moderate', text: 'text-yellow-400' },
  high: { color: '#22c55e', label: 'High', text: 'text-green-400' },
  very_high: { color: '#10b981', label: 'Very High', text: 'text-emerald-400' },
  unknown: { color: '#6b7280', label: 'Unknown', text: 'text-gray-400' },
};

const MiniGauge = ({ score = 0, size = 120 }) => {
  const normalized = Math.min(Math.max(score / 1000, 0), 1);
  const cx = size / 2, cy = size / 2 + 4, r = size / 2 - 12;
  const startAngle = -180, sweepAngle = 180 * normalized;
  const polar = (a) => { const rad = a * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
  const arc = (s, e) => { const a = polar(s), b = polar(e); return `M ${a.x} ${a.y} A ${r} ${r} 0 ${Math.abs(e-s) > 180 ? 1 : 0} 1 ${b.x} ${b.y}`; };
  const needleAngle = startAngle + sweepAngle;
  const nRad = needleAngle * Math.PI / 180;
  const tip = { x: cx + (r - 10) * Math.cos(nRad), y: cy + (r - 10) * Math.sin(nRad) };
  let fill = '#ef4444';
  if (score >= 700) fill = '#10b981'; else if (score >= 500) fill = '#22c55e'; else if (score >= 300) fill = '#eab308'; else if (score >= 150) fill = '#f97316';

  return (
    <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
      <path d={arc(-180, 0)} fill="none" stroke="#27272a" strokeWidth="10" strokeLinecap="round" />
      {score > 0 && <path d={arc(-180, -180 + sweepAngle)} fill="none" stroke={fill} strokeWidth="10" strokeLinecap="round" opacity="0.85" />}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill="#18181b" stroke="white" strokeWidth="1.5" />
    </svg>
  );
};

const AccountDot = ({ icon: Icon, available, color, title }) => (
  <div className={`flex items-center gap-1 ${available ? color : 'text-gray-700'}`} title={title}>
    <Icon size={11} />
  </div>
);

const TrustScoreGauge = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const score = data.combined_score ?? 0;
  const level = data.risk_level || 'unknown';
  const cfg = LEVEL_CFG[level] || LEVEL_CFG.unknown;
  const emailScore = data.email_risk?.score;
  const phoneScore = data.phone_risk?.score;

  return (
    <div className="space-y-2" data-testid="trust-score-gauge">
      {/* Compact Row: Gauge + Scores + Accounts */}
      <div className="flex items-center gap-4">
        {/* Mini Gauge */}
        <div className="relative shrink-0">
          <MiniGauge score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <span className="text-lg font-bold text-white font-mono leading-none">{score}</span>
            <span className={`text-[9px] font-medium ${cfg.text} uppercase`}>{cfg.label}</span>
          </div>
        </div>

        {/* Scores + Connected */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <Mail size={11} className="text-blue-400" />
              <span className="text-xs text-gray-500">Email:</span>
              <span className="text-xs font-mono font-bold text-white">{emailScore ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={11} className="text-green-400" />
              <span className="text-xs text-gray-500">Phone:</span>
              <span className="text-xs font-mono font-bold text-white">{phoneScore ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] text-gray-600">RISK</span>
              <span className={`text-xs font-bold ${(data.red_flags?.length || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{data.red_flags?.length || 0}</span>
            </div>
          </div>

          {/* Connected Accounts - Compact Icons */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 shrink-0">Accounts:</span>
            <div className="flex items-center gap-1.5">
              <AccountDot icon={Linkedin} available={data.email_risk?.has_linkedin} color="text-blue-500" title="LinkedIn" />
              <AccountDot icon={ExternalLink} available={data.email_risk?.has_google} color="text-red-400" title="Google" />
              <AccountDot icon={Building2} available={data.email_risk?.has_office365} color="text-blue-400" title="Office 365" />
              <AccountDot icon={ExternalLink} available={data.email_risk?.has_twitter} color="text-gray-300" title="Twitter/X" />
              <AccountDot icon={Database} available={data.email_risk?.has_binance} color="text-yellow-500" title="Binance" />
              <AccountDot icon={MessageCircle} available={data.phone_risk?.has_whatsapp} color="text-green-500" title="WhatsApp" />
              <AccountDot icon={MessageCircle} available={data.phone_risk?.has_telegram} color="text-blue-400" title="Telegram" />
            </div>
          </div>

          {/* Red Flags inline */}
          {data.red_flags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {data.red_flags.map((f, i) => (
                <Badge key={i} className="bg-red-900/40 text-red-400 text-[9px] px-1.5 py-0 border border-red-500/30">{f}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expand/Collapse for Summary */}
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gold-400 transition-colors w-full justify-center pt-1"
        data-testid="toggle-trust-details">
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Less' : 'Details'}
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] bg-zinc-800/30 rounded-lg p-3 border border-zinc-800">
          {data.email_risk?.status && <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-white capitalize">{data.email_risk.status}</span></div>}
          {data.email_risk?.is_disposable != null && <div className="flex justify-between"><span className="text-gray-500">Disposable</span><span className={data.email_risk.is_disposable ? 'text-red-400' : 'text-green-400'}>{data.email_risk.is_disposable ? 'Yes' : 'No'}</span></div>}
          {data.email_risk?.is_free != null && <div className="flex justify-between"><span className="text-gray-500">Free</span><span className={data.email_risk.is_free ? 'text-yellow-400' : 'text-green-400'}>{data.email_risk.is_free ? 'Yes' : 'No'}</span></div>}
          {data.email_risk?.domain && <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-white">{data.email_risk.domain}</span></div>}
          {data.email_risk?.company_name && <div className="flex justify-between"><span className="text-gray-500">Company</span><span className="text-white">{data.email_risk.company_name}</span></div>}
          {data.email_risk?.first_seen_days != null && <div className="flex justify-between"><span className="text-gray-500">Age</span><span className="text-white">{data.email_risk.first_seen_days}d</span></div>}
          {data.email_risk?.data_breaches_count != null && <div className="flex justify-between"><span className="text-gray-500">Breaches</span><span className={data.email_risk.data_breaches_count > 3 ? 'text-orange-400' : 'text-white'}>{data.email_risk.data_breaches_count}</span></div>}
          {data.phone_risk?.number_type && <div className="flex justify-between"><span className="text-gray-500">Phone Type</span><span className={data.phone_risk.number_type === 'VOIP' ? 'text-orange-400' : 'text-white'}>{data.phone_risk.number_type}</span></div>}
          {data.phone_risk?.current_network && <div className="flex justify-between"><span className="text-gray-500">Carrier</span><span className="text-white">{data.phone_risk.current_network}</span></div>}
          {data.phone_risk?.country_code && <div className="flex justify-between"><span className="text-gray-500">Country</span><span className="text-white">{data.phone_risk.country_code}</span></div>}
        </div>
      )}
    </div>
  );
};

export default TrustScoreGauge;
