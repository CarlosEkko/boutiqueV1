#!/usr/bin/env bash
# KBEX Mobile — quick launch helper.
# Starts Metro Bundler so you can scan the QR code with Expo Go on your phone.
set -e
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  KBEX Mobile · Expo dev server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Install 'Expo Go' on your phone."
echo "  2. Scan the QR code below."
echo ""

if [ ! -d node_modules ]; then
  echo "Installing dependencies with yarn…"
  yarn install
fi

# --tunnel works across networks without sharing Wi-Fi
exec npx expo start --tunnel
