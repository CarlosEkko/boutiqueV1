import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(() => {
    // Get from localStorage or default to EUR
    return localStorage.getItem('kbex_currency') || 'EUR';
  });
  
  const [exchangeRates, setExchangeRates] = useState({
    USD: 1.0,
    EUR: 0.92,
    AED: 3.67,
    CHF: 0.88,
    QAR: 3.64,
    SAR: 3.75,
    HKD: 7.80,
  });
  
  const [loading, setLoading] = useState(false);

  const supportedCurrencies = [
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR', flag: '🇶🇦' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', flag: '🇸🇦' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  ];

  const getCurrencyInfo = (code) => {
    return supportedCurrencies.find(c => c.code === code) || supportedCurrencies[0];
  };

  const currentCurrency = getCurrencyInfo(currency);

  // Fetch exchange rates on mount and every 5 minutes
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/trading/exchange-rates`);
        setExchangeRates(response.data.rates);
      } catch (err) {
        console.error('Failed to fetch exchange rates', err);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const setCurrency = (newCurrency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('kbex_currency', newCurrency);
  };

  // Convert USD to selected currency
  const convertFromUSD = (amountUSD) => {
    if (!amountUSD || isNaN(amountUSD)) return 0;
    const rate = exchangeRates[currency] || 1;
    return amountUSD * rate;
  };

  // Convert selected currency to USD
  const convertToUSD = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    const rate = exchangeRates[currency] || 1;
    return rate > 0 ? amount / rate : amount;
  };

  // Convert between any two currencies
  const convert = (amount, fromCurrency, toCurrency) => {
    if (!amount || isNaN(amount)) return 0;
    
    // First convert to USD
    const fromRate = exchangeRates[fromCurrency] || 1;
    const amountUSD = fromRate > 0 ? amount / fromRate : amount;
    
    // Then convert to target currency
    const toRate = exchangeRates[toCurrency] || 1;
    return amountUSD * toRate;
  };

  // Format currency with symbol (using space as thousand separator)
  const formatCurrency = (amount, currencyCode = null) => {
    const curr = currencyCode ? getCurrencyInfo(currencyCode) : currentCurrency;
    const value = parseFloat(amount || 0);
    
    // Format with 2 decimal places and space as thousand separator
    const parts = value.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const formatted = parts.join('.');
    
    // Position symbol based on currency convention
    switch (curr.code) {
      case 'EUR': return `€${formatted}`;
      case 'USD': return `$${formatted}`;
      case 'HKD': return `HK$${formatted}`;
      case 'AED': return `${formatted} AED`;
      case 'CHF': return `${formatted} CHF`;
      case 'QAR': return `${formatted} QAR`;
      case 'SAR': return `${formatted} SAR`;
      default:   return `${curr.symbol}${formatted}`;
    }
  };

  // Format crypto amount (with space as thousand separator)
  const formatCrypto = (amount, symbol = '', decimals = null) => {
    const value = parseFloat(amount || 0);
    const dec = decimals !== null ? decimals : (symbol === 'BTC' || symbol === 'ETH' ? 8 : 2);
    
    // Format with decimals and space as thousand separator
    const fixed = value.toFixed(dec);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const formatted = parts.join('.');
    
    return symbol ? `${formatted} ${symbol}` : formatted;
  };

  const value = {
    currency,
    setCurrency,
    currentCurrency,
    supportedCurrencies,
    exchangeRates,
    loading,
    convertFromUSD,
    convertToUSD,
    convert,
    formatCurrency,
    formatCrypto,
    getCurrencyInfo
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
