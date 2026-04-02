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
- Fireblocks Staking (functional) and Tokenization (backend fix applied)
- Multi-language Brevo email service (PT, EN, AR, FR)
- Azure AD / Microsoft 365 OAuth integration
- Regional & Team filtering across CRM and OTC routes
- Admin permissions system with RBAC
- Transparency page (proof of reserves, audit reports)
- KYT Forensic page with tabs
- Multi-Sign vault functionality
- Client onboarding flow with invite codes

## Bug Fixes (April 2, 2026)
- Fixed TransparencyPage.jsx crash: `wallet.parseFloat(balance)` → `parseFloat(wallet.balance || 0)`
- Made LeadResponse model more resilient: status as string, optional dates, extra="ignore"
- Fixed CRMLeads.jsx membership_profile null safety
- Fixed DashboardLayout.jsx ticketsRes.value.data.filter error
- Redesigned Upload Proof modal with gold theme, proper labels, drag-drop area
- Improved country selector in ContactCTA with better spacing and readability
- Visão 360: Only shows wallets with balance > 0, shows "Ainda não tem saldo" message
- Added "Broker" tier option to OTC Lead creation and edit
- Changed "Brazil" → "LATAM" in CRM Leads and Suppliers region filters
- Re-seeded admin account with correct UserInDB model structure

## Prioritized Backlog
### P0
- Verify Tokenization frontend fix (`/dashboard/tokenization`)

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
- Fixed: TransparencyPage, CRM Leads resilience, Notification tickets filter, Upload Proof UX, Country selector, Visão 360 wallets, OTC Tier Broker, Region LATAM
- Pending Test: Tokenization frontend
- Mocked: WebSockets (using 1s HTTP polling)
