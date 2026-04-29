import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import {
  CreditCard, Bitcoin, Wallet, Check, Loader2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Map fee_type → Stripe payment_type used by /api/stripe/create-checkout-session
 * (admission_fee | annual_renewal | upgrade_prorata).
 */
const STRIPE_TYPE_BY_FEE = {
  admission: 'admission_fee',
  annual: 'annual_renewal',
  upgrade: 'upgrade_prorata',
};

const FEE_LABEL = {
  admission: 'Taxa de Admissão',
  annual: 'Renovação Anual',
  upgrade: 'Upgrade de Tier',
};

/**
 * PaymentMethodPicker — three-way selector for any KBEX billing payment.
 *
 * Reusable across the three flows that share the exact same UX:
 *   1. Saldo Fiat EUR   — debit from the user's fiat wallet (if enough balance)
 *   2. Cripto / Transf. — existing crypto/bank checkout flow (manual approval)
 *   3. Cartão (Stripe)  — redirect to hosted checkout
 *
 * Props:
 *   amount            number   — amount due in EUR
 *   paymentId         string   — admission_payments.id (already created)
 *   feeType           "admission" | "annual" | "upgrade"
 *   onPaid            fn       — called after a successful instant payment
 *                                 (fiat-balance or after redirect from stripe)
 *   onCryptoSelected  fn       — called when user picks the crypto flow
 *                                 (parent opens BillingCheckoutDialog)
 *   onCancel          fn       — cancel/close
 */
export default function PaymentMethodPicker({
  amount,
  paymentId,
  feeType = 'upgrade',
  onPaid,
  onCryptoSelected,
  onCancel,
}) {
  const { token } = useAuth();
  const [selected, setSelected] = useState(null); // "fiat" | "crypto" | "card"
  const [fiatBalance, setFiatBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch EUR fiat balance on mount
  useEffect(() => {
    let cancelled = false;
    const fetchBalance = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/trading/fiat/balances`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const wallets = Array.isArray(res.data) ? res.data : (res.data?.balances || res.data?.wallets || []);
        const eur = wallets.find((w) => w.currency === 'EUR');
        setFiatBalance(eur ? Number(eur.balance || 0) : 0);
      } catch {
        setFiatBalance(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBalance();
    return () => { cancelled = true; };
  }, [token]);

  const enoughFiat = fiatBalance != null && fiatBalance >= amount;

  const fmtEur = (n) =>
    `€${Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stripePaymentType = STRIPE_TYPE_BY_FEE[feeType] || 'upgrade_prorata';

  const payWithFiat = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/billing/payments/${paymentId}/pay-with-fiat`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const successMsg = feeType === 'upgrade'
        ? `Upgrade para ${(res.data.new_tier || '').toUpperCase()} aplicado · saldo EUR atualizado`
        : `${FEE_LABEL[feeType] || 'Pagamento'} confirmado · saldo EUR atualizado`;
      toast.success(successMsg);
      onPaid?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao processar pagamento via saldo fiat');
    } finally {
      setSubmitting(false);
    }
  };

  const payWithCard = async () => {
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/stripe/create-checkout-session`,
        {
          payment_type: stripePaymentType,
          origin_url: window.location.origin,
          currency: 'eur',
          ...(paymentId ? { payment_id: paymentId } : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('no_url');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao iniciar pagamento com cartão');
      setSubmitting(false);
    }
  };

  const confirm = () => {
    if (selected === 'fiat') return payWithFiat();
    if (selected === 'card') return payWithCard();
    if (selected === 'crypto') return onCryptoSelected?.();
  };

  const options = [
    {
      key: 'fiat',
      icon: Wallet,
      title: 'Saldo Fiat EUR',
      desc: loading
        ? 'A verificar disponível…'
        : enoughFiat
        ? `Disponível ${fmtEur(fiatBalance)} · debita ${fmtEur(amount)} instantaneamente`
        : `Saldo insuficiente (${fmtEur(fiatBalance ?? 0)}).`,
      disabled: loading || !enoughFiat,
      accent: 'from-emerald-500/10 to-emerald-500/0 border-emerald-700/40',
      accentSelected: 'border-emerald-400 bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      hint: enoughFiat ? 'Aplicação imediata · sem aprovação manual' : null,
    },
    {
      key: 'crypto',
      icon: Bitcoin,
      title: 'Cripto / Transferência',
      desc: 'USDT / USDC / BTC / ETH ou transferência bancária. Confirmação em 10–30 min.',
      disabled: !onCryptoSelected,
      accent: 'from-orange-500/10 to-orange-500/0 border-orange-700/40',
      accentSelected: 'border-orange-400 bg-orange-500/10',
      iconColor: 'text-orange-400',
      hint: null,
    },
    {
      key: 'card',
      icon: CreditCard,
      title: 'Cartão (Stripe)',
      desc: 'Visa, Mastercard ou Amex via Stripe. Confirmação em segundos.',
      disabled: false,
      accent: 'from-gold-500/10 to-gold-500/0 border-gold-700/40',
      accentSelected: 'border-gold-400 bg-gold-500/10',
      iconColor: 'text-gold-400',
      hint: 'Ativação imediata',
    },
  ];

  return (
    <div className="space-y-3" data-testid="payment-method-picker">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
        Escolha o método de pagamento
      </div>

      <div className="grid gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => !opt.disabled && setSelected(opt.key)}
              disabled={opt.disabled}
              data-testid={`payment-method-${opt.key}`}
              className={`text-left rounded-lg border px-4 py-3 transition-all bg-gradient-to-r ${
                isSelected ? opt.accentSelected : opt.accent + ' hover:bg-zinc-900/60'
              } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-zinc-900/60 ${opt.iconColor}`}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-white font-medium">{opt.title}</div>
                    {opt.hint && !opt.disabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {opt.hint}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {opt.disabled && opt.key === 'fiat' && fiatBalance != null && !enoughFiat && (
                      <AlertCircle size={11} className="inline mr-1 -mt-0.5 text-amber-500" />
                    )}
                    {opt.desc}
                  </div>
                </div>
                <div
                  className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected ? 'border-white bg-white' : 'border-zinc-600'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-black" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
          className="text-zinc-400 hover:text-white"
          data-testid="payment-picker-cancel-btn"
        >
          Cancelar
        </Button>
        <Button
          onClick={confirm}
          disabled={!selected || submitting}
          className="bg-gold-500 hover:bg-gold-600 text-black font-medium min-w-[140px]"
          data-testid="payment-picker-confirm-btn"
        >
          {submitting ? (
            <Loader2 className="animate-spin mr-1.5" size={14} />
          ) : null}
          Continuar · {fmtEur(amount)}
        </Button>
      </div>
    </div>
  );
}
