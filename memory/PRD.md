# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals with Exchange, OTC Desk, Escrow, Fiat/Crypto Wallets, Onboarding, CRM, Staking, Launchpad/ICO, and automated KYC/KYB.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket (depth20 stream)
- Languages: PT, EN, AR, FR, ES (i18n translations system)

## Supported Fiat Currencies
EUR, USD, AED, BRL, GBP, CHF, QAR, SAR, HKD — all with emoji flags and flagcdn.com images

## Completed Features
- Full Binance-Style Trading Terminal with real-time WebSockets
- Order Book with dynamic row calculation (fills full height)
- OTC CRM with Lead pipeline, Pre-Qualification (fully translated), Setup, KYC flow
- FATF/GAFI Compliance Check endpoint + Red Flags checklist (5 languages)
- Revolut Bank Reconciliation panel
- Launchpad (Client + Admin views)
- Trezor auto-sync hardware wallet
- Global Demo Mode data masking (Axios interceptors)
- Markets page with CoinGecko API + SVG sparklines
- Dynamic client menu permissions from DB
- ProtectedDocViewer (anti-screenshot PDF canvas)
- 5-language translations system (PT, EN, AR, FR, ES)
- Fiat currency flags for all 9 currencies across all pages

## Latest Changes (2026-04-15)
- **Fiat flags fix**: Added GBP, CHF, QAR, SAR, HKD to 6 files
- **Order Book refactor**: Dynamic row count based on container height
- **PreQualDialog i18n**: Full translation with useLanguage() hook

## Key Files
- `/app/frontend/src/pages/dashboard/trading/OrderBook.jsx` - Dynamic order book
- `/app/frontend/src/pages/dashboard/trading/useBinanceStream.js` - Binance WS
- `/app/frontend/src/pages/dashboard/TradingTerminal.jsx` - Terminal layout
- `/app/frontend/src/pages/dashboard/WalletsPage.jsx` - Wallets with flags
- `/app/frontend/src/pages/dashboard/otc/components/PreQualDialog.jsx` - PreQual modal
- `/app/frontend/src/i18n/translations.js` - All 5 language translations

## Pending Issues
- P1: Safari cursor bug (recurring, 15+ times reported)

## VPS Deployment
- Directory: `/opt/boutiqueV1`
- Branch on VPS: `main-v1.1` (Emergent saves to `main`)
- Deploy: `cd /opt/boutiqueV1 && git fetch origin && git merge origin/main --no-edit && sudo docker compose build --no-cache && sudo docker compose up -d`
- Docker: `emergentintegrations` requires `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`
- Nginx CSP must be updated when adding external scripts/WebSockets

## Credentials
- Admin: carlos@kbex.io / senha123
