# KBEX.io - Premium Crypto Boutique Exchange

## Original Problem Statement
Build a website for a premium Crypto Boutique Exchange named KBEX.io targeting High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals and companies in Europe, Middle East, and Brazil.

## Core Requirements
- **Target Audience**: HNW/UHNW individuals and companies
- **Geographic Focus**: Europe, MENA (Middle East & North Africa), LATAM (Latin America)
- **Products/Services**: Exchange, Crypto ATM Network, Launchpad, ICO, Institutional Custody
- **Tone & Style**: "Quiet luxury," trust, exclusivity, clear, serious, sophisticated
- **User's Language**: Portuguese

## Tech Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **Deployment**: Docker, Docker Compose, Nginx (reverse proxy), Let's Encrypt (SSL)

## Architecture
```
/app
├── backend/
│   ├── models/user.py (RBAC models)
│   ├── routes/
│   │   ├── auth.py (JWT authentication)
│   │   ├── admin.py (RBAC endpoints)
│   │   ├── tickets.py (Support system)
│   │   ├── kyc.py (KYC/KYB verification)
│   │   └── dashboard.py (User dashboard)
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── components/ (Header, Footer, UI)
│   │   ├── pages/ (Home, Dashboard, Auth, Markets, etc.)
│   │   └── context/AuthContext.jsx
│   └── public/logo.png
├── docker-compose.yml
└── nginx/nginx.conf
```

## Implemented Features

### Authentication & Users
- [x] JWT-based authentication
- [x] User registration with invite codes
- [x] Login/Logout
- [x] Profile management

### RBAC System (NEW - Feb 2026)
- [x] Client Tiers: Standard, Premium, Elite
- [x] Internal Roles: Admin, Manager, Local Manager, Support
- [x] Regions: Europe, MENA, LATAM, Global
- [x] Region-based access control
- [x] Internal user management (create, update, delete)

### Ticket/Support System
- [x] Create tickets (clients)
- [x] Reply to tickets
- [x] Assign tickets (internal)
- [x] Update status/priority
- [x] Region-based ticket filtering
- [x] Ticket statistics

### KYC/KYB System
- [x] Individual KYC form
- [x] Business KYB form
- [x] Document upload
- [x] Admin approval/rejection

### Dashboard
- [x] Portfolio overview
- [x] Wallet management (mocked)
- [x] Transaction history (mocked)
- [x] Investment opportunities
- [x] ROI tracking
- [x] Transparency reports

### Admin Panel
- [x] User management
- [x] KYC/KYB review
- [x] Investment opportunities
- [x] Invite codes
- [x] Statistics

### Public Pages
- [x] Homepage with hero
- [x] Markets page (placeholder)
- [x] Trading page (placeholder)
- [x] Earn page (placeholder)
- [x] Institutional page (placeholder)
- [x] Crypto ATM page

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PUT /api/auth/me

### Admin (RBAC)
- GET /api/admin/users (with region filter)
- POST /api/admin/internal-users
- GET /api/admin/internal-users
- PUT /api/admin/internal-users/{id}
- DELETE /api/admin/internal-users/{id}
- POST /api/admin/users/{id}/region/{region}
- POST /api/admin/users/{id}/membership/{level}

### Tickets
- POST /api/tickets/ (create)
- GET /api/tickets/my-tickets
- GET /api/tickets/{id}
- POST /api/tickets/{id}/reply
- GET /api/tickets/internal/all (with region filter)
- POST /api/tickets/internal/{id}/assign
- POST /api/tickets/internal/{id}/status/{status}
- GET /api/tickets/internal/stats

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "hashed_password": "string",
  "user_type": "client|internal",
  "internal_role": "admin|manager|local_manager|support|null",
  "region": "europe|mena|latam|global",
  "membership_level": "standard|premium|elite",
  "is_admin": "boolean",
  "is_approved": "boolean",
  "kyc_status": "not_started|pending|approved|rejected"
}
```

### tickets
```json
{
  "id": "uuid",
  "user_id": "string",
  "region": "europe|mena|latam",
  "subject": "string",
  "category": "general|kyc|transaction|account|technical|complaint",
  "priority": "low|medium|high|urgent",
  "status": "open|in_progress|waiting_client|resolved|closed",
  "assigned_to": "string|null"
}
```

## Test Credentials (Preview Environment)
- **Admin**: carlos@kryptobox.io / senha123
- **Local Manager (Europe)**: manager_europe@kbex.io / senha123
- **Support (LATAM)**: support_latam@kbex.io / senha123
- **Client (LATAM)**: maria@teste.com / senha123

## Known Issues
- [ ] Safari cursor bug (P1) - cursor not working correctly in Safari
- [ ] Fireblocks integration blocked (P2) - waiting for new credentials

## Pending Tasks
- [ ] Frontend RBAC UI (Admin Panel for internal users)
- [ ] Ticket management UI (Support dashboard)
- [ ] Markets page with CoinMarketCap data
- [ ] Trading page with TradingView chart
- [ ] Full translations EN/AR

## Future Tasks
- [ ] Launchpad page
- [ ] ICO page
- [ ] Dashboard charts and history
- [ ] Real wallet integration (after Fireblocks fix)
