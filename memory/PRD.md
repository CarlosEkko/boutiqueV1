# KBEX.io - Product Requirements Document

## Original Problem Statement
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features: Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, Multi-sig Vaults, KYC (Sumsub), Fireblocks integration for Wallets, Staking, Tokenization.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Context API
- Backend: FastAPI, MongoDB (Motor)
- External: Azure AD OAuth (O365), Brevo (Emails), Fireblocks SDK (v2.17.0), Sumsub (KYC), Trustfull (Risk Intelligence)

## What's Been Implemented
- Full dashboard with portfolio, trading, assets views
- OTC CRM with 11-step workflow, lead cards, wizard modals
- General CRM with leads, deals, contacts, suppliers, tasks
- Fireblocks Staking (functional, white-labeled)
- Fireblocks Tokenization — Full module with 5 pages (Tokens, Issue, Mint/Burn, Pricing, Management)
- KYC via Sumsub WebSDK (alpha-2→alpha-3 country code fix applied)
- Risk Intelligence via Trustfull API
- Multi-language Brevo email service (PT, EN, AR, FR)
- Azure AD / Microsoft 365 OAuth integration
- Regional & Team filtering across CRM and OTC routes
- Admin permissions with RBAC
- Transparency page (proof of reserves, audit reports)
- KYT Forensic, Multi-Sign vaults, Client onboarding

## Recent Fixes (April 2, 2026)
- **KYC Sumsub**: Fixed alpha-2→alpha-3 country code conversion (PT→PRT, BR→BRA, etc.)
- **Tokenization**: Created TOKENIZATION department with 5 pages and 3 new API endpoints
- **Staking**: White-labeled (removed Fireblocks provider names)
- **TransparencyPage**: Fixed JS crash
- **CRM Leads**: Made LeadResponse resilient, fixed membership_profile null safety
- **DashboardLayout**: Fixed tickets filter, made sidebar sticky with scroll
- **Upload Proof**: Redesigned modal, improved country selector, Visão 360 wallet filter
- **OTC**: Added Broker tier, changed Brazil→LATAM

## VPS Environment Variables Required
```
SUMSUB_APP_TOKEN=sbx:dpO6W3ZjM3U25gTpBEQcHDrY.darrPSKvDyPR9ZRsjTgM5PFPephCgApn
SUMSUB_SECRET_KEY=Pkcg1kugWrtBWEmqdbzbXHZuU3lddVbZ
SUMSUB_LEVEL_NAME=basic-kyc-level
TRUSTFULL_API_KEY=TFB-6f279de1-6859-4ca3-8ead-28debc6ec989
```

## Prioritized Backlog
### P1
- TradingView chart widgets on Trading/Markets pages
- Complete frontend translations (PT, EN, AR, FR)

### P2
- Safari cursor bug (recurring 21+ times)
- Refactor HTTP polling to WebSockets
- Whitelist functionality

### P3
- Product Pages (Launchpad and ICO)
- Refactor OTCLeads.jsx (2300+ lines)

## Credentials
- Admin: carlos@kryptobox.io / senha123
- Test Client: joao.mirror999@test.com / senha123
