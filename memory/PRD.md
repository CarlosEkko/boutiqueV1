# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)
- CDN/WAF: Cloudflare (dominio verificado, Turnstile, WAF, Full Strict SSL)

## Funcionalidades Implementadas

### Traducoes (Actualizado 01/04/2026)
- 4 idiomas completos: EN, PT, AR, FR
- Novas seccoes traduzidas: securityDashboard, riskCompliance
- Labels do sidebar traduzidos (Risk & Compliance, Security Dashboard)
- AR corrigido: exchange (34 keys), profile (20 keys), fiatWithdrawal (22 keys), sidebar (4 keys)
- profilePages renomeado para profile em AR (corrigido nome da key)

### Security Dashboard
- Dashboard interno Admin com KPIs em tempo real (24h/7d/30d)
- Grafico actividade, Top IPs Suspeitos, Tabela de eventos, IP Blacklist
- Backend: 7 endpoints REST, logging automatico de eventos

### Seguranca Cloudflare
- Turnstile em 4 paginas, Security Headers, Rate Limiting, Cloudflare IP validation
- WAF: 5 Custom Rules, Bot Fight Mode, SSL Full Strict, DNSSEC, Page Rules

### Risk & Compliance
- Departamento separado, Risk Dashboard, KYT Forensic, CompliancePage Read-Only

### OTC Deals & Comissoes, CRM, Cofres Multi-Sign
- Todos completos e operacionais

## Issues Conhecidos
- P2: Safari cursor bug (recorrente 18+)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
