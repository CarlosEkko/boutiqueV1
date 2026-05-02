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

## KBEX Spread — Unified Pricing Architecture (2026-04-20, v4)
- **Renamed** "KBEX Rates" → "KBEX Spread" (admin sidebar label, page title, subtitle). Backend routes remain `/api/kbex-rates/*` (URL compatibility).
- **5 products** now in KBEX Spread: `otc`, `exchange`, `spot`, `escrow`, `multisign`. Each has 5 tiers (broker/standard/premium/vip/institucional) × configurable asset spreads.
- **Single Source of Truth** for all prices: `/app/backend/services/pricing_service.py` → `apply_spread(base_price, product, tier, asset)`.
- **All price feeds** now consume KBEX Spread: `/api/trading/cryptos`, `/api/trading/markets`, `/api/trading/price/{symbol}`, OTC Desk (unchanged). Returns `price_buy`, `price_sell`, `buy_spread_pct`, `sell_spread_pct` alongside mid price.
- **Tier-aware pricing:** authenticated users get spread based on their `membership_level`. Anonymous callers → standard tier.
- **Exchange UI (tab-aware):** Comprar tab shows only buy price (emerald +X%), Vender shows only sell (red −X%), Converter shows both. Mid price no longer displayed.
- **Trading page** uses `product=spot`, Exchange uses `product=exchange`, Markets public uses `product=exchange` (standard tier).

## Annual Fee Consolidation — Single Source of Truth (2026-04-20, v3)
- **Canonical source:** `platform_settings.annual_fee` (read via `GET /api/billing/config`, written via `PUT /api/billing/annual-fee`).
- **Platform Configurations page** (`AdminSettings`) is the only editor for tier amounts:
  - Taxa de Admissão Inicial (ONE-TIME) — 5 tiers, saves to `platform_settings.admission_fee`
  - Taxa Anual (Recorrente) (ANUAL) — 5 tiers, saves to `platform_settings.annual_fee`
  - Taxas de Referência — commission % for referrers
- **Billing page** (`AdminBillingPage`) now operational-only: read-only tier summary + cycle params (is_active / grace_days / notify_days / suspend_after_days).
- **KBEX Rates page**: "Fees Anuais por Tier" card removed. `get_tier_fees()` reads from canonical source; `PUT /api/kbex-rates/tier-fees` removed (404). Old collection `kbex_settings.tier_fees` dropped.
- **Zero regressions** — run-cycle, renewals-health, my-status, referrals all continue to work.

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

## White-Label Tenants Phase 2 — Data Isolation (2026-04-21)
- **UserInDB model** extended with `tenant_slug: str = "kbex"`.
- **`auth.register`** stores `tenant_slug` from Host header; email uniqueness scoped per-tenant.
- **`auth.login`** rejects cross-tenant login — user registered on tenant A cannot authenticate from tenant B's domain.
- **Admin `list_users`** auto-filters by current tenant's Host; default KBEX admins may narrow with `?tenant_slug=<slug>` or see all.
- **New admin endpoint** `GET /api/tenants/{slug}/stats` — per-tenant counts (users / otc_deals / crypto_wallets / otc_leads / tickets).
- **Admin Tenants page** (`AdminTenants.jsx`) now shows "Uso" card per tenant with live counters.
- **Migration on startup** (`ensure_tenant_scoping`): idempotently backfills `tenant_slug="kbex"` to legacy rows in 11 collections (users, otc_deals, otc_leads, crm_leads, crypto_wallets, fiat_wallets, bank_accounts, tickets, billing_accounts, kyc_records, escrow_deals). First run backfilled: users:+19, otc_leads:+28, crm_leads:+25, fiat_wallets:+1, bank_accounts:+1, escrow_deals:+46.
- **New dependencies** in `routes/tenants.py`: `get_current_tenant(request)`, `get_current_tenant_slug(request)`.
- **Tests:** `/app/backend/tests/test_tenant_isolation.py` — 7/7 PASSED (includes cross-tenant login rejection simulation).
- **Docs:** `/app/docs/TENANTS.md` updated with Phase 2 spec + stats endpoint.

