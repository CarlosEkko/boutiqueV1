import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CalendarClock, Receipt, CheckCircle2, Clock, TrendingUp, Loader2 } from 'lucide-react';
import BillingCheckoutDialog from './BillingCheckoutDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LOCALE_BY_LANG = { PT: 'pt-PT', EN: 'en-GB', FR: 'fr-FR', ES: 'es-ES', AR: 'ar' };

const BillingSection = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState(null);

  const locale = LOCALE_BY_LANG[language] || 'en-GB';

  const FEE_TYPE_LABEL = {
    admission: { label: t('billing.feeAdmission'), color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
    annual: { label: t('billing.feeAnnual'), color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    upgrade: { label: t('billing.feeUpgrade'), color: 'bg-gold-500/15 text-gold-300 border-gold-500/30' },
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(locale); } catch { return iso.slice(0, 10); }
  };

  const fmtMoney = (n) => `€${(n || 0).toLocaleString(locale, { minimumFractionDigits: 2 })}`;

  const reload = async () => {
    try {
      const [s, h] = await Promise.all([
        axios.get(`${API_URL}/api/billing/my-status`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/billing/my-history`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStatus(s.data);
      setHistory(h.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, h] = await Promise.all([
          axios.get(`${API_URL}/api/billing/my-status`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/api/billing/my-history`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!cancelled) {
          setStatus(s.data);
          setHistory(h.data);
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-gold-800/20 mt-6">
        <CardContent className="py-8 flex justify-center"><Loader2 className="animate-spin text-gold-400" /></CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const pending = status.pending_payment;
  const days = status.days_until_due;
  const payments = history?.payments || [];
  const summary = history?.summary || {};

  return (
    <Card className="bg-zinc-900/50 border-gold-800/20 mt-6" id="billing" data-testid="billing-section">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <CalendarClock className="text-gold-400" size={20} />
          {t('billing.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t('billing.currentTier')}</div>
            <div className="text-gold-400 font-semibold capitalize">{status.tier || 'standard'}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t('billing.annualFee')}</div>
            <div className="text-white font-semibold tabular-nums">
              {fmtMoney(status.annual_fee_amount_eur)}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{t('billing.nextRenewal')}</div>
            <div className="text-white text-sm">
              {status.annual_fee_next_due ? fmtDate(status.annual_fee_next_due) : '—'}
              {days != null && (
                <span className={`ml-2 text-xs ${days < 0 ? 'text-red-400' : days < 30 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  ({days >= 0
                    ? t('billing.inDays').replace('{days}', days)
                    : t('billing.agoDays').replace('{days}', -days)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pending payment */}
        {pending && (
          <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-1">{t('billing.pendingPayment')}</div>
              <div className="text-white text-sm">
                {FEE_TYPE_LABEL[pending.fee_type]?.label || pending.fee_type}: <span className="text-gold-400 font-semibold">{fmtMoney(pending.amount)}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">{t('billing.createdOn')} {fmtDate(pending.created_at)}</div>
            </div>
            <Button size="sm" className="bg-gold-500 hover:bg-gold-600 text-black font-medium" data-testid="pay-pending-btn" onClick={() => setCheckoutPaymentId(pending.id)}>
              {t('billing.payNow')}
            </Button>
          </div>
        )}

        {/* Summary tiles */}
        {summary.total_payments > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryTile icon={<Receipt size={14} />} label={t('billing.totalPaid')} value={fmtMoney(summary.total_paid_eur)} />
            <SummaryTile icon={<CheckCircle2 size={14} />} label={t('billing.renewals')} value={summary.annual_count || 0} />
            <SummaryTile icon={<TrendingUp size={14} />} label={t('billing.upgrades')} value={summary.upgrade_count || 0} />
            <SummaryTile icon={<Clock size={14} />} label={t('billing.accountAge')} value={summary.account_age_days != null ? `${summary.account_age_days}d` : '—'} />
          </div>
        )}

        {/* Payments history */}
        {payments.length > 0 && (
          <div>
            <h3 className="text-sm text-zinc-400 uppercase tracking-widest mb-2">{t('billing.history')}</h3>
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/70 border-b border-zinc-800">
                  <tr className="text-zinc-500 text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 text-left">{t('billing.type')}</th>
                    <th className="p-2.5 text-left">{t('billing.tier')}</th>
                    <th className="p-2.5 text-right">{t('billing.amount')}</th>
                    <th className="p-2.5 text-left">{t('billing.date')}</th>
                    <th className="p-2.5 text-left">{t('billing.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice().reverse().slice(0, 10).map((p, i) => {
                    const typeInfo = FEE_TYPE_LABEL[p.fee_type || 'admission'] || FEE_TYPE_LABEL.admission;
                    return (
                      <tr key={i} className="border-t border-zinc-800/60" data-testid={`history-row-${i}`}>
                        <td className="p-2.5">
                          <Badge className={`${typeInfo.color} border text-[10px] tracking-wider`}>
                            {typeInfo.label}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-zinc-300 capitalize">
                          {p.target_tier ? `${p.membership_level} → ${p.target_tier}` : p.membership_level}
                        </td>
                        <td className="p-2.5 text-right text-white tabular-nums">
                          {fmtMoney(p.amount)}
                        </td>
                        <td className="p-2.5 text-zinc-400">{fmtDate(p.paid_at || p.created_at)}</td>
                        <td className="p-2.5">
                          {p.status === 'paid'
                            ? <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{t('billing.paid')}</Badge>
                            : <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30">{t('billing.pending')}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {summary.total_payments === 0 && (
          <div className="text-center text-zinc-500 text-sm py-6">
            {t('billing.noHistory')}
          </div>
        )}
      </CardContent>

      <BillingCheckoutDialog
        open={!!checkoutPaymentId}
        onClose={() => setCheckoutPaymentId(null)}
        paymentId={checkoutPaymentId}
        onSubmitted={reload}
      />
    </Card>
  );
};

const SummaryTile = ({ icon, label, value }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-white font-semibold tabular-nums">{value}</div>
  </div>
);

export default BillingSection;
