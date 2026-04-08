import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { 
  ChevronLeft, Shield, CheckCircle, XCircle, Loader2,
  RefreshCw, AlertTriangle, ExternalLink, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SumsubKYC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState('loading');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [externalUrl, setExternalUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowOpened, setWindowOpened] = useState(false);

  const [errorDetail, setErrorDetail] = useState(null);

  const abortRef = useRef(null);
  const pollRef = useRef(null);

  // Check initial KYC status on mount
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    checkStatus(controller.signal);
    return () => { controller.abort(); if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const checkStatus = async (signal) => {
    try {
      const response = await axios.get(`${API_URL}/api/sumsub/status`, { signal });
      const data = response.data;
      if (signal?.aborted) return;

      if (data.status === 'approved') {
        setVerificationStatus({ review_answer: 'GREEN' });
        setStep('complete');
      } else if (data.status === 'rejected') {
        setVerificationStatus({ review_answer: 'RED', reject_labels: data.local_data?.reject_labels });
        setStep('complete');
      } else if (data.sdk_token) {
        // If status response includes a token, use it directly
        const fallbackUrl = `https://websdk.sumsub.com/idensic/#/?accessToken=${data.sdk_token}&lang=pt`;
        setExternalUrl(fallbackUrl);
        setStep('ready');
      } else {
        setStep('init');
      }
    } catch (err) {
      if (err?.name === 'CanceledError') return;
      setStep('init');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const generateLink = async () => {
    setLoading(true);
    setErrorDetail(null);
    try {
      // Try the dedicated generate-link endpoint first
      const response = await axios.post(`${API_URL}/api/sumsub/generate-link`);
      if (response.data?.url) {
        setExternalUrl(response.data.url);
        setStep('ready');
        return;
      }
    } catch (primaryErr) {
      console.warn('[KYC] generate-link failed, trying fallback:', primaryErr?.response?.data?.detail || primaryErr.message);
    }

    // Fallback: use the /applicants endpoint to get a token and build URL
    try {
      const fallbackResp = await axios.post(`${API_URL}/api/sumsub/applicants`, {
        email: user?.email || '',
        first_name: user?.first_name || user?.name?.split(' ')?.[0] || '',
        last_name: user?.last_name || user?.name?.split(' ')?.slice(1)?.join(' ') || '',
        country: user?.country || ''
      });
      const sdkToken = fallbackResp.data?.sdk_token;
      if (sdkToken) {
        const fallbackUrl = `https://websdk.sumsub.com/idensic/#/?accessToken=${sdkToken}&lang=pt`;
        setExternalUrl(fallbackUrl);
        setStep('ready');
        return;
      }
    } catch (fallbackErr) {
      const detail = fallbackErr.response?.data?.detail || fallbackErr.message;
      console.error('[KYC] Fallback also failed:', detail);
      setErrorDetail(detail);
    }

    toast.error('Erro ao gerar link de verificacao');
    setStep('error');
    setLoading(false);
  };

  const openVerification = () => {
    if (!externalUrl) return;
    const popup = window.open(externalUrl, '_blank');
    if (!popup) {
      toast.error('Pop-up bloqueado. Permita pop-ups para este site.');
      return;
    }
    setWindowOpened(true);
    setStep('waiting');
    startPolling();
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/sumsub/status`);
        const data = response.data;
        if (data.status === 'approved') {
          setVerificationStatus({ review_answer: 'GREEN' });
          setStep('complete');
          clearInterval(pollRef.current);
          toast.success('Verificacao aprovada!');
        } else if (data.status === 'rejected') {
          setVerificationStatus({ review_answer: 'RED', reject_labels: data.local_data?.reject_labels });
          setStep('complete');
          clearInterval(pollRef.current);
        } else if (data.status === 'pending') {
          setStep('pending');
          clearInterval(pollRef.current);
          toast.info('Documentos submetidos. Em analise.');
        }
      } catch (err) {
        // Ignore polling errors
      }
    }, 5000);
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
          Verificacao de Identidade
        </h1>
        <p className="text-gray-400">
          Complete a verificacao KYC para aceder a todas as funcionalidades
        </p>
      </div>

      {/* Step: Init — Start verification */}
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
                <li>• Documento de identificacao valido (Passaporte, CC, Carta de Conducao)</li>
                <li>• Camara para tirar selfie</li>
                <li>• Boa iluminacao</li>
              </ul>
            </div>
            
            <Button
              onClick={generateLink}
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

      {/* Step: Ready — Link generated, waiting to open */}
      {step === 'ready' && externalUrl && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gold-500/20 flex items-center justify-center mx-auto mb-6">
              <ExternalLink className="text-gold-400" size={40} />
            </div>
            <h2 className="text-xl text-white mb-3">Link de Verificacao Pronto</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
              Clique no botao abaixo para abrir a verificacao KYC numa nova janela.
              Complete todos os passos e volte a esta pagina.
            </p>
            <Button
              onClick={openVerification}
              className="bg-gold-500 hover:bg-gold-400 text-black px-8 py-3 text-base"
              data-testid="open-verification-btn"
            >
              <ExternalLink size={18} className="mr-2" />
              Abrir Verificacao
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              Abre numa nova janela do browser. O estado sera atualizado automaticamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Waiting — User is doing verification in other window */}
      {step === 'waiting' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-gold-500/30 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-gold-500/10 flex items-center justify-center">
                <Clock className="text-gold-400" size={36} />
              </div>
            </div>
            <h2 className="text-xl text-white mb-3">A aguardar verificacao...</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
              Complete a verificacao na janela que foi aberta.
              Esta pagina atualiza automaticamente quando terminar.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              A verificar estado a cada 5 segundos
            </div>
            <div className="mt-6 space-y-2">
              <Button
                onClick={openVerification}
                variant="outline"
                className="border-gold-500/30 text-gold-400 hover:bg-gold-500/10"
                data-testid="reopen-verification-btn"
              >
                <ExternalLink size={14} className="mr-2" />
                Reabrir janela de verificacao
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Pending — Documents submitted, under review */}
      {step === 'pending' && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="text-blue-400" size={48} />
            </div>
            <h2 className="text-2xl text-white mb-2">Documentos em Analise</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Os seus documentos foram submetidos e estao em analise.
              Sera notificado quando o processo estiver concluido.
            </p>
            <Button
              onClick={() => navigate('/dashboard/kyc')}
              variant="outline"
              className="border-gold-500/30 text-gold-400"
              data-testid="back-to-kyc-btn"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Error */}
      {step === 'error' && (
        <Card className="bg-zinc-900/50 border-red-800/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
            <h2 className="text-xl text-white mb-3">Erro na Verificacao</h2>
            <p className="text-gray-400 mb-4 max-w-md mx-auto text-sm">
              Nao foi possivel gerar o link de verificacao. Tente novamente.
            </p>
            {errorDetail && (
              <div className="bg-red-500/10 rounded-lg p-3 mb-6 max-w-md mx-auto">
                <p className="text-xs text-red-400 font-mono break-all">{errorDetail}</p>
              </div>
            )}
            <Button onClick={generateLink} className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="retry-verification-btn">
              <RefreshCw size={16} className="mr-2" /> Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
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
                  A sua identidade foi verificada com sucesso. Tem acesso completo a plataforma.
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
                        <li key={i}>• {label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={generateLink} className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="retry-kyc-btn">
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
