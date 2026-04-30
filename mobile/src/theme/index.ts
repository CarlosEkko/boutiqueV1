/**
 * Shared design tokens for KBEX mobile.
 * Values mirror the web /app/frontend tailwind config for visual parity.
 */
export const theme = {
  colors: {
    bg: '#0a0a0a',
    bgElevated: '#111111',
    surface: '#1a1a1a',
    surfaceHover: '#262626',
    border: 'rgba(212,175,55,0.15)', // gold 500 @ 15%
    borderStrong: 'rgba(212,175,55,0.35)',
    text: '#ffffff',
    textMuted: '#a3a3a3',
    textFaint: '#737373',
    gold: '#d4af37',
    goldHover: '#e1c164',
    goldDim: '#b8932b',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
  },
  radius: { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
} as const;
