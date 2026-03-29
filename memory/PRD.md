# KBEX.io — Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include an Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC via Sumsub.

## Core Requirements
- Fully translated platform (PT, EN, AR)
- "Quiet luxury", trust, and exclusivity in UI/UX
- Comprehensive OTC CRM with strict qualification and workflows
- Invite/approval-only access model (no public registration on main site)

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, GSAP animations
- **Backend**: FastAPI, Pydantic, MongoDB (Motor)
- **Deployment**: Docker, Docker-Compose on VPS (kbex.io)
- **Integrations**: Brevo (emails), Sumsub (KYC), Fireblocks (wallets), Stripe (payments), CoinMarketCap/Binance (rates)

## Access Model
- Public visitors → "Solicitar Acesso" form → creates CRM Lead (POST /api/crm/leads/public)
- Admin qualifies lead → can convert to OTC Lead (POST /api/crm/leads/{id}/convert-to-otc)
- Approved leads receive direct link: https://kbex.io/register to create account
- /auth page = Login only (no sign up toggle)
- /register page = Full registration form (Name, Email, Password, Phone, Country)

## Implemented Features

### Landing Page & Auth (Updated 29/03/2026)
- Public "Solicitar Acesso" form creates **CRM Lead** via POST /api/crm/leads/public
- Duplicate email protection
- Confirmation email sent via Brevo (template: "Pedido de Acesso Recebido")
- /auth = Login only, with "Solicitar Acesso" link
- /register = Standalone registration page for approved leads
- GSAP animated hero section

### CRM General (Updated 29/03/2026)
- Public lead creation endpoint (no auth)
- Lead management with cards, filters, search
- **Convert to OTC Lead** button on each lead card
- Convert to Client functionality
- Deals, Contacts, Tasks, Suppliers modules

### OTC Desk (11-Step Workflow)
1. Lead Creation → 2. Client Verification → 3. Pre-Qualification → 4. Operational Setup
5. RFQ → 6. Quote → 7. Acceptance → 8. Execution → 9. Settlement → 10. Invoice → 11. Post-Sale

### Email Integration
- Brevo transactional emails
- New template: "Pedido de Acesso Recebido" for public leads
- Onboarding email for registered leads

### Dashboard & Admin
- Multi-currency viewing, fiat deposits
- KYC management via Sumsub
- Staff management, permissions, referrals

## Key API Endpoints
- `POST /api/crm/leads/public` — Public CRM lead creation (no auth)
- `POST /api/crm/leads/{id}/convert-to-otc` — Convert CRM lead to OTC lead (auth)
- `POST /api/crm/leads/{id}/convert` — Convert lead to client (auth)
- `POST /api/otc/leads` — Internal OTC lead creation (auth)
- `PUT /api/otc/leads/{id}/stage` — Advance OTC lead through workflow
- `POST /api/auth/register` — Account registration
- `POST /api/auth/login` — Account login

## Key DB Collections
- `crm_leads`: {name, email, phone, source, status, tags, is_qualified, ...}
- `otc_leads`: {workflow_stage, status, pre_qualification_data, red_flags, source, contact_*}
- `users`: {email, password, user_type, kyc_status, is_admin}

## Pending Issues
- P1: Safari cursor bug (recurring 11+ times, CSS incompatibility)
- P1: Incomplete frontend translations (translations.js)
- P2: Fireblocks integration broken

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor 1s HTTP polling to WebSockets for crypto prices
- P2: Whitelist functionality
- P3: Product Pages (Launchpad and ICO)

## Refactoring Needed
- OTCLeads.jsx (2300+ lines) should be broken into smaller components
