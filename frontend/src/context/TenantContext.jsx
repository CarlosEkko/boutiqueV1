import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_BRANDING = {
  platform_name: 'KBEX',
  logo_url: null,
  favicon_url: null,
  primary_color: '#d4af37',
  accent_color: '#0b0b0b',
  tagline: 'Institutional Crypto Custody',
};

const TenantContext = createContext({
  tenant: null,
  branding: DEFAULT_BRANDING,
  isDefault: true,
  loading: true,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchTenant = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/tenants/resolve`, {
          // Explicitly disable auth interceptor side-effects — public endpoint
          headers: { 'X-Skip-Auth-Redirect': '1' },
        });
        if (!mounted) return;
        setTenant(res.data);
        applyBrandingToDOM(res.data.branding || DEFAULT_BRANDING);
      } catch (e) {
        // On failure, keep DEFAULT_BRANDING — app still functional
        console.warn('Tenant resolve failed, using defaults', e);
        if (mounted) setTenant({ slug: 'kbex', is_default: true, branding: DEFAULT_BRANDING });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTenant();
    return () => { mounted = false; };
  }, []);

  const branding = tenant?.branding || DEFAULT_BRANDING;

  return (
    <TenantContext.Provider
      value={{
        tenant,
        branding,
        isDefault: tenant?.is_default ?? true,
        loading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

function applyBrandingToDOM(branding) {
  const root = document.documentElement;
  if (branding.primary_color) {
    root.style.setProperty('--tenant-primary', branding.primary_color);
  }
  if (branding.accent_color) {
    root.style.setProperty('--tenant-accent', branding.accent_color);
  }
  if (branding.platform_name) {
    document.title = branding.platform_name;
  }
  if (branding.favicon_url) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.favicon_url;
  }
}
