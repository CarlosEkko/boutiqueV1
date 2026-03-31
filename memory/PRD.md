# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)

## Funcionalidades Implementadas

### Core
- Multi-currency viewing, fiat deposits
- Auth com JWT (login/register)
- Landing page premium com "Solicitar Acesso"

### OTC CRM
- 11-step OTC workflow (Creation > Setup > RFQ > Execution > Invoice > Post-Sale)
- Horizontal card layout para leads com status badges
- Multi-step wizard para criacao de leads
- Pre-qualification e Red Flags

### General CRM
- Risk Intelligence (ex-Trustfull) scoring
- Conversao CRM Lead > OTC Lead com dados automaticos
- Schedule Teams meetings via O365

### Vault Multi-Sign (Cliente)
- VaultDashboard, VaultTransactionDetail, VaultSignatories, VaultCreateTransaction
- Backend: multisign.py com threshold checks
- Status: USER VERIFICATION PENDING

### Internal Multi-Sign (Staff)
- Approval workflow para staff (approvals.py)

### Referrals
- admission_fee_percent nas Platform Settings

### Integrações
- Brevo (emails transacionais)
- Microsoft Office 365 (Teams meetings, Calendar)
- Sumsub (KYC) — config pendente
- Fireblocks (Wallets) — simulado
- Stripe (Payments) — config pendente
- CoinMarketCap (Rates)

## Issues Conhecidos
- P2: Safari cursor bug (recorrente, 15+)
- P2: Traduções frontend incompletas (PT, EN, AR)
- P1: Clarificar remoção de registo público (user disse manter)

## Bug Fixes Recentes
- 2026-02: Menu hamburger mobile — texto demasiado grande, botão Entrar invisível (CORRIGIDO)

## Backlog (Priorizado)
- P1: TradingView chart widgets
- P2: WebSockets (substituir polling HTTP 1s)
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile (PWA ou nativo)

## Credenciais
- Admin: carlos@kbex.io / senha123

## Ficheiros Chave
- /app/frontend/src/components/Header.jsx (navegação)
- /app/frontend/src/pages/dashboard/vault/* (Vault UI)
- /app/backend/routes/multisign.py (Vault API)
- /app/design_guidelines.json (UI premium rules)
