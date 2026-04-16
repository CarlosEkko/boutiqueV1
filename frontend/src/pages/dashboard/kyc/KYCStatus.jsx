import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { 
  Shield, AlertCircle, CheckCircle2, Clock, XCircle,
  Building2, ChevronRight, User, Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KYCStatus = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchKYCStatus();
  }, []);

  const getStatusBadge = (status) => {
    const map = {
      not_started: { label: t('kyc.status.notStarted', 'Não Iniciado'), cls: 'bg-gray-500/20 text-gray-400', icon: AlertCircle },
      in_progress: { label: t('kyc.status.inProgress', 'Em Curso'), cls: 'bg-blue-500/20 text-blue-400', icon: Clock },
      pending_review: { label: t('kyc.status.pendingReview', 'Em Análise'), cls: 'bg-gold-400/20 text-gold-400', icon: Clock },
      approved: { label: t('kyc.status.approved', 'Aprovado'), cls: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
      rejected: { label: t('kyc.status.rejected', 'Rejeitado'), cls: 'bg-red-500/20 text-red-400', icon: XCircle },
    };
    return map[status] || map.not_started;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gold-400">...</div></div>;
  }

  const kycStatus = kycData?.kyc_status || 'not_started';
  const kybStatus = kycData?.kyb_status || 'not_started';
  const kycBadge = getStatusBadge(kycStatus);
  const kybBadge = getStatusBadge(kybStatus);

  const StatusIcon = ({ config }) => {
    const Icon = config.icon;
    return <Icon size={14} className="mr-1" />;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto" data-testid="kyc-status-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white mb-2">
          {t('kyc.title', 'Verificação de Identidade')}
        </h1>
        <p className="text-gray-400">
          {t('kyc.subtitle', 'Gerencie as verificações da sua conta pessoal e empresarial.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC Individual Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden" data-testid="kyc-individual-card">
          <div className="p-6 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <User className="text-blue-400" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">{t('kyc.individual.title', 'KYC Individual')}</h2>
                  <p className="text-gray-500 text-xs">{t('kyc.individual.subtitle', 'Verificação de identidade pessoal')}</p>
                </div>
              </div>
              <Badge className={`${kycBadge.cls} border-0 text-xs`}>
                <StatusIcon config={kycBadge} /> {kycBadge.label}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-gray-400 text-sm">
              {t('kyc.individual.description', 'Complete a verificação KYC para ativar a sua conta pessoal. Necessário para depósitos, levantamentos e trading.')}
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={14} className={kycStatus !== 'not_started' ? 'text-green-400' : 'text-gray-600'} />
                <span className={kycStatus !== 'not_started' ? 'text-gray-300' : 'text-gray-500'}>{t('kyc.individual.step1', 'Documento de identificação')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={14} className={kycStatus === 'approved' ? 'text-green-400' : 'text-gray-600'} />
                <span className={kycStatus === 'approved' ? 'text-gray-300' : 'text-gray-500'}>{t('kyc.individual.step2', 'Selfie de verificação')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={14} className={kycStatus === 'approved' ? 'text-green-400' : 'text-gray-600'} />
                <span className={kycStatus === 'approved' ? 'text-gray-300' : 'text-gray-500'}>{t('kyc.individual.step3', 'Comprovativo de morada')}</span>
              </div>
            </div>

            {kycStatus === 'approved' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-green-400 text-sm">{t('kyc.individual.verified', 'Identidade verificada')}</span>
              </div>
            ) : (
              <Button
                onClick={() => navigate('/dashboard/kyc/sumsub')}
                className="w-full bg-blue-600 hover:bg-blue-700 py-5"
                data-testid="start-kyc-btn"
              >
                {kycStatus === 'not_started' 
                  ? t('kyc.individual.start', 'Iniciar Verificação KYC')
                  : kycStatus === 'in_progress' 
                    ? t('kyc.status.continueVerification', 'Continuar Verificação')
                    : kycStatus === 'rejected'
                      ? t('kyc.individual.retry', 'Tentar Novamente')
                      : t('kyc.status.pendingReview', 'Em Análise')
                }
                <ChevronRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* KYB Business Card */}
        <div className="bg-zinc-900/50 border border-gold-800/20 rounded-xl overflow-hidden" data-testid="kyb-business-card">
          <div className="p-6 border-b border-gold-800/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                  <Building2 className="text-gold-400" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">{t('kyc.business.title', 'KYB Empresarial')}</h2>
                  <p className="text-gray-500 text-xs">{t('kyc.business.subtitle', 'Verificação de conta empresarial')}</p>
                </div>
              </div>
              <Badge className={`${kybBadge.cls} border-0 text-xs`}>
                <StatusIcon config={kybBadge} /> {kybBadge.label}
              </Badge>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-gray-400 text-sm">
              {t('kyc.business.description', 'Abra uma conta empresarial para operar em nome da sua empresa com carteiras e limites independentes.')}
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 size={14} className="text-gold-400" />
                <span className="text-gray-400">{t('kyc.business.step1', 'Dados da empresa e representante legal')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield size={14} className="text-gold-400" />
                <span className="text-gray-400">{t('kyc.business.step2', 'Documentos societários (certidão, estatutos)')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap size={14} className="text-gold-400" />
                <span className="text-gray-400">{t('kyc.business.step3', 'Verificação automática via Sumsub KYB')}</span>
              </div>
            </div>

            {kybStatus === 'approved' ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-green-400 text-sm">{t('kyc.business.verified', 'Empresa verificada')}</span>
              </div>
            ) : (
              <Button
                onClick={() => navigate('/dashboard/kyc/kyb')}
                className="w-full bg-gold-500 hover:bg-gold-400 text-black py-5"
                data-testid="start-kyb-btn"
              >
                {kybStatus === 'not_started'
                  ? t('kyc.business.start', 'Iniciar Verificação Empresarial')
                  : kybStatus === 'in_progress'
                    ? t('kyc.status.continueVerification', 'Continuar Verificação')
                    : kybStatus === 'rejected'
                      ? t('kyc.business.retry', 'Tentar Novamente')
                      : t('kyc.status.pendingReview', 'Em Análise')
                }
                <ChevronRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Why Verification */}
      <div className="bg-zinc-900/30 border border-gold-800/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gold-400/10 rounded-lg shrink-0">
            <Shield className="text-gold-400" size={24} />
          </div>
          <div>
            <h3 className="text-white font-medium mb-3">{t('kyc.status.whyVerify', 'Porquê a verificação?')}</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• {t('kyc.onboarding.benefit1', 'Conformidade com regulamentos AML/KYC internacionais')}</li>
              <li>• {t('kyc.onboarding.benefit2', 'Proteção da sua conta e ativos')}</li>
              <li>• {t('kyc.onboarding.benefit3', 'Limites de transação superiores')}</li>
              <li>• {t('kyc.onboarding.benefit4', 'Acesso a oportunidades de investimento exclusivas')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCStatus;
