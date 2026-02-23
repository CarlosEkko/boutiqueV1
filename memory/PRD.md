# Kryptobox.io - Premium Crypto Boutique Exchange
## Product Requirements Document

**Last Updated:** February 23, 2026  
**Status:** Frontend MVP + Backend Complete (Dashboard, Membership, Investments)

---

## 1. Original Problem Statement

Build a premium cryptocurrency exchange website for **Kryptobox.io** targeting:
- **Target Audience:** High Net Worth (HNW) and Ultra High Net Worth (UHNW) individuals, institutional clients
- **Geographic Focus:** Europe, Middle East, Brazil
- **Products/Services:** 
  - Premium Exchange (OTC trading)
  - Crypto ATM Network
  - Exclusive Launchpad & ICO
  - Institutional Custody
- **Brand Tone:** Quiet luxury, trust, exclusivity, sophisticated
- **Design Reference:** Dark background with golden/amber accents (provided background image)

---

## 2. User Personas

### Primary Persona: Institutional Investor
- **Profile:** CFO or Treasury Manager at mid-to-large enterprise
- **Needs:** Secure custody, regulatory compliance, dedicated support
- **Pain Points:** Lack of trust in retail exchanges, need for white-glove service

### Secondary Persona: UHNW Individual
- **Profile:** Private investor with $10M+ in liquid assets
- **Needs:** Privacy, exclusive access to pre-vetted opportunities, OTC desk
- **Pain Points:** Limited access to institutional-grade services, security concerns

---

## 3. Core Requirements (Static)

### Design Requirements
- ✅ Dark theme with golden/amber accents (quiet luxury aesthetic)
- ✅ Premium typography (Playfair Display for headings, Inter for body)
- ✅ Smooth animations and micro-interactions
- ✅ Fully responsive design (mobile, tablet, desktop)
- ✅ Glass-morphism effects and subtle textures

### Functional Requirements
- ✅ Landing page with multiple sections
- ✅ Fixed header with smooth scroll navigation
- ✅ Contact form for exclusive membership requests
- ✅ User authentication (JWT-based login/register)
- ✅ Private Dashboard for approved members
- ✅ Investment opportunities (lending pools)
- ✅ Transparency page (proof of reserves)
- ✅ Trust indicators and social proof (stats, testimonials)
- ✅ Product showcase with detailed descriptions
- ✅ User authentication (JWT-based login/register)
- ✅ User profile management

### Technical Requirements
- ✅ React frontend with Shadcn UI components
- ✅ Tailwind CSS for styling
- ✅ Lucide-react for icons (NO emoji icons)
- ✅ FastAPI backend 
- ✅ MongoDB database
- ✅ JWT Authentication

---

## 4. What's Been Implemented

### ✅ Private Dashboard System (February 23, 2026)

#### Dashboard Pages
- **DashboardOverview.jsx** - Portfolio summary with stats cards
- **WalletsPage.jsx** - User wallets (BTC, ETH, USDT, USDC)
- **TransactionsPage.jsx** - Transaction history with filters
- **InvestmentsPage.jsx** - Lending opportunities (Kilf pool)
- **ROIPage.jsx** - Return on investment tracking
- **TransparencyPage.jsx** - Proof of reserves, audit reports

#### Membership System
- Admin approval required for dashboard access
- KYC verification status tracking
- Invite code system for referrals
- Membership levels: Standard, Silver, Gold, Platinum

#### Backend Routes
- **routes/dashboard.py** - Portfolio, wallets, transactions, investments, ROI, transparency
- **routes/admin.py** - User management, opportunities, transparency reports
- **models/dashboard.py** - Investment, Transaction, Wallet, Transparency models

#### Fireblocks Integration (PENDING)
- API Key configured
- **Missing:** Private Key (RSA) - user to provide
- Mock wallet addresses in use until Fireblocks is activated

### ✅ Authentication System (February 23, 2026)

#### Backend
- **routes/auth.py** - JWT authentication routes
  - POST /api/auth/register - User registration
  - POST /api/auth/login - User login
  - GET /api/auth/me - Get current user profile
  - PUT /api/auth/me - Update user profile

#### Frontend
- **AuthContext.jsx** - Authentication state management with localStorage token persistence
- **AuthPage.jsx** - Login/Register page with toggle between modes
- **ProfilePage.jsx** - User profile display and editing
- **Header.jsx** - Updated with Login/Profile button

