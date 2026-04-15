# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket

## Latest - Demo Mode Data Protection (2026-04-13)
- **Global data masking**: Axios response interceptor + fetch() override in DemoContext.jsx
- **Auto-masks**: names, emails, phones, IBANs, company names, wallet addresses across ALL pages
- **Covers**: ~130+ pages automatically via API response interception
- **Deterministic**: Same real name always maps to same fake name (consistent UI)
- **Skips**: Auth, demo, markets, public endpoints (no masking needed)
- **Files**: `utils/demoMask.js` (masking functions), `context/DemoContext.jsx` (interceptor)

## Key Files
- `/app/frontend/src/utils/demoMask.js` - Masking utilities
- `/app/frontend/src/utils/useDemoData.js` - React hooks for demo data
- `/app/frontend/src/context/DemoContext.jsx` - Provider with axios/fetch interceptor

## Pending Issues
- P1: Safari cursor bug (recurring)

## Credentials
- Admin: carlos@kbex.io / senha123
