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

### Exchange — Taxa KBEX & Tooltip (01/04/2026)
- "Fee" substituído por "Taxa KBEX" com ícone (i) e tooltip explicativo sobre spread
- Tooltip aplicado a Buy, Sell e Swap previews
- Texto: "Além da taxa exibida, um spread pode estar incluído no preço..."

### OTC Deals — Corretor KBEX & USDT Fix (01/04/2026)
- "Membro KBEX" substituído por "Corretor KBEX" em labels e calculadora
- USDT/USDC reference price fix: stablecoins retornam $1.00
- Quantidade e preço formatados com FormattedNumberInput (100 000)
- Calculadora mostra valores com separadores de espaço (€600 182.28)

### Compliance — Traduções & Hover (01/04/2026)
- Tabs traduzidos: "Prova de Propriedade", "Prova de Reservas"
- Carteiras de Negociação com hover animation (shadow dourado, border gold)
- Análise forense inline: KYT status badge (Limpo/Sinalizado/Pendente) e Score

### Fireblocks — Auto-Whitelist, Fees & Gas Station (01/04/2026)
- Auto-Whitelist na aprovação de withdrawals
- Fee Estimation endpoints (LOW/MEDIUM/HIGH + KBEX fee)
- Gas Station Monitor no Dashboard Financeiro com alertas Brevo

### OTC Leads CRM (01/04/2026)
- 7 bugs corrigidos: telefone obrigatório, fonte, "ambos", duplicados, edição, tier, milhares

### Anteriores
- Fireblocks Compliance (Satoshi Test, PoO, PoR)
- Microsoft 365 OAuth, Brevo emails, KYC Gate
- Trading, CRM, Multi-Sign, Risk & Compliance — Completos

## Gas Station Status
- Health: CRITICAL (ETH e BNB quase zero)

## Issues Conhecidos
- P2: Safari cursor bug (recorrente)

## Backlog
- P1: TradingView chart widgets
- P2: WebSockets para preços crypto
- P2: Frontend Whitelist management UI
- P3: Launchpad/ICO, App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
