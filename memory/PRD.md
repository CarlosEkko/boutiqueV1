# KBEX.io - Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange designed for High-Net-Worth (HNW) and Ultra-High-Net-Worth (UHNW) individuals.

## Architecture
- **Frontend:** React, Tailwind CSS, Shadcn UI, React Context
- **Backend:** FastAPI, Pydantic, MongoDB (Motor)
- **Deployment:** Docker Compose with Nginx Reverse Proxy + Cloudflare Strict SSL
- **Theme:** Tailwind `darkMode: ["class"]` with ThemeContext (Dark/Light/System)

## Key Features Implemented
- Multi-currency portfolio dashboard with Dark/Light/System theme
- CRM 360-degree views with unified activity timeline
- OTC Desk with 11-step lifecycle pipeline
- KYC/KYB via Sumsub (automated + manual fallback)
- OTC Lead → KYC flow: creates KYC entry, sends tier-based onboarding email, appears in Risk & Compliance
- Balance adjustments for admin
- Custom maintenance page for VPS downtime (Nginx 502/503/504)
- 5-language translations (EN, PT, AR, FR, ES) — complete sidebar
- Exclusive access model (no public registration, invite-only)
- Knowledge Base with articles and categories
- JSON-based file uploads (bypasses Cloudflare WAF blocking FormData)

## Critical Technical Notes
- **Cloudflare WAF blocks `multipart/form-data`** → All authenticated file uploads MUST use `POST /api/uploads/file-json` (base64 JSON) or `POST /api/uploads/deposit-proof-json/{id}`
- **Deposit proof uploads** use `/api/uploads/deposit-proof-json/{id}` endpoint
- `index.html` must keep `class="dark"` for Shadcn compatibility
- WebSockets implemented for crypto prices

## Tier Pricing
- Standard: EUR 5,000
- Premium: EUR 50,000
- VIP: EUR 250,000
- Institutional: EUR 1,000,000

## Key API Endpoints
- `POST /api/uploads/file-json` — Authenticated JSON file upload (base64)
- `POST /api/uploads/deposit-proof-json/{id}` — Deposit proof JSON upload
- `POST /api/otc/leads/{id}/advance-to-kyc` — Advances lead + sends email + creates KYC entry
- `GET /api/risk-compliance/kyc-verifications` — Lists both Sumsub + OTC Lead verifications

## Credentials
- Admin: `carlos@kbex.io` / `senha123`

## Backlog
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor HTTP polling to WebSockets
- P2: Whitelist functionality
- P2: Safari cursor bug fix
- P3: Product Pages (Launchpad, ICO)
- P3: Refactor OTCLeads.jsx and translations.js
- P3: Convert remaining FormData uploads (KYC forms, Public Support) to JSON
