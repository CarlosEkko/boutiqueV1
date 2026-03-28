# KBEX.io - Product Requirements Document

## Original Problem Statement
Build a website for a premium Crypto Boutique Exchange named **KBEX.io** targeting High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals and companies in Europe, Middle East, and Brazil.

## Target Audience
- High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals
- Companies requiring crypto exchange services
- Geographic focus: Europe, Middle East, Brazil

## Core Products/Services
1. Exchange (Buy/Sell/Convert)
2. Crypto ATM Network
3. Launchpad
4. ICO
5. Institutional Custody

## Tone & Style
"Quiet luxury," trust, exclusivity, clear, serious, and sophisticated.

---

## Implemented Features

### Session - December 2025

#### Exchange Page Enhancements (2025-03-28)
- **Segmented Control Toggle**: Elegant pill-style toggle (EUR | BTC) for switching between fiat and crypto input modes
- **Auto Conversion Display**: Shows "≈ X BTC" or "≈ €X" below input based on selected mode
- **Removed Fees Block**: Removed the fees display block from the exchange page sidebar

#### Multi-Currency System
- Global currency selector (EUR, USD, AED, BRL)
- All prices and balances converted to selected currency
- CurrencyContext for state management

#### Fiat Wallet System
- Fiat wallets (EUR, USD, AED, BRL)
- Fiat deposit workflow with admin approval
- Bank transfer details with reference codes

#### Trading System
- Buy/Sell/Convert cryptocurrencies
- Payment methods: Credit Card (Stripe), Bank Transfer
- Real-time price updates (1-second polling)
- Order history and tracking

#### Authentication & Security
- JWT authentication
- 2FA support
- KYC integration (Sumsub WebSDK)
- Role-based access control (RBAC)

#### Admin Panel
- Client management
- Staff management
- Trading fee/limit configuration
- Fiat deposit approval
- Regional dashboard

#### Internationalization
- Backend API i18n complete
- Frontend translations: PT, EN, AR (in progress)

---

## Known Issues

### P0 - Critical
- None currently

### P1 - High Priority
1. **Safari Cursor Bug** - Mouse cursor not functioning correctly on Safari browser (Recurring issue)
2. **Frontend Translations Incomplete** - Several pages still have hardcoded Portuguese text

### P2 - Medium Priority
1. **Fireblocks Integration** - Blocked waiting for valid API credentials
2. **HTTP Polling Performance** - 1-second polling causing VPS strain, needs WebSocket refactor

### P3 - Low Priority
1. **Whitelist Functionality** - Not implemented yet, awaiting requirements

---

## Upcoming Tasks

### P1 Priority
- Complete frontend translations (FiatDepositPage, FiatWithdrawalPage, KYC pages, Support, etc.)
- TradingView chart widgets on Trading/Markets pages
- Fix Safari cursor bug

### P2 Priority
- Implement whitelist functionality
- Refactor HTTP polling to WebSockets
- OTC Desk Phase 3 (Settlement & Invoicing)

### P3 Priority
- CRM enhancements (Suppliers module)
- Build out Product Pages (Launchpad, ICO)
- Full translations for EN and AR

---

## Technical Architecture

### Frontend
- React 18
- React Router
- Tailwind CSS
- Shadcn UI components
- React Context API (Auth, Currency, Language)

### Backend
- FastAPI
- Pydantic
- Motor (MongoDB async driver)

### Database
- MongoDB

### 3rd Party Integrations
- **CoinMarketCap**: Live crypto prices
- **Stripe**: Credit card payments
- **Sumsub**: KYC/KYB verification
- **Fireblocks**: Wallet management (BLOCKED)

### Deployment
- Docker
- Nginx
- Let's Encrypt SSL

---

## Key Files Reference

### Frontend
- `/app/frontend/src/pages/dashboard/ExchangePage.jsx` - Trading page
- `/app/frontend/src/contexts/CurrencyContext.jsx` - Multi-currency state
- `/app/frontend/src/i18n/translations.js` - Translation strings
- `/app/frontend/src/components/dashboard/CurrencySelector.jsx` - Currency switcher

### Backend
- `/app/backend/routes/trading.py` - Trading API endpoints
- `/app/backend/models/trading.py` - Pydantic models
- `/app/backend/utils/i18n.py` - Backend localization

---

## Test Credentials
- **Admin**: `carlos@kryptobox.io` / `senha123`
- **Client**: `teste.frances@teste.com` / `senha123`

---

## User's Preferred Language
**Portuguese** - All agent responses should be in Portuguese.
