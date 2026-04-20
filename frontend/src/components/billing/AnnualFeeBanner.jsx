import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { CalendarClock, AlertCircle, CheckCircle2, X, Ban } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const DISMISS_KEY = 'kbex_annual_banner_dismissed';

/**
 * AnnualFeeBanner
 * Shows only when:
 *  - Billing is active and annual fee is imminent (≤ notify_days_before)
 *  - OR there is a pending annual payment
 *  - OR account is suspended
 * Dismissible via close (×) button, persisted in localStorage.
 */
const AnnualFeeBanner = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/billing/my-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setStatus(res.data);
      } catch { /* silent */ }
    })();
    setDismissed(localStorage.getItem(DISMISS_KEY) === new Date().toDateString());
    return () => { cancelled = true; };
  }, [token]);

  if (!status || dismissed) return null;

  const { days_until_due, pending_payment, billing_status, annual_fee_next_due, annual_fee_amount_eur, tier } = status;

  // Nothing to show if user never had annual fee set up and nothing pending
  if (!pending_payment && billing_status !== 'suspended' && (days_until_due == null || days_until_due > 30)) {
    return null;
  }

  const isSuspended = billing_status === 'suspended';
  const isOverdue = days_until_due != null && days_until_due < 0;
  const isPending = !!pending_payment;
  const isImminent = days_until_due != null && days_until_due <= 30 && days_until_due >= 0;

  const style = isSuspended
    ? { border: 'border-red-700/50', bg: 'bg-red-950/40', icon: <Ban size={18} className="text-red-400" />, text: 'text-red-300' }
    : isOverdue
      ? { border: 'border-red-700/50', bg: 'bg-red-950/30', icon: <AlertCircle size={18} className="text-red-400" />, text: 'text-red-300' }
      : isPending
        ? { border: 'border-amber-700/50', bg: 'bg-amber-950/30', icon: <CalendarClock size={18} className="text-amber-400" />, text: 'text-amber-300' }
        : { border: 'border-gold-700/50', bg: 'bg-gold-950/30', icon: <CalendarClock size={18} className="text-gold-400" />, text: 'text-gold-300' };

  const message = isSuspended
    ? 'A sua conta está suspensa por taxa anual em atraso. Regularize o pagamento para reativar os serviços.'
    : isOverdue
      ? `A sua taxa anual ${tier?.toUpperCase?.()} venceu há ${-days_until_due} dias. Regularize antes que a conta seja suspensa.`
      : isPending
        ? `Renovação anual disponível: €${(pending_payment.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (${tier?.toUpperCase?.()}). Aguarda pagamento.`
        : `A sua taxa anual ${tier?.toUpperCase?.()} (€${(annual_fee_amount_eur || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}) vence em ${days_until_due} dias.`;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toDateString());
    setDismissed(true);
  };

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} px-5 py-4 flex items-start gap-4`}
      data-testid="annual-fee-banner"
    >
      <div className="shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] uppercase tracking-[0.2em] ${style.text} font-semibold mb-1`}>
          {isSuspended ? 'Conta Suspensa' : isOverdue ? 'Em Atraso' : isPending ? 'Pagamento Pendente' : 'Renovação Próxima'}
        </div>
        <div className="text-sm text-white">{message}</div>
        {annual_fee_next_due && !isSuspended && (
          <div className="text-[11px] text-zinc-500 mt-1">
            Data de renovação: {new Date(annual_fee_next_due).toLocaleDateString('pt-PT')}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => navigate('/dashboard/profile#billing')}
          className="bg-gold-500 hover:bg-gold-600 text-black font-medium"
          data-testid="banner-pay-btn"
        >
          {isPending ? 'Pagar Agora' : isSuspended ? 'Regularizar' : 'Ver Detalhes'}
        </Button>
        {!isSuspended && !isOverdue && (
          <button
            onClick={dismiss}
            className="text-zinc-500 hover:text-white p-1 transition-colors"
            title="Dispensar por hoje"
            data-testid="banner-dismiss-btn"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AnnualFeeBanner;
