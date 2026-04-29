/**
 * Cookie Consent — single source of truth for the banner + preferences dialog.
 *
 * Storage strategy:
 *   - localStorage `kbex_cookie_consent_v1` = canonical record (categories + version + ts)
 *   - cookie `kbex_cc=<analytics><marketing>` (e.g. "10") so SSR/edge can read fast
 *   - backend POST /api/legal/cookie-consent for audit trail
 *
 * Versioning: bump POLICY_VERSION when the cookie list materially changes —
 * stored consents older than the current version are treated as missing,
 * triggering the banner again so users can re-confirm.
 */
const STORAGE_KEY = 'kbex_cookie_consent_v1';
const COOKIE_NAME = 'kbex_cc';
export const POLICY_VERSION = '1.0';

export const DEFAULT_CATEGORIES = {
  essential: true,
  analytics: false,
  marketing: false,
};

export function getStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.policy_version !== POLICY_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsent() {
  return !!getStoredConsent();
}

export function getCategories() {
  const c = getStoredConsent();
  return c?.categories || DEFAULT_CATEGORIES;
}

function writeCookie(categories) {
  const flag = `${categories.analytics ? 1 : 0}${categories.marketing ? 1 : 0}`;
  // 6-month expiry — re-prompt long-dormant users.
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toUTCString();
  // SameSite=Lax + Secure on https — the platform is always served over TLS.
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${flag}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

export function persistConsent(categories, { method = 'banner', language, tenantSlug } = {}) {
  const cats = { ...categories, essential: true };
  const record = {
    categories: cats,
    policy_version: POLICY_VERSION,
    method,
    language: language || (typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : null),
    timestamp: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch { /* quota / private mode — non-fatal */ }
  writeCookie(cats);

  // Fire-and-forget audit log to backend (no auth header — the endpoint is
  // public and supports anonymous events; if a token exists, it will be
  // attached automatically by axios interceptors elsewhere — here we use
  // bare fetch to avoid coupling).
  if (typeof window !== 'undefined') {
    const apiUrl = process.env.REACT_APP_BACKEND_URL;
    if (apiUrl) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const token = sessionStorage.getItem('kryptobox_token');
        if (token) headers.Authorization = `Bearer ${token}`;
        fetch(`${apiUrl}/api/legal/cookie-consent`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            categories: cats,
            language: record.language,
            tenant_slug: tenantSlug || null,
            method,
          }),
          keepalive: true,
        }).catch(() => { /* silent — UX must not block */ });
      } catch { /* silent */ }
    }
  }

  // Notify same-tab listeners (Footer "Manage cookies" button etc.)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kbex:cookie-consent-changed', { detail: record }));
  }
  return record;
}

export function clearConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kbex:cookie-consent-changed', { detail: null }));
  }
}

export const CONSENT_EVENT = 'kbex:cookie-consent-changed';
