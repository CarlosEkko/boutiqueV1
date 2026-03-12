# KBEX.io - Premium Crypto Boutique Exchange

## Original Problem Statement
Build a website for a premium Crypto Boutique Exchange named KBEX.io targeting High-Net-Worth (HNW) / Ultra-High-Worth (UHNW) individuals and companies in Europe, Middle East, and Brazil.

## Core Requirements
- **Target Audience**: HNW/UHNW individuals and companies
- **Geographic Focus**: Europe, MENA (Middle East & North Africa), LATAM (Latin America)
- **Products/Services**: Exchange, Crypto ATM Network, Launchpad, ICO, Institutional Custody
- **Tone & Style**: "Quiet luxury," trust, exclusivity, clear, serious, sophisticated
- **User's Language**: Portuguese

## Tech Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn UI, react-quill-new (WYSIWYG editor)
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Deployment**: Docker, Docker Compose, Nginx (reverse proxy), Let's Encrypt (SSL)
- **Integrations**: CoinMarketCap (preços), Stripe (pagamentos), emergentintegrations

## Key Features
- **Multi-currency support**: EUR, USD, AED, BRL with real-time exchange rates
- **Global currency selector** in dashboard header
- **Automatic price conversion** for all crypto prices and limits
- **Knowledge Base & Support System** with WYSIWYG editor
- **Accordion Menu by Department** with role-based permissions

## New: Department-Based Permission System (Dec 2025)

### Staff Roles (10 roles)
1. **Admin** - Acesso total ao sistema
2. **Global Manager** - Gestão global de todas regiões
3. **Manager** - Gestão regional
4. **Sales Manager (Manager de Vendas)** - Líder da equipa de vendas
5. **Sales (Vendas)** - Representante de vendas
6. **Finance General (Financeiro Geral)** - Supervisão financeira global
7. **Finance Local (Financeiro Local)** - Financeiro regional
8. **Finance (Financeiro)** - Operações financeiras
9. **Support Manager (Suporte Manager)** - Líder da equipa de suporte
10. **Support Agent (Agente de Suporte)** - Atendimento ao cliente

### Departments (6 areas) - ALL in Accordion Style
1. **Portfolio** - Dashboard do cliente (accordion expandido por padrão)
2. **Admin** - Gestão de equipa, utilizadores, KYC, oportunidades
3. **Gestão** - Permissões, Configurações (taxas/limites)
4. **Financeiro** - Ordens, Depósitos Fiat, Levantamentos Fiat/Crypto (com notificações)
5. **CRM** - Clientes, Pipeline de vendas
6. **Suporte** - Tickets, Base de conhecimento

### Notification Badges (Dec 2025)
- Menu items show pending count badges (red circles)
- Department headers show aggregated notification counts
- Auto-refresh every 30 seconds
- Items with pending approval: Deposits, Withdrawals, Orders, Tickets

### UI Updates (Dec 2025)
- Configurações page: Only shows Taxas Crypto, Taxas Fiat, Limites (removed financial tabs)
- Financial pages: Expandable card design with details (Valor Bruto, Taxa, Valor Líquido, Data)
- Bank details section in expanded cards

