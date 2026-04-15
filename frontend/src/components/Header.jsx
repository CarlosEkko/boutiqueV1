import React, { useState, useEffect } from 'react';
import { Globe, User, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import CryptoTicker from './CryptoTicker';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t, changeLanguage, isRTL } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const navLinks = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.markets'), href: '/markets' },
    { name: t('nav.trading'), href: '/trading' },
    { name: t('nav.earn'), href: '/earn' },
    { name: 'Launchpad', href: '/launchpad' },
    { name: t('nav.institutional'), href: '/institutional' },
    { name: t('nav.cryptoAtm'), href: '/crypto-atm' },
  ];

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'PT', name: 'Português' },
    { code: 'FR', name: 'Français' },
    { code: 'ES', name: 'Español' },
    { code: 'AR', name: 'العربية' }
  ];


  // Prevent body scroll when nav is open
  useEffect(() => {
    if (isNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isNavOpen]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setIsNavOpen(false);
    
    setTimeout(() => {
      if (href.startsWith('/#')) {
        if (location.pathname !== '/') {
          navigate('/');
          setTimeout(() => {
            const element = document.querySelector(href.substring(1));
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } else {
          const element = document.querySelector(href.substring(1));
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } else {
        navigate(href);
      }
    }, 300);
  };

  const isActiveLink = (href) => {
    if (href === '/') return location.pathname === '/';
    if (href.startsWith('/#')) return location.hash === href.substring(1);
    return location.pathname === href;
  };

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
  };

  return (
    <>
      {/* Custom Cursor - Hidden for Safari compatibility */}
      {/* The custom cursor caused issues on Safari, so it's disabled */}

      {/* Fixed Header */}
      <header className={`fixed top-0 left-0 w-full z-[100] ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* TradingView Ticker Bar */}
        <div className="bg-black/90 backdrop-blur-md border-b border-gold-800/10">
          <CryptoTicker />
        </div>

        {/* Main Header */}
        <div className="bg-black/80 backdrop-blur-md border-b border-gold-800/20">
          <div className={`header-wrapper relative w-[calc(100%-60px)] md:w-[calc(100%-100px)] mx-auto ${isRTL ? 'md:mr-[50px]' : 'md:ml-[50px]'}`}>
            {/* Logo */}
            <div className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-[20px] md:top-[30px] cursor-pointer z-[101]`}>
              <a 
                href="/" 
                onClick={(e) => handleNavClick(e, '/')} 
                className="magnetic-link flex items-center space-x-2 group transition-opacity duration-300 hover:opacity-90"
                data-testid="header-logo"
              >
                <span className="inline-block">
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                    <img 
                      src="/logo.png" 
                      alt="KBEX.io" 
                      className="h-10 md:h-12 w-auto transform group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="text-xl md:text-2xl font-light text-white font-['Inter']">
                      <span className="text-gold-400">KB</span>EX.io
                    </span>
                  </div>
                </span>
              </a>
            </div>

            {/* Menu Icon (Hamburger) */}
            <div className={`nav-but-wrap relative inline-block ${isRTL ? 'float-left' : 'float-right'} ${isRTL ? 'pr-4' : 'pl-4'} pt-4 mt-[16px] md:mt-[20px] transition-all duration-300`}>
              <div 
                className="menu-icon h-[30px] w-[30px] relative z-[102] cursor-pointer block magnetic-link"
                onClick={() => setIsNavOpen(!isNavOpen)}
                data-testid="menu-toggle"
              >
                <span className="inline-block w-full h-full">
                  <span 
                    className={`menu-icon__line h-[2px] w-[30px] block bg-white mb-[7px] cursor-pointer transition-all duration-200 ${
                      isNavOpen ? 'transform translate-x-0 translate-y-0 -rotate-45 bg-white' : ''
                    }`}
                  />
                  <span 
                    className={`menu-icon__line menu-icon__line-left h-[2px] block bg-white mb-[7px] cursor-pointer transition-all duration-200 ${
                      isNavOpen ? 'w-[15px] transform translate-x-[2px] translate-y-[4px] rotate-45' : 'w-[16.5px]'
                    }`}
                  />
                  <span 
                    className={`menu-icon__line menu-icon__line-right h-[2px] block bg-white ${isRTL ? 'float-left' : 'float-right'} cursor-pointer transition-all duration-200 ${
                      isNavOpen ? 'w-[15px] transform -translate-x-[3px] -translate-y-[3.5px] rotate-45' : 'w-[16.5px]'
                    }`}
                  />
                </span>
              </div>
            </div>

            {/* Right Side - Language & CTA (Desktop) */}
            <div className={`hidden md:flex items-center space-x-4 ${isRTL ? 'float-left ml-[70px]' : 'float-right mr-[70px]'} mt-[24px]`}>
              {/* Language Selector */}
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-gold-800/20 hover:border-gold-600/40 transition-colors duration-300`}>
                <Globe size={16} className="text-gold-400" />
                {languages.map((lang, index) => (
                  <React.Fragment key={lang.code}>
                    <button
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`text-sm font-['Inter'] transition-colors duration-300 ${
                        language === lang.code
                          ? 'text-gold-400 font-medium'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      data-testid={`lang-${lang.code.toLowerCase()}`}
                    >
                      {lang.code}
                    </button>
                    {index < languages.length - 1 && (
                      <span className="text-gold-800/40">|</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Auth Button - Login or Profile */}
              {isAuthenticated ? (
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="border-gold-800/30 text-gold-400 hover:bg-gold-800/30 hover:text-gold-300 font-['Inter']"
                  data-testid="header-dashboard-btn"
                >
                  <User size={18} className="mr-2" />
                  Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="border-gold-800/30 text-gold-400 hover:bg-gold-800/30 hover:text-gold-300 font-['Inter']"
                  data-testid="header-login-btn"
                >
                  <LogIn size={18} className="mr-2" />
                  {t('nav.login') || 'Login'}
                </Button>
              )}

              <Button
                onClick={(e) => handleNavClick(e, '/#contact')}
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white border-none shadow-lg shadow-gold-800/30 transition-all duration-300 font-['Inter']"
                data-testid="header-cta"
              >
                {t('nav.requestAccess')}
              </Button>
            </div>

            {/* Spacer for layout */}
            <div className="h-[70px] md:h-[90px]" />
          </div>
        </div>
      </header>

      {/* Spacer to account for fixed header */}
      <div className="h-[120px] md:h-[140px]" />

      {/* Fullscreen Navigation Overlay */}
      <nav className={`nav fixed z-[98] ${isNavOpen ? 'visible' : ''}`}>
        {/* Overlay backgrounds */}
        <div 
          className={`fixed w-screen h-screen bg-black/60 ${isRTL ? 'rounded-br-[200%]' : 'rounded-bl-[200%]'} z-[-1] transition-all duration-[600ms] ease-[cubic-bezier(0.77,0,0.175,1)] ${
            isNavOpen 
              ? 'transform translate-x-0 translate-y-0 rounded-none delay-100' 
              : `transform ${isRTL ? '-translate-x-full' : 'translate-x-full'} -translate-y-full delay-0`
          }`}
        />
        <div 
          className={`fixed w-screen h-screen bg-black ${isRTL ? 'rounded-br-[200%]' : 'rounded-bl-[200%]'} z-[-1] transition-all duration-[600ms] ease-[cubic-bezier(0.77,0,0.175,1)] ${
            isNavOpen 
              ? 'transform translate-x-0 translate-y-0 rounded-none delay-0' 
              : `transform ${isRTL ? '-translate-x-full' : 'translate-x-full'} -translate-y-full delay-200`
          }`}
        />

        {/* Navigation Content */}
        <div 
          className={`nav__content fixed top-1/2 left-0 transform -translate-y-1/2 w-full text-center mt-[20px] ${
            isNavOpen ? 'visible' : 'invisible'
          }`}
        >
          <ul className="nav__list relative p-0 m-0 z-[2]">
            {navLinks.map((link, index) => (
              <li 
                key={link.href}
                className={`nav__list-item relative block text-center overflow-hidden transition-all duration-300 ${
                  isNavOpen 
                    ? 'opacity-100 transform translate-x-0' 
                    : `opacity-0 transform ${isRTL ? '-translate-x-[100px]' : 'translate-x-[100px]'}`
                }`}
                style={{
                  transitionDelay: isNavOpen ? `${0.7 + index * 0.1}s` : '0s'
                }}
              >
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`magnetic-link nav-link relative no-underline overflow-hidden cursor-pointer px-[10px] py-[2px] z-[2] inline-block uppercase tracking-[3px] md:tracking-[5px] text-[3vh] md:text-[6vh] leading-[1.4] transition-all duration-200 font-['Inter'] font-light ${
                    isActiveLink(link.href) 
                      ? 'text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                  data-testid={`nav-link-${index}`}
                >
                  <span className="inline-block pointer-events-none">{link.name}</span>
                  <span 
                    className={`nav-underline absolute bottom-[5px] ${isRTL ? 'right-1/2' : 'left-1/2'} h-[3px] bg-gold-400 transition-all duration-300 ${
                      isActiveLink(link.href) 
                        ? `w-full ${isRTL ? 'right-0' : 'left-0'}` 
                        : 'w-0'
                    }`}
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* Mobile Language, Login & CTA in Overlay */}
          <div 
            className={`md:hidden mt-6 transition-all duration-300 ${
              isNavOpen ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: isNavOpen ? '1.3s' : '0s' }}
          >
            <div className={`flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-4 mb-5`}>
              <Globe size={18} className="text-gold-400" />
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <button
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`text-base font-['Inter'] transition-colors duration-300 ${
                      language === lang.code
                        ? 'text-gold-400 font-medium'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {lang.code}
                  </button>
                  {index < languages.length - 1 && (
                    <span className="text-gold-800/40">|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex flex-col items-center gap-3">
              {isAuthenticated ? (
                <Button
                  onClick={() => { setIsNavOpen(false); navigate('/dashboard'); }}
                  variant="outline"
                  className="border-gold-800/30 text-gold-400 hover:bg-gold-800/30 hover:text-gold-300 font-['Inter'] px-8 py-3 text-base"
                  data-testid="mobile-dashboard-btn"
                >
                  <User size={18} className="mr-2" />
                  Dashboard
                </Button>
              ) : (
                <Button
                  onClick={() => { setIsNavOpen(false); navigate('/auth'); }}
                  variant="outline"
                  className="border-gold-800/30 text-gold-400 hover:bg-gold-800/30 hover:text-gold-300 font-['Inter'] px-8 py-3 text-base"
                  data-testid="mobile-login-btn"
                >
                  <LogIn size={18} className="mr-2" />
                  {t('nav.login') || 'Entrar'}
                </Button>
              )}
              <Button
                onClick={(e) => handleNavClick(e, '/#contact')}
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white border-none shadow-lg shadow-gold-800/30 px-8 py-3 text-base font-['Inter']"
                data-testid="mobile-cta-btn"
              >
                {t('nav.requestAccess')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* CSS for effects */}
      <style>{`
        .menu-icon:hover .menu-icon__line-left,
        .menu-icon:hover .menu-icon__line-right {
          width: 30px;
        }
        
        .nav-link:hover .nav-underline {
          width: 100%;
          left: 0;
        }
        
        [dir="rtl"] .nav-link:hover .nav-underline {
          right: 0;
          left: auto;
        }
      `}</style>
    </>
  );
};

export default Header;
