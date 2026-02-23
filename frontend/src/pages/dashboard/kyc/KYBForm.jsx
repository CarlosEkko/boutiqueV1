import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../../../i18n';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Check, 
  Building2,
  FileText,
  Users,
  MapPin,
  Loader2,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KYBForm = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const STEPS = [
    { id: 'company_info', label: t('kyc.kybForm.steps.companyInfo'), icon: Building2 },
    { id: 'company_documents', label: t('kyc.kybForm.steps.documents'), icon: FileText },
    { id: 'representatives', label: t('kyc.kybForm.steps.representatives'), icon: Users },
    { id: 'address_proof', label: t('kyc.kybForm.steps.addressProof'), icon: MapPin },
  ];
  
  // Form data
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
    website: ''
  });

  const [representatives, setRepresentatives] = useState([]);
  const [newRep, setNewRep] = useState({
    full_name: '',
    role: '',
    date_of_birth: '',
    nationality: '',
    ownership_percentage: '',
    is_ubo: false
  });

  useEffect(() => {
    fetchKYBStatus();
    fetchDocuments();
  }, []);

  const fetchKYBStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kyc/status`);
      if (response.data.kyb) {
        const kyb = response.data.kyb;
        setCompanyInfo({
          company_name: kyb.company_name || '',
          company_type: kyb.company_type || 'llc',
          registration_number: kyb.registration_number || '',
          tax_id: kyb.tax_id || '',
          incorporation_date: kyb.incorporation_date || '',
          incorporation_country: kyb.incorporation_country || '',
          business_address: kyb.business_address || '',
          business_city: kyb.business_city || '',
          business_postal_code: kyb.business_postal_code || '',
          business_country: kyb.business_country || '',
          business_email: kyb.business_email || '',
          business_phone: kyb.business_phone || '',
          website: kyb.website || ''
        });
        setRepresentatives(kyb.representatives || []);
        
        const stepMap = {
          'company_info': 0,
          'company_documents': 1,
          'representatives': 2,
          'address_proof': 3,
          'completed': 3 // Stay on last step if completed
        };
        const stepIndex = stepMap[kyb.current_step];
        setCurrentStep(stepIndex !== undefined ? Math.min(stepIndex, 3) : 0);
      }
    } catch (error) {
      console.error('Error fetching KYB status:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kyc/documents`);
      setUploadedDocs(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleCompanyInfoSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(companyInfo).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      await axios.post(`${API_URL}/api/kyc/company-info`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(t('kyc.form.upload.uploadSuccess'));
      setCurrentStep(1);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, documentType) => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);

      await axios.post(`${API_URL}/api/kyc/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(t('kyc.form.upload.uploadSuccess'));
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRepresentative = async () => {
    if (!newRep.full_name || !newRep.role) {
      toast.error('Error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(newRep).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          formData.append(key, value);
        }
      });

      await axios.post(`${API_URL}/api/kyc/add-representative`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(t('kyc.form.upload.uploadSuccess'));
      setRepresentatives([...representatives, {...newRep, id: Date.now()}]);
      setNewRep({
        full_name: '',
        role: '',
        date_of_birth: '',
        nationality: '',
        ownership_percentage: '',
        is_ubo: false
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/kyc/submit?verification_type=kyb`);
      toast.success(t('kyc.status.pendingReview'));
      navigate('/dashboard/kyc');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const hasUploadedDoc = (docType) => {
    return uploadedDocs.some(doc => doc.document_type === docType);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6" data-testid="company-info-step">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">{t('kyc.kybForm.companyInfo.companyName')} *</Label>
                <Input
                  id="company_name"
                  value={companyInfo.company_name}
                  onChange={(e) => setCompanyInfo({...companyInfo, company_name: e.target.value})}
                  placeholder="Empresa Exemplo, Lda"
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_type">{t('kyc.kybForm.companyInfo.companyType')} *</Label>
                <select
                  id="company_type"
                  value={companyInfo.company_type}
                  onChange={(e) => setCompanyInfo({...companyInfo, company_type: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  data-testid="select-company-type"
                >
                  <option value="llc">{t('kyc.kybForm.companyInfo.llc')}</option>
                  <option value="corporation">{t('kyc.kybForm.companyInfo.corporation')}</option>
                  <option value="partnership">{t('kyc.kybForm.companyInfo.partnership')}</option>
                  <option value="sole_proprietorship">{t('kyc.kybForm.companyInfo.soleProprietorship')}</option>
                  <option value="non_profit">{t('kyc.kybForm.companyInfo.nonProfit')}</option>
                  <option value="other">{t('kyc.kybForm.companyInfo.other')}</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registration_number">{t('kyc.kybForm.companyInfo.registrationNumber')} *</Label>
                <Input
                  id="registration_number"
                  value={companyInfo.registration_number}
                  onChange={(e) => setCompanyInfo({...companyInfo, registration_number: e.target.value})}
                  placeholder="500123456"
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-nipc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">NIF (se diferente)</Label>
                <Input
                  id="tax_id"
                  value={companyInfo.tax_id}
                  onChange={(e) => setCompanyInfo({...companyInfo, tax_id: e.target.value})}
                  placeholder="500123456"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="incorporation_date">Data de Constituição *</Label>
                <Input
                  id="incorporation_date"
                  type="date"
                  value={companyInfo.incorporation_date}
                  onChange={(e) => setCompanyInfo({...companyInfo, incorporation_date: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-incorporation-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incorporation_country">País de Constituição *</Label>
                <Input
                  id="incorporation_country"
                  value={companyInfo.incorporation_country}
                  onChange={(e) => setCompanyInfo({...companyInfo, incorporation_country: e.target.value})}
                  placeholder="Portugal"
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-incorporation-country"
                />
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <h4 className="text-white font-medium mb-4">Endereço da Sede</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address">Morada *</Label>
              <Input
                id="business_address"
                value={companyInfo.business_address}
                onChange={(e) => setCompanyInfo({...companyInfo, business_address: e.target.value})}
                placeholder="Avenida da Liberdade, 100"
                className="bg-zinc-800 border-zinc-700"
                data-testid="input-business-address"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_city">Cidade *</Label>
                <Input
                  id="business_city"
                  value={companyInfo.business_city}
                  onChange={(e) => setCompanyInfo({...companyInfo, business_city: e.target.value})}
                  placeholder="Lisboa"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_postal_code">Código Postal *</Label>
                <Input
                  id="business_postal_code"
                  value={companyInfo.business_postal_code}
                  onChange={(e) => setCompanyInfo({...companyInfo, business_postal_code: e.target.value})}
                  placeholder="1250-096"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_country">País *</Label>
                <Input
                  id="business_country"
                  value={companyInfo.business_country}
                  onChange={(e) => setCompanyInfo({...companyInfo, business_country: e.target.value})}
                  placeholder="Portugal"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-4">
              <h4 className="text-white font-medium mb-4">Contactos</h4>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_email">Email Corporativo *</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={companyInfo.business_email}
                  onChange={(e) => setCompanyInfo({...companyInfo, business_email: e.target.value})}
                  placeholder="info@empresa.pt"
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-business-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_phone">Telefone</Label>
                <Input
                  id="business_phone"
                  value={companyInfo.business_phone}
                  onChange={(e) => setCompanyInfo({...companyInfo, business_phone: e.target.value})}
                  placeholder="+351 21 123 4567"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={companyInfo.website}
                onChange={(e) => setCompanyInfo({...companyInfo, website: e.target.value})}
                placeholder="https://www.empresa.pt"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <Button 
              onClick={handleCompanyInfoSubmit}
              disabled={loading || !companyInfo.company_name || !companyInfo.registration_number}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black"
              data-testid="submit-company-info"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Continuar
              <ChevronRight size={18} className="ml-2" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6" data-testid="company-documents-step">
            <div className="bg-zinc-800/50 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">Documentos Necessários</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Certidão permanente ou certidão de constituição</li>
                <li>• Pacto social / Estatutos</li>
                <li>• Registo de quotistas/acionistas</li>
              </ul>
            </div>

            <FileUploadBox
              label="Certidão de Constituição"
              accept="image/*,.pdf"
              onUpload={(file) => handleFileUpload(file, 'certificate_of_incorporation')}
              uploaded={hasUploadedDoc('certificate_of_incorporation')}
              testId="upload-cert-incorporation"
            />

            <FileUploadBox
              label="Estatutos / Pacto Social"
              accept="image/*,.pdf"
              onUpload={(file) => handleFileUpload(file, 'articles_of_association')}
              uploaded={hasUploadedDoc('articles_of_association')}
              testId="upload-articles"
            />

            <FileUploadBox
              label="Registo de Quotistas"
              accept="image/*,.pdf"
              onUpload={(file) => handleFileUpload(file, 'shareholder_register')}
              uploaded={hasUploadedDoc('shareholder_register')}
              testId="upload-shareholders"
            />

            <div className="flex gap-4">
              <Button 
                onClick={() => setCurrentStep(0)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft size={18} className="mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!hasUploadedDoc('certificate_of_incorporation')}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-black"
              >
                Continuar
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6" data-testid="representatives-step">
            <div className="bg-zinc-800/50 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">Representantes Legais</h4>
              <p className="text-sm text-gray-400">
                Adicione todos os diretores e beneficiários efetivos (UBOs) com participação superior a 25%.
              </p>
            </div>

            {/* Existing Representatives */}
            {representatives.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-medium">Representantes Adicionados</h4>
                {representatives.map((rep, index) => (
                  <div key={rep.id || index} className="bg-zinc-800 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">{rep.full_name}</p>
                      <p className="text-sm text-gray-400">{rep.role}</p>
                      {rep.is_ubo && (
                        <span className="text-xs text-amber-400">UBO - {rep.ownership_percentage}%</span>
                      )}
                    </div>
                    <Check className="text-green-400" size={20} />
                  </div>
                ))}
              </div>
            )}

            {/* Add New Representative */}
            <div className="border border-zinc-700 rounded-lg p-4 space-y-4">
              <h4 className="text-white font-medium">Adicionar Representante</h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={newRep.full_name}
                    onChange={(e) => setNewRep({...newRep, full_name: e.target.value})}
                    placeholder="Nome do representante"
                    className="bg-zinc-800 border-zinc-700"
                    data-testid="input-rep-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <Input
                    value={newRep.role}
                    onChange={(e) => setNewRep({...newRep, role: e.target.value})}
                    placeholder="Ex: Gerente, Diretor"
                    className="bg-zinc-800 border-zinc-700"
                    data-testid="input-rep-role"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={newRep.date_of_birth}
                    onChange={(e) => setNewRep({...newRep, date_of_birth: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nacionalidade</Label>
                  <Input
                    value={newRep.nationality}
                    onChange={(e) => setNewRep({...newRep, nationality: e.target.value})}
                    placeholder="Portuguesa"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRep.is_ubo}
                    onChange={(e) => setNewRep({...newRep, is_ubo: e.target.checked})}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm text-gray-400">Beneficiário Efetivo (UBO)</span>
                </label>
                
                {newRep.is_ubo && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">% Participação</Label>
                    <Input
                      type="number"
                      min="25"
                      max="100"
                      value={newRep.ownership_percentage}
                      onChange={(e) => setNewRep({...newRep, ownership_percentage: e.target.value})}
                      className="w-20 bg-zinc-800 border-zinc-700"
                      placeholder="25"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleAddRepresentative}
                disabled={loading || !newRep.full_name || !newRep.role}
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                data-testid="add-representative-btn"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Plus size={18} className="mr-2" />}
                Adicionar Representante
              </Button>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft size={18} className="mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={representatives.length === 0}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-black"
              >
                Continuar
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6" data-testid="address-proof-step">
            <div className="bg-zinc-800/50 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">Comprovativo de Morada da Sede</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Fatura de serviços em nome da empresa</li>
                <li>• Extrato bancário empresarial</li>
                <li>• Documento oficial com morada da sede</li>
                <li>• Deve ter menos de 3 meses</li>
              </ul>
            </div>

            <FileUploadBox
              label="Comprovativo de Morada Empresarial"
              accept="image/*,.pdf"
              onUpload={(file) => handleFileUpload(file, 'business_address_proof')}
              uploaded={hasUploadedDoc('business_address_proof')}
              testId="upload-business-address-proof"
            />

            <FileUploadBox
              label="Registo Fiscal (opcional)"
              accept="image/*,.pdf"
              onUpload={(file) => handleFileUpload(file, 'tax_registration')}
              uploaded={hasUploadedDoc('tax_registration')}
              testId="upload-tax-registration"
            />

            <div className="flex gap-4">
              <Button 
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft size={18} className="mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleSubmitForReview}
                disabled={loading || !hasUploadedDoc('business_address_proof')}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="submit-kyb"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                Submeter KYB
                <Check size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto" data-testid="kyb-form-page">
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
        <h1 className="text-2xl font-light text-white mb-2">Verificação KYB Empresarial</h1>
        <p className="text-gray-400">Complete todos os passos para verificar a sua empresa</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div 
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                index < currentStep 
                  ? 'bg-green-600 border-green-600 text-white' 
                  : index === currentStep
                    ? 'bg-amber-600 border-amber-600 text-black'
                    : 'bg-zinc-800 border-zinc-700 text-gray-500'
              }`}
            >
              {index < currentStep ? (
                <Check size={18} />
              ) : (
                <step.icon size={18} />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`hidden md:block w-16 lg:w-24 h-0.5 ${
                index < currentStep ? 'bg-green-600' : 'bg-zinc-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels - Desktop */}
      <div className="hidden md:flex justify-between mb-8 px-2">
        {STEPS.map((step, index) => (
          <span 
            key={step.id}
            className={`text-xs ${
              index <= currentStep ? 'text-amber-400' : 'text-gray-500'
            }`}
          >
            {step.label}
          </span>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-zinc-900/50 border border-amber-900/20 rounded-xl p-6">
        {currentStep < STEPS.length && (
          <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
            {React.createElement(STEPS[currentStep].icon, { size: 20, className: 'text-amber-400' })}
            {STEPS[currentStep].label}
          </h3>
        )}
        {renderStepContent()}
      </div>
    </div>
  );
};

// File Upload Component (same as KYCForm)
const FileUploadBox = ({ label, accept, onUpload, uploaded, testId }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    await onUpload(selectedFile);
    setUploading(false);
    setSelectedFile(null);
  };

  if (uploaded) {
    return (
      <div className="border-2 border-green-500/30 bg-green-500/10 rounded-lg p-6 text-center">
        <Check className="mx-auto text-green-400 mb-2" size={32} />
        <p className="text-green-400 font-medium">{label}</p>
        <p className="text-sm text-gray-400">Documento carregado com sucesso</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          dragActive 
            ? 'border-amber-500 bg-amber-500/10' 
            : 'border-zinc-700 hover:border-amber-500/50'
        }`}
        data-testid={testId}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id={testId}
        />
        <label htmlFor={testId} className="cursor-pointer">
          <Upload className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-gray-400 mt-1">
            Arraste um ficheiro ou clique para selecionar
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Formatos: JPG, PNG, PDF (máx. 10MB)
          </p>
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <FileText className="text-amber-400" size={20} />
            <div>
              <p className="text-white text-sm">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSelectedFile(null)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-400"
            >
              <X size={16} />
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-black"
            >
              {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Carregar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYBForm;
