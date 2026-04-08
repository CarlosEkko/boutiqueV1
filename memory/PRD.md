# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features Exchange, OTC Desk, Escrow, Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC via Sumsub.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deployment: Docker Compose + Nginx (Cloudflare Strict SSL)

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury" UI/UX with trust and exclusivity
- Comprehensive OTC CRM with strict qualification workflows
- Professional OTC Escrow with DvP settlement
- Demo Mode toggle for authorized users
- Dark/Light mode toggle (Dashboard only; Landing/Auth stay Dark)

## Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL) with fiat deposits
- OTC CRM: 11-step workflow (Creation → Post-Sale)
- Brevo email integration for onboarding
- Sumsub KYC/KYB integration (Safari fallback for ITP)
- Trustfull Risk Intelligence (email + phone scoring)
- Base64 JSON uploads (bypasses Cloudflare WAF)
- Custom Nginx maintenance page (502/503)
- "Solicitar Acesso" → OTC Lead creation (public registration removed)
- Sidebar translations (5 languages)
- Demo Mode with mock data
- Dashboard Dark/Light mode toggle

## OTC Escrow Module (Phase 1 - COMPLETED April 8, 2026)
### Backend
- Data models with 10 escrow statuses (Draft → Closed)
- State machine with validated transitions
- Fee Engine: 4 schedules (Standard 0.5%, Premium 0.3%, Institutional 0.1%, Custom)
- Fee split: Buyer/Seller/Split 50-50
- Compliance gating (buyer/seller KYC, AML, Source of Funds)
- Dispute management (open/resolve)
- Admin force-release with audit trail
- Complete timeline with all status changes

### Frontend
- Escrow Dashboard with 7 KPIs (Active, Funds in Custody, Fees, Disputes, Total, Settled, SLA)
- Deal list with search, status/type filters
- 4-step creation wizard (Type/Assets → Counterparts → Fees/Settlement → Review)
- Deal detail with visual pipeline, compliance checks, custody status, fee breakdown, timeline
- Sidebar menu with Lock icon

### API Endpoints
- GET /api/escrow/dashboard
- GET/POST /api/escrow/deals
- GET/PUT/DELETE /api/escrow/deals/{id}
- POST /api/escrow/deals/{id}/advance
- POST /api/escrow/calculate-fee
- PUT /api/escrow/deals/{id}/compliance
- POST /api/escrow/deals/{id}/dispute
- POST /api/escrow/deals/{id}/resolve-dispute
- POST /api/escrow/deals/{id}/force-release

## Bug Fixes (April 8, 2026)
- AED currency: Changed from Arabic script 'د.إ' to 'AED' for cross-browser compatibility
- Trustfull API: Fixed module-level key loading → reads at call-time
- Safari cursor: Removed dead GSAP custom cursor code, cleaned CSS cursor rules

## Upcoming Tasks (P1)
- Escrow Phase 2: Settlement Engine DvP, advanced Fee Engine, Compliance gating, Wallet & Custody Layer
- TradingView chart widgets on Trading/Markets pages
- Refactor HTTP polling → WebSockets for crypto prices

## Future Tasks (P2-P3)
- Escrow Phase 3: Dispute Resolution UI, Reporting/Audit, CSV/PDF export, Admin overrides
- Whitelist functionality
- Product Pages (Launchpad, ICO)
- Refactoring: OTCLeads.jsx, translations.js

## Integrations
- Brevo (Emails) — configured
- Sumsub (KYC/KYB) — configured
- Trustfull (Risk Intelligence) — configured
- Binance & CoinMarketCap (Rates) — configured
- Fireblocks (Wallets) — broken
- Microsoft 365 (Azure AD) — pending

## Key Constraints
- Cloudflare WAF blocks multipart/form-data → must use application/json
- Safari ITP blocks Sumsub iframe → fallback opens in new tab
- Theme toggle applies ONLY to dashboard; Landing/Auth stay dark
