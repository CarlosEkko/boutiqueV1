# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features Exchange, OTC Desk, Professional Escrow (DvP), Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deployment: Docker Compose + Nginx (Cloudflare Strict SSL)

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury" UI/UX with trust and exclusivity
- Comprehensive OTC CRM with strict qualification workflows
- Professional OTC Escrow with DvP settlement, fee engine, compliance gating
- Demo Mode toggle for authorized users
- Dark/Light mode toggle (Dashboard only; Landing/Auth stay Dark)

## OTC Escrow Module — COMPLETE (All 3 Phases)

### Phase 1 (April 8, 2026)
- Data models with 10 escrow statuses (Draft → Closed)
- State machine with validated transitions
- Fee Engine: 4 schedules (Standard 0.5%, Premium 0.3%, Institutional 0.1%, Custom)
- Fee split: Buyer/Seller/Split 50-50
- Compliance section (KYC, AML, Source of Funds)
- Dispute management (open/resolve)
- Admin force-release with audit trail
- Escrow Dashboard with 7 KPIs
- Deal list with search, status/type filters
- 4-step creation wizard
- Deal detail with visual pipeline, timeline

### Phase 2 (April 8, 2026)
- Settlement Engine DvP: Dual-condition verification
- Deposit Management: Register deposits with tx_hash
- Advanced Fee Engine: Volume discount tiers (0-40% progressive)
- Fee Ledger dashboard with KPIs and invoice history
- Compliance Gating: Blocks advance unless all 4 checks approved
- Risk Scoring: Auto-calculated (0-100)
- Whitelist: Add/remove destination addresses per deal

### Phase 3 (April 8, 2026) — NEW
- **Enhanced Dispute Resolution**: Status workflow (Open → Under Review → Evidence Required → Resolved), evidence upload, message thread between parties, admin resolution (Buyer/Seller/Split)
- **Admin Force Release**: Enhanced force release with buyer/seller/split allocation and audit trail
- **Reporting & Audit Layer**: Escrow statements with date/status filters, KPI dashboard (total deals, volume, fees), CSV export, full audit trail viewer per deal
- **DisputePanel component**: Complete UI for dispute management within deal details
- **EscrowReports page**: Dedicated reporting page at /dashboard/escrow/reports

### Phase 3 API Endpoints
- PUT /api/escrow/deals/{id}/dispute/status
- POST /api/escrow/deals/{id}/dispute/evidence
- POST /api/escrow/deals/{id}/dispute/message
- POST /api/escrow/deals/{id}/admin-force-release
- GET /api/escrow/reports/statement
- GET /api/escrow/reports/audit-trail/{deal_id}
- GET /api/escrow/reports/export

## Sumsub KYC — FIXED (April 8, 2026)
- **Definitive solution**: Eliminated iframe entirely, uses Sumsub External WebSDK Link API
- Backend endpoint `POST /api/sumsub/generate-link` generates direct Sumsub verification URL
- Frontend opens Sumsub on their own domain (in.sumsub.com) in new tab
- Automatic polling (5s) detects verification completion
- Works on ALL browsers: Chrome, Safari, Firefox, Incognito — bypasses all CSP/iframe blocks

## Other Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL)
- OTC CRM: 11-step workflow
- Brevo email integration
- Trustfull Risk Intelligence
- Base64 JSON uploads
- Sidebar translations (5 languages)
- Demo Mode, Dark/Light toggle

## Upcoming Tasks
- P1: "Solicitar Acesso" → Lead OTC + Remove public registration
- P1: TradingView chart widgets
- P2: WebSocket prices (replace HTTP polling)

## Future Tasks
- P2: Whitelist functionality (user-level)
- P2: Brevo notifications for Escrow state changes
- P3: Product Pages (Launchpad, ICO)
- P3: Refactoring OTCLeads.jsx and translations.js

## Integrations
- Brevo (Emails), Sumsub (KYC), Trustfull (Risk), Binance & CoinMarketCap (Rates) — configured
- Fireblocks (Wallets) — broken
- Microsoft 365 (Azure AD) — pending

## Key Constraints
- Cloudflare WAF blocks multipart/form-data → use application/json
- Sumsub KYC → uses external link (no iframe) to bypass CSP
- Theme toggle applies ONLY to dashboard
