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

### Onboarding/Registration (Corrigido 31/03/2026)
- CRM Lead membership_profile mapeia para membership_level do utilizador ao registar
- Country dropdown no RegisterPage
- Taxa de admissão EUR com conversão dinâmica crypto (BTC, ETH, USDT, USDC) via Binance
- Admin Settings grava 5 perfis EUR correctamente

### Sistema OTC Deals & Comissões (NOVO - 31/03/2026)
- **Negócios OTC**: CRUD completo com calculadora em tempo real
  - Tipo: Compra (Cliente) ou Venda (Fornecedor)
  - Ativo, quantidade, preço referência (KBEX/Binance, editável)
  - Condição: Premium (+%) ou Discount (-%)
  - Gross/Net configurável por negócio
  - Distribuição margem: Corretor % + Membro KBEX %
  - Moeda de liquidação: EUR, USD, BTC, ETH, USDT, USDC
- **Pipeline Status**: Draft → Qualification → Compliance → Negotiation → Approved → Executing → Settled → Closed
- **Comissões**: Auto-geradas ao liquidar negócio
  - Workflow: Pendente → Aprovado → Pago / Rejeitado
  - Bulk approve/pay
  - Dashboard KPIs + resumo por corretor
- **Compliance Forense**: (por negócio)
  - Carteiras de negociação (add/verify)
  - Análise KYT manual (score, flags, notas)
  - Teste de Satoshi (micro-transação)
  - Proof of Ownership (Signed Typed Messages)
  - Proof of Reserves (obrigatório antes execução)
- **Permissões**: Menu CRM com "Negócios OTC" e "Comissões"

### Sistema de Cofres (Multi-Sign)
- Múltiplos cofres por cliente com nomes editáveis
- Tier limits por perfil, Omnibus vault para OTC
- Menu Multi-Sign visível para clientes

### Dashboard Financeiro
- KPIs: AUM, Receita, Volume, Pendentes

### CRM & OTC Desk
- Leads com Perfil (5 tiers), Risk Intelligence
- OTC CRM com 11-step workflow

### Protótipos Visuais
- Página /prototypes/otc com 5 ecrãs mockup (Deal, Compliance, Pipeline, Comissões, Wizard)

## Issues Conhecidos
- P1: Safari cursor bug (recorrente 17+)
- P2: Traduções incompletas (AR, FR parciais)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Integrações
- Binance API (preços + conversão), Brevo, Microsoft O365, Sumsub, Fireblocks (mock), Stripe

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP User: testvip@test.com / senha123
