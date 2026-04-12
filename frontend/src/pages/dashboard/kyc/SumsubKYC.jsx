import React, { useState, useEffect, useCallback, useRef } from 'react';
import SumsubWebSdk from '@sumsub/websdk-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { 
  ChevronLeft, Shield, CheckCircle, XCircle, Loader2,
  RefreshCw, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SumsubKYC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState('loading');
  const [accessToken, setAccessToken] = useState(null);
  const [applicantId, setApplicantId] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    checkInitialStatus(controller.signal);
    return () => { controller.abort(); };
  }, [token]);

  const checkInitialStatus = async (signal) => {
    try {
      const response = await axios.get(`${API_URL}/api/sumsub/status`, { signal });
      const data = response.data;
      if (signal?.aborted) return;

      if (data.status === 'approved') {
        setVerificationStatus({ review_answer: 'GREEN' });
        setStep('complete');
      } else if (data.status === 'rejected') {
        setVerificationStatus({ 
          review_answer: 'RED',
          reject_labels: data.local_data?.reject_labels 
        });
        setStep('complete');
      } else {
        await fetchToken(signal);
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || signal?.aborted) return;
      setStep('init');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchToken = async (signal) => {
    try {
      const response = await axios.post(`${API_URL}/api/sumsub/applicants`, {
        email: user?.email || '',
        first_name: user?.first_name || user?.name?.split(' ')?.[0] || '',
        last_name: user?.last_name || user?.name?.split(' ')?.slice(1)?.join(' ') || '',
        country: user?.country || ''
      }, signal ? { signal } : {});
      
      if (signal?.aborted) return;

      const aid = response.data?.applicant_id;
      const tkn = response.data?.sdk_token;
      
      if (aid) setApplicantId(aid);
      
      if (tkn) {
        setAccessToken(tkn);
        setStep('verification');
      } else {
        throw new Error('Token nao recebido do servidor');
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || signal?.aborted) return;
      const detail = err.response?.data?.detail || err.message;
      setError(`Erro ao gerar token: ${detail}`);
      setStep('error');
    }
  };

  const initializeSDK = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchToken();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenExpiration = useCallback(async () => {
    try {
      const response = await axios.post(`${API_URL}/api/sumsub/applicants`, {
        email: user?.email || '',
        first_name: user?.first_name || user?.name?.split(' ')?.[0] || '',
        last_name: user?.last_name || user?.name?.split(' ')?.slice(1)?.join(' ') || '',
        country: user?.country || ''
      });
      return response.data.sdk_token;
    } catch (err) {
      console.error('Error refreshing token:', err);
      throw err;
    }
  }, [user]);

  const handleMessage = useCallback((type, payload) => {
    // Sumsub message handled
    switch (type) {
      case 'idCheck.onApplicantStatusChanged':
        if (payload?.reviewResult?.reviewAnswer === 'GREEN') {
          setVerificationStatus({ review_answer: 'GREEN' });
          setStep('complete');
          toast.success('Verificacao aprovada!');
        } else if (payload?.reviewResult?.reviewAnswer === 'RED') {
          setVerificationStatus({ 
            review_answer: 'RED',
            reject_labels: payload?.reviewResult?.rejectLabels
          });
          setStep('complete');
          toast.error('Verificacao rejeitada');
        }
        break;
      case 'idCheck.onError':
        console.error('SDK Error:', payload);
        break;
      default:
        break;
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('Sumsub WebSDK error:', error);
  }, []);

  const sdkConfig = {
    lang: 'pt',
    theme: 'dark',
  };

  const sdkOptions = {
    addViewportTag: false,
    adaptIframeHeight: true,
  };

  if (loading && step === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="sumsub-kyc-page">
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
          data-testid="kyc-back-btn"
        >
          <ChevronLeft size={18} className="mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-light text-white mb-2 flex items-center gap-3">
          <Shield className="text-gold-400" />
          Verificacao de Identidade
        </h1>
        <p className="text-gray-400">
          Complete a verificacao KYC para aceder a todas as funcionalidades
        </p>
      </div>

      {/* Init Step */}
      {step === 'init' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            <Shield className="mx-auto text-gold-400 mb-4" size={64} />
            <h2 className="text-xl text-white mb-4">Iniciar Verificacao</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Para garantir a seguranca da sua conta e cumprir os requisitos regulatorios,
              precisamos verificar a sua identidade.
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
              <h3 className="text-gold-400 font-medium mb-2">O que vai precisar:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>- Documento de identificacao valido (Passaporte, CC, Carta de Conducao)</li>
                <li>- Camara para tirar selfie</li>
                <li>- Boa iluminacao</li>
              </ul>
            </div>
            <Button
              onClick={initializeSDK}
              disabled={loading}
              className="bg-gold-500 hover:bg-gold-400 text-black px-8"
              data-testid="start-verification-btn"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Iniciar Verificacao
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Verification Step — Embedded Sumsub WebSDK */}
      {step === 'verification' && accessToken && (
        <Card className="bg-zinc-900/50 border-gold-800/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gold-800/20">
              <p className="text-sm text-gray-400">
                Siga as instrucoes no ecra para completar a verificacao
              </p>
            </div>
            <div 
              className="min-h-[600px]" 
              data-testid="sumsub-sdk-container"
              style={{ 
                colorScheme: 'normal',
                isolation: 'isolate',
                backgroundColor: '#18181b'
              }}
            >
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

      {/* Error Step */}
      {step === 'error' && (
        <Card className="bg-zinc-900/50 border-red-800/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
            <h2 className="text-xl text-white mb-3">Erro na Verificacao</h2>
            <p className="text-gray-400 mb-4 max-w-md mx-auto text-sm">
              Nao foi possivel iniciar a verificacao. Tente novamente.
            </p>
            {error && (
              <div className="bg-red-500/10 rounded-lg p-3 mb-6 max-w-md mx-auto">
                <p className="text-xs text-red-400 font-mono break-all">{error}</p>
              </div>
            )}
            <Button onClick={initializeSDK} className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="retry-verification-btn">
              <RefreshCw size={16} className="mr-2" /> Tentar Novamente
            </Button>
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
                <h2 className="text-2xl text-white mb-2">Verificacao Aprovada!</h2>
                <p className="text-gray-400 mb-6">
                  A sua identidade foi verificada com sucesso.
                </p>
                <Button onClick={() => navigate('/dashboard')} className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="go-to-dashboard-btn">
                  Ir para Dashboard
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="text-red-400" size={48} />
                </div>
                <h2 className="text-2xl text-white mb-2">Verificacao Rejeitada</h2>
                <p className="text-gray-400 mb-4">
                  Infelizmente, a verificacao nao foi aprovada.
                </p>
                {verificationStatus.reject_labels && (
                  <div className="bg-red-500/10 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                    <p className="text-sm text-red-400 font-medium mb-2">Motivos:</p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {(Array.isArray(verificationStatus.reject_labels) ? verificationStatus.reject_labels : [verificationStatus.reject_labels]).map((label, i) => (
                        <li key={i}>- {label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={initializeSDK} className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="retry-kyc-btn">
                  <RefreshCw size={16} className="mr-2" /> Tentar Novamente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SumsubKYC;
