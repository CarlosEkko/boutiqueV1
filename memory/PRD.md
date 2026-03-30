# KBEX.io — Product Requirements Document

## Visão Geral
**KBEX.io** é uma Boutique Exchange de Crypto premium para indivíduos High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW). 

## Stack Técnico
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Integrações**: Brevo (CRM/Emails automáticos), Sumsub (KYC), Microsoft 365 (Email/Calendar/Tasks), Stripe, Fireblocks
- **Deploy**: Docker Compose em VPS

## Funcionalidades Core
1. Exchange de Crypto (multi-moeda)
2. OTC Desk com CRM completo (11 etapas de workflow)
3. Carteiras Fiat/Crypto
4. Onboarding com KYC automatizado (Sumsub)
5. CRM Geral + OTC CRM
6. Team Hub interno (Email O365, Calendário, Tarefas)

## Integrações Implementadas

### Microsoft 365 (Office 365) — IMPLEMENTADO
- **OAuth2**: Authorization code flow com Azure AD
- **Email**: Inbox completo via Microsoft Graph API (ler, responder, reencaminhar, mover, eliminar, enviar)
- **Calendário**: Sincronizado com Outlook Calendar (CRUD eventos)
- **Tarefas**: Sincronizado com Microsoft To Do (CRUD tarefas)
- **Credenciais**: Azure AD App Registration (Tenant ID, Client ID, Client Secret em backend/.env)
- **Pastas Email**: Inbox, Rascunhos, Enviados, Junk, Lixo, Arquivo, Conversações
- **5 contas suportadas**: Cada utilizador KBEX conecta a sua conta O365

### Brevo — IMPLEMENTADO
- Emails transacionais automáticos (onboarding, KYC, OTC)
- CRM Sync

### Sumsub — IMPLEMENTADO
- KYC automatizado via WebSDK

## Estrutura do Team Hub
- **Dashboard** (`/dashboard/team-hub/dashboard`): Visão geral com stats, próximos eventos, tarefas pendentes
- **Team Hub** (`/dashboard/team-hub`): Email Client 3 colunas + Calendário + Tarefas (tabs)

## Arquitetura de Ficheiros
```
/app
├── backend/
│   ├── routes/
│   │   ├── microsoft365.py          # OAuth2 + Graph API (Email/Calendar/Tasks)
│   │   ├── team_hub.py              # Team Hub stats + legacy endpoints
│   │   ├── otc.py                   # OTC CRM
│   │   └── auth.py                  # Autenticação JWT
│   ├── services/
│   │   └── email_service.py         # Brevo transactional emails
│   └── models/
│       └── permissions.py           # Permissões + menus (TEAM_HUB dept)
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── auth/
    │   │   │   └── O365Callback.jsx # OAuth callback handler
    │   │   └── dashboard/
    │   │       └── team/
    │   │           ├── TeamHub.jsx        # Email/Calendar/Tasks (tabs)
    │   │           ├── TeamHubDashboard.jsx # Dashboard page (stats)
    │   │           └── EmailClient.jsx    # 3-column O365 email client
    │   └── App.js                   # Routes
```

## API Endpoints — Microsoft 365
- `GET /api/o365/auth/url` — Generate OAuth URL
- `POST /api/o365/auth/callback` — Exchange code for tokens
- `GET /api/o365/auth/status` — Check connection status
- `DELETE /api/o365/auth/disconnect` — Disconnect account
- `GET /api/o365/mail/folders` — List mail folders
- `GET /api/o365/mail/messages` — List messages
- `GET /api/o365/mail/messages/{id}` — Message detail
- `POST /api/o365/mail/send` — Send email
- `POST /api/o365/mail/messages/{id}/reply` — Reply
- `POST /api/o365/mail/messages/{id}/forward` — Forward
- `POST /api/o365/mail/messages/{id}/move` — Move to folder
- `DELETE /api/o365/mail/messages/{id}` — Delete
- `GET /api/o365/calendar/events` — List events
- `POST /api/o365/calendar/events` — Create event
- `PATCH /api/o365/calendar/events/{id}` — Update event
- `DELETE /api/o365/calendar/events/{id}` — Delete event
- `GET /api/o365/tasks/lists` — List task lists
- `GET /api/o365/tasks/lists/{id}/tasks` — List tasks
- `POST /api/o365/tasks/lists/{id}/tasks` — Create task
- `PATCH /api/o365/tasks/lists/{id}/tasks/{id}` — Update task
- `DELETE /api/o365/tasks/lists/{id}/tasks/{id}` — Delete task

## DB Collections (MongoDB)
- `o365_tokens`: {user_id, access_token, refresh_token, expires_at, account_email, account_name}
- `o365_states`: {user_id, state, created_at} (OAuth state validation)

## Issues Pendentes
- P1: Safari cursor bug (CSS)
- P1: Traduções frontend incompletas

## Backlog
- P2: TradingView chart widgets
- P2: WebSockets (substituir HTTP polling)
- P2: Whitelist
- P3: Launchpad/ICO pages
