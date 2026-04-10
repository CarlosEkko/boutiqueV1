import React, { useState, useEffect, useCallback, useRef } from 'react';
import SumsubWebSdk from '@sumsub/websdk-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { COUNTRIES } from '../../../utils/countries';
import {
  ChevronLeft, ChevronRight, Shield, Building2, CheckCircle, XCircle,
  Loader2, RefreshCw, AlertTriangle, FileText, Users, MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { id: 'company', label: 'Dados da Empresa', icon: Building2 },
  { id: 'address', label: 'Morada e Contactos', icon: MapPin },
  { id: 'verification', label: 'Verificação Sumsub', icon: Shield },
];

const SumsubKYB = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState(0);
  const [accessToken, setAccessToken] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    company_type: 'llc',
    registration_number: '',
    tax_id: '',
    incorporation_date: '',
    incorporation_country: '',
    business_address: '',
    business_city: '',
    business_postal_code: '',
    business_country: '',
    business_email: '',
    business_phone: '',
    website: '',
  });

  const abortRef = useRef(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    checkInitialStatus(controller.signal);
    return () => controller.abort();
  }, []);

  const checkInitialStatus = async (signal) => {
    try {
      const response = await axios.get(`${API_URL}/api/sumsub/status`, { signal });
      const data = response.data;
      if (signal?.aborted) return;

      // Check if there's an existing KYB applicant
      if (data.local_data?.applicant_type === 'company') {
        if (data.status === 'approved') {
          setVerificationStatus({ review_answer: 'GREEN' });
          setCurrentStep(2);
        } else if (data.status === 'rejected') {
          setVerificationStatus({ review_answer: 'RED', reject_labels: data.local_data?.reject_labels });
          setCurrentStep(2);
        } else if (data.status === 'pending' || data.status === 'created' || data.status === 'init') {
          // Has applicant, go straight to SDK
          await fetchKYBToken(signal);
        }
      }

      // Also check local KYB form data
      const kybRes = await axios.get(`${API_URL}/api/kyc/status`, { signal });
      if (signal?.aborted) return;
      if (kybRes.data.kyb) {
        const kyb = kybRes.data.kyb;
        setCompanyInfo(prev => ({
          ...prev,
          company_name: kyb.company_name || prev.company_name,
          company_type: kyb.company_type || prev.company_type,
          registration_number: kyb.registration_number || prev.registration_number,
          tax_id: kyb.tax_id || prev.tax_id,
          incorporation_date: kyb.incorporation_date || prev.incorporation_date,
          incorporation_country: kyb.incorporation_country || prev.incorporation_country,
          business_address: kyb.business_address || prev.business_address,
          business_city: kyb.business_city || prev.business_city,
          business_postal_code: kyb.business_postal_code || prev.business_postal_code,
          business_country: kyb.business_country || prev.business_country,
          business_email: kyb.business_email || prev.business_email,
          business_phone: kyb.business_phone || prev.business_phone,
          website: kyb.website || prev.website,
        }));
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || signal?.aborted) return;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchKYBToken = async (signal) => {
    try {
      const response = await axios.post(`${API_URL}/api/sumsub/applicants`, {
        email: user?.email || '',
        first_name: user?.first_name || user?.name?.split(' ')?.[0] || '',
        last_name: user?.last_name || user?.name?.split(' ')?.slice(1)?.join(' ') || '',
        country: user?.country || '',
        verification_type: 'kyb',
        company_name: companyInfo.company_name || undefined,
      }, signal ? { signal } : {});

      if (signal?.aborted) return;

      const tkn = response.data?.sdk_token;
      if (tkn) {
        setAccessToken(tkn);
        setCurrentStep(2);
      } else {
        throw new Error('Token não recebido do servidor');
      }
    } catch (err) {
      if (err?.name === 'CanceledError' || signal?.aborted) return;
      const detail = err.response?.data?.detail || err.message;
      setError(`Erro ao gerar token KYB: ${detail}`);
      toast.error('Falha ao iniciar verificação Sumsub');
    }
  };

  const handleCompanyInfoNext = () => {
    if (!companyInfo.company_name.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    if (!companyInfo.registration_number.trim()) {
      toast.error('NIPC/Número de registo é obrigatório');
      return;
    }
    setCurrentStep(1);
  };

  const handleAddressNext = async () => {
    if (!companyInfo.business_email.trim()) {
      toast.error('Email corporativo é obrigatório');
      return;
    }

    setSubmitting(true);
    try {
      // Save company info to local KYB record
      const formData = new FormData();
      Object.entries(companyInfo).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      // Start KYB if not started
      try {
        await axios.post(`${API_URL}/api/kyc/start?verification_type=kyb`);
      } catch { /* already exists, ok */ }

      await axios.post(`${API_URL}/api/kyc/company-info`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Now create Sumsub KYB applicant and get token
      await fetchKYBToken();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Erro ao submeter dados');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTokenExpiration = useCallback(async () => {
    try {
      const response = await axios.post(`${API_URL}/api/sumsub/applicants`, {
        email: user?.email || '',
        verification_type: 'kyb',
        company_name: companyInfo.company_name || undefined,
      });
      return response.data.sdk_token;
    } catch (err) {
      console.error('Error refreshing KYB token:', err);
      throw err;
    }
  }, [user, companyInfo.company_name]);

  const handleMessage = useCallback((type, payload) => {
    console.log('Sumsub KYB message:', type, payload);
    switch (type) {
      case 'idCheck.onApplicantStatusChanged':
        if (payload?.reviewResult?.reviewAnswer === 'GREEN') {
          setVerificationStatus({ review_answer: 'GREEN' });
          toast.success('Verificação KYB aprovada!');
        } else if (payload?.reviewResult?.reviewAnswer === 'RED') {
          setVerificationStatus({
            review_answer: 'RED',
            reject_labels: payload?.reviewResult?.rejectLabels,
          });
          toast.error('Verificação KYB rejeitada');
        }
        break;
      default:
        break;
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('Sumsub KYB WebSDK error:', error);
  }, []);

  const sdkConfig = { lang: 'pt', theme: 'dark' };
  const sdkOptions = { addViewportTag: false, adaptIframeHeight: true };

  const updateField = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="sumsub-kyb-loading">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-gold-400 mb-4" size={48} />
          <p className="text-gray-400">A verificar estado KYB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid="sumsub-kyb-page">
      {/* Header */}
      <div className="mb-8">
        <Button
          onClick={() => navigate('/dashboard/kyc')}
          variant="ghost"
          className="text-gray-400 hover:text-white mb-4"
          data-testid="kyb-back-btn"
        >
          <ChevronLeft size={18} className="mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-light text-white mb-2 flex items-center gap-3">
          <Building2 className="text-gold-400" />
          Verificação Empresarial (KYB)
        </h1>
        <p className="text-gray-400">
          Preencha os dados da empresa e complete a verificação automática
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const completed = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  completed ? 'bg-green-600 border-green-600 text-white'
                  : active ? 'bg-gold-500 border-gold-500 text-black'
                  : 'bg-zinc-800 border-zinc-700 text-gray-500'
                }`}>
                  {completed ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-xs mt-2 hidden md:block ${active ? 'text-gold-400' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 md:w-24 h-0.5 mx-2 ${completed ? 'bg-green-600' : 'bg-zinc-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 0: Company Info */}
      {currentStep === 0 && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Building2 size={20} className="text-gold-400" />
              Informações da Empresa
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nome da Empresa *</Label>
                <Input value={companyInfo.company_name} onChange={e => updateField('company_name', e.target.value)}
                  placeholder="Empresa Exemplo, Lda" className="bg-zinc-800 border-zinc-700 text-white" data-testid="kyb-company-name" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Tipo de Empresa *</Label>
                <select value={companyInfo.company_type} onChange={e => updateField('company_type', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white text-sm" data-testid="kyb-company-type">
                  <option value="llc">Sociedade por Quotas (Lda)</option>
                  <option value="corporation">Sociedade Anónima (SA)</option>
                  <option value="partnership">Sociedade em Nome Coletivo</option>
                  <option value="sole_proprietorship">Empresário em Nome Individual</option>
                  <option value="non_profit">Organização sem fins lucrativos</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">NIPC / Número de Registo *</Label>
                <Input value={companyInfo.registration_number} onChange={e => updateField('registration_number', e.target.value)}
                  placeholder="500123456" className="bg-zinc-800 border-zinc-700 text-white" data-testid="kyb-nipc" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">NIF / Tax ID</Label>
                <Input value={companyInfo.tax_id} onChange={e => updateField('tax_id', e.target.value)}
                  placeholder="500123456" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Data de Constituição *</Label>
                <Input type="date" value={companyInfo.incorporation_date} onChange={e => updateField('incorporation_date', e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white" data-testid="kyb-inc-date" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">País de Constituição *</Label>
                <Select value={companyInfo.incorporation_country} onValueChange={v => updateField('incorporation_country', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="kyb-inc-country">
                    <SelectValue placeholder="Selecionar país" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code} className="text-white hover:bg-zinc-700">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleCompanyInfoNext}
              className="w-full bg-gold-500 hover:bg-gold-400 text-black py-5" data-testid="kyb-next-step1">
              Continuar <ChevronRight size={18} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Address & Contacts */}
      {currentStep === 1 && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <MapPin size={20} className="text-gold-400" />
              Morada e Contactos
            </h3>

            <div className="space-y-2">
              <Label className="text-gray-300">Morada da Sede *</Label>
              <Input value={companyInfo.business_address} onChange={e => updateField('business_address', e.target.value)}
                placeholder="Avenida da Liberdade, 100" className="bg-zinc-800 border-zinc-700 text-white" data-testid="kyb-address" />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Cidade *</Label>
                <Input value={companyInfo.business_city} onChange={e => updateField('business_city', e.target.value)}
                  placeholder="Lisboa" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Código Postal *</Label>
                <Input value={companyInfo.business_postal_code} onChange={e => updateField('business_postal_code', e.target.value)}
                  placeholder="1250-096" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">País *</Label>
                <Select value={companyInfo.business_country} onValueChange={v => updateField('business_country', v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code} className="text-white hover:bg-zinc-700">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <hr className="border-zinc-700" />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Email Corporativo *</Label>
                <Input type="email" value={companyInfo.business_email} onChange={e => updateField('business_email', e.target.value)}
                  placeholder="info@empresa.pt" className="bg-zinc-800 border-zinc-700 text-white" data-testid="kyb-email" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Telefone</Label>
                <Input value={companyInfo.business_phone} onChange={e => updateField('business_phone', e.target.value)}
                  placeholder="+351 21 123 4567" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Website</Label>
              <Input value={companyInfo.website} onChange={e => updateField('website', e.target.value)}
                placeholder="https://www.empresa.pt" className="bg-zinc-800 border-zinc-700 text-white" />
            </div>

            <div className="bg-zinc-800/50 border border-gold-400/20 rounded-lg p-4">
              <p className="text-gold-400/80 text-sm flex items-start gap-2">
                <Shield size={16} className="flex-shrink-0 mt-0.5" />
                Após submeter, será redirecionado para a verificação automática Sumsub onde poderá carregar documentos da empresa e identificar UBOs.
              </p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-zinc-700 text-gray-300"
                onClick={() => setCurrentStep(0)}>
                <ChevronLeft size={18} className="mr-2" /> Voltar
              </Button>
              <Button onClick={handleAddressNext} disabled={submitting}
                className="flex-1 bg-gold-500 hover:bg-gold-400 text-black py-5" data-testid="kyb-submit-to-sumsub">
                {submitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Shield size={18} className="mr-2" />}
                {submitting ? 'A submeter...' : 'Iniciar Verificação Sumsub'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Sumsub SDK / Result */}
      {currentStep === 2 && !verificationStatus && accessToken && (
        <Card className="bg-zinc-900/50 border-gold-800/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gold-800/20 flex items-center gap-3">
              <Building2 size={18} className="text-gold-400" />
              <p className="text-sm text-gray-400">
                Siga as instruções para carregar os documentos da empresa e identificar os beneficiários efetivos
              </p>
            </div>
            <div
              className="min-h-[600px]"
              data-testid="sumsub-kyb-sdk-container"
              style={{ colorScheme: 'normal', isolation: 'isolate', backgroundColor: '#18181b' }}
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

      {/* Step 2: Error state (no token) */}
      {currentStep === 2 && !verificationStatus && !accessToken && error && (
        <Card className="bg-zinc-900/50 border-red-800/20">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
            <h2 className="text-xl text-white mb-3">Erro na Verificação KYB</h2>
            <p className="text-gray-400 mb-4 text-sm">{error}</p>
            <Button onClick={() => { setError(null); fetchKYBToken(); }}
              className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="kyb-retry-btn">
              <RefreshCw size={16} className="mr-2" /> Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {currentStep === 2 && verificationStatus && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-8 text-center">
            {verificationStatus.review_answer === 'GREEN' ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-green-400" size={48} />
                </div>
                <h2 className="text-2xl text-white mb-2">KYB Aprovado!</h2>
                <p className="text-gray-400 mb-2">{companyInfo.company_name}</p>
                <p className="text-gray-500 text-sm mb-6">
                  A verificação empresarial foi concluída com sucesso.
                </p>
                <Button onClick={() => navigate('/dashboard')}
                  className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="kyb-go-dashboard">
                  Ir para Dashboard
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="text-red-400" size={48} />
                </div>
                <h2 className="text-2xl text-white mb-2">KYB Rejeitado</h2>
                <p className="text-gray-400 mb-4">
                  A verificação empresarial não foi aprovada.
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
                <Button onClick={() => { setVerificationStatus(null); setAccessToken(null); setCurrentStep(0); setError(null); }}
                  className="bg-gold-500 hover:bg-gold-400 text-black px-8" data-testid="kyb-retry-full">
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

export default SumsubKYB;