## Multi-Currency Display — Dashboard + Markets (2026-04-21)
- **Backend `EXCHANGE_RATES_CACHE`** now populates rates for all 7 client-visible fiat (EUR, USD, AED, CHF, QAR, SAR, HKD) + GBP + BRL. Previously only 4 were populated, causing CHF/QAR/SAR/HKD to silently fall back to 1.0 (same as USD).
- **Fixed `/api/trading/markets/stats`** 500 error on non-USD currencies: the internal call was leaking a `Depends()` object as `user_id` parameter into Mongo queries. Now passes `user_id=None` explicitly.
- **Fallback for CoinGecko gaps** (QAR, SAR): when CoinGecko's global endpoint doesn't report a currency, convert USD market cap via FX rates so the Market Cap card is always populated.
- **Frontend bug fix `MarketsPage`:** was reading `selectedCurrency` from CurrencyContext which doesn't exist (property is `currency`) → always `undefined` → backend defaulted to USD. Now correctly uses `currency`, `convertFromUSD`, and `formatCurrency`. Live WebSocket prices (USDT-quoted) are converted to the selected currency to match API prices.
- **Frontend `DashboardOverview`:** previously hardcoded USD. Now integrates `useCurrency` hook — all four top cards (Portfólio Total, Saldo da Carteira, Total Investido, Retornos Esperados) plus pie-chart tooltips and asset allocation list convert USD values to the selected display currency.
- **`CurrencyContext` supported list** updated to match PRD: EUR, USD, AED, CHF, QAR, SAR, HKD (BRL removed — it was client-visible erroneously). `formatCurrency` now renders correct symbol position for all 7 (e.g. `59 014.41 CHF`, `HK$594 206.95`).
- **Tests:** `/app/backend/tests/test_multi_currency_display.py` — 3/3 PASSED (rate coverage, price conversion tolerance ≤1%, stats endpoint for all 7 currencies).
- **Known limitation:** `CryptoTicker` component uses TradingView widget with hardcoded BTC/USD pairs; crypto is universally USD-quoted on public exchanges so this is acceptable.

## Tenant Branding: File Upload + Stripe on Admission (2026-04-21)
- **`BrandingImageUpload.jsx`** — novo componente reutilizável substitui inputs URL por upload de ficheiro. Aceita PNG/JPEG/SVG/WebP/ICO, preview inline com opção "Substituir" ou "Remover", fallback "colar URL" para casos legados. Max 2MB.
- **Backend upload** — nova categoria `branding` em `/app/backend/routes/uploads.py` com MIME types expandidos (`image/svg+xml`, `image/vnd.microsoft.icon`, `image/x-icon`). Testado via curl — upload PNG retorna URL `/api/uploads/file/branding/{filename}`.
- **`AdminTenants.jsx`** — Logo e Favicon agora usam `BrandingImageUpload` em vez de `Input`. Preview visual imediato após upload.
- **Stripe no Admission Fee onboarding** — integrado `StripeCheckoutButton paymentType="admission_fee"` na `OnboardingPage.jsx` step 1, como opção primária (dourado) acima do botão "Transferência Bancária" (outline). Backend já testado: cria sessão com amount €500 (tier standard) via `/api/stripe/create-checkout-session`.

## Stripe Checkout Integration — Card Payments (2026-04-21)
- **Three flows via Stripe Hosted Checkout** (zero PCI scope for KBEX):
  1. **Admission Fee** (one-time, tier-based, amount from `platform_settings.admission_fee`)
  2. **Annual Renewal** (yearly, tier-based, amount from `platform_settings.annual_fee`)
  3. **Fiat Deposit** (variable amount €50–€50,000 server-validated, credits `fiat_wallets`)
