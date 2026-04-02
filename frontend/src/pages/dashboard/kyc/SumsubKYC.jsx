import React, { useState, useEffect, useCallback } from 'react';
import SumsubWebSdk from '@sumsub/websdk-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { 
  ChevronLeft,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SumsubKYC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState('loading'); // loading, init, verification, complete, error
  const [accessToken, setAccessToken] = useState(null);
  const [applicantId, setApplicantId] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check initial status on mount
  useEffect(() => {
    console.log('[KYC-v2] Component mounted, API:', API_URL);
    checkInitialStatus();
  }, []);

  const checkInitialStatus = async () => {
    try {
      console.log('[KYC] Checking status...');
      const response = await axios.get(`${API_URL}/api/sumsub/status`);
      const data = response.data;
      console.log('[KYC] Status response:', data.status, 'has_applicant:', data.has_applicant);
      
      if (data.status === 'approved') {
        setVerificationStatus({ review_answer: 'GREEN' });
        setStep('complete');
      } else if (data.status === 'rejected') {
        setVerificationStatus({ 
          review_answer: 'RED',
          reject_labels: data.local_data?.reject_labels 
        });
        setStep('complete');
      } else if (data.has_applicant) {
        const aid = data.applicant_id;
        setApplicantId(aid);
        await generateTokenAndShowSDK(aid);
      } else {
        setStep('init');
      }
    } catch (err) {
      console.error('[KYC] Status check failed:', err?.response?.data || err.message);
      setStep('init');
    } finally {
      setLoading(false);
    }
  };

  const generateTokenAndShowSDK = async (aid) => {
    try {
      console.log('[KYC] Generating access token for applicant:', aid);
      const tokenResponse = await axios.post(
        `${API_URL}/api/sumsub/access-token?ttl_seconds=1800`
      );
      const tkn = tokenResponse.data?.token;
      console.log('[KYC] Token received:', tkn ? 'yes' : 'no');
      if (tkn) {
        setAccessToken(tkn);
        setStep('verification');
      } else {
        throw new Error('Token vazio recebido do servidor');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Erro desconhecido';
      console.error('[KYC] Token generation failed:', detail);
      setError(`Erro ao gerar token: ${detail}`);
      setStep('error');
    }
  };

  const initializeSDK = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create applicant
      console.log('[KYC] Creating applicant...', { email: user?.email, country: user?.country });
      const applicantResponse = await axios.post(`${API_URL}/api/sumsub/applicants`, {
        email: user?.email || 'user@example.com',
        first_name: user?.first_name || user?.name?.split(' ')?.[0] || '',
        last_name: user?.last_name || user?.name?.split(' ')?.slice(1)?.join(' ') || '',
        country: user?.country || ''
      });
      
      const aid = applicantResponse.data?.applicant_id;
      console.log('[KYC] Applicant result:', { aid, already_exists: applicantResponse.data?.already_exists });
      
      if (!aid) {
        throw new Error('applicant_id não recebido');
      }
      
      setApplicantId(aid);
      
      // Generate access token
      await generateTokenAndShowSDK(aid);
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.message || 'Erro desconhecido';
      console.error('[KYC] Init failed:', errorDetail, err);
      setError(`Erro ao inicializar verificação: ${errorDetail}`);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenExpiration = useCallback(async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/sumsub/access-token?ttl_seconds=1800`
      );
      return response.data.token;
    } catch (err) {
      console.error('Error refreshing token:', err);
      throw err;
    }
  }, []);

  const handleMessage = useCallback((type, payload) => {
    console.log('Sumsub WebSDK message:', type, payload);
    
    switch (type) {
      case 'idCheck.onStepCompleted':
        console.log('Step completed:', payload);
        break;
      case 'idCheck.onApplicantStatusChanged':
        console.log('Status changed:', payload);
        if (payload?.reviewResult?.reviewAnswer === 'GREEN') {
          setVerificationStatus({ review_answer: 'GREEN' });
          setStep('complete');
          toast.success('Verificação aprovada!');
        } else if (payload?.reviewResult?.reviewAnswer === 'RED') {
          setVerificationStatus({ 
            review_answer: 'RED',
            reject_labels: payload?.reviewResult?.rejectLabels
          });
          setStep('complete');
          toast.error('Verificação rejeitada');
        }
        break;
      case 'idCheck.onError':
        console.error('SDK Error:', payload);
        toast.error('Erro na verificação');
        break;
      default:
        break;
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('Sumsub WebSDK error:', error);
    setError(error?.message || 'Erro desconhecido');
  }, []);

  // Poll for status updates
  useEffect(() => {
    if (step !== 'verification') return;
    
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/sumsub/status`);
        const data = response.data;
        
        if (data.status === 'approved') {
          setVerificationStatus({ review_answer: 'GREEN' });
          setStep('complete');
          clearInterval(interval);
        } else if (data.status === 'rejected') {
          setVerificationStatus({ 
            review_answer: 'RED',
            reject_labels: data.local_data?.reject_labels 
          });
          setStep('complete');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Status poll error:', err);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [step]);

  const sdkConfig = {
    lang: 'pt',
    theme: 'dark',
    uiConf: {
      customCssStr: `
        :root {
          --sumsub-color-primary: #d4af37;
          --sumsub-color-primary-hover: #c9a431;
          --sumsub-color-background-primary: #18181b;
          --sumsub-color-background-secondary: #27272a;
          --sumsub-color-text-primary: #ffffff;
          --sumsub-color-text-secondary: #a1a1aa;
          --sumsub-color-border: #3f3f46;
          --sumsub-border-radius: 8px;
        }
        .sumsub-logo { display: none !important; }
      `
    }
  };

  const sdkOptions = {
    addViewportTag: false,
    adaptIframeHeight: true
  };

  if (loading && step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-gold-400 mb-4" size={48} />
          <p className="text-gray-400">A verificar estado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid="sumsub-kyc-page">
      {/* Header */}
      <div className="mb-8">
        <Button 
          onClick={() => navigate('/dashboard/kyc')}
          variant="ghost"
          className="text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeft size={18} className="mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-light text-white mb-2 flex items-center gap-3">
          <Shield className="text-gold-400" />
          Verificação de Identidade
        </h1>
        <p className="text-gray-400">
          Complete a verificação KYC para aceder a todas as funcionalidades
        </p>
      </div>

      {/* Init Step */}
      {step === 'init' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto text-gold-400 mb-4" size={64} />
            <h2 className="text-xl text-white mb-4">Iniciar Verificação</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Para garantir a segurança da sua conta e cumprir os requisitos regulatórios,
              precisamos verificar a sua identidade. Este processo é rápido e seguro.
            </p>
            
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
              <h3 className="text-gold-400 font-medium mb-2">O que vai precisar:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Documento de identificação válido (Passaporte, CC, Carta de Condução)</li>
                <li>• Câmara para tirar selfie</li>
                <li>• Boa iluminação</li>
              </ul>
            </div>
            
            <Button
              onClick={initializeSDK}
              disabled={loading}
              className="bg-gold-500 hover:bg-gold-400 text-black px-8"
              data-testid="start-verification-btn"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" size={18} />
              ) : null}
              Iniciar Verificação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Verification Step - Sumsub WebSDK */}
      {step === 'verification' && accessToken && (
        <Card className="bg-zinc-900/50 border-gold-800/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gold-800/20">
              <p className="text-sm text-gray-400">
                Siga as instruções no ecrã para completar a verificação
              </p>
            </div>
            
            <div className="min-h-[600px]" data-testid="sumsub-sdk-container">
              <SumsubWebSdk
                accessToken={accessToken}
                expirationHandler={handleTokenExpiration}
                config={sdkConfig}
                options={sdkOptions}
                onMessage={handleMessage}
                onError={handleError}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && verificationStatus && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            {verificationStatus.review_answer === 'GREEN' ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-400" size={48} />
                </div>
                <h2 className="text-2xl text-white mb-2">Verificação Aprovada!</h2>
                <p className="text-gray-400 mb-6">
                  A sua identidade foi verificada com sucesso. Agora tem acesso completo à plataforma.
                </p>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gold-500 hover:bg-gold-400 text-black"
                >
                  Ir para Dashboard
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="text-red-400" size={48} />
                </div>
                <h2 className="text-2xl text-white mb-2">Verificação Não Aprovada</h2>
                <p className="text-gray-400 mb-4">
                  Infelizmente não foi possível verificar a sua identidade.
                </p>
                
                {verificationStatus.reject_labels && verificationStatus.reject_labels.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                    <h3 className="text-red-400 font-medium mb-2">Motivos:</h3>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {verificationStatus.reject_labels.map((label, idx) => (
                        <li key={idx}>• {label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => {
                      setStep('init');
                      setAccessToken(null);
                    }}
                    variant="outline"
                    className="border-gold-500/30"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Tentar Novamente
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard/support')}
                    className="bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    Contactar Suporte
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Step */}
      {step === 'error' && (
        <Card className="bg-zinc-900/50 border-red-800/30">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-400" size={48} />
            </div>
            <h2 className="text-xl text-white mb-2">Erro na Verificação</h2>
            <p className="text-gray-400 mb-4">
              {error || 'Ocorreu um erro ao iniciar a verificação.'}
            </p>
            <p className="text-zinc-600 text-xs font-mono mb-6 max-w-md mx-auto break-all">
              API: {API_URL}/api/sumsub | User: {user?.email || 'N/A'}
            </p>
            <Button
              onClick={() => {
                setError(null);
                setStep('init');
              }}
              className="bg-gold-500 hover:bg-gold-400 text-black"
            >
              <RefreshCw size={16} className="mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SumsubKYC;
