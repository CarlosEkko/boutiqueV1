import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('kbex_language');
    return saved && translations[saved] ? saved : 'PT';
  });
  
  const t = useCallback((key, fallback = null) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        if (fallback !== null) {
          return fallback;
        }
        return key;
      }
    }
    
    return value || fallback || key;
  }, [language]);
  
  const changeLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('kbex_language', lang);
      document.documentElement.dir = lang === 'AR' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang.toLowerCase();
    }
  }, []);
  
  const isRTL = language === 'AR';
  
  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
