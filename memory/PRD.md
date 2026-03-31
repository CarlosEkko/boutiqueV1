# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)
- CDN/WAF: Cloudflare (dominio verificado, Turnstile activo)

## Perfis de Cliente
- **Broker** — Acesso basico, taxa admissao 0 EUR, limite 1 cofre
- **Standard** — Taxa admissao 500 EUR, limite 3 cofres
- **Premium** — Taxa admissao 2500 EUR, limite 10 cofres
- **VIP** — Taxa admissao 10000 EUR, limite 20 cofres
- **Institucional** — Taxa admissao 25000 EUR, limite 50 cofres

## Funcionalidades Implementadas

### Core
- Auth com JWT, sessionStorage, auto-logout 15 min
- WebSocket para precos crypto em tempo real (Binance)
- 4 idiomas: EN, PT, FR, AR

### Cloudflare Turnstile (NOVO - 01/04/2026)
- Widget Turnstile integrado em 4 paginas publicas:
  1. Login (AuthPage)
  2. Registo (RegisterPage)
  3. Solicitar Acesso / ContactCTA (Landing Page)
  4. Suporte Publico (PublicSupportPage)
- Backend verifica tokens via Cloudflare API em 4 endpoints:
  - POST /api/auth/login
  - POST /api/auth/register
  - POST /api/crm/leads/public
  - POST /api/kb/public-ticket
- Modo: Managed (Cloudflare decide quando mostrar desafio)
- Tema: Dark (alinhado com design da plataforma)
- Componente reutilizavel: TurnstileWidget.jsx
- Utilitario backend: utils/turnstile.py
- Tokens invalidos/falsos sao bloqueados com erro 400

### Cloudflare Proxy Middleware
- Middleware HTTP extrai IP real do cliente via CF-Connecting-IP ou X-Forwarded-For
- Disponivel em request.state.client_ip para logging e rate limiting

### Risk & Compliance (31/03/2026)
- Departamento separado no menu lateral com icon FileSearch
- Risk Dashboard: KPIs de negocios e carteiras
- KYT Forensic: Fila de verificacao de carteiras com modal analise forense
- CompliancePage KYT Read-Only: Mostra dados do analista sem edicao

### Onboarding/Registration
- CRM Lead membership_profile mapeia para membership_level do utilizador
- Taxa de admissao EUR com conversao dinamica crypto

### Sistema OTC Deals & Comissoes
- Negocios OTC: CRUD completo com calculadora em tempo real
- Pipeline Status: Draft -> Qualification -> Compliance -> Negotiation -> Approved -> Executing -> Settled -> Closed
- Comissoes: Auto-geradas ao liquidar negocio

### Compliance Forense (por negocio)
- Carteiras de negociacao (add/verify)
- Analise KYT manual (score, flags, notas) - ESCRITA no KYT Forensic, LEITURA no Compliance
- Teste de Satoshi, Proof of Ownership, Proof of Reserves

### Sistema de Cofres (Multi-Sign)
- Multiplos cofres por cliente com nomes editaveis

### CRM & OTC Desk
- Leads com Perfil (5 tiers), Risk Intelligence
- OTC CRM com 11-step workflow

## Issues Conhecidos
- P2: Safari cursor bug (recorrente 18+)
- P2: Traducoes incompletas (AR, FR parciais)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Integracoes
- Cloudflare (DNS/WAF/Turnstile)
- Binance API (precos + conversao)
- Brevo (System Emails)
- Microsoft O365
- Sumsub (KYC)
- Fireblocks (Wallets - mock)
- Stripe (Payments)

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP User: testvip@test.com / senha123
