import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Shield, Lock, Key, Mail, Smartphone, MessageSquare, 
  AlertTriangle, Power, CheckCircle, XCircle, Clock,
  RefreshCw, Eye, EyeOff, History
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SecurityPage = () => {
  const { user, token, logout } = useAuth();
  const { t } = useLanguage();
  
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Anti-phishing
  const [antiPhishingCode, setAntiPhishingCode] = useState('');

  // 2FA setup
  const [twoFASecret, setTwoFASecret] = useState(null);
  const [twoFAQRCode, setTwoFAQRCode] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [setting2FA, setSetting2FA] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    if (user) {
      setSecuritySettings({
        email_verified: user.email_verified || true,
        two_factor_enabled: user.two_factor_enabled || false,
        sms_enabled: user.sms_enabled || false,
        anti_phishing_code: user.anti_phishing_code || ''
      });
    }
    fetchActivityLog();
  }, [user]);

  const fetchActivityLog = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/activity-log`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivityLog(response.data || []);
    } catch (err) {
      // Activity log might not exist yet
      setActivityLog([]);
    } finally {
      setLoadingActivity(false);
    }
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
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao desativar conta');
    }
  };

  // 2FA Functions
  const handleOpen2FADialog = async () => {
    setShow2FADialog(true);
    setVerificationCode('');
    
    // Se o 2FA já está ativo, não precisa chamar setup novamente
    if (securitySettings.two_factor_enabled) {
      setSetting2FA(false);
      return;
    }
    
    setSetting2FA(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/2fa/setup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTwoFASecret(response.data.secret);
      setTwoFAQRCode(response.data.qr_code);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao configurar 2FA');
      setShow2FADialog(false);
    } finally {
      setSetting2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Insira o código de 6 dígitos');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/auth/2fa/verify`, {
        code: verificationCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('2FA ativado com sucesso!');
      setShow2FADialog(false);
      setSecuritySettings(prev => ({ ...prev, two_factor_enabled: true }));
      setTwoFASecret(null);
      setTwoFAQRCode(null);
      setVerificationCode('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Código inválido');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/2fa/disable`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('2FA desativado');
      setSecuritySettings(prev => ({ ...prev, two_factor_enabled: false }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Falha ao desativar 2FA');
    }
  };
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} minutos`;
    if (diffHours < 24) return `Há ${diffHours} horas`;
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return formatDate(dateString);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="text-gold-400" />
            {t('profile.security.title')}
          </h1>
          <p className="text-gray-400">{t('profile.security.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} className="mr-2" />
          {t('admin.common.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Zone */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="text-gold-400" size={20} />
              Zona de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Email Verification */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="text-gray-400" size={18} />
                <div>
                  <p className="text-white text-sm">Verificação de Email</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              {securitySettings.email_verified ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0"><CheckCircle size={12} className="mr-1" /> Verificado</Badge>
              ) : (
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">Verificar</Button>
              )}
            </div>

            {/* 2FA */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="text-gray-400" size={18} />
                <div>
                  <p className="text-white text-sm">Autenticação 2FA</p>
                  <p className="text-xs text-gray-500">Google Authenticator</p>
                </div>
              </div>
              <Button 
                onClick={handleOpen2FADialog}
                size="sm" 
                variant={securitySettings.two_factor_enabled ? "outline" : "default"}
                className={securitySettings.two_factor_enabled ? "border-emerald-800/30 text-emerald-400" : "bg-emerald-500 hover:bg-emerald-600"}
              >
                {securitySettings.two_factor_enabled ? 'Gerir' : 'Ativar'}
              </Button>
            </div>

            {/* SMS */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
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
                className={securitySettings.sms_enabled ? "border-emerald-800/30 text-emerald-400" : "bg-emerald-500 hover:bg-emerald-600"}
                disabled={!user.phone}
              >
                {securitySettings.sms_enabled ? 'Ativado' : 'Ativar'}
              </Button>
            </div>

            {/* Anti-Phishing */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
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
                className={securitySettings.anti_phishing_code ? "border-emerald-800/30 text-emerald-400" : "bg-emerald-500 hover:bg-emerald-600"}
              >
                {securitySettings.anti_phishing_code ? 'Alterar' : 'Configurar'}
              </Button>
            </div>

            {/* Password Reset */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
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
                className="border-zinc-700"
              >
                Alterar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Activity */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="text-gold-400" size={20} />
              Atividade da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Session */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Sessão Atual</p>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Ativa</Badge>
              </div>
              <p className="text-white">{formatRelativeTime(user.last_login || user.updated_at)}</p>
              <p className="text-xs text-gray-500 mt-1">IP: Oculto por segurança</p>
            </div>

            {/* Member Since */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Membro desde</p>
              <p className="text-white">{formatDate(user.created_at)}</p>
            </div>

            {/* Recent Activity */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <History size={14} />
                Atividade Recente
              </p>
              {loadingActivity ? (
                <p className="text-gray-500 text-sm">Carregando...</p>
              ) : activityLog.length > 0 ? (
                <div className="space-y-2">
                  {activityLog.slice(0, 5).map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{activity.action}</span>
                      <span className="text-gray-500">{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sem atividade registada</p>
              )}
            </div>

            {/* Deactivate Account */}
            <div className="pt-4 border-t border-zinc-700">
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
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="text-gold-400" size={20} />
              Alterar Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Password Atual</Label>
              <div className="relative">
                <Input 
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Nova Password</Label>
              <div className="relative">
                <Input 
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Confirmar Nova Password</Label>
              <Input 
                type="password" 
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={handlePasswordChange} className="bg-emerald-500 hover:bg-emerald-600">
              Alterar Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anti-Phishing Dialog */}
      <Dialog open={showAntiPhishingDialog} onOpenChange={setShowAntiPhishingDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
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
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-gray-500">Mínimo 4 caracteres. Escolha algo único que só você conhece.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAntiPhishingDialog(false)} className="border-zinc-700">
              Cancelar
            </Button>
            <Button onClick={handleSetAntiPhishing} className="bg-emerald-500 hover:bg-emerald-600">
              Definir Código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="text-gold-400" size={20} />
              Autenticação 2FA
            </DialogTitle>
          </DialogHeader>
          
          {setting2FA ? (
            <div className="py-8 text-center">
              <RefreshCw className="animate-spin mx-auto text-gold-400 mb-4" size={32} />
              <p className="text-gray-400">A gerar código QR...</p>
            </div>
          ) : securitySettings.two_factor_enabled ? (
            <div className="py-4 text-center">
              <div className="bg-emerald-900/20 p-4 rounded-lg mb-4 border border-emerald-500/30">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                <p className="text-emerald-400 font-medium">2FA está ativo</p>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                A autenticação de dois fatores está a proteger a sua conta.
              </p>
              <Button 
                onClick={handleDisable2FA} 
                variant="destructive"
                className="w-full"
              >
                Desativar 2FA
              </Button>
            </div>
          ) : twoFAQRCode ? (
            <div className="py-4 space-y-4">
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <img src={twoFAQRCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
              
              <div className="bg-zinc-800 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Chave secreta (backup):</p>
                <p className="font-mono text-sm text-gold-400 break-all">{twoFASecret}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Código de Verificação</Label>
                <Input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="bg-zinc-800 border-zinc-700 text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-gray-500">
                  Insira o código de 6 dígitos do Google Authenticator
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-gray-400">Erro ao carregar QR code. Tente novamente.</p>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShow2FADialog(false);
                setTwoFASecret(null);
                setTwoFAQRCode(null);
                setVerificationCode('');
              }} 
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            {twoFAQRCode && !securitySettings.two_factor_enabled && (
              <Button 
                onClick={handleVerify2FA} 
                className="bg-emerald-500 hover:bg-emerald-600"
                disabled={verificationCode.length !== 6}
              >
                Verificar e Ativar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
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
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Manter os seus dados seguros</li>
              <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Permitir reativação via suporte</li>
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)} className="border-zinc-700">
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
  );
};

export default SecurityPage;
