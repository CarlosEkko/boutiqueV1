import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { BACKEND_URL } from '@/config';
import { storage } from '@/auth/storage';

export const api: AxiosInstance = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Global listener for 401 responses — lets the AuthProvider hear about expired sessions.
 */
type Listener = () => void;
const unauthorisedListeners = new Set<Listener>();

export const onUnauthorised = (cb: Listener) => {
  unauthorisedListeners.add(cb);
  return () => unauthorisedListeners.delete(cb);
};

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      unauthorisedListeners.forEach((cb) => cb());
    }
    return Promise.reject(error);
  }
);
