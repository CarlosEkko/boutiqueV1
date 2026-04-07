# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, React Context
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Integrations: Sumsub, Trustfull, Brevo, Fireblocks
- Infrastructure: Docker on VPS, Cloudflare WAF

## What's Implemented
- Multi-currency viewing with real-time crypto prices
- Fiat deposits/withdrawals, wallet management
- Complete OTC CRM (11-stage workflow)
- Invite-only registration gate
- Hierarchical access control (region-based)
- Region-based notification filtering
- 5-language support (EN, PT, AR, FR, ES)
- SecurityPage fully internationalized
- OTC lead conversion correctly inherits potential_tier -> membership_level
- Registration completion for auto-created users
- Translation key collision fix
- **Demo Mode** (completed 2026-04-07):
  - Full demo mode with rich mock data for sales pitches
  - Demo client Victoria Sterling: 8 wallets ($8M+ portfolio), 16 transactions
  - 7 crypto deposits + 5 crypto withdrawals with realistic data
  - 5 OTC leads + 3 OTC deals
  - 3 vault signatories + 4 vault transactions (multi-sign)
  - 3 bank deposits (fiat)
  - **Demo Profile Mock (2026-04-07)**: Profile page shows Victoria Sterling's mock identity (name, email, phone, address, DOB, country) to protect real user privacy during demos
  - **Demo Bank Accounts Mock (2026-04-07)**: Bank accounts page shows 4 mock accounts (UBS Switzerland, Barclays Private Bank, Julius Baer, JP Morgan Chase) with realistic IBANs and SWIFT codes
  - **Per-user demo permissions**: Admin can authorize users and control which 6 sections each sees (Portfolio, Crypto Ops, Fiat Ops, OTC, Vault, Transactions)
  - UI: Toggle in top bar, amber banner, section checkboxes in Admin Staff modal
  - Edit/Add/Delete actions disabled in demo mode to prevent accidental modifications
- KB access fix: Endpoints use `get_internal_user` for support staff
- Fiat deposit isolation: Admin bank transfers restricted to finance roles
- Auto-assign leads to creator
- `set-internal-role` endpoint for user promotion
- **OTC Desk Flow Verification (2026-04-12)**:
  - Verified full OTC deals pipeline is implemented: draft -> qualification -> compliance -> negotiation -> approved -> executing -> settled (auto-commission) -> closed
  - Added missing status translations for all 5 languages (active, completed, pending_settlement, pending_quote, quoted, accepted)
  - Backend: `otc_deals.py` with full deal CRUD, commission generation, compliance system
  - Frontend: `OTCDealsPage.jsx`, `CommissionsPage.jsx`, `CompliancePage.jsx` in CRM section
  - Fixed cache clearing: Editor fully resets (via `key` prop) when opening new article after editing
  - Enhanced RichTextEditor toolbar: Header picker (H1-H3), size, colors, lists, indent, align, blockquote, code, link, image, video
  - Comprehensive CSS for article rendering
  - Dark theme compatible with gold accent styling
  - CRM lead filtering by `invited_by`/`assigned_to` for non-admins
- TinyMCE Knowledge Base Editor (replaced react-quill)
- CSP and security headers in nginx.conf
- Cloudflare SSL configuration guidance

## Credentials
- Preview Admin: carlos@kbex.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Deployment
git pull -> sudo docker-compose up --build -d

## Pending Issues
- Dark / Light Mode Toggle (user requested) - P1
- Sidebar translation labels not fully mapped (Tokenizacao, Team Hub, Multi-Sign) - P2
- Safari cursor bug (recurring, P2)

## Upcoming Tasks
- P1: TradingView chart widgets on Trading/Markets pages
- P2: Refactor HTTP polling to WebSockets for crypto prices
- P2: Whitelist functionality
- P3: Product Pages (Launchpad, ICO)
- P3: Refactor OTCLeads.jsx (2300+ lines) and translations.js (6600+ lines)