#### User Fields
- name (required)
- email (required, unique)
- password (required, hashed with bcrypt)
- phone (optional)
- country (optional)

### ✅ Frontend MVP (February 16, 2025)

#### Components Created
1. **Header.jsx** - Overlay menu with magnetic cursor effect
   - Login/Profile button based on auth state
   - Language selector (EN/PT/AR)
   - Hamburger menu with fullscreen overlay
2. **CryptoTicker.jsx** - Live scrolling crypto price ticker with real CoinGecko API data
3. **HeroV2.jsx** - Advanced cinematic hero with sequential text animations
4. **GlowText.jsx** - ✅ FIXED: Letter-by-letter glow animations (text always visible)
5. **Products.jsx** - Grid of 4 premium services with GlowText animations
6. **Trust.jsx** - Stats section + 4 trust factor cards with GlowText animations
7. **Regions.jsx** - Geographic presence with GlowText animations
8. **ContactCTA.jsx** - Split design with form (exclusive membership request)
9. **Footer.jsx** - Comprehensive footer with links, contact info, legal disclaimer

#### Pages
- **Home.jsx** - Main landing page
- **CryptoAtmPage.jsx** - Dedicated page for Crypto ATM Network
- **AuthPage.jsx** - Login/Register page
- **ProfilePage.jsx** - User profile page

#### Styling
- **index.css** - Custom animations, scrollbar, grain texture
- **App.css** - Smooth transitions
- **Google Fonts** - Inter (Extra Light 200, Light 300, Regular 400)

#### Mock Data
- **mock.js** - All content centralized (hero, products, trust factors, stats, regions, CTA)
- **mock.js** - All content centralized (hero, products, trust factors, stats, regions, CTA)

#### Features Working (Mock)
- ✅ Smooth scroll navigation
- ✅ Form submission (console log + toast notification)
- ✅ Hover effects and animations
- ✅ Responsive mobile menu
- ✅ Visual feedback on interactions
- ✅ **LIVE** Crypto price ticker with CoinGecko API
- ✅ Advanced GSAP animations throughout
- ✅ Cinematic hero animation sequence (blur/fade/scale + letter glow)
- ✅ **i18n** - Full English/Arabic language support with RTL
- ✅ Custom cursor with glow trail effect (desktop)
- ✅ Magnetic link hover effect

#### Animation Libraries
- **GSAP (GreenSock)** - Professional animations, ScrollTrigger integration
- **Custom textAnimations.js** - Utility functions for character-level text effects

---

## 5. API Contracts (For Backend Implementation)

### To Be Implemented

