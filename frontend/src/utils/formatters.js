/**
 * Number formatting utilities for KBEX
 * Uses space as thousand separator (European style): 1 000 000.00
 */

/**
 * Format a number with thousand separators (space) and decimal places
 * @param {number|string} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {boolean} showDecimals - Whether to show decimals (default: true)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 2, showDecimals = true) => {
  if (value === null || value === undefined || value === '') return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // Format with decimals
  const fixed = showDecimals ? num.toFixed(decimals) : Math.floor(num).toString();
  
  // Split into integer and decimal parts
  const parts = fixed.split('.');
  
  // Add thousand separators (space) to integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return parts.join('.');
};

/**
 * Format currency with symbol and thousand separators
 * @param {number|string} value - The amount to format
 * @param {string} currency - Currency code (EUR, USD, AED, BRL, USDT, etc.)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'EUR', decimals = 2) => {
  const symbols = {
    EUR: '€',
    USD: '$',
    AED: 'د.إ',
    BRL: 'R$',
    USDT: '$',
    USDC: '$',
    GBP: '£',
    CHF: 'CHF'
  };
  
  const symbol = symbols[currency] || currency;
  const formatted = formatNumber(value, decimals);
  
  // For EUR, symbol comes after the number in some locales
  // For USD/GBP, symbol comes before
  if (['EUR', 'AED', 'BRL'].includes(currency)) {
    return `${formatted} ${symbol}`;
  }
  
  return `${symbol} ${formatted}`;
};

/**
 * Format crypto amount (up to 8 decimal places, trimmed)
 * @param {number|string} value - The crypto amount
 * @param {number} maxDecimals - Maximum decimal places (default: 8)
 * @returns {string} Formatted crypto amount
 */
export const formatCrypto = (value, maxDecimals = 8) => {
  if (value === null || value === undefined || value === '') return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // For very small numbers, show more decimals
  if (num > 0 && num < 0.00001) {
    return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
  }
  
  // For larger numbers, use standard formatting with trimmed decimals
  const fixed = num.toFixed(maxDecimals);
  const trimmed = fixed.replace(/\.?0+$/, '');
  
  // Add thousand separators to integer part
  const parts = trimmed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return parts.join('.');
};

/**
 * Parse a formatted number string back to a number
 * @param {string} value - Formatted string with spaces
 * @returns {number} Parsed number
 */
export const parseFormattedNumber = (value) => {
  if (!value) return 0;
  // Remove spaces and replace comma with dot for decimals
  const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

/**
 * Format number for input fields (removes spaces while typing)
 * @param {string} value - Input value
 * @returns {string} Cleaned number string
 */
export const cleanNumberInput = (value) => {
  if (!value) return '';
  return value.replace(/[^\d.,-]/g, '');
};

/**
 * Safely extract error message from API error response
 * Handles Pydantic validation errors and other error formats
 * @param {Error} err - Error object from axios catch
 * @param {string} defaultMsg - Default message if extraction fails
 * @returns {string} Human-readable error message
 */
export const getErrorMessage = (err, defaultMsg = 'Erro na operação') => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => e.msg || e.message || String(e)).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  return err?.message || defaultMsg;
};

export default {
  formatNumber,
  formatCurrency,
  formatCrypto,
  parseFormattedNumber,
  cleanNumberInput,
  getErrorMessage
};
