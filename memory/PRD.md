# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)

## Perfis de Cliente
- **Broker** — Acesso básico, taxa admissão 0€, limite 1 cofre
- **Standard** — Taxa admissão 500€, limite 3 cofres
- **Premium** — Taxa admissão 2500€, limite 10 cofres
- **VIP** — Taxa admissão 10000€, limite 20 cofres
- **Institucional** — Taxa admissão 25000€, limite 50 cofres

## Funcionalidades Implementadas

### Core
- Auth com JWT, sessionStorage, auto-logout 15 min
- WebSocket para preços crypto em tempo real (Binance)
- 4 idiomas: EN, PT, FR, AR

### Sistema de Cofres (Multi-Sign)
- Múltiplos cofres por cliente com nomes editáveis
- Tier limits configuráveis por perfil (admin)
- Omnibus vault para clientes OTC
- Transações com validação de saldo omnibus
- Menu Multi-Sign visível para clientes
- "Cofre de Origem" com dropdown na criação de transação

### Dashboard Financeiro
- KPIs: AUM, Receita, Volume, Pendentes
- Gráficos e tabelas analíticas

### CRM
- Leads com campo "Perfil" (5 tiers)
- Badges coloridos por perfil
- Risk Intelligence scoring

### OTC CRM
- 11-step workflow completo

### Menus de Clientes
- 6 menus disponíveis: Portefólio, Investimentos, Transparência, Perfil, OTC Trading, Multi-Sign
- Configuráveis por admin por cliente

### Admin Settings
- Taxa de admissão EUR por perfil (referência, conversão automática)
- Limites de cofres por perfil
- Taxas de referral configuráveis
- Taxas e limites de trading por perfil

### Integrações
- Binance API, Brevo, Microsoft O365, Sumsub, Fireblocks (mock), Stripe

## Issues Conhecidos
- P1: Safari cursor bug (recorrente)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
