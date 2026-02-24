# KBEX.io - Product Requirements Document

## Project Overview
Premium Crypto Boutique Exchange website targeting High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals and companies in Europe, Middle East, and Brazil.

## Core Brand Identity
- **Brand Name**: KBEX.io (formerly Kryptobox.io)
- **Tone & Style**: "Quiet luxury," trust, exclusivity, sophisticated
- **Color Palette**: Custom gold/bronze theme

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, GSAP animations
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **Authentication**: JWT
- **i18n**: Custom multilingual system (EN, PT, AR)
- **API Integration**: CoinMarketCap (live prices)
- **DevOps**: Docker, Docker Compose

## Implemented Features

### Public Pages (Completed - Dec 2025)
- [x] Landing Page with hero, products, trust, regions, contact sections
- [x] Crypto ATM Page
- [x] **Markets Page** - Spot/Futures/Favorites tabs with market data table
- [x] **Trading Page** - Terminal Pro interface with order book, recent trades, order form
- [x] **Earn Page** - Flexible/Locked/DeFi staking with calculator
- [x] **Institutional Page** - OTC, Custody, APIs services for institutional clients

### Authentication & Dashboard (Completed)
- [x] JWT Authentication (Login/Register)
- [x] Private Client Dashboard
- [x] KYC/KYB Verification System
- [x] Admin Panel

### Integrations (Completed)
- [x] CoinMarketCap - Live crypto price ticker
- [x] Fiat currency selector (USD, EUR, BRL, AED)

### Blocked Features
- [ ] Fireblocks Integration - Authentication error ("invalid signature"). Requires new API Key + Private Key pair from user's Fireblocks Production dashboard.

## Page Routes
| Route | Page | Status |
|-------|------|--------|
| `/` | Landing Page | ✅ Complete |
| `/markets` | Markets (Spot/Futures/Favorites) | ✅ Complete |
| `/trading` | Trading Terminal Pro | ✅ Complete |
| `/earn` | Staking/Earn | ✅ Complete |
| `/institutional` | Institutional Services | ✅ Complete |
| `/crypto-atm` | Crypto ATM Network | ✅ Complete |
| `/auth` | Login/Register | ✅ Complete |
| `/dashboard/*` | Client Dashboard | ✅ Complete |

## Navigation Structure
1. Início (Home)
2. Mercados (Markets)
3. Trading
4. Ganhos (Earn)
5. Institucional (Institutional)
6. Crypto ATM
7. Contacto (Contact)

## Future Tasks (Backlog)
- [ ] Populate Markets with real-time CoinMarketCap data
- [ ] Integrate TradingView chart in Trading page
- [ ] Build Launchpad page
- [ ] Build ICO page  
- [ ] Implement "Request Access" form backend
- [ ] Add full translations for new pages (markets.*, trading.*, earn.*, institutional.*)
- [ ] Fix Fireblocks integration (pending user credentials)
- [ ] Real portfolio data in Dashboard (post-Fireblocks)

## Test Credentials
- **Admin User**: joao@teste.com / senha123
- **Regular User**: maria@teste.com / senha123

## Deployment
- Docker containerized
- Guide: `/app/DEPLOY_DIGITALOCEAN.md`
