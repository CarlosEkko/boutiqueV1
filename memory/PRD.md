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
- OTC lead conversion correctly inherits potential_tier → membership_level
- Registration completion for auto-created users
- Translation key collision fix
- **Demo Mode** (completed 2026-04-07):
  - Full demo mode with rich mock data for sales pitches
  - Demo client Victoria Sterling: 8 wallets ($8M+ portfolio), 16 transactions
  - 7 crypto deposits + 5 crypto withdrawals with realistic data
  - 5 OTC leads + 3 OTC deals
  - 3 vault signatories + 4 vault transactions (multi-sign)
  - 3 bank deposits (fiat)
  - **Per-user demo permissions**: Admin can authorize users and control which 6 sections each sees (Portfolio, Crypto Ops, Fiat Ops, OTC, Vault, Transactions)
  - UI: Toggle in top bar, amber banner, section checkboxes in Admin Staff modal
- KB access fix: Endpoints use `get_internal_user` for support staff
- Fiat deposit isolation: Admin bank transfers restricted to finance roles
- Auto-assign leads to creator
- `set-internal-role` endpoint for user promotion

## Credentials
- Preview Admin: carlos@kbex.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Deployment
git pull -> sudo docker-compose up --build -d

## Pending Issues
- Sidebar translation labels not fully mapped (Tokenização, Team Hub, Multi-Sign) - P1
- Safari cursor bug (recurring, P2)

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor HTTP polling to WebSockets for crypto prices
- P2: Whitelist functionality
- P3: Product Pages (Launchpad, ICO)
- P3: Refactor OTCLeads.jsx (2300+ lines) and translations.js (6400+ lines)
