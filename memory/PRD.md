# KBEX.io - Product Requirements Document

## Original Problem Statement
Premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals.
Core features: Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, Multi-signature Vaults, automated KYC via Sumsub, and Fireblocks integration.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Context API
- Backend: FastAPI, MongoDB (Motor)
- External: Azure AD OAuth (Microsoft 365), Brevo (Emails), Fireblocks SDK (v2.17.0), Sumsub (KYC)

## What's Been Implemented
- Full dashboard with portfolio, trading, assets views
- OTC CRM with 11-step workflow, lead cards, wizard modals
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
- Re-seeded admin account with correct UserInDB model structure

## Prioritized Backlog
### P0
- Verify Tokenization frontend fix (`/dashboard/tokenization`)

### P1
- TradingView chart widgets on Trading/Markets pages
- Complete frontend translations (PT, EN, AR, FR)

### P2
- Safari cursor bug (recurring 21+ times)
- Refactor HTTP polling to WebSockets for crypto prices
- Whitelist functionality

### P3
- Product Pages (Launchpad and ICO)
- Refactor OTCLeads.jsx (2300+ lines)

## Credentials
- Admin: carlos@kryptobox.io / senha123

## Project Health
- Broken: Tokenization frontend (fix applied, needs verification)
- Mocked: WebSockets (using 1s HTTP polling)
