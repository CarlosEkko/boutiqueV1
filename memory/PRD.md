# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals. Core features include Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, Multi-signature Vaults, automated KYC via Sumsub, and Fireblocks integration.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, React Context
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Integrations: Sumsub WebSDK, Trustfull, Brevo, Fireblocks
- Infrastructure: Docker on VPS, Cloudflare WAF

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury", trust, and exclusivity in UI/UX
- Comprehensive OTC CRM with strict qualification workflows
- Invite-only registration (no public sign-up)

## What's Implemented
- Multi-currency viewing with real-time crypto prices (1s HTTP polling)
- Fiat deposits and wallet management
- Complete OTC CRM: Leads, Clients, Pipeline (11-stage workflow)
- Multi-step lead creation wizard (Verification → Pre-Qualification → Setup)
- Brevo email integration for onboarding
- Sumsub KYC integration (with Cloudflare WAF bypass)
- Trustfull risk intelligence scanning
- Role-based access control with dynamic admin menus
- Global date/number formatting (dd/mm/yyyy, space separators)
- 5-language support (EN, PT, AR, FR, ES) with full OTC translations
- Invite-only registration gate (/register requires ?email= parameter)
- "Solicitar Acesso" creates both CRM + OTC leads simultaneously

## Key API Endpoints
- POST /api/crm/leads/public (Public lead creation - creates CRM + OTC leads)
- POST /api/otc/leads (Authenticated OTC lead creation)
- PUT /api/otc/leads/{id}/stage (Advance lead through workflow)
- GET /api/otc/check-existing (Entity combobox search)
- POST /api/sumsub/applicants (KYC - merged token generation)

## Database Collections
- users, crm_leads, otc_leads, permissions, otc_deals

## Credentials
- Admin: carlos@kryptobox.io / senha123
- Test Client: joao.mirror999@test.com / senha123

## Cloudflare WAF Warning
Production domain is fronted by Cloudflare. POST requests with "access-token" or "sdk-init" in URL are blocked (403). Do NOT create routes with these keywords.

## Deployment
User deploys manually: git pull → sudo docker-compose up --build -d
