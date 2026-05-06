# KBEX.io - Changelog

## 2026-05-06 — Institutional OTC Desk (Fase 2 — Frontend ↔ Backend Wired)

### What changed
Swapped the client-side mock engine out for a real backend-driven hook so the cockpit now renders **live** desk state.

### New file
- **`frontend/src/pages/dashboard/trading-desk/useOTCDeskBackend.js`** — drop-in replacement for `useOTCDeskEngine`:
  - Polls `GET /api/otc-desk/state` every 2 s (market + inventory + PnL + hedge feed + config)
  - Polls `GET /api/otc-desk/pnl-series` every 10 s (equity curve)
  - `getQuote()` → `POST /api/otc-desk/rfq` (returns pending stub + async sets `activeQuote` once server responds)
  - `executeQuote()` → `POST /api/otc-desk/execute` (async; emits success toast + schedules post-hedge refresh at 700 ms / 1.4 s)
  - `cancelQuote()` / `resetDesk()` wired to the respective endpoints
  - Normalises snake_case backend payloads (`spread_bps`, `expires_ms`, `slippage_bps`…) to the camelCase shape the existing components consume — zero edits required in MarketPanel / RFQPanel / RiskPanel / EquityCurve / HedgeFeed

### Wiring
- `InstitutionalDesk.jsx`: one-line import swap (`useOTCDeskBackend` in, `useOTCDeskEngine` kept as reference)
- Status banner updated to reflect the new reality: *"Live engine — market data streamed from our price oracle, pricing & risk computed server-side, and desk state persisted on every fill. Hedge execution currently runs in simulation mode"*
- `RFQPanel.handleExecute` is now async-safe; toasts are owned by the hook (backend flow) so UX stays consistent

### Verification (screenshot tool, full cycle)
- BTC / ETH / SOL / BNB / XRP pairs show real Binance mids (BTC $81,323.71 live)
- BUY 1 BTC → Execute → Cash PnL 417.42, Unrealized **0.00** after hedge (cost-basis invariant holds)
- SELL 1 BTC → Execute → "Trade filled — SELL 1 BTC @ 81,017.23 (spread capture 306.48 USDT)" toast
- Equity curve populated from `pnl-series`, hedge feed shows both legs (13.2 bps slippage)
- Lint clean

## 2026-05-06 — Institutional OTC Desk (Fase 1 — Backend Quant Engine)

### What shipped
Full backend counterpart to the mock JS engine. Mirrors the reference architecture from the client's *Documento Técnico – Crypto OTC Desk*. Ships as a module-level singleton with background market-data polling, deterministic pricing, cost-basis-based PnL and simulated hedging.

### New files
- **`backend/services/otc_desk_engine.py`** (singleton `OTCDeskEngine`):
  - **Market Data Engine** — background loop polling `GET https://api.binance.com/api/v3/ticker/price` every 2 s (no API key). Realised σ over last 60 log returns. Fallback random walk on network errors.
  - **Pricing Engine** — `spread = max(0, 25 bps + size/liquidity + vol×0.45 + |inventory|×inv_factor×skew_sign)`. Skew signs push sells in / buys out when desk is long, and vice-versa.
  - **Inventory Engine** — per-asset state for BTC/ETH/SOL/BNB/XRP.
  - **Hedge Engine** — simulated venue fill after 600 ms latency with bps slippage proportional to `size/liquidity`. Structured so a `VenueAdapter` can be swapped in (Binance / Fireblocks) in Fase 4.
  - **PnL Engine** — cost-basis invariant (`unrealized_pnl = qty × mid + cost_basis`). When inventory hits zero for an asset, residual `cost_basis` is moved to `cash_pnl` and the cost basis is reset — cleanly capturing spread + mid-drift + slippage in a single realised number.
  - **Persistence** — `otc_desk_state` (singleton upsert) + `otc_desk_trades` + `otc_desk_hedge_fills` + `otc_desk_pnl_snapshots`. Flushed every 10 s and on every execute. Hydrated on boot.
- **`backend/routes/otc_desk.py`** — REST layer with `_require_staff` dependency (admin OR global_manager OR `user_permissions.departments` containing `otc_desk`).

### Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/otc-desk/rfq` | staff | Firm quote, TTL 15 s |
| POST | `/api/otc-desk/execute` | staff | Hit quote, update inventory/PnL, trigger async hedge |
| GET | `/api/otc-desk/state` | staff | Full snapshot (market + inventory + PnL + hedges + config) |
| GET | `/api/otc-desk/pnl-series` | staff | Equity curve (300 samples, 2 s cadence) |
| POST | `/api/otc-desk/reset` | admin | Wipe inventory + PnL + equity curve + snapshots |

### Wiring
- `server.py`: imports, `set_otc_desk_db(db)`, `include_router`, startup hook `engine.start()`.

### Testing (iteration_57.json)
16 / 16 backend tests passed via the automated testing agent:
- Pricing formula components (base, size, vol, inventory skew) math verified
- Full execute + hedge cycle: inventory returns flat, `unrealized_pnl == 0`, `cash_pnl` matches `(firm_price − hedge_fill_price) × size` within slippage tolerance
- AuthZ: `sofia@kbex.io` (support agent, no `otc_desk` dept) receives 403 on all 5 endpoints; `carlos@kbex.io` (admin) passes
- Admin-only reset correctly refuses non-admin tokens
- Regression: `/api/otc/leads` + CRM OTC routes still serve correctly

