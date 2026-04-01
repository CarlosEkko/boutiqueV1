# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)
- CDN/WAF: Cloudflare (dominio verificado, Turnstile activo, WAF Custom Rules, Full Strict SSL)

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

### Segurança Cloudflare (01/04/2026)
**Turnstile:**
- Widget integrado em 4 paginas: Login, Registo, Solicitar Acesso, Suporte Publico
- Backend verifica tokens em 4 endpoints
- Modo Managed, tema Dark

**Backend Security:**
- Security Headers: HSTS (preload), CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection
- Cloudflare IP validation (trusted proxy ranges)
- Rate Limiting: login 10/min, register 5/min, public leads 5/min, public tickets 5/min
- API Cache-Control: no-store, no-cache, private

**Cloudflare Dashboard:**
- SSL/TLS: Full (Strict), Always Use HTTPS, TLS 1.3
- WAF: 5 Custom Rules (Bad User Agents, Sensitive Paths, API Content-Type, Auth Challenge, High Risk Countries)
- Bot Fight Mode: ON
- Speed: Speed Brain, HTTP/2, HTTP/3 QUIC, HTTP/2 to Origin, 0-RTT, Early Hints, Cloudflare Fonts
- Caching: Standard, Browser Cache TTL 4h, Always Online
- Page Rules: API Bypass, Static Cache Everything, Force HTTPS
- DNSSEC: Enabled

### Risk & Compliance (31/03/2026)
- Departamento separado no menu lateral
- Risk Dashboard: KPIs de negocios e carteiras
- KYT Forensic: Fila de verificacao de carteiras com modal analise forense
- CompliancePage KYT Read-Only

### Onboarding/Registration
- CRM Lead membership_profile mapeia para membership_level do utilizador
- Taxa de admissao EUR com conversao dinamica crypto

### Sistema OTC Deals & Comissoes
- Negocios OTC: CRUD completo com calculadora em tempo real
- Pipeline Status: Draft -> Qualification -> Compliance -> Negotiation -> Approved -> Executing -> Settled -> Closed
- Comissoes: Auto-geradas ao liquidar negocio

### Compliance Forense (por negocio)
- Carteiras de negociacao (add/verify)
- Analise KYT manual - ESCRITA no KYT Forensic, LEITURA no Compliance
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
- Cloudflare (DNS/WAF/Turnstile/CDN)
- Binance API (precos + conversao)
- Brevo (System Emails)
- Microsoft O365
- Sumsub (KYC)
- Fireblocks (Wallets - mock)
- Stripe (Payments)

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP User: testvip@test.com / senha123
