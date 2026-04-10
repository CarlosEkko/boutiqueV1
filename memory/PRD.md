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
- `GET /api/cold-wallet/fee-estimate/{coin}` — Fee estimates (BTC/ETH/LTC)
- `GET /api/cold-wallet/eth-params/{address}` — ETH nonce, gas, balance
- `GET /api/cold-wallet/utxos/{address}` — BTC/LTC UTXOs
- `POST /api/cold-wallet/broadcast` — Broadcast signed transaction
- `GET /api/cold-wallet/transactions` — Transaction history
- `GET /api/cold-wallet/raw-tx/{txid}` — Raw BTC transaction hex
- `GET /api/cold-wallet/admin/utxos/{address}` — Admin UTXO fetch
- `GET /api/cold-wallet/admin/eth-params/{address}` — Admin ETH params
- `GET /api/cold-wallet/admin/fee-estimate/{coin}` — Admin fee estimates
- `POST /api/cold-wallet/admin/broadcast` — Admin broadcast signed tx

## DB Collections
- `revolut_bank_details` — Cached IBAN/BIC for Main and kbex accounts
- `revolut_deposits` — Synced deposits from Revolut
- `cold_wallet_addresses` — Client and treasury cold wallet addresses (type: client/treasury)
- `cold_wallet_transactions` — Transaction log for broadcast transactions

## Account Structure (Revolut)
- **Main accounts** → Tesouraria & Onboarding (taxas de admissão)
- **kbex accounts** → Conciliação de Clientes (depósitos fiat)

## Supported Fiat Currencies
EUR, USD, AED, BRL, GBP, CHF, QAR, SAR, HKD

## What's Been Implemented

### This Session (April 10, 2026)
- **Send/Receive for Trezor Cold Wallet** (Client + Admin)
  - Receive Modal: QR code generation, address copy, coin-specific URI schemes (bitcoin:, ethereum:, litecoin:)
  - Send Modal: 4-step wizard (Form → Review → Signing → Result)
  - Transaction composition: UTXO selection for BTC/LTC, ETH tx params (nonce, gas)
  - Fee estimation: Fast/Medium/Slow for BTC/LTC, gas price for ETH
  - Transaction signing via Trezor Connect (signTransaction, ethereumSignTransaction)
  - Broadcast via public blockchain APIs (Blockstream, Blockcypher, public ETH RPC)
  - Transaction history with block explorer links
- **Backend blockchain service** (blockchain_service.py)
  - BTC UTXOs via Blockstream API
  - ETH params via public RPC (publicnode, ankr, llamarpc fallback)
  - Fee estimates for BTC/ETH/LTC
  - Broadcast for BTC/ETH/LTC
  - Raw transaction hex fetch for Trezor sign inputs
- **New API endpoints**: fee-estimate, eth-params, utxos, broadcast, transactions, raw-tx, admin variants
- **Frontend helpers** (trezorConnect.js): composeInputs, composeOutputs, ethToWei, toHex

### Previous Sessions
- Separated Revolut accounts: Main (Treasury) vs kbex (Client Reconciliation)
- Integrated Trezor Connect via CDN (BTC, ETH, LTC)
- Client Cold Wallet page + Admin Cold Wallet page
- OTC CRM with 11-step workflow
- Brevo email integration
- Revolut Business API integration (X.509 certs)
- Escrow lifecycle, Staking, Gas Station
- KYC/KYB automation via Sumsub
- KBEX Rates Engine
- Demo Mode

## Pending Issues
- P1: Reroute "Solicitar Acesso" to Lead Creation & Disable Public Registration
- P2: Safari cursor bug (recurring 13+ times)
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
- Preview password: senha123
- VPS password: cascaca2
