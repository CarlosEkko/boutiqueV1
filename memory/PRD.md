# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket

## Latest Implementations (2026-04-13)
- **Launchpad Permissions**: Client Launchpad menu only visible if user has "launchpad" permission or existing subscriptions
- **Launchpad Admin in GESTÃO**: "Gerir Token Sales" moved to GESTÃO section with dedicated menu
- **Bug Fix**: Token sale activation now works — `_compute_status()` respects manual "active" status
- **Featured Token Sales**: Admin can toggle "Destaque" (star icon) per sale; featured sales appear first on public page
- **My Launchpad Investments**: New page at `/dashboard/launchpad/my-investments` showing client's token sale subscriptions
- **Trading Terminal**: Binance-style at `/dashboard/trading` with Order Book, Chart, Spot Trading, Open Orders
- **Reconciliation Dashboard**: Real-time Revolut vs Platform comparison with discrepancy alerts

## Key API Endpoints - Launchpad
- `GET /api/launchpad/sales` - Public list (featured first)
- `POST /api/launchpad/sales/{id}/subscribe` - Client subscribe
- `GET /api/launchpad/my-subscriptions` - Client subscriptions
- `PUT /api/launchpad/admin/sales/{id}` - Update sale (status, featured)
- `PUT /api/launchpad/admin/sales/{id}/toggle-featured` - Toggle featured
- `PUT /api/permissions/user/{id}` - Grant launchpad access to client

## Pending Issues
- P1: Safari cursor bug (recurring)

## Credentials
- Admin: carlos@kbex.io / senha123
