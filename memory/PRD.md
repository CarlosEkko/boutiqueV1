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
- **Frontend**: React, React Router, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Deployment**: Docker, Docker Compose, Nginx (reverse proxy), Let's Encrypt (SSL)
- **Integrations**: CoinMarketCap (preços), Stripe (pagamentos), emergentintegrations

## Key Features
- **Multi-currency support**: EUR, USD, AED, BRL with real-time exchange rates
- **Global currency selector** in dashboard header
- **Automatic price conversion** for all crypto prices and limits

## Architecture
```
/app
├── backend/
│   ├── models/
│   │   ├── user.py (RBAC models)
│   │   └── trading.py (Trading models - NEW)
│   ├── routes/
│   │   ├── auth.py (JWT authentication)
│   │   ├── admin.py (RBAC endpoints)
│   │   ├── trading.py (Exchange endpoints - NEW)
│   │   ├── tickets.py (Support system)
│   │   ├── kyc.py (KYC/KYB verification)
│   │   └── dashboard.py (User dashboard)
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── components/ (Header, Footer, UI)
│   │   ├── pages/
│   │   │   ├── dashboard/
│   │   │   │   ├── ExchangePage.jsx (NEW)
│   │   │   │   └── admin/AdminTradingPage.jsx (NEW)
│   │   │   └── ...
│   │   └── context/AuthContext.jsx
│   └── public/logo.png
├── docker-compose.yml
└── nginx/nginx.conf
```

## Implemented Features

### Exchange/Trading (NEW - Dec 2025)
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
- [x] User limits check (daily/monthly/per-transaction)
- [x] Order history
- [x] Fiat wallets: EUR, USD, AED, BRL (auto-created for users)
- [x] Fiat deposit via bank transfer with unique reference code
- [x] Fiat deposit proof submission
- [x] Admin approval for fiat deposits → credits fiat wallet
- [x] **Multi-currency platform**: EUR, USD, AED, BRL
- [x] **Global currency selector** in dashboard
- [x] **Exchange rates API** with 5-minute cache
- [x] **Automatic price conversion** for all crypto pairs
- [x] **Per-currency trading fees** (Feb 2026) - Admin can configure individual fees for EUR, USD, AED, BRL
- [x] **Admin per-currency fee UI** - Tabbed interface with currency selector and per-currency fee configuration

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
- [x] Internal user management (create, update, delete)

### Ticket/Support System
- [x] Create tickets (clients)
- [x] Reply to tickets
- [x] Assign tickets (internal)
- [x] Update status/priority
- [x] Region-based ticket filtering
- [x] Ticket statistics

### KYC/KYB System
- [x] Individual KYC form
- [x] Business KYB form
- [x] Document upload
- [x] Admin approval/rejection

### Dashboard
- [x] Portfolio overview
- [x] Wallet management
- [x] Transaction history
- [x] Investment opportunities
- [x] ROI tracking
- [x] Transparency reports

### Admin Panel
- [x] User management (block/unblock/delete/reset password)
- [x] Trading management (fees, limits, orders, transfers)
- [x] KYC/KYB review
- [x] Investment opportunities
- [x] Invite codes
- [x] Statistics
- [x] Regional metrics

## API Endpoints

### Trading (NEW)
- GET /api/trading/cryptos - List available cryptocurrencies with prices
- GET /api/trading/price/{symbol} - Get single crypto price
- GET /api/trading/fees - Public fee configuration
- GET /api/trading/limits - User's trading limits
- POST /api/trading/buy - Create buy order
- POST /api/trading/sell - Create sell order
- POST /api/trading/swap - Create swap order
- GET /api/trading/orders - User's orders
- GET /api/trading/orders/{id} - Order details
- GET /api/trading/payment-status/{session_id} - Check Stripe payment status
- POST /api/webhook/stripe - Stripe webhook
- POST /api/trading/fiat-withdrawal - Request fiat withdrawal (NEW)
- GET /api/trading/my-withdrawals - User's withdrawal history (NEW)
- POST /api/trading/fiat-withdrawal/{id}/cancel - Cancel pending withdrawal (NEW)

### Trading Admin
- GET /api/trading/admin/fees - Full fee configuration
- PUT /api/trading/admin/fees - Update fees
- GET /api/trading/admin/limits - All tier limits
- GET /api/trading/admin/limits/{tier} - Specific tier limits
- PUT /api/trading/admin/limits/{tier} - Update tier limits
- GET /api/trading/admin/orders - All orders
- POST /api/trading/admin/orders/{id}/complete - Complete order
- POST /api/trading/admin/orders/{id}/cancel - Cancel order
- GET /api/trading/admin/bank-transfers - All bank transfers
- POST /api/trading/admin/bank-transfers/{id}/approve - Approve transfer
- POST /api/trading/admin/bank-transfers/{id}/reject - Reject transfer

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/me

### Admin (RBAC)
- GET /api/admin/users (with region filter)
- POST /api/admin/internal-users
- GET /api/admin/internal-users
- PUT /api/admin/internal-users/{id}
- DELETE /api/admin/internal-users/{id}
- POST /api/admin/users/{id}/region/{region}
- POST /api/admin/users/{id}/membership/{level}

