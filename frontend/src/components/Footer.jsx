import React from 'react';
import { Link } from 'react-router-dom';
import { Separator } from './ui/separator';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t, isRTL } = useLanguage();

  const footerLinks = {
    [t('footer.services')]: [
      { label: t('footer.exchange'), to: '/dashboard/exchange' },
      { label: t('footer.atmNetwork'), to: '/atm' },
      { label: t('footer.launchpad'), to: '#' },
      { label: t('footer.custody'), to: '/institutional' }
    ],
    [t('footer.company')]: [
      { label: t('footer.about'), to: '#' },
      { label: t('footer.careers'), to: '#' },
      { label: t('footer.press'), to: '#' },
      { label: t('footer.legal'), to: '#' },
      { label: t('footer.cookies', 'Política de Cookies'), to: '/legal/cookies' }
    ],
    [t('footer.support')]: [
      { label: t('footer.helpCenter'), to: '/help' },
      { label: t('footer.contactUs'), to: '/support' },
      { label: t('footer.status'), to: '#' },
      { label: t('footer.security'), to: '/help/seguranca' }
    ]
  };

  return (
    <footer className={`bg-black border-t border-gold-800/20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-4 group`}>
              <img 
                src="/logo.png" 
                alt="KBEX.io" 
                className="h-10 w-auto transform group-hover:scale-105 transition-transform duration-300"
              />
              <span className="text-2xl font-light bg-gradient-to-r from-gold-200 via-gold-400 to-gold-200 bg-clip-text text-transparent">
                KBEX.io
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {t('footer.tagline')}
            </p>
            <div className="space-y-2">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-gray-400 text-sm`}>
                <Mail size={16} className="text-gold-400" />
                <span>contact@kbex.io</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-gray-400 text-sm`}>
                <Phone size={16} className="text-gold-400" />
                <span>+41 (0) 800 KBEX</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-gray-400 text-sm`}>
                <MapPin size={16} className="text-gold-400" />
                <span>Zurich, Switzerland</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-gray-400 text-sm hover:text-gold-400 transition-colors duration-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-gold-800/20 mb-8" />

        <div className={`flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          <p className="text-gray-500 text-sm">
            {t('footer.copyright')}
          </p>
          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-6 text-xs text-gray-500`}>
            <span>{t('hero.trustLicensed')}</span>
            <span>•</span>
            <span>MiCA Compliant</span>
            <span>•</span>
            <span>{t('hero.trustSecurity')}</span>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 pt-8 border-t border-gold-800/10">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>{isRTL ? 'تحذير المخاطر:' : 'Risk Warning:'}</strong> {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
