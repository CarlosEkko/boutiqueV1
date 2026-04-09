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

## KBEX Rate Engine (April 9, 2026)
- Rate Configuration: Per product × Per tier × Per asset
- Tier Fees: Editable annual fees (Broker €0, Standard €2500, Premium €5000, VIP €15000, Institucional €50000)
- Spread Resolution: Hierarchical lookup
- Reference Price: `/api/otc-deals/reference-price/{asset}` applies tier-based spread
- Escrow Fee Tiers: Editable table by ticket size (6 default tiers)
- Tier Upgrade: Admin deducts from user balance
- Renewal Alerts: 30-day expiry warnings
- Audit Trail: All changes logged

## OTC Deal Calculator (April 9, 2026)
- Toggle pill EUR/BTC (gold active state)
- 4 decimals for small values, 2 for large
- MARGEM CORRETORES: Gross% - Net% with real % split
- RECEITA KBEX: Net value

## OTC Lead Visibility Fix (April 9, 2026)
- Added `created_by` field to OTCLead model
- Team filter: assigned_to OR created_by OR region
- Demo mode flag on lead creation

## Protected Document Viewer (April 9, 2026)
- Transparency/Audit Reports PDFs viewable in protected viewer
- Protections: disable right-click, Ctrl+C/P/S, F12, PrintScreen, user-select:none
- Dynamic watermark with user name/email
- Sandboxed iframe (no download)
- Delete reports: Only Manager/Global Manager/Admin
- Endpoint: `DELETE /api/admin/transparency/reports/{id}`

## Staking Module (April 9, 2026)
- Supported: ETH, SOL, MATIC, ATOM, OSMO
- ETH Validators: Compounding/Legacy

## Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL)
- OTC CRM: 11-step workflow
- Brevo email integration
- Trustfull Risk Intelligence
- Demo Mode with separate dump collections
- Multi-Sign vault with demo data
- Staking module
- "Solicitar Acesso" → CRM + OTC Lead generation
- Auth page: Login only (registration gated by invite)
- OTC Deal Calculator with precision formatting
- KBEX Rate Engine with tier-based spreads
- Escrow Fee Tiers editable table
- OTC Lead visibility fix (created_by)
- Protected Document Viewer (anti-copy, watermark)
- Report deletion (role-restricted)
- Safari cursor fix

## Upcoming Tasks
- P1: TradingView chart widgets
- P1: Complete frontend translations
- P2: WebSocket prices (replace polling)

## Future Tasks
- P2: Whitelist functionality
- P2: Brevo notifications for Escrow
- P3: Product Pages (Launchpad, ICO)
- P3: Refactoring large files

## Key Constraints
- Cloudflare WAF blocks multipart → use JSON
- Demo data → demo_* collections only
- Theme toggle: Dashboard only

## DB Collections
- `kbex_rates`: Rate spread configs
- `kbex_settings`: Tier fees, escrow fees
- `kbex_rates_audit`: Audit trail
- `transparency_reports`: Audit report documents
