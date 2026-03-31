import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const SESSION_KEY = 'kryptobox_token';
const SESSION_TIMESTAMP_KEY = 'kryptobox_session_ts';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // Check if session is still valid on load
    const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    const ts = sessionStorage.getItem(SESSION_TIMESTAMP_KEY) || localStorage.getItem(SESSION_TIMESTAMP_KEY);
    if (stored && ts) {
      const elapsed = Date.now() - parseInt(ts, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        // Session expired - clear everything
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_TIMESTAMP_KEY);
        return null;
      }
      return stored;
    }
    // Migrate old localStorage token to sessionStorage
    if (stored) {
      sessionStorage.setItem(SESSION_KEY, stored);
      sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      localStorage.removeItem(SESSION_KEY);
      return stored;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef(null);
  const lastActivity = useRef(Date.now());

  // Logout function
  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    lastActivity.current = Date.now();
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    inactivityTimer.current = setTimeout(() => {
      if (token) {
        logout();
        window.location.href = '/auth';
      }
    }, INACTIVITY_TIMEOUT);
  }, [token, logout]);

  // Set up activity listeners
  useEffect(() => {
    if (!token) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetInactivityTimer();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer(); // Start timer

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [token, resetInactivityTimer]);

  // Set axios default header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Fetch user data on mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/api/auth/me`);
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = async (userData) => {
    const response = await axios.post(`${API_URL}/api/auth/register`, userData);
    const { access_token, user: userData_ } = response.data;
    sessionStorage.setItem(SESSION_KEY, access_token);
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    localStorage.removeItem(SESSION_KEY);
    setToken(access_token);
    setUser(userData_);
    return userData_;
  };

  const login = async (email, password, turnstile_token = null) => {
    const payload = { email, password };
    if (turnstile_token) payload.turnstile_token = turnstile_token;
    const response = await axios.post(`${API_URL}/api/auth/login`, payload);
    const { access_token, user: userData } = response.data;
    sessionStorage.setItem(SESSION_KEY, access_token);
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    localStorage.removeItem(SESSION_KEY);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const updateProfile = async (updateData) => {
    const response = await axios.put(`${API_URL}/api/auth/me`, updateData);
    setUser(response.data);
    return response.data;
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`);
        setUser(response.data);
        return response.data;
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
    return null;
  };

  const needsOnboarding = () => {
    if (!user) return false;
    if (user.user_type === 'internal') return false;
    return !user.is_onboarded;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    needsOnboarding,
    register,
    login,
    logout,
    updateProfile,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
