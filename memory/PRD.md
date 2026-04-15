# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals with Exchange, OTC Desk, Escrow, Fiat/Crypto Wallets, Onboarding, CRM, Staking, Launchpad/ICO, and automated KYC/KYB.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n translations system)

## Supported Fiat Currencies
EUR, USD, AED, BRL, GBP, CHF, QAR, SAR, HKD — all with emoji flags and flagcdn.com images

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
- PreQualDialog fully translated with i18n system
- Fiat currency flags for all 9 currencies across all pages

## Latest Changes (2026-04-15)
- **PreQualDialog i18n**: All labels, placeholders, select options, FATF checklist translated via `useLanguage()` + `t()`
- **Fiat currency flags fix**: Added GBP, CHF, QAR, SAR, HKD flags to WalletsPage, DashboardOverview, FiatWithdrawalPage, AdminFiatDeposits, AdminFiatWithdrawals, useAdminTrading

## Key Files
- `/app/frontend/src/pages/dashboard/WalletsPage.jsx` - Wallets page with fiatFlags
- `/app/frontend/src/pages/dashboard/DashboardOverview.jsx` - Dashboard with fiatFlags (flagcdn URLs)
- `/app/frontend/src/pages/dashboard/otc/components/PreQualDialog.jsx` - Pre-Qualification modal
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
