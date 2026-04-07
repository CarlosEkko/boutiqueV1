import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DemoContext = createContext({
  demoMode: false,
  demoAuthorized: false,
  loading: false,
  toggleDemo: () => {},
});

export const DemoProvider = ({ children }) => {
  const { token } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [demoAuthorized, setDemoAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/demo/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemoMode(data.demo_mode);
      setDemoAuthorized(data.demo_authorized);
    } catch {
      setDemoAuthorized(false);
    }
  }, [token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const toggleDemo = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/demo/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemoMode(data.demo_mode);
      // Reload page to refresh all data
      setTimeout(() => window.location.reload(), 300);
    } catch {
      // handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <DemoContext.Provider value={{ demoMode, demoAuthorized, loading, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => useContext(DemoContext);
