import React from 'react';
import { Separator } from './ui/separator';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../i18n';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t, isRTL } = useLanguage();

  const footerLinks = {
    [t('footer.services')]: [t('footer.exchange'), t('footer.atmNetwork'), t('footer.launchpad'), t('footer.custody')],
    [t('footer.company')]: [t('footer.about'), t('footer.careers'), t('footer.press'), t('footer.legal')],
    [t('footer.support')]: [t('footer.helpCenter'), t('footer.contactUs'), t('footer.status'), t('footer.security')]
  };

  return (
    <footer className={`bg-black border-t border-amber-900/20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-4 group`}>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                <span className="text-black font-bold text-xl">K</span>
              </div>
              <span className="text-2xl font-light bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                KBEX.io
              </span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {t('footer.tagline')}
            </p>
            <div className="space-y-2">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-gray-400 text-sm`}>
                <Mail size={16} className="text-amber-400" />
                <span>contact@kbex.io</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-gray-400 text-sm`}>
                <Phone size={16} className="text-amber-400" />
                <span>+41 (0) 800 KRYPTO</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-gray-400 text-sm`}>
                <MapPin size={16} className="text-amber-400" />
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
                  <li key={link}>
                    <a
                      href="#"
                      className="text-gray-400 text-sm hover:text-amber-400 transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="bg-amber-900/20 mb-8" />

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
        <div className="mt-8 pt-8 border-t border-amber-900/10">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>{isRTL ? 'تحذير المخاطر:' : 'Risk Warning:'}</strong> {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
