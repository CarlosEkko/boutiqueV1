# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include an Exchange, OTC Desk, Escrow Module, Fiat/Crypto Wallets, Onboarding, CRM, Staking, Launchpad/ICO, and automated KYC/KYB.

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury", trust, exclusivity in UI/UX
- Integration with Revolut Business API for fiat deposit reconciliation
- Invite-only platform (public users can only "Request Access")
- Hardware wallet integration (Trezor)

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Integrations: Trezor Connect SDK, Fireblocks, TradingView, Binance WebSockets, Sumsub, Brevo

## What's Been Implemented
- OTC CRM, Trezor integration (auto-sync), Sumsub KYC/KYB, Launchpad
- Real-time WebSocket crypto prices
- Full 5-language translations
- Commercial Dashboard with CRUD, Recharts analytics, seller details
- "A Minha Performance" self-service page for sales members
- ProtectedDocViewer (anti-screenshot, anti-print PDF viewer)
- Cold Wallet UI (Trezor Suite style)
- Audit Report Date custom selection
- Code Quality cleanup (circular imports, hook dependencies, secure storage)
- Demo Mode toggle moved to Profile Page
- Fireblocks references removed from UI
- TransparencyPage.jsx fully translated (bug fix: react-i18next → useLanguage, 2026-04-13)
- **Refactored OTCLeads.jsx**: 609 → 178 lines. Extracted LeadDetailDialog, PreQualDialog, SetupDialog, NewDealDialog (2026-04-13)
- **Refactored AdminTradingPage.jsx**: 1701 → 126 lines. Extracted useAdminTrading hook + 7 tab components (CryptoFeesTab, FiatFeesTab, LimitsTab, OrdersTab, TransfersTab, FiatWithdrawalsTab, CryptoWithdrawalsTab) (2026-04-13)

## Refactored File Structure
```
otc/
  OTCLeads.jsx (178 lines)
  components/
    LeadCard.jsx
    CreateLeadDialog.jsx
    LeadDetailDialog.jsx (NEW)
    PreQualDialog.jsx (NEW)
    SetupDialog.jsx (NEW)
    NewDealDialog.jsx (NEW)
  hooks/
    useOTCLeads.js

admin/
  AdminTradingPage.jsx (126 lines)
  trading/ (NEW)
    useAdminTrading.js
    CryptoFeesTab.jsx
    FiatFeesTab.jsx
    LimitsTab.jsx
    OrdersTab.jsx
    TransfersTab.jsx
    FiatWithdrawalsTab.jsx
    CryptoWithdrawalsTab.jsx
```

## Pending Issues
- P1: Safari cursor bug (recurring 15+ times, not started)

## Backlog / Future Tasks
- None specified by user

## 3rd Party Integrations
- TradingView Widgets, Binance WebSockets, Revolut Business API (requires User API Key), Trezor Connect SDK, Sumsub, Brevo, Fireblocks

## Credentials
- Admin: carlos@kbex.io / senha123
