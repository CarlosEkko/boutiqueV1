# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, React Context
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Integrations: Sumsub (KYC + KYB Quest), Trustfull, Brevo, Fireblocks
- Infrastructure: Docker on VPS, Cloudflare WAF

## What's Implemented
- Multi-currency viewing with real-time crypto prices
- Fiat deposits/withdrawals, wallet management
- Complete OTC CRM (11-stage workflow)
- Invite-only registration gate
- Hierarchical access control (region-based)
- Region-based notification filtering
- 5-language support (EN, PT, AR, FR, ES)
- SecurityPage fully internationalized
- OTC lead conversion correctly inherits potential_tier -> membership_level
- Registration completion for auto-created users
- Translation key collision fix
- **Demo Mode**: Full demo with rich mock data for sales pitches
- KB access fix, Fiat deposit isolation, Auto-assign leads
- OTC Desk Flow Verification
- TinyMCE Knowledge Base Editor
- CSP and security headers in nginx.conf
- Cloudflare SSL configuration
- **OTC Setup Status Fix (2026-04-08)**:
  - Added `setup_complete` status enum
  - After operational setup → status = `setup_complete` (not `setup_pending`)
  - Convert to Client accepts `setup_complete` status
  - Frontend tabs and LeadCard updated
- **KYC/KYB Verifications Page (2026-04-08)**:
  - New page at `/dashboard/risk/kyc-verifications` under Risco & Conformidade
  - Shows all Sumsub applicants with real-time status (init/pending/approved/rejected)
  - Stats cards, type tabs (KYC/KYB), status tabs, search
  - Detail dialog: user info, status, Sumsub level, documents status
  - "Sincronizar" button fetches live data from Sumsub API
  - Direct "Abrir no Dashboard Sumsub" link to cockpit
  - KYB Quest support: `SUMSUB_KYB_LEVEL_NAME` env var, company applicant type
  - Same webhook handles both KYC and KYB events
  - 5-language translations for menu item

## Credentials
- Preview Admin: carlos@kbex.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Deployment
git pull -> sudo docker-compose up --build -d
Add `SUMSUB_KYB_LEVEL_NAME=<your-kyb-level>` to docker-compose.yml env vars

## Pending Issues
- P1: Reroute "Solicitar Acesso" to Lead Creation & Disable Public Registration
- P1: Dark / Light Mode Toggle (user requested)
- P2: Sidebar translation labels not fully mapped (Tokenizacao, Team Hub, Multi-Sign)
- P2: Safari cursor bug (recurring)

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor HTTP polling to WebSockets for crypto prices
- P2: Whitelist functionality
- P3: Product Pages (Launchpad, ICO)
- P3: Refactor OTCLeads.jsx (2300+ lines) and translations.js (6600+ lines)
