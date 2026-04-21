import { useState } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * StripeCheckoutButton — reusable button that initiates a Stripe Hosted
 * Checkout session for any of KBEX's three payment flows.
 *
 * Security: the amount is NEVER sent from the frontend for admission_fee or
 * annual_renewal — the backend resolves it from the user's tier + platform
 * settings. Only `fiat_deposit` accepts `depositAmount`, which is still
 * validated server-side against min/max guardrails.
 *
 * Props:
 *   paymentType: "admission_fee" | "annual_renewal" | "fiat_deposit"
 *   depositAmount?: number   (required when paymentType=fiat_deposit)
 *   currency?: string        (default "eur")
 *   label?: string           (button text)
 *   className?: string
 *   variant?: "primary" | "outline"  (visual style)
 *   disabled?: boolean
 *   onError?: (msg) => void
 */
export default function StripeCheckoutButton({
  paymentType,
  depositAmount,
  currency = 'eur',
  label,
  className = '',
  variant = 'primary',
  disabled = false,
  onError,
  'data-testid': testId,
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const defaultLabel = {
    admission_fee: 'Pagar com Cartão',
    annual_renewal: 'Pagar Renovação com Cartão',
    fiat_deposit: 'Depositar com Cartão',
  }[paymentType] || 'Pagar com Cartão';

  const start = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/stripe/create-checkout-session`,
        {
          payment_type: paymentType,
          origin_url: window.location.origin,
          currency: currency.toLowerCase(),
          ...(paymentType === 'fiat_deposit' && depositAmount
            ? { deposit_amount: Number(depositAmount) }
            : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.url) {
        // Redirect to Stripe's hosted checkout. User comes back via
        // `${origin}${success_path}?session_id={CHECKOUT_SESSION_ID}`.
        window.location.href = res.data.url;
      } else {
        throw new Error('no_checkout_url');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Falha ao iniciar pagamento. Tente novamente.';
      toast.error(msg);
      onError?.(msg);
      setLoading(false);
    }
    // Note: we don't clear loading on success because page is redirecting.
  };

  const styles = variant === 'outline'
    ? 'border border-gold-700/60 text-gold-300 hover:bg-gold-500/10 bg-transparent'
    : 'bg-gold-500 hover:bg-gold-600 text-black font-medium';

  return (
    <Button
      onClick={start}
      disabled={disabled || loading}
      className={`${styles} ${className}`}
      data-testid={testId || `stripe-checkout-${paymentType}`}
    >
      {loading ? (
        <Loader2 size={14} className="mr-1.5 animate-spin" />
      ) : (
        <CreditCard size={14} className="mr-1.5" />
      )}
      {label || defaultLabel}
    </Button>
  );
}
