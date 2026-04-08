# KBEX.io - Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange designed for High-Net-Worth (HNW) and Ultra-High-Net-Worth (UHNW) individuals. The platform provides a comprehensive suite of services including an Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC via Sumsub.

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury", trust, and exclusivity in UI/UX
- Comprehensive OTC CRM with strict qualification and workflows
- Region/Role-based hierarchy for staff management
- Dark/Light theme support

## Architecture
- **Frontend:** React, Tailwind CSS, Shadcn UI, React Context
- **Backend:** FastAPI, Pydantic, MongoDB (Motor)
- **Deployment:** Docker Compose with Nginx Reverse Proxy + Cloudflare Strict SSL
- **Theme:** Tailwind `darkMode: ["class"]` with ThemeContext (Dark/Light/System)

## Key Features Implemented
- Multi-currency portfolio dashboard
- CRM 360-degree views with unified activity timeline
- OTC Desk with 11-step lifecycle pipeline
- KYC/KYB via Sumsub (automated + manual fallback)
- OTC Lead → KYC flow: creates KYC entry, sends tier-based onboarding email, appears in Risk & Compliance
- Balance adjustments for admin
- Custom maintenance page for VPS downtime (Nginx 502/503/504)
- Dark/Light/System theme toggle
- 5-language sidebar translations (EN, PT, AR, FR, ES)
- Exclusive access model (no public registration, invite-only)

## OTC Lead → KYC Flow (Implemented 2026-04-08)
1. Admin advances lead via `POST /api/otc/leads/{id}/advance-to-kyc`
2. Backend creates `sumsub_applicants` entry with `source: "otc_lead"`, tier info
3. Brevo onboarding email sent with tier label and minimum investment amount
4. Lead appears in Risk & Compliance → Verificações KYC/KYB with "OTC Lead" badge
5. Manual approve/reject works for OTC lead entries
6. Tier pricing: Standard (5k EUR), Premium (50k EUR), VIP (250k EUR), Institutional (1M EUR)

## Authentication Flow
- Login-only AuthPage (no public registration)
- "Solicitar Acesso" → Public form creates OTC Lead + CRM Lead
- `/register` route gated — only accessible via invitation email (`?email=` param)
- Brevo transactional emails for onboarding with tier and payment info

## Key Integrations
- Brevo (transactional emails) — configured
- Sumsub (KYC/KYB) — requires API key
- Fireblocks (wallets) — requires API key
- Cloudflare (WAF/proxy) — managed externally
- CoinMarketCap/Binance (crypto rates) — requires API keys

## Credentials
- Admin: `carlos@kbex.io` / `senha123`

## Known Constraints
- Cloudflare WAF blocks `multipart/form-data` → use `application/json`
- `index.html` must keep `class="dark"` for Shadcn compatibility
- WebSockets not implemented (using 1s HTTP polling)

## Backlog
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor HTTP polling to WebSockets
- P2: Whitelist functionality
- P2: Safari cursor bug fix
- P2: Dark/Light Mode toggle for individual page components (progressive)
- P3: Product Pages (Launchpad, ICO)
- P3: Refactor OTCLeads.jsx (2300+ lines) and translations.js (6600+ lines)