## Architecture
```
/app
├── backend/
│   ├── models/
│   │   ├── user.py (RBAC models - updated with new roles)
│   │   ├── permissions.py (NEW - Department permissions)
│   │   ├── trading.py (Trading models)
│   │   └── knowledge_base.py (KB & Tickets)
│   ├── routes/
│   │   ├── auth.py (JWT authentication)
│   │   ├── admin.py (RBAC endpoints)
│   │   ├── permissions.py (NEW - Permissions endpoints)
│   │   ├── trading.py (Exchange endpoints)
│   │   ├── knowledge_base.py (KB & Support routes)
│   │   ├── uploads.py (File uploads)
│   │   └── crypto_wallets.py (Fireblocks - BLOCKED)
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RichTextEditor.jsx (WYSIWYG)
│   │   │   └── ui/ (Shadcn components)
│   │   ├── pages/
│   │   │   ├── PublicSupportPage.jsx (Public support)
│   │   │   ├── KnowledgeBasePage.jsx (Help Center)
│   │   │   └── dashboard/
│   │   │       ├── DashboardLayout.jsx (NEW - Accordion menu)
│   │   │       └── admin/
│   │   │           ├── AdminPermissions.jsx (NEW)
│   │   │           ├── AdminOrders.jsx (NEW)
│   │   │           ├── AdminFiatDeposits.jsx (NEW)
│   │   │           ├── AdminFiatWithdrawals.jsx (NEW)
│   │   │           ├── AdminCryptoWithdrawals.jsx (NEW)
│   │   │           ├── AdminClients.jsx (NEW)
│   │   │           └── AdminPipeline.jsx (NEW)
│   │   │       ├── DashboardLayout.jsx (Updated with Suporte submenu)
│   │   │       └── admin/
│   │   │           ├── AdminKnowledgeBase.jsx (Updated with WYSIWYG)
│   │   │           └── AdminTickets.jsx
│   │   └── context/AuthContext.jsx
│   └── public/
│       ├── logo.png
│       └── images/ (Local assets)
├── docker-compose.yml
└── nginx/nginx.conf
```

## Implemented Features

### Markets Page with CoinMarketCap Data (NEW - Mar 2026)
- [x] Real-time cryptocurrency prices from CoinMarketCap API
- [x] Market statistics: Total Market Cap, Volume 24h, BTC Dominance
- [x] Top Gainer and Top Loser display
- [x] Sortable table with 50+ cryptocurrencies
- [x] Change percentages: 1h, 24h, 7d
- [x] Favorites system with local storage
- [x] Tabs: All, Gainers, Losers, Favorites
- [x] Search functionality
- [x] Trade button linking to exchange
- [x] Backend endpoints: `/api/trading/markets`, `/api/trading/markets/stats`

### Trading Page with TradingView Charts (NEW - Mar 2026)
- [x] TradingView Advanced Chart widget via iframe
- [x] Real-time candlestick charts from Binance
- [x] Multiple timeframes (1m, 30m, 1h, etc.)
- [x] Technical indicators support
- [x] Pair selector sidebar with favorites
- [x] Price ticker animation with live data
- [x] Market info header (price, change, volume, market cap)
- [x] "Buy/Sell" button linking to exchange page

### Public Support Page (Mar 2026)
- [x] Public support page at `/support` with same design as Home page
- [x] Dark theme with gold accents matching brand identity
- [x] Form with: Name, Email, Subject, Category, Priority, Description
- [x] File upload without authentication (up to 3 files, 5MB each)
- [x] Backend endpoint: `POST /api/kb/public-ticket`
- [x] Public file upload: `POST /api/uploads/public`
- [x] Link in Footer pointing to `/support`
- [x] Success screen after submission

### Admin Support Submenu (NEW - Mar 2026)
- [x] Reorganized admin sidebar with "Suporte" submenu
- [x] Submenu contains: "Tickets de Suporte" and "Base de Conhecimento"
- [x] Expandable/collapsible with arrow indicator
- [x] Active state highlighting for current page

### WYSIWYG Editor for Knowledge Base (NEW - Mar 2026)
- [x] Installed `react-quill-new` for React 18 compatibility
- [x] Rich text editor with full formatting toolbar
- [x] Dark theme styling matching app design
- [x] Image upload for cover images (articles) and category images
- [x] Supports: Headers, Bold, Italic, Underline, Strike, Colors, Lists, Blockquote, Code, Links, Images
- [x] HTML content storage (backwards compatible with Markdown)

