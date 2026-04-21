import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const MAX_ATTEMPTS = 10;     // ~30 seconds of polling
const POLL_INTERVAL_MS = 3000;

/**
 * PaymentSuccess — landing page after Stripe Hosted Checkout.
 * Polls `/api/stripe/checkout-status/{session_id}` until payment_status="paid"
 * or attempts run out. On success, the backend has already applied the
 * business rule (fee paid, wallet credited, etc.) exactly once via the
 * same endpoint (or via webhook — whichever arrived first).
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const sessionId = params.get('session_id');
  const cancelled = params.get('stripe_cancelled') === '1';

  const [state, setState] = useState(cancelled ? 'cancelled' : 'polling');
  const [data, setData] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (cancelled || !sessionId || !token) return;

    let timer = null;
    const poll = async (n) => {
      if (cancelledRef.current) return;
      try {
        const res = await axios.get(
          `${API_URL}/api/stripe/checkout-status/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(res.data);
        setAttempts(n);

        if (res.data.payment_status === 'paid') {
          setState('success');
          return;
        }
        if (res.data.status === 'expired') {
          setState('expired');
          return;
        }
        if (n >= MAX_ATTEMPTS) {
          setState('timeout');
          return;
        }
        timer = setTimeout(() => poll(n + 1), POLL_INTERVAL_MS);
      } catch (err) {
        setState('error');
      }
    };
    poll(1);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, token, cancelled]);

  const returnPath = {
    admission_fee: '/dashboard/profile',
    annual_renewal: '/dashboard/profile',
    fiat_deposit: '/dashboard/fiat-deposit',
  }[data?.payment_type] || '/dashboard';

  const currencyFmt = (n, c) => {
    const sym = { eur: '€', usd: '$', aed: 'AED ', chf: 'CHF ', qar: 'QAR ', sar: 'SAR ', hkd: 'HK$' }[(c || 'eur').toLowerCase()] || '';
    return `${sym}${Number(n || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  };

  const cards = {
    polling: {
      icon: <Loader2 size={48} className="text-gold-400 animate-spin" />,
      title: 'A confirmar o seu pagamento…',
      body: 'Aguarde um momento. Estamos a verificar com a Stripe.',
      meta: `Tentativa ${attempts} / ${MAX_ATTEMPTS}`,
      accent: 'border-gold-700/40 bg-gold-950/20',
    },
    success: {
      icon: <CheckCircle2 size={48} className="text-emerald-400" />,
      title: 'Pagamento confirmado',
      body: data
        ? `${currencyFmt(data.amount_total, data.currency)} foram processados com sucesso.`
        : 'O seu pagamento foi processado com sucesso.',
      meta: data?.payment_type === 'fiat_deposit'
        ? 'O saldo da sua carteira foi atualizado.'
        : data?.payment_type === 'annual_renewal'
        ? 'A sua subscrição foi renovada por mais 12 meses.'
        : 'A sua conta foi ativada.',
      accent: 'border-emerald-700/40 bg-emerald-950/20',
    },
    timeout: {
      icon: <Clock size={48} className="text-amber-400" />,
      title: 'Confirmação ainda em curso',
      body: 'O seu pagamento pode ainda estar a ser processado pela Stripe. Receberá uma notificação assim que for confirmado.',
      meta: 'Pode fechar esta página em segurança.',
      accent: 'border-amber-700/40 bg-amber-950/20',
    },
    expired: {
      icon: <XCircle size={48} className="text-red-400" />,
      title: 'Sessão expirada',
      body: 'A sessão de pagamento expirou antes de ser concluída. Pode tentar novamente.',
      meta: null,
      accent: 'border-red-700/40 bg-red-950/20',
    },
    cancelled: {
      icon: <XCircle size={48} className="text-zinc-400" />,
      title: 'Pagamento cancelado',
      body: 'Cancelou o pagamento antes de ser concluído. Nada foi cobrado.',
      meta: null,
      accent: 'border-zinc-700/40 bg-zinc-900/60',
    },
    error: {
      icon: <XCircle size={48} className="text-red-400" />,
      title: 'Erro a verificar pagamento',
      body: 'Não conseguimos verificar o estado do pagamento. Se foi cobrado, a equipa KBEX irá regularizar em breve.',
      meta: null,
      accent: 'border-red-700/40 bg-red-950/20',
    },
  }[state];

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div
        className={`max-w-md w-full rounded-xl border ${cards.accent} p-8 text-center space-y-4`}
        data-testid="payment-success-card"
      >
        <div className="flex justify-center">{cards.icon}</div>
        <h1 className="text-2xl font-medium text-white">{cards.title}</h1>
        <p className="text-zinc-300 text-sm">{cards.body}</p>
        {cards.meta && <p className="text-xs text-zinc-500">{cards.meta}</p>}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            onClick={() => navigate(returnPath)}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            data-testid="payment-success-continue-btn"
          >
            Voltar à conta
          </Button>
        </div>
      </div>
    </div>
  );
}
