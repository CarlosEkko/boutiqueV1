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
### Backend (`/app/backend/routes/kbex_rates.py`)
- **Rate Configuration**: Per product (OTC, Exchange, Escrow, Spot) × Per tier (Broker, Standard, Premium, VIP, Institucional) × Per asset (or wildcard *)
- **Tier Fees**: Editable annual membership fees stored in MongoDB (`kbex_settings` collection)
- **Spread Resolution**: Hierarchical lookup (product+tier+asset → product+tier+* → *+tier+* → 0%)
- **Reference Price Integration**: `/api/otc-deals/reference-price/{asset}` now applies tier-based spread automatically
- **Tier Upgrade**: Admin can upgrade user tier with automatic balance deduction
- **Renewal Alerts**: Users expiring within 30 days flagged for admin
- **Audit Trail**: All rate changes and tier upgrades logged in `kbex_rates_audit`

### Endpoints
- `GET /api/kbex-rates/config` — All rate configs + tiers + fees
- `PUT /api/kbex-rates/config` — Bulk update rate spreads
- `PUT /api/kbex-rates/tier-fees` — Update tier annual fees
- `POST /api/kbex-rates/seed-defaults` — Seed default spread values
- `GET /api/kbex-rates/resolve` — Resolve spread for user/product/asset
- `POST /api/kbex-rates/upgrade-tier` — Upgrade user tier (deduct from balance)
- `GET /api/kbex-rates/renewal-alerts` — Membership renewal alerts
- `DELETE /api/kbex-rates/config` — Delete specific rate config

### Default Spreads
| Tier | Buy Spread | Sell Spread |
|------|-----------|-------------|
| Broker | 0.1% | 0.1% |
| Standard | 0.8% | 0.5% |
| Premium | 0.5% | 0.3% |
| VIP | 0.3% | 0.2% |
| Institucional | 0.1% | 0.1% |

### Default Annual Fees
| Tier | Fee |
|------|-----|
| Broker | €0 |
| Standard | €2,500 |
| Premium | €5,000 |
| VIP | €15,000 |
| Institucional | €50,000 |

### Admin UI (`/app/frontend/src/pages/dashboard/admin/AdminKBEXRates.jsx`)
- Editable tier fees with inline inputs
- Expandable rate tables per product
- Save button appears on edit
- Renewal alerts displayed at top

## OTC Deal Calculator (Updated April 9, 2026)
- Toggle pill EUR/BTC (gold active state, matching Exchange page style)
- 4 decimal places for small values (<10), 2 for large values (>=10)
- MARGEM CORRETORES: Shows Gross% - Net% = Commission% with real % split per tier
- RECEITA KBEX: Shows Net value (KBEX revenue)
- Broker/KBEX broker split based on actual % of total

## Staking Module (Completed April 9, 2026)
- **Supported Assets**: ETH, SOL, MATIC, ATOM, OSMO
- **ETH Validators**: Compounding (32-2048 ETH) / Legacy (multiples of 32)
- **Backend**: Full CRUD at `/api/staking/*`

## Demo Mode Architecture
- All demo data stored in `demo_*` collections
- Production/operational collections never receive demo data

## OTC Escrow Module (All 3 Phases Complete)

## Sumsub KYC
- Embedded iframe with Nginx CSP

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

## DB Collections (New)
- `kbex_rates`: Rate spread configs per product/tier/asset
- `kbex_settings`: Tier fees and other settings
- `kbex_rates_audit`: Audit trail for rate and tier changes
