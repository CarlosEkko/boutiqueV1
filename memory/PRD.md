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

### KYT Forensic — Tabs por Status (02/04/2026)
- KYTForensicPage reescrita com tabs: Pendente, Limpo, Sinalizado, Rejeitado
- Backend retorna kyt_status na queue e filtra via query param ?status=
- Modal de Análise com Select de resultado (pending/clean/flagged/rejected)
- Contagens por tab dinâmicas
- Validado: tabs, modal, backend API funcionam corretamente

### Compliance Forense — Vista Wallet-Centric (02/04/2026)
- CompliancePage reescrita para vista centrada na carteira
- Clicar numa carteira atualiza painéis KYT, Satoshi, PoO, PoR
- Auto-seleciona primeira carteira ao carregar
- Score KYT com gráfico circular e badges de status por carteira

### CRM Leads — Filtros + Atribuição por Região (02/04/2026)
- 3 novos filtros: Perfil (membership_profile), Moedas (crypto), Região/País (country)
- Backend GET /api/crm/leads aceita membership_profile, country, crypto como query params
- Dropdown "Atribuir a" em cada lead card com lista de team members (nome + região)
- Atribuição instantânea via PUT /api/crm/leads/{id} com assigned_to

### Exchange — Tooltip Traduzido + Amount Formatado (02/04/2026)
- Tooltip "Taxa KBEX" agora traduzido em EN, PT, AR, FR via t()
- Labels "Valor Bruto", "Você recebe", "Quantidade" traduzidas
- Input de amount fiat usa FormattedNumberInput (100 000 com espaços)

### Compliance — Espaçamento KYT Melhorado (02/04/2026)
- Gap aumentado entre gráfico circular e painéis de status
- Notas do analista com padding/margins maiores
- Labels uppercase com tracking-wider

### Score de Risco KYT — Escala 0-10 (02/04/2026)
- Escala alterada de 0-100 para 0-10 (10 = risco máximo)
- Cores: <=3 verde (baixo), 4-6 amarelo (médio), >=7 vermelho (alto)
- Input limitado a 0-10 com clamping
- Gráfico circular SVG atualizado com fill proporcional (cap a 100%)
- Aplicado a CompliancePage.jsx e KYTForensicPage.jsx

### Status Carteiras — Ícones Corrigidos (02/04/2026)
- Carteiras sem análise KYT mostram âmbar (em vez de verde)
- Lógica walletStatusIcon combina status da carteira + status KYT
- Verified + Clean -> verde | Verified + sem KYT -> âmbar
- Pending -> âmbar | Failed -> vermelho | Flagged -> laranja

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

### Sidebar Reestruturada (02/04/2026)
- "Negócios OTC" e "Comissões" movidos para OTC Desk
- "KYC/KYB" movido de Admin para Risk & Compliance
- Todas as entradas traduzidas em PT, EN, AR, FR

### Anteriores
- Fireblocks Compliance (Satoshi Test, PoO, PoR)
- Microsoft 365 OAuth, Brevo emails, KYC Gate
- Trading, CRM, Multi-Sign, Risk & Compliance
- OTC Pipeline 11 fases, Brevo onboarding emails

## Issues Conhecidos
- P2: Safari cursor bug (recorrente)
- Scores KYT antigos (100, 75, 70, 90) na BD precisam migração para escala 0-10

## Backlog
- P1: TradingView chart widgets
- P1: Traduções Frontend incompletas
- P2: WebSockets para preços crypto
- P2: Frontend Whitelist management UI
- P3: Launchpad/ICO, App mobile

## Credenciais
- Admin: carlos@kbex.io / senha123
- Test VIP: testvip@test.com / senha123
