# KBEX.io - Product Requirements Document

## Original Problem Statement
KBEX.io is a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include Exchange, OTC Desk, Escrow Module, Fiat/Crypto Wallets, Cold Wallet (Trezor), Onboarding, CRM, Staking, and automated KYC via Sumsub.

## Product Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury", trust, exclusivity in UI/UX
- Comprehensive OTC CRM and General CRM with strict qualification workflows
- Integration with Revolut Business API for fiat deposit reconciliation
- Trezor Connect integration for cold wallet management
- Exclusivity: Platform is invite-only

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB), Pydantic
- Integrations: Revolut Business API v2 (X.509 JWT), Brevo Emails, Trezor Connect (CDN), Sumsub KYC
- Deployment: Docker, Docker-Compose on VPS

## Key Routes
| Page | Route |
|------|-------|
| Dashboard | /dashboard |
| Wallets | /dashboard/wallets |
| Cold Wallet | /dashboard/cold-wallet |
| Fiat Deposit | /dashboard/fiat-deposit |
| Admin Bank Accounts | /dashboard/admin/contas-bancarias |
| Admin Cold Wallet | /dashboard/admin/cold-wallet |

## Key API Endpoints
- `GET /api/revolut/accounts` — Fetch Revolut accounts
- `POST /api/revolut/sync-bank-details` — Sync IBAN/BIC for all accounts
- `GET /api/revolut/public/bank-details/{currency}` — Public: get kbex account IBAN for client deposits
- `POST /api/revolut/webhook` — Revolut transaction webhooks
- `GET /api/cold-wallet/addresses` — Client cold wallet addresses
- `POST /api/cold-wallet/addresses` — Save client cold wallet address
- `GET /api/cold-wallet/treasury` — Admin treasury cold wallet addresses
- `POST /api/cold-wallet/treasury` — Save treasury cold wallet address

## DB Collections
- `revolut_bank_details` — Cached IBAN/BIC for Main and kbex accounts
- `revolut_deposits` — Synced deposits from Revolut
- `cold_wallet_addresses` — Client and treasury cold wallet addresses (type: client/treasury)

## Account Structure (Revolut)
- **Main accounts** → Tesouraria & Onboarding (taxas de admissão)
- **kbex accounts** → Conciliação de Clientes (depósitos fiat)

## Supported Fiat Currencies
EUR, USD, AED, BRL, GBP, CHF, QAR, SAR, HKD

## What's Been Implemented

### This Session (April 10, 2026)
- Separated Revolut accounts: Main (Treasury) vs kbex (Client Reconciliation)
- Removed "Contas da Empresa" from sidebar menu
- Renamed "Revolut Business" to "Contas Bancárias" in menu, title, and URL
- Added "Sincronizar IBAN" button for admin to cache bank details
- Reformulated Fiat Deposit page with 4-step flow (Currency → Amount → Reference → Confirm)
- Bank details (IBAN/BIC) now come from Revolut kbex accounts
- Added fiat currencies: GBP, CHF, QAR, SAR, HKD (total 9)
- Removed "Outras Contas" section, added flags for AED, HKD, QAR, SAR
- Integrated Trezor Connect via CDN (BTC, ETH, LTC)
- Client Cold Wallet page (/dashboard/cold-wallet) with own menu section
- Admin Cold Wallet page (/dashboard/admin/cold-wallet) for treasury
- Fixed CSP in nginx.conf to allow connect.trezor.io
- Fixed Revolut webhook status detection (fallback to API check)
- Fixed docker-compose.yml with Revolut env vars and certs mount

### Previous Sessions
- OTC CRM with 11-step workflow
- Brevo email integration
- Revolut Business API integration (X.509 certs)
- Escrow lifecycle, Staking, Gas Station
- KYC/KYB automation via Sumsub
- KBEX Rates Engine
- Demo Mode

## Pending Issues
- P2: Safari cursor bug (recurring 12+ times)
- P2: Incomplete frontend translations

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Automatic deposit reconciliation via Reference ID matching
- P2: WebSocket refactor for crypto prices (replace 1s HTTP polling)

## Future/Backlog
- P2: Whitelist functionality
- P3: Product Pages (Launchpad/ICO)
- P3: Refactor large files (OTCLeads.jsx, OTCDealsPage.jsx, translations.js)

## Credentials
- Admin: carlos@kbex.io
- VPS password: cascaca2 (different from preview)
