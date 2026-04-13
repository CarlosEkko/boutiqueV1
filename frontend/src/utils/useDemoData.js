/**
 * useDemoData hook - Wraps data with demo masking when demo mode is active.
 * Usage: const safeData = useDemoData(realData);
 * Usage for arrays: const safeList = useDemoData(realList, true);
 */
import { useMemo } from 'react';
import { useDemo } from '../context/DemoContext';
import { maskObject, maskArray, maskAmount } from './demoMask';

/**
 * Hook that returns masked data when demo mode is active
 * @param {any} data - The real data to potentially mask
 * @param {boolean} isArray - Whether data is an array of objects
 * @returns {any} - Masked data if demo mode, original data otherwise
 */
export const useDemoData = (data, isArray = false) => {
  const { demoMode } = useDemo();

  return useMemo(() => {
    if (!demoMode || !data) return data;
    if (isArray) return maskArray(data);
    if (typeof data === 'object' && !Array.isArray(data)) return maskObject(data);
    return data;
  }, [demoMode, data, isArray]);
};

/**
 * Hook that returns a masking function (for use in callbacks/renders)
 * @returns {{ mask, maskList, maskVal, isDemoMode }}
 */
export const useDemoMask = () => {
  const { demoMode } = useDemo();

  return useMemo(() => ({
    isDemoMode: demoMode,
    mask: (obj) => demoMode ? maskObject(obj) : obj,
    maskList: (arr) => demoMode ? maskArray(arr) : arr,
    maskVal: (val) => demoMode ? maskAmount(val) : val,
  }), [demoMode]);
};
