import Constants from 'expo-constants';

/**
 * Backend base URL.
 * Order of precedence:
 *   1. EXPO_PUBLIC_BACKEND_URL env (useful for local dev / custom builds)
 *   2. app.json extra.backendUrl
 *   3. Production fallback (kbex.io)
 */
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Constants.expoConfig?.extra as Record<string, string> | undefined)?.backendUrl ||
  'https://kbex.io';

export const APP_NAME = 'KBEX';
export const APP_TAGLINE = 'The Boutique Crypto Exchange';
