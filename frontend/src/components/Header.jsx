import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import CryptoTicker from './CryptoTicker';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('EN');
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: 'Home', href: '/', external: false },
    { name: 'Products', href: '/#products', external: false },
    { name: 'Crypto ATM', href: '/crypto-atm', external: false },
    { name: 'Why Us', href: '/#trust', external: false },
    { name: 'Regions', href: '/#regions', external: false },
    { name: 'Contact', href: '/#contact', external: false }
  ];

  const languages = [
    { code: 'EN', name: 'English' },
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

  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 w-full z-[100]">
        {/* Crypto Ticker Bar */}
        <div className="bg-black/80 backdrop-blur-md border-b border-amber-900/10 py-2">
          <div className="container mx-auto px-6">
            <CryptoTicker />
          </div>
        </div>

        {/* Main Header */}
        <div className="bg-black/80 backdrop-blur-md border-b border-amber-900/20">
          <div className="header-wrapper relative w-[calc(100%-100px)] mx-auto md:ml-[50px]">
            {/* Logo */}
            <div className="absolute left-0 top-[20px] md:top-[30px] cursor-pointer z-[101]">
              <a 
                href="/" 
                onClick={(e) => handleNavClick(e, '/')} 
                className="flex items-center space-x-2 group transition-opacity duration-300 hover:opacity-90"
                data-testid="header-logo"
              >
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                  <span className="text-black font-bold text-lg md:text-xl">K</span>
                </div>
                <span className="text-xl md:text-2xl font-light text-white">
                  <span className="text-amber-400">Krypto</span>box.io
                </span>
              </a>
            </div>

            {/* Menu Icon (Hamburger) */}
            <div className="nav-but-wrap relative inline-block float-right pl-4 pt-4 mt-[16px] md:mt-[20px] transition-all duration-300">
              <div 
                className="menu-icon h-[30px] w-[30px] relative z-[102] cursor-pointer block"
                onClick={() => setIsNavOpen(!isNavOpen)}
                data-testid="menu-toggle"
              >
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
                  className={`menu-icon__line menu-icon__line-right h-[2px] block bg-white float-right cursor-pointer transition-all duration-200 ${
                    isNavOpen ? 'w-[15px] transform -translate-x-[3px] -translate-y-[3.5px] rotate-45' : 'w-[16.5px]'
                  }`}
                />
              </div>
            </div>

            {/* Right Side - Language & CTA (Desktop) */}
            <div className="hidden md:flex items-center space-x-4 float-right mt-[24px] mr-[70px]">
              {/* Language Selector */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-amber-900/20 hover:border-amber-700/40 transition-colors duration-300">
                <Globe size={16} className="text-amber-400" />
                {languages.map((lang, index) => (
                  <React.Fragment key={lang.code}>
                    <button
                      onClick={() => setCurrentLang(lang.code)}
                      className={`text-sm transition-colors duration-300 ${
                        currentLang === lang.code
                          ? 'text-amber-400 font-medium'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      data-testid={`lang-${lang.code.toLowerCase()}`}
                    >
                      {lang.code}
                    </button>
                    {index < languages.length - 1 && (
                      <span className="text-amber-900/40">|</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <Button
                onClick={(e) => handleNavClick(e, '/#contact')}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 transition-all duration-300"
                data-testid="header-cta"
              >
                Request Access
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
          className={`fixed w-screen h-screen bg-black/60 rounded-bl-[200%] z-[-1] transition-all duration-[600ms] ease-[cubic-bezier(0.77,0,0.175,1)] ${
            isNavOpen 
              ? 'transform translate-x-0 translate-y-0 rounded-none delay-100' 
              : 'transform translate-x-full -translate-y-full delay-0'
          }`}
        />
        <div 
          className={`fixed w-screen h-screen bg-black rounded-bl-[200%] z-[-1] transition-all duration-[600ms] ease-[cubic-bezier(0.77,0,0.175,1)] ${
            isNavOpen 
              ? 'transform translate-x-0 translate-y-0 rounded-none delay-0' 
              : 'transform translate-x-full -translate-y-full delay-200'
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
                key={link.name}
                className={`nav__list-item relative block text-center overflow-hidden transition-all duration-300 ${
                  isNavOpen 
                    ? 'opacity-100 transform translate-x-0' 
                    : 'opacity-0 transform translate-x-[100px]'
                }`}
                style={{
                  transitionDelay: isNavOpen ? `${0.7 + index * 0.1}s` : '0s'
                }}
              >
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={`nav-link relative no-underline overflow-hidden cursor-pointer px-[5px] font-black z-[2] inline-block uppercase tracking-[3px] text-[6vh] md:text-[8vh] leading-[1.15] transition-all duration-200 ${
                    isActiveLink(link.href) 
                      ? 'text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                  data-testid={`nav-link-${link.name.toLowerCase().replace(' ', '-')}`}
                >
                  {link.name}
                  <span 
                    className={`absolute content-[''] top-1/2 -mt-[2px] left-1/2 h-0 opacity-0 bg-amber-500 z-[1] transition-all duration-200 ${
                      isActiveLink(link.href) 
                        ? 'h-[4px] opacity-100 left-0 w-full' 
                        : 'w-0 hover:h-[4px] hover:opacity-100 hover:left-0 hover:w-full'
                    }`}
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* Mobile Language & CTA in Overlay */}
          <div 
            className={`md:hidden mt-10 transition-all duration-300 ${
              isNavOpen ? 'opacity-100 delay-[1.3s]' : 'opacity-0'
            }`}
          >
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Globe size={18} className="text-amber-400" />
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <button
                    onClick={() => setCurrentLang(lang.code)}
                    className={`text-lg transition-colors duration-300 ${
                      currentLang === lang.code
                        ? 'text-amber-400 font-medium'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {lang.code}
                  </button>
                  {index < languages.length - 1 && (
                    <span className="text-amber-900/40">|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <Button
              onClick={(e) => handleNavClick(e, '/#contact')}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 px-8 py-3 text-lg"
            >
              Request Access
            </Button>
          </div>
        </div>
      </nav>

      {/* CSS for hover effects */}
      <style>{`
        .menu-icon:hover .menu-icon__line-left,
        .menu-icon:hover .menu-icon__line-right {
          width: 30px;
        }
        
        .nav-link:hover span,
        .nav-link.active span {
          height: 4px;
          opacity: 1;
          left: 0;
          width: 100%;
        }
      `}</style>
    </>
  );
};

export default Header;
