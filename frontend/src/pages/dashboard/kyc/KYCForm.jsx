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
  AlertCircle,
  User,
  FileText,
  Camera,
  MapPin,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KYCForm = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [kycData, setKycData] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const STEPS = [
    { id: 'personal_info', label: t('kyc.form.steps.personalInfo'), icon: User },
    { id: 'id_document', label: t('kyc.form.steps.idDocument'), icon: FileText },
    { id: 'selfie', label: t('kyc.form.steps.selfie'), icon: Camera },
    { id: 'proof_of_address', label: t('kyc.form.steps.proofAddress'), icon: MapPin },
  ];
  
  // Form data
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '',
    date_of_birth: '',
    nationality: '',
    country_of_residence: '',
    address: '',
    city: '',
    postal_code: ''
  });

  const [idDocument, setIdDocument] = useState({
    document_type: 'passport',
    document_number: '',
    document_expiry: '',
    document_country: ''
  });

  const [files, setFiles] = useState({
    id_front: null,
    id_back: null,
    selfie: null,
    proof_of_address: null
  });

  useEffect(() => {
    fetchKYCStatus();
    fetchDocuments();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kyc/status`);
      setKycData(response.data.kyc);
      
      // Pre-fill form if data exists
      if (response.data.kyc) {
        const kyc = response.data.kyc;
        setPersonalInfo({
          full_name: kyc.full_name || '',
          date_of_birth: kyc.date_of_birth || '',
          nationality: kyc.nationality || '',
          country_of_residence: kyc.country_of_residence || '',
          address: kyc.address || '',
          city: kyc.city || '',
          postal_code: kyc.postal_code || ''
        });
        
        if (kyc.id_document_type) {
          setIdDocument({
            document_type: kyc.id_document_type || 'passport',
            document_number: kyc.id_document_number || '',
            document_expiry: kyc.id_document_expiry || '',
            document_country: kyc.id_document_country || ''
          });
        }
        
        // Set current step based on KYC progress
        const stepMap = {
          'personal_info': 0,
          'id_document': 1,
          'selfie': 2,
          'proof_of_address': 3,
          'completed': 4
        };
        setCurrentStep(stepMap[kyc.current_step] || 0);
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
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

  const handlePersonalInfoSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(personalInfo).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await axios.post(`${API_URL}/api/kyc/personal-info`, formData, {
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

  const handleIdDocumentSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(idDocument).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await axios.post(`${API_URL}/api/kyc/id-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(t('kyc.form.saveInfo'));
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

      const response = await axios.post(`${API_URL}/api/kyc/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(t('kyc.form.upload.uploadSuccess'));
      fetchDocuments();
      
      // Auto advance step based on document type
      if (documentType === 'passport' || documentType === 'id_card' || documentType === 'drivers_license') {
        setCurrentStep(2);
      } else if (documentType === 'selfie_with_id') {
        setCurrentStep(3);
      }
      
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForReview = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/kyc/submit?verification_type=kyc`);
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
          <div className="space-y-6" data-testid="personal-info-step">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('kyc.form.personalInfo.fullName')} *</Label>
                <Input
                  id="full_name"
                  value={personalInfo.full_name}
                  onChange={(e) => setPersonalInfo({...personalInfo, full_name: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-full-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">{t('kyc.form.personalInfo.dateOfBirth')} *</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={personalInfo.date_of_birth}
                  onChange={(e) => setPersonalInfo({...personalInfo, date_of_birth: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-dob"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">{t('kyc.form.personalInfo.nationality')} *</Label>
                <Input
                  id="nationality"
                  value={personalInfo.nationality}
                  onChange={(e) => setPersonalInfo({...personalInfo, nationality: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-nationality"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country_of_residence">{t('kyc.form.personalInfo.countryResidence')} *</Label>
                <Input
                  id="country_of_residence"
                  value={personalInfo.country_of_residence}
                  onChange={(e) => setPersonalInfo({...personalInfo, country_of_residence: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('kyc.form.personalInfo.address')} *</Label>
              <Input
                id="address"
                value={personalInfo.address}
                onChange={(e) => setPersonalInfo({...personalInfo, address: e.target.value})}
                className="bg-zinc-800 border-zinc-700"
                data-testid="input-address"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t('kyc.form.personalInfo.city')} *</Label>
                <Input
                  id="city"
                  value={personalInfo.city}
                  onChange={(e) => setPersonalInfo({...personalInfo, city: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">{t('kyc.form.personalInfo.postalCode')} *</Label>
                <Input
                  id="postal_code"
                  value={personalInfo.postal_code}
                  onChange={(e) => setPersonalInfo({...personalInfo, postal_code: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-postal"
                />
              </div>
            </div>

            <Button 
              onClick={handlePersonalInfoSubmit}
              disabled={loading || !personalInfo.full_name || !personalInfo.date_of_birth}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black"
              data-testid="submit-personal-info"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              {t('kyc.form.continue')}
              <ChevronRight size={18} className="ml-2" />
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6" data-testid="id-document-step">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">{t('kyc.form.idDocument.documentType')} *</Label>
                <select
                  id="document_type"
                  value={idDocument.document_type}
                  onChange={(e) => setIdDocument({...idDocument, document_type: e.target.value})}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-white"
                  data-testid="select-doc-type"
                >
                  <option value="passport">{t('kyc.form.idDocument.passport')}</option>
                  <option value="id_card">{t('kyc.form.idDocument.idCard')}</option>
                  <option value="drivers_license">{t('kyc.form.idDocument.driversLicense')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="document_number">{t('kyc.form.idDocument.documentNumber')} *</Label>
                <Input
                  id="document_number"
                  value={idDocument.document_number}
                  onChange={(e) => setIdDocument({...idDocument, document_number: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-doc-number"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_expiry">{t('kyc.form.idDocument.expiryDate')} *</Label>
                <Input
                  id="document_expiry"
                  type="date"
                  value={idDocument.document_expiry}
                  onChange={(e) => setIdDocument({...idDocument, document_expiry: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-doc-expiry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document_country">{t('kyc.form.idDocument.issuingCountry')} *</Label>
                <Input
                  id="document_country"
                  value={idDocument.document_country}
                  onChange={(e) => setIdDocument({...idDocument, document_country: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                  data-testid="input-doc-country"
                />
              </div>
            </div>

            <Button 
              onClick={handleIdDocumentSubmit}
              disabled={loading || !idDocument.document_number}
              variant="outline"
              className="w-full border-zinc-700"
            >
              {t('kyc.form.saveInfo')}
            </Button>

            {/* Upload Section */}
            <div className="border-t border-zinc-700 pt-6">
              <h4 className="text-white font-medium mb-4">{t('kyc.form.idDocument.uploadDocument')}</h4>
              
              <FileUploadBox
                label={t('kyc.form.idDocument.frontDocument')}
                accept="image/*,.pdf"
                onUpload={(file) => handleFileUpload(file, idDocument.document_type)}
                uploaded={hasUploadedDoc(idDocument.document_type)}
                testId="upload-id-front"
                t={t}
              />
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setCurrentStep(0)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft size={18} className="mr-2" />
                {t('kyc.form.back')}
              </Button>
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!hasUploadedDoc(idDocument.document_type)}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-black"
              >
                {t('kyc.form.continue')}
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6" data-testid="selfie-step">
            <div className="bg-zinc-800/50 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">{t('kyc.form.selfie.title')}</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                {t('kyc.form.selfie.instructions').map((instruction, index) => (
                  <li key={index}>• {instruction}</li>
                ))}
              </ul>
            </div>

            <FileUploadBox
              label={t('kyc.form.selfie.selfieWithId')}
              accept="image/*"
              onUpload={(file) => handleFileUpload(file, 'selfie_with_id')}
              uploaded={hasUploadedDoc('selfie_with_id')}
              testId="upload-selfie"
              t={t}
            />

            <div className="flex gap-4">
              <Button 
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft size={18} className="mr-2" />
                {t('kyc.form.back')}
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={!hasUploadedDoc('selfie_with_id')}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-black"
              >
                {t('kyc.form.continue')}
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6" data-testid="address-proof-step">
            <div className="bg-zinc-800/50 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-amber-400 font-medium mb-2">{t('kyc.form.address.acceptedDocs')}</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                {t('kyc.form.address.docsList').map((doc, index) => (
                  <li key={index}>• {doc}</li>
                ))}
              </ul>
            </div>

            <FileUploadBox
              label={t('kyc.form.address.proofOfAddress')}
              accept="image/*,.pdf"
              onUpload={(file) => handleFileUpload(file, 'proof_of_address')}
              uploaded={hasUploadedDoc('proof_of_address')}
              testId="upload-address-proof"
              t={t}
            />

            <div className="flex gap-4">
              <Button 
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="flex-1 border-zinc-700"
              >
                <ChevronLeft size={18} className="mr-2" />
                {t('kyc.form.back')}
              </Button>
              <Button 
                onClick={handleSubmitForReview}
                disabled={loading || !hasUploadedDoc('proof_of_address')}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="submit-kyc"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                {t('kyc.form.submit')}
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
    <div className="max-w-2xl mx-auto" data-testid="kyc-form-page">
      {/* Header */}
      <div className="mb-8">
        <Button 
          onClick={() => navigate('/dashboard/kyc')}
          variant="ghost"
          className="text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeft size={18} className="mr-2" />
          {t('kyc.form.back')}
        </Button>
        <h1 className="text-2xl font-light text-white mb-2">{t('kyc.form.title')}</h1>
        <p className="text-gray-400">{t('kyc.form.subtitle')}</p>
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
        <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          {React.createElement(STEPS[currentStep].icon, { size: 20, className: 'text-amber-400' })}
          {STEPS[currentStep].label}
        </h3>
        {renderStepContent()}
      </div>
    </div>
  );
};

// File Upload Component
const FileUploadBox = ({ label, accept, onUpload, uploaded, testId, t }) => {
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
        <p className="text-sm text-gray-400">{t ? t('kyc.form.upload.uploadSuccess') : 'Uploaded'}</p>
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
            {t ? t('kyc.form.upload.dragDrop') : 'Drag a file or click to select'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {t ? t('kyc.form.upload.formats') : 'Formats: JPG, PNG, PDF (max. 10MB)'}
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
              {uploading ? <Loader2 className="animate-spin" size={16} /> : (t ? t('kyc.form.upload.upload') : 'Upload')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCForm;
