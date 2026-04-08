# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, React Context
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Integrations: Sumsub (KYC + KYB Quest), Trustfull, Brevo, Fireblocks
- Infrastructure: Docker on VPS, Cloudflare WAF

## What's Implemented
- Multi-currency viewing with real-time crypto prices
- Fiat deposits/withdrawals, wallet management
- Complete OTC CRM (11-stage workflow)
- Invite-only registration gate
- Hierarchical access control (region-based)
- 5-language support (EN, PT, AR, FR, ES)
- Demo Mode with rich mock data
- OTC Desk Flow with pre-qualification and setup
- TinyMCE Knowledge Base Editor
- Cloudflare SSL configuration
- **OTC Setup Status Fix (2026-04-08)**: Status advances to `setup_complete`
- **KYC/KYB Verifications Page (2026-04-08)**: Real-time Sumsub verification status with docs, refresh, Sumsub dashboard link. KYB Quest support.
- **Balance Adjustments (2026-04-08)**: Admin manual balance adjustments (credit/debit) with categories, reason, document upload, full audit trail.
- **Bug Fix Ver Comprovativo (2026-04-08)**: Fixed field name mismatch (`proof_document_url` vs `proof_url`) in AdminFiatDeposits.
- **CRM Visao 360 Completa (2026-04-08)**:
  - Backend: Fetches bank_transfers (deposits + withdrawals), trading orders, and includes all in activity timeline
  - Activity tab: Shows deposits fiat, levantamentos fiat, compras crypto, vendas crypto with distinct colors, icons, amounts, and status badges
  - Wallets tab: Shows ALL wallets (not just > 0), with red color for negative balances
  - Resumo Rapido: Shows counts for deposits fiat, levantamentos, ordens, transacoes, tickets

## Credentials
- Preview Admin: carlos@kbex.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Deployment
git pull -> sudo docker-compose up --build -d

## Pending Issues
- P1: Reroute "Solicitar Acesso" to Lead Creation & Disable Public Registration
- P1: Dark / Light Mode Toggle
- P2: Sidebar translation labels (Tokenizacao, Team Hub, Multi-Sign)
- P2: Safari cursor bug

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: WebSockets for crypto prices
- P2: Whitelist functionality
- P3: Product Pages (Launchpad, ICO)
- P3: Refactor OTCLeads.jsx and translations.js
