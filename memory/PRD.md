# Kryptobox.io - Premium Crypto Boutique Exchange
## Product Requirements Document

**Last Updated:** December 2025  
**Status:** Frontend MVP + Backend API Complete (Live Crypto Data, i18n)

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
- ✅ Trust indicators and social proof (stats, testimonials)
- ✅ Product showcase with detailed descriptions

### Technical Requirements
- ✅ React frontend with Shadcn UI components
- ✅ Tailwind CSS for styling
- ✅ Lucide-react for icons (NO emoji icons)
- 🔄 FastAPI backend (pending)
- 🔄 MongoDB database (pending)

---

## 4. What's Been Implemented

### ✅ Frontend MVP (February 16, 2025)

#### Components Created
1. **Header.jsx** - Overlay menu with magnetic cursor effect (inspired by CodePen iamryanyu)
   - Hamburger icon that transforms to X
   - Fullscreen dark overlay with circular reveal animation
   - Navigation links with Inter font (light weight, tracking)
   - Custom magnetic cursor effect (amber dot follows mouse, scales on hover)
   - Active link indicator with amber underline
2. **CryptoTicker.jsx** - Live scrolling crypto price ticker with real CoinGecko API data
   - Displays BTC, ETH, ADA, SOL, XRP, BNB, DOGE, DOT prices
   - Auto-refresh every 60 seconds
   - Green "LIVE" indicator when connected to API
   - Fallback to mock data if API fails
3. **Hero.jsx** - Original hero component (replaced)
4. **HeroV2.jsx** - ✅ NEW: Advanced cinematic hero with sequential text animations
   - Blur/Fade/Scale effects for 4 phrases (inspired by CodePen Sonick)
   - Letter-by-letter glow animation for "KRYPTOBOX" (inspired by CodePen StephenScaff)
   - Full animation sequence: "The Boutique" → "Exchange for" → "Sophisticated" → "INVESTORS" → "KRYPTOBOX" → Final CTA content
5. **GlowText.jsx** - ✅ NEW: Reusable component for letter-by-letter glow animations with ScrollTrigger
6. **Products.jsx** - Grid of 4 premium services with GlowText animations
7. **Trust.jsx** - Stats section + 4 trust factor cards with GlowText animations
8. **Regions.jsx** - Geographic presence with GlowText animations
8. **ContactCTA.jsx** - Split design with form (exclusive membership request)
9. **Footer.jsx** - Comprehensive footer with links, contact info, legal disclaimer

#### Pages
- **Home.jsx** - Main landing page assembling all components (uses HeroV2)
- **CryptoAtmPage.jsx** - Dedicated page for Crypto ATM Network product with GSAP animations

#### Styling
- **index.css** - Custom animations (fade-in, fade-in-up, shimmer), custom scrollbar, grain texture, crypto ticker animation
- **App.css** - Smooth transitions for interactive elements
- **Google Fonts** - Inter (Extra Light 200, Light 300, Regular 400)

#### Mock Data
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

### P0 - Critical (Next Phase)
- [ ] Backend development (FastAPI)
  - Contact request submission endpoint
  - Crypto prices proxy (resolve CORS issue)
  - Email notification service
  - Database models for contact requests
- [ ] Frontend-backend integration
  - Replace mock crypto ticker with real API data
  - Replace mock data with API calls
  - Add loading spinners
  - Error handling and validation

### P1 - High Priority
- [ ] Language selector functionality (EN/AR i18n)
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

### P3 - Nice to Have
- [x] ~~Interactive crypto price ticker in header~~ (implemented with mock data)
- [ ] Testimonials section with client quotes
- [ ] Case studies page
- [ ] Webinar/event registration
- [ ] Dark mode toggle (currently dark by default)

---

## 8. Next Tasks

### Immediate Actions
1. **Get user approval** on frontend design and functionality
2. **Clarify backend requirements** (email notifications, CRM integration?)
3. **API keys needed:**
   - Email service (SendGrid/AWS SES) for contact form notifications
   - Analytics (optional)
   
### Backend Development Sequence
1. Set up MongoDB models for contact requests
2. Create POST /api/contact-requests endpoint
3. Implement email notification service
4. Add request validation and rate limiting
5. Test frontend-backend integration
6. Deploy and test end-to-end flow

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
- `/app/frontend/src/components/CryptoTicker.jsx` - Price ticker component
- `/app/frontend/src/pages/CryptoAtmPage.jsx` - ATM Network page
- `/app/frontend/src/utils/textAnimations.js` - Text animation utilities
- `/app/frontend/src/mock.js` - All mock data centralized

### Deployment
- Frontend: Auto-deployed via supervisor (hot reload enabled)
- Backend: Runs on port 8001 (supervisor managed)
- External URL: https://luxury-exchange-2.preview.emergentagent.com

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
