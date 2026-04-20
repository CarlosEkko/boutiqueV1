# KBEX.io - Changelog

## 2026-04-20 (v5) - Exchange UX Refinement
- **Hidden spread %** everywhere: removed `COMPRAR · +X%`, `VENDER · −X%`, `BTC · +X%` labels from price card, dropdown items and Converter tab. Only the absolute price (with spread already baked in) is shown, color-coded by side (emerald buy / red sell).
- **Transferência → Saldo Fiat:** Buy tab payment method replaced bank transfer option. New button shows user's current fiat balance inline.
- **New endpoints:** `GET /api/trading/fiat/balances` (all currencies) and `GET /api/trading/fiat/balance/{currency}` (single).
- **Sell tab redesigned** to match Buy layout: Criptomoeda selector + Montante with EUR/BTC toggle + fixed Destino card "Saldo Fiat · {currency}" with live balance + preview + red Vender button. `handleSell` now posts with `payment_method: 'fiat_balance'` and `destination_currency: currency` so sell proceeds auto-credit the user's fiat wallet.
- `calculateSellPreview` now accepts both fiat and crypto input modes (work-backwards from net target if in fiat mode).

## 2026-04-20 (v4) - KBEX Spread: Unified Pricing Architecture
- **Renamed:** "KBEX Rates" → "KBEX Spread" everywhere (sidebar, page title, subtitle).
- **5th product added:** `multisign` (Custódia Anual % por tier).
- **New backend service:** `/app/backend/services/pricing_service.py` with `apply_spread(base, product, tier, asset)` — central helper for all price endpoints.
- **New auth helper:** `get_optional_user_id` in `utils/auth.py` — lets endpoints serve both anonymous (→ standard tier) and authenticated (→ user tier) callers.
- **New endpoint:** `GET /api/kbex-rates/my-spreads` — returns all resolved spreads across 5 products for current user.
- **Price endpoints wired:**
  - `GET /api/trading/cryptos?product=exchange|spot` — now returns price_buy / price_sell / buy_spread_pct / sell_spread_pct per asset (tier from JWT or standard).
  - `GET /api/trading/markets?product=exchange|spot` — same.
  - `GET /api/trading/price/{symbol}?product=...` — same.
  - OTC Desk already used resolve_spread (unchanged).
- **Frontend — ExchangePage tab-aware display:**
  - Comprar tab: price_buy in emerald + `COMPRAR · +X%` label
  - Vender tab: price_sell in red + `VENDER · −X%` label
  - Converter tab: both sides shown with color coding + percent labels
  - Crypto dropdown items also reflect active tab (and swap `side` prop).
  - Mid price is completely hidden — user sees only the price they will actually pay/receive.
- **Trading page** now fetches `product=spot` → gets spot tier spreads.

## 2026-04-20 (v3) - Annual Fee Consolidation (Single Source of Truth)
- **Problem:** Annual tier fees were duplicated across 3 admin pages with divergent values:
  - `/dashboard/admin/kbex-rates` (kbex_settings.tier_fees)
  - `/dashboard/admin/settings` (platform_settings.admission_fee)
  - `/dashboard/admin/billing` (platform_settings.annual_fee)
- **Resolution:** Platform Configurations (AdminSettings) is now the canonical editor:
  - New card "Taxa Anual (Recorrente)" with badge ANUAL — saves via PUT /api/billing/annual-fee
  - Existing "Taxa de Admissão Anual" renamed → "Taxa de Admissão Inicial" with badge ONE-TIME
  - Grid expanded to 3 columns (Referral Fees + Admission + Annual)
- **Billing page:** tier amount inputs replaced with read-only summary + "Editar em Configurações" button. Cycle operational settings (grace/notify/suspend/is_active) remain editable in Billing.
- **KBEX Rates page:** "Fees Anuais por Tier" card completely removed; page now only manages spreads.
- **Backend:**
  - `get_tier_fees()` in kbex_rates.py now reads from platform_settings.annual_fee (converts _eur suffix)
  - PUT /api/kbex-rates/tier-fees removed (returns 404)
  - Old collection `kbex_settings.tier_fees` dropped
- **Tested (iteration 53): 27/27 backend tests passed.**

## 2026-04-20 (v2) - Renewals Health: Sparkline + Proactive Alerts
- Backend `/api/billing/renewals-health` extended with:
  - `monthly_revenue_12m` — array of 12 months with EUR totals (sparkline data)
  - `alerts[]` — proactive alerts with severity (critical/warning/info):
    - `renewal_rate_low` (renewal < 85% with ≥3 invoices)
    - `suspended_high` (≥3 suspended accounts)
    - `overdue_high` (≥3 overdue clients)
    - `pending_pipeline` (≥5 pending invoices)
