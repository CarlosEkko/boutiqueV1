import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import CryptoTicker from './CryptoTicker';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n';
import gsap from 'gsap';

const Header = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t, changeLanguage, isRTL } = useLanguage();
  const cursorRef = useRef(null);
  const cursorPointerRef = useRef(null);
  const trailRefs = useRef([]);

  const navLinks = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.products'), href: '/#products' },
    { name: t('nav.cryptoAtm'), href: '/crypto-atm' },
    { name: t('nav.whyUs'), href: '/#trust' },
    { name: t('nav.regions'), href: '/#regions' },
    { name: t('nav.contact'), href: '/#contact' }
  ];

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'AR', name: 'العربية' }
  ];

  // Custom cursor with glow trail effect
  useEffect(() => {
    const cursor = cursorPointerRef.current;
    const trails = trailRefs.current.filter(Boolean);
    if (!cursor) return;

    // Hide cursor initially
    gsap.set(cursor, { autoAlpha: 0 });
    trails.forEach(trail => gsap.set(trail, { autoAlpha: 0 }));

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    const trailPositions = trails.map(() => ({ x: 0, y: 0 }));

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseEnter = () => {
      gsap.to(cursor, { autoAlpha: 1, duration: 0.3 });
      trails.forEach((trail, i) => {
        gsap.to(trail, { autoAlpha: 0.6 - i * 0.1, duration: 0.3, delay: i * 0.05 });
      });
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, { autoAlpha: 0, duration: 0.3 });
      trails.forEach(trail => gsap.to(trail, { autoAlpha: 0, duration: 0.3 }));
    };

    // Animation loop for smooth cursor movement
    const animate = () => {
      // Smooth cursor follow
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      
      gsap.set(cursor, { x: cursorX, y: cursorY });
      
      // Trail effect - each trail follows the previous with delay
      trails.forEach((trail, i) => {
        const target = i === 0 ? { x: cursorX, y: cursorY } : trailPositions[i - 1];
        trailPositions[i].x += (target.x - trailPositions[i].x) * (0.12 - i * 0.015);
        trailPositions[i].y += (target.y - trailPositions[i].y) * (0.12 - i * 0.015);
        gsap.set(trail, { x: trailPositions[i].x, y: trailPositions[i].y });
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Magnetic effect for links
  useEffect(() => {
    const magneticLinks = document.querySelectorAll('.magnetic-link');
    const cursor = cursorPointerRef.current;
    
    magneticLinks.forEach(link => {
      const span = link.querySelector('span');
      
      const handleMouseMove = (e) => {
        const rect = link.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        
        if (span) {
          gsap.to(span, {
            x: (relX - rect.width / 2) / rect.width * 30,
            y: (relY - rect.height / 2) / rect.height * 30,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      };
      
      const handleMouseLeave = () => {
        if (span) {
          gsap.to(span, { x: 0, y: 0, duration: 0.3 });
        }
      };
      
      const handleMouseEnterLink = () => {
        document.body.classList.add('cursor-hover');
      };
      
      const handleMouseLeaveLink = () => {
        document.body.classList.remove('cursor-hover');
      };
      
      link.addEventListener('mousemove', handleMouseMove);
      link.addEventListener('mouseleave', handleMouseLeave);
      link.addEventListener('mouseenter', handleMouseEnterLink);
      link.addEventListener('mouseleave', handleMouseLeaveLink);
      
      return () => {
        link.removeEventListener('mousemove', handleMouseMove);
        link.removeEventListener('mouseleave', handleMouseLeave);
        link.removeEventListener('mouseenter', handleMouseEnterLink);
        link.removeEventListener('mouseleave', handleMouseLeaveLink);
      };
    });
  }, [isNavOpen, language]);

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
      {/* Custom Cursor with Glow Trail */}
      <div ref={cursorRef} className="c-cursor pointer-events-none hidden lg:block">
        {/* Trail elements */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`trail-${i}`}
            ref={el => trailRefs.current[i] = el}
            className="cursor-trail fixed -left-[6px] -top-[6px] z-[9998] opacity-0"
            style={{
              width: `${12 - i * 1.5}px`,
              height: `${12 - i * 1.5}px`,
            }}
          >
            <div 
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(217,119,6,${0.6 - i * 0.1}) 0%, transparent 70%)`,
                filter: `blur(${i * 1}px)`,
              }}
            />
          </div>
        ))}
        
        {/* Main cursor */}
        <div 
          ref={cursorPointerRef}
          className="c-cursor__pointer fixed w-[14px] h-[14px] -left-[7px] -top-[7px] z-[9999] opacity-0"
        >
          <div className="cursor-dot absolute w-full h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(217,119,6,0.8),0_0_30px_rgba(217,119,6,0.4)] transition-transform duration-300 ease-[cubic-bezier(0.165,0.84,0.44,1)]" />
        </div>
      </div>

      {/* Fixed Header */}
      <header className={`fixed top-0 left-0 w-full z-[100] ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* Crypto Ticker Bar */}
        <div className="bg-black/80 backdrop-blur-md border-b border-amber-900/10 py-2">
          <div className="container mx-auto px-6">
            <CryptoTicker />
          </div>
        </div>

        {/* Main Header */}
        <div className="bg-black/80 backdrop-blur-md border-b border-amber-900/20">
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
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                      <span className="text-black font-bold text-lg md:text-xl font-['Inter']">K</span>
                    </div>
                    <span className="text-xl md:text-2xl font-light text-white font-['Inter']">
                      <span className="text-amber-400">Krypto</span>box.io
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
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-3 py-2 rounded-lg bg-zinc-900/50 border border-amber-900/20 hover:border-amber-700/40 transition-colors duration-300`}>
                <Globe size={16} className="text-amber-400" />
                {languages.map((lang, index) => (
                  <React.Fragment key={lang.code}>
                    <button
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`text-sm font-['Inter'] transition-colors duration-300 ${
                        language === lang.code
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
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 transition-all duration-300 font-['Inter']"
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
                  className={`magnetic-link nav-link relative no-underline overflow-hidden cursor-pointer px-[10px] py-[5px] z-[2] inline-block uppercase tracking-[5px] text-[5vh] md:text-[7vh] leading-[1.3] transition-all duration-200 font-['Inter'] font-light ${
                    isActiveLink(link.href) 
                      ? 'text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                  data-testid={`nav-link-${index}`}
                >
                  <span className="inline-block pointer-events-none">{link.name}</span>
                  <span 
                    className={`nav-underline absolute bottom-[5px] ${isRTL ? 'right-1/2' : 'left-1/2'} h-[3px] bg-amber-500 transition-all duration-300 ${
                      isActiveLink(link.href) 
                        ? `w-full ${isRTL ? 'right-0' : 'left-0'}` 
                        : 'w-0'
                    }`}
                  />
                </a>
              </li>
            ))}
          </ul>

          {/* Mobile Language & CTA in Overlay */}
          <div 
            className={`md:hidden mt-10 transition-all duration-300 ${
              isNavOpen ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: isNavOpen ? '1.3s' : '0s' }}
          >
            <div className={`flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-4 mb-6`}>
              <Globe size={18} className="text-amber-400" />
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <button
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`text-lg font-['Inter'] transition-colors duration-300 ${
                      language === lang.code
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
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 px-8 py-3 text-lg font-['Inter']"
            >
              {t('nav.requestAccess')}
            </Button>
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
        
        /* Cursor hover effect */
        body.cursor-hover .cursor-dot {
          transform: scale(2.5);
          box-shadow: 0 0 25px rgba(217,119,6,1), 0 0 50px rgba(217,119,6,0.6), 0 0 75px rgba(217,119,6,0.3);
        }
        
        body.cursor-hover .cursor-trail > div {
          transform: scale(2);
        }
        
        /* Hide default cursor when custom cursor is active */
        @media (min-width: 1024px) {
          body {
            cursor: none;
          }
          
          a, button, [role="button"] {
            cursor: none;
          }
        }
      `}</style>
    </>
  );
};

export default Header;
