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
- KYB via Sumsub (company info form → Sumsub WebSDK)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, Motor (MongoDB), Pydantic
- Integrations: Revolut Business API v2 (X.509 JWT), Brevo Emails, Trezor Connect (CDN), Sumsub KYC/KYB
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

## Key API Endpoints
- `POST /api/crm/leads/public` — Public: create CRM lead only (no OTC lead)
- `POST /api/crm/leads/{id}/convert-to-otc` — Convert CRM lead to OTC lead (hides from CRM Geral)
- `GET /api/crm/leads` — List CRM leads (excludes converted_to_otc=true)
- `GET /api/cold-wallet/fee-estimate/{coin}` — Fee estimates (BTC/ETH/LTC)
- `GET /api/cold-wallet/eth-params/{address}` — ETH nonce, gas, balance
- `GET /api/cold-wallet/utxos/{address}` — BTC/LTC UTXOs
- `POST /api/cold-wallet/broadcast` — Broadcast signed transaction
- `POST /api/sumsub/applicants` — Create KYC/KYB applicant (verification_type: kyc|kyb)
- `GET /api/sumsub/status` — Check verification status

## DB Collections
- `crm_leads` — CRM General leads (field: converted_to_otc hides from listing)
- `otc_leads` — OTC Pipeline leads
- `cold_wallet_addresses` — Client/treasury cold wallet addresses
- `cold_wallet_transactions` — Broadcast transaction log
- `revolut_bank_details` — Cached IBAN/BIC

## What's Been Implemented

### This Session (April 10, 2026)
- **Trezor Send/Receive** (Client + Admin Cold Wallet pages)
- **KYB/Sumsub integration** (company info form → Sumsub WebSDK)
- **Fix: fiat-withdraw black screen** (corrected URL + added alias route)
- **Demo mode**: CRM, Suporte, Team Hub hidden
- **"Solicitar Acesso"**: Creates lead in CRM Geral ONLY (removed OTC auto-creation)
- **CRM→OTC conversion**: Converting a CRM lead to OTC hides it from CRM Geral listing

### Previous Sessions
- Revolut Business API integration (Main vs kbex accounts)
- Trezor Connect via CDN (derive BTC/ETH/LTC addresses)
- OTC CRM 11-step workflow
- Brevo email integration
- Escrow lifecycle, Staking, Gas Station
- KYC/KYB automation via Sumsub (KYC level)

## Pending Issues
- P2: Safari cursor bug (recurring 13+ times)
- P2: Incomplete frontend translations

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Automatic deposit reconciliation via Reference ID
- P2: WebSocket for crypto prices (replace 1s HTTP polling)

## Future/Backlog
- P2: Whitelist functionality
- P3: Product Pages (Launchpad/ICO)
- P3: Refactor large files (OTCLeads.jsx, OTCDealsPage.jsx)

## Credentials
- Admin: carlos@kbex.io
- Preview password: senha123
- VPS password: cascaca2
