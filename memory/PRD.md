# KBEX.io - Product Requirements Document

## Original Problem Statement
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features: Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, Multi-sig Vaults, KYC (Sumsub), Fireblocks integration.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Context API
- Backend: FastAPI, MongoDB (Motor)
- External: Azure AD OAuth (O365), Brevo (Emails), Fireblocks SDK (v2.17.0), Sumsub (KYC)

## What's Been Implemented
- Full dashboard with portfolio, trading, assets views
- OTC CRM with 11-step workflow, lead cards, wizard modals
- General CRM with leads, deals, contacts, suppliers, tasks
- Fireblocks Staking (functional) and Tokenization (VERIFIED - 76 collections loading)
- Multi-language Brevo email service (PT, EN, AR, FR)
- Azure AD / Microsoft 365 OAuth integration
- Regional & Team filtering across CRM and OTC routes
- Admin permissions system with RBAC
- Transparency page (proof of reserves, audit reports)
- KYT Forensic page with tabs
- Multi-Sign vault functionality
- Client onboarding flow with invite codes

## Recent Fixes (April 2, 2026)
- Tokenization frontend VERIFIED: 76 collections rendering correctly from Fireblocks API
- TransparencyPage.jsx crash fixed
- LeadResponse model made resilient (extra="ignore", flexible status)
- CRMLeads.jsx membership_profile null safety
- DashboardLayout.jsx tickets filter error fixed
- Upload Proof modal redesigned with gold theme
- Country selector improved in ContactCTA
- Visão 360: Only shows wallets with balance > 0
- Added "Broker" tier option to OTC Lead
- Changed "Brazil" → "LATAM" in CRM region filters

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

## Project Health
- All features functional
- Mocked: WebSockets (using 1s HTTP polling)
