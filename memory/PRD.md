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

### OTC Leads CRM (Actualizado 01/04/2026)
- **Telefone Obrigatório**: Campo `contact_phone` agora é obrigatório no formulário e no backend.
- **Dropdown Fonte**: 8 opções disponíveis (Website, Referência, LinkedIn, Evento, Broker, Prospecção, Cliente Existente, Outro).
- **Tipo "Ambos"**: TransactionType agora inclui `both` — Compra/Venda/Ambos/Swap.
- **Prevenção Duplicados**: Botão "Criar Lead" desactivado durante submissão (isSubmitting guard).
- **Modal Edição Completo**: Editar notas, métodos de liquidação, tier potencial e volumes directamente no detalhe da lead.
- **Tier Potencial**: Novo campo — Standard / Premium / VIP / Institucional.
- **Formatação Milhares**: Inputs numéricos mostram `1 000 000` com separadores de espaço (FormattedNumberInput component).

### Fireblocks Integration (Actualizado 01/04/2026)
- **Satoshi Test**: Vault "KBEX SAToshis" (ID: 71) com endereços BTC reais. Verificação on-chain via Blockstream.
- **Proof of Ownership**: Challenge-response com assinatura criptográfica.
- **Proof of Reserves**: Verificação on-chain automática via Blockstream API (UTXOs).
- **Crypto Withdrawals (Payout)**: Fluxo completo — Cliente pede → Admin aprova → Fireblocks executa transação real.
- **KYC Gate**: Carteiras/cofres só podem ser criados após aprovação KYC/KYB.

### Notificações Admin (Actualizado 01/04/2026)
- Leads CRM Pendentes (new, contacted)
- Leads OTC Pendentes (new, contacted, pre_qualified)
- Depósitos, Levantamentos, KYC, Tickets, Cotações OTC

### Emails Brevo (Actualizado 01/04/2026)
- Email de boas-vindas a novos membros da equipa (com função e região)
- Onboarding de leads — permite reenviar mesmo que user já exista

### O365 Integration
- Config dinâmica (não estática no import-time)
- Variáveis Azure no docker-compose.yml

### Security
- Cloudflare Turnstile, Rate Limiting, Security Headers
- Admin Security Dashboard

### Trading, OTC, CRM, Cofres Multi-Sign, Risk & Compliance
- Todos completos e operacionais

## Organização Fireblocks
- 72 vaults totais
- 11 vaults KBEX sistema
- ~15 vaults clientes KBEX nomeados
- ~47 vaults legacy Kryptobox

## Issues Conhecidos
- P2: Safari cursor bug (recorrente)

## Backlog
- P1: TradingView chart widgets
- P2: WebSockets para preços crypto
- P2: Whitelist functionality
- P2: Organizar/ocultar vaults legacy Fireblocks
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
