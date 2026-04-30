import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'kbex_access_token';
const USER_KEY = 'kbex_user';
const LANG_KEY = 'kbex_language';

/**
 * Secure token + user profile storage.
 * Access token goes into SecureStore (Keychain on iOS / encrypted SharedPreferences on Android).
 * User profile goes to AsyncStorage (not sensitive).
 */
export const storage = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
  async saveUser<T>(user: T): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async getUser<T>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async clearUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },
  async saveLanguage(lang: string): Promise<void> {
    await AsyncStorage.setItem(LANG_KEY, lang);
  },
  async getLanguage(): Promise<string | null> {
    return AsyncStorage.getItem(LANG_KEY);
  },
};
