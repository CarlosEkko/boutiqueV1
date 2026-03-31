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
- **WebSocket para preços crypto em tempo real** (Binance REST API a cada 5s, broadcast via WS)

### Internacionalização
- **4 idiomas: EN, PT, FR, AR** — Frontend completo (translations.js) + Backend (i18n.py)
- RTL suportado para Árabe
- Seletor de idiomas no Header (desktop + mobile)

### OTC CRM
- 11-step OTC workflow (Creation > Setup > RFQ > Execution > Invoice > Post-Sale)
- Horizontal card layout para leads com status badges
- Multi-step wizard para criacao de leads
- Pre-qualification e Red Flags

### General CRM
- Risk Intelligence (ex-Trustfull) scoring
- Conversão CRM Lead > OTC Lead com dados automaticos
- Schedule Teams meetings via O365

### Vault Multi-Sign (Cliente)
- VaultDashboard, VaultTransactionDetail, VaultSignatories, VaultCreateTransaction
- Backend: multisign.py com threshold checks

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
- **Binance API** — preços crypto em tempo real via WebSocket

## Bug Fixes Recentes
- 2026-02: Menu hamburger mobile — texto demasiado grande, botão Entrar invisível (CORRIGIDO)
- 2026-02: "Solicitar Acesso" no hero não fazia scroll ao formulário (CORRIGIDO)
- 2026-02: "Excepcionais" cortava a meio no mobile (CORRIGIDO)

## Issues Conhecidos
- P2: Safari cursor bug (recorrente, 15+)
- P1: Clarificar remoção de registo público (user disse manter)

## Backlog (Priorizado)
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile (PWA ou nativo)

## Credenciais
- Admin: carlos@kbex.io / senha123

## Ficheiros Chave
- /app/backend/routes/websocket_prices.py (WebSocket preços)
- /app/frontend/src/components/CryptoTicker.jsx (WebSocket client)
- /app/frontend/src/i18n/translations.js (EN, PT, FR, AR)
- /app/backend/utils/i18n.py (Backend i18n EN, PT, FR, AR)
- /app/frontend/src/components/Header.jsx (navegação + language selector)
- /app/frontend/src/pages/dashboard/vault/* (Vault UI)
- /app/backend/routes/multisign.py (Vault API)
- /app/design_guidelines.json (UI premium rules)
