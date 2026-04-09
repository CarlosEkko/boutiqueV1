# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features Exchange, OTC Desk, Professional Escrow (DvP), Fiat/Crypto Wallets, Onboarding, CRM, Staking, and automated KYC.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deployment: Docker Compose + Nginx (Cloudflare Strict SSL)

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury" UI/UX with trust and exclusivity
- Comprehensive OTC CRM with strict qualification workflows
- Professional OTC Escrow with DvP settlement, fee engine, compliance gating
- Demo Mode with SEPARATE dump collections (demo_* prefix)
- Dark/Light mode toggle (Dashboard only; Landing/Auth stay Dark)
- Staking module with ETH-specific validators (Compounding/Legacy)

## Staking Module (Completed April 9, 2026)
- **Supported Assets**: ETH, SOL, MATIC, ATOM, OSMO
- **ETH Validators**:
  - Compounding: 32 to 2048 ETH (flexible range)
  - Legacy: exact multiples of 32 ETH (32, 64, 96...)
- **Other Assets**: Generic staking with minimum amounts
- **Providers**: Loaded from Fireblocks API (manual fallback)
- **Vault Resolution**: Auto-resolves user's vault ID from profile (fireblocks_vault_id)
- **Backend**: `/api/staking/assets`, `/api/staking/stake`, `/api/staking/unstake`, `/api/staking/claim-rewards`, `/api/staking/positions`, `/api/staking/summary`, `/api/staking/history`, `/api/staking/providers`
- **Frontend**: Multi-step wizard (Asset -> Validator -> Amount -> Provider -> Review)
- **Testing**: 35/35 backend tests passed, all frontend flows verified

## Demo Mode Architecture
- All demo data stored in `demo_*` collections (demo_escrow_deals, demo_vault_*, etc.)
- Production/operational collections never receive demo data
- Routes auto-detect demo mode via `demo_col()` helper and swap collection

## OTC Escrow Module (All 3 Phases Complete)
### Phase 1: Models, Deals UI, Deal Details
### Phase 2: DvP Settlement, Fee Engine, Compliance Gating, Fee Ledger
### Phase 3: Dispute Resolution, Evidence Upload, Messages, Admin Force Release, Reporting & Audit Layer, CSV Export

## Sumsub KYC
- Embedded iframe with Nginx CSP allowing `frame-src https://*.sumsub.com`
- Backend: `POST /api/sumsub/applicants` for token generation

## OTC Deal Calculator (Updated April 9, 2026)
- Toggle pill EUR/BTC (gold active state, matching Exchange page style)
- 4+ decimal places for micro-values (fiat/crypto parities)
- MARGEM CORRETORES: Shows Gross% - Net% = Commission% with real % split
- RECEITA KBEX: Shows Net value (KBEX revenue)
- Formula display: "Gross - Net = X% - Y% = Z%"
- Broker/KBEX broker split based on actual % of total (not 50/50 fixed)

## Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL)
- OTC CRM: 11-step workflow
- Brevo email integration
- Trustfull Risk Intelligence
- Base64 JSON uploads (Cloudflare-safe)
- Sidebar translations (5 languages)
- Demo Mode with separate dump collections
- Multi-Sign vault with demo data
- Staking module (ETH Compounding/Legacy + SOL, MATIC, ATOM, OSMO)
- "Solicitar Acesso" -> CRM + OTC Lead generation (verified working)
- Auth page: Login only (registration gated by invite)
- OTC Deal Calculator with precision formatting and toggle
- MARGEM CORRETORES + RECEITA KBEX sections in calculator
- Safari cursor fix (custom cursor disabled)

## Upcoming Tasks
- P1: TradingView chart widgets
- P1: Complete frontend translations (all pages)
- P2: WebSocket prices (replace HTTP polling)

## Future Tasks
- P2: Whitelist functionality (user-level)
- P2: Brevo notifications for Escrow state changes
- P3: Product Pages (Launchpad, ICO)
- P3: Refactoring OTCLeads.jsx, OTCDealsPage.jsx and translations.js

## Key Constraints
- Cloudflare WAF blocks multipart/form-data -> use application/json
- Demo data -> demo_* collections, never in operational DB
- Theme toggle applies ONLY to dashboard