- **Backend:** `/app/backend/routes/stripe_payments.py` — uses `emergentintegrations.payments.stripe.checkout`. Endpoints:
  - `POST /api/stripe/create-checkout-session` (auth required; amount resolved server-side, never trusted from frontend)
  - `GET /api/stripe/checkout-status/{session_id}` (polling; applies business logic exactly once via atomic `processed` flag)
  - `POST /api/webhook/stripe` (signature-verified; fulfills same logic on webhook event as polling race-safe)
- **`payment_transactions` collection** — idempotent record of every session (session_id, user_id, amount, currency, payment_type, status, payment_status, processed, metadata). Atomic CAS on `processed` prevents double fulfillment even under polling+webhook race.
- **Multi-currency**: EUR, USD, AED, CHF, QAR, SAR, HKD (cliente paga na moeda selecionada no seletor global).
- **Frontend:**
  - `StripeCheckoutButton.jsx` — componente reutilizável, 3 flows via prop `paymentType`.
  - `PaymentSuccess.jsx` em `/payment/return` — polling com 10 tentativas × 3s, 5 estados (polling/success/timeout/expired/cancelled/error).
  - `AnnualFeeBanner.jsx` — botão "Pagar com Cartão" visível quando isPending/isSuspended/isOverdue.
- **Key em uso:** `STRIPE_API_KEY=sk_test_emergent` (sandbox Emergent). Para produção, substituir por key live do cliente.
- **Validação E2E:** curl cria sessão EUR €500 para tier standard, retorna URL Stripe válida; polling retorna status `unpaid→paid`; validação deposit rejeita valores fora do intervalo.

## Zero-Downtime Deploy Fix (2026-04-21)
- **Bug:** `zero_downtime_deploy.sh` was rebuilding images but NOT recreating containers when compose config hadn't changed. Symptom: `docker compose ps` showed IMAGE column as bare SHA instead of `boutiquev1-frontend:latest`, meaning containers ran outdated images silently.
- **Fix:** Added `--force-recreate` to `docker compose up -d --no-deps {backend,frontend}` calls. Added post-deploy sanity check that auto-retries if frontend container age > 5 min.
- **Immediate VPS unblock:** `sudo docker compose up -d --no-deps --force-recreate frontend`.

## Billing Auto-Renewal Cycle Validation (2026-04-21)
- **Background cycle infrastructure** (`_cycle_loop` in `billing.py`) runs daily (86400s); startup log confirms it's running in preview + production.
- **Dry-run mode added** to `_run_renewal_cycle(dry_run=bool)`: same candidate inspection, ZERO writes (no `admission_payments` inserts, no user suspensions, no notifications, no Brevo emails). Returns `{created_payments, notified_clients, suspended, flagged_overdue, dry_run: true}` so admins can preview safely in production.
- **New endpoint** `POST /api/billing/run-cycle?dry_run=true` — admin-only; returns `{success, dry_run, result, duration_ms, timestamp}`. Tracked separately from real runs so `last_run_at` always reflects production data.
- **New endpoint** `GET /api/billing/cycle-history` — returns last 30 runs (manual + scheduled) with `{run_at, duration_ms, trigger, dry_run, result, error, admin_email}`. Useful for audit + troubleshooting.
- **Admin UI in `AdminBillingPage.jsx`:** new "Simular (Dry-Run)" button (sky-blue) next to "Correr Ciclo Agora" (gold). New collapsible "Histórico de Execuções" panel with sortable table showing last 30 runs (AUTO/MANUAL badge + DRY-RUN/real pill + counters + duration + error/admin audit trail).
- **Tests:** `/app/backend/tests/test_billing_cycle_validation.py` — 5/5 PASSED. Covers: cycle running on startup, dry-run shape, dry-run ZERO writes (seeded eligible user → detected but NOT inserted), history growth, status metadata.

## Supported Fiat (Client-visible)
EUR, USD, AED, CHF, QAR, SAR, HKD

