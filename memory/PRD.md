# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)

## Perfis de Cliente
- **Broker** — Acesso básico, taxa admissão 0 EUR, limite 1 cofre
- **Standard** — Taxa admissão 500 EUR, limite 3 cofres
- **Premium** — Taxa admissão 2500 EUR, limite 10 cofres
- **VIP** — Taxa admissão 10000 EUR, limite 20 cofres
- **Institucional** — Taxa admissão 25000 EUR, limite 50 cofres

## Funcionalidades Implementadas

### Core
- Auth com JWT, sessionStorage, auto-logout 15 min
- WebSocket para preços crypto em tempo real (Binance)
- 4 idiomas: EN, PT, FR, AR

### Onboarding/Registration (CORRIGIDO - 31/03/2026)
- CRM Lead membership_profile mapeia automaticamente para o membership_level do utilizador ao registar
- Country dropdown no RegisterPage com lista global de países
- Taxa de admissão em EUR por perfil com conversão dinâmica para crypto (BTC, ETH, USDT, USDC) via Binance API
- Removido "Período de carência"
- Admin Settings grava corretamente taxas de admissão (5 perfis EUR)

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
- Taxa de admissão EUR por perfil (5 perfis, sem grace period)
- Limites de cofres por perfil
- Taxas de referral configuráveis
- Taxas e limites de trading por perfil

### Integrações
- Binance API (preços e conversão crypto), Brevo, Microsoft O365, Sumsub, Fireblocks (mock), Stripe

## Issues Conhecidos
- P1: Safari cursor bug (recorrente, 17+ vezes)
- P2: Traduções incompletas (AR, FR parciais)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP User: testvip@test.com / senha123
