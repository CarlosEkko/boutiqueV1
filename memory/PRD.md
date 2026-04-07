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
- Hierarchical access control (region-based: Admin/Global sees all, regional roles see their region)
- Region-based notification filtering
- 5-language support (EN, PT, AR, FR, ES)
- SecurityPage fully internationalized
- Change password endpoint fixed (accepts JSON body)
- Anti-phishing endpoint fixed (accepts JSON body)
- OTC lead conversion correctly inherits potential_tier → membership_level
- Registration completion for auto-created users (no duplicate error)
- Translation key collision fix (settlementPage, clientsPage, etc.)

## Key Bug Fixes This Session
- **Black screen on VPS**: Caused by duplicate translation keys (objects overwriting strings in translations.js). Fixed by renaming nested objects to *Page suffix.
- **Change password broken**: Backend expected query params but frontend sent JSON body. Fixed with Pydantic model.
- **Membership level always "standard"**: otc.py used wrong field path. Fixed to use `potential_tier`.
- **Email duplicate on registration**: Auto-created users from OTC leads can now complete registration.

## Credentials
- Preview Admin: carlos@kryptobox.io / senha123
- VPS Admin: carlos@kbex.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Deployment
git pull -> sudo docker-compose up --build -d
