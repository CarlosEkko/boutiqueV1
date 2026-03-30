# KBEX.io — Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, GSAP, CRACO
- Backend: FastAPI, Pydantic, MongoDB (Motor)
- Deploy: Docker on VPS (kbex.io) | Preview: boutique-exchange.preview.emergentagent.com

## Implemented Features

### Access & Auth
- Public "Solicitar Acesso" -> CRM Lead + Brevo confirmation email
- /auth = Login only | /register = Registration for approved leads

### CRM General
- Public lead creation | Lead -> OTC conversion | Lead -> Registration email (Brevo)
- Client 360 view | Brevo CRM sync | Webhook tracking

### OTC Desk (11-Step Workflow)
- Full pipeline from Lead to Post-Sale
- OTC Client deletion with active deal protection
- Account Manager dropdown fetches real team members (user_type: internal)

### KYC/KYB (Sumsub Only)
- All KYC routes redirect to Sumsub WebSDK
- Manual KYC fallback removed
- /api/kyc/status checks both legacy and Sumsub status
- Backend: applicant creation, access token, webhook processing

### Team Hub (NEW)
- **Email**: Compose & send emails via Brevo, searchable sent history, email detail view
- **Calendar**: Monthly view, create/edit/delete events, color-coded, click-to-create on day
- **Tasks**: Create/edit/delete tasks, priority levels (urgent/high/medium/low), status toggle (todo/in_progress/done), assign to team members, due dates, filter by status
- **Stats**: Dashboard cards (emails today, total, pending tasks, upcoming events)
- Available to all internal staff via sidebar menu

### Admin
- User management | Client menus | Permissions by department
- Team Hub added as department with access for all staff roles

### Email (Brevo)
- Onboarding, registration, KYC templates
- Team Hub email composition
- Webhook endpoint for tracking

### Docker/VPS
- docker-compose.yml passes all env vars (Sumsub, Brevo, Binance, Stripe, etc.)
- .env.example with all required variables documented

## Key API Endpoints
- POST /api/team-hub/emails/send — Send team email via Brevo
- GET /api/team-hub/emails — List sent emails
- POST /api/team-hub/events — Create calendar event
- GET /api/team-hub/events — List events
- POST /api/team-hub/tasks — Create task
- GET /api/team-hub/tasks — List tasks with filters
- GET /api/team-hub/stats — Hub statistics
- DELETE /api/otc/clients/{id} — Delete OTC client
- POST /api/crm/leads/{id}/send-registration — Send registration email

## DB Collections
- team_emails, team_events, team_tasks (NEW)
- crm_leads, otc_leads, otc_clients, otc_deals, users, wallets

## Pending Issues
- P1: Safari cursor bug (recurring) | P1: Incomplete translations

## Upcoming Tasks
- P1: TradingView widgets | P2: WebSockets | P2: Whitelist | P3: Launchpad/ICO