## Web — Privacy Policy + Terms & Conditions Pages (2026-05-02)
- **New public legal pages** (5 languages cada: PT/EN/AR/FR/ES):
  - `/legal/privacy` (+ alias `/privacy`) — `PrivacyPolicyPage.jsx`: 8 secções cobrindo GDPR/UK-GDPR/UAE-PDPL/LGPD — dados recolhidos, finalidades & base legal (art. 6(1)(a-f)), partilha com processadores qualificados (white-label, sem nomes de vendors), transferências internacionais (SCC+TIA), retenção AML (5-7 anos), direitos do titular, segurança (TLS 1.3 / AES-256), contacto DPO (dpo@kbex.io).
  - `/legal/terms` (+ alias `/terms`) — `TermsPage.jsx`: 10 secções — descrição de serviços (Exchange/OTC/Custody/Fiat/Staking/Launchpad), elegibilidade (sanções/PEPs), KYC/KYB, aviso de risco, usos proibidos, comissões, suspensão, limitação de responsabilidade, lei aplicável (UAE DIFC/ADGM + Suíça Zurique, com 60d de mediação), modificações.
- Ambas com cross-links para a outra página + para `/legal/cookies`, back-link para home, RTL-aware, 100% compatíveis com o tema "quiet luxury" dourado da plataforma.
- Rotas registadas em `App.js` (com alias `/privacy` e `/terms` → redirect 302 para `/legal/*`).
- **Footer atualizado**: substituído `to: '#'` por links reais para **Termos & Condições** e **Privacidade**; mantido link já existente para Cookie Policy. Chaves i18n `footer.legal` (reutilizada com novo valor "Termos & Condições") + nova `footer.privacy` ("Privacidade" etc.) injetadas em 5 locales.
- **Smoke test**: `GET /legal/privacy`, `/privacy`, `/legal/terms`, `/terms`, `/legal/cookies` todos HTTP 200; screenshot renderizou 10 secções da Terms page com cross-links corretos; lint `ruff`/`eslint` limpo.

## Mobile App — Push Deep-Linking (2026-04-30)
- **New `routeFromNotificationData(data)` helper** in `/app/mobile/src/hooks/usePushNotifications.ts`:
  - `type=price_alert` → `/alerts`
  - `type=otc_chat` → `/otc/{deal_id}` (falls back to the OTC tab if `deal_id` missing)
  - `type=order_filled` → `/transactions`
  - `type=withdrawal_approved` / `type=withdrawal_rejected` → `/transactions`
- **Handles both warm and cold start**:
  - Warm: `addNotificationResponseReceivedListener` routes when user taps a banner while the app is already running.
  - Cold: `getLastNotificationResponseAsync()` (with 300ms grace) routes when the user launches the app by tapping the notification from a fully-closed state.
- Uses `router` from `expo-router` directly (no hook needed; safe to call outside components).
- Safe fallback: unknown `type` is ignored silently; routing errors are logged as warnings so the notification never crashes the app.

## Mobile App — Phase M3.5 Real-time Push on Order / Withdrawal Events (2026-04-30)
- **Shared helper `/app/backend/utils/push.py`** — `send_push_to_user(db, user_id, title, body, data)` fans out to all active Expo push tokens for a user; best-effort (never raises), consolidates the previous ad-hoc push logic from `price_alerts` and `otc_chat`.
- **Hooks added** in `routes/trading.py` and `routes/crypto_wallets.py`:
  - ✅ **Crypto withdrawal approved** → push "Levantamento aprovado — X BTC a caminho de 1A2B…7Z8Y" with Fireblocks TX id.
  - ✅ **Crypto withdrawal rejected** → push "Levantamento recusado — {admin_note}".
  - ✅ **Bank transfer approved** (buy order filled via SEPA) → push "Ordem compra concluída — X BTC a €Y na sua carteira".
  - ✅ **Stripe checkout paid** (buy order filled via card) → push "Compra concluída via cartão — X BTC creditado na sua carteira".
