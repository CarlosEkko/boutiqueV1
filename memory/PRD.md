# KBEX.io — Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include an Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC via Sumsub.

## Core Requirements
- Fully translated platform (PT, EN, AR)
- "Quiet luxury", trust, and exclusivity in UI/UX
- Comprehensive OTC CRM with strict qualification and workflows
- Invite/approval-only access model (no public registration)

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, GSAP animations
- **Backend**: FastAPI, Pydantic, MongoDB (Motor)
- **Deployment**: Docker, Docker-Compose on VPS (kbex.io)
- **Integrations**: Brevo (emails), Sumsub (KYC), Fireblocks (wallets), Stripe (payments), CoinMarketCap/Binance (rates)

## User Personas
- **Admin/Operator**: Manages OTC desk, CRM, leads, clients
- **Client (HNW/UHNW)**: Accesses exchange, OTC trading, wallets after approval

## Access Model
- Public website visitors can only "Solicitar Acesso" (Request Access) which generates an OTC Lead
- No public registration — AuthPage is login-only
- Accounts are created internally by admin after lead qualification

## Implemented Features

### Landing Page & Auth
- Animated hero with GSAP transitions
- Public "Solicitar Acesso" form creates OTC Lead via `POST /api/otc/leads/public` (no auth required)
- Duplicate email protection (prevents duplicate leads)
- Auth page: Login only, no public registration
- `/register` route redirects to `/auth`
- "Solicitar Acesso" link on login page redirects to landing page contact form

### OTC Desk (11-Step Workflow)
1. Lead Creation
2. Client Verification
3. Pre-Qualification
4. Operational Setup
5. RFQ
6. Quote
7. Acceptance
8. Execution
9. Settlement
10. Invoice
11. Post-Sale

### OTC CRM
- Horizontal card layout for leads with status badges
- Multi-step modals for lead creation and pre-qualification
- "Existing Contact Found" alert with quick actions
- Pipeline view for deal flow (RFQ to Post-Sale)

### Email Integration
- Brevo transactional emails for onboarding
- Auto-sends welcome email on new public lead creation

### Dashboard & Admin
- Multi-currency viewing, fiat deposits
- KYC management via Sumsub
- Staff management, permissions, referrals
- Bank accounts, company accounts
- Knowledge base, support tickets

## Key API Endpoints
- `POST /api/otc/leads/public` — Public lead creation (no auth)
- `POST /api/otc/leads` — Internal lead creation (auth required)
- `PUT /api/otc/leads/{id}/stage` — Advance lead through workflow
- `GET /api/otc/leads` — List leads with filtering
- `POST /api/otc/deals` — Create OTC deal
- `POST /api/otc/quotes` — Create quote for deal

## Key DB Collections
- `otc_leads`: {workflow_stage, status, pre_qualification_data, red_flags, source, contact_*}
- `otc_clients`: {entity_name, contact_*, daily/monthly_limit, settlement_method}
- `otc_deals`: {deal_number, client_id, stage, amount, pricing}
- `users`: {email, password, user_type, kyc_status, is_admin}

## Pending Issues
- P1: Safari cursor bug (recurring 11+ times, CSS incompatibility)
- P1: Incomplete frontend translations (translations.js)
- P2: Fireblocks integration broken (requires API key debugging)

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor 1s HTTP polling to WebSockets for crypto prices
- P2: Whitelist functionality
- P3: Product Pages (Launchpad and ICO)

## Refactoring Needed
- OTCLeads.jsx (2300+ lines) should be broken into smaller components

## Credentials
- Admin: carlos@kryptobox.io / senha123
- VPS: https://kbex.io
