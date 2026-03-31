# KBEX.io — Product Requirements Document

## Produto
Premium Crypto Boutique Exchange para clientes HNW/UHNW.

## Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deploy: Docker, Docker-Compose (VPS do user)
- CDN/WAF: Cloudflare (dominio verificado)

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

### Onboarding/Registration
- CRM Lead membership_profile mapeia para membership_level do utilizador ao registar
- Country dropdown no RegisterPage
- Taxa de admissao EUR com conversao dinamica crypto (BTC, ETH, USDT, USDC) via Binance
- Admin Settings grava 5 perfis EUR correctamente

### Sistema OTC Deals & Comissoes
- **Negocios OTC**: CRUD completo com calculadora em tempo real
  - Tipo: Compra (Cliente) ou Venda (Fornecedor)
  - Ativo, quantidade, preco referencia (KBEX/Binance, editavel)
  - Condicao: Premium (+%) ou Discount (-%)
  - Gross/Net configuravel por negocio
  - Distribuicao margem: Corretor % + Membro KBEX %
  - Moeda de liquidacao: EUR, USD, BTC, ETH, USDT, USDC
- **Pipeline Status**: Draft -> Qualification -> Compliance -> Negotiation -> Approved -> Executing -> Settled -> Closed
- **Comissoes**: Auto-geradas ao liquidar negocio
  - Workflow: Pendente -> Aprovado -> Pago / Rejeitado
  - Bulk approve/pay
  - Dashboard KPIs + resumo por corretor

### Compliance Forense (por negocio)
- Carteiras de negociacao (add/verify)
- Analise KYT manual (score, flags, notas) - ESCRITA no KYT Forensic, LEITURA no Compliance
- Teste de Satoshi (micro-transacao)
- Proof of Ownership (Signed Typed Messages)
- Proof of Reserves (obrigatorio antes execucao)

### Risk & Compliance (NOVO - 31/03/2026)
- **Departamento separado** no menu lateral com icon FileSearch
- **Risk Dashboard** (/dashboard/risk/dashboard): KPIs de negocios (Total, Conformes, Pendentes, Alto Risco) e carteiras (Total, Pendentes, Verificadas, Sinalizadas, Rejeitadas), Quick Actions, Analises Recentes
- **KYT Forensic** (/dashboard/risk/kyt-forensic): Fila de verificacao de carteiras, modal de analise forense (score 0-100, flags, notas, status), pesquisa/filtro por status
- **CompliancePage KYT Read-Only**: Seccao KYT mostra badge "Somente Leitura", gauge visual do score, status/flags/notas do analista, detalhe por carteira — sem campos editaveis
- Acessivel a Admin e Global Manager via permissions

### Cloudflare Proxy Middleware (NOVO - 31/03/2026)
- Middleware HTTP extrai IP real do cliente via CF-Connecting-IP ou X-Forwarded-For
- Disponivel em request.state.client_ip para logging e rate limiting futuro

### Sistema de Cofres (Multi-Sign)
- Multiplos cofres por cliente com nomes editaveis
- Tier limits por perfil, Omnibus vault para OTC
- Menu Multi-Sign visivel para clientes

### Dashboard Financeiro
- KPIs: AUM, Receita, Volume, Pendentes

### CRM & OTC Desk
- Leads com Perfil (5 tiers), Risk Intelligence
- OTC CRM com 11-step workflow

### Prototipos Visuais
- Pagina /prototypes/otc com 5 ecras mockup

## Issues Conhecidos
- P2: Safari cursor bug (recorrente 18+)
- P2: Traducoes incompletas (AR, FR parciais)

## Backlog
- P1: TradingView chart widgets
- P2: Whitelist functionality
- P3: Launchpad e ICO pages
- P3: App mobile

## Integracoes
- Binance API (precos + conversao), Brevo, Microsoft O365, Sumsub, Fireblocks (mock), Stripe, Cloudflare (DNS/WAF)

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP User: testvip@test.com / senha123
