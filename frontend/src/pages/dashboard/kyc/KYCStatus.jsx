import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Building2,
  ChevronRight,
  FileText,
  Users,
  Zap,
  Globe,
  Briefcase
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KYCStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kyc/status`);
      setKycData(response.data);
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startKYB = () => {
    navigate('/dashboard/kyc/kyb');
  };

  const getStatusConfig = (status) => {
    const configs = {
      not_started: {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        icon: AlertCircle,
        label: t('kyc.status.notStarted')
      },
      in_progress: {
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: Clock,
        label: t('kyc.status.inProgress')
      },
      pending_review: {
        color: 'text-gold-400',
        bgColor: 'bg-gold-400/10',
        borderColor: 'border-gold-400/30',
        icon: Clock,
        label: t('kyc.status.pendingReview')
      },
      approved: {
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: CheckCircle2,
        label: t('kyc.status.approved')
      },
      rejected: {
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: XCircle,
        label: t('kyc.status.rejected')
      }
    };
    return configs[status] || configs.not_started;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">...</div>
      </div>
    );
  }

  const kybStatus = kycData?.kyb_status || 'not_started';
  const kybConfig = getStatusConfig(kybStatus);

  const onboardingSteps = [
    { icon: Building2, title: t('kyc.onboarding.step1Title', 'Dados da Empresa'), desc: t('kyc.onboarding.step1Desc', 'Nome, NIPC, tipo de sociedade, data de constituição') },
    { icon: Globe, title: t('kyc.onboarding.step2Title', 'Morada e Contactos'), desc: t('kyc.onboarding.step2Desc', 'Sede social, email corporativo, telefone') },
    { icon: FileText, title: t('kyc.onboarding.step3Title', 'Documentos'), desc: t('kyc.onboarding.step3Desc', 'Certidão comercial, estatutos, comprovativo de morada') },
    { icon: Users, title: t('kyc.onboarding.step4Title', 'Representantes e UBOs'), desc: t('kyc.onboarding.step4Desc', 'Identificação dos diretores e beneficiários efetivos') },
    { icon: Shield, title: t('kyc.onboarding.step5Title', 'Verificação Automática'), desc: t('kyc.onboarding.step5Desc', 'Validação via Sumsub KYB Quest') },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto" data-testid="kyc-status-page">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/20 mb-4">
          <Building2 className="text-gold-400" size={32} />
        </div>
        <h1 className="text-3xl font-light text-white mb-2">
          {t('kyc.onboarding.title', 'Onboarding Institucional')}
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          {t('kyc.onboarding.subtitle', 'Complete a verificação empresarial (KYB) para ativar a sua conta institucional e aceder a todos os serviços da plataforma.')}
        </p>
      </div>

      {/* Status Banner */}
      <div className={`${kybConfig.bgColor} border ${kybConfig.borderColor} rounded-xl p-5`} data-testid="kyb-status-banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${kybConfig.bgColor}`}>
              <kybConfig.icon className={kybConfig.color} size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                {t('kyc.onboarding.verificationStatus', 'Estado da Verificação')}
              </h3>
              <p className={`text-sm ${kybConfig.color}`}>{kybConfig.label}</p>
            </div>
          </div>
          <Briefcase className={kybConfig.color} size={20} />
        </div>
      </div>

      {/* Onboarding Steps */}
      {(kybStatus === 'not_started' || kybStatus === 'rejected') && (
        <div className="bg-zinc-900/50 border border-gold-800/20 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-medium text-white">
            {t('kyc.onboarding.stepsTitle', 'Etapas do Processo')}
          </h3>
          <div className="space-y-4">
            {onboardingSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 shrink-0">
                    <Icon size={18} className="text-gold-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{step.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                  </div>
                  <span className="text-xs text-zinc-600 font-mono mt-1">{String(i + 1).padStart(2, '0')}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Button 
              onClick={startKYB}
              className="w-full bg-gold-500 hover:bg-gold-400 text-black py-6 text-base font-semibold"
              data-testid="start-kyb-btn"
            >
              <Zap size={20} className="mr-2" />
              {kybStatus === 'rejected' 
                ? t('kyc.onboarding.retryVerification', 'Tentar Novamente')
                : t('kyc.onboarding.startVerification', 'Iniciar Verificação Empresarial')
              }
              <ChevronRight size={20} className="ml-2" />
            </Button>
            {kybStatus === 'rejected' && kycData?.kyb?.rejection_reason && (
              <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{kycData.kyb.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In Progress */}
      {kybStatus === 'in_progress' && (
        <div className="bg-zinc-900/50 border border-blue-500/20 rounded-xl p-8 text-center">
          <Clock className="mx-auto text-blue-400 mb-4" size={48} />
          <h3 className="text-xl text-white mb-2">
            {t('kyc.onboarding.verificationInProgress', 'Verificação em Curso')}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {t('kyc.onboarding.continueWhereLeft', 'Continue o processo de verificação onde parou.')}
          </p>
          <Button 
            onClick={() => navigate('/dashboard/kyc/kyb')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-5"
            data-testid="continue-kyb-btn"
          >
            {t('kyc.status.continueVerification')}
            <ChevronRight size={18} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Pending Review */}
      {kybStatus === 'pending_review' && (
        <div className="bg-zinc-900/50 border border-gold-400/20 rounded-xl p-8 text-center">
          <Clock className="mx-auto text-gold-400 mb-4" size={48} />
          <h3 className="text-xl text-white mb-2">
            {t('kyc.onboarding.underReview', 'Em Análise')}
          </h3>
          <p className="text-gray-400 max-w-md mx-auto">
            {t('kyc.onboarding.underReviewDesc', 'Os documentos da sua empresa estão a ser analisados. Este processo demora habitualmente 24-48 horas úteis.')}
          </p>
        </div>
      )}

      {/* Approved */}
      {kybStatus === 'approved' && (
        <div className="bg-zinc-900/50 border border-green-500/20 rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-green-400" size={40} />
          </div>
          <h3 className="text-xl text-white mb-2">
            {t('kyc.onboarding.verified', 'Conta Verificada')}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {t('kyc.onboarding.verifiedDesc', 'A verificação empresarial foi concluída com sucesso. Todos os serviços da plataforma estão disponíveis.')}
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="bg-gold-500 hover:bg-gold-400 text-black px-8"
          >
            {t('kyc.onboarding.goToDashboard', 'Ir para o Dashboard')}
          </Button>
        </div>
      )}

      {/* Why Verification */}
      <div className="bg-zinc-900/30 border border-gold-800/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gold-400/10 rounded-lg shrink-0">
            <Shield className="text-gold-400" size={24} />
          </div>
          <div>
            <h3 className="text-white font-medium mb-3">{t('kyc.status.whyVerify')}</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {(() => {
                const benefits = t('kyc.status.benefits');
                if (Array.isArray(benefits)) {
                  return benefits.map((b, i) => <li key={i}>• {b}</li>);
                }
                return (
                  <>
                    <li>• {t('kyc.onboarding.benefit1', 'Conformidade com regulamentos AML/KYC internacionais')}</li>
                    <li>• {t('kyc.onboarding.benefit2', 'Proteção da sua conta e ativos')}</li>
                    <li>• {t('kyc.onboarding.benefit3', 'Limites de transação superiores')}</li>
                    <li>• {t('kyc.onboarding.benefit4', 'Acesso a oportunidades de investimento exclusivas')}</li>
                  </>
                );
              })()}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCStatus;
