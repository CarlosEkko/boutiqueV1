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
- KBEX Rate Engine with tier-based spread configuration

## KBEX Rate Engine (Completed April 9, 2026)
### Rate Configuration
- Per product (OTC, Exchange, Escrow, Spot) × Per tier (Broker, Standard, Premium, VIP, Institucional) × Per asset (or wildcard *)
- Tier Fees: Editable annual membership fees stored in MongoDB
- Spread Resolution: Hierarchical lookup (product+tier+asset → product+tier+* → *+tier+* → 0%)
- Reference Price Integration: `/api/otc-deals/reference-price/{asset}` applies tier-based spread

### Escrow Fee Tiers (Completed April 9, 2026)
- Editable fee table based on ticket size
- 6 default tiers from €0 to ∞
- Each tier: min_amount, max_amount, fee_pct, min_fee
- Endpoint: `GET /api/kbex-rates/escrow-fees/calculate?amount=X`
- Admin can add/remove/edit tiers

### Tier Management
- Upgrade user tier with automatic balance deduction
- Renewal alerts for expiring memberships (30 days)
- Audit trail for all changes

### Endpoints
- `GET /api/kbex-rates/config` — All rate configs + tiers + fees
- `PUT /api/kbex-rates/config` — Bulk update rate spreads
- `PUT /api/kbex-rates/tier-fees` — Update tier annual fees
- `GET/PUT /api/kbex-rates/escrow-fees` — Escrow fee tiers CRUD
- `GET /api/kbex-rates/escrow-fees/calculate` — Calculate escrow fee for amount
- `POST /api/kbex-rates/seed-defaults` — Seed default spread values
- `POST /api/kbex-rates/escrow-fees/seed` — Seed default escrow tiers
- `GET /api/kbex-rates/resolve` — Resolve spread for user/product/asset
- `POST /api/kbex-rates/upgrade-tier` — Upgrade user tier
- `GET /api/kbex-rates/renewal-alerts` — Membership renewal alerts

## OTC Deal Calculator (Updated April 9, 2026)
- Toggle pill EUR/BTC (gold active state)
- 4 decimal places for small values (<10), 2 for large values (>=10)
- MARGEM CORRETORES: Gross% - Net% = Commission% with real % split
- RECEITA KBEX: Net value (KBEX revenue)

## OTC Lead Visibility Fix (April 9, 2026)
- Added `created_by` field to OTCLead model
- Team filter now checks: assigned_to OR created_by OR region
- Demo mode: leads created in demo mode now get `is_demo: True`

## Staking Module (Completed April 9, 2026)
- Supported Assets: ETH, SOL, MATIC, ATOM, OSMO
- ETH Validators: Compounding (32-2048 ETH) / Legacy (multiples of 32)

## Demo Mode Architecture
- All demo data stored in `demo_*` collections
- Production/operational collections never receive demo data

## OTC Escrow Module (All 3 Phases Complete)

## Sumsub KYC — Embedded iframe

## Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL)
- OTC CRM: 11-step workflow
- Brevo email integration
- Trustfull Risk Intelligence
- Demo Mode with separate dump collections
- Multi-Sign vault with demo data
- Staking module
- "Solicitar Acesso" → CRM + OTC Lead generation (verified)
- Auth page: Login only (registration gated by invite)
- OTC Deal Calculator with precision formatting and toggle
- KBEX Rate Engine with tier-based spreads and editable fees
- Escrow Fee Tiers with editable table
- OTC Lead visibility fix (created_by + team filter)
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
- Cloudflare WAF blocks multipart/form-data → use application/json
- Demo data → demo_* collections, never in operational DB
- Theme toggle applies ONLY to dashboard

## DB Collections
- `kbex_rates`: Rate spread configs per product/tier/asset
- `kbex_settings`: Tier fees, escrow fee tiers, and other settings
- `kbex_rates_audit`: Audit trail for rate, tier, and escrow changes
