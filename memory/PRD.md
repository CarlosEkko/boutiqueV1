# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS OVH)
- CDN/WAF: Cloudflare (Turnstile, WAF, Full Strict SSL)
- Custody: Fireblocks SDK 2.17.0

## Funcionalidades Implementadas

### Fireblocks — Auto-Whitelist, Fees & Gas Station (01/04/2026)
- **Auto-Whitelist na Aprovação**: Admin aprova withdrawal → sistema cria External Wallet Fireblocks automaticamente → reutiliza se já existir → fallback ONE_TIME_ADDRESS
- **Fee Estimation**: `POST /api/crypto-wallets/estimate-fee` — fees LOW/MEDIUM/HIGH + KBEX platform fee
- **Network Fees**: `GET /api/crypto-wallets/network-fees/{asset}` — consulta rápida
- **Gas Station Monitor**: Integrado no Dashboard Financeiro com health badges, saldos, avisos
- **Alertas Brevo**: Email automático quando Gas Station está crítico/baixo, cooldown 6h anti-spam
- **Admin External Wallets**: Listar, criar, eliminar External Wallets Fireblocks
- **Admin Manual Whitelist**: `POST /api/crypto-wallets/admin/whitelist-address`

### OTC Leads CRM (01/04/2026)
- Telefone obrigatório, Fonte (8 opções), Tipo "Ambos", Prevenção duplicados
- Modal edição (notas, liquidação, tier potencial, volumes), FormattedNumberInput

### Fireblocks — Compliance (Anterior)
- Satoshi Test, Proof of Ownership, On-Chain Proof of Reserves
- KYC Gate para vaults, Crypto Withdrawals com aprovação admin

### Emails (Brevo)
- Boas-vindas equipa, Onboarding leads, CRM, Gas Station alerts

### O365, Security, Trading, OTC, CRM, Multi-Sign, Risk & Compliance
- Todos completos e operacionais

## Gas Station Status
- Health: CRITICAL
- ETH: 6.66e-06 (min: 0.02) — CRÍTICO
- BNB_BSC: 0 (min: 0.02) — CRÍTICO
- TRX: 1e-06 (min: 10) — CRÍTICO
- MATIC_POLYGON: 0 (min: 1.0) — CRÍTICO

## Issues Conhecidos
- P2: Safari cursor bug (recorrente)

## Backlog
- P1: TradingView chart widgets
- P2: WebSockets para preços crypto
- P2: Frontend Whitelist management UI
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
