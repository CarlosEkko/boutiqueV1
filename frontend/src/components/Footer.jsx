import React from 'react';
import { Separator } from './ui/separator';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Products: ['Premium Exchange', 'Crypto ATM Network', 'Exclusive Launchpad', 'Institutional Custody'],
    Company: ['About Us', 'Careers', 'Press', 'Partners'],
    Legal: ['Terms of Service', 'Privacy Policy', 'Compliance', 'Risk Disclosure'],
    Support: ['Help Center', 'Documentation', 'API', 'Contact']
  };

  return (
    <footer className="bg-black border-t border-amber-900/20">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center space-x-2 mb-4 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
                <span className="text-black font-bold text-xl">K</span>
              </div>
              <span className="text-2xl font-light bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                Kryptobox.io
              </span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The boutique exchange for sophisticated investors. Exclusive cryptocurrency services tailored for high-net-worth individuals and institutional clients.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Mail size={16} className="text-amber-400" />
                <span>contact@kryptobox.io</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Phone size={16} className="text-amber-400" />
                <span>+41 (0) 800 KRYPTO</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
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

        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-gray-500 text-sm">
            © {currentYear} Kryptobox.io. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 text-xs text-gray-500">
            <span>Licensed & Regulated</span>
            <span>•</span>
            <span>MiCA Compliant</span>
            <span>•</span>
            <span>Bank-Level Security</span>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-8 pt-8 border-t border-amber-900/10">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Risk Warning:</strong> Cryptocurrency trading involves substantial risk of loss and is not suitable for every investor. 
            The valuation of cryptocurrencies may fluctuate, and as a result, clients may lose more than their original investment. 
            Kryptobox services are available only to eligible institutional and accredited investors in authorized jurisdictions.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
