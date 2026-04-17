import React, { useState } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { 
  Shield, AlertTriangle, Mail, Phone, 
  Globe, Linkedin, MessageCircle, Building2,
  ExternalLink, Database, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Search, Music, ShoppingBag
} from 'lucide-react';

const LEVEL_CFG = {
  very_low: { color: '#ef4444', label: 'Very Low', text: 'text-red-400' },
  low: { color: '#f97316', label: 'Low', text: 'text-orange-400' },
  review: { color: '#eab308', label: 'Moderate', text: 'text-yellow-400' },
  high: { color: '#22c55e', label: 'High', text: 'text-green-400' },
  very_high: { color: '#10b981', label: 'Very High', text: 'text-emerald-400' },
  unknown: { color: '#6b7280', label: 'Unknown', text: 'text-gray-400' },
};

const MiniGauge = ({ score = 0, size = 90 }) => {
  const normalized = Math.min(Math.max(score / 1000, 0), 1);
  const cx = size / 2, cy = size / 2 + 3, r = size / 2 - 8;
  const sweepAngle = 180 * normalized;
  const polar = (a) => { const rad = a * Math.PI / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; };
  const arc = (s, e) => { const a = polar(s), b = polar(e); return `M ${a.x} ${a.y} A ${r} ${r} 0 ${Math.abs(e-s) > 180 ? 1 : 0} 1 ${b.x} ${b.y}`; };
  const nRad = (-180 + sweepAngle) * Math.PI / 180;
  const tip = { x: cx + (r - 8) * Math.cos(nRad), y: cy + (r - 8) * Math.sin(nRad) };
  let fill = '#ef4444';
  if (score >= 700) fill = '#10b981'; else if (score >= 500) fill = '#22c55e'; else if (score >= 300) fill = '#eab308'; else if (score >= 150) fill = '#f97316';

  return (
    <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <path d={arc(-180, 0)} fill="none" stroke="#27272a" strokeWidth="7" strokeLinecap="round" />
      {score > 0 && <path d={arc(-180, -180 + sweepAngle)} fill="none" stroke={fill} strokeWidth="7" strokeLinecap="round" opacity="0.85" />}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="2" fill="#18181b" stroke="white" strokeWidth="1" />
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
  const [showFindings, setShowFindings] = useState(false);

  if (!data) return null;

  const score = data.combined_score ?? 0;
  const level = data.risk_level || 'unknown';
  const cfg = LEVEL_CFG[level] || LEVEL_CFG.unknown;
  const emailScore = data.email_risk?.score;
  const phoneScore = data.phone_risk?.score;

  return (
    <div data-testid="trust-score-gauge">
      {/* Compact: Gauge + Scores inline */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <MiniGauge score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
            <span className="text-sm font-bold text-white font-mono leading-none">{score}</span>
            <span className={`text-[7px] font-semibold ${cfg.text} uppercase`}>{cfg.label}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1"><Mail size={10} className="text-blue-400" /><span className="text-gray-500">Email:</span><span className="font-mono font-bold text-white">{emailScore ?? '—'}</span></div>
            <div className="flex items-center gap-1"><Phone size={10} className="text-green-400" /><span className="text-gray-500">Phone:</span><span className="font-mono font-bold text-white">{phoneScore ?? '—'}</span></div>
            <div className="flex items-center gap-1 ml-auto"><span className="text-[10px] text-gray-600">RISK</span><span className={`font-bold ${(data.red_flags?.length || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>{data.red_flags?.length || 0}</span></div>
            <div className="flex items-center gap-1"><span className="text-[10px] text-gray-600">TRUST</span><span className={`font-bold ${score >= 500 ? 'text-green-400' : 'text-yellow-400'}`}>{score >= 700 ? 5 : score >= 500 ? 4 : score >= 300 ? 3 : score >= 150 ? 2 : 1}/5</span></div>
          </div>

          {data.red_flags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {data.red_flags.map((f, i) => (
                <Badge key={i} className="bg-red-900/40 text-red-400 text-[9px] px-1.5 py-0 border border-red-500/30">{f}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Findings */}
      <button 
        onClick={() => setShowFindings(!showFindings)}
        className={`flex items-center gap-1.5 w-full mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          showFindings 
            ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20' 
            : 'text-gray-500 hover:text-gold-400 hover:bg-zinc-800/50 border border-transparent'
        }`}
        data-testid="toggle-trustfull-findings"
      >
        <Search size={12} />
        Trustfull Findings
        {showFindings ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
      </button>

      {showFindings && (
        <div className="mt-2 rounded-lg border border-gold-800/20 bg-zinc-900/50 overflow-hidden" data-testid="trustfull-findings-panel">
          <div className="px-3 py-2 bg-gold-500/5 border-b border-gold-800/20 flex items-center gap-2">
            <Shield size={12} className="text-gold-400" />
            <span className="text-[10px] font-semibold text-gold-400 uppercase tracking-wider">Trustfull Findings</span>
            <span className={`ml-auto text-[10px] font-bold ${cfg.text}`}>{score}/1000</span>
          </div>

          <div className="p-3 space-y-3">
            {/* Summary */}
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/50">
              <h5 className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield size={11} className="text-gold-400" /> Summary
              </h5>
              <div className="space-y-1.5 text-xs">
                {data.email_risk?.status && (
                  <div className="flex justify-between"><span className="text-gray-500">Email Status</span><span className="text-white capitalize">{data.email_risk.status}</span></div>
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

            {/* Red Flags */}
            {data.red_flags?.length > 0 && (
              <div className="bg-red-500/5 rounded-lg p-3 border border-red-500/20">
                <h5 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> Red Flags ({data.red_flags.length})
                </h5>
                <div className="flex flex-wrap gap-1">
                  {data.red_flags.map((f, i) => (
                    <Badge key={i} className="bg-red-900/40 text-red-400 text-[10px] border border-red-500/30">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustScoreGauge;
