# KBEX Mobile · iOS + Android

React Native + Expo SDK 52 app for KBEX.io premium Crypto Boutique Exchange.

## Stack
- **Expo SDK 52** · Expo Router v4 (file-based routing) · RN 0.76 New Architecture
- **TypeScript** strict
- **NativeWind** 4 (Tailwind for RN) — gold (`#D4AF37`) on near-black premium theme
- **i18next** + **expo-localization** — reuses the 5 locales from the web (`/app/frontend/src/i18n/locales/`) via symlink
- **expo-secure-store** for JWT (Keychain on iOS / EncryptedSharedPreferences on Android)
- Shared REST API with the existing FastAPI backend (`/api/auth/*`, `/api/me`, etc.)

## Run it on your phone (2 minutes)

### 1. Install Expo Go on your device
- iOS: App Store → "Expo Go"
- Android: Play Store → "Expo Go"

### 2. From this container (or your local dev machine)
```bash
cd /app/mobile
yarn install          # already run — skip if node_modules exists
yarn start            # starts Metro bundler + prints a QR code
```

### 3. Scan the QR with Expo Go
- iOS: use the Camera app
- Android: scan inside Expo Go
The app loads over-the-air with hot reload.

> If you run into `Network request failed` on device, ensure your phone is on the same Wi-Fi as the dev machine **or** use `expo start --tunnel` (slower but works anywhere).

## Environment
- `app.json` → `expo.extra.backendUrl` points to `https://luxury-crypto.preview.emergentagent.com` for dev
- For production builds, override with `EXPO_PUBLIC_BACKEND_URL=https://kbex.io` before running `eas build`

## Folder structure
```
/app/mobile
├── app/                      Expo Router routes
│   ├── _layout.tsx           Root: Providers + auth guard
│   ├── index.tsx             Splash redirect
│   ├── (auth)/login.tsx      Login screen
│   └── (tabs)/               5-tab bottom navigator
│       ├── index.tsx         Home (balance + quick actions + carousel)
│       ├── markets.tsx       Markets (M3)
│       ├── otc.tsx           OTC Desk (M4)
│       ├── portfolio.tsx     Portfolio
│       └── profile.tsx       Profile + language switcher + logout
├── src/
│   ├── api/client.ts         Axios + JWT interceptor + 401 listener
│   ├── auth/
│   │   ├── AuthContext.tsx   Login / logout / session bootstrap
│   │   └── storage.ts        SecureStore + AsyncStorage wrapper
│   ├── i18n/
│   │   ├── index.ts          i18next config (5 languages, RTL support)
│   │   └── locales/          ⇢ symlink to /app/frontend/src/i18n/locales/
│   ├── components/ui.tsx     Button, Card, Row — shared primitives
│   ├── theme/index.ts        Design tokens (gold/ink palette)
│   └── config.ts             Backend URL + app constants
└── assets/                   icon, splash, favicon
```

## Roadmap (KBEX Mobile)
- **M1 — Foundation** ✅ Current: auth, i18n, tabs, home skeleton
- **M2 — Wallets & Push** · real balances, transactions, Expo Notifications
- **M3 — Trading Terminal** · lightweight-charts, order book, buy/sell
- **M4 — OTC + KYC** · chat, camera-based document upload, price alerts
- **M5 — Native Premium** · Face ID / Touch ID, iOS/Android widgets, deep links
- **M6 — Store Submission** · TestFlight, Internal Testing, App Store + Play Store

## Production builds (EAS)
Once Apple Developer + Google Play accounts are ready:
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

## Test credentials
Same accounts as web — e.g. `carlos@kbex.io / senha123` (admin).
