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
- Auth com JWT, sessionStorage, auto-logout 15 min
- Landing page premium com "Solicitar Acesso"
- WebSocket para preços crypto em tempo real (Binance)

### Internacionalização
- 4 idiomas: EN, PT, FR, AR — Frontend + Backend
- RTL suportado para Árabe

### OTC CRM
- 11-step OTC workflow (Creation > Setup > RFQ > Execution > Invoice > Post-Sale)
- Multi-step wizard para criação de leads
- Pre-qualification e Red Flags

### General CRM
- Risk Intelligence scoring
- Conversão CRM Lead > OTC Lead
- Schedule Teams meetings via O365

### Vault Multi-Sign (Cliente) — Sistema de Cofres
- VaultDashboard, VaultTransactionDetail, VaultSignatories, VaultCreateTransaction
- **Multi-Cofre**: Clientes podem criar múltiplos cofres com nomes personalizados
- **Tier Limits**: Limites configuráveis por admin (standard=3, premium=10, vip=20, black=50)
- **Editar Nome**: Rename inline com ícone de lápis
- **Visão Geral**: Cards de cofres com status Activo/Vazio
- Backend: multisign.py com threshold checks + omnibus ledger validation

### Omnibus Vault (2026-03-31)
- Estrutura Omnibus para clientes OTC / Multi-Sign
- Vault único Fireblocks partilhado com sub-contas internas (ledger MongoDB)
- Admin: configurar vault omnibus, provisionar cofres, credit/debit
- Cliente: criar cofres (POST /api/omnibus/cofres), renomear (PUT /cofres/{id}/rename)
- Limites por tier: GET/PUT /api/omnibus/tier-limits
- Fundos reservados na criação de transação, libertados no cancelamento/rejeição
- Menu Multi-Sign: "Wallets" → "Cofre", "Overview" → "Visão Geral", header "COFRES"
- Collections: omnibus_config, omnibus_ledger, omnibus_movements, omnibus_tier_limits

### Dashboard Financeiro (2026-03-31)
- KPIs: AUM Total, Receita Total, Volume de Trading, Operações Pendentes
- Gráficos: Evolução Receita (30d), Fiat vs Crypto, Distribuição por Ativo
- Tabelas: Top Clientes por AUM, Transações Recentes
- Backend: /api/finance/dashboard

### Integrações
- Binance API — preços em tempo real
- Brevo (emails transacionais)
- Microsoft Office 365 (Teams, Calendar)
- Sumsub (KYC) — config pendente
- Fireblocks (Wallets) — simulado (execução mock)
- Stripe (Payments) — config pendente

## Issues Conhecidos
- P1: Safari cursor bug (recorrente, 16+)

## Backlog (Priorizado)
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile (PWA ou nativo)

## Credenciais
- Admin: carlos@kbex.io / senha123

## Ficheiros Chave
- /app/backend/routes/omnibus.py (Multi-Cofre API: create, rename, tier limits)
- /app/backend/routes/multisign.py (Multi-Sign + Omnibus integration)
- /app/backend/routes/finance.py (Dashboard Financeiro API)
- /app/backend/models/permissions.py (Menu "Cofre")
- /app/frontend/src/pages/dashboard/vault/VaultWallets.jsx (Multi-Cofre UI)
- /app/frontend/src/pages/dashboard/admin/FinancialDashboard.jsx
- /app/design_guidelines.json (UI premium rules)
