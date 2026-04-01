# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)
- CDN/WAF: Cloudflare (dominio verificado, Turnstile activo, WAF Custom Rules, Full Strict SSL)

## Perfis de Cliente
- **Broker** — Taxa admissao 0 EUR, limite 1 cofre
- **Standard** — Taxa admissao 500 EUR, limite 3 cofres
- **Premium** — Taxa admissao 2500 EUR, limite 10 cofres
- **VIP** — Taxa admissao 10000 EUR, limite 20 cofres
- **Institucional** — Taxa admissao 25000 EUR, limite 50 cofres

## Funcionalidades Implementadas

### Core
- Auth com JWT, sessionStorage, auto-logout 15 min
- WebSocket para precos crypto em tempo real (Binance)
- 4 idiomas: EN, PT, FR, AR

### Security Dashboard (NOVO - 01/04/2026)
- Dashboard interno Admin com monitorizacao em tempo real
- KPIs: Total Eventos, Logins Falhados, Rate Limits, Turnstile Rejeitados, IPs na Blacklist
- Filtro periodo: 24h, 7d, 30d
- Grafico de actividade por hora/dia com barras
- Top IPs Suspeitos com contagem de eventos e tipos
- Tabela de eventos paginada com filtros (tipo, severidade, IP)
- IP Blacklist management: adicionar (com motivo e duracao), remover
- Middleware bloqueia IPs banidos com 403
- Eventos logados: failed_login, rate_limit, turnstile_rejected, blacklist_blocked
- Backend: 7 endpoints REST (/api/security/*)
- Testes: 22/22 backend + frontend 100%

### Seguranca Cloudflare
- Turnstile em 4 paginas (Login, Registo, Solicitar Acesso, Suporte)
- Security Headers: HSTS, CSP, X-Frame-Options DENY, etc.
- Rate Limiting: login 10/min, register 5/min, leads 5/min, tickets 5/min
- Cloudflare IP validation (trusted proxy ranges)
- WAF: 5 Custom Rules configuradas no dashboard
- Bot Fight Mode, SSL Full Strict, DNSSEC, Page Rules

### Risk & Compliance
- Departamento separado no menu lateral
- Risk Dashboard + KYT Forensic
- CompliancePage KYT Read-Only

### Sistema OTC Deals & Comissoes
- CRUD completo com calculadora em tempo real
- Pipeline 8 stages + Comissoes auto-geradas

### Compliance Forense
- Carteiras, KYT, Satoshi Test, Proof of Ownership/Reserves

### CRM & OTC Desk
- Leads com 5 tiers, Risk Intelligence, 11-step workflow

### Sistema de Cofres (Multi-Sign)
- Multiplos cofres por cliente

## Issues Conhecidos
- P2: Safari cursor bug (recorrente 18+)
- P2: Traducoes incompletas (AR, FR parciais)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Integracoes
- Cloudflare (DNS/WAF/Turnstile/CDN)
- Binance API, Brevo, Microsoft O365, Sumsub, Fireblocks (mock), Stripe

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
