# KBEX.io — Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, GSAP, CRACO
- Backend: FastAPI, Pydantic, MongoDB (Motor)
- Deploy: Docker on VPS (kbex.io) | Preview: boutique-exchange.preview.emergentagent.com

## Implemented Features

### Access & Auth
- Public "Solicitar Acesso" -> CRM Lead (POST /api/crm/leads/public) + Brevo confirmation email
- /auth = Login only | /register = Registration for approved leads
- Duplicate email protection | No public sign-up on Auth page

### CRM General
- Public lead creation | Lead -> OTC conversion button
- **Send Registration Email**: CRM Leads page has mail button that sends Brevo onboarding email with registration link (POST /api/crm/leads/{id}/send-registration)
- Client 360 view: Manager, Wallets (asset name + balance + address), Trading stats
- Brevo CRM contact sync on lead creation
- Webhook tracking for email events

### OTC Desk (11-Step Workflow)
- Lead -> Verification -> Pre-Qual -> Setup -> RFQ -> Quote -> Accept -> Execute -> Settle -> Invoice -> Post-Sale
- Pipeline view | New Deal modal from existing contacts | Card-based lead layout

### KYC/KYB (Sumsub)
- **KYC Individual via Sumsub WebSDK** — automatic verification with selfie, ID document, liveness
- All old manual KYC routes redirect to Sumsub (`/dashboard/kyc/kyc` and `/dashboard/kyc/individual` both go to SumsubKYC)
- Backend: applicant creation, access token generation, webhook processing
- KYB manual flow still available for business verification

### Admin
- User management with Manager assignment
- Wallet display with asset_id/asset_name
- Client menu control (default: Portfolio + Perfil only)

### Email (Brevo)
- "Pedido de Acesso Recebido" for public leads
- "Complete o seu Registo" for approved leads (sent via CRM button)
- "Atualizacao de Documentos" for KYC reminders
- Webhook endpoint at /api/webhooks/brevo

### Integrations
- Brevo (emails + CRM sync + webhooks) | Sumsub (KYC - working) | Fireblocks (wallets - broken) | CoinMarketCap/Binance (rates)

## Key API Endpoints
- POST /api/crm/leads/public — Public lead creation
- POST /api/crm/leads/{id}/send-registration — Send registration email
- POST /api/crm/leads/{id}/convert-to-otc — CRM -> OTC conversion
- POST /api/sumsub/applicants — Create Sumsub applicant
- POST /api/sumsub/access-token — Generate WebSDK token
- GET /api/sumsub/status — Get KYC status
- POST /api/sumsub/webhook — Sumsub webhook receiver

## Docker / VPS Deploy
All environment variables must be in `.env` at project root (see `.env.example`).
docker-compose.yml now passes all required env vars (Sumsub, Brevo, Binance, Stripe, etc.)

```bash
cd /opt/boutiqueV1 && git pull && sudo docker-compose down && sudo docker-compose build --no-cache && sudo docker-compose up -d
```

## Pending Issues
- P1: Safari cursor bug (recurring) | P1: Incomplete translations | P2: Fireblocks broken

## Upcoming Tasks
- P1: TradingView widgets | P2: WebSockets for prices | P2: Whitelist | P3: Launchpad/ICO pages
