import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Bitcoin, Loader2, Copy, Check, Building2, AlertCircle, ArrowRight,
  Banknote, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import PaymentMethodPicker from './PaymentMethodPicker';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CRYPTO_META = {
  BTC: { label: 'Bitcoin', network: 'Bitcoin' },
  ETH: { label: 'Ethereum', network: 'ERC-20' },
  USDT: { label: 'Tether', network: 'ERC-20' },
  USDC: { label: 'USD Coin', network: 'ERC-20' },
};

const FEE_LABEL = {
  annual: 'Renovação Anual',
  upgrade: 'Upgrade de Tier',
  admission: 'Taxa de Admissão',
};

/**
 * BillingCheckoutDialog
 * Generic checkout for annual / upgrade payments.
 * Props:
 *   - open (bool)
 *   - onClose (fn)
 *   - paymentId (string)
 *   - onSubmitted (fn) — called after successful submission
 */
const BillingCheckoutDialog = ({ open, onClose, paymentId, onSubmitted }) => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // "picker" = 3-card method selector (default landing).
  // "crypto" / "bank_transfer" = detailed flow once user picks Cripto/Transferência.
  const [stage, setStage] = useState('picker');
  const [method, setMethod] = useState('crypto');
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (!open || !paymentId) return;
    let cancelled = false;
    setLoading(true);
    setStage('picker');
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/billing/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setData(res.data);
          const banks = res.data.bank_accounts || [];
          if (banks.length > 0) setSelectedBankId(banks[0].id);
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || 'Falha ao carregar checkout');
        onClose?.();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, paymentId, token, onClose]);

  const copy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => setCopiedField(null), 1500);
  };

  const submit = async () => {
    if (method === 'bank_transfer' && !selectedBankId) {
      toast.error('Selecione uma conta bancária');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/billing/payments/${paymentId}/submit`,
        {
          payment_method: method,
          crypto_currency: method === 'crypto' ? selectedCrypto : null,
          bank_account_id: method === 'bank_transfer' ? selectedBankId : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pagamento submetido. Aguarda confirmação do administrador.');
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao submeter');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const payment = data?.payment;
  const cryptoAmounts = data?.crypto_amounts || {};
  const wallets = data?.crypto_wallets || {};
  const banks = data?.bank_accounts || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-zinc-950 border-gold-800/30 text-white max-w-lg max-h-[90vh] overflow-y-auto" data-testid="billing-checkout-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold-400">
            <Banknote size={18} />
            {payment ? (FEE_LABEL[payment.fee_type] || 'Pagamento') : 'Checkout'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Selecione o método de pagamento. O administrador confirma após receber os fundos.
          </DialogDescription>
        </DialogHeader>

        {loading || !payment ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gold-400" /></div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg border border-gold-800/40 bg-gold-950/20 p-4 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Tipo</span>
                <Badge className="bg-gold-500/15 text-gold-300 border border-gold-500/30 text-[10px] tracking-wider">
                  {FEE_LABEL[payment.fee_type] || payment.fee_type}
                </Badge>
              </div>
              {payment.target_tier && (
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Upgrade</span>
                  <span className="text-white capitalize">
                    {payment.membership_level} <ArrowRight size={10} className="inline mx-1" /> {payment.target_tier}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-baseline border-t border-gold-700/40 pt-2">
                <span className="text-sm text-white">Total</span>
                <span className="text-xl font-semibold text-gold-400 tabular-nums">
                  €{(payment.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Stage 1: 3-card method picker (Saldo Fiat / Cripto / Cartão) */}
            {stage === 'picker' && (
              <PaymentMethodPicker
                amount={Number(payment.amount || 0)}
                paymentId={payment.id}
                feeType={payment.fee_type || 'annual'}
                onCryptoSelected={() => {
                  // Default to crypto sub-tab; user may switch to bank inside
                  setMethod('crypto');
                  setStage('crypto');
                }}
                onPaid={() => {
                  toast.success('Pagamento processado · saldo atualizado');
                  onSubmitted?.();
                  onClose?.();
                }}
                onCancel={onClose}
              />
            )}

            {/* Back to picker */}
            {stage !== 'picker' && (
              <button
                type="button"
                onClick={() => setStage('picker')}
                className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1"
                data-testid="back-to-picker-btn"
              >
                <ArrowLeft size={12} /> Voltar aos métodos
              </button>
            )}

            {/* Method toggle */}
            {stage !== 'picker' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMethod('crypto'); setStage('crypto'); }}
                className={`rounded-lg border px-3 py-2.5 transition-all flex items-center gap-2 ${
                  method === 'crypto' ? 'border-gold-500/60 bg-gold-950/30 text-gold-300' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
                data-testid="method-crypto-btn"
              >
                <Bitcoin size={14} />
                <span className="text-sm">Crypto</span>
              </button>
              <button
                onClick={() => { setMethod('bank_transfer'); setStage('bank_transfer'); }}
                className={`rounded-lg border px-3 py-2.5 transition-all flex items-center gap-2 ${
                  method === 'bank_transfer' ? 'border-gold-500/60 bg-gold-950/30 text-gold-300' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
                data-testid="method-bank-btn"
              >
                <Building2 size={14} />
                <span className="text-sm">Transferência</span>
              </button>
            </div>
            )}

            {/* Crypto flow */}
            {stage !== 'picker' && method === 'crypto' && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {['BTC', 'ETH', 'USDT', 'USDC'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCrypto(c)}
                      className={`rounded-md border px-2 py-2 text-xs font-semibold transition-all ${
                        selectedCrypto === c ? 'border-gold-500/60 bg-gold-950/30 text-gold-300' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                      }`}
                      data-testid={`crypto-${c}-btn`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2.5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">Montante ({selectedCrypto})</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-light text-white tabular-nums">
                        {cryptoAmounts[selectedCrypto] ? cryptoAmounts[selectedCrypto].toLocaleString('pt-PT', { maximumFractionDigits: 8 }) : '—'}
                      </span>
                      <span className="text-xs text-zinc-500">{CRYPTO_META[selectedCrypto]?.network}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Endereço {selectedCrypto}</div>
                    <div className="flex items-center gap-2 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1.5">
                      <code className="flex-1 text-[11px] text-zinc-300 break-all font-mono">
                        {wallets[selectedCrypto] || '—'}
                      </code>
                      <button
                        onClick={() => copy(wallets[selectedCrypto], 'addr')}
                        className="text-zinc-400 hover:text-gold-400 transition-colors shrink-0"
                        data-testid="copy-address-btn"
                      >
                        {copiedField === 'addr' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 rounded-md bg-amber-950/20 border border-amber-800/30 p-2">
                    <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-200/80">
                      Envie exactamente este montante para a rede <span className="font-semibold">{CRYPTO_META[selectedCrypto]?.network}</span>.
                      Após envio, clique em "Submeter" — o admin confirma assim que o depósito for detectado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bank flow */}
            {stage !== 'picker' && method === 'bank_transfer' && (
              <div className="space-y-3">
                {banks.length === 0 ? (
                  <div className="text-center text-zinc-500 text-sm py-4">
                    Nenhuma conta bancária configurada. Contacte o administrador.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedBankId || ''}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white"
                      data-testid="bank-select"
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} — {b.currency}
                        </option>
                      ))}
                    </select>
                    {(() => {
                      const bank = banks.find((b) => b.id === selectedBankId);
                      if (!bank) return null;
                      return (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
                          <InfoRow label="Beneficiário" value={bank.account_holder} onCopy={(v) => copy(v, 'holder')} copied={copiedField === 'holder'} />
                          <InfoRow label="IBAN" value={bank.iban} onCopy={(v) => copy(v, 'iban')} copied={copiedField === 'iban'} mono />
                          <InfoRow label="BIC/SWIFT" value={bank.bic} onCopy={(v) => copy(v, 'bic')} copied={copiedField === 'bic'} mono />
                          <InfoRow
                            label="Referência"
                            value={`KBEX-${(payment.fee_type || 'fee').toUpperCase()}-${payment.id.slice(0, 8)}`}
                            onCopy={(v) => copy(v, 'ref')}
                            copied={copiedField === 'ref'}
                            mono
                          />
                        </div>
                      );
                    })()}
                    <div className="flex items-start gap-2 rounded-md bg-blue-950/20 border border-blue-800/30 p-2">
                      <AlertCircle size={12} className="text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-200/80">
                        Inclua obrigatoriamente a referência na sua transferência. As transferências SEPA demoram 1-2 dias úteis.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Submit (only on detailed crypto/bank stages) */}
            {stage !== 'picker' && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white" data-testid="checkout-cancel">
                Cancelar
              </Button>
              <Button
                onClick={submit}
                disabled={submitting || (method === 'bank_transfer' && banks.length === 0)}
                className="bg-gold-500 hover:bg-gold-600 text-black font-medium"
                data-testid="checkout-submit"
              >
                {submitting ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} className="mr-1.5" />}
                Submeter Pagamento
              </Button>
            </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ label, value, onCopy, copied, mono }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</div>
    <div className="flex items-center gap-2 rounded-md bg-zinc-950 border border-zinc-800 px-2 py-1.5">
      <span className={`flex-1 text-xs ${mono ? 'font-mono break-all' : ''} text-zinc-200`}>{value || '—'}</span>
      {value && (
        <button onClick={() => onCopy(value)} className="text-zinc-400 hover:text-gold-400 shrink-0 transition-colors">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      )}
    </div>
  </div>
);

export default BillingCheckoutDialog;