### Exchange/Trading
- [x] Buy crypto with credit card (Stripe)
- [x] Buy crypto with bank transfer (admin approval required)
- [x] Sell crypto (admin approval required)
- [x] Swap/Convert crypto between currencies
- [x] Real-time prices from CoinMarketCap (60s cache)
- [x] Admin: Configure trading fees (buy/sell/swap)
- [x] Admin: Configure spreads
- [x] Admin: Configure user limits by tier (Standard/Premium/VIP)
- [x] Admin: Approve/reject bank transfers
- [x] Admin: Complete/cancel orders
- [x] Fiat wallets: EUR, USD, AED, BRL (auto-created)
- [x] Fiat deposit via bank transfer
- [x] **Per-currency trading fees** - Admin can configure fees for EUR, USD, AED, BRL

### Authentication & Users
- [x] JWT-based authentication
- [x] User registration with invite codes
- [x] Login/Logout
- [x] Profile management

### RBAC System
- [x] Client Tiers: Standard, Premium, VIP
- [x] Internal Roles: Admin, Manager, Local Manager, Support
- [x] Regions: Europe, MENA, LATAM, Global
- [x] Region-based access control

### Knowledge Base & Support System
- [x] Public Help Center at `/help`
- [x] Article viewing with category navigation
- [x] Admin CRUD for articles and categories
- [x] Support ticket creation and management
- [x] Internal notes and messaging
- [x] Ticket assignment and status tracking
- [x] Public ticket submission (without login)

### Fiat System
- [x] Fiat wallets (EUR, USD, AED, BRL)
- [x] Fiat deposit with proof upload
- [x] Fiat withdrawal requests
- [x] Admin approval workflow

### Local Asset Storage
- [x] Generic file upload endpoint
- [x] Public file upload endpoint (no auth)
- [x] Static images served locally
- [x] Proof of payment uploads

## Pending Issues

### P0 - Blocked
- [ ] **Fireblocks Integration**: Authentication error "Error getting User certificate"
  - User needs to upload CSR file to Fireblocks Console
  - CSR file location: `/app/artifacts/zpxe5ra4_fireblocks.csr`

### P1 - Safari Bug
- [ ] **Safari cursor bug**: Custom cursor doesn't work on Safari
  - Recurring issue (3x)
  - Needs investigation in index.css and Header.jsx

### P3 - Pending Requirements
- [ ] **Whitelist functionality**: Awaiting user requirements
  - Could be for: withdrawal addresses, registration emails, or IP addresses

## Upcoming Tasks
- [ ] Populate Markets Page with CoinMarketCap data
- [ ] Integrate TradingView chart widget
- [ ] Add full translations (EN/AR)

## API Endpoints

### Public (No Auth)
- `POST /api/kb/public-ticket` - Create public support ticket
- `POST /api/uploads/public` - Upload file without auth
- `GET /api/kb/articles` - List published articles
- `GET /api/kb/categories` - List active categories

### User (Auth Required)
- `POST /api/kb/tickets` - Create support ticket
- `GET /api/kb/tickets` - Get user's tickets
- `POST /api/uploads/file` - Upload file with auth

### Admin (Admin Role)
- `GET /api/kb/admin/tickets` - Get all tickets
- `POST /api/kb/admin/articles` - Create article
- `PUT /api/kb/admin/articles/{id}` - Update article
- `POST /api/kb/admin/categories` - Create category

## Database Collections
- `kb_articles`: {id, slug, title, content, category_id, status, cover_image, ...}
- `kb_categories`: {id, slug, name, description, icon, color, image_url, ...}
- `support_tickets`: {id, ticket_number, user_id, subject, status, is_public_ticket, ...}
- `ticket_messages`: {id, ticket_id, message, attachments, ...}
- `uploaded_files`: {id, user_id, category, url, ...}

## Credentials (Preview)
- **Admin**: carlos@kryptobox.io / senha123

## Deployment Notes
- Preview URL: https://kbex-trading.preview.emergentagent.com
- Backend: Port 8001 (internal), prefixed with /api
- Frontend: Port 3000
- MongoDB: Via MONGO_URL env var
