import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { 
  Shield, 
  User,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  Search
} from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminKYC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('kyc');
  const [pendingKYC, setPendingKYC] = useState([]);
  const [pendingKYB, setPendingKYB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      const [kycRes, kybRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/kyc/pending`),
        axios.get(`${API_URL}/api/admin/kyb/pending`)
      ]);
      setPendingKYC(kycRes.data);
      setPendingKYB(kybRes.data);
    } catch (error) {
      console.error('Error fetching verifications:', error);
      toast.error('Error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, type) => {
    try {
      await axios.post(`${API_URL}/api/admin/${type}/${userId}/approve`);
      toast.success(`${type.toUpperCase()} aprovado com sucesso`);
      fetchPendingVerifications();
      setExpandedId(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao aprovar');
    }
  };

  const handleReject = async (userId, type) => {
    if (!rejectionReason) {
      toast.error('Indique o motivo da rejeição');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/admin/${type}/${userId}/reject?reason=${encodeURIComponent(rejectionReason)}`);
      toast.success(`${type.toUpperCase()} rejeitado`);
      fetchPendingVerifications();
      setExpandedId(null);
      setRejectionReason('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao rejeitar');
    }
  };

  const filteredKYC = pendingKYC.filter(item => 
    item.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredKYB = pendingKYB.filter(item => 
    item.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentList = activeTab === 'kyc' ? filteredKYC : filteredKYB;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-amber-400">...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-kyc-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white mb-1">{t('kyc.admin.title')}</h1>
          <p className="text-gray-400">{t('kyc.admin.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1">
            <Button
              onClick={() => setActiveTab('kyc')}
              variant={activeTab === 'kyc' ? 'default' : 'ghost'}
              size="sm"
              className={activeTab === 'kyc' ? 'bg-amber-600 text-black' : 'text-gray-400'}
              data-testid="tab-kyc"
            >
              <User size={16} className="mr-2" />
              KYC ({pendingKYC.length})
            </Button>
            <Button
              onClick={() => setActiveTab('kyb')}
              variant={activeTab === 'kyb' ? 'default' : 'ghost'}
              size="sm"
              className={activeTab === 'kyb' ? 'bg-amber-600 text-black' : 'text-gray-400'}
              data-testid="tab-kyb"
            >
              <Building2 size={16} className="mr-2" />
              KYB ({pendingKYB.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder={t('kyc.admin.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-zinc-900 border-zinc-700"
          data-testid="search-input"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Clock size={18} />
            <span className="text-sm">{t('kyc.admin.pending')}</span>
          </div>
          <p className="text-2xl font-medium text-white">
            {pendingKYC.length + pendingKYB.length}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <User size={18} />
            <span className="text-sm">{t('kyc.admin.kycPending')}</span>
          </div>
          <p className="text-2xl font-medium text-white">{pendingKYC.length}</p>
        </div>
        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Building2 size={18} />
            <span className="text-sm">{t('kyc.admin.kybPending')}</span>
          </div>
          <p className="text-2xl font-medium text-white">{pendingKYB.length}</p>
        </div>
        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle2 size={18} />
            <span className="text-sm">{t('kyc.admin.approvedToday')}</span>
          </div>
          <p className="text-2xl font-medium text-white">-</p>
        </div>
      </div>

      {/* List */}
      {currentList.length === 0 ? (
        <div className="bg-zinc-900/50 border border-amber-900/20 rounded-xl p-12 text-center">
          <Shield className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-white font-medium mb-2">
            {activeTab === 'kyc' ? t('kyc.admin.noKycPending') : t('kyc.admin.noKybPending')}
          </h3>
          <p className="text-gray-400 text-sm">
            {t('kyc.admin.allProcessed')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((item) => (
            <VerificationCard
              key={item.id}
              item={item}
              type={activeTab}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onApprove={() => handleApprove(item.user_id, activeTab)}
              onReject={() => handleReject(item.user_id, activeTab)}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const VerificationCard = ({ 
  item, 
  type, 
  expanded, 
  onToggle, 
  onApprove,
  onReject,
  rejectionReason,
  setRejectionReason,
  t
}) => {
  const isKYC = type === 'kyc';

  return (
    <div 
      className="bg-zinc-900/50 border border-amber-900/20 rounded-xl overflow-hidden"
      data-testid={`verification-card-${item.id}`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${isKYC ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
            {isKYC ? (
              <User className="text-blue-400" size={24} />
            ) : (
              <Building2 className="text-purple-400" size={24} />
            )}
          </div>
          <div>
            <h3 className="text-white font-medium">
              {isKYC ? item.full_name || item.user?.name : item.company_name}
            </h3>
            <p className="text-sm text-gray-400">{item.user?.email}</p>
            {!isKYC && (
              <p className="text-xs text-amber-400">{t('kyc.admin.nipc')}: {item.registration_number}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10">
            <Clock size={14} className="text-amber-400" />
            <span className="text-sm text-amber-400">{t('kyc.admin.pending')}</span>
          </div>
          <div className="text-gray-400">
            {item.documents?.length || 0} {t('kyc.admin.docs')}
          </div>
          {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Personal/Company Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-amber-400 font-medium mb-3">
                {isKYC ? t('kyc.admin.personalData') : t('kyc.admin.companyData')}
              </h4>
              <div className="space-y-2 text-sm">
                {isKYC ? (
                  <>
                    <InfoRow label={t('kyc.admin.name')} value={item.full_name} />
                    <InfoRow label={t('kyc.admin.dob')} value={item.date_of_birth} />
                    <InfoRow label={t('kyc.admin.nationalityLabel')} value={item.nationality} />
                    <InfoRow label={t('kyc.admin.countryResidence')} value={item.country_of_residence} />
                    <InfoRow label={t('kyc.admin.addressLabel')} value={item.address} />
                    <InfoRow label={t('kyc.admin.cityLabel')} value={`${item.city}, ${item.postal_code}`} />
                  </>
                ) : (
                  <>
                    <InfoRow label={t('kyc.admin.company')} value={item.company_name} />
                    <InfoRow label="Tipo" value={item.company_type} />
                    <InfoRow label="NIPC" value={item.registration_number} />
                    <InfoRow label="Data Constituição" value={item.incorporation_date} />
                    <InfoRow label="País" value={item.incorporation_country} />
                    <InfoRow label="Email" value={item.business_email} />
                  </>
                )}
              </div>
            </div>

            {/* ID Document Info (KYC only) */}
            {isKYC && item.id_document_type && (
              <div>
                <h4 className="text-amber-400 font-medium mb-3">Documento de Identificação</h4>
                <div className="space-y-2 text-sm">
                  <InfoRow label="Tipo" value={formatDocType(item.id_document_type)} />
                  <InfoRow label="Número" value={item.id_document_number} />
                  <InfoRow label="Validade" value={item.id_document_expiry} />
                  <InfoRow label="País Emissão" value={item.id_document_country} />
                </div>
              </div>
            )}

            {/* Representatives (KYB only) */}
            {!isKYC && item.representatives?.length > 0 && (
              <div>
                <h4 className="text-amber-400 font-medium mb-3">Representantes</h4>
                <div className="space-y-3">
                  {item.representatives.map((rep, index) => (
                    <div key={index} className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-white font-medium">{rep.full_name}</p>
                      <p className="text-sm text-gray-400">{rep.role}</p>
                      {rep.is_ubo && (
                        <span className="text-xs text-amber-400">UBO - {rep.ownership_percentage}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-amber-400 font-medium mb-3">Documentos Submetidos</h4>
            {item.documents?.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {item.documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="text-white text-sm">{formatDocType(doc.document_type)}</p>
                        <p className="text-xs text-gray-500">{doc.file_name}</p>
                      </div>
                    </div>
                    <a 
                      href={`${API_URL}${doc.file_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                Nenhum documento encontrado
              </div>
            )}
          </div>

          {/* Rejection Reason Input */}
          <div className="border-t border-zinc-800 pt-4">
            <label className="text-sm text-gray-400 block mb-2">
              Motivo da rejeição (obrigatório para rejeitar)
            </label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Documento ilegível, dados inconsistentes..."
              className="bg-zinc-800 border-zinc-700 mb-4"
              data-testid="rejection-reason-input"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onReject}
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              data-testid="reject-btn"
            >
              <XCircle size={18} className="mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={onApprove}
              className="flex-1 bg-green-600 hover:bg-green-700"
              data-testid="approve-btn"
            >
              <CheckCircle2 size={18} className="mr-2" />
              Aprovar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-400">{label}:</span>
    <span className="text-white">{value || '-'}</span>
  </div>
);

const formatDocType = (type) => {
  const types = {
    passport: 'Passaporte',
    id_card: 'Cartão de Cidadão',
    drivers_license: 'Carta de Condução',
    selfie_with_id: 'Selfie com ID',
    proof_of_address: 'Comprovativo Morada',
    certificate_of_incorporation: 'Certidão Constituição',
    articles_of_association: 'Estatutos',
    shareholder_register: 'Registo Quotistas',
    business_address_proof: 'Comp. Morada Empresarial',
    tax_registration: 'Registo Fiscal'
  };
  return types[type] || type;
};

export default AdminKYC;
