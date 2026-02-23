# KBEX.io - Product Requirements Document

## Original Problem Statement
Website para uma Crypto Boutique Exchange premium chamada **KBEX.io** (anteriormente Kryptobox.io), direcionada a indivíduos de alto patrimônio (HNW/UHNW) e empresas na Europa, Médio Oriente e Brasil.

## Target Audience
- High-Net-Worth (HNW) / Ultra-High-Net-Worth (UHNW) individuals
- Companies and institutions
- Geographic focus: Europe, Middle East, Brazil

## Core Products/Services
- Crypto Exchange
- Crypto ATM Network
- Launchpad
- ICO
- Institutional Custody

## Design Philosophy
- "Quiet luxury" aesthetic
- Trust and exclusivity
- Clear, serious, and sophisticated tone

---

## Implemented Features

### Phase 1: Core Platform ✅
- Landing page with premium design
- Live crypto prices (CoinGecko integration)
- Multi-language support (PT/EN/AR)
- Responsive design

### Phase 2: Authentication System ✅
- JWT-based authentication
- User registration with invite codes
- Login/Logout functionality
- Profile management
- Membership approval system

### Phase 3: Private Client Dashboard ✅
- Portfolio Overview
- Wallets Page
- Transactions History
- Investment Opportunities
- ROI Tracking
- Fund Transparency

### Phase 4: Admin Panel ✅
- Admin statistics dashboard
- User management (approve/reject/KYC status)
- Investment opportunity management
- Invite code generation
- Transparency report management

### Phase 5: KYC/KYB System ✅ (December 2024)
- **KYC Individual Verification**
  - Multi-step form (Personal Info → ID Document → Selfie → Proof of Address)
  - Document upload with drag & drop
  - Progress tracking
- **KYB Business Verification**
  - Company information form
  - Company documents upload
  - Representatives/UBO management
  - Business address proof
- **Admin KYC Management**
  - Pending verifications list
  - Document review
  - Approve/Reject with reasons
  - Search and filter functionality

### Phase 6: Dashboard Multilingual Support ✅ (December 2024)
- All dashboard pages now support PT/EN/AR
- Navigation menu fully translated
- KYC/KYB pages fully translated
- Admin panels fully translated

### Phase 6.1: KYC/KYB Bug Fixes & Complete Translations ✅ (February 2025)
- Fixed critical STEPS constant bug causing "Cannot read properties of undefined (reading 'icon')" error
- Fixed stepMap bounds to prevent array index overflow
- Added complete Portuguese translations to KYBForm.jsx
- All form labels, buttons, progress steps now fully translated
- FileUploadBox component updated to support i18n

### Phase 6.2: Rebranding & Fiat Currency Selector ✅ (February 2025)
- **Rebranding**: Changed name from "Kryptobox" to "KBEX" across entire application
  - Header, Footer, Auth page, Dashboard sidebar, Hero animation, Translations
  - Email contact updated to contact@kbex.io
- **Fiat Currency Selector**: Added multi-currency support in crypto ticker
  - Supported currencies: USD ($), EUR (€), AED (د.إ), BRL (R$)
  - Real-time price conversion for all crypto pairs
  - Dropdown selector in header ticker bar

---

## Technical Architecture

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Shadcn UI Components
- GSAP Animations
- Axios for API calls
- i18n for translations (EN/PT/AR)

### Backend
- FastAPI (Python)
- Motor (Async MongoDB driver)
- JWT Authentication (python-jose)
- Password hashing (bcrypt/passlib)
- File uploads (aiofiles, python-multipart)

### Database
- MongoDB

### Key Collections
- `users` - User accounts and profiles
- `wallets` - User crypto wallets
- `transactions` - Transaction history
- `investment_opportunities` - Available investments
- `user_investments` - User investment records
- `kyc_verifications` - KYC submissions
- `kyb_verifications` - KYB submissions
- `kyc_documents` - Uploaded verification documents
- `invite_codes` - Referral codes

---

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`

### Dashboard
- `GET /api/dashboard/overview`
- `GET /api/dashboard/wallets`
- `GET /api/dashboard/transactions`
- `GET /api/dashboard/investments`

### KYC/KYB
- `GET /api/kyc/status`
- `POST /api/kyc/start`
- `POST /api/kyc/personal-info`
- `POST /api/kyc/id-document`
- `POST /api/kyc/upload-document`
- `POST /api/kyc/submit`
- `POST /api/kyc/company-info`
- `POST /api/kyc/add-representative`
- `GET /api/kyc/documents`

### Admin
- `GET /api/admin/users`
- `POST /api/admin/users/{id}/approve`
- `GET /api/admin/kyc/pending`
- `GET /api/admin/kyb/pending`
- `POST /api/admin/kyc/{user_id}/approve`
- `POST /api/admin/kyc/{user_id}/reject`
- `POST /api/admin/kyb/{user_id}/approve`
- `POST /api/admin/kyb/{user_id}/reject`

---

## Pending/Blocked Features

### P1: Fireblocks Integration ⚠️ BLOCKED
- Live wallet creation and management
- **Blocked**: Waiting for RSA Private Key from user
- Playbook and API key available

### P2: Product Pages
- Launchpad page
- ICO page
- Institutional Custody page

### P2: Request Access Form
- Public contact form
- Backend submission handling

### P3: Dashboard Enhancements
- Detailed charts
- Transaction filtering
- Real-time data updates

---

## Test Credentials
- **Email**: joao@teste.com
- **Password**: senha123
- **Role**: Admin

- **Email**: maria@teste.com
- **Password**: senha123
- **Role**: Standard (KYC rejected, KYB approved)

---

## Notes
- Dashboard financial data is currently MOCKED
- Wallet addresses are placeholders (pending Fireblocks)
- All KYC/KYB document reviews are manual
- Default language is Portuguese (PT)
