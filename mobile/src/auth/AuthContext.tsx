import React, {
  createContext, useContext, useEffect, useMemo, useState, useCallback,
} from 'react';
import { api, onUnauthorised } from '@/api/client';
import { storage } from './storage';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  name?: string;
  membership_level?: string;
  internal_role?: string;
  tenant_slug?: string;
  [key: string]: unknown;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const storedToken = await storage.getToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setToken(storedToken);
      // Validate token by fetching profile
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
      await storage.saveUser(data);
    } catch {
      await storage.clearToken();
      await storage.clearUser();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const off = onUnauthorised(() => {
      storage.clearToken();
      storage.clearUser();
      setToken(null);
      setUser(null);
    });
    return () => { off(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user: User }>(
      '/auth/login',
      { email, password }
    );
    await storage.saveToken(data.access_token);
    await storage.saveUser(data.user);
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await storage.clearToken();
    await storage.clearUser();
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get<User>('/auth/me');
    setUser(data);
    await storage.saveUser(data);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, token, loading,
    signedIn: !!token && !!user,
    signIn, signOut, refreshProfile,
  }), [user, token, loading, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
