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

### Vault Multi-Sign (Cliente)
- VaultDashboard, VaultTransactionDetail, VaultSignatories, VaultCreateTransaction
- Backend: multisign.py com threshold checks
- **Integração Omnibus**: transações validam e debitam do ledger omnibus

### Internal Multi-Sign (Staff)
- Approval workflow para staff (approvals.py)

### Omnibus Vault (NOVO - 2026-03-31)
- Estrutura Omnibus para clientes OTC / Multi-Sign
- Vault único Fireblocks partilhado com sub-contas internas (ledger MongoDB)
- Admin: configurar vault omnibus, provisionar sub-contas, credit/debit
- Cliente: ver saldos da sub-conta omnibus no "Cofre"
- Fundos reservados (pending) na criação de transação, libertados no cancelamento/rejeição
- Débito final do ledger na execução da transação
- Menu Multi-Sign: "Wallets" renomeado para "Cofre"
- Backend: /api/omnibus/* (config, provision, credit, debit, my-balance, sub-accounts, movements)
- Collections: omnibus_config, omnibus_ledger, omnibus_movements

### Dashboard Financeiro (2026-03-31)
- KPIs: AUM Total, Receita Total, Volume de Trading, Operações Pendentes
- Gráficos: Evolução Receita (30d), Fiat vs Crypto, Distribuição por Ativo
- Tabelas: Top Clientes por AUM, Transações Recentes
- Backend: /api/finance/dashboard
- Frontend: /dashboard/admin/finance

### Referrals
- admission_fee_percent nas Platform Settings

### Integrações
- Binance API (WebSockets) — preços em tempo real
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
- /app/backend/routes/omnibus.py (Omnibus Vault API)
- /app/backend/routes/multisign.py (Multi-Sign + Omnibus integration)
- /app/backend/routes/finance.py (Dashboard Financeiro API)
- /app/backend/models/permissions.py (Menu com "Cofre")
- /app/frontend/src/pages/dashboard/vault/VaultWallets.jsx (Cofre Omnibus UI)
- /app/frontend/src/pages/dashboard/admin/FinancialDashboard.jsx (Dashboard Financeiro)
- /app/design_guidelines.json (UI premium rules)
