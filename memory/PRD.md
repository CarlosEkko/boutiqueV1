# KBEX.io - Product Requirements Document

## Overview
Premium Crypto Boutique Exchange for HNW/UHNW individuals. Features Exchange, OTC Desk, Fiat/Crypto Wallets, Onboarding, CRM, and automated KYC via Sumsub.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor)
- Deployment: Docker Compose + Nginx (Cloudflare Strict SSL)

## Core Requirements
- Fully translated platform (PT, EN, AR, FR, ES)
- "Quiet luxury" UI/UX with trust and exclusivity
- Comprehensive OTC CRM with strict qualification workflows
- Demo Mode toggle for authorized users
- Dark/Light mode toggle (Dashboard only; Landing/Auth stay Dark)

## Completed Features
- Multi-currency wallets (EUR, USD, AED, BRL) with fiat deposits
- OTC CRM: 11-step workflow (Creation → Post-Sale)
- Brevo email integration for onboarding
- Sumsub KYC/KYB integration (Safari fallback for ITP)
- Trustfull Risk Intelligence (email + phone scoring)
- Base64 JSON uploads (bypasses Cloudflare WAF)
- Custom Nginx maintenance page (502/503)
- "Solicitar Acesso" → OTC Lead creation (public registration removed)
- Sidebar translations (5 languages)
- Demo Mode with mock data
- Dashboard Dark/Light mode toggle

## Bug Fixes (April 8, 2026)
- AED currency display: Changed from Arabic script 'د.إ' to 'AED' text for cross-browser compatibility (Safari was showing '0.00!')
- Trustfull API: Fixed module-level key loading → now reads at call-time via _get_headers()
- Safari cursor bug: Removed dead GSAP custom cursor code from Header.jsx, cleaned CSS cursor rules

## Upcoming Tasks (P1)
- TradingView chart widgets on Trading/Markets pages
- Refactor HTTP polling → WebSockets for crypto prices

## Future Tasks (P2-P3)
- Whitelist functionality
- Product Pages (Launchpad, ICO)
- Refactoring: OTCLeads.jsx (2300+ lines), translations.js (6600+ lines)
- Convert remaining FormData uploads to base64 JSON

## Integrations
- Brevo (Emails) — configured
- Sumsub (KYC/KYB) — configured
- Trustfull (Risk Intelligence) — configured
- Binance & CoinMarketCap (Rates) — configured
- Fireblocks (Wallets) — broken
- Microsoft 365 (Azure AD) — pending

## Key Constraints
- Cloudflare WAF blocks multipart/form-data → must use application/json
- Safari ITP blocks Sumsub iframe → fallback opens in new tab
- Theme toggle applies ONLY to dashboard; Landing/Auth stay dark
