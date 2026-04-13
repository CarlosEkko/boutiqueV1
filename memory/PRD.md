# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include an Exchange, OTC Desk, Escrow Module, Fiat/Crypto Wallets, Onboarding, CRM, Staking, Launchpad/ICO, and automated KYC/KYB.

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury", trust, exclusivity in UI/UX
- Integration with Revolut Business API for fiat deposit reconciliation
- Invite-only platform (public users can only "Request Access")
- Hardware wallet integration (Trezor)

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket (order book, trades, ticker)
- Integrations: Trezor Connect SDK, Fireblocks, TradingView, Binance API, Sumsub, Brevo

## What's Been Implemented
- Full OTC CRM, Trezor integration (auto-sync), Sumsub KYC/KYB, Launchpad
- Real-time WebSocket crypto prices
- Full 5-language translations
- Commercial Dashboard with analytics, seller details, "A Minha Performance"
- ProtectedDocViewer (anti-screenshot, anti-print PDF viewer)
- Cold Wallet UI (Trezor Suite style)
- Code Quality cleanup (circular imports, hook dependencies)
- TransparencyPage.jsx fully translated (2026-04-13)
- Refactored OTCLeads.jsx (609→178 lines) and AdminTradingPage.jsx (1701→126 lines) (2026-04-13)
- Fixed LaunchpadPage.jsx token reference error (2026-04-13)
- **NEW: Binance-style Trading Terminal** at `/dashboard/trading` (2026-04-13):
  - Real-time Order Book via Binance WebSocket
  - Real-time Market Trades stream
  - TradingView candlestick chart
  - Spot Trading (Buy/Sell) with Limit/Market order types
  - Pairs List with 40+ crypto pairs
  - Top ticker bar with price, 24h change, high, low, volume
  - Full-width layout within dashboard

## File Structure - Trading Terminal
```
dashboard/
  TradingTerminal.jsx (main page)
  trading/
    useBinanceStream.js (WebSocket hook)
    OrderBook.jsx
    MarketTrades.jsx
    SpotTrading.jsx
    PairsList.jsx
    TradingChart.jsx
```

## Pending Issues
- P1: Safari cursor bug (recurring 15+ times, not started)

## Backlog / Future Tasks
- None specified by user

## Credentials
- Admin: carlos@kbex.io / senha123
