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
- **Demo Mode** (completed 2026-04-07): Full demo mode with rich mock data for sales pitches. Includes demo client Victoria Sterling, 8 wallets ($8M+ portfolio), 16 transactions, 5 OTC leads, 3 OTC deals, 3 bank deposits. Toggle in top-right bar. Amber banner when active. Dashboard, wallets, OTC leads/deals/clients all swap to demo data. Normal data fully isolated.

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
