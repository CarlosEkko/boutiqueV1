# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features Exchange, OTC Desk, Professional Escrow (DvP), Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC.

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

## Demo Mode Architecture (Updated April 8, 2026)
- All demo data stored in `demo_*` collections (demo_escrow_deals, demo_vault_*, etc.)
- Production/operational collections never receive demo data
- Routes auto-detect demo mode via `demo_col()` helper and swap collection
- Seed: `POST /api/demo/seed` writes to demo_* collections
- Reset: `POST /api/demo/reset` clears only demo_* collections
- Toggle: `POST /api/demo/toggle` toggles demo mode on/off
- Demo data includes: wallets, transactions, OTC leads/deals, vault/multi-sign, escrow deals, bank accounts, crypto deposits/withdrawals

## OTC Escrow Module — COMPLETE (All 3 Phases)

### Phase 1 — Models, Deals UI, Deal Details
### Phase 2 — DvP Settlement, Fee Engine, Compliance Gating, Fee Ledger
### Phase 3 — Dispute Resolution, Evidence Upload, Messages, Admin Force Release, Reporting & Audit Layer, CSV Export

## Sumsub KYC — FIXED (Definitive Solution)
- Eliminated iframe entirely — uses Sumsub External WebSDK Link API
- Backend: `POST /api/sumsub/generate-link` → direct Sumsub URL
- Frontend: Opens in new tab, polls status every 5s
- Works on ALL browsers without CSP issues

## Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL)
- OTC CRM: 11-step workflow
- Brevo email integration
- Trustfull Risk Intelligence (docker-compose.yml updated with TRUSTFULL_API_KEY)
- Base64 JSON uploads (Cloudflare-safe)
- Sidebar translations (5 languages)
- Demo Mode with separate dump collections
- Multi-Sign vault with demo data

## Upcoming Tasks
- P1: "Solicitar Acesso" → Lead OTC + Remove public registration
- P1: TradingView chart widgets
- P2: WebSocket prices (replace HTTP polling)

## Future Tasks
- P2: Whitelist functionality (user-level)
- P2: Brevo notifications for Escrow state changes
- P3: Product Pages (Launchpad, ICO)
- P3: Refactoring OTCLeads.jsx and translations.js

## Key Constraints
- Cloudflare WAF blocks multipart/form-data → use application/json
- Sumsub KYC → external link, no iframe
- Demo data → demo_* collections, never in operational DB
- Theme toggle applies ONLY to dashboard
