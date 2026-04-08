import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import TurnstileWidget from '../components/TurnstileWidget';

const AuthPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleTurnstileVerify = useCallback((token) => setTurnstileToken(token), []);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { login } = useAuth();
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
      const userData = await login(formData.email, formData.password, turnstileToken);
      toast.success(t('auth.loginSuccess') || 'Login successful!');
      
      if (userData?.user_type === 'client' && !userData?.is_onboarded) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`dark min-h-screen bg-black flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-800/20 via-black to-black" />
      
      {/* Back to home link */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors"
        data-testid="back-to-home"
      >
        <ArrowLeft size={20} />
        <span>{t('auth.backToHome') || 'Back to Home'}</span>
      </Link>

      <Card className="w-full max-w-md bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/30 relative z-10">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <span className="text-2xl font-light tracking-wider text-white">
              KB<span className="text-gold-400">EX</span>
            </span>
          </div>
          
          <CardTitle className="text-2xl font-light text-white">
            {t('auth.welcomeBack') || 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {t('auth.loginDescription') || 'Sign in to access your account'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="bg-zinc-800/50 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-400"
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
                  className="bg-zinc-800/50 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-400 pr-10"
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

            {/* Turnstile */}
            <TurnstileWidget onVerify={handleTurnstileVerify} className="flex justify-center mt-2" />

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white font-medium py-5 mt-2"
              data-testid="auth-submit-button"
            >
              {loading 
                ? (t('auth.processing') || 'Processing...') 
                : (t('auth.signIn') || 'Sign In')}
            </Button>
          </form>

          {/* Request Access link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t('auth.noAccount') || "Don't have an account?"}
              <a
                href="/#contact"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/#contact';
                }}
                className="ml-2 text-gold-400 hover:text-gold-300 transition-colors font-medium cursor-pointer"
                data-testid="request-access-link"
              >
                {t('nav.requestAccess') || 'Solicitar Acesso'}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
