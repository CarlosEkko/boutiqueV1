import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../i18n';

const LanguageSelector = () => {
  const { language, changeLanguage } = useLanguage();

  const languages = [
    { code: 'EN', label: 'EN' },
    { code: 'PT', label: 'PT' },
    { code: 'FR', label: 'FR' },
    { code: 'ES', label: 'ES' },
    { code: 'AR', label: 'AR' }
  ];

  return (
    <div 
      className="flex items-center bg-zinc-900/80 rounded-xl px-3 py-2 border border-zinc-800"
      data-testid="language-selector"
    >
      <Globe className="w-5 h-5 text-gold-400 mr-2" />
      <div className="flex items-center">
        {languages.map((lang, index) => (
          <React.Fragment key={lang.code}>
            {index > 0 && (
              <span className="text-zinc-600 mx-1.5">|</span>
            )}
            <button
              onClick={() => changeLanguage(lang.code)}
              className={`text-sm font-medium transition-colors ${
                language === lang.code
                  ? 'text-gold-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`lang-${lang.code.toLowerCase()}`}
            >
              {lang.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
