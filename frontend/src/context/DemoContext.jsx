import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { maskObject, maskArray } from '../utils/demoMask';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Fields that indicate the response contains sensitive data
const SENSITIVE_FIELDS = ['user_name', 'user_email', 'contact_name', 'contact_email', 'entity_name', 'iban', 'account_holder', 'counterparty_name', 'phone', 'contact_phone', 'bank_name', 'swift_bic'];

// API paths that should NOT be masked (auth, demo, config)
const SKIP_PATHS = ['/api/auth/', '/api/demo/', '/api/permissions/menus', '/api/trading/markets', '/api/launchpad/sales', '/api/trading/fees'];

const hasSensitiveFields = (obj) => {
  if (!obj || typeof obj !== 'object') return false;
  return SENSITIVE_FIELDS.some(f => obj[f] !== undefined && obj[f] !== null && obj[f] !== '');
};

const deepMask = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => deepMask(item));
  }
  if (typeof data === 'object') {
    // If this object has sensitive fields, mask it
    let result = hasSensitiveFields(data) ? maskObject(data) : { ...data };

    // Recurse into nested arrays/objects that might contain sensitive data
    for (const key of Object.keys(result)) {
      const val = result[key];
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        result[key] = val.map(item => deepMask(item));
      } else if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        if (hasSensitiveFields(val)) {
          result[key] = maskObject(val);
        }
      }
    }
    return result;
  }
  return data;
};

const DemoContext = createContext({
  demoMode: false,
  demoAuthorized: false,
  sections: [],
  loading: false,
  toggleDemo: () => {},
  hasSection: () => false,
});

export const DemoProvider = ({ children }) => {
  const { token } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [demoAuthorized, setDemoAuthorized] = useState(false);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const interceptorRef = useRef(null);

  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/demo/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemoMode(data.demo_mode);
      setDemoAuthorized(data.demo_authorized);
      setSections(data.sections || []);
    } catch {
      setDemoAuthorized(false);
    }
  }, [token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Axios response interceptor for demo mode masking
  useEffect(() => {
    // Remove previous interceptor
    if (interceptorRef.current !== null) {
      axios.interceptors.response.eject(interceptorRef.current);
      interceptorRef.current = null;
    }

    if (demoMode) {
      interceptorRef.current = axios.interceptors.response.use(
        (response) => {
          const url = response.config?.url || '';
          // Skip masking for auth, demo, and config endpoints
          if (SKIP_PATHS.some(p => url.includes(p))) return response;

          // Mask response data
          if (response.data) {
            response.data = deepMask(response.data);
          }
          return response;
        },
        (error) => Promise.reject(error)
      );

      // Also intercept native fetch for pages that use it
      if (!window._originalFetch) {
        window._originalFetch = window.fetch;
      }
      window.fetch = async (...args) => {
        const response = await window._originalFetch(...args);
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (SKIP_PATHS.some(p => url.includes(p))) return response;

        // Clone and mask json responses
        const clone = response.clone();
        const origJson = response.json.bind(response);
        response.json = async () => {
          try {
            const data = await clone.json();
            return deepMask(data);
          } catch {
            return origJson();
          }
        };
        return response;
      };
    } else {
      // Restore original fetch
      if (window._originalFetch) {
        window.fetch = window._originalFetch;
      }
    }

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
        interceptorRef.current = null;
      }
      if (window._originalFetch) {
        window.fetch = window._originalFetch;
      }
    };
  }, [demoMode]);

  const toggleDemo = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/demo/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemoMode(data.demo_mode);
      setTimeout(() => window.location.reload(), 300);
    } catch {
      // handled by caller
    } finally {
      setLoading(false);
    }
  };

  const hasSection = useCallback((sectionId) => {
    if (!demoMode) return false;
    return sections.includes(sectionId);
  }, [demoMode, sections]);

  return (
    <DemoContext.Provider value={{ demoMode, demoAuthorized, sections, loading, toggleDemo, hasSection }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
