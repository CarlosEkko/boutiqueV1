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
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OnboardingPage = () => {
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Admission Fee, 2: 2FA Setup, 3: Complete
  const [admissionStatus, setAdmissionStatus] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [submitting, setSubmitting] = useState(false);
  
  // 2FA states
  const [twoFASecret, setTwoFASecret] = useState(null);
  const [twoFAQRCode, setTwoFAQRCode] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user, token]);

  const checkOnboardingStatus = async () => {
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
          // Both done, redirect to dashboard
          navigate('/dashboard');
        } else {
          // Fee paid, need 2FA
          setStep(2);
        }
      } else if (feeResponse.data.pending_payment) {
        // Has pending payment
        setStep(1);
      } else if (!feeResponse.data.required) {
        // Fee not required, check 2FA
        if (user.two_factor_enabled) {
          navigate('/dashboard');
        } else {
          setStep(2);
        }
      }
    } catch (err) {
      console.error('Failed to check onboarding status:', err);
      // If error, let user proceed (may be internal user)
      if (user?.user_type === 'internal') {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const requestAdmissionPayment = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/referrals/admission-fee/request`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { currency: selectedCurrency }
        }
      );
      
      toast.success('Solicitação de pagamento criada');
      
      // Refresh status
      checkOnboardingStatus();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao solicitar pagamento');
    } finally {
      setSubmitting(false);
    }
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
      
      // Refresh user data to update is_onboarded status
      await refreshUser();
      
      // Redirect after animation
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Código inválido');
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = () => {
    if (twoFASecret) {
      navigator.clipboard.writeText(twoFASecret);
      setCopied(true);
      toast.success('Chave copiada!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const skip2FA = async () => {
    // Mark onboarding as complete without 2FA
    try {
      await axios.post(
        `${API_URL}/api/auth/complete-onboarding`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.info('2FA ignorado. Pode configurar mais tarde nas definições.');
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="animate-spin text-gold-400" size={40} />
      </div>
    );
  }

  const tierLabels = {
    standard: 'Standard',
    premium: 'Premium',
    vip: 'VIP'
  };

  const tierColors = {
    standard: 'bg-gray-500/20 text-gray-300',
    premium: 'bg-gold-500/20 text-gold-400',
    vip: 'bg-purple-500/20 text-purple-400'
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
                <Badge className={tierColors[admissionStatus.client_tier || 'standard']}>
                  {tierLabels[admissionStatus.client_tier || 'standard']}
                </Badge>
              </div>

              {admissionStatus.pending_payment ? (
                // Payment already requested
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="text-amber-400" size={24} />
                    <div>
                      <p className="text-amber-400 font-medium">Pagamento Pendente</p>
                      <p className="text-amber-300/80 text-sm">
                        {admissionStatus.pending_payment.amount} {admissionStatus.pending_payment.currency}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mt-3">
                    O seu pedido está a aguardar aprovação do administrador. 
                    Será notificado quando for aprovado.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 border-zinc-600 text-white"
                    onClick={checkOnboardingStatus}
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Verificar Estado
                  </Button>
                </div>
              ) : (
                // Show payment options
                <>
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-3">Selecione a moeda de pagamento</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(admissionStatus.amounts || {}).map(([currency, amount]) => (
                        <button
                          key={currency}
                          onClick={() => setSelectedCurrency(currency)}
                          className={`p-3 rounded-lg text-center transition-colors ${
                            selectedCurrency === currency
                              ? 'bg-gold-500/20 border border-gold-500 text-gold-400'
                              : 'bg-zinc-800 border border-zinc-700 text-gray-300 hover:border-zinc-600'
                          }`}
                        >
                          <p className="font-medium">{currency}</p>
                          <p className="text-sm">{amount.toLocaleString()}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-blue-400 text-sm">
                      <strong>Período de carência:</strong> {admissionStatus.grace_period_days} dias após o registo
                    </p>
                  </div>

                  <Button 
                    onClick={requestAdmissionPayment}
                    disabled={submitting}
                    className="w-full bg-gold-500 hover:bg-gold-400 text-black font-medium py-6"
                  >
                    {submitting ? (
                      <RefreshCw className="animate-spin mr-2" size={20} />
                    ) : (
                      <CreditCard size={20} className="mr-2" />
                    )}
                    Solicitar Pagamento
                  </Button>
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
                // Show setup button
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
                    className="w-full text-gray-400 hover:text-white"
                  >
                    Configurar mais tarde
                  </Button>
                </>
              ) : (
                // Show QR code and verification
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
                        onClick={copySecret}
                        className="p-2 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                      >
                        {copied ? (
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
    </div>
  );
};

export default OnboardingPage;
