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
  User,
  ChevronRight,
  FileText,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

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

  const startVerification = async (type) => {
    try {
      await axios.post(`${API_URL}/api/kyc/start?verification_type=${type}`);
      toast.success(`${type.toUpperCase()} ${t('kyc.status.inProgress')}`);
      navigate(`/dashboard/kyc/${type}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
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

  const kycStatus = kycData?.kyc_status || 'not_started';
  const kybStatus = kycData?.kyb_status || 'not_started';
  const kycConfig = getStatusConfig(kycStatus);
  const kybConfig = getStatusConfig(kybStatus);

  return (
    <div className="space-y-8" data-testid="kyc-status-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-white mb-2">{t('kyc.status.title')}</h1>
        <p className="text-gray-400">
          {t('kyc.status.subtitle')}
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* KYC Card - Individual */}
        <div 
          className={`bg-zinc-900/50 border ${kycConfig.borderColor} rounded-xl p-6`}
          data-testid="kyc-card"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${kycConfig.bgColor}`}>
                <User className={kycConfig.color} size={24} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{t('kyc.status.kycIndividual')}</h3>
                <p className="text-sm text-gray-400">{t('kyc.status.forIndividuals')}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${kycConfig.bgColor}`}>
              <kycConfig.icon size={16} className={kycConfig.color} />
              <span className={`text-sm ${kycConfig.color}`}>{kycConfig.label}</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            {t('kyc.status.kycDescription')}
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText size={16} />
              <span>{t('kyc.status.documents.idDocument')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Upload size={16} />
              <span>{t('kyc.status.documents.selfieWithId')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText size={16} />
              <span>{t('kyc.status.documents.proofOfAddress')}</span>
            </div>
          </div>

          {kycStatus === 'not_started' && (
            <Button 
              onClick={() => startVerification('kyc')}
              className="w-full bg-gold-500 hover:bg-gold-600 text-black"
              data-testid="start-kyc-btn"
            >
              {t('kyc.status.startKyc')}
              <ChevronRight size={18} className="ml-2" />
            </Button>
          )}

          {kycStatus === 'in_progress' && (
            <Button 
              onClick={() => navigate('/dashboard/kyc/kyc')}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="continue-kyc-btn"
            >
              {t('kyc.status.continueVerification')}
              <ChevronRight size={18} className="ml-2" />
            </Button>
          )}

          {kycStatus === 'pending_review' && (
            <div className="text-center text-gold-400 text-sm">
              {t('kyc.status.estimatedTime')}
            </div>
          )}

          {kycStatus === 'approved' && (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span>{t('kyc.status.verificationComplete')}</span>
            </div>
          )}

          {kycStatus === 'rejected' && (
            <div className="space-y-3">
              <div className="text-red-400 text-sm text-center">
                {t('kyc.status.rejected')}. {kycData?.kyc?.rejection_reason}
              </div>
              <Button 
                onClick={() => startVerification('kyc')}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {t('kyc.status.tryAgain')}
              </Button>
            </div>
          )}
        </div>

        {/* KYB Card - Business */}
        <div 
          className={`bg-zinc-900/50 border ${kybConfig.borderColor} rounded-xl p-6`}
          data-testid="kyb-card"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${kybConfig.bgColor}`}>
                <Building2 className={kybConfig.color} size={24} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{t('kyc.status.kybBusiness')}</h3>
                <p className="text-sm text-gray-400">{t('kyc.status.forBusinesses')}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${kybConfig.bgColor}`}>
              <kybConfig.icon size={16} className={kybConfig.color} />
              <span className={`text-sm ${kybConfig.color}`}>{kybConfig.label}</span>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-6">
            {t('kyc.status.kybDescription')}
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText size={16} />
              <span>{t('kyc.status.documents.certIncorporation')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText size={16} />
              <span>{t('kyc.status.documents.articlesAssociation')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <User size={16} />
              <span>{t('kyc.status.documents.directorsUbos')}</span>
            </div>
          </div>

          {kybStatus === 'not_started' && (
            <Button 
              onClick={() => startVerification('kyb')}
              className="w-full bg-gold-500 hover:bg-gold-600 text-black"
              data-testid="start-kyb-btn"
            >
              {t('kyc.status.startKyb')}
              <ChevronRight size={18} className="ml-2" />
            </Button>
          )}

          {kybStatus === 'in_progress' && (
            <Button 
              onClick={() => navigate('/dashboard/kyc/kyb')}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="continue-kyb-btn"
            >
              {t('kyc.status.continueVerification')}
              <ChevronRight size={18} className="ml-2" />
            </Button>
          )}

          {kybStatus === 'pending_review' && (
            <div className="text-center text-gold-400 text-sm">
              {t('kyc.status.estimatedTimeKyb')}
            </div>
          )}

          {kybStatus === 'approved' && (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span>{t('kyc.status.verificationComplete')}</span>
            </div>
          )}

          {kybStatus === 'rejected' && (
            <div className="space-y-3">
              <div className="text-red-400 text-sm text-center">
                {t('kyc.status.rejected')}. {kycData?.kyb?.rejection_reason}
              </div>
              <Button 
                onClick={() => startVerification('kyb')}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                {t('kyc.status.tryAgain')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-zinc-900/30 border border-amber-900/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-gold-400/10 rounded-lg">
            <Shield className="text-gold-400" size={24} />
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">{t('kyc.status.whyVerify')}</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {t('kyc.status.benefits').map((benefit, index) => (
                <li key={index}>• {benefit}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCStatus;
