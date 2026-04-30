# KBEX.io - Changelog

## 2026-04-30 - Phases 3+4: Tier-2 & Tier-3 Modal Titles Translated (~29 files)
**Goal:** Extend i18n to all staff (CRM / OTC / Risk) and admin modals. Due to volume, scope is limited to `DialogTitle` + `DialogDescription` + primary action buttons. Body form field labels remain in PT (Phase 5+).

**New namespaces**
- `commonModal` — shared actions (cancel/save/delete/confirm/close/loading/search/edit/submit/name/email/phone/status/type/date/amount/notes/description/actions/copied/genericError…) across all 5 languages.
- `tier23Modals` — 26 modal-specific sub-objects (otcExec, otcInvoice, otcSettle, otcClient, otcQuote, crmDeal, crmTask, crmClient, crmContact, crmLead, crmSupplier, kyt, kyc, adminMenus, adminRevolut, adminKb, adminUsers, adminTenants, adminBilling, adminCompany, adminClients, adminPerms, adminOpps, adminBankAccounts, adminAdmission, balanceAdj, schedMeeting) plus 6 root-level keys (clientDetails, approveBank, approveBankConfirm, transferToken, addSignatory, verifDetail).

**Files translated (29 modals):**
- CRM (6): CRMDeals, CRMTasks, CRMClients, CRMContacts, CRMLeads, CRMSuppliers
- OTC (5): OTCExecution, OTCInvoices, OTCSettlement, OTCClients, OTCQuotes
- Risk (2): KYCVerificationsPage, KYTForensicPage
- Admin (14): AdminClientMenus, AdminRevolutPage, AdminKnowledgeBase, AdminUsers, AdminTenants, AdminBillingPage, AdminCompanyAccounts, AdminClients, AdminPermissions, AdminOpportunities, AdminBankAccounts, AdminAdmissionFees, BalanceAdjustmentsPage, TokenManagementPage
- Other (2): VaultSignatories, ScheduleMeetingDialog

**Tooling:** Two Python scripts (`/tmp/translate_tier23_titles.py` and `/tmp/translate_tier23_round2.py`) automated: adding `useLanguage` import, inserting the `const { t } = useLanguage();` hook after the auth hook in each component, and surgical replacement of hardcoded titles via `search_replace`.

**Validation (iteration_57)**
- All 45 unique `t('tier23Modals.*')` keys used in code resolve to strings in all 5 locales (EN/PT/AR/FR/ES). Zero missing keys, zero `[object Object]` leaks, zero raw-key leaks.
- Live login + dashboard smoke: PT/EN/AR rendered without raw keys.
- ESLint clean (only pre-existing `react-hooks/exhaustive-deps` warnings on the page data-fetch hooks — not introduced by these changes).

**Known scope limitations**
- Body form field labels (placeholders like "Nome do comprador", "Telefone", "Montante", etc.) inside these modals remain hardcoded in PT — deliberately deferred to keep the scope of this round tractable.
- `es.js` is ~700 lines shorter than the other locales (1245 vs ≈1950). Flagged by testing agent — pre-existing gap in ES (unrelated footer/marketing sections missing). Not blocking; to audit in Phase 5.


**Goal:** None of the modals were translated. After the locale split, translate all client-facing modals across the 5 supported languages (PT, EN, AR, FR, ES).

**Modals translated (Tier 1 — 6 modals + 9 dialogs):**
- `BillingCheckoutDialog` — generic checkout for annual/upgrade/admission payments. New namespace `billingCheckout`.
- `CreateEscrowModal` — 4-step escrow wizard (Type & Assets / Counterparties / Fees / Review). Namespace `escrowModal`.
- `BankAccountsPage` — Add Bank Account dialog (15+ fields) and Delete Confirmation dialog. Namespace `bankAccountModals`.
- `CryptoTransactionsPage` — Transaction Details dialog (hash, destination, fees, signers, dates, explorer link). Namespace `cryptoTxModal`.
- `StakingPage` — 5-step Stake Wizard + Unstake confirmation modal. Namespace `stakingModals`.
- `TokenizationPage` — 4 dialogs (Create Collection / Issue Token / Mint / Burn). Namespace `tokenizationModals`.

**Pre-existing bug fixed:**
- AR locale was missing `nav` and `auth` top-level keys (visible as `nav.login`, `auth.signIn` in the Arabic UI). Added all 13 nav keys + 21 auth keys with proper Arabic translations.

**Bug found and fixed during testing (iteration_56):**
- `en.js` was missing 7 footer keys (`custody`, `exchange`, `launchpad`, `atmNetwork`, `helpCenter`, `support`, `contactUs`) — added by testing agent. All 5 locales now have 20 identical footer keys.

