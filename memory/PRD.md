# KBEX.io - Product Requirements Document

## Original Problem Statement
KBEX.io is a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include Exchange, OTC Desk, Escrow Module, Fiat/Crypto Wallets, Cold Wallet (Trezor), Onboarding, CRM, Staking, Launchpad/ICO, and automated KYC via Sumsub.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB), Pydantic
- Integrations: Revolut Business API v2, Brevo Emails, Trezor Connect (CDN), Sumsub KYC/KYB, TradingView (iframes), Binance WebSocket Streams
- Deployment: Docker, Docker-Compose on VPS

## Key Routes
| Page | Route | Type |
|------|-------|------|
| Launchpad (Public) | /launchpad | Public |
| Markets | /markets | Public |
| Trading | /trading | Public |
| Dashboard | /dashboard | Auth |
| Launchpad (Client) | /dashboard/launchpad | Client |
| Launchpad (Admin) | /dashboard/admin/launchpad | Admin |
| Cold Wallet | /dashboard/cold-wallet | Auth |
| Fiat Deposit | /dashboard/fiat-deposit | Auth |

## Key API Endpoints
- `POST /api/launchpad/admin/sales` — Admin creates token sale
- `PUT /api/launchpad/admin/sales/{id}` — Admin updates token sale
- `DELETE /api/launchpad/admin/sales/{id}` — Admin deletes sale (no subs)
- `GET /api/launchpad/sales` — Public: list all token sales
- `GET /api/launchpad/sales/{id}` — Public: token sale detail
- `POST /api/launchpad/sales/{id}/subscribe` — Client subscribes
- `GET /api/launchpad/my-subscriptions` — Client subscriptions
- `GET /api/launchpad/admin/sales/{id}/subscriptions` — Admin view subs
- `PUT /api/launchpad/admin/subscriptions/{id}/distribute` — Admin distribute
- `PUT /api/launchpad/admin/subscriptions/{id}/refund` — Admin refund
- `POST /api/revolut/webhook` — Revolut auto-reconciliation
- `POST /api/revolut/sync-deposits` — Sync + auto-reconcile
- `WS /api/ws/prices` — Real-time prices via Binance WebSocket

## DB Collections
- `token_sales` — Launchpad token sales
- `launchpad_subscriptions` — User subscriptions to sales
- `revolut_deposits`, `bank_transfers`, `fiat_wallets`, `fiat_transactions`
- `crm_leads`, `otc_leads`, `cold_wallet_addresses`

## What's Been Implemented

### Session April 12, 2026
- **Ticker Duplicado Removido**: Removido o `SimpleTicker` da TradingPage que duplicava o TradingView Ticker Tape do Header
- **Referências Binance Removidas**: Substituídos todos os prefixos `BINANCE:` nos símbolos TradingView por `COINBASE:` / `BITSTAMP:` / `CRYPTO:` para manter o white-label

### Session April 11, 2026
- **Launchpad/ICO System**: Full implementation with public page (hero, stats, featured sale, countdown, progress bars, filter tabs), client dashboard (browse & subscribe, my subscriptions), and admin management (create/edit/delete sales, view/distribute/refund subscriptions)
- Tests: 19/19 backend + 100% frontend passed

### Session April 10, 2026 (Part 3)
- **WebSocket Real-Time Prices**: Binance WebSocket streams replacing REST polling
- **Frontend Translations**: markets, trading, fiatDeposit, fiatWithdrawal sections in 5 languages

### Session April 10, 2026 (Part 2)
- **Revolut Auto-Reconciliation**: Automatic matching of reference codes
- **TradingView Charts**: Mini-chart widgets on Markets page

### Session April 10, 2026 (Part 1)
- Trezor Cold Wallet Send/Receive, Sumsub KYB, Demo mode updates, CRM lead routing

## Pending Issues
- P1: Safari cursor bug (recurring 14+ times)

## Upcoming Tasks
- P2: Whitelist functionality
- P3: Refactor large files (OTCLeads.jsx, OTCDealsPage.jsx)

## Credentials
- Admin: carlos@kbex.io / senha123