- Frontend: emerald SVG sparkline inside "Cobrado 12m" tile; colored alert banners at top of RenewalsHealthPanel (red/amber/sky by severity).
- Verified with seeded data: critical + info alerts render correctly; sparkline shows real monthly distribution.

## 2026-04-20 (afternoon) - Renewals Health Dashboard
- Backend: new `GET /api/billing/renewals-health` — aggregates projected annual revenue, active clients by tier, 12m collected revenue (by fee_type), auto-approval rate via Fireblocks, payment method breakdown (crypto/bank/manual), renewal rate, and pipeline metrics.
- Frontend: added `RenewalsHealthPanel` inside `AdminBillingPage.jsx` (/dashboard/admin/billing) — 4 headline KPIs + tier distribution bars + payment method stacked bar with legend.
- Data verified live: €17,750 MRR projected, 100% renewal rate (1/1), 11 active clients (7 Standard, 3 VIP, 1 Premium).

## 2026-04-20 - Brevo Billing Emails Wired into Billing & Renewals
- Added 4 new transactional email templates in `services/email_service.py` (quiet-luxury gold/amber/red/emerald accents):
  - `send_billing_renewal_upcoming` — 30 days before annual fee due
  - `send_billing_overdue` — past grace period
  - `send_billing_suspended` — auto-suspension notice
  - `send_billing_payment_confirmed` — Fireblocks auto-approval receipt
- Wired emails into billing lifecycle:
  - `/api/billing/run-cycle` (daily renewal background job) → sends upcoming/overdue/suspended
  - `/api/billing/fireblocks-webhook` auto-approval → sends payment confirmed
  - `/api/billing/upgrade/{id}/approve` admin manual → sends upgrade confirmed
  - `/api/referrals/admission-fee/{id}/approve` admin manual → sends payment confirmed
- `_safe_send_email` wrapper ensures Brevo failures (or missing API key) NEVER break billing flow.
- **Tested: 27/27 backend tests passed (iteration_52).**

## 2026-04-05 - Translations & Invite-Only Registration
- Added Spanish (ES) as 5th language to the platform
- Added ES to LanguageSelector (dashboard) and Header (landing page) language lists
- Internationalized all OTC pages with t() function:
  - OTCLeads.jsx: All status badges, filters, buttons, dialog labels
  - LeadCard.jsx: Status labels, source labels, risk badges, button tooltips
  - CreateLeadDialog.jsx: Form labels, entity type labels, step names
  - OTCPipeline.jsx: Pipeline stage names, toast messages
  - OTCDashboard.jsx: Dashboard labels, volume labels, card titles
- Added comprehensive OTC translation keys to all 5 languages (EN, PT, AR, FR, ES)
- Added Tokenization sidebar translation keys for all languages
- Gated /register route: requires ?email= parameter, otherwise redirects to /#contact
- Removed SOURCE_LABELS hardcoded object from CreateLeadDialog (now uses t() function)

## Previous Sessions
- Sumsub KYC 403 fix (Cloudflare WAF bypass)
- Dynamic admin client menus (Suporte, Tokenização)
- Sidebar auto-expand fix
- OTC entity combobox dropdown
- Registration email link fixes
- Global date/number formatting standardization
- OTC 11-stage workflow implementation
- Brevo email integration
- OTC Leads card layout redesign
- Multi-step lead creation wizard
- Added Spanish (ES) as 5th language to the platform
- Added ES to LanguageSelector (dashboard) and Header (landing page) language lists
- Internationalized all OTC pages with t() function:
  - OTCLeads.jsx: All status badges, filters, buttons, dialog labels
  - LeadCard.jsx: Status labels, source labels, risk badges, button tooltips
  - CreateLeadDialog.jsx: Form labels, entity type labels, step names
  - OTCPipeline.jsx: Pipeline stage names, toast messages
  - OTCDashboard.jsx: Dashboard labels, volume labels, card titles
- Added comprehensive OTC translation keys to all 5 languages (EN, PT, AR, FR, ES)
- Added Tokenization sidebar translation keys for all languages
- Gated /register route: requires ?email= parameter, otherwise redirects to /#contact
- Removed SOURCE_LABELS hardcoded object from CreateLeadDialog (now uses t() function)

## Previous Sessions
- Sumsub KYC 403 fix (Cloudflare WAF bypass)
- Dynamic admin client menus (Suporte, Tokenização)
- Sidebar auto-expand fix
- OTC entity combobox dropdown
- Registration email link fixes
- Global date/number formatting standardization
- OTC 11-stage workflow implementation
- Brevo email integration
- OTC Leads card layout redesign
- Multi-step lead creation wizard
