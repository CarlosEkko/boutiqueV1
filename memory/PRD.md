# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, React Context
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Integrations: Sumsub, Trustfull, Brevo, Fireblocks
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
- **Demo Mode** (completed 2026-04-07):
  - Full demo mode with rich mock data for sales pitches
  - Demo client Victoria Sterling: 8 wallets ($8M+ portfolio), 16 transactions
  - 7 crypto deposits + 5 crypto withdrawals with realistic data
  - 5 OTC leads + 3 OTC deals
  - 3 vault signatories + 4 vault transactions (multi-sign)
  - 3 bank deposits (fiat)
  - Demo Profile Mock, Demo Bank Accounts Mock
  - Per-user demo permissions
  - Edit/Add/Delete actions disabled in demo mode
- KB access fix, Fiat deposit isolation, Auto-assign leads
- OTC Desk Flow Verification (2026-04-12)
- TinyMCE Knowledge Base Editor
- CSP and security headers in nginx.conf
- Cloudflare SSL configuration
- **OTC Setup Status Fix (2026-04-08)**:
  - Added `setup_complete` status to OTCLeadStatus enum
  - After operational setup submission, status now transitions to `setup_complete` (not `setup_pending`)
  - Convert to Client accepts `setup_complete` status
  - Frontend tabs and LeadCard updated with "Setup Completo" label and styling
  - Migrated existing `setup_pending` leads in DB to `setup_complete`

## Credentials
- Preview Admin: carlos@kbex.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Deployment
git pull -> sudo docker-compose up --build -d

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
