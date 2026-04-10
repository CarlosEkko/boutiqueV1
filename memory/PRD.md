# KBEX.io - Product Requirements Document

## Original Problem Statement
KBEX.io is a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include Exchange, OTC Desk, Escrow Module, Fiat/Crypto Wallets, Cold Wallet (Trezor), Onboarding, CRM, Staking, and automated KYC via Sumsub.

## Product Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury", trust, exclusivity in UI/UX
- Comprehensive OTC CRM and General CRM with strict qualification workflows
- Integration with Revolut Business API for fiat deposit reconciliation
- Trezor Connect integration for cold wallet management (Send/Receive/Derive)
- Exclusivity: Platform is invite-only
- KYB via Sumsub (company info form + Sumsub WebSDK)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB), Pydantic
- Integrations: Revolut Business API v2 (X.509 JWT), Brevo Emails, Trezor Connect (CDN), Sumsub KYC/KYB, TradingView (iframes), Binance WebSocket Streams (real-time prices)
- Deployment: Docker, Docker-Compose on VPS

## Key Routes
| Page | Route |
|------|-------|
| Dashboard | /dashboard |
| Wallets | /dashboard/wallets |
| Cold Wallet | /dashboard/cold-wallet |
| Fiat Deposit | /dashboard/fiat-deposit |
| Fiat Withdrawal | /dashboard/fiat-withdrawal |
| KYC/KYB Status | /dashboard/kyc |
| Trading | /trading |
| Markets | /markets |

## Key API Endpoints
- `POST /api/crm/leads/public` — Public: create CRM lead only
- `POST /api/revolut/webhook` — Revolut webhook (auto-reconciliation)
- `POST /api/revolut/sync-deposits` — Sync deposits + auto-reconcile
- `GET /api/revolut/deposits` — List deposits with reconciliation status
- `WS /api/ws/prices` — Real-time crypto prices via Binance WebSocket streams

## DB Collections
- `crm_leads`, `otc_leads`, `cold_wallet_addresses`, `cold_wallet_transactions`
- `revolut_bank_details`, `revolut_deposits` (auto_reconciled, matched_reference_code)
- `bank_transfers` (reference_code), `fiat_wallets`, `fiat_transactions`

## What's Been Implemented

### Session April 10, 2026 (Part 3 - Current)
- **WebSocket Real-Time Prices**: Replaced 5s REST polling with real Binance WebSocket streams (`wss://stream.binance.com:9443/stream`). Initial REST fetch for fast first paint, then streams ~1s batched updates. Auto-reconnection on disconnect.
- **Frontend Translations Complete**: Added `markets`, `trading`, `fiatDeposit`, `fiatWithdrawal` translation sections to all 5 languages (EN, PT, AR, FR, ES). Updated MarketsPage and TradingPage to use `t()` for all visible strings.
- Tests: 14/15 backend + 100% frontend passed

### Session April 10, 2026 (Part 2)
- **Revolut Auto-Reconciliation**: Matches DEP/KB reference codes from Revolut transactions against pending bank_transfers, auto-credits fiat wallets
- **TradingView Charts on Markets Page**: Mini-chart widgets for BTC, ETH, SOL, XRP
- Tests: 14/14 backend + 100% frontend passed

### Session April 10, 2026 (Part 1)
- Trezor Cold Wallet Send/Receive (BTC/ETH/LTC)
- Sumsub KYB Integration
- Demo mode: CRM/Support/Team Hub hidden
- CRM→OTC conversion logic

### Previous Sessions
- Revolut Business API integration, OTC CRM 11-step workflow, Brevo email, Escrow, Staking, Gas Station, KYC automation

## Pending Issues
- P1: Safari cursor bug (recurring 14+ times)

## Upcoming Tasks
- P2: Whitelist functionality
- P3: Product Pages (Launchpad/ICO)
- P3: Refactor large files (OTCLeads.jsx, OTCDealsPage.jsx)

## Credentials
- Admin: carlos@kbex.io / senha123
