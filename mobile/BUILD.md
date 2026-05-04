# KBEX Mobile — Build Instructions

## Quick Start (Android APK Production)

Run these commands on your **local Mac** (not on the VPS):

```bash
# 1. Install eas-cli globally (first time only)
npm install -g eas-cli

# 2. Go to the mobile folder
cd /path/to/boutiqueV1/mobile

# 3. Log in with your Expo account
eas login

# 4. Link this project to your Expo account (first time only).
#    This will inject the projectId into app.json automatically.
eas init

# 5. Trigger the production Android APK build
eas build --platform android --profile production
```

After ~10–15 minutes EAS will email you (and print on terminal) a **download URL** for the APK. Open it on your Android phone, allow "Install from unknown sources" if prompted, and the app installs.

---

## Profiles available (`eas.json`)

| Profile | Platform | Output | Purpose |
|---|---|---|---|
| `development` | both | dev-client | Hot-reload development builds |
| `preview` | Android APK / iOS Simulator | sideloadable APK | Internal testing |
| `production` | Android APK / iOS device | sideloadable APK | Production release for direct install |
| `production-store` | Android AAB | bundle for Play Store | When you have a Play Store account |

---

## When you have an Apple Developer Account later

```bash
eas build --platform ios --profile production
```

EAS will prompt for your Apple ID — once authenticated it auto-generates certificates, provisioning profile and uploads to TestFlight or returns an `.ipa` for direct install.

---

## Backend URL behaviour

The mobile app reads the backend URL in this order:
1. `process.env.EXPO_PUBLIC_BACKEND_URL` — set by `eas.json` per profile
2. `Constants.expoConfig.extra.backendUrl` — set in `app.json`
3. Hard-coded fallback: `https://kbex.io`

**Both `app.json` and `eas.json` already point production builds to `https://kbex.io`.**

---

## Permissions declared

- **Camera**: `NSCameraUsageDescription` (iOS) + `CAMERA` (Android) — for Sumsub KYC WebView
- **Microphone**: `NSMicrophoneUsageDescription` (iOS) + `RECORD_AUDIO` (Android) — for liveness check
- **Notifications**: managed by `expo-notifications` plugin with KBEX gold accent (`#d4af37`)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `eas init` asks for projectId | Run it; it'll create one and patch `app.json` automatically |
| Build fails with "no Expo account" | Run `eas login` first |
| APK installs but crashes on launch | Ensure `https://kbex.io` is reachable from the phone (not blocked by VPN/firewall) |
| Push notifications don't work in production build | Make sure `aps-environment` is set in iOS provisioning + `google-services.json` is uploaded for Android FCM (EAS prompts you on first build) |
