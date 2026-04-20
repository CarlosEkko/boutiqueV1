# KBEX.io - Changelog

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
