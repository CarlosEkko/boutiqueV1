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

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    country: ''
  });

  const { login, register } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value) => {
    setFormData(prev => ({ ...prev, country: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success(t('auth.loginSuccess') || 'Login successful!');
      } else {
        await register(formData);
        toast.success(t('auth.registerSuccess') || 'Account created successfully!');
      }
      navigate('/profile');
    } catch (error) {
      const message = error.response?.data?.detail || 
        (isLogin ? 'Login failed' : 'Registration failed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-black flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black" />
      
      {/* Back to home link */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors"
        data-testid="back-to-home"
      >
        <ArrowLeft size={20} />
        <span>{t('auth.backToHome') || 'Back to Home'}</span>
      </Link>

      <Card className="w-full max-w-md bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-900/30 relative z-10">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <span className="text-2xl font-light tracking-wider text-white">
              KB<span className="text-gold-400">EX</span>
            </span>
          </div>
          
          <CardTitle className="text-2xl font-light text-white">
            {isLogin 
              ? (t('auth.welcomeBack') || 'Welcome Back') 
              : (t('auth.createAccount') || 'Create Account')}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isLogin 
              ? (t('auth.loginDescription') || 'Sign in to access your account')
              : (t('auth.registerDescription') || 'Join our exclusive platform')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field - only for register */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300 flex items-center gap-2">
                  <User size={16} className="text-gold-400" />
                  {t('auth.fullName') || 'Full Name'}
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="João Silva"
                  className="bg-zinc-800/50 border-amber-900/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                  data-testid="register-name-input"
                />
              </div>
            )}

            {/* Email field */}
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
                className="bg-zinc-800/50 border-amber-900/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                data-testid="auth-email-input"
              />
            </div>

            {/* Password field */}
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
                  className="bg-zinc-800/50 border-amber-900/30 text-white placeholder:text-gray-500 focus:border-gold-400 pr-10"
                  data-testid="auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold-400 transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Phone and Country - only for register */}
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2">
                    <Phone size={16} className="text-gold-400" />
                    {t('auth.phone') || 'Phone Number'}
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+351 912 345 678"
                    className="bg-zinc-800/50 border-amber-900/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                    data-testid="register-phone-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-gray-300 flex items-center gap-2">
                    <Globe size={16} className="text-gold-400" />
                    {t('auth.country') || 'Country'}
                  </Label>
                  <Select value={formData.country} onValueChange={handleCountryChange}>
                    <SelectTrigger 
                      className="bg-zinc-800/50 border-amber-900/30 text-white focus:border-gold-400"
                      data-testid="register-country-select"
                    >
                      <SelectValue placeholder={t('auth.selectCountry') || 'Select your country'} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-amber-900/30">
                      {COUNTRIES.map(country => (
                        <SelectItem 
                          key={country.code} 
                          value={country.code}
                          className="text-white hover:bg-amber-900/30 focus:bg-amber-900/30"
                        >
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white font-medium py-5 mt-2"
              data-testid="auth-submit-button"
            >
              {loading 
                ? (t('auth.processing') || 'Processing...') 
                : isLogin 
                  ? (t('auth.signIn') || 'Sign In')
                  : (t('auth.createAccount') || 'Create Account')}
            </Button>
          </form>

          {/* Toggle login/register */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {isLogin 
                ? (t('auth.noAccount') || "Don't have an account?")
                : (t('auth.haveAccount') || 'Already have an account?')}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-gold-400 hover:text-amber-300 transition-colors font-medium"
                data-testid="toggle-auth-mode"
              >
                {isLogin 
                  ? (t('auth.signUp') || 'Sign Up')
                  : (t('auth.signIn') || 'Sign In')}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
