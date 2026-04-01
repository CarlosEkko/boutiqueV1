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

### OTC Leads CRM (01/04/2026)
- Telefone obrigatório, Fonte (8 opções), Tipo "Ambos", Prevenção duplicados
- Modal edição completo (notas, liquidação, tier potencial, volumes)
- Formatação milhares (1 000 000) com FormattedNumberInput component

### Fireblocks — Auto-Whitelist & Fees (01/04/2026)
- **Auto-Whitelist na Aprovação**: Quando admin aprova um withdrawal, o sistema cria automaticamente um External Wallet na Fireblocks com o endereço destino. Reutiliza se já existir.
- **Fallback**: Se a criação do External Wallet falhar, recorre a ONE_TIME_ADDRESS
- **Transações via External Wallet**: Usa `EXTERNAL_WALLET` como destination type (aprovado pelo TAP)
- **Transferências Internas**: Método separado para mover fundos entre vaults KBEX
- **Fee Estimation**: Endpoint `POST /api/crypto-wallets/estimate-fee` retorna fees LOW/MEDIUM/HIGH + KBEX platform fee
- **Network Fees**: Endpoint `GET /api/crypto-wallets/network-fees/{asset}` para consulta rápida
- **Gas Station Monitor**: Endpoint `GET /api/crypto-wallets/admin/gas-station` mostra health, saldos, e alertas
- **Admin External Wallets**: Listar, criar manualmente, e eliminar External Wallets

### Fireblocks — Compliance (Anterior)
- Satoshi Test, Proof of Ownership, On-Chain Proof of Reserves
- KYC Gate para criação de vaults/carteiras
- Crypto Withdrawals (Payout) com aprovação admin

### Emails (Brevo)
- Boas-vindas equipa, Onboarding leads, CRM

### O365 Integration
- Config dinâmica, Azure AD OAuth para produção

### Security
- Cloudflare Turnstile, Rate Limiting, Security Headers, Admin Dashboard

## API Endpoints Novos

### Fee Estimation
- `POST /api/crypto-wallets/estimate-fee` — Estimativa de fees (LOW/MEDIUM/HIGH + KBEX)
- `GET /api/crypto-wallets/network-fees/{asset}` — Fee actual de rede por ativo

### Gas Station
- `GET /api/crypto-wallets/admin/gas-station` — Health, saldos, alertas da Gas Station

### External Wallets (Admin)
- `GET /api/crypto-wallets/admin/external-wallets` — Listar todas as External Wallets
- `POST /api/crypto-wallets/admin/whitelist-address` — Whitelist manual de endereço
- `DELETE /api/crypto-wallets/admin/external-wallets/{id}` — Remover External Wallet

## Organização Fireblocks
- 72 vaults totais
- 11 vaults KBEX sistema (incluindo GAS STATION)
- 15 External Wallets existentes
- Gas Station: ETH crítico (< 0.01 ETH), BNB zero

## Issues Conhecidos
- P2: Safari cursor bug (recorrente)

## Backlog
- P1: TradingView chart widgets
- P2: WebSockets para preços crypto
- P2: Whitelist UI completa no frontend
- P3: Launchpad e ICO pages
- P3: App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
