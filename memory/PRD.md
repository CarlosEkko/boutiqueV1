# KBEX.io - Product Requirements Document

## Original Problem Statement
Building **KBEX.io**, a premium Crypto Boutique Exchange for High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals.

## Architecture
- Frontend: React, Tailwind CSS, Shadcn UI, Recharts, PDF.js, TradingView
- Backend: FastAPI, Motor (MongoDB), custom RBAC
- Real-time: Binance WebSocket (order book, trades, ticker)

## What's Been Implemented (Latest)
- **Binance-style Trading Terminal** at `/dashboard/trading` (2026-04-13):
  - Real-time Order Book (Binance WebSocket depth20)
  - Real-time Market Trades stream
  - TradingView candlestick chart with indicators
  - Spot Trading: **Limit / Market / Stop-Limit** order types
  - Buy/Sell forms with slider, available balance display
  - Pairs List with 40+ crypto pairs and 24h changes
  - Top ticker bar (price, 24h change, high, low, volume)
  - **Open Orders panel** with tabs (Open Orders count, Order History)
  - **Cancel order** functionality (hover X button + backend API)
  - Full-width layout within dashboard

## Trading Terminal File Structure
```
dashboard/
  TradingTerminal.jsx
  trading/
    useBinanceStream.js (WebSocket hook)
    OrderBook.jsx
    MarketTrades.jsx
    SpotTrading.jsx (Limit/Market/Stop-Limit)
    PairsList.jsx
    TradingChart.jsx (TradingView iframe)
    OpenOrders.jsx (Open Orders + History)
```

## API Endpoints - Trading
- `GET /api/trading/orders` - User orders
- `POST /api/trading/orders/{id}/cancel` - Cancel user order
- `POST /api/trading/buy` - Buy crypto
- `POST /api/trading/sell` - Sell crypto
- `POST /api/trading/swap` - Swap crypto
- `GET /api/trading/fees` - Trading fees
- `GET /api/trading/markets` - Market data

## Pending Issues
- P1: Safari cursor bug (recurring)

## Credentials
- Admin: carlos@kbex.io / senha123
