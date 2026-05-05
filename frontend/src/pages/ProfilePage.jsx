import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { useLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  User, Mail, Phone, Globe, Edit2, Save, X, Shield, Calendar,
  CreditCard, Bitcoin, ArrowUpCircle, ArrowDownCircle, 
  FileText, MapPin, Hash, Copy, RefreshCw, Monitor,
  Building2, ChevronRight, Plus, Briefcase, Check
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Lazy import DemoToggle
const DemoToggle = React.lazy(() => import('../components/dashboard/DemoToggle'));
const BillingSection = React.lazy(() => import('../components/billing/BillingSection'));

const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brasil' },
  { code: 'ES', name: 'España' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italia' },
  { code: 'CH', name: 'Schweiz / Suisse' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' }
];

const ProfilePage = () => {
  const { user, loading, isAuthenticated, updateProfile, token } = useAuth();
  const { demoMode } = useDemo();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [demoProfile, setDemoProfile] = useState(null);
  const [businessAccounts, setBusinessAccounts] = useState([]);
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    company_name: '', registration_number: '', tax_id: '', 
    company_type: 'llc', incorporation_country: ''
  });
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    country: '',
    date_of_birth: '',
    address: ''
  });

  // Account limits
  const [accountLimits, setAccountLimits] = useState({
    fiat_deposit_daily: 50000,
    fiat_deposit_monthly: 500000,
    fiat_withdrawal_daily: 25000,
    fiat_withdrawal_monthly: 250000,
    crypto_deposit_daily: 'Ilimitado',
    crypto_withdrawal_daily: 100000,
    crypto_withdrawal_monthly: 1000000
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  // Fetch demo profile when demo mode is active
  useEffect(() => {
    if (demoMode && token) {
      axios.get(`${API_URL}/api/demo/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setDemoProfile(res.data)).catch(() => {});
    } else {
      setDemoProfile(null);
    }
  }, [demoMode, token]);

  // Use demo profile or real user
  const displayUser = demoMode && demoProfile ? demoProfile : user;

  useEffect(() => {
    if (displayUser) {
      setFormData({
        name: displayUser.name || '',
        phone: displayUser.phone || '',
        country: displayUser.country || '',
        date_of_birth: displayUser.date_of_birth || '',
        address: displayUser.address || ''
      });

      // Set limits based on membership
      if (displayUser.membership_level === 'premium') {
        setAccountLimits({
          fiat_deposit_daily: 100000,
          fiat_deposit_monthly: 1000000,
          fiat_withdrawal_daily: 50000,
          fiat_withdrawal_monthly: 500000,
          crypto_deposit_daily: 'Ilimitado',
          crypto_withdrawal_daily: 250000,
          crypto_withdrawal_monthly: 2500000
        });
      } else if (displayUser.membership_level === 'vip' || displayUser.membership_level === 'elite') {
        setAccountLimits({
          fiat_deposit_daily: 'Ilimitado',
          fiat_deposit_monthly: 'Ilimitado',
          fiat_withdrawal_daily: 'Ilimitado',
          fiat_withdrawal_monthly: 'Ilimitado',
          crypto_deposit_daily: 'Ilimitado',
          crypto_withdrawal_daily: 'Ilimitado',
          crypto_withdrawal_monthly: 'Ilimitado'
        });
      }
    }
  }, [displayUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value) => {
    setFormData(prev => ({ ...prev, country: value }));
  };

  // Business Accounts
  const fetchBusinessAccounts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/business-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBusinessAccounts(res.data.accounts || []);
    } catch {}
  };

  useEffect(() => {
    if (token) fetchBusinessAccounts();
  }, [token]);

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!businessForm.company_name) return;
    setCreatingBusiness(true);
    try {
      await axios.post(`${API_URL}/api/business-accounts`, businessForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('profile.business.created', 'Conta empresarial criada com sucesso'));
      setShowCreateBusiness(false);
      setBusinessForm({ company_name: '', registration_number: '', tax_id: '', company_type: 'llc', incorporation_country: '' });
      fetchBusinessAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar conta');
    } finally {
      setCreatingBusiness(false);
    }
  };

  const startKYB = (accountId) => {
    navigate(`/dashboard/kyc/kyb?business_id=${accountId}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(formData);
      toast.success('Perfil atualizado com sucesso!');
      setEditing(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: displayUser?.name || '',
      phone: displayUser?.phone || '',
      country: displayUser?.country || '',
      date_of_birth: displayUser?.date_of_birth || '',
      address: displayUser?.address || ''
    });
    setEditing(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCountryName = (code) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  const formatLimit = (limit) => {
    if (limit === 'Ilimitado') return limit;
    return `€${limit.toLocaleString('pt-PT')}`;
  };

  const getClientNumber = () => {
    if (!displayUser?.id) return '-';
    return `KB-${displayUser.id.slice(0, 8).toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gold-400 text-lg">{t('admin.common.loading')}</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('profile.myProfile.title')}</h1>
          <p className="text-gray-400">{t('profile.myProfile.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} className="mr-2" />
          {t('profile.myProfile.refresh')}
        </Button>
      </div>

      {/* Profile Summary Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center text-white text-2xl font-medium">
              {getInitials(displayUser.name)}
            </div>
            
            <div className="text-center md:text-left flex-1">
              <h2 className="text-xl font-medium text-white">{displayUser.name}</h2>
              <p className="text-gray-400">{displayUser.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <Badge className={`${displayUser.kyc_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'} border-0`}>
                  <Shield size={12} className="mr-1" />
                  {displayUser.kyc_status === 'approved' ? t('profile.myProfile.kycVerified') : t('profile.myProfile.kycPending')}
                </Badge>
                <Badge className="bg-gold-500/20 text-gold-400 border-0">
                  {displayUser.membership_level === 'vip' || displayUser.membership_level === 'elite' ? 'Elite' :
                   displayUser.membership_level === 'premium' ? 'Premium' : 'Standard'}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-0">
                  {displayUser.region === 'europe' ? 'Europa' :
                   displayUser.region === 'mena' ? 'MENA' :
                   displayUser.region === 'latam' ? 'LATAM' : 'Global'}
                </Badge>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-gray-400">{t('profile.myProfile.clientNumber')}</p>
              <div className="flex items-center gap-2 justify-center md:justify-end">
                <p className="text-lg font-mono text-gold-400">{getClientNumber()}</p>
                <button onClick={() => copyToClipboard(getClientNumber())} className="text-gray-400 hover:text-gold-400">
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Limits */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="text-gold-400" size={20} />
              {t('profile.myProfile.accountLimits')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Fiat Deposit */}
            <div>
              <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <ArrowDownCircle size={14} /> {t('profile.myProfile.fiatDepositLimits')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('profile.myProfile.daily')}</p>
                  <p className="text-white font-medium">{formatLimit(accountLimits.fiat_deposit_daily)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('profile.myProfile.monthly')}</p>
                  <p className="text-white font-medium">{formatLimit(accountLimits.fiat_deposit_monthly)}</p>
                </div>
              </div>
            </div>

            {/* Fiat Withdrawal */}
            <div>
              <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <ArrowUpCircle size={14} /> {t('profile.myProfile.fiatWithdrawalLimits')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('profile.myProfile.daily')}</p>
                  <p className="text-white font-medium">{formatLimit(accountLimits.fiat_withdrawal_daily)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('profile.myProfile.monthly')}</p>
                  <p className="text-white font-medium">{formatLimit(accountLimits.fiat_withdrawal_monthly)}</p>
                </div>
              </div>
            </div>

            {/* Crypto Limits */}
            <div>
              <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Bitcoin size={14} /> {t('profile.myProfile.cryptoDepositLimits')}
              </h4>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-gray-500">{t('profile.myProfile.daily')}</p>
                <p className="text-emerald-400 font-medium">{formatLimit(accountLimits.crypto_deposit_daily)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                <Bitcoin size={14} /> {t('profile.myProfile.cryptoWithdrawalLimits')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('profile.myProfile.daily')}</p>
                  <p className="text-white font-medium">{formatLimit(accountLimits.crypto_withdrawal_daily)}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('profile.myProfile.monthly')}</p>
                  <p className="text-white font-medium">{formatLimit(accountLimits.crypto_withdrawal_monthly)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <User className="text-gold-400" size={20} />
              {t('profile.myProfile.personalInfo')}
            </CardTitle>
            {!editing ? (
              <Button onClick={() => !demoMode && setEditing(true)} size="sm" variant="outline" className={`border-zinc-700 ${demoMode ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={demoMode}>
                <Edit2 size={14} className="mr-1" /> {t('profile.myProfile.editProfile')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancel} size="sm" variant="outline" className="border-zinc-700">
                  <X size={14} className="mr-1" /> {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} size="sm" className="bg-emerald-500 hover:bg-emerald-600" disabled={saving}>
                  <Save size={14} className="mr-1" /> {saving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Hash size={12} /> {t('profile.myProfile.clientNumber')}</p>
                <p className="text-white font-mono">{getClientNumber()}</p>
              </div>
              <div className="p-3 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Globe size={12} /> {t('profile.myProfile.country')}</p>
                {editing ? (
                  <Select value={formData.country} onValueChange={handleCountryChange}>
                    <SelectTrigger className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code} className="text-white">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-white">{getCountryName(displayUser.country) || '-'}</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><User size={12} /> {t('profile.myProfile.legalName')}</p>
              {editing ? (
                <Input name="name" value={formData.name} onChange={handleChange} className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{displayUser.name}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> {t('profile.myProfile.dateOfBirth')}</p>
              {editing ? (
                <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{displayUser.date_of_birth || '-'}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><FileText size={12} /> {t('profile.myProfile.documents')}</p>
              <p className="text-white">{displayUser.kyc_status === 'approved' ? t('profile.myProfile.verified') : t('profile.myProfile.kycPending')}</p>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {t('profile.myProfile.address')}</p>
              {editing ? (
                <Input name="address" value={formData.address} onChange={handleChange} placeholder={t('profile.myProfile.address')} className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{displayUser.address || '-'}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12} /> Email</p>
              <p className="text-white">{displayUser.email}</p>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12} /> Telefone</p>
              {editing ? (
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+351 900 000 000" className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{displayUser.phone || '-'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Demo Mode Section */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Monitor size={16} className="text-amber-400" /> {t('demoMode.title', 'Modo Demo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">{t('demoMode.description', 'Ativar dados simulados para demonstração')}</p>
            <React.Suspense fallback={null}>
              <DemoToggle />
            </React.Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Business Accounts Section */}
      <React.Suspense fallback={null}>
        <BillingSection />
      </React.Suspense>

      <Card className="bg-zinc-900/50 border-gold-800/20 mt-6" data-testid="business-accounts-section">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="text-gold-400" size={20} />
            {t('business.title', 'Contas Empresariais')}
          </CardTitle>
          {!showCreateBusiness && (
            <Button onClick={() => setShowCreateBusiness(true)} size="sm" className="bg-gold-500 hover:bg-gold-400 text-black" data-testid="add-business-btn">
              <Plus size={14} className="mr-1" /> {t('business.addAccount', 'Abrir Conta Business')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-400 text-sm">
            {t('business.description', 'Abra uma conta empresarial para operar em nome da sua empresa. Cada conta tem carteiras e limites independentes.')}
          </p>

          {/* Create Form */}
          {showCreateBusiness && (
            <form onSubmit={handleCreateBusiness} className="bg-zinc-800/50 rounded-xl p-5 space-y-4 border border-gold-500/20" data-testid="create-business-form">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Briefcase size={16} className="text-gold-400" />
                {t('profile.business.newAccount', 'Nova Conta Empresarial')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">{t('profile.business.companyName', 'Nome da Empresa')} *</Label>
                  <Input value={businessForm.company_name} onChange={e => setBusinessForm({...businessForm, company_name: e.target.value})}
                    placeholder="Ex: EKKO Technologies, S.A." className="bg-zinc-700 border-zinc-600 text-white mt-1" required data-testid="business-company-name" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">{t('profile.business.registrationNumber', 'NIPC / Registo Comercial')}</Label>
                  <Input value={businessForm.registration_number} onChange={e => setBusinessForm({...businessForm, registration_number: e.target.value})}
                    placeholder="PT 516 123 456" className="bg-zinc-700 border-zinc-600 text-white mt-1" data-testid="business-reg-number" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">{t('profile.business.taxId', 'NIF Fiscal')}</Label>
                  <Input value={businessForm.tax_id} onChange={e => setBusinessForm({...businessForm, tax_id: e.target.value})}
                    placeholder="516123456" className="bg-zinc-700 border-zinc-600 text-white mt-1" data-testid="business-tax-id" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">{t('profile.business.country', 'País de Incorporação')}</Label>
                  <Select value={businessForm.incorporation_country} onValueChange={v => setBusinessForm({...businessForm, incorporation_country: v})}>
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white mt-1" data-testid="business-country">
                      <SelectValue placeholder={t('common.select', 'Selecionar')} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code} className="text-white">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">{t('profile.business.companyType', 'Tipo de Sociedade')}</Label>
                  <Select value={businessForm.company_type} onValueChange={v => setBusinessForm({...businessForm, company_type: v})}>
                    <SelectTrigger className="bg-zinc-700 border-zinc-600 text-white mt-1" data-testid="business-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="llc" className="text-white">LLC / Lda.</SelectItem>
                      <SelectItem value="sa" className="text-white">S.A.</SelectItem>
                      <SelectItem value="partnership" className="text-white">Partnership</SelectItem>
                      <SelectItem value="sole_proprietor" className="text-white">Empresário Individual</SelectItem>
                      <SelectItem value="trust" className="text-white">Trust</SelectItem>
                      <SelectItem value="fund" className="text-white">Fund</SelectItem>
                      <SelectItem value="other" className="text-white">{t('common.other', 'Outro')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateBusiness(false)} className="border-zinc-700">
                  {t('common.cancel', 'Cancelar')}
                </Button>
                <Button type="submit" className="bg-gold-500 hover:bg-gold-400 text-black" disabled={creatingBusiness} data-testid="submit-business">
                  {creatingBusiness ? '...' : t('profile.business.create', 'Criar Conta Empresarial')}
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </form>
          )}

          {/* Existing Business Accounts */}
          {businessAccounts.length > 0 ? (
            <div className="space-y-3">
              {businessAccounts.map(account => (
                <div key={account.id} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 hover:border-gold-500/30 transition-colors" data-testid={`business-account-${account.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
                        <Building2 size={20} className="text-gold-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{account.company_name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {account.registration_number && (
                            <span className="text-gray-500 text-xs font-mono">{account.registration_number}</span>
                          )}
                          {account.incorporation_country && (
                            <Badge className="bg-zinc-700 text-gray-300 text-[10px] px-1.5 py-0 border-0">{account.incorporation_country}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`border-0 text-xs ${
                        account.kyb_status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        account.kyb_status === 'pending_review' ? 'bg-gold-400/20 text-gold-400' :
                        account.kyb_status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {account.kyb_status === 'approved' && <Check size={12} className="mr-1" />}
                        {account.kyb_status === 'approved' ? t('kyc.status.approved', 'Verificado') :
                         account.kyb_status === 'pending_review' ? t('kyc.status.pendingReview', 'Em Análise') :
                         account.kyb_status === 'in_progress' ? t('kyc.status.inProgress', 'Em Curso') :
                         t('kyc.status.notStarted', 'KYB Pendente')}
                      </Badge>
                      {account.kyb_status !== 'approved' && (
                        <Button size="sm" onClick={() => startKYB(account.id)} className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30" data-testid={`start-kyb-${account.id}`}>
                          {account.kyb_status === 'not_started' ? t('profile.business.startKYB', 'Iniciar KYB') : t('profile.business.continueKYB', 'Continuar')}
                          <ChevronRight size={14} className="ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !showCreateBusiness && (
            <div className="text-center py-6 bg-zinc-800/30 rounded-xl border border-dashed border-zinc-700">
              <Building2 className="mx-auto text-gray-600 mb-3" size={36} />
              <p className="text-gray-500 text-sm">{t('business.noAccounts', 'Ainda não tem contas empresariais')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
