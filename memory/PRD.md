# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n)

## Pages Fully Translated (i18n)
- DashboardOverview (KYC status, no assets, pending approval)
- ExchangePage (buy/sell/convert, limits, fees, statuses)
- WhitelistPage (all labels, modals, statuses)
- FiatDepositPage (title, steps, buttons, history)
- PreQualDialog (FATF checklist, all fields)
- OTCLeads (via inline helper)

## Supported Fiat Currencies
EUR, USD, AED, BRL, GBP, CHF, QAR, SAR, HKD

## Pending Issues
- P1: Safari cursor bug (recurring)

## VPS Deployment
- Dir: `/opt/boutiqueV1`, Branch: `main-v1.1`
- Deploy: `cd /opt/boutiqueV1 && git fetch origin && git reset --hard origin/main-v1.1 && sudo docker compose build --no-cache && sudo docker compose up -d`

## Credentials
- Admin: carlos@kbex.io / senha123
