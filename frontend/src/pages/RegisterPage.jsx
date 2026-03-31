import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Phone, Globe, Lock, ArrowLeft } from 'lucide-react';

import { COUNTRIES } from '../utils/countries';

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    country: ''
  });

  const { register } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await register(formData);
      toast.success(t('auth.registerSuccess') || 'Conta criada com sucesso!');
      
      if (userData?.user_type === 'client' && !userData?.is_onboarded) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao criar conta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-black flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-800/20 via-black to-black" />
      
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors z-20"
        data-testid="back-to-home"
      >
        <ArrowLeft size={20} />
        <span>{t('auth.backToHome') || 'Voltar'}</span>
      </Link>

      <Card className="w-full max-w-md bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30 relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="mb-4 flex justify-center">
            <span className="text-2xl font-light tracking-wider text-white">
              KB<span className="text-gold-400">EX</span>
            </span>
          </div>
          
          <CardTitle className="text-2xl font-light text-white" data-testid="register-title">
            {t('auth.createAccount') || 'Criar Conta'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t('auth.registerDescription') || 'Complete o seu registo na plataforma'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 flex items-center gap-2">
                <User size={16} className="text-gold-400" />
                {t('auth.fullName') || 'Nome Completo'}
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="João Silva"
                className="bg-zinc-800/50 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                data-testid="register-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 flex items-center gap-2">
                <Mail size={16} className="text-gold-400" />
                {t('auth.email') || 'Email'}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="joao@exemplo.com"
                className="bg-zinc-800/50 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                data-testid="register-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 flex items-center gap-2">
                <Lock size={16} className="text-gold-400" />
                {t('auth.password') || 'Password'}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="bg-zinc-800/50 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-400 pr-10"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                <Phone size={16} className="text-gold-400" />
                {t('auth.phone') || 'Telefone'}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+351 912 345 678"
                className="bg-zinc-800/50 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                data-testid="register-phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-300 flex items-center gap-2">
                <Globe size={16} className="text-gold-400" />
                {t('auth.country') || 'País'}
              </Label>
              <Select value={formData.country} onValueChange={(v) => setFormData(prev => ({ ...prev, country: v }))}>
                <SelectTrigger 
                  className="bg-zinc-800/50 border-gold-800/30 text-white focus:border-gold-400"
                  data-testid="register-country-select"
                >
                  <SelectValue placeholder={t('auth.selectCountry') || 'Selecione o país'} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-gold-800/30">
                  {COUNTRIES.map(country => (
                    <SelectItem 
                      key={country.code} 
                      value={country.code}
                      className="text-white hover:bg-gold-800/30 focus:bg-gold-800/30"
                    >
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white font-medium py-5 mt-2"
              data-testid="register-submit-button"
            >
              {loading 
                ? (t('auth.processing') || 'A processar...') 
                : (t('auth.createAccount') || 'Criar Conta')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t('auth.haveAccount') || 'Já tem conta?'}
              <Link
                to="/auth"
                className="ml-2 text-gold-400 hover:text-gold-300 transition-colors font-medium"
                data-testid="go-to-login-link"
              >
                {t('auth.signIn') || 'Iniciar Sessão'}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
