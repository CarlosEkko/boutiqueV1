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

## Billing & Annual Fee Management (2026-04-20)
**Business model: Admission (one-time) ≠ Annual Fee (recurring).**

Backend (`/app/backend/routes/billing.py`):
- Model split: `admission_fee` (existing, onboarding) + new `annual_fee` (recurring) in `platform_settings`
- New commissions: `admission_fee_percent` (initial) + `annual_commission_percent` (renewals) — auto-seeded at half of admission
- `admission_payments.fee_type` ∈ {"admission", "annual"} distinguishes invoices
- New endpoints: `GET /api/billing/config|my-status|cycle-status|renewals|payouts` · `PUT /api/billing/annual-fee|commissions` · `POST /api/billing/run-cycle` · `POST /api/billing/users/{id}/suspend|unsuspend`
- **Daily automated renewal cycle** (background task, configurable via `BILLING_CYCLE_INTERVAL_S`):
  1. Clients due within `notify_days_before` (default 30) → auto-create pending annual_payment + notify client + notify admins
  2. Clients past `grace_days` → flag `billing_status: "overdue"`
  3. Clients past `suspend_after_days` → auto-suspend
- Commission splits: approval flow reads `fee_type` and applies correct %; renewals respect `annual_commission_percent`
- Fixed bug: `/kbex-rates/renewal-alerts` now reads `annual_fee_next_due` (was looking at wrong field)

Frontend:
- New admin page `/dashboard/admin/billing` (`AdminBillingPage.jsx`): KPIs (Próximas/Pendentes/Em Atraso/Suspensos) + clickable tabs, annual fee config, cycle controls, payouts summary
- AdminSettings: added `Comissão Renovação Anual (%)` alongside existing admission %
- Sidebar: new item "Cobrança & Renovações" translated in 5 languages

Verified end-to-end: manual cycle trigger created 1 pending payment, notified client, past-due client auto-suspended after forcing +35 days, approval of `fee_type="annual"` payment correctly sets `annual_fee_next_due=+1y` and preserves admission fields.

## Tier Progress Tracker (2026-04-20)
- New reusable component `/components/tiers/TierProgressTracker.jsx` (full + compact modes)
- Reads `/api/omnibus/my-cofres` → `{used, max, tier}` with dynamic color accent:
  - **Gold/Safe**: below 80%
  - **Amber/Near**: 80-99%
  - **Red/At Limit**: 100% with AlertTriangle icon
- Contextual CTA button "Ver {NextTier}" → navigates to `/dashboard/tiers`
- Integrated into `VaultWallets` "Visão Geral" overview
- Translations in 5 languages (PT/EN/AR/FR/ES): `tierTracker.*` namespace
- Fix: `/my-cofres` now returns `cofres_max` even when user has 0 cofres

## Fireblocks Auto-Approval Webhook (2026-04-20)

**Zero-friction billing: cliente paga → tier aplicado em 60s sem intervenção humana.**

Backend:
- New `POST /api/billing/fireblocks-webhook` — handles `TRANSACTION_CREATED` + `TRANSACTION_STATUS_UPDATED`
- RSA-SHA512 signature verification via `FIREBLOCKS_WEBHOOK_PUBLIC_KEY` env var (rejects with 401 if invalid)
- `_find_and_approve_matching_payment()`: filters deposits to KBEX OnBoarding vault, matches amount ±3% against pending/awaiting_confirmation payments (last 7 days), prioritises exact `crypto_currency` match, auto-approves via full flow (payment paid, tier applied, referrer commission, notifications, audit log)
- Idempotent via `fireblocks_tx_id` deduplication
- Graceful fallback: if public key not configured, logs warning; if no match found, returns 200 with `auto_approved: false`

Frontend:
- Webhook URL box in `AdminBillingPage` vault card (blue-accented) with copy-to-clipboard — admin cola no Fireblocks console
- Explanatory text: "Depósitos confirmados neste vault vão auto-aprovar o pagamento pendente (tolerância ±3%)"

**End-to-end verified:**
- Pro-rata upgrade €203.42 @ 99 days remaining → pending payment created
- Simulated Fireblocks webhook with USDT 239.1 (= €203.42 at live EURUSDT rate) → webhook returned `auto_approved: true`
- Payment status = "paid", approved_by = "auto_fireblocks_webhook", tier applied (standard→premium)
- Invalid signature returns HTTP 401 + audit log entry

## Fireblocks KBEX OnBoarding Vault (2026-04-20)

**Institutional-grade custody for all onboarding & annual fee payments.**

Backend:
- New endpoints in `billing.py`:
  - `POST /api/billing/vault/setup` — idempotent create (or sync) of Fireblocks vault named **"KBEX OnBoarding"** with 4 assets: BTC · ETH · USDT_ERC20 · USDC
  - `GET /api/billing/vault` — returns vault config, deposit addresses, live balances
  - `POST /api/billing/vault/refresh-addresses` — re-fetches addresses from Fireblocks
- Checkout endpoint `/billing/payments/{id}` now prioritises Fireblocks addresses (returns `vault_source: "fireblocks"`), falls back to `platform_settings.crypto_wallets` if vault not configured
- Vault info stored in `platform_settings.billing_fireblocks_vault` (`vault_id`, addresses by asset, refreshed_at)

Reused existing `FireblocksService` (SDK v2.17.0 already in project for Omnibus vault)

Frontend:
- New Vault card in `AdminBillingPage`: shows vault_id, last sync date, 2×2 grid of addresses with asset labels (BTC/ETH/USDT_ERC20/USDC), copy-to-clipboard, live balance per asset, Setup/Sync button

