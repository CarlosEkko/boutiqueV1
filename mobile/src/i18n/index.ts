import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { storage } from '@/auth/storage';

// Reuse the 5 locale files from the web codebase (symlink from scripts/link-locales.sh).
// If the symlink is absent in the mobile build, fallback to EN-only to avoid crash.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let locales: Record<string, any> = {};
try {
   
  const en = require('./locales/en.js').default;
   
  const pt = require('./locales/pt.js').default;
   
  const ar = require('./locales/ar.js').default;
   
  const fr = require('./locales/fr.js').default;
   
  const es = require('./locales/es.js').default;
  locales = { EN: en, PT: pt, AR: ar, FR: fr, ES: es };
} catch (err) {
   
  console.warn('[i18n] locale files not found — EN-only fallback', err);
  locales = { EN: {} };
}

const resources = Object.fromEntries(
  Object.entries(locales).map(([code, dict]) => [code.toLowerCase(), { translation: dict }])
);

const SUPPORTED = ['en', 'pt', 'ar', 'fr', 'es'];

async function detectInitialLanguage(): Promise<string> {
  const saved = await storage.getLanguage();
  if (saved && SUPPORTED.includes(saved.toLowerCase())) return saved.toLowerCase();
  const deviceLang = Localization.getLocales()[0]?.languageCode || 'en';
  return SUPPORTED.includes(deviceLang) ? deviceLang : 'en';
}

export async function initI18n() {
  const lng = await detectInitialLanguage();
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnNull: false,
  });
}

export async function changeLanguage(lng: string) {
  const normalized = lng.toLowerCase();
  if (!SUPPORTED.includes(normalized)) return;
  await i18n.changeLanguage(normalized);
  await storage.saveLanguage(normalized);
}

export const isRTL = () => i18n.language === 'ar';

export { SUPPORTED as SUPPORTED_LANGUAGES };
export default i18n;
