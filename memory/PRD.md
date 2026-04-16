# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n)

## Pages Fully Translated (i18n) — 2026-04-16
- EarnPage, MarketsPage, LaunchpadPage, InstitutionalPage, CryptoATMPage
- DashboardOverview, ExchangePage, WhitelistPage, FiatDepositPage
- PreQualDialog, OTCLeads, KYCStatus

## Business Accounts System
- Users create business accounts from Profile page
- Independent wallets per entity (filtered by entity_id)
- Entity Switcher in sidebar
- Sumsub KYB verification per business account

## Supported Fiat (Client-visible)
EUR, USD, AED, CHF, QAR, SAR, HKD

## Pending
- P1: Safari cursor bug

## VPS Deployment
- `cd /opt/boutiqueV1 && git fetch origin && git reset --hard origin/main-v1.1 && sudo docker compose build --no-cache && sudo docker compose up -d`

## Credentials
- Admin: carlos@kbex.io / senha123
