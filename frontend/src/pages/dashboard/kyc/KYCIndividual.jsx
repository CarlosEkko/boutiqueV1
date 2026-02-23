import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { 
  User, 
  FileText, 
  Camera, 
  Video, 
  Home,
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { id: 'personal_info', label: 'Personal Info', icon: User },
  { id: 'id_document', label: 'ID Document', icon: FileText },
  { id: 'selfie', label: 'Selfie', icon: Camera },
  { id: 'liveness', label: 'Liveness', icon: Video },
  { id: 'proof_of_address', label: 'Address Proof', icon: Home },
];

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'National ID Card' },
  { value: 'drivers_license', label: "Driver's License" },
];

const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brazil' },
  { code: 'ES', name: 'Spain' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'CH', name: 'Switzerland' },
];

const KYCIndividual = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [kycData, setKycData] = useState(null);
  const [documents, setDocuments] = useState([]);
  
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

  useEffect(() => {
    fetchKYCData();
  }, [token]);

  const fetchKYCData = async () => {
    try {
      const [statusRes, docsRes] = await Promise.all([
        axios.get(`${API_URL}/api/kyc/status`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/kyc/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setKycData(statusRes.data.kyc);
      setDocuments(docsRes.data);
      
      // Set current step based on KYC data
      if (statusRes.data.kyc) {
        const stepIndex = STEPS.findIndex(s => s.id === statusRes.data.kyc.current_step);
        if (stepIndex >= 0) setCurrentStep(stepIndex);
        
        // Pre-fill form data
        if (statusRes.data.kyc.full_name) {
          setPersonalInfo({
            full_name: statusRes.data.kyc.full_name || '',
            date_of_birth: statusRes.data.kyc.date_of_birth || '',
            nationality: statusRes.data.kyc.nationality || '',
            country_of_residence: statusRes.data.kyc.country_of_residence || '',
            address: statusRes.data.kyc.address || '',
            city: statusRes.data.kyc.city || '',
            postal_code: statusRes.data.kyc.postal_code || ''
          });
        }
      }
    } catch (err) {
      toast.error('Failed to load KYC data');
    }
  };

  const submitPersonalInfo = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(personalInfo).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      await axios.post(`${API_URL}/api/kyc/personal-info`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Personal info saved');
      setCurrentStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save info');
    } finally {
      setLoading(false);
    }
  };

  const submitIdDocument = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(idDocument).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      await axios.post(`${API_URL}/api/kyc/id-document`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('ID info saved. Now upload your document.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save ID info');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file, documentType) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      
      const response = await axios.post(`${API_URL}/api/kyc/upload-document`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Document uploaded successfully');
      fetchKYCData(); // Refresh data
      
      // Move to next step
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      uploadDocument(file, documentType);
    }
  };

  const submitForReview = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/kyc/submit?verification_type=kyc`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('KYC submitted for review!');
      navigate('/dashboard/kyc');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const getUploadedDoc = (type) => {
    return documents.find(d => d.document_type === type);
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'personal_info':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Full Name (as in ID)</Label>
                <Input
                  value={personalInfo.full_name}
                  onChange={(e) => setPersonalInfo({...personalInfo, full_name: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">Date of Birth</Label>
                <Input
                  type="date"
                  value={personalInfo.date_of_birth}
                  onChange={(e) => setPersonalInfo({...personalInfo, date_of_birth: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">Nationality</Label>
                <select
                  value={personalInfo.nationality}
                  onChange={(e) => setPersonalInfo({...personalInfo, nationality: e.target.value})}
                  className="w-full h-10 px-3 bg-zinc-800 border border-amber-900/30 text-white rounded-md mt-1"
                  required
                >
                  <option value="">Select...</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Country of Residence</Label>
                <select
                  value={personalInfo.country_of_residence}
                  onChange={(e) => setPersonalInfo({...personalInfo, country_of_residence: e.target.value})}
                  className="w-full h-10 px-3 bg-zinc-800 border border-amber-900/30 text-white rounded-md mt-1"
                  required
                >
                  <option value="">Select...</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-300">Address</Label>
                <Input
                  value={personalInfo.address}
                  onChange={(e) => setPersonalInfo({...personalInfo, address: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">City</Label>
                <Input
                  value={personalInfo.city}
                  onChange={(e) => setPersonalInfo({...personalInfo, city: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">Postal Code</Label>
                <Input
                  value={personalInfo.postal_code}
                  onChange={(e) => setPersonalInfo({...personalInfo, postal_code: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                  required
                />
              </div>
            </div>
            <Button 
              onClick={submitPersonalInfo} 
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Save & Continue
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        );

      case 'id_document':
        const idDoc = getUploadedDoc(idDocument.document_type);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Document Type</Label>
                <select
                  value={idDocument.document_type}
                  onChange={(e) => setIdDocument({...idDocument, document_type: e.target.value})}
                  className="w-full h-10 px-3 bg-zinc-800 border border-amber-900/30 text-white rounded-md mt-1"
                >
                  {DOCUMENT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Document Number</Label>
                <Input
                  value={idDocument.document_number}
                  onChange={(e) => setIdDocument({...idDocument, document_number: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Expiry Date</Label>
                <Input
                  type="date"
                  value={idDocument.document_expiry}
                  onChange={(e) => setIdDocument({...idDocument, document_expiry: e.target.value})}
                  className="bg-zinc-800 border-amber-900/30 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Issuing Country</Label>
                <select
                  value={idDocument.document_country}
                  onChange={(e) => setIdDocument({...idDocument, document_country: e.target.value})}
                  className="w-full h-10 px-3 bg-zinc-800 border border-amber-900/30 text-white rounded-md mt-1"
                >
                  <option value="">Select...</option>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            <Button onClick={submitIdDocument} disabled={loading} variant="outline" className="w-full border-amber-900/30 text-amber-400">
              Save Document Info
            </Button>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-amber-900/30 rounded-lg p-8 text-center">
              {idDoc ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="text-green-400" size={24} />
                  <span className="text-white">{idDoc.file_name}</span>
                  <Badge className="bg-green-900/30 text-green-400">Uploaded</Badge>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto text-gray-500 mb-4" size={40} />
                  <p className="text-gray-400 mb-4">Upload a clear photo of your {DOCUMENT_TYPES.find(d => d.value === idDocument.document_type)?.label}</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e, idDocument.document_type)}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload size={18} className="mr-2" />}
                    Select File
                  </Button>
                </>
              )}
            </div>

            {idDoc && (
              <Button 
                onClick={() => setCurrentStep(2)}
                className="w-full bg-amber-600 hover:bg-amber-500"
              >
                Continue
                <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        );

      case 'selfie':
        const selfieDoc = getUploadedDoc('selfie_with_id');
        return (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Instructions</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Hold your ID document next to your face</li>
                <li>• Make sure your face and ID are clearly visible</li>
                <li>• Good lighting, no shadows on your face</li>
                <li>• Look directly at the camera</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-amber-900/30 rounded-lg p-8 text-center">
              {selfieDoc ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="text-green-400" size={24} />
                  <span className="text-white">{selfieDoc.file_name}</span>
                  <Badge className="bg-green-900/30 text-green-400">Uploaded</Badge>
                </div>
              ) : (
                <>
                  <Camera className="mx-auto text-gray-500 mb-4" size={40} />
                  <p className="text-gray-400 mb-4">Upload a selfie holding your ID document</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'selfie_with_id')}
                    className="hidden"
                    id="selfie-input"
                  />
                  <Button 
                    onClick={() => document.getElementById('selfie-input')?.click()}
                    disabled={uploading}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Camera size={18} className="mr-2" />}
                    Take/Upload Selfie
                  </Button>
                </>
              )}
            </div>

            {selfieDoc && (
              <Button 
                onClick={() => setCurrentStep(3)}
                className="w-full bg-amber-600 hover:bg-amber-500"
              >
                Continue
                <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        );

      case 'liveness':
        const livenessDoc = getUploadedDoc('liveness_video');
        return (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Video Verification</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Record a short video (5-10 seconds)</li>
                <li>• Look at the camera and turn your head slowly left and right</li>
                <li>• Ensure good lighting</li>
                <li>• No filters or editing</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-amber-900/30 rounded-lg p-8 text-center">
              {livenessDoc ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="text-green-400" size={24} />
                  <span className="text-white">{livenessDoc.file_name}</span>
                  <Badge className="bg-green-900/30 text-green-400">Uploaded</Badge>
                </div>
              ) : (
                <>
                  <Video className="mx-auto text-gray-500 mb-4" size={40} />
                  <p className="text-gray-400 mb-4">Upload a short liveness video</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileSelect(e, 'liveness_video')}
                    className="hidden"
                    id="liveness-input"
                  />
                  <Button 
                    onClick={() => document.getElementById('liveness-input')?.click()}
                    disabled={uploading}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Video size={18} className="mr-2" />}
                    Upload Video
                  </Button>
                </>
              )}
            </div>

            {livenessDoc && (
              <Button 
                onClick={() => setCurrentStep(4)}
                className="w-full bg-amber-600 hover:bg-amber-500"
              >
                Continue
                <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </div>
        );

      case 'proof_of_address':
        const addressDoc = getUploadedDoc('proof_of_address');
        return (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">Acceptable Documents</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Utility bill (electricity, water, gas) - last 3 months</li>
                <li>• Bank statement - last 3 months</li>
                <li>• Tax document</li>
                <li>• Government-issued document with address</li>
              </ul>
            </div>

            <div className="border-2 border-dashed border-amber-900/30 rounded-lg p-8 text-center">
              {addressDoc ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="text-green-400" size={24} />
                  <span className="text-white">{addressDoc.file_name}</span>
                  <Badge className="bg-green-900/30 text-green-400">Uploaded</Badge>
                </div>
              ) : (
                <>
                  <Home className="mx-auto text-gray-500 mb-4" size={40} />
                  <p className="text-gray-400 mb-4">Upload proof of address</p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e, 'proof_of_address')}
                    className="hidden"
                    id="address-input"
                  />
                  <Button 
                    onClick={() => document.getElementById('address-input')?.click()}
                    disabled={uploading}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    {uploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Upload size={18} className="mr-2" />}
                    Upload Document
                  </Button>
                </>
              )}
            </div>

            {addressDoc && (
              <Button 
                onClick={submitForReview}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500"
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <CheckCircle size={18} className="mr-2" />}
                Submit for Review
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-white">KYC Verification</h1>
          <p className="text-gray-400 mt-1">Complete all steps to verify your identity</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard/kyc')}
          className="border-amber-900/30 text-gray-400"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div 
              key={step.id} 
              className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted ? 'bg-green-600' :
                  isCurrent ? 'bg-amber-600' :
                  'bg-zinc-800'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="text-white" size={20} />
                  ) : (
                    <step.icon className={isCurrent ? 'text-white' : 'text-gray-500'} size={20} />
                  )}
                </div>
                <span className={`text-xs mt-2 hidden md:block ${
                  isCurrent ? 'text-amber-400' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-600' : 'bg-zinc-800'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="bg-zinc-900/50 border-amber-900/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            {React.createElement(STEPS[currentStep].icon, { size: 24, className: 'text-amber-400' })}
            {STEPS[currentStep].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCIndividual;
