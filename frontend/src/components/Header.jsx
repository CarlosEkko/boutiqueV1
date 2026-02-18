import React, { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { Button } from './ui/button';
import CryptoTicker from './CryptoTicker';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('EN');

  const navLinks = [
    { name: 'Products', href: '#products' },
    { name: 'Why Us', href: '#trust' },
    { name: 'Regions', href: '#regions' },
    { name: 'Contact', href: '#contact' }
  ];

  const languages = [
    { code: 'EN', name: 'English', flag: '🇬🇧' },
    { code: 'AR', name: 'العربية', flag: '🇸🇦' }
  ];

  return (
    <header className="relative bg-black/95 backdrop-blur-sm border-b border-amber-900/20">
      {/* Crypto Ticker Bar */}
      <div className="bg-black/60 backdrop-blur-sm border-b border-amber-900/10 py-2">
        <div className="container mx-auto px-6">
          <CryptoTicker />
        </div>
      </div>

      <nav className="container mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          {/* Logo - Left */}
          <a href="#" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
              <span className="text-black font-bold text-xl">K</span>
            </div>
            <span className="text-2xl font-light bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              Kryptobox.io
            </span>
          </a>

          {/* Desktop Navigation - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1 space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-300 hover:text-amber-400 transition-colors duration-300 text-sm tracking-wide font-medium"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right Side - Language Selector & CTA */}
          <div className="hidden lg:flex items-center space-x-4">
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
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 transition-all duration-300"
            >
              Request Access
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-amber-400"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 space-y-4 border-t border-amber-900/20 pt-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block text-gray-300 hover:text-amber-400 transition-colors duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            
            {/* Mobile Language Selector */}
            <div className="flex items-center space-x-3 pt-2">
              <Globe size={16} className="text-amber-400" />
              {languages.map((lang, index) => (
                <React.Fragment key={lang.code}>
                  <button
                    onClick={() => {
                      setCurrentLang(lang.code);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-sm transition-colors duration-300 ${
                      currentLang === lang.code
                        ? 'text-amber-400 font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                  {index < languages.length - 1 && (
                    <span className="text-amber-900/40">|</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white">
              Request Access
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
