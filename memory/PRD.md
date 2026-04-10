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
- Integrations: Revolut Business API v2 (X.509 JWT), Brevo Emails, Trezor Connect (CDN), Sumsub KYC/KYB, TradingView (iframes)
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
| KYB Sumsub | /dashboard/kyc/kyb |
| KYC Sumsub | /dashboard/kyc/sumsub |
| Admin Bank Accounts | /dashboard/admin/contas-bancarias |
| Admin Cold Wallet | /dashboard/admin/cold-wallet |
| Trading | /trading |
| Markets | /markets |

## Key API Endpoints
- `POST /api/crm/leads/public` — Public: create CRM lead only (no OTC lead)
- `POST /api/crm/leads/{id}/convert-to-otc` — Convert CRM lead to OTC lead
- `GET /api/crm/leads` — List CRM leads (excludes converted_to_otc=true)
- `GET /api/cold-wallet/fee-estimate/{coin}` — Fee estimates (BTC/ETH/LTC)
- `POST /api/cold-wallet/broadcast` — Broadcast signed transaction
- `POST /api/sumsub/applicants` — Create KYC/KYB applicant
- `GET /api/sumsub/status` — Check verification status
- `POST /api/revolut/webhook` — Revolut webhook (auto-reconciliation)
- `POST /api/revolut/sync-deposits` — Sync deposits + auto-reconcile
- `GET /api/revolut/deposits` — List deposits with reconciliation status
- `POST /api/revolut/deposits/{tx_id}/reconcile` — Manual reconciliation

## DB Collections
- `crm_leads` — CRM General leads (field: converted_to_otc)
- `otc_leads` — OTC Pipeline leads
- `cold_wallet_addresses` — Cold wallet addresses
- `cold_wallet_transactions` — Broadcast transaction log
- `revolut_bank_details` — Cached IBAN/BIC
- `revolut_deposits` — Synced Revolut deposits (auto_reconciled, matched_reference_code)
- `bank_transfers` — User deposit/withdrawal requests (reference_code)
- `fiat_wallets` — User fiat balances
- `fiat_transactions` — Fiat transaction log

## What's Been Implemented

### Session April 10, 2026 (Part 2)
- **Revolut Auto-Reconciliation**: When deposits arrive via webhook or sync, system matches `DEP`/`KB` + 8 hex reference codes against pending `bank_transfers` and automatically credits user fiat wallets
- **TradingView Charts on Markets Page**: Added "Gráficos em Destaque" section with mini-chart widgets for BTC, ETH, SOL, XRP
- Both features tested: 14/14 backend tests passed, 100% frontend verified

### Session April 10, 2026 (Part 1)
- Trezor Cold Wallet Send/Receive (BTC/ETH/LTC)
- Sumsub KYB Integration (company info form + Sumsub WebSDK)
- Fixed black screen on /dashboard/fiat-withdraw
- Demo mode: CRM, Suporte, Team Hub hidden
- "Solicitar Acesso" creates lead in CRM Geral ONLY
- CRM→OTC conversion hides from CRM Geral listing

### Previous Sessions
- Revolut Business API integration (Main vs kbex accounts)
- Trezor Connect via CDN (derive BTC/ETH/LTC addresses)
- OTC CRM 11-step workflow
- Brevo email integration
- Escrow lifecycle, Staking, Gas Station
- KYC automation via Sumsub

## Pending Issues
- P1: Safari cursor bug (recurring 14+ times)
- P2: Incomplete frontend translations

## Upcoming Tasks
- P2: Complete frontend translations (all pages)
- P2: WebSocket for crypto prices (replace 1s HTTP polling)

## Future/Backlog
- P2: Whitelist functionality
- P3: Product Pages (Launchpad/ICO)
- P3: Refactor large files (OTCLeads.jsx, OTCDealsPage.jsx)

## Credentials
- Admin: carlos@kbex.io / senha123