**Verified in production (sandbox Fireblocks):**
- Vault 78 created with real addresses: `bc1qtnfwejle94k9dt0equmteeayf26tlsu5vcqycd` (BTC), `0x3242b02F3F8949A1aD21694EFd4dE83c8e2275a5` (ETH/USDT/USDC)
- Client checkout now pulls these exact addresses (`vault_source: fireblocks`)
- Fallback still works if admin never creates the vault

## Billing Checkout — Pagar Agora (2026-04-20)

**End-to-end payment flow for annual & upgrade invoices:**

Backend:
- New `status="awaiting_confirmation"` for method-submitted payments
- `GET /api/billing/payments/{id}` returns payment + live crypto amounts (Binance EURUSDT + BTCUSDT + ETHUSDT) + receiving wallet addresses + EUR bank accounts
- `POST /api/billing/payments/{id}/submit` records method choice (crypto/bank_transfer + currency/IBAN) + notifies admins
- Pending queries extended to include `awaiting_confirmation` status

Frontend:
- New reusable `BillingCheckoutDialog` (`/components/billing/`): crypto/bank toggle, live crypto price display with network info (ERC-20/Bitcoin), copy-to-clipboard wallet address, bank transfer with dynamic reference code `KBEX-UPGRADE-xxxxxxxx`
- Wired into `ClientTiersPage`: upgrade submit → auto-opens checkout dialog with the new payment_id
- Wired into `BillingSection`: "Pagar Agora" button on pending annual/upgrade payments opens same dialog

Verified E2E:
- Upgrade Std→Premium mid-year → €750 (or €373.97 @ 183 days) quote → payment created → checkout shows 4 cryptos with live amounts (USDT=882.3, BTC=0.0058, etc) + wallet address → submit records method → status=awaiting_confirmation → admin receives notification

## Billing Phase 2 — Upgrade Pro-Rata + History + Client UI (2026-04-20)

**New capabilities (on top of Phase 1 billing):**

Backend:
- `POST /api/billing/upgrade/quote` — pro-rata calculator (delta × days_remaining/365)
- `POST /api/billing/upgrade/request` — client submits upgrade, auto-creates pending payment (or instantly applies if delta=0)
- `POST /api/billing/upgrade/{id}/approve` — admin approves upgrade, applies new tier, preserves anniversary, pays `upgrade_commission_percent` to referrer
- `GET /api/billing/my-history` — client's own payments chronologically with summary (total paid, renewals, upgrades, account age)
- `GET /api/billing/users/{id}/history` — admin view
- `referral_fees.upgrade_commission_percent` added (seed defaults to admission %)

Frontend:
- `ClientTiersPage` upgrade dialog now shows **live pro-rata breakdown** (current/target/delta/days/amount)
- New `AnnualFeeBanner` component on dashboard (imminent/overdue/pending/suspended states, dismissible)
- New `BillingSection` on ProfilePage: tier info + taxa anual + próxima renovação + pending payment banner + history table with type badges (Admissão/Renovação/Upgrade)
- `AdminBillingPage` got History drawer (per-client timeline with summary tiles)
- `AdminSettings` adds "Comissão Upgrade (%)" field
- **Menu moved:** "Cobrança & Renovações" migrated from Gestão → Financeiro

Verified end-to-end:
- Pro-rata Standard→Premium with 183 days remaining returns €373.97 (✓ €750 × 183/365)
- Upgrade delta=0 auto-applies without payment
- Commission on upgrade uses `upgrade_commission_percent`

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

## Renewals Health Dashboard (2026-04-20, v2 with sparkline + alerts)
- **Backend:** `GET /api/billing/renewals-health` — projected annual MRR, active clients by tier, collected 12m (split by admission/annual/upgrade), `monthly_revenue_12m` series (12-month sparkline), renewal rate, auto-approval % via Fireblocks, payment method breakdown, pending pipeline, proactive `alerts[]` (severity: critical/warning/info).
- **Frontend:** `RenewalsHealthPanel` on `/dashboard/admin/billing` — 4 headline KPIs (including emerald SVG sparkline in "Cobrado 12m"), alert banners (red/amber/sky), tier distribution bars, payment method stacked bar.
- **Proactive alerts:** renewal rate < 85% (critical), ≥3 suspended (critical), ≥3 overdue (warning), ≥5 pending invoices (info).
- Validated live: dataset with 6 pending + 1 paid of 7 annual invoices triggered both critical + info alerts correctly.

## Brevo Billing Emails — Wired (2026-04-20)
- 4 templates added to `email_service.py`: `send_billing_renewal_upcoming`, `send_billing_overdue`, `send_billing_suspended`, `send_billing_payment_confirmed` (quiet-luxury HTML shell: gold/amber/red/emerald accents).
- Triggered automatically in billing lifecycle:
  - `_run_renewal_cycle` (daily background) → upcoming / overdue / suspended
  - `/api/billing/fireblocks-webhook` auto-approval → payment confirmed
  - `/api/billing/upgrade/{id}/approve` (admin manual) → upgrade confirmed
  - `/api/referrals/admission-fee/{id}/approve` (admin manual) → payment confirmed
- `_safe_send_email` wrapper in `billing.py` + try/except in `referrals.py` isolate email failures — billing never breaks.
- Portal deep-link: `{FRONTEND_URL}/dashboard/profile#billing`.
- **Testing (iteration_52): 27/27 backend tests PASSED.**

## Supported Fiat (Client-visible)
EUR, USD, AED, CHF, QAR, SAR, HKD

## Pending
- P1: Safari cursor bug

## VPS Deployment
- `cd /opt/boutiqueV1 && git fetch origin && git reset --hard origin/main-v1.1 && sudo docker compose build --no-cache && sudo docker compose up -d`

## Credentials
- Admin: carlos@kbex.io / senha123
