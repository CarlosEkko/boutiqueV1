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

## OTC Escrow Module — COMPLETE

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
- **Settlement Engine DvP**: Dual-condition verification (Buyer + Seller deposits confirmed → atomic settlement)
- **Deposit Management**: Register deposits with tx_hash, source_address; Confirm/reject deposits; Auto-advance to funded when all deposits confirmed
- **Advanced Fee Engine**: Volume discount tiers (0-40% progressive by ticket size); Fee ledger (escrow_fee_ledger collection); Fee revenue dashboard with KPIs, schedule breakdown, invoice history
- **Compliance Gating**: Blocks advance to ready_for_settlement unless all 4 checks approved (buyer_kyc, seller_kyc, aml_check, source_of_funds)
- **Risk Scoring**: Auto-calculated (0-100) based on ticket_size, compliance, structure, settlement_type
- **Whitelist**: Add/remove destination addresses per deal
- **Settlement Record**: Full settlement details stored on deal with fee invoice in separate ledger

### API Endpoints (Complete)
- GET /api/escrow/dashboard
- GET/POST /api/escrow/deals
- GET/PUT/DELETE /api/escrow/deals/{id}
- POST /api/escrow/deals/{id}/advance (with compliance gate)
- POST /api/escrow/deals/{id}/deposit
- POST /api/escrow/deals/{id}/confirm-deposit (with auto-advance)
- POST /api/escrow/deals/{id}/settle (DvP + fee ledger)
- POST /api/escrow/calculate-fee
- PUT /api/escrow/deals/{id}/compliance
- POST /api/escrow/deals/{id}/dispute
- POST /api/escrow/deals/{id}/resolve-dispute
- POST /api/escrow/deals/{id}/force-release
- GET /api/escrow/fee-ledger
- GET /api/escrow/fee-ledger/summary
- GET /api/escrow/volume-tiers
- GET/POST/DELETE /api/escrow/deals/{id}/whitelist

## Other Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL)
- OTC CRM: 11-step workflow
- Brevo email integration
- Sumsub KYC/KYB (Safari fallback)
- Trustfull Risk Intelligence
- Base64 JSON uploads
- Sidebar translations (5 languages)
- Demo Mode, Dark/Light toggle

## Upcoming Tasks
- P2: TradingView chart widgets
- P2: WebSocket prices (replace HTTP polling)

## Future Tasks
- P2: Whitelist functionality (user-level)
- P3: Product Pages (Launchpad, ICO)
- P3: Escrow Phase 3: Enhanced Dispute Resolution UI, Reporting/Audit, CSV/PDF export

## Integrations
- Brevo (Emails), Sumsub (KYC), Trustfull (Risk), Binance & CoinMarketCap (Rates) — configured
- Fireblocks (Wallets) — broken
- Microsoft 365 (Azure AD) — pending

## Key Constraints
- Cloudflare WAF blocks multipart/form-data → use application/json
- Safari ITP blocks Sumsub iframe → fallback new tab
- Theme toggle applies ONLY to dashboard
