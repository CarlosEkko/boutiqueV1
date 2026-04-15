import React, { useState, useRef, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { ChevronDown } from 'lucide-react';

const CurrencySelector = ({ className = '' }) => {
  const { currency, setCurrency, supportedCurrencies, currentCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
        data-testid="currency-selector"
      >
        <span className="text-lg">{currentCurrency.flag}</span>
        <span className="text-white font-medium">{currency}</span>
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] overflow-hidden">
          {supportedCurrencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => {
                setCurrency(curr.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors ${
                currency === curr.code ? 'bg-gold-500/10 text-gold-400' : 'text-white'
              }`}
              data-testid={`currency-option-${curr.code}`}
            >
              <span className="text-lg">{curr.flag}</span>
              <div className="text-left">
                <p className="font-medium">{curr.code}</p>
                <p className="text-xs text-gray-400">{curr.name}</p>
              </div>
              {currency === curr.code && (
                <span className="ml-auto text-gold-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
