import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  User, Mail, Phone, Globe, LogOut, ArrowLeft, Edit2, Save, X, Shield, Calendar,
  CreditCard, Bitcoin, ArrowUpCircle, ArrowDownCircle, 
  Lock, Key, Smartphone, MessageSquare, AlertTriangle,
  Clock, Power, CheckCircle, XCircle, FileText, MapPin, Hash, Copy
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  const { user, token, loading, isAuthenticated, logout, updateProfile } = useAuth();
  const { t, isRTL } = useLanguage();
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

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    email_verified: false,
    two_factor_enabled: false,
    sms_enabled: false,
    anti_phishing_code: ''
  });

  // Dialogs
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showAntiPhishingDialog, setShowAntiPhishingDialog] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);

  // Password reset
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Anti-phishing
  const [antiPhishingCode, setAntiPhishingCode] = useState('');

  // Account limits (mock data based on membership level)
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
      
      setSecuritySettings({
        email_verified: user.email_verified || true,
        two_factor_enabled: user.two_factor_enabled || false,
        sms_enabled: user.sms_enabled || false,
        anti_phishing_code: user.anti_phishing_code || ''
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

  const handleLogout = () => {
    logout();
    toast.success('Sessão terminada com sucesso!');
    navigate('/');
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('As passwords não coincidem');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Password deve ter pelo menos 6 caracteres');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/auth/change-password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password alterada com sucesso!');
      setShowPasswordDialog(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao alterar password');
    }
  };

  const handleSetAntiPhishing = async () => {
    if (!antiPhishingCode || antiPhishingCode.length < 4) {
      toast.error('Código deve ter pelo menos 4 caracteres');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/auth/set-anti-phishing`, {
        code: antiPhishingCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSecuritySettings(prev => ({ ...prev, anti_phishing_code: antiPhishingCode }));
      toast.success('Código anti-phishing definido!');
      setShowAntiPhishingDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao definir código');
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/deactivate-account`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Conta desativada. A terminar sessão...');
      setTimeout(() => {
        logout();
        navigate('/');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao desativar conta');
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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
        <div className="text-gold-400 text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`min-h-screen bg-black py-8 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-800/20 via-black to-black" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Link 
            to="/dashboard" 
            className="flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar ao Dashboard</span>
          </Link>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-gold-800/30 text-gold-400 hover:bg-gold-800/30"
          >
            <LogOut size={18} className="mr-2" />
            Terminar Sessão
          </Button>
        </div>

        {/* Profile Header Card */}
        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 bg-gradient-to-br from-gold-500 to-gold-600">
                <AvatarFallback className="text-2xl text-white bg-gradient-to-br from-gold-500 to-gold-600">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-center md:text-left flex-1">
                <h1 className="text-2xl font-light text-white">{user.name}</h1>
                <p className="text-gray-400">{user.email}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-3">
                  <Badge className="bg-green-900/30 text-green-400">
                    <Shield size={12} className="mr-1" />
                    {user.kyc_status === 'approved' ? 'KYC Verificado' : 'KYC Pendente'}
                  </Badge>
                  <Badge className="bg-gold-900/30 text-gold-400">
                    {user.membership_level === 'vip' || user.membership_level === 'elite' ? 'Elite' :
                     user.membership_level === 'premium' ? 'Premium' : 'Standard'}
                  </Badge>
                  <Badge className="bg-blue-900/30 text-blue-400">
                    {user.region === 'europe' ? '🇪🇺 Europa' :
                     user.region === 'mena' ? '🌍 MENA' :
                     user.region === 'latam' ? '🌎 LATAM' : '🌐 Global'}
                  </Badge>
                </div>
              </div>

              <div className="text-center md:text-right">
                <p className="text-sm text-gray-400">Número de Cliente</p>
                <div className="flex items-center gap-2 justify-center md:justify-end">
                  <p className="text-xl font-mono text-gold-400">{getClientNumber()}</p>
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
          <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="text-gold-400" size={20} />
                Limites da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fiat Limits */}
              <div>
                <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <ArrowDownCircle size={14} /> Depósito Moeda Fiduciária
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Diário</p>
                    <p className="text-white font-medium">{formatLimit(accountLimits.fiat_deposit_daily)}</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Mensal</p>
                    <p className="text-white font-medium">{formatLimit(accountLimits.fiat_deposit_monthly)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <ArrowUpCircle size={14} /> Levantamento Moeda Fiduciária
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Diário</p>
                    <p className="text-white font-medium">{formatLimit(accountLimits.fiat_withdrawal_daily)}</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Mensal</p>
                    <p className="text-white font-medium">{formatLimit(accountLimits.fiat_withdrawal_monthly)}</p>
                  </div>
                </div>
              </div>

              {/* Crypto Limits */}
              <div>
                <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Bitcoin size={14} /> Depósito Criptomoedas
                </h4>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">Diário</p>
                  <p className="text-green-400 font-medium">{formatLimit(accountLimits.crypto_deposit_daily)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                  <Bitcoin size={14} /> Levantamento Criptomoedas
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Diário</p>
                    <p className="text-white font-medium">{formatLimit(accountLimits.crypto_withdrawal_daily)}</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">Mensal</p>
                    <p className="text-white font-medium">{formatLimit(accountLimits.crypto_withdrawal_monthly)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <User className="text-gold-400" size={20} />
                Informações Pessoais
              </CardTitle>
              {!editing ? (
                <Button onClick={() => setEditing(true)} size="sm" variant="outline" className="border-gold-800/30 text-gold-400">
                  <Edit2 size={14} className="mr-1" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleCancel} size="sm" variant="outline" className="border-gray-600 text-gray-400">
                    <X size={14} className="mr-1" /> Cancelar
                  </Button>
                  <Button onClick={handleSave} size="sm" className="bg-gold-500 hover:bg-gold-400" disabled={saving}>
                    <Save size={14} className="mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Hash size={12} /> Nº Cliente</p>
                  <p className="text-white font-mono">{getClientNumber()}</p>
                </div>
                <div className="p-3 bg-zinc-800/30 rounded-lg">
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Globe size={12} /> País de Residência</p>
                  {editing ? (
                    <Select value={formData.country} onValueChange={handleCountryChange}>
                      <SelectTrigger className="h-8 bg-zinc-700 border-gold-800/30 text-white mt-1">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-gold-800/30">
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

              <div className="p-3 bg-zinc-800/30 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><User size={12} /> Nome Legal</p>
                {editing ? (
                  <Input name="name" value={formData.name} onChange={handleChange} className="h-8 bg-zinc-700 border-gold-800/30 text-white mt-1" />
                ) : (
                  <p className="text-white">{user.name}</p>
                )}
              </div>

              <div className="p-3 bg-zinc-800/30 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> Data de Nascimento</p>
                {editing ? (
                  <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="h-8 bg-zinc-700 border-gold-800/30 text-white mt-1" />
                ) : (
                  <p className="text-white">{user.date_of_birth || '-'}</p>
                )}
              </div>

              <div className="p-3 bg-zinc-800/30 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><FileText size={12} /> Documentos de Identificação</p>
                <p className="text-white">{user.kyc_status === 'approved' ? 'Verificados' : 'Pendentes'}</p>
              </div>

              <div className="p-3 bg-zinc-800/30 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> Endereço</p>
                {editing ? (
                  <Input name="address" value={formData.address} onChange={handleChange} placeholder="Endereço completo" className="h-8 bg-zinc-700 border-gold-800/30 text-white mt-1" />
                ) : (
                  <p className="text-white">{user.address || '-'}</p>
                )}
              </div>

              <div className="p-3 bg-zinc-800/30 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12} /> Endereço de E-mail</p>
                <p className="text-white">{user.email}</p>
              </div>

              <div className="p-3 bg-zinc-800/30 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={12} /> Telefone</p>
                {editing ? (
                  <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+351 900 000 000" className="h-8 bg-zinc-700 border-gold-800/30 text-white mt-1" />
                ) : (
                  <p className="text-white">{user.phone || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security Zone */}
          <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lock className="text-gold-400" size={20} />
                Zona de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Verification */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-400" size={18} />
                  <div>
                    <p className="text-white text-sm">Verificação de Email</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                {securitySettings.email_verified ? (
                  <Badge className="bg-green-900/30 text-green-400"><CheckCircle size={12} className="mr-1" /> Verificado</Badge>
                ) : (
                  <Button size="sm" className="bg-gold-500 hover:bg-gold-400">Verificar</Button>
                )}
              </div>

              {/* 2FA */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="text-gray-400" size={18} />
                  <div>
                    <p className="text-white text-sm">Autenticação 2FA</p>
                    <p className="text-xs text-gray-500">Google Authenticator</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShow2FADialog(true)}
                  size="sm" 
                  variant={securitySettings.two_factor_enabled ? "outline" : "default"}
                  className={securitySettings.two_factor_enabled ? "border-green-800/30 text-green-400" : "bg-gold-500 hover:bg-gold-400"}
                >
                  {securitySettings.two_factor_enabled ? 'Ativado' : 'Ativar'}
                </Button>
              </div>

              {/* SMS */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-gray-400" size={18} />
                  <div>
                    <p className="text-white text-sm">Verificação SMS</p>
                    <p className="text-xs text-gray-500">{user.phone || 'Não configurado'}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant={securitySettings.sms_enabled ? "outline" : "default"}
                  className={securitySettings.sms_enabled ? "border-green-800/30 text-green-400" : "bg-gold-500 hover:bg-gold-400"}
                  disabled={!user.phone}
                >
                  {securitySettings.sms_enabled ? 'Ativado' : 'Ativar'}
                </Button>
              </div>

              {/* Anti-Phishing */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-gray-400" size={18} />
                  <div>
                    <p className="text-white text-sm">Código Anti-Phishing</p>
                    <p className="text-xs text-gray-500">
                      {securitySettings.anti_phishing_code ? '••••••••' : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowAntiPhishingDialog(true)}
                  size="sm" 
                  variant={securitySettings.anti_phishing_code ? "outline" : "default"}
                  className={securitySettings.anti_phishing_code ? "border-green-800/30 text-green-400" : "bg-gold-500 hover:bg-gold-400"}
                >
                  {securitySettings.anti_phishing_code ? 'Alterar' : 'Configurar'}
                </Button>
              </div>

              {/* Password Reset */}
              <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="text-gray-400" size={18} />
                  <div>
                    <p className="text-white text-sm">Alterar Password</p>
                    <p className="text-xs text-gray-500">Última alteração: Desconhecido</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowPasswordDialog(true)}
                  size="sm" 
                  variant="outline"
                  className="border-gold-800/30 text-gold-400"
                >
                  Alterar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="text-gold-400" size={20} />
                Atividade da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">Último início de sessão</p>
                  <Badge className="bg-green-900/30 text-green-400">Sessão Ativa</Badge>
                </div>
                <p className="text-white">{formatDate(user.last_login || user.updated_at)}</p>
                <p className="text-xs text-gray-500 mt-1">IP: 192.168.x.x • Portugal</p>
              </div>

              <div className="p-4 bg-zinc-800/30 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Membro desde</p>
                <p className="text-white">{formatDate(user.created_at)}</p>
              </div>

              {/* Deactivate Account */}
              <div className="pt-4 border-t border-gold-800/20">
                <Button 
                  onClick={() => setShowDeactivateDialog(true)}
                  variant="outline"
                  className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20"
                >
                  <Power size={16} className="mr-2" />
                  Desativar Conta
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Pode reativar a sua conta contactando o suporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="text-gold-400" size={20} />
                Alterar Password
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Password Atual</Label>
                <Input 
                  type="password" 
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  className="bg-zinc-800 border-gold-800/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Nova Password</Label>
                <Input 
                  type="password" 
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="bg-zinc-800 border-gold-800/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Confirmar Nova Password</Label>
                <Input 
                  type="password" 
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="bg-zinc-800 border-gold-800/30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="border-gold-800/30">
                Cancelar
              </Button>
              <Button onClick={handlePasswordChange} className="bg-gold-500 hover:bg-gold-400">
                Alterar Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Anti-Phishing Dialog */}
        <Dialog open={showAntiPhishingDialog} onOpenChange={setShowAntiPhishingDialog}>
          <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="text-gold-400" size={20} />
                Código Anti-Phishing
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Este código aparecerá em todos os emails do KBEX.io para confirmar que são legítimos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Seu Código Anti-Phishing</Label>
                <Input 
                  value={antiPhishingCode}
                  onChange={(e) => setAntiPhishingCode(e.target.value)}
                  placeholder="Ex: MeuCodigo123"
                  className="bg-zinc-800 border-gold-800/30"
                />
                <p className="text-xs text-gray-500">Mínimo 4 caracteres. Escolha algo único que só você conhece.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAntiPhishingDialog(false)} className="border-gold-800/30">
                Cancelar
              </Button>
              <Button onClick={handleSetAntiPhishing} className="bg-gold-500 hover:bg-gold-400">
                Definir Código
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Dialog */}
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="text-gold-400" size={20} />
                Autenticação 2FA
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center">
              <div className="bg-zinc-800 p-4 rounded-lg mb-4">
                <p className="text-gray-400 text-sm">Esta funcionalidade estará disponível em breve.</p>
              </div>
              <p className="text-xs text-gray-500">
                A autenticação de dois fatores adiciona uma camada extra de segurança à sua conta.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShow2FADialog(false)} className="w-full bg-gold-500 hover:bg-gold-400">
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Dialog */}
        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent className="bg-zinc-900 border-gold-800/30 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                Desativar Conta
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Tem a certeza que deseja desativar a sua conta? Esta ação irá:
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2"><XCircle size={14} className="text-red-400" /> Terminar a sua sessão</li>
                <li className="flex items-center gap-2"><XCircle size={14} className="text-red-400" /> Bloquear acesso à sua conta</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-400" /> Manter os seus dados seguros</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-400" /> Permitir reativação via suporte</li>
              </ul>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)} className="border-gold-800/30">
                Cancelar
              </Button>
              <Button onClick={handleDeactivateAccount} className="bg-red-600 hover:bg-red-500">
                <Power size={16} className="mr-2" />
                Desativar Conta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ProfilePage;
