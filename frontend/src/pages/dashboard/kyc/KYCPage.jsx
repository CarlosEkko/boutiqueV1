import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  User, 
  Building2, 
  CheckCircle, 
  Clock, 
  XCircle,
  ArrowRight,
  Shield,
  FileText,
  Camera,
  Video,
  Home
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const KYCPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  };

  const startVerification = async (type) => {
    try {
      await axios.post(`${API_URL}/api/kyc/start?verification_type=${type}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(type === 'kyc' ? '/dashboard/kyc/individual' : '/dashboard/kyc/business');
    } catch (err) {
      console.error('Failed to start verification');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-900/30 text-green-400"><CheckCircle size={14} className="mr-1" />Approved</Badge>;
      case 'pending_review':
        return <Badge className="bg-amber-900/30 text-amber-400"><Clock size={14} className="mr-1" />Pending Review</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-900/30 text-blue-400"><Clock size={14} className="mr-1" />In Progress</Badge>;
      case 'rejected':
        return <Badge className="bg-red-900/30 text-red-400"><XCircle size={14} className="mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-900/30 text-gray-400">Not Started</Badge>;
    }
  };

  const kycSteps = [
    { icon: User, label: 'Personal Info', description: 'Your basic information' },
    { icon: FileText, label: 'ID Document', description: 'Passport, ID Card, or License' },
    { icon: Camera, label: 'Selfie', description: 'Photo holding your ID' },
    { icon: Video, label: 'Liveness', description: 'Short video verification' },
    { icon: Home, label: 'Address Proof', description: 'Utility bill or bank statement' },
  ];

  const kybSteps = [
    { icon: Building2, label: 'Company Info', description: 'Registration details' },
    { icon: FileText, label: 'Company Docs', description: 'Certificate, Articles' },
    { icon: User, label: 'Representatives', description: 'Directors & UBOs' },
    { icon: Home, label: 'Address Proof', description: 'Business address proof' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-amber-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">Identity Verification</h1>
        <p className="text-gray-400 mt-1">Complete KYC/KYB to unlock all platform features</p>
      </div>

      {/* Current Status */}
      <Card className="bg-gradient-to-r from-amber-900/20 to-amber-600/10 border-amber-600/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-600/20 flex items-center justify-center">
              <Shield className="text-amber-400" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl text-white">Verification Status</h3>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <span className="text-gray-400 text-sm">KYC (Individual): </span>
                  {getStatusBadge(status?.kyc_status)}
                </div>
                <div>
                  <span className="text-gray-400 text-sm">KYB (Business): </span>
                  {getStatusBadge(status?.kyb_status)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KYC - Individual */}
        <Card className="bg-zinc-900/50 border-amber-900/20 hover:border-amber-600/50 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <User className="text-blue-400" size={24} />
                </div>
                <div>
                  <CardTitle className="text-white">KYC - Individual</CardTitle>
                  <CardDescription className="text-gray-400">Personal identity verification</CardDescription>
                </div>
              </div>
              {getStatusBadge(status?.kyc_status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Steps */}
            <div className="space-y-3">
              {kycSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <step.icon className="text-amber-400" size={16} />
                  </div>
                  <div>
                    <p className="text-white">{step.label}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Button */}
            {status?.kyc_status === 'approved' ? (
              <Button disabled className="w-full bg-green-600/20 text-green-400">
                <CheckCircle size={18} className="mr-2" />
                Verified
              </Button>
            ) : status?.kyc_status === 'pending_review' ? (
              <Button disabled className="w-full bg-amber-600/20 text-amber-400">
                <Clock size={18} className="mr-2" />
                Under Review
              </Button>
            ) : status?.has_kyc ? (
              <Button 
                onClick={() => navigate('/dashboard/kyc/individual')}
                className="w-full bg-amber-600 hover:bg-amber-500"
              >
                Continue Verification
                <ArrowRight size={18} className="ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => startVerification('kyc')}
                className="w-full bg-amber-600 hover:bg-amber-500"
              >
                Start KYC
                <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* KYB - Business */}
        <Card className="bg-zinc-900/50 border-amber-900/20 hover:border-amber-600/50 transition-all">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-600/20 flex items-center justify-center">
                  <Building2 className="text-purple-400" size={24} />
                </div>
                <div>
                  <CardTitle className="text-white">KYB - Business</CardTitle>
                  <CardDescription className="text-gray-400">Company verification</CardDescription>
                </div>
              </div>
              {getStatusBadge(status?.kyb_status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Steps */}
            <div className="space-y-3">
              {kybSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <step.icon className="text-purple-400" size={16} />
                  </div>
                  <div>
                    <p className="text-white">{step.label}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Button */}
            {status?.kyb_status === 'approved' ? (
              <Button disabled className="w-full bg-green-600/20 text-green-400">
                <CheckCircle size={18} className="mr-2" />
                Verified
              </Button>
            ) : status?.kyb_status === 'pending_review' ? (
              <Button disabled className="w-full bg-amber-600/20 text-amber-400">
                <Clock size={18} className="mr-2" />
                Under Review
              </Button>
            ) : status?.has_kyb ? (
              <Button 
                onClick={() => navigate('/dashboard/kyc/business')}
                className="w-full bg-purple-600 hover:bg-purple-500"
              >
                Continue Verification
                <ArrowRight size={18} className="ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => startVerification('kyb')}
                className="w-full bg-purple-600 hover:bg-purple-500"
              >
                Start KYB
                <ArrowRight size={18} className="ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="bg-zinc-900/30 border-zinc-800">
        <CardContent className="p-6">
          <h3 className="text-white font-medium mb-3">Why verification is required?</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-400 mt-0.5" />
              <span>Comply with international AML/KYC regulations</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-400 mt-0.5" />
              <span>Protect your account and assets</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-400 mt-0.5" />
              <span>Unlock higher transaction limits</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-400 mt-0.5" />
              <span>Access exclusive investment opportunities</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCPage;
