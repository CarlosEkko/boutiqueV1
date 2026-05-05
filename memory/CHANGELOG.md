# KBEX.io - Changelog

## 2026-05-05 — Refactor i18n: 4 Dashboard Pages Translated

### Refactored Pages (PT/EN/AR/FR/ES)
- **InvestmentsPage.jsx** — Header, KPI cards (Avg ROI), tabs (Opportunities / My Investments), opportunity cards (risk badges, fixed/variable rate, ROI total, duration days, pool % filled, Invest Now), my investments cards (Amount Invested, Fixed/Variable Return, Maturity, Total Return), invest dialog (Available Balance, Amount to Invest, Min/Max, Expected Return, lock warning, Cancel/Confirm Investment).
- **ROIPage.jsx** — Completely rewritten using `t()` hooks. Header (Return on Investment / Track your investment performance), 4 KPI cards (Total Invested, Expected Returns, Realized Returns, Overall ROI), Investment Status panel (Active/Completed counts), ROI Comparison panel (Expected/Realized ROI bars), Investment Details table (Investment, Amount, Expected Return, ROI %, Status columns + status badges).
- **LaunchpadPage.jsx** — Header (Launchpad / Participate in exclusive token sales), tabs (Token Sales / My Subscriptions with counters), status badges (Upcoming/Active/Completed/Sold Out/Cancelled), sub status (Pending/Confirmed/Distributed/Refunded), sale cards (Price, Hard Cap, Supply, "Starts in"/"Ends in" countdown labels, Participate / Already Subscribed), subscribe modal (Token, Price per token, Min/Max allocation, Available, Token amount, Total to pay, Confirm Subscription).
- **StakingPage.jsx** — Header eyebrow ("Delegated Staking"), title, "New Stake" button, summary cards (Active Positions, Pending, Total Positions, Staked Assets), tabs (Positions/History), empty states (No staking positions / Click 'New Stake' to begin / No staking history), position actions (Claim, Unstake), error toasts (invalidAmount, compoundingRange, legacyMultiples, provError, stakeSuccess/Error, connError, etc.).
- **ColdWalletPage.jsx** — Sidebar (KBEX Vault, Connected/Disconnected, Accounts, Add all accounts), main panel (Dashboard/Activity tabs, Send/Receive buttons, Portfolio header, "Connect your Trezor" empty state, Trezor Bridge / USB Connected / PIN Set badges, "My Assets" / "Activate more assets", Recent Transactions / View all, "To:" address prefix), Activity tab (Transaction History title, transactions count, "No transactions found for", table headers Type/Amount/Destination/Status/TX ID, Saved Addresses), Receive Modal (Receive {coin} title, Address {coin} label, "Send only ... to this address" warning, Copy Address button), Sync messages and toast translations.

### i18n Architecture
- All new keys placed in `_extras.js` (deep-merged into 5 locales). 100% translation coverage validated by `node /app/scripts/i18n_audit.js`:
  - PT: 2470 keys, 100%
  - EN: 2469 keys, 100%
  - FR: 2462 keys, 100%
  - ES: 2474 keys, 100%
  - AR: 2474 keys, 100%
- Smoke-tested via screenshot tool: PT default + EN switched verified end-to-end on `/dashboard/investments`, `/dashboard/staking`, `/dashboard/launchpad`, `/dashboard/cold-wallet`.

### Earlier sessions (preserved)
- Mobile Stores Publishing Prep, i18n Audit Tool, PDF Viewer fix (HEAD method + CDN fallback), AdminUsers/CompliancePage/EscrowDealDetail refactors.
