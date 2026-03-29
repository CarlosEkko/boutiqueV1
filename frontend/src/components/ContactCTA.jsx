import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ContactCTA = () => {
  const { t, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/otc/leads/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message || null
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSubmitted(true);
        toast.success(data.message);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', email: '', phone: '', message: '' });
        }, 5000);
      } else {
        toast.error(data.detail || 'Erro ao enviar pedido');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className={`py-24 bg-black relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Dramatic background glow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-700/30 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-0">
              <div className={`grid md:grid-cols-5 gap-0 ${isRTL ? 'md:grid-flow-dense' : ''}`}>
                {/* Left side - CTA Text */}
                <div className={`md:col-span-2 bg-gradient-to-br from-gold-950/50 to-gold-800/30 p-8 md:p-10 flex flex-col justify-center ${isRTL ? 'border-l md:col-start-4' : 'border-r'} border-gold-700/20`}>
                  <div className="mb-6">
                    <div className={`inline-flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-2 rounded-full bg-gold-500/20 border border-gold-500/30 mb-4`}>
                      <div className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
                      <span className="text-gold-200 text-xs tracking-wider font-medium">
                        {t('contact.badge')}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
                    {t('contact.title')}
                    <span className="text-gold-400 block">{t('contact.titleHighlight')}</span>
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {t('contact.description')}
                  </p>

                  <div className="mt-8 pt-6 border-t border-gold-700/30">
                    <p className="text-xs text-gold-200/70 italic">
                      {t('contact.form.disclaimer')}
                    </p>
                  </div>
                </div>

                {/* Right side - Form */}
                <div className={`md:col-span-3 p-8 md:p-10 ${isRTL ? 'md:col-start-1' : ''}`}>
                  {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-300">
                          {t('contact.form.fullName')} *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="bg-zinc-900/50 border-gold-800/30 focus:border-gold-500 text-white placeholder:text-gray-500 transition-colors duration-300"
                          placeholder="João Silva"
                          dir={isRTL ? 'rtl' : 'ltr'}
                          data-testid="contact-name-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">
                          {t('contact.form.email')} *
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="bg-zinc-900/50 border-gold-800/30 focus:border-gold-500 text-white placeholder:text-gray-500 transition-colors duration-300"
                          placeholder="joao@empresa.com"
                          dir="ltr"
                          data-testid="contact-email-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-300">
                          {t('contact.form.phone')}
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="bg-zinc-900/50 border-gold-800/30 focus:border-gold-500 text-white placeholder:text-gray-500 transition-colors duration-300"
                          placeholder="+351 123 456 789"
                          dir="ltr"
                          data-testid="contact-phone-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-gray-300">
                          {t('contact.form.message')}
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          className="bg-zinc-900/50 border-gold-800/30 focus:border-gold-500 text-white placeholder:text-gray-500 resize-none transition-colors duration-300"
                          placeholder={isRTL ? 'أخبرنا عن احتياجاتك...' : 'Conte-nos sobre as suas necessidades...'}
                          dir={isRTL ? 'rtl' : 'ltr'}
                          data-testid="contact-message-input"
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white border-none shadow-lg shadow-gold-800/30 transition-all duration-300 group"
                        data-testid="contact-submit-btn"
                      >
                        {loading ? (
                          <Loader2 className="animate-spin mr-2" size={20} />
                        ) : null}
                        {loading ? (t('auth.processing') || 'A processar...') : t('contact.form.submit')}
                        {!loading && <ArrowRight className={`${isRTL ? 'mr-2 rotate-180 group-hover:-translate-x-1' : 'ml-2 group-hover:translate-x-1'} transition-transform duration-300`} size={20} />}
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-fade-in">
                      <div className="w-20 h-20 bg-gradient-to-br from-gold-500/20 to-gold-600/20 rounded-full flex items-center justify-center mb-6 animate-scale-in">
                        <CheckCircle2 className="text-gold-400" size={40} />
                      </div>
                      <h3 className="text-2xl font-light text-white mb-3" data-testid="contact-success-title">
                        {isRTL ? 'تم استلام الطلب' : 'Pedido Recebido'}
                      </h3>
                      <p className="text-gray-400 max-w-sm">
                        {isRTL 
                          ? 'شكراً لاهتمامك. سيقوم فريقنا بمراجعة طلبك والتواصل معك قريباً.'
                          : 'Obrigado pelo seu interesse. A nossa equipa irá analisar o seu pedido e entrar em contacto brevemente.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactCTA;
