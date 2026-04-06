# KBEX.io - Changelog

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
