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

### Compliance Forense — Vista Wallet-Centric (02/04/2026)
- CompliancePage reescrita para vista centrada na carteira
- Clicar numa carteira atualiza painéis KYT, Satoshi, PoO, PoR
- Auto-seleciona primeira carteira ao carregar
- Score KYT com gráfico circular e badges de status por carteira

### Score de Risco KYT — Escala 0-10 (02/04/2026)
- Escala alterada de 0-100 para 0-10 (10 = risco máximo)
- Cores: ≤3 verde (baixo), 4-6 amarelo (médio), ≥7 vermelho (alto)
- Input limitado a 0-10 com clamping
- Gráfico circular SVG atualizado com fill proporcional (cap a 100%)
- Aplicado a CompliancePage.jsx e KYTForensicPage.jsx

### Status Carteiras — Ícones Corrigidos (02/04/2026)
- Carteiras sem análise KYT mostram ⏳ âmbar (em vez de ✓ verde)
- Lógica `walletStatusIcon` combina status da carteira + status KYT
- Verified + Clean → ✓ verde | Verified + sem KYT → ⏳ âmbar
- Pending → ⏳ âmbar | Failed → ✗ vermelho | Flagged → 🛡️ laranja

### Solicitar Acesso — OTC Lead Generation (02/04/2026)
- Formulário "Solicitar Acesso" na landing page agora cria OTC Lead + CRM Lead
- Campo "País" adicionado ao formulário com select de 190+ países
- Deteção automática FATF de países de alto risco (red_flag no OTC Lead)
- Traduções em PT, EN, AR, FR para o campo "País"
- Endpoint POST /api/crm/leads/public gera leads em ambas coleções
- Proteção contra duplicados por email
- Risk Intelligence scan automático via Trustfull
- Email de confirmação via Brevo

### Registo Público Desativado (02/04/2026)
- /register redireciona para /#contact (formulário público)
- AuthPage mostra apenas Login — sem toggle de registo
- Link "Solicitar Acesso" na AuthPage aponta para /#contact
- Acesso à plataforma apenas por convite/aprovação

### Exchange — Taxa KBEX & Tooltip (01/04/2026)
- "Fee" substituído por "Taxa KBEX" com ícone (i) e tooltip explicativo
- Tooltip aplicado a Buy, Sell e Swap previews

### OTC Deals — Corretor KBEX & USDT Fix (01/04/2026)
- USDT/USDC reference price fix: stablecoins retornam $1.00
- FormattedNumberInput com separadores de espaço

### Fireblocks — Auto-Whitelist, Fees & Gas Station (01/04/2026)
- Auto-Whitelist na aprovação de withdrawals
- Fee Estimation endpoints (LOW/MEDIUM/HIGH + KBEX fee)
- Gas Station Monitor com alertas Brevo

### OTC Leads CRM (01/04/2026)
- 7 bugs corrigidos: telefone obrigatório, fonte, duplicados, edição, tier

### Anteriores
- Fireblocks Compliance (Satoshi Test, PoO, PoR)
- Microsoft 365 OAuth, Brevo emails, KYC Gate
- Trading, CRM, Multi-Sign, Risk & Compliance

## Issues Conhecidos
- P2: Safari cursor bug (recorrente)

## Backlog
- P1: TradingView chart widgets
- P1: Traduções Frontend incompletas
- P2: WebSockets para preços crypto
- P2: Frontend Whitelist management UI
- P3: Launchpad/ICO, App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