**Validation**
- Testing agent (iteration_56) confirmed no raw i18n keys leaking on homepage or any tested modal across all 5 languages.
- Verified end-to-end: BankAccount Add modal + CreateEscrow wizard step 1 + CryptoTx details title rendered correctly in EN/PT/AR/FR/ES.
- AR `dir=rtl` correctly applied; language preference persisted in localStorage.
- Locale files complete for Staking & Tokenization modals; smoke-tested via key existence.

**Out of scope (NOT introduced — pre-existing PT-hardcoded strings):**
- `CryptoTransactionsPage` page-level header title/subtitle is hardcoded in PT (only the modal was in scope).


**Goal:** The monolithic `frontend/src/i18n/translations.js` reached 8.142 lines, mixing 5 languages, making maintenance painful and modal translation work risky.

**Changes**
- Split `translations.js` into 5 locale files under `frontend/src/i18n/locales/`:
  - `en.js` (1.902 lines), `pt.js` (1.908), `ar.js` (1.674), `fr.js` (1.687), `es.js` (980).
- New `translations.js` now a 13-line aggregator that imports each locale and exposes `{ EN, PT, AR, FR, ES }` (zero behavior change for `useLanguage()`).
- Public API (`t()`, `language`, `changeLanguage`, `isRTL`) is unchanged — no consumer code touched.

**Validation**
- Programmatic `JSON.stringify` equality check on all 5 languages → byte-identical to the pre-refactor object.
- Frontend webpack recompiled successfully, no new warnings.
- Smoke screenshots: PT/EN/AR homepage render correctly, language switcher works, RTL preserved on AR.

**Pre-existing issue surfaced (NOT introduced):** AR is missing top-level `nav` and `auth` keys (visible in mobile nav fallback as `nav.login` / `nav.requestAccess`). To be addressed in Phase 2.

**Next**
- Phase 2: translate the 42 modals/dialogs that currently have hardcoded Portuguese strings (Tier 1: HNW client-facing first).


## 2026-02-29 - Unified 3-Option Payment Picker (Phase 2)
**Goal:** Extend the elegant 3-card payment selector (Saldo Fiat EUR / Cripto-Transferência / Cartão Stripe) — already in production for Tier Upgrades — to also cover Admission Fee (onboarding) and Annual Renewal flows.

**Backend**
- New `POST /api/billing/payments/{payment_id}/pay-with-fiat` (generic). Handles all fee types (`admission`/`annual`/`upgrade`):
  - Validates ownership + payment status.
  - Atomically debits EUR fiat wallet (find_one_and_update with $gte guard).
  - For upgrade: applies new tier. For admission/annual: stamps `annual_fee_*`, `admission_fee_*`, `billing_status=active`, unsuspends.
  - Triggers referrer commission. Audit trail in `fiat_deposits`.
- Old `POST /api/billing/upgrade/{payment_id}/pay-with-fiat` retained.

**Frontend**
- New generic `PaymentMethodPicker.jsx` accepting `feeType` prop.
- Old `UpgradePaymentMethodPicker.jsx` is now a shim wrapping the generic picker.
- `BillingCheckoutDialog.jsx` defaults to picker stage; "Voltar aos métodos" button reveals detailed crypto/bank flow.
- `OnboardingPage.jsx` admission step now opens unified picker dialog via single "Pagar Taxa de Admissão" button.

**Bug fixed during testing**
- `PaymentMethodPicker` was calling `/api/fiat-wallets/` (does not exist). Corrected to `/api/trading/fiat/balances`. Same bug existed in old upgrade picker — fix propagates.

**Testing:** Backend 24/25 passed (1 skipped). All testids verified.

## 2026-04-21 - White-Label Tenants (Phase 1: Branding)
- **Backend:** new `/app/backend/routes/tenants.py` with `GET /api/tenants/resolve` (public, called by frontend on boot) + admin CRUD (`GET/POST/PUT/DELETE /api/tenants/*`).
- **Model:** `tenants` collection with `slug` / `domains[]` / `branding` / `email` / `supported_fiat` / `is_default` / `is_active`.
- **Default tenant** (`slug: kbex`) auto-seeded on first access; cannot be deleted/deactivated.
- **Frontend:** `TenantProvider` wraps the whole app; fetches tenant branding on boot from Host header; applies CSS variables (`--tenant-primary`, `--tenant-accent`) + `document.title` + favicon dynamically.
- **Admin UI:** `/dashboard/admin/tenants` — full CRUD with dialog (slug, domains, platform name, tagline, logo/favicon URLs, primary/accent colors via color picker, sender email, supported fiat).
- **Nginx:** changed `server_name kbex.io www.kbex.io` → `server_name _; default_server;` so any tenant domain resolves to the same backend.
- **Docs:** `/app/docs/TENANTS.md` onboarding guide (DNS, SSL via certbot `--expand`, tenant creation flow).

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
