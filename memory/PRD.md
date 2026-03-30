# KBEX.io — Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, GSAP
- Backend: FastAPI, Pydantic, MongoDB (Motor)
- Deploy: Docker on VPS (kbex.io) | Preview: boutique-exchange.preview.emergentagent.com

## Implemented Features

### Access & Auth
- Public "Solicitar Acesso" -> CRM Lead (POST /api/crm/leads/public) + Brevo confirmation email
- /auth = Login only | /register = Registration for approved leads
- Duplicate email protection | No public sign-up on Auth page

### CRM General
- Public lead creation | Lead -> OTC conversion button | Lead -> Client via registration email
- **Send Registration Email**: Button on CRM Leads sends Brevo onboarding email with registration link instead of converting directly to client (POST /api/crm/leads/{id}/send-registration)
- Client 360 view: Manager, Wallets (asset name + balance + address), Trading stats
- Brevo CRM contact sync on lead creation
- Webhook tracking for email events (delivered/opened/clicked/bounced)

### OTC Desk (11-Step Workflow)
- Lead -> Verification -> Pre-Qual -> Setup -> RFQ -> Quote -> Accept -> Execute -> Settle -> Invoice -> Post-Sale
- Pipeline view | New Deal modal from existing contacts | Card-based lead layout

### Admin
- User management with Manager assignment (using assigned_to field)
- Wallet display with asset_id/asset_name for proper coin identification
- Client menu control (default: Portfolio + Perfil only)

### Email (Brevo)
- "Pedido de Acesso Recebido" template for public leads
- "Complete o seu Registo" template for approved leads (sent via CRM button)
- "Atualizacao de Documentos" for KYC reminders
- Webhook endpoint at /api/webhooks/brevo for tracking

### Integrations
- Brevo (emails + CRM sync + webhooks) | Sumsub (KYC) | Fireblocks (wallets - broken) | CoinMarketCap/Binance (rates)

## Key API Endpoints
- POST /api/crm/leads/public — Public lead creation
- POST /api/crm/leads/{id}/send-registration — Send registration email to lead (replaces old convert endpoint)
- POST /api/crm/leads/{id}/convert-to-otc — CRM -> OTC conversion
- GET /api/crm/clients/{id} — Client 360 detail (manager + wallets)
- POST /api/webhooks/brevo — Email event webhook
- GET /api/webhooks/brevo/events/{email} — Email tracking query

## VPS Deploy Path
```bash
cd /opt/boutiqueV1 && git pull && sudo docker-compose down && sudo docker-compose build --no-cache && sudo docker-compose up -d
```

## Pending Issues
- P1: Safari cursor bug | P1: Incomplete translations | P2: Fireblocks broken

## Upcoming Tasks
- P1: TradingView widgets | P2: WebSockets for prices | P2: Whitelist | P3: Launchpad/ICO pages
