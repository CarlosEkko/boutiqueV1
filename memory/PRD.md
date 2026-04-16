# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n)

## Business Accounts System (NEW - 2026-04-16)
- Users can create business accounts from Profile page
- Each business account has independent wallets (fiat: EUR, USD, AED, CHF, QAR, SAR, HKD)
- Entity Switcher in sidebar: toggle between Personal and Business accounts
- Business accounts go through Sumsub KYB verification
- Backend: `/api/business-accounts` CRUD + `/api/business-accounts/switch`
- DB Collections: `business_accounts`, `wallets` (with entity_id field)

## Pages Fully Translated (i18n)
- DashboardOverview, ExchangePage, WhitelistPage, FiatDepositPage, PreQualDialog, OTCLeads

## Supported Fiat Currencies (Client-visible)
EUR, USD, AED, CHF, QAR, SAR, HKD (GBP/BRL hidden)

## Pending Issues
- P1: Safari cursor bug (recurring)

## VPS Deployment
- Dir: `/opt/boutiqueV1`, Branch: `main-v1.1`
- Deploy: `cd /opt/boutiqueV1 && git fetch origin && git reset --hard origin/main-v1.1 && sudo docker compose build --no-cache && sudo docker compose up -d`

## Credentials
- Admin: carlos@kbex.io / senha123
