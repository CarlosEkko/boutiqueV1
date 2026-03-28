import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  User, Mail, Phone, Globe, Edit2, Save, X, Shield, Calendar,
  CreditCard, Bitcoin, ArrowUpCircle, ArrowDownCircle, 
  FileText, MapPin, Hash, Copy, RefreshCw
} from 'lucide-react';

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
  const { user, loading, isAuthenticated, updateProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        country: user.country || '',
        date_of_birth: user.date_of_birth || '',
        address: user.address || ''
      });

      // Set limits based on membership
      if (user.membership_level === 'premium') {
        setAccountLimits({
          fiat_deposit_daily: 100000,
          fiat_deposit_monthly: 1000000,
          fiat_withdrawal_daily: 50000,
          fiat_withdrawal_monthly: 500000,
          crypto_deposit_daily: 'Ilimitado',
          crypto_withdrawal_daily: 250000,
          crypto_withdrawal_monthly: 2500000
        });
      } else if (user.membership_level === 'vip' || user.membership_level === 'elite') {
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
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value) => {
    setFormData(prev => ({ ...prev, country: value }));
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
      name: user?.name || '',
      phone: user?.phone || '',
      country: user?.country || '',
      date_of_birth: user?.date_of_birth || '',
      address: user?.address || ''
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
    if (!user?.id) return '-';
    return `KB-${user.id.slice(0, 8).toUpperCase()}`;
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
              {getInitials(user.name)}
            </div>
            
            <div className="text-center md:text-left flex-1">
              <h2 className="text-xl font-medium text-white">{user.name}</h2>
              <p className="text-gray-400">{user.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                <Badge className={`${user.kyc_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'} border-0`}>
                  <Shield size={12} className="mr-1" />
                  {user.kyc_status === 'approved' ? t('profile.myProfile.kycVerified') : t('profile.myProfile.kycPending')}
                </Badge>
                <Badge className="bg-gold-500/20 text-gold-400 border-0">
                  {user.membership_level === 'vip' || user.membership_level === 'elite' ? 'Elite' :
                   user.membership_level === 'premium' ? 'Premium' : 'Standard'}
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-0">
                  {user.region === 'europe' ? 'Europa' :
                   user.region === 'mena' ? 'MENA' :
                   user.region === 'latam' ? 'LATAM' : 'Global'}
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
              <Button onClick={() => setEditing(true)} size="sm" variant="outline" className="border-zinc-700">
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
                  <p className="text-white">{getCountryName(user.country) || '-'}</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><User size={12} /> {t('profile.myProfile.legalName')}</p>
              {editing ? (
                <Input name="name" value={formData.name} onChange={handleChange} className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{user.name}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> {t('profile.myProfile.dateOfBirth')}</p>
              {editing ? (
                <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{user.date_of_birth || '-'}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><FileText size={12} /> {t('profile.myProfile.documents')}</p>
              <p className="text-white">{user.kyc_status === 'approved' ? t('profile.myProfile.verified') : t('profile.myProfile.kycPending')}</p>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {t('profile.myProfile.address')}</p>
              {editing ? (
                <Input name="address" value={formData.address} onChange={handleChange} placeholder={t('profile.myProfile.address')} className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{user.address || '-'}</p>
              )}
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12} /> Email</p>
              <p className="text-white">{user.email}</p>
            </div>

            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12} /> Telefone</p>
              {editing ? (
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+351 900 000 000" className="h-8 bg-zinc-700 border-zinc-600 text-white mt-1" />
              ) : (
                <p className="text-white">{user.phone || '-'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
