# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n)

## Fully Translated Pages (i18n)
- **Public**: EarnPage, MarketsPage, LaunchpadPage, InstitutionalPage, CryptoATMPage, Header, Footer
- **Dashboard**: DashboardOverview, ExchangePage, WhitelistPage, FiatDepositPage, KYCStatus
- **OTC**: PreQualDialog, OTCLeads (inline helper)

## Business Accounts System
- Users create business accounts from Profile page
- Independent wallets per entity (filtered by entity_id in dashboard.py)
- Entity Switcher in sidebar (DashboardLayout.jsx)
- Sumsub KYB verification per business account
- Backend: `/api/business-accounts` CRUD + switch

## Client Tiers & Features (NEW — 2026-04-17)
- 5 tiers: Broker / Standard / Premium / VIP / Institucional (min allocations €190-€5000)
- Client page: `/dashboard/tiers` (comparison view + upgrade request flow)
- Admin page: `/dashboard/admin/tiers` (editable min allocations, per-feature cells, upgrade request inbox)
- Backend: `/api/client-tiers` GET/PUT + `/reset` + `/upgrade-request` + `/upgrade-requests`
- Seeded from KBEX canonical grid (10 sections: Perfil, Portefólio, Trading, Cold Wallet, Investimentos, Launchpad, Portal OTC, Forensic, Escrow, Multi-Sign)
- Translations (PT/EN/AR/FR/ES): `sidebar.tiersBenefits`, `sidebar.tiersAdmin`
- Sidebar: Perfil → "Níveis & Benefícios" (client); Gestão → "Níveis de Cliente" (admin)
- All tests pass: 19/19 backend, 100% frontend (iteration_51)

## Supported Fiat (Client-visible)
EUR, USD, AED, CHF, QAR, SAR, HKD

## Pending
- P1: Safari cursor bug

## VPS Deployment
- `cd /opt/boutiqueV1 && git fetch origin && git reset --hard origin/main-v1.1 && sudo docker compose build --no-cache && sudo docker compose up -d`

## Credentials
- Admin: carlos@kbex.io / senha123
