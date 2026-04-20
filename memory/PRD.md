# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, TradingView Lightweight Charts
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket
- Languages: PT, EN, AR, FR, ES (i18n)

## Fully Translated Pages (i18n)
- **Public**: EarnPage, MarketsPage, LaunchpadPage, InstitutionalPage, CryptoATMPage, Header, Footer
- **Dashboard**: DashboardOverview, ExchangePage, WhitelistPage, FiatDepositPage, KYCStatus
- **OTC**: PreQualDialog, OTCLeads (inline helper)

## Business Accounts System
- Users create business accounts from Profile page
- Independent wallets per entity (filtered by entity_id in dashboard.py)
- Entity Switcher in sidebar (DashboardLayout.jsx)
- Sumsub KYB verification per business account
- Backend: `/api/business-accounts` CRUD + switch

## Client Tiers & Features (2026-04-17)
- 5 tiers: Broker / Standard / Premium / VIP / Institucional (min allocations €190-€5000)
- Client page: `/dashboard/tiers` (comparison view + upgrade request flow)
- Admin page: `/dashboard/admin/tiers` (editable min allocations, per-feature cells, upgrade request inbox)
- Backend: `/api/client-tiers` GET/PUT + `/reset` + `/upgrade-request` + `/upgrade-requests`
- Seeded from KBEX canonical grid (10 sections: Perfil, Portefólio, Trading, Cold Wallet, Investimentos, Launchpad, Portal OTC, Forensic, Escrow, Multi-Sign)
- Translations (PT/EN/AR/FR/ES): full `tiers.*` namespace (UI, sections, features, value badges)
- Sidebar: Perfil → "Níveis & Benefícios" (client); Gestão → "Níveis de Cliente" (admin)
- All tests pass: 19/19 backend, 100% frontend (iteration_51)

## Cofre / Vault Limits Unified (2026-04-20)
- **Single source of truth:** `client_tiers_config` → feature `otc_vaults` (renamed to "Cofres (Omnibus)")
- **Backend:** `_get_max_cofres()` in `omnibus.py` reads from `client_tiers_config`; legacy `omnibus_tier_limits` endpoints marked `deprecated=True` and write-through to canonical source
- **AdminSettings card:** converted to read-only display with link to `/admin/tiers`
- **Multi-Sign:** removed duplicate "vaults" row — Multi-Sign = 1 signing structure per client; additional addresses/cofres are Omnibus sub-accounts counted under `otc_vaults`
- **Translations updated** (5 languages): "Vaults (Omnibus)" / "Cofres (Omnibus)" / "خزائن (Omnibus)" / "Coffres (Omnibus)" / "Bóvedas (Omnibus)"
- **Existing cofres preserved:** only affects limit on future creation (omnibus_ledger untouched)

## Revolut Business API — P2 Complete (2026-04-20)
- **Webhook HMAC-SHA256 signature verification** (`Revolut-Signature` + `Revolut-Request-Timestamp`, 5-min replay tolerance)
- **Background auto-sync** every 5 min (configurable via `REVOLUT_SYNC_INTERVAL_S`), launched on app startup
- **Health endpoint** `/api/revolut/health`: connection, webhook_signed, token age, last deposit/reconciliation/rejection, background sync state
- **Audit log** `revolut_audit_log`: auto_reconcile, manual_reconcile, webhook_rejected events (compliance-grade trail)
- **Admin UI**: 4-card Health Monitor panel in `/dashboard/admin/contas-bancarias` (auto-sync, webhook signed, last deposit, last reconciliation)
- Verified: 3 webhook signature scenarios (none/bogus/valid) return correct HTTP 401/401/200

## Supported Fiat (Client-visible)
EUR, USD, AED, CHF, QAR, SAR, HKD

## Pending
- P1: Safari cursor bug

## VPS Deployment
- `cd /opt/boutiqueV1 && git fetch origin && git reset --hard origin/main-v1.1 && sudo docker compose build --no-cache && sudo docker compose up -d`

## Credentials
- Admin: carlos@kbex.io / senha123
