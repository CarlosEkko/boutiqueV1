# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)
- CDN/WAF: Cloudflare (dominio verificado, Turnstile, WAF, Full Strict SSL)

## Funcionalidades Implementadas

### Compliance Forense OTC (Actualizado 01/04/2026)
- **Teste de Satoshi (AB Test)**: Endereços reais gerados via Fireblocks SDK no vault "KBEX SAToshis" (ID: 71). Cada teste gera um novo endereço BTC. Verificação on-chain via Blockstream API.
- **Proof of Ownership**: Sistema challenge-response com assinatura criptográfica. Gera mensagem única → Cliente assina → Admin verifica.
- **Proof of Reserves**: Verificação on-chain automática via Blockstream API. Consulta UTXOs e saldo confirmado do endereço do cliente. Compara com montante necessário do deal.

### Traduções (Actualizado 01/04/2026)
- 4 idiomas completos: EN, PT, AR, FR
- Todas as secções traduzidas incluindo securityDashboard, riskCompliance

### Security Dashboard
- Dashboard interno Admin com KPIs em tempo real (24h/7d/30d)
- Gráfico actividade, Top IPs Suspeitos, Tabela de eventos, IP Blacklist
- Backend: 7 endpoints REST, logging automático de eventos

### Segurança Cloudflare
- Turnstile em 4 páginas, Security Headers, Rate Limiting, Cloudflare IP validation
- WAF: 5 Custom Rules, Bot Fight Mode, SSL Full Strict, DNSSEC, Page Rules

### Risk & Compliance
- Departamento separado, Risk Dashboard, KYT Forensic, CompliancePage Read-Only

### OTC Deals & Comissões, CRM, Cofres Multi-Sign
- Todos completos e operacionais

## Issues Conhecidos
- P2: Safari cursor bug (recorrente 19+)

## Backlog
- P1: TradingView chart widgets
- P2: WebSockets para preços crypto (substituir polling 1s)
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
