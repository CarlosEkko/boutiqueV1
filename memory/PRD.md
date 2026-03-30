# KBEX.io — Product Requirements Document

## Overview
KBEX.io is a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, GSAP, CRACO
- Backend: FastAPI, Pydantic, MongoDB (Motor)
- Deploy: Docker on VPS (kbex.io)

## Implemented Features

### Team Hub (Email Client + Calendar + Tasks)
- **Email Client (3-column layout)**:
  - Sidebar: account info, compose button, folders (Enviados, Rascunhos), signature settings
  - Email list: search, sender, subject, snippet, timestamp
  - Reading pane: full email view with sender avatar, status badge
  - Composer: To/Name/Subject fields, rich text editor with toolbar (Bold, Italic, Underline, Links, Lists, Alignment, Font Size, Text Color)
  - Auto-appends email signature to sent emails
  - Drafts: save, edit, delete
- **Email Signature**: configurable per user, rich text editor, preview
- **Calendar**: Monthly view, create/edit/delete events, color-coded, click-on-day creation
- **Tasks**: Create/edit/delete, priority levels, status toggle, assign to team members, due dates, filter by status
- **Stats dashboard**: emails today, total, pending tasks, upcoming events

### Access & Auth
- Public "Solicitar Acesso" -> CRM Lead + Brevo email
- /auth = Login only | /register = Approved leads only

### CRM General
- Lead creation, OTC conversion, registration email via Brevo
- Client 360 view, Brevo CRM sync, webhook tracking

### OTC Desk (11-Step Workflow)
- Full pipeline, OTC client deletion, dynamic account manager dropdown

### KYC/KYB (Sumsub Only)
- All KYC routes redirect to Sumsub WebSDK, manual removed

### Docker/VPS
- docker-compose.yml with all env vars, .env.example documented

## Key API Endpoints
- POST /api/team-hub/emails/send — Send email via Brevo
- GET /api/team-hub/emails — List sent emails
- POST/GET/DELETE /api/team-hub/drafts — Draft management
- GET/PUT /api/team-hub/signature — Email signature CRUD
- POST/GET/PUT/DELETE /api/team-hub/events — Calendar events
- POST/GET/PUT/DELETE /api/team-hub/tasks — Task management
- GET /api/team-hub/stats — Hub statistics

## DB Collections
- team_emails, team_drafts, email_signatures, team_events, team_tasks (NEW)
- crm_leads, otc_leads, otc_clients, otc_deals, users, wallets

## Pending Issues
- P1: Safari cursor bug | P1: Incomplete translations

## Upcoming Tasks
- P1: TradingView widgets | P2: WebSockets | P2: Whitelist | P3: Launchpad/ICO
