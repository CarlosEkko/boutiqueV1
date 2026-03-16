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
5. **CRM** - Dashboard CRM, Fornecedores, Leads, Negociações, Contactos, Tarefas, Clientes KBEX, Pipeline de vendas
6. **Suporte** - Tickets, Base de conhecimento

## CRM Module (Implemented March 2026)

### CRM Architecture
```
/app/backend/
├── models/crm.py          # Pydantic models for all CRM entities
└── routes/crm.py          # CRUD endpoints for CRM

/app/frontend/src/pages/dashboard/crm/
├── CRMDashboard.jsx       # Stats overview
├── CRMSuppliers.jsx       # OTC suppliers management
├── CRMLeads.jsx           # Leads management
├── CRMDeals.jsx           # Deals pipeline
├── CRMContacts.jsx        # Contact management
└── CRMTasks.jsx           # Task board
```

### CRM API Endpoints
- `GET /api/crm/dashboard` - Statistics
- `GET/POST /api/crm/suppliers` - Suppliers CRUD
- `GET/POST /api/crm/leads` - Leads CRUD
- `POST /api/crm/leads/{id}/convert` - Convert lead to client
- `GET/POST /api/crm/deals` - Deals CRUD
- `GET/POST /api/crm/contacts` - Contacts CRUD
- `GET/POST /api/crm/tasks` - Tasks CRUD
- `GET /api/crm/enums/*` - Enum values (statuses, priorities, stages)

### CRM Database Collections
- `crm_suppliers`: OTC suppliers with wallet info, crypto categories
- `crm_leads`: Potential clients with qualification scoring
- `crm_deals`: Sales pipeline with stages and amounts
- `crm_contacts`: People associated with suppliers/leads
- `crm_tasks`: Follow-ups, calls, meetings with due dates

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


## Changelog

### March 16, 2026 - Fireblocks Integration Complete
- **Fixed Fireblocks Connection**: Updated API base URL from `/v1` to correct format, fixed CSR generation with correct organization name
- **Real Deposit Addresses**: Integrated Fireblocks vault creation and asset wallet generation
  - BTC: Native SegWit (bc1...) addresses
  - ETH/USDT/USDC: ERC20 (0x...) addresses  
  - SOL: Solana addresses
  - XRP: Ripple addresses
- **QR Code for Deposits**: Added QRCodeSVG component for deposit addresses with proper URI schemes (bitcoin:, ethereum:, etc.)
- **Address Auto-Update**: Dashboard wallets automatically sync with real Fireblocks addresses
- **Whitelist Page**: Full whitelist management for withdrawal addresses
  - Add/Edit/Delete whitelist entries
  - Filter by asset, search by label or address
  - Security warning about 24h activation period
- **Backend Endpoints Added**:
  - `POST /api/crypto-wallets/initialize` - Create Fireblocks vault
  - `GET /api/crypto-wallets/deposit-address/{asset}` - Get/create deposit address
  - `GET/POST/PUT/DELETE /api/crypto-wallets/whitelist` - Whitelist CRUD
  - `GET /api/crypto-wallets/qrcode/{asset}` - QR code data

### March 16, 2026 - Dashboard Portfolio Allocation Enhancement
- **Pie Chart Added**: Donut chart visualization showing portfolio distribution using recharts
- **Crypto Logos**: Added official CoinMarketCap logos for all cryptocurrencies (BTC, ETH, USDT, USDC, SOL, etc.)
- **Fiat Flags**: Added flag images for fiat currencies (EUR, USD, AED, BRL) using flagcdn.com
- **Percentages**: Each asset now shows its percentage of the total portfolio
- **Color Coding**: Matching colors between chart segments and list items

### March 16, 2026 - Performance Optimization
- **API Bulk Fetch**: Optimized `/api/trading/cryptos` to fetch all 50 crypto prices in a single CoinMarketCap API call instead of 50 individual calls
- **Cache Improvement**: Increased cache TTL from 60s to 300s (5 min) to reduce API rate limiting
- **Fallback System**: Added expired cache fallback when CoinMarketCap API returns rate limit errors
- **Lazy Loading**: Added `loading="lazy"` attribute to crypto logo images for better initial page load
- **Result**: Page load time reduced from ~50+ seconds to ~0.6 seconds

### March 13, 2026 - CRM Module Complete
- **CRM Dashboard**: Statistics overview with counts for suppliers, leads, deals, contacts, tasks, and pipeline value
- **CRM Leads**: Full CRUD with status tracking (new, contacted, qualified, proposal, negotiation, won, lost), convert to client functionality
- **CRM Deals**: Pipeline/Kanban view grouped by stage (Qualification, Proposal, Negotiation, Closed Won, Closed Lost), crypto amount tracking
- **CRM Contacts**: Card grid view with contact details, links to suppliers/leads, preferred contact method
- **CRM Tasks**: Kanban board (Pending, In Progress, Completed), priority levels (low, medium, high, urgent), due date with overdue detection
- **Bug Fixed**: DateTime timezone comparison bug in tasks endpoint

### March 13, 2026 - Knowledge Base UI Cleanup
- **Main KB page**: Removed subcategory buttons/tags from category cards - now shows only icon, name, description and article count
- **Category page (e.g., FAQs)**: Removed top navigation buttons - subcategories now displayed only as clickable cards
- **Subcategory page (e.g., Contas)**: Articles now displayed as individual cards instead of a list inside a single card
