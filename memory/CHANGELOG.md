# KBEX.io - Changelog

## 2026-05-06 — OTCDealModal: Quote Section Removed + Full i18n

### Changes
- **OTCDealModal.jsx**: Removed the entire "Parâmetros da Cotação" yellow section (Spread / Taxas / Validade inputs) per user request to unify quote-mode formulas with deal-mode. Quotes now save with default `spread_percent=0`, `fees=0`, `valid_for_minutes=60` so the calculation matches the deal-mode formula exactly.
- **Calculator pane**: Dropped the conditional "Preço Final" row (depended on spread). `Valor Total` now always uses `calc.total` (qty × adjusted price), regardless of mode.
- **i18n**: Translated remaining hardcoded strings — placeholder "Pesquisar cliente OTC…", calculator labels "Preço Ref.", "Bruto - Líquido", "Margem Corretores", "Receita KBEX". Added quote-specific keys (`otc.quotes.createTitle/subtitle/createdAndSent/sendQuote`) and modal extras (`otc.deals.modal.clientSearchPh/refPriceUnit/commissionFormula/brokerMarginCard/kbexRevenue`) into `_extras.js` for all 5 languages (PT/EN/FR/ES/AR).
- **Cleanup**: Removed unused `Send` lucide icon import. Calc memo simplified — no more `spreadAmt/finalPrice/totalWithSpread`.

### Verification
- Lint: clean.
- `node /app/scripts/i18n_audit.js`: 100% coverage across all 5 locales, 0 orphan keys.
- Smoke-test (screenshot, deal mode): "Criar Negociação OTC" modal opens, all labels translated, calculator renders correctly without "Preço Final" row.

## 2026-05-06 — Refactor i18n: 5 More Dashboard Pages (Approvals, Vault, Bank, Support)

### Refactored Pages (PT/EN/AR/FR/ES — 100% audit coverage)
- **ApprovalsPage.jsx** (`/dashboard/approvals`) — Multi-Sign Approvals: header & subtitle, pending badge (singular/plural), 5 filter tabs (All, Pending, Completed, Rejected, Cancelled), search placeholder, status badges (Approval in Progress / Risk Review / Signing / Sending / Successful / Rejected / Cancelled), "Send {asset}", "by {user}", "Expired" countdown.
- **VaultWallets.jsx** (`/dashboard/vault/wallets`) — Sidebar (VAULTS, Overview, "New Vault" hint), card "Active/Empty" badges, vault detail (Qualified Wallet label, Receive/Send buttons, Coins/Transactions tabs, Search coin, Hide 0 balances, table headers Coin / Total Balance / Available Balance / Actions, "Send/Receive" row buttons, empty states "No coins found" / "No transactions"), Create Vault modal (title, label, placeholder, "vaults used", Cancel/Create Vault).
- **VaultSignatories.jsx** (`/dashboard/vault/signatories`) — Header (Signatories, "Manage your authorized signatories and threshold settings", Add Signatory), Threshold Configuration card (Required Signatures, Timeout (hours), Save / Saving..., Threshold: X of Y), empty state ("No signatories configured" / "Add first signatory"), role labels (Admin/Signer/Viewer), Add Signatory dialog (Email/Name/Role labels & placeholders, Add button), all toasts (added/removed/saved/errors).
- **BankAccountsPage.jsx** (`/dashboard/bank-accounts`) — Header (Bank Details, subtitle, Refresh, Add Account), Important Information info card, Primary badge, status badges (Verified/Pending/Rejected), inline labels (IBAN:/SWIFT:/Account:), Set as Primary button, "Rejection reason:" prefix, empty state ("No Bank Accounts" / "Add First Account"), all toasts (load/add/remove/set-primary errors and successes).
- **SupportPage.jsx** (`/dashboard/support`) — Header (Support, subtitle, New Ticket), Knowledge Base quick link card, New Support Request modal (Subject/Category/Priority/Description with placeholders, category dropdown options General/Technical/Billing/KYC/Trading, priority dropdown Low/Medium/High/Urgent, Cancel/Create Ticket), tabs (Open(N) / Closed(N)), tickets list (Open Tickets / Closed Tickets card title, "messages" suffix, empty state, Create First Ticket), reply textarea placeholder, "Close ticket" tooltip, status badges (Open/In Progress/Awaiting Response/Resolved/Closed), priority badges, all toasts (created/sent/closed/errors).

### i18n Architecture
- ~150 new keys added under `approvalsPage.*`, `vaultWallets.*`, `vaultSignatories.*`, `bankAccountsPage.*`, `supportPage.*` namespaces, plus extending `common.loading`.
- All PT/EN/AR/FR/ES locales filled. Audit (`node /app/scripts/i18n_audit.js`) reports **100% coverage** across all 5 languages, **0 orphan keys**.

### Verification
- Lint: 0 issues across all 5 modified pages + `_extras.js`.
- Smoke-test via screenshot tool: All 5 pages render correctly when language is switched to EN. Status badges, modals, table headers, and toasts all use the `t()` lookup.

## 2026-05-05 — Refactor i18n: Investments / ROI / Launchpad / Staking / Cold Wallet
- (See above session for full list).

## Earlier
- Mobile Stores Publishing Prep, i18n Audit Tool, PDF Viewer fix (HEAD method + CDN fallback), AdminUsers/CompliancePage/EscrowDealDetail refactors.
