# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals with Exchange, OTC Desk, Escrow, Fiat/Crypto Wallets, Onboarding, CRM, Staking, Launchpad/ICO, and automated KYC/KYB.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n translations system)

## Completed Features
- Full Binance-Style Trading Terminal with real-time WebSockets
- OTC CRM with Lead pipeline, Pre-Qualification, Setup, KYC flow
- FATF/GAFI Compliance Check endpoint + Red Flags checklist (fully translated 5 languages)
- Revolut Bank Reconciliation panel
- Launchpad (Client + Admin views)
- Trezor auto-sync hardware wallet
- Global Demo Mode data masking (Axios interceptors)
- Markets page with CoinGecko API + SVG sparklines
- Dynamic client menu permissions from DB
- ProtectedDocViewer (anti-screenshot PDF canvas)
- 5-language translations system (PT, EN, AR, FR, ES)

## Latest - PreQualDialog Translation (2026-04-15)
- **Full i18n integration**: PreQualDialog.jsx now uses `useLanguage()` hook with `t()` function
- **All labels translated**: Client type, operation fields, FATF checklist items, notes, buttons
- **Nested redFlagLabels**: All 5 languages have `otc.redFlagLabels.{flag_id}` translation keys
- **New translation keys added**: redFlagsCompliance, alertCount, autoDetected, selectClientType, fatfBlackList/GreyList, retail/hnwi/companyType, trading/treasury/arbitrage, income/cryptoHoldings, stablecoins/onChain/offChain, bankJurisdictionPlaceholder, generalNotes, submit

## Key Files
- `/app/frontend/src/pages/dashboard/otc/components/PreQualDialog.jsx` - Pre-Qualification modal (translated)
- `/app/frontend/src/i18n/translations.js` - All 5 language translations
- `/app/frontend/src/utils/demoMask.js` - Demo mode masking utilities
- `/app/frontend/src/context/DemoContext.jsx` - Provider with axios/fetch interceptor
- `/app/backend/routes/otc.py` - OTC routes including FATF check

## Pending Issues
- P1: Safari cursor bug (recurring, 15+ times reported)

## Backlog / Future Tasks
- P3: Monitor VPS deployment issues
- Revolut Business API integration (requires user API key)
- Sumsub KYC/KYB integration (requires user API key)

## Credentials
- Admin: carlos@kbex.io / senha123

## Deployment Notes
- Docker: `emergentintegrations` requires `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` in backend Dockerfile
- Nginx CSP must be updated when adding external scripts/WebSockets
- Deploy command: `sudo docker compose build --no-cache && sudo docker compose up -d`