- Each payload carries `type` (`withdrawal_approved` / `withdrawal_rejected` / `order_filled`) + `order_id` or `withdrawal_id`, enabling future deep-links from the notification to the specific screen (History / Order detail).
- All failures are caught + logged as `warning` — push is never allowed to break the business flow.
- **Verified**: manual `POST /api/price-alerts/run-once` triggers the shared helper path (reused by the new helper's identical signature) — alert's push to the test Expo token succeeded with `triggered: 1`.

## Mobile App — Crypto Withdrawal Flow (2026-04-30)
- New mobile screen `app/withdraw.tsx` — 3-step flow:
  1. **Pick** the asset/network (same 9 options as Deposit screen).
  2. **Form** — destination address (monospace, multiline), amount input with **MAX** shortcut, live EUR equivalent (using `useWallets` prices), red border + error when amount > available balance, optional internal note.
  3. **Review** — summary card (asset · amount · EUR equiv · destination · note), amber warning ("compliance approval required, on-chain transfers irreversible"), green "you'll be notified" hint, Confirm + Edit buttons.
- **Reuses backend** `POST /api/crypto-wallets/withdraw` (already existed). Returns `withdrawal_id` after success → modal alert + auto-back to Wallet + refresh.
- Wallet "Levantar" Quick Action now routes here.
- i18n: 23 keys `withdraw.*` in PT/EN/AR/FR/ES.
- E2E verified: `GET /api/crypto-wallets/withdrawals` returns existing pending records correctly.

## Mobile App — Crypto Deposit Screen with QR Codes (2026-04-30)
- New mobile screen `app/deposit.tsx` — 2-step flow:
  1. Asset picker (9 networks: BTC, ETH, USDT-ERC20/Polygon/Tron, USDC, SOL, XRP, MATIC) with logos + human-readable network labels.
  2. Address panel: 220×220 QR code (white card with gold border), monospace address text, **Copy** (gold pill, turns green on success) + **Share** buttons. Live amber "Atenção" warning specifying which asset+network to send.
- **Reuses existing backend** `GET /api/crypto-wallets/deposit-address/{asset}` (Fireblocks-backed). Auto-initializes vault on first call if response says "not initialized".
- Wallet "Depositar" Quick Action now routes to this screen.
- Dependencies installed: `react-native-qrcode-svg@6.3.21`, `expo-clipboard`.
- i18n: 13 keys `deposit.*` in PT/EN/AR/FR/ES.
- E2E verified: `GET /api/crypto-wallets/deposit-address/BTC` returns real Fireblocks address `bc1q557tfugsr30v0j4q2eh9x8uaschq2drcuvqgnn`.

## Mobile App — Phase M4.2 OTC Chat + M4.3 KYC WebView (2026-04-30)

### M4.2 OTC Chat
- **Backend `/api/otc-chat/*`** — new `routes/otc_chat.py`:
  - `GET /deals` — list of deals visible to caller (desk sees all in `otc_deals` + `demo_otc_deals`; client sees only deals owned via `client_user_id`/`created_by`/`client_id` mapping). Each row carries `last_message_preview` + `unread_count`.
  - `GET /deals/{id}/messages` — chronological message list (caller marker `is_self`).
  - `POST /deals/{id}/messages` — sends a message and pushes Expo notification to the other party (`account_manager_id` for desk, `client_user_id`/`created_by` for client).
  - `POST /deals/{id}/messages/read` — bulk mark unread inbound messages as read.
  - Permission gate `_check_can_access_deal` enforces tenant-aware client/desk separation.
- **Mobile**:
  - `app/(tabs)/otc.tsx` redesigned — list of deals with last message + unread badge + relative time (replaces "Coming in M4" placeholder).
  - `app/otc/[dealId].tsx` — chat screen with FlatList, date separators, gold/surface message bubbles, `KeyboardAvoidingView`, composer with circular Send button. Polls every 7s + auto-marks as read on open.
- **Push integration**: reuses the `push_tokens` collection from M4.1; messages from desk → push to client device, and vice-versa.

### M4.3 KYC com Câmara
- **Reuses existing `POST /api/sumsub/generate-link`** (Sumsub WebSDK link, 1h TTL, Portuguese locale).
- **Mobile**:
  - `app/kyc.tsx` — hero screen with 3-step explainer + status badge (Approved/Pending) read from `/api/sumsub/status`. Calls `generate-link` and opens the URL inside `react-native-webview` with `allowsInlineMediaPlayback` + camera permissions. "Concluído" returns to caller and prompts user that team will review.
  - Profile screen — new "Verificação de Identidade" card with shield icon + CTA → routes to `/kyc`.
- **Dependency**: `react-native-webview@13.15.0` (Expo SDK 54 compatible, installed via `npx expo install`).

### i18n
- New namespaces `otcChat.*` (8 keys) + `kyc.*` mobile flat keys (11 keys: title, heroTitle/Subtitle, step1-3, start, finishedTitle/Msg, statusApproved/Pending) merged into existing `kyc:` block.
- New `profile.identityVerification` + `profile.identityVerificationDesc` injected into the active `profile:` block (handled duplicate-block edge case where 4/5 locales had two `profile:` definitions).

### E2E verified (curl)
- Admin lists 3 demo deals via `/otc-chat/deals` → sends message → receives back with `is_self: true` → list returns the message → mark-read returns `marked_read: 0` (already marked since sender = self).

## Mobile App — Portfolio (Wallet) Redesign + Alert Sheet Keyboard Fix (2026-04-30)
- **Portfolio screen completely redesigned** (`app/(tabs)/portfolio.tsx`) with Revolut-style hierarchy:
  - Hero "Total Balance" gold display (38pt thin) with **fiat + crypto valued in EUR** (live KBEX-spread mid prices via `/api/trading/cryptos`).
  - **Quick Actions row**: 4 circular gold buttons (Depositar / Levantar / Comprar / Histórico).
  - **Hide-zero toggle** (eye icon) — defaults to ON to keep the dashboard clean; user can opt-in to see zero balances.
  - **Fiat section**: flag emoji + currency code + bank name + balance (one-card grouped list).
  - **Crypto section**: real CoinMarketCap logo per asset + display name + EUR value + native amount + chevron deep-link to market detail. Network suffixes (USDT_POLYGON, ETH-AETH, USDT_ARB, USDT_BSC, MATIC_POLYGON) stripped from display and rendered as small "Polygon"/"Arbitrum"/"BSC" badges.
  - Empty states for "all zeros hidden" and "truly empty wallet".
- **Tab label fix**: tab title for Wallet now uses new `nav.wallet` key (previously raw `dashboard.portfolio` was rendered both as tab label AND screen header). `headerShown: false` on the Wallet tab — the screen has its own custom header.
- **`useWallets` hook** extended: now fetches markets in parallel and exposes `prices` map + EUR-denominated `totalEur` covering both fiat and crypto.
- **Alert Sheet UX fix** (`CreateAlertSheet.tsx`): wrapped modal in `KeyboardAvoidingView` + `ScrollView` with `keyboardShouldPersistTaps`. Tapping the dimmed backdrop now closes the sheet.
- **i18n**: new `wallet.*` namespace (12 keys) + `nav.wallet` injected into all 5 locales (PT/EN/AR/FR/ES).

## Mobile App — Phase M4.1 Price Alerts (2026-04-30)
- **Backend `/api/price-alerts`** — full CRUD (`POST/GET/DELETE` + `POST /:id/toggle`) backed by new `price_alerts` collection. Per-user soft cap of 50 active alerts.
- **Background worker** `_alert_loop` runs every `PRICE_ALERT_INTERVAL_S` (default 60s). For every active alert: fetches current price via `/api/trading/cryptos` (same KBEX-spread pricing the user sees in the Markets tab), atomically flips `is_active=false` + records `triggered_at` / `triggered_price` if threshold crossed, then fans out an Expo Push notification (`exp.host/--/api/v2/push/send`) to all active tokens for that user.
- **Admin debug endpoint** `POST /api/price-alerts/run-once` — triggers a single evaluation pass. E2E verified: BTC alert `above 1 EUR` → `triggered=1` after one pass with `triggered_price=65 375.72`; BTC `below 1 EUR` correctly stayed dormant.
- **Mobile login** — substituted text "KBEX" by the real `kbex-logo.png` (220x64 contain) at the top of `/app/mobile/app/(auth)/login.tsx`.
- **Mobile UI**: new screen `/app/mobile/app/alerts.tsx` (lists active + triggered with deltas, swipe-to-delete via Trash icon, gold-bordered cards). New `CreateAlertSheet` modal launched from market detail's gold "Definir Alerta" button — pill toggle Above/Below + target input + live %-from-current diff + creates the alert in one tap. Bell icon next to Markets search bar opens the alerts list.
- **i18n**: full `alerts.*` namespace (15 keys) added to all 5 locales (PT/EN/AR/FR/ES).
- **Logs verified at startup**: `Price-alert worker started (interval=60s)` alongside Revolut + Billing cycles.

## Mobile App — Phase M3 Trading Terminal Bug Fixes (2026-04-30)
- **Root cause of M3 i18n bugs:** All 5 locale files had **two** top-level `markets:` blocks. ES module evaluation kept the second one (web namespace) and silently discarded the mobile-only keys defined at the top of the file. Symptom: `t('markets.currentPrice')` → `undefined`, button labels rendered the raw key path, etc.
- **Fix:** Merged the mobile keys (`searchPh`, `empty`, `currentPrice`, `buyPrice`, `sellPrice`, `spread`, `buy`, `sell`, `simulated_trend`, `note_quote`) into the single surviving `markets:` block in each of `pt.js`, `en.js`, `ar.js`, `fr.js`, `es.js`. Removed the top duplicate block. Verified at runtime — every locale now exposes 26 keys under `markets.*`.
- **Mobile UI fix in `app/(tabs)/markets.tsx`:**
  - Avatar now renders the asset `logo` (CoinMarketCap PNG) inside the gold-bordered circle; falls back to first 3 letters when missing.
  - Trend percentage now reads `change_24h_pct ?? change_24h` (backend returns `change_24h` as the % delta).
- **Backend `POST /api/auth/push-token` + `DELETE /api/auth/push-token`:** new endpoints in `routes/auth.py`. Stores Expo push tokens in dedicated `push_tokens` collection (`{user_id, token, platform, active, created_at, last_seen_at}`). Validates token format (`ExponentPushToken[...]`/`ExpoPushToken[...]`), supports multi-device per user, and reassigns ownership when the same token shows up under a different user (shared device). DELETE soft-deactivates rather than removing, preserving audit trail. E2E tested: invalid format → 400, unauth → 401, valid register → 200 idempotent, delete → marks `active=false` + `deactivated_at`.

## Pending
- P1: Safari cursor bug (18+ recurrences)
- P1: Mobile Phase M4 (OTC chat + KYC with camera + price alerts)
- P2: White-Label Tenants Phase 3 — tenant-specific tiers/fees, BYO Sumsub, BYO fiat IBAN
- P2: LATAM local fiat rails (PIX for Brazil, SPEI for Mexico)
- P2: Replace Crypto ATM mock data with live feeds

## VPS Deployment
- `cd /opt/boutiqueV1 && sudo ./scripts/zero_downtime_deploy.sh` (now uses `--force-recreate` internally)

## Credentials
- Admin: carlos@kbex.io / senha123
