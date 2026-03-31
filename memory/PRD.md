# KBEX.io — Product Requirements Document

## Visão Geral
**KBEX.io** é uma Boutique Exchange de Crypto premium para indivíduos High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW). 

## Stack Técnico
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, MongoDB (Motor), Pydantic
- **Integrações**: Brevo (CRM/Emails automáticos), Sumsub (KYC), Microsoft 365 (Email/Calendar/Tasks), Stripe, Fireblocks, Trustfull (Risk Intelligence API)
- **Deploy**: Docker Compose em VPS

## Funcionalidades Core
1. Exchange de Crypto (multi-moeda)
2. OTC Desk com CRM completo (11 etapas de workflow)
3. Carteiras Fiat/Crypto
4. Onboarding com KYC automatizado (Sumsub)
5. CRM Geral + OTC CRM
6. Team Hub interno (Email O365, Calendário, Tarefas)
7. Risk Intelligence (scoring de risco para leads via Trustfull API, sem branding visível)

## Integrações Implementadas

### Risk Intelligence — IMPLEMENTADO
- **API Backend**: Trustfull (api.fido.id) para scoring de email e telefone
- **CRM Leads**: Auto-scan na criação + scan manual via botão Shield + badge RI na listagem + secção completa no modal de detalhe
- **OTC Leads**: Mesma funcionalidade, dados armazenados em `trustfull_data` (backward compat)
- **Conversão CRM→OTC**: Dados de `risk_intelligence_data` são transferidos para `trustfull_data` automaticamente
- **Branding**: Apenas "Risk Intelligence" visível no frontend (sem referência a "Trustfull")

### Microsoft 365 (Office 365) — IMPLEMENTADO
- OAuth2, Email via Graph API, Calendário, Tarefas

### Brevo — IMPLEMENTADO
- Emails transacionais automáticos (onboarding, KYC, OTC)

### Sumsub — IMPLEMENTADO
- KYC automatizado via WebSDK

## Formulário Público "Solicitar Acesso"
- Campos obrigatórios: Nome, Email, Telefone (todos com asterisco)
- Gera CRM Lead geral (não OTC)
- Auto-trigger Risk Intelligence scan
- Envia email de confirmação via Brevo

## API Endpoints — Risk Intelligence
- `POST /api/crm/leads/{id}/risk-scan` — Scan manual CRM lead
- `POST /api/otc/leads/{id}/risk-scan` — Scan manual OTC lead
- `POST /api/crm/leads/{id}/convert-to-otc` — Converte com transferência de RI data

## DB Collections (MongoDB)
- `crm_leads`: `risk_intelligence_data: dict` (score global, email_risk, phone_risk, red_flags)
- `otc_leads`: `trustfull_data: dict` (mesma estrutura, backward compat)
- `o365_tokens`: {user_id, access_token, refresh_token, expires_at}

## Agendamento de Reuniões (O365 Teams) — IMPLEMENTADO
- **Endpoint**: `POST /api/o365/meetings/schedule` — cria evento no calendário O365 com link Teams automático
- **Endpoint**: `GET /api/o365/meetings?lead_id=X&lead_type=Y` — lista reuniões por lead
- **Endpoint**: `DELETE /api/o365/meetings/{id}` — cancela reunião
- **Frontend**: Botão Video nos cards CRM e OTC Leads + botão no detalhe OTC
- **Componente reutilizável**: `ScheduleMeetingDialog` (assunto auto, data, hora, duração 15-90min, notas)
- **Requisito**: Conta O365 conectada no Team Hub

## Multi-Sign Transaction Approvals — IMPLEMENTADO (Execução SIMULADA)
- **Flow**: Request Submitted → Approval (N/M) → Risk & Compliance → Assinatura KBEX → Envio → Successful
- **Backend**: `POST /api/approvals/transactions` (criar), `approve`, `reject`, `cancel`
- **Configurações**: Quórum mínimo, timeout (horas), lista de aprovadores internos
- **Frontend**: Sidebar "Multi-Sign" com 3 páginas (Lista, Detalhe com Process Timeline, Configurações)
- **Simulação**: Ao atingir quórum, auto-avança Risk→Signature→Send→Completed com TxID fake
- **Futuro**: Integrar Fireblocks API real no passo "Send"

## Issues Pendentes
- P2: Safari cursor bug (CSS, recorrente 14+)
- P2: Traduções frontend incompletas

## Backlog
- P1: TradingView chart widgets
- P2: WebSockets para preços crypto (substituir polling HTTP)
- P2: Whitelist functionality
- P3: Product Pages (Launchpad, ICO)