### Swap plan (UI → backend) — one-line change
When ready to retire the client-side mock engine (`useOTCDeskEngine.js`), swap it for a thin hook that polls `GET /api/otc-desk/state` every 2 s and calls `POST /api/otc-desk/rfq` / `execute`. Component shapes already align (FirmQuote, HedgeFill, equity-curve points).

## 2026-05-06 — Institutional OTC Desk (Fase 3 — UI / Mock Engine)

### New area — `/dashboard/trading-desk/institutional`
Built the staff-facing Trading Cockpit described in the client's *Documento Técnico – Crypto OTC Desk (Arquitetura Profissional)*. Phase 3 ships the full UX with a client-side mock engine so the workflow can be validated before the backend quant service lands. The component API is intentionally aligned with the future `WS /api/ws/otc-desk` payload + `POST /api/otc-desk/{rfq,execute}` REST contracts, so swapping the engine in is a one-line change.

### Files
- **`useOTCDeskEngine.js`** — mock quant engine:
  - Market random-walk (500ms ticks) per asset, realised σ from last 60 log returns
  - Pricing formula: `spread = base(25 bps) + size/liquidity + vol × 0.45 + |inventory| × inv_factor` (inventory skew signed by side)
  - Firm quote with 15 s TTL + countdown
  - Execution: inventory delta, cash PnL (spread capture), simulated hedge after 600 ms latency with bps slippage proportional to `size/liquidity`
  - PnL decomposition: cash + unrealized (marked-to-market) + slippage cost, with a 2 s-cadence equity-curve series
- **`InstitutionalDesk.jsx`** — page composition (header + simulation banner + responsive 12-col grid)
- **`components/MarketPanel.jsx`** — live bid/mid/ask + realised σ grid, asset picker with trend arrows
- **`components/RFQPanel.jsx`** — Buy/Sell toggle, size input, firm-quote card with bps spread, countdown bar, Execute + Cancel
- **`components/RiskPanel.jsx`** — Total/Cash/Unrealized/Slippage tiles + per-asset inventory table (notional in USDT)
- **`components/EquityCurve.jsx`** — recharts gold gradient area chart with HH:MM X-axis
- **`components/HedgeFeed.jsx`** — last-50 venue fills with time / side / size / fill price / bps slippage

### Configuration
- Default universe: BTC / ETH / SOL / BNB / XRP vs USDT (multi-asset dynamic — admin-editable in Fase 4)
- Reset Desk button returns inventory + PnL + equity curve to zero (QA helper)

### Wiring
- `App.js`: lazy-imported `InstitutionalDesk` + route `/dashboard/trading-desk/institutional`
- `backend/models/permissions.py`: new item "Mesa Institucional" under `OTC_DESK` department (icon `Gauge`)
- Sidebar: `Gauge` icon added to lucide imports + iconMap + translation key (`sidebar.mesaInstitucional`) for PT/EN/ES/FR/AR

### Verification (smoke-test with screenshot tool)
- Logged in as `carlos@kbex.io` and opened the desk — Market Panel streams mid/bid/ask for all 5 pairs
- Clicked **Get Firm Quote** → 40.2 bps spread, 14.2 s countdown displayed
- Clicked **Execute Trade** → toast "Trade filled — BUY 1 BTC @ 65,148.72 (spread capture 200.93 USDT)", hedge leg appeared with 11.5 bps slippage
- Second trade on the sell side produced correct PnL decomposition (Total 197.53, Cash 518.55, Unrealized -173.46, Slippage -147.56) and the V-shape equity curve
- Lint: clean across `trading-desk/**`

### Roadmap for backend (Fase 1+2)
- `backend/services/otc_desk_engine.py` — port the JS pricing / hedge / PnL math (symmetric API)
- `backend/routes/otc_desk.py` — `POST /rfq`, `POST /execute`, `GET /state`, `WS /api/ws/otc-desk`
- Venue adapters: Binance (spot) first, Fireblocks (institutional custody) second
- Unified with CRM: every `/execute` emits an auditable deal record into `otc_deals` (stage=settled) for compliance

## 2026-05-06 — Onboarding Email: Quiet Luxury Tone + Spanish Support

### Changes
- **email_service.py**: Rewrote the `onboard_*` keys for **EN, FR, AR** to match the new "Quiet Luxury" tone applied earlier to PT (sourced from the user's `Onboarding PT.docx`). New subject "Private Clients Access – Next Steps" and structured body: greeting → eligibility statement → tier card → CTA "Complete Private Registration" → 4-step process (registration / KYC / compliance approval / private trading activation) → dedicated account manager closing line.
- **Spanish (ES) added** as a fully supported email language. New `EMAIL_STRINGS["es"]` block covers `access_*`, `onboard_*`, `team_*`, and `kyc_*` keys. `COUNTRY_LANG` now maps Spain + 19 LATAM Spanish-speaking countries (MX/AR/CO/CL/PE/VE/EC/BO/UY/PY/CR/PA/DO/GT/HN/NI/SV/CU/PR) to `es`. `NAME_TO_ISO` extended with the corresponding country names in EN/PT.
- **Team labels**: `onboard_team` now uses "OTC Desk" (EN/AR) and "Equipa/Equipo/Équipe OTC" elsewhere — institutional, vendor-agnostic.

### Verification
- Lint: clean (only pre-existing E731 lambda warnings).
- Python smoke-test: `_get_lang()` correctly resolves PT/EN/ES/FR/AR; `_t()` returns the new luxury strings; full `send_onboarding_email()` builds without exceptions for all 5 countries (PT/US/ES/FR/AE) — emails enter simulated mode when no Brevo key is configured.

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
