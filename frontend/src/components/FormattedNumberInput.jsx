import React, { useState, useCallback } from 'react';
import { Input } from './ui/input';

/**
 * Input that displays numbers with thousand separators (spaces)
 * e.g. 1 000 000 — but stores the raw numeric value
 */
export const FormattedNumberInput = ({ value, onChange, className, placeholder, ...props }) => {
  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value));

  // Format a number for display with space separators
  function formatDisplay(val) {
    if (val === '' || val === null || val === undefined) return '';
    const str = String(val).replace(/\s/g, '');
    if (str === '' || str === '-') return str;
    
    // Handle decimal input
    const parts = str.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (parts.length > 1) {
      return `${intPart}.${parts[1]}`;
    }
    return intPart;
  }

  // Strip to raw number
  function toRaw(val) {
    return val.replace(/\s/g, '');
  }

  const handleChange = useCallback((e) => {
    const input = e.target.value;
    // Allow only digits, dots, spaces
    const cleaned = input.replace(/[^\d.\s]/g, '');
    const raw = toRaw(cleaned);
    
    // Prevent multiple dots
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) return;
    
    setDisplayValue(formatDisplay(raw));
    
    // Emit the raw numeric value
    if (onChange) {
      onChange(raw);
    }
  }, [onChange]);

  // On blur, re-format cleanly
  const handleBlur = useCallback(() => {
    const raw = toRaw(displayValue);
    if (raw === '' || raw === '.') {
      setDisplayValue('');
      return;
    }
    setDisplayValue(formatDisplay(raw));
  }, [displayValue]);

  // On focus, select all for easy overwrite
  const handleFocus = useCallback((e) => {
    e.target.select();
  }, []);

  // Sync if value prop changes externally
  React.useEffect(() => {
    const currentRaw = toRaw(displayValue);
    const newRaw = String(value ?? '').replace(/\s/g, '');
    if (currentRaw !== newRaw) {
      setDisplayValue(formatDisplay(value));
    }
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={className}
      placeholder={placeholder}
      data-testid={props['data-testid']}
      {...props}
    />
  );
};