#### POST /api/contact-requests
**Purpose:** Submit exclusive membership request  
**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "company": "string (optional)",
  "message": "string (optional)"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Request submitted successfully",
  "request_id": "uuid"
}
```

#### GET /api/stats
**Purpose:** Fetch real-time platform statistics  
**Response:**
```json
{
  "assets_under_custody": "2.5B+",
  "institutional_clients": "500+",
  "platform_uptime": "99.9%",
  "support_availability": "24/7"
}
```

#### GET /api/products
**Purpose:** Fetch product/service offerings  
**Response:**
```json
[
  {
    "id": 1,
    "title": "Premium Exchange",
    "description": "...",
    "features": ["24/7 Dedicated Support", "..."],
    "image_url": "..."
  }
]
```

---

## 6. Mocked Data

**File:** `/app/frontend/src/mock.js`

**What's Mocked:**
- Hero section content (title, subtitle, CTA buttons)
- Products array (4 services with images, descriptions, features)
- Trust factors (4 cards with icons and descriptions)
- Stats (4 key metrics)
- Regions (3 geographic markets)
- Contact CTA messaging
- All images from Unsplash (curated by vision expert)

**Integration Plan:**
- Replace mock imports with API calls using axios
- Update component state management
- Add loading states and error handling
- Connect form submission to backend endpoint

---

## 7. Prioritized Backlog

### P0 - Critical (Completed)
- [x] ~~Backend development (FastAPI)~~ ✅ DONE
  - [x] ~~Crypto prices proxy (resolve CORS issue)~~ ✅ DONE
  - [ ] Contact request submission endpoint
  - [ ] Email notification service
- [x] ~~User Authentication System~~ ✅ DONE (Feb 23, 2026)
  - [x] JWT-based auth with register/login
  - [x] User profile management
  - [x] Token persistence with localStorage
- [x] ~~GlowText animation fix~~ ✅ DONE (Feb 23, 2026)

### P1 - High Priority
- [x] ~~Language selector functionality (EN/PT/AR i18n)~~ ✅ DONE
- [ ] Admin dashboard for reviewing contact requests
- [ ] Analytics tracking (Google Analytics, Mixpanel)
- [ ] SEO optimization (meta tags, sitemap, robots.txt)
- [ ] Performance optimization (image lazy loading, code splitting)

### P2 - Medium Priority
- [ ] Build remaining product pages: Launchpad, ICO, Institutional Custody
- [ ] About Us page with team and company history
- [ ] FAQ section with accordion component
- [ ] Blog/Insights section for thought leadership
- [ ] Live chat support integration
- [ ] Email marketing integration (newsletter signup)
- [ ] Contact form backend (save to DB + email notifications)

### P3 - Nice to Have
- [x] ~~Interactive crypto price ticker in header~~ ✅ DONE
- [ ] Testimonials section with client quotes
- [ ] Case studies page
- [ ] Webinar/event registration
- [ ] Dark mode toggle (currently dark by default)

---

## 8. Next Tasks

### Immediate Actions
1. Implement "Request Access" form backend (save submissions to MongoDB)
2. Add email notifications for contact requests
3. Build dedicated product pages (Launchpad, ICO, Custody)
   
### Backend Development Sequence
1. Create POST /api/contact-requests endpoint
2. Implement email notification service (SendGrid/Resend)
3. Add request validation and rate limiting
4. Test frontend-backend integration

---

## 9. Success Metrics

### Phase 1 (Current - Frontend MVP)
- ✅ Design matches premium/luxury aesthetic
- ✅ All sections render correctly
- ✅ Responsive across devices
- ✅ Animations and interactions work smoothly

### Phase 2 (Backend Integration)
- Contact form submissions stored in database
- Email notifications sent to admin
- Response time < 2 seconds for form submission
- Zero data loss

### Phase 3 (Launch)
- Page load time < 3 seconds
- Mobile lighthouse score > 90
- SEO score > 85
- Conversion rate > 5% (form submissions / visitors)

---

## 10. Technical Architecture

### Current Stack
- **Frontend:** React 19, Tailwind CSS, Shadcn UI, Lucide Icons, GSAP
- **Backend:** FastAPI (Python) - NOT YET IMPLEMENTED
- **Database:** MongoDB - NOT YET IMPLEMENTED
- **Hosting:** Emergent Agent platform

### Key Files
- `/app/frontend/src/components/HeroV2.jsx` - Cinematic hero with animations
- `/app/frontend/src/components/Header.jsx` - Overlay menu with cursor glow trail
- `/app/frontend/src/components/CryptoTicker.jsx` - Live price ticker component
- `/app/frontend/src/components/GlowText.jsx` - Letter glow animation component
- `/app/frontend/src/i18n/` - Internationalization system (EN/AR)
- `/app/frontend/src/pages/CryptoAtmPage.jsx` - ATM Network page
- `/app/frontend/src/utils/textAnimations.js` - Text animation utilities
- `/app/frontend/src/mock.js` - Fallback mock data
- `/app/backend/server.py` - FastAPI backend with crypto-prices endpoint

### Deployment
- Frontend: Auto-deployed via supervisor (hot reload enabled)
- Backend: Runs on port 8001 (supervisor managed)
- External URL: https://boutique-box.preview.emergentagent.com

---

## 11. Design System

### Colors
- **Primary:** Amber/Gold (#d97706, #f59e0b, #fbbf24)
- **Background:** Black (#000000), Zinc-950 (#09090b)
- **Text:** White (#ffffff), Gray-300 (#d1d5db), Gray-400 (#9ca3af)
- **Accents:** Amber-600 to Amber-700 gradients

### Typography
- **Headings:** Playfair Display (serif, elegant)
- **Body:** Inter (sans-serif, clean)
- **Sizes:** Hero (5xl-8xl), H2 (4xl-5xl), Body (lg-xl)

### Spacing
- Sections: py-24 (96px vertical padding)
- Container: max-w-6xl to max-w-7xl
- Cards: p-6 to p-8

---

**End of Document**
