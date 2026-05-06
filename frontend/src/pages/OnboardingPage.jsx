import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Shield,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Lock,
  Copy,
  Check,
  Bitcoin,
  Landmark,
  ArrowLeft,
  QrCode,
  ExternalLink,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import StripeCheckoutButton from '../components/billing/StripeCheckoutButton';
import PaymentMethodPicker from '../components/billing/PaymentMethodPicker';
import BillingCheckoutDialog from '../components/billing/BillingCheckoutDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Crypto addresses from Fireblocks Vault "Cofre Tx anual" (Vault ID: 69)
const CRYPTO_ADDRESSES = {
  BTC: 'bc1q83zcsh5kmtac53kwjjn2yh6wpujgnac79cdxyf',
  ETH: '0x8a64196045B2E213e9cC0ab93865639CE93c8dbC',
  USDT: '0x8a64196045B2E213e9cC0ab93865639CE93c8dbC',
  USDC: '0x8a64196045B2E213e9cC0ab93865639CE93c8dbC'
};

const OnboardingPage = () => {
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Admission Fee, 2: 2FA Setup, 3: Complete
  const [admissionStatus, setAdmissionStatus] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [submitting, setSubmitting] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(false);
  
  // Payment gateway states
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'crypto' or 'transfer'
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  
  // Company bank accounts
  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  
  // 2FA states
  const [twoFASecret, setTwoFASecret] = useState(null);
  const [twoFAQRCode, setTwoFAQRCode] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');

  // Unified 3-option payment picker for the admission fee.
  // Holds { paymentId, amount } once the admission_payments row exists.
  const [admissionPicker, setAdmissionPicker] = useState(null);
  // When user picks "Cripto / Transferência" we show the existing detailed
  // BillingCheckoutDialog flow on top of the picker.
  const [admissionCheckoutId, setAdmissionCheckoutId] = useState(null);
  const [creatingPicker, setCreatingPicker] = useState(false);

  const openAdmissionPicker = async () => {
    setCreatingPicker(true);
    try {
      // Server returns the existing pending row if there is one.
      // NOTE: send an empty JSON body (not null) — some Cloudflare WAF
      // rules block POSTs with empty/null bodies as suspected CSRF.
      const res = await axios.post(
        `${API_URL}/api/referrals/admission-fee/request`,
        { currency: 'EUR' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: { currency: 'EUR' },
        }
      );
      const paymentId = res.data?.payment_id;
      const amount = Number(res.data?.amount || admissionStatus?.eur_amount || 0);
      if (!paymentId) throw new Error('payment_id em falta');
      setAdmissionPicker({ paymentId, amount });
    } catch (err) {
      // Surface the real backend error so issues are diagnosable in production
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      const fallback = 'Falha ao iniciar pagamento de admissão';
      const msg = detail
        ? `${fallback}: ${detail}`
        : status
          ? `${fallback} (HTTP ${status})`
          : err?.message
            ? `${fallback}: ${err.message}`
            : fallback;
      console.error('admission request failed:', err);
      toast.error(msg);
    } finally {
      setCreatingPicker(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
      fetchCompanyAccounts();
    }
  }, [user, token]);

  const fetchCompanyAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/company-bank-accounts/public`);
      setCompanyAccounts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch company accounts:', err);
    }
  };

  const checkOnboardingStatus = async () => {
    setLoading(true);
    try {
      // Check admission fee status
      const feeResponse = await axios.get(
        `${API_URL}/api/referrals/admission-fee/status/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdmissionStatus(feeResponse.data);
      
      // If fee is paid, check 2FA status
      if (feeResponse.data.paid) {
        if (user.two_factor_enabled) {
          navigate('/dashboard');
        } else {
          setStep(2);
        }
      } else if (feeResponse.data.pending_payment) {
        if (!hasShownToast) {
          toast.info('Pagamento aguarda aprovação do administrador.');
          setHasShownToast(true);
        }
        setStep(1);
      } else if (!feeResponse.data.required) {
        if (user.two_factor_enabled) {
          navigate('/dashboard');
        } else {
          setStep(2);
        }
      } else {
        if (!hasShownToast) {
          toast.info('Selecione uma moeda e faça o pagamento.');
          setHasShownToast(true);
        }
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
      if (user?.user_type === 'internal') {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const openPaymentGateway = () => {
    setShowPaymentGateway(true);
    setPaymentMethod(null);
    setSelectedBankAccount(null);
  };

  const getFilteredBankAccounts = () => {
    return companyAccounts.filter(acc => acc.currency === 'EUR' && acc.is_active);
  };

  const confirmPayment = async () => {
    setSubmitting(true);
    try {
      const paymentData = {
        currency: selectedCurrency,
        payment_method: paymentMethod,
        crypto_currency: paymentMethod === 'crypto' ? selectedCrypto : null
      };
      
      const response = await axios.post(
        `${API_URL}/api/referrals/admission-fee/request`,
        paymentData,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { currency: selectedCurrency }
        }
      );
      
      toast.success('Pagamento registado! Aguarde confirmação.');
      setShowPaymentGateway(false);
      setPaymentMethod(null);
      checkOnboardingStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao registar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setCopiedField(field);
    toast.success('Copiado!');
    setTimeout(() => {
      setCopied(false);
      setCopiedField('');
    }, 2000);
  };

  const setup2FA = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/auth/2fa/setup`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTwoFASecret(response.data.secret);
      setTwoFAQRCode(response.data.qr_code);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao configurar 2FA');
    } finally {
      setSubmitting(false);
    }
  };

  const verify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Código deve ter 6 dígitos');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/auth/2fa/verify`,
        { code: verificationCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('2FA configurado com sucesso!');
      setStep(3);
      await refreshUser();
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Código inválido');
    } finally {
      setSubmitting(false);
    }
  };

  const skip2FA = async () => {
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/auth/complete-onboarding`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshUser();
      toast.info('2FA ignorado. Pode configurar mais tarde nas definições.');
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      window.location.href = '/dashboard';
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentAmount = () => {
    if (!admissionStatus?.eur_amount) return '0';
    return admissionStatus.eur_amount.toLocaleString();
  };

  const getCryptoAmount = (crypto) => {
    if (!admissionStatus?.crypto_amounts) return null;
    return admissionStatus.crypto_amounts[crypto] || null;
  };

  const getReference = () => {
    return `ADM-${user?.id?.slice(0, 8).toUpperCase() || 'XXXXXX'}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="animate-spin text-gold-400" size={40} />
      </div>
    );
  }

  const tierLabels = {
    broker: 'Broker',
    standard: 'Standard',
    premium: 'Premium',
    vip: 'VIP',
    institucional: 'Institucional'
  };

  const tierColors = {
    broker: 'bg-sky-500/20 text-sky-400',
    standard: 'bg-gray-500/20 text-gray-300',
    premium: 'bg-gold-500/20 text-gold-400',
    vip: 'bg-purple-500/20 text-purple-400',
    institucional: 'bg-emerald-500/20 text-emerald-400'
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 1 ? 'bg-gold-500 text-black' : 'bg-zinc-800 text-gray-500'
            }`}>
              {step > 1 ? <CheckCircle size={20} /> : '1'}
            </div>
            <div className={`w-16 h-0.5 ${step > 1 ? 'bg-gold-500' : 'bg-zinc-700'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 2 ? 'bg-gold-500 text-black' : 'bg-zinc-800 text-gray-500'
            }`}>
              {step > 2 ? <CheckCircle size={20} /> : '2'}
            </div>
            <div className={`w-16 h-0.5 ${step > 2 ? 'bg-gold-500' : 'bg-zinc-700'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 3 ? 'bg-gold-500 text-black' : 'bg-zinc-800 text-gray-500'
            }`}>
              {step === 3 ? <CheckCircle size={20} /> : '3'}
            </div>
          </div>
        </div>

        {/* Step 1: Admission Fee */}
        {step === 1 && admissionStatus && (
          <Card className="bg-zinc-900 border-gold-800/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center mb-4">
                <CreditCard className="text-gold-400" size={32} />
              </div>
              <CardTitle className="text-white text-2xl">Taxa de Admissão Anual</CardTitle>
              <CardDescription className="text-gray-400">
                Para ativar a sua conta KBEX, é necessário efetuar o pagamento da taxa de admissão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Tier */}
              <div className="text-center">
                <Badge className={tierColors[admissionStatus.membership_level || 'standard']}>
                  {tierLabels[admissionStatus.membership_level || 'standard']}
                </Badge>
              </div>

              {admissionStatus.pending_payment && admissionStatus.pending_payment.payment_method ? (
                // Payment ALREADY initiated with a method — wait for confirmation
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="text-amber-400" size={24} />
                    <div>
                      <p className="text-amber-400 font-medium">Pagamento Pendente</p>
                      <p className="text-amber-300/80 text-sm">
                        {admissionStatus.pending_payment.amount} EUR · {(() => {
                          const m = admissionStatus.pending_payment.payment_method;
                          if (m === 'fiat_balance') return 'Saldo Fiat';
                          if (m === 'crypto') return 'Crypto';
                          if (m === 'stripe') return 'Cartão (Stripe)';
                          if (m === 'bank_transfer') return 'Transferência Bancária';
                          return m;
                        })()}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-3">
                    O seu pagamento está a aguardar confirmação do administrador.
                    Será notificado quando for aprovado.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 border-zinc-600 text-white"
                      onClick={checkOnboardingStatus}
                      disabled={loading}
                    >
                      <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'A verificar...' : 'Verificar Estado'}
                    </Button>
                    {/* Allow switching method only when nothing was actually charged yet
                        (Stripe checkout abandonment). Fiat/crypto/manual stay locked. */}
                    {admissionStatus.pending_payment.payment_method === 'stripe' &&
                     !admissionStatus.pending_payment.paid_at && (
                      <Button
                        variant="outline"
                        className="flex-1 border-amber-500/40 text-amber-300 hover:bg-amber-900/20"
                        onClick={async () => {
                          try {
                            await axios.post(
                              `${API_URL}/api/referrals/admission-fee/cancel-pending`,
                              {},
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            toast.success('Método de pagamento limpo. Pode escolher outro agora.');
                            await checkOnboardingStatus();
                            openAdmissionPicker();
                          } catch (err) {
                            toast.error(err?.response?.data?.detail || 'Erro a cancelar pagamento pendente');
                          }
                        }}
                        data-testid="onboarding-change-payment-method-btn"
                      >
                        Mudar método de pagamento
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // No payment yet OR pending without a method chosen — let the user pick again
                <>
                  <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                    <p className="text-gray-400 text-sm mb-2">Valor da Taxa de Admissão</p>
                    <p className="text-3xl font-bold text-gold-400">{getPaymentAmount()} EUR</p>
                  </div>

                  <Button
                    onClick={openAdmissionPicker}
                    disabled={creatingPicker || submitting}
                    className="w-full bg-gold-500 hover:bg-gold-600 text-black font-medium py-6 text-base"
                    data-testid="onboarding-pay-admission-btn"
                  >
                    {creatingPicker ? (
                      <RefreshCw size={20} className="mr-2 animate-spin" />
                    ) : (
                      <CreditCard size={20} className="mr-2" />
                    )}
                    Pagar Taxa de Admissão
                  </Button>
                  <p className="text-center text-zinc-500 text-[11px]">
                    Escolha entre saldo fiat, cripto/transferência ou cartão de crédito
                  </p>
                </>
              )}

              <p className="text-center text-gray-500 text-xs">
                Após o pagamento, receberá acesso completo à plataforma KBEX
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 2FA Setup */}
        {step === 2 && (
          <Card className="bg-zinc-900 border-emerald-800/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <Shield className="text-emerald-400" size={32} />
              </div>
              <CardTitle className="text-white text-2xl">Autenticação de Dois Fatores</CardTitle>
              <CardDescription className="text-gray-400">
                Configure o 2FA para proteger a sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!twoFASecret ? (
                <>
                  <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="text-emerald-400" size={24} />
                      <div>
                        <p className="text-white font-medium">Aplicação Autenticadora</p>
                        <p className="text-sm text-gray-400">
                          Use Google Authenticator, Authy ou similar
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                    <p className="text-amber-400 text-sm flex items-center gap-2">
                      <AlertTriangle size={16} />
                      <span>
                        A segurança 2FA é altamente recomendada para proteger os seus ativos
                      </span>
                    </p>
                  </div>

                  <Button 
                    onClick={setup2FA}
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-6"
                  >
                    {submitting ? (
                      <RefreshCw className="animate-spin mr-2" size={20} />
                    ) : (
                      <Lock size={20} className="mr-2" />
                    )}
                    Configurar 2FA
                  </Button>

                  <Button 
                    variant="ghost"
                    onClick={skip2FA}
                    disabled={submitting}
                    className="w-full text-gray-400 hover:text-white"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="animate-spin mr-2" size={16} />
                        A processar...
                      </>
                    ) : (
                      'Configurar mais tarde'
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-lg p-4 flex justify-center">
                    {twoFAQRCode && (
                      <img 
                        src={twoFAQRCode} 
                        alt="QR Code 2FA" 
                        className="w-48 h-48"
                      />
                    )}
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Chave secreta (backup)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-zinc-900 p-2 rounded text-gold-400 text-sm font-mono break-all">
                        {twoFASecret}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(twoFASecret, 'secret')}
                        className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                      >
                        {copied && copiedField === 'secret' ? (
                          <Check className="text-green-400" size={18} />
                        ) : (
                          <Copy className="text-gray-400" size={18} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Guarde esta chave num local seguro
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Código de Verificação</Label>
                    <Input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="bg-zinc-800 border-zinc-700 text-white text-center text-2xl tracking-widest font-mono"
                      maxLength={6}
                    />
                    <p className="text-xs text-gray-500 text-center">
                      Introduza o código de 6 dígitos da sua app autenticadora
                    </p>
                  </div>

                  <Button 
                    onClick={verify2FA}
                    disabled={submitting || verificationCode.length !== 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-6"
                  >
                    {submitting ? (
                      <RefreshCw className="animate-spin mr-2" size={20} />
                    ) : (
                      <CheckCircle size={20} className="mr-2" />
                    )}
                    Verificar e Ativar
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Card className="bg-zinc-900 border-emerald-800/20">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle className="text-emerald-400" size={40} />
              </div>
              <h2 className="text-2xl font-light text-white mb-2">Configuração Completa!</h2>
              <p className="text-gray-400 mb-6">
                A sua conta KBEX está totalmente configurada e segura
              </p>
              <div className="flex justify-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400">Taxa Paga</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-400">2FA Ativo</Badge>
              </div>
              <p className="text-gray-500 text-sm mt-6">
                A redirecionar para o dashboard...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Logout Button */}
        <div className="text-center mt-6">
          <button 
            onClick={logout}
            className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      <Dialog open={showPaymentGateway} onOpenChange={setShowPaymentGateway}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="text-gold-400" />
              Pagamento - {getPaymentAmount()} EUR
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Escolha o método de pagamento
            </DialogDescription>
          </DialogHeader>

          {!paymentMethod ? (
            // Payment method selection
            <div className="space-y-4 py-4">
              <button
                onClick={() => setPaymentMethod('crypto')}
                className="w-full p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-orange-500/50 hover:bg-orange-900/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                    <Bitcoin className="text-orange-400" size={28} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-white font-medium text-lg">Criptomoeda</p>
                    <p className="text-gray-400 text-sm">BTC, ETH, USDT, USDC</p>
                  </div>
                  <ArrowRight className="text-gray-400 group-hover:text-orange-400 transition-colors" size={20} />
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                className="w-full p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                    <Landmark className="text-blue-400" size={28} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-white font-medium text-lg">Transferência Bancária</p>
                    <p className="text-gray-400 text-sm">SEPA, SWIFT, PIX</p>
                  </div>
                  <ArrowRight className="text-gray-400 group-hover:text-blue-400 transition-colors" size={20} />
                </div>
              </button>
            </div>
          ) : paymentMethod === 'crypto' ? (
            // Crypto payment details
            <div className="space-y-4 py-4">
              <button
                onClick={() => setPaymentMethod(null)}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <p className="text-orange-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Envie apenas para a rede correta. Fundos enviados para a rede errada serão perdidos.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400">Selecione a Criptomoeda</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.keys(CRYPTO_ADDRESSES).map((crypto) => (
                    <button
                      key={crypto}
                      onClick={() => setSelectedCrypto(crypto)}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        selectedCrypto === crypto
                          ? 'bg-orange-500/20 border border-orange-500 text-orange-400'
                          : 'bg-zinc-800 border border-zinc-700 text-gray-300 hover:border-zinc-600'
                      }`}
                    >
                      {crypto}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Endereço {selectedCrypto}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-zinc-900 p-2 rounded text-orange-400 text-xs font-mono break-all">
                      {CRYPTO_ADDRESSES[selectedCrypto]}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(CRYPTO_ADDRESSES[selectedCrypto], 'address')}
                      className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                    >
                      {copied && copiedField === 'address' ? (
                        <Check className="text-green-400" size={16} />
                      ) : (
                        <Copy className="text-gray-400" size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Rede</p>
                  <p className="text-white">
                    {selectedCrypto === 'BTC' ? 'Bitcoin (BTC)' : 'Ethereum (ERC-20)'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Valor a enviar</p>
                  {getCryptoAmount(selectedCrypto) ? (
                    <>
                      <p className="text-white text-lg font-medium">
                        {getCryptoAmount(selectedCrypto)} {selectedCrypto}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        (equivalente a {getPaymentAmount()} EUR)
                      </p>
                    </>
                  ) : (
                    <p className="text-white text-lg font-medium">
                      {getPaymentAmount()} EUR em {selectedCrypto}
                    </p>
                  )}
                </div>
              </div>

              <Button 
                onClick={confirmPayment}
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-400 text-black font-medium py-6"
              >
                {submitting ? (
                  <RefreshCw className="animate-spin mr-2" size={20} />
                ) : (
                  <CheckCircle size={20} className="mr-2" />
                )}
                Confirmar Pagamento Efetuado
              </Button>

              <p className="text-center text-gray-500 text-xs">
                Após confirmação na blockchain, o pagamento será verificado automaticamente
              </p>
            </div>
          ) : (
            // Bank transfer details - with account selection
            <div className="space-y-4 py-4">
              <button
                onClick={() => {
                  setPaymentMethod(null);
                  setSelectedBankAccount(null);
                }}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  <strong>Importante:</strong> Use a referência indicada para identificarmos o seu pagamento.
                </p>
              </div>

              {/* Bank Account Selection */}
              {getFilteredBankAccounts().length > 0 ? (
                <>
                  {!selectedBankAccount ? (
                    <div className="space-y-3">
                      <p className="text-gray-400 text-sm">Selecione a conta para transferência:</p>
                      {getFilteredBankAccounts().map((account) => (
                        <button
                          key={account.id}
                          onClick={() => setSelectedBankAccount(account)}
                          className="w-full p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <Building className="text-blue-400" size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-medium">{account.bank_name}</p>
                              <p className="text-gray-400 text-sm">{account.account_holder}</p>
                              {account.iban && (
                                <p className="text-gray-500 text-xs font-mono mt-1">
                                  IBAN: {account.iban.slice(0, 4)} •••• {account.iban.slice(-4)}
                                </p>
                              )}
                            </div>
                            <ArrowRight className="text-gray-400" size={16} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Selected Account Details */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400 text-sm">Conta selecionada:</p>
                        <button
                          onClick={() => setSelectedBankAccount(null)}
                          className="text-blue-400 text-sm hover:underline"
                        >
                          Alterar
                        </button>
                      </div>
                      
                      <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs text-gray-500">Banco</p>
                            <p className="text-white">{selectedBankAccount.bank_name}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Titular</p>
                          <p className="text-white">{selectedBankAccount.account_holder}</p>
                        </div>

                        {selectedBankAccount.iban && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">IBAN</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-zinc-900 p-2 rounded text-blue-400 text-sm font-mono">
                                {selectedBankAccount.iban}
                              </code>
                              <button 
                                onClick={() => copyToClipboard(selectedBankAccount.iban, 'iban')}
                                className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                              >
                                {copied && copiedField === 'iban' ? (
                                  <Check className="text-green-400" size={16} />
                                ) : (
                                  <Copy className="text-gray-400" size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedBankAccount.swift_bic && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">SWIFT/BIC</p>
                            <div className="flex items-center gap-2">
                              <code className="bg-zinc-900 p-2 rounded text-blue-400 text-sm font-mono">
                                {selectedBankAccount.swift_bic}
                              </code>
                              <button 
                                onClick={() => copyToClipboard(selectedBankAccount.swift_bic, 'swift')}
                                className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                              >
                                {copied && copiedField === 'swift' ? (
                                  <Check className="text-green-400" size={16} />
                                ) : (
                                  <Copy className="text-gray-400" size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedBankAccount.pix_key && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-zinc-900 p-2 rounded text-emerald-400 text-sm font-mono">
                                {selectedBankAccount.pix_key}
                              </code>
                              <button 
                                onClick={() => copyToClipboard(selectedBankAccount.pix_key, 'pix')}
                                className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                              >
                                {copied && copiedField === 'pix' ? (
                                  <Check className="text-green-400" size={16} />
                                ) : (
                                  <Copy className="text-gray-400" size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedBankAccount.account_number && !selectedBankAccount.iban && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Número da Conta</p>
                            <div className="flex items-center gap-2">
                              <code className="bg-zinc-900 p-2 rounded text-blue-400 text-sm font-mono">
                                {selectedBankAccount.account_number}
                              </code>
                              <button 
                                onClick={() => copyToClipboard(selectedBankAccount.account_number, 'account')}
                                className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                              >
                                {copied && copiedField === 'account' ? (
                                  <Check className="text-green-400" size={16} />
                                ) : (
                                  <Copy className="text-gray-400" size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedBankAccount.routing_number && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Routing Number</p>
                            <code className="bg-zinc-900 p-2 rounded text-blue-400 text-sm font-mono">
                              {selectedBankAccount.routing_number}
                            </code>
                          </div>
                        )}

                        {selectedBankAccount.sort_code && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Sort Code</p>
                            <code className="bg-zinc-900 p-2 rounded text-blue-400 text-sm font-mono">
                              {selectedBankAccount.sort_code}
                            </code>
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-700">
                          <p className="text-xs text-gray-500 mb-1">Referência (OBRIGATÓRIO)</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gold-500/10 border border-gold-500/30 p-2 rounded text-gold-400 text-sm font-mono font-bold">
                              {getReference()}
                            </code>
                            <button 
                              onClick={() => copyToClipboard(getReference(), 'reference')}
                              className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                            >
                              {copied && copiedField === 'reference' ? (
                                <Check className="text-green-400" size={16} />
                              ) : (
                                <Copy className="text-gray-400" size={16} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-700">
                          <p className="text-xs text-gray-500 mb-1">Montante</p>
                          <p className="text-white text-xl font-bold">
                            {getPaymentAmount()} EUR
                          </p>
                        </div>
                      </div>

                      <Button 
                        onClick={confirmPayment}
                        disabled={submitting}
                        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-medium py-6"
                      >
                        {submitting ? (
                          <RefreshCw className="animate-spin mr-2" size={20} />
                        ) : (
                          <CheckCircle size={20} className="mr-2" />
                        )}
                        Confirmar Transferência Efetuada
                      </Button>

                      <p className="text-center text-gray-500 text-xs">
                        O pagamento será verificado em 1-2 dias úteis
                      </p>
                    </>
                  )}
                </>
              ) : (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-6 text-center">
                  <AlertTriangle className="mx-auto mb-3 text-amber-400" size={32} />
                  <p className="text-amber-400 font-medium">Sem Contas Disponíveis</p>
                  <p className="text-amber-300/80 text-sm mt-1">
                    Não existem contas bancárias configuradas para EUR. 
                    Por favor contacte o suporte ou escolha pagamento em criptomoeda.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unified 3-option payment picker for the Admission Fee */}
      <Dialog open={!!admissionPicker} onOpenChange={(o) => !o && setAdmissionPicker(null)}>
        <DialogContent className="bg-black border-zinc-800 max-w-lg" data-testid="admission-picker-dialog">
          <DialogHeader>
            <DialogTitle className="text-white">
              Pagar Taxa de Admissão
            </DialogTitle>
          </DialogHeader>
          {admissionPicker && (
            <PaymentMethodPicker
              amount={admissionPicker.amount}
              paymentId={admissionPicker.paymentId}
              feeType="admission"
              onCryptoSelected={() => {
                setAdmissionCheckoutId(admissionPicker.paymentId);
                setAdmissionPicker(null);
              }}
              onPaid={() => {
                setAdmissionPicker(null);
                checkOnboardingStatus();
              }}
              onCancel={() => setAdmissionPicker(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <BillingCheckoutDialog
        open={!!admissionCheckoutId}
        onClose={() => setAdmissionCheckoutId(null)}
        paymentId={admissionCheckoutId}
        onSubmitted={() => {
          checkOnboardingStatus();
        }}
      />
    </div>
  );
};

export default OnboardingPage;
