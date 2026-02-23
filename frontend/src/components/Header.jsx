import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';
import CryptoTicker from './CryptoTicker';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';

const Header = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('EN');
  const navigate = useNavigate();
  const location = useLocation();
  const cursorRef = useRef(null);
  const cursorPointerRef = useRef(null);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/#products' },
    { name: 'Crypto ATM', href: '/crypto-atm' },
    { name: 'Why Us', href: '/#trust' },
    { name: 'Regions', href: '/#regions' },
    { name: 'Contact', href: '/#contact' }
  ];

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'AR', name: 'العربية' }
  ];

  // Custom cursor effect
  useEffect(() => {
    const cursor = cursorPointerRef.current;
    if (!cursor) return;

    // Hide cursor initially
    gsap.set(cursor, { autoAlpha: 0 });

    const handleMouseMove = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.5,
        ease: 'power4.out'
      });
    };

    const handleMouseEnter = () => {
      gsap.to(cursor, { autoAlpha: 1, duration: 0.3 });
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, { autoAlpha: 0, duration: 0.3 });
    };

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
        
        // Move the text inside the link
        if (span) {
          gsap.to(span, {
            x: (relX - rect.width / 2) / rect.width * 30,
            y: (relY - rect.height / 2) / rect.height * 30,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
        
        // Move cursor towards link center
        if (cursor) {
          const posX = rect.left + rect.width / 2 + (relX - rect.width / 2) / 1.5;
          const posY = rect.top + rect.height / 2 + (relY - rect.height / 2) / 1.5;
          gsap.to(cursor, {
            x: posX,
            y: posY,
            duration: 0.3
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
  }, [isNavOpen]);

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
      {/* Custom Cursor */}
      <div ref={cursorRef} className="c-cursor pointer-events-none hidden lg:block">
        <div 
          ref={cursorPointerRef}
          className="c-cursor__pointer fixed w-[14px] h-[14px] -left-[7px] -top-[7px] z-[9999] opacity-0"
        >
          <div className="cursor-dot absolute w-full h-full bg-amber-500 rounded-full transition-transform duration-[600ms] ease-[cubic-bezier(0.165,0.84,0.44,1)]" />
        </div>
      </div>

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
          <div className="header-wrapper relative w-[calc(100%-60px)] md:w-[calc(100%-100px)] mx-auto md:ml-[50px]">
            {/* Logo */}
            <div className="absolute left-0 top-[20px] md:top-[30px] cursor-pointer z-[101]">
              <a 
                href="/" 
                onClick={(e) => handleNavClick(e, '/')} 
                className="magnetic-link flex items-center space-x-2 group transition-opacity duration-300 hover:opacity-90"
                data-testid="header-logo"
              >
                <span className="inline-block">
                  <div className="flex items-center space-x-2">
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
            <div className="nav-but-wrap relative inline-block float-right pl-4 pt-4 mt-[16px] md:mt-[20px] transition-all duration-300">
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
                    className={`menu-icon__line menu-icon__line-right h-[2px] block bg-white float-right cursor-pointer transition-all duration-200 ${
                      isNavOpen ? 'w-[15px] transform -translate-x-[3px] -translate-y-[3.5px] rotate-45' : 'w-[16.5px]'
                    }`}
                  />
                </span>
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
                      className={`text-sm font-['Inter'] transition-colors duration-300 ${
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
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 transition-all duration-300 font-['Inter']"
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
                  className={`magnetic-link nav-link relative no-underline overflow-hidden cursor-pointer px-[10px] py-[5px] z-[2] inline-block uppercase tracking-[5px] text-[5vh] md:text-[7vh] leading-[1.3] transition-all duration-200 font-['Inter'] font-light ${
                    isActiveLink(link.href) 
                      ? 'text-white' 
                      : 'text-white/60 hover:text-white'
                  }`}
                  data-testid={`nav-link-${link.name.toLowerCase().replace(' ', '-')}`}
                >
                  <span className="inline-block pointer-events-none">{link.name}</span>
                  <span 
                    className={`nav-underline absolute bottom-[5px] left-1/2 h-[3px] bg-amber-500 transition-all duration-300 ${
                      isActiveLink(link.href) 
                        ? 'w-full left-0' 
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
            <div className="flex items-center justify-center space-x-4 mb-6">
              <Globe size={18} className="text-amber-400" />
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <button
                    onClick={() => setCurrentLang(lang.code)}
                    className={`text-lg font-['Inter'] transition-colors duration-300 ${
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
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 px-8 py-3 text-lg font-['Inter']"
            >
              Request Access
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
        
        /* Cursor hover effect */
        body.cursor-hover .cursor-dot {
          transform: scale(3.5);
          opacity: 0.3;
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