### Tickets
- POST /api/tickets/ (create)
- GET /api/tickets/my-tickets
- GET /api/tickets/{id}
- POST /api/tickets/{id}/reply
- GET /api/tickets/internal/all (with region filter)
- POST /api/tickets/internal/{id}/assign
- POST /api/tickets/internal/{id}/status/{status}
- GET /api/tickets/internal/stats

## Database Schema

### trading_fees
```json
{
  "id": "uuid",
  "buy_fee_percent": 2.0,
  "buy_spread_percent": 1.0,
  "sell_fee_percent": 2.0,
  "sell_spread_percent": 1.0,
  "swap_fee_percent": 1.5,
  "swap_spread_percent": 0.5,
  "min_buy_fee_usd": 5.0,
  "min_sell_fee_usd": 5.0,
  "min_swap_fee_usd": 3.0,
  "network_fees": {"bitcoin": 10.0, "ethereum": 5.0, ...}
}
```

### trading_limits
```json
{
  "id": "uuid",
  "tier": "standard|premium|vip",
  "daily_buy_limit": 5000.0,
  "daily_sell_limit": 5000.0,
  "daily_swap_limit": 10000.0,
  "monthly_buy_limit": 50000.0,
  "monthly_sell_limit": 50000.0,
  "monthly_swap_limit": 100000.0,
  "min_buy_amount": 50.0,
  "max_buy_amount": 10000.0,
  ...
}
```

### trading_orders
```json
{
  "id": "uuid",
  "user_id": "string",
  "order_type": "buy|sell|swap",
  "status": "pending|awaiting_payment|processing|completed|cancelled|failed|awaiting_admin_approval",
  "crypto_symbol": "BTC",
  "crypto_amount": 0.001,
  "fiat_amount": 100.00,
  "market_price": 66000.00,
  "execution_price": 66660.00,
  "fee_percent": 2.0,
  "fee_amount": 2.00,
  "payment_method": "card|bank_transfer|crypto",
  "stripe_session_id": "string|null",
  "bank_transfer_id": "string|null"
}
```

### bank_transfers
```json
{
  "id": "uuid",
  "user_id": "string",
  "order_id": "string|null",
  "transfer_type": "deposit|withdrawal",
  "amount": 100.00,
  "currency": "EUR",
  "reference_code": "KB12345678",
  "status": "pending|awaiting_approval|approved|rejected|completed"
}
```

### users
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "hashed_password": "string",
  "user_type": "client|internal",
  "internal_role": "admin|manager|local_manager|support|null",
  "region": "europe|mena|latam|global",
  "membership_level": "standard|premium|vip",
  "is_admin": "boolean",
  "is_approved": "boolean",
  "kyc_status": "not_started|pending|approved|rejected"
}
```

## Test Credentials (Preview Environment)
- **Admin**: carlos@kryptobox.io / senha123

## Known Issues
- [ ] Safari cursor bug (P1) - cursor not working correctly in Safari
- [ ] Fireblocks integration blocked (P2) - waiting for new credentials
- [ ] Whitelist functionality not implemented (P3) - waiting for requirements

## Completed (Feb 2026)
- [x] Per-currency trading fees (fiat) - Admin can configure fees for EUR, USD, AED, BRL individually
- [x] Admin UI for per-currency fees - Currency tabs with flag icons, separate fee forms per currency
- [x] **Per-cryptocurrency trading fees** - Admin can configure fees for each of 50 supported cryptocurrencies (BTC, ETH, SOL, etc.)
- [x] **Admin UI for crypto fees** - New 'Taxas Crypto' tab with searchable crypto list and individual fee configuration

## Completed (Mar 2026)
- [x] **Client Fiat Withdrawal Page** - Complete page for users to request fiat withdrawals
  - Form with currency selection (EUR, USD, AED, BRL) showing wallet balance
  - Bank details input (IBAN, SWIFT/BIC, account holder, bank name)
  - 0.5% fee calculation with minimum €5 displayed in summary
  - Withdrawal history with expandable details
  - Cancel pending withdrawals functionality
  - Navigation links added to dashboard sidebar (Depósito Fiat, Levantamento Fiat)

- [x] **Local File Storage System** - All images and documents now stored on server
  - New `/api/uploads` endpoint for generic file uploads
  - Upload proof of deposit via file upload (not URL)
  - All static images moved from external URLs (Unsplash, etc.) to `/images/` folder
  - Supported file types: PDF, JPEG, PNG, WebP, GIF
  - Categories: KYC, deposits, withdrawals, documents, general
  - Max file size: 10MB

## Pending Tasks
- [ ] Markets page with CoinMarketCap data
- [ ] Trading page with TradingView chart
- [ ] Full translations EN/AR

## Future Tasks
- [ ] Launchpad page
- [ ] ICO page
- [ ] Dashboard charts and history
- [ ] Real wallet integration (after Fireblocks fix)
- [ ] Whitelist functionality (after requirements)
