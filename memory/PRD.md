# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket (order book, trades, ticker)
- Integrations: Trezor Connect SDK, Fireblocks, TradingView, Binance API, Revolut Business API, Sumsub, Brevo

## What's Been Implemented (Latest Session - 2026-04-13)
- Fixed TransparencyPage.jsx translation bug (react-i18next → useLanguage)
- Fixed LaunchpadPage.jsx token reference error
- Refactored OTCLeads.jsx (609→178 lines) and AdminTradingPage.jsx (1701→126 lines)
- **Binance-style Trading Terminal** at `/dashboard/trading`:
  - Real-time Order Book, Market Trades, TradingView chart
  - Spot Trading: Limit / Market / Stop-Limit order types
  - Pairs List with 40+ crypto pairs
  - Open Orders panel (Open Orders, Order History, Trade History, Holdings tabs)
  - Cancel order API for users
  - Public `/trading` page (requires login for orders)
  - Trading menu as standalone item in sidebar
- **Reconciliation Dashboard** in Balance Adjustments page:
  - Real-time Revolut vs Platform deposit comparison
  - Discrepancy alerts by currency (Deficit/Excesso/OK)
  - Unreconciled deposits list with details
  - Sync Revolut button + 30s auto-refresh
  - API: GET /api/revolut/reconciliation-overview

## Pending Issues
- P1: Safari cursor bug (recurring)

## Credentials
- Admin: carlos@kbex.io / senha123
