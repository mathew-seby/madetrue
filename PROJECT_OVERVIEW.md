# MADETRUE — Project Technical Overview & Architecture

> **Status (refreshed by the agent at every phase completion — master prompt
> §10b):** ✅ Phase 0 · Phase 1 · Phase 8 · Phase 2 · Phase 3 · Phase 4 complete — **now: Phase 5 —
> Admin console.** Live progress: [`docs/build-progress.md`](./docs/build-progress.md)
> · workflow: [`docs/master-build-prompt.md`](./docs/master-build-prompt.md).
>
> What follows describes the architecture as it stands today — live status
> lives in the tracker, not here.

Welcome to the technical architecture documentation for **MADETRUE**, a hyperlocal e-commerce platform that connects local producers (farmers, artisans, home chefs in Kerala) directly with nearby consumers using a story-driven, trust-first approach.

---

## 1. Directory Structure & Key Files

The codebase is built on **Next.js 16 (App Router)** and **TypeScript**, styled with **Tailwind CSS 4**. Maps run on **Leaflet 1.9.4 + react-leaflet 5** over free OSM tiles (no API keys). Below is the layout of the key directories and pages implemented so far:

```
├── app/
│   ├── layout.tsx                 # Root layout, wraps application in AuthProvider, CartProvider, Navbar, and Footer
│   ├── page.tsx                   # Public Homepage (Hero, Categories, Meet Makers, Nearby, Trending)
│   ├── (shop)/
│   │   ├── products/
│   │   │   ├── page.tsx           # Product listings page with category filters, search, and distance metrics
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Product detail page (Meet the Maker section, WhatsApp direct ordering)
│   ├── (sellers)/
│   │   └── sellers/
│   │       └── [id]/
│   │           └── page.tsx       # Public Seller profile (Business story, contact details, listed items)
│   ├── cart/
│   │   └── page.tsx               # Shopping basket (CartProvider-backed, honest stock caps)
│   ├── checkout/
│   │   └── page.tsx               # Checkout: delivery/pickup + ₹49 fee, UPI/COD choice, wa.me order summary
│   ├── dashboard/
│   │   └── page.tsx               # Maker/Seller dashboard (Manage listings, submit new products for moderation)
│   ├── admin/
│   │   ├── page.tsx               # Admin Moderation Console (Approve / Reject listings)
│   │   └── login/
│   │       └── page.tsx           # Admin authentication page
│   ├── profile/
│   │   └── page.tsx               # User account settings & Maker onboarding application
│   └── globals.css                # Global styles, fonts, and design variables
│
├── components/
│   ├── shared/
│   │   ├── AuthProvider.tsx       # Auth state + public browsing gate (login wall only on protected routes)
│   │   ├── CartProvider.tsx       # Basket source of truth (useSyncExternalStore, honest feedback, never fakes an add)
│   │   ├── Navbar.tsx             # Sticky main navigation (with location and Malayalam/English toggle)
│   │   └── Footer.tsx             # Page footer component
│   ├── home/
│       ├── Hero.tsx               # Homepage intro
│       ├── FeaturedCategories.tsx # Category navigations
│       ├── MeetMakers.tsx         # Handpicked maker spotlight stories
│       ├── NearbySellers.tsx      # Map-ready proximity list
│       ├── TrendingProducts.tsx   # Popular regional items
│       └── CTA.tsx                # Action banners
│   └── map/
│       ├── MapCanvas.tsx          # Shared Leaflet canvas over free OSM tiles (no API keys)
│       ├── SellerMap.tsx          # Maker location map for seller + product pages
│       └── DistanceBadge.tsx      # Distance chip with the Ernakulam gate (hidden if geo refused)
│
├── lib/
│   ├── hooks/
│   │   └── useUserLocation.ts     # Honest browser geolocation (never fabricates coordinates)
│   ├── supabase/
│   │   ├── auth.ts                # Authentication API mock handlers using LocalStorage
│   │   ├── client.ts              # Data-fetching client mock handlers (LocalStorage synchronizer)
│   │   └── mockData.ts            # Seeding records for categories, products, and makers
│   └── utils/
│       └── distance.ts            # Haversine formula for coordinate distance calculations
│
└── types/
    └── index.ts                   # Domain TypeScript definitions (User, Seller, Product, Order, Category)
```

---

## 2. Dynamic Page Connections & Visual Flow

The application flow represents a story-focused customer journey starting with local community discovery.

```mermaid
graph TD
    P[Public browsing — no account needed] --> B[Homepage /]
    P -->|Guest opens /checkout · /dashboard · /profile| L[Sign-in wall (inline)]
    L -->|Signed in / new account| P
    B -->|Click Category / Search| C[Product Listings /products]
    B -->|Featured Maker| E[Seller Profile /sellers/:id]
    C -->|Click Product Card| D[Product Details /products/:id]
    D -->|Meet the Maker Link| E
    D -->|Order via WhatsApp| WA[WhatsApp API Chat]
    D -->|Add to Basket| F[Cart /cart]
    
    B -->|Become a Maker / Settings| G[Account & Onboarding /profile]
    G -->|Activate Shop / Onboard| H[Maker Dashboard /dashboard]
    H -->|Submit New Product| AdminQueue[Admin Approval Queue]
    
    AdminLogin[Admin Login /admin/login] -->|Verify Credentials| AdminConsole[Admin Panel /admin]
    AdminConsole -->|Approve / Reject Product| AdminQueue
```

### Detailed Flow Explanation

1. **Public browsing gate (`AuthProvider.tsx`)**: Anyone can browse products, maker stores, the homepage and the cart without an account. The sign-in wall (rendered inline by `AuthProvider` — there is no separate `/login` route) appears for guests only on the protected routes: `/checkout`, `/dashboard` and `/profile*`. Admin keeps its own console login at `/admin/login`.
2. **Discovering Makers & Products (`app/page.tsx` & `app/(shop)/products/page.tsx`)**:
   - The homepage highlights local spice farmers, organic artisans, and pottery creators.
   - Using the **Explore Local** route (`/products`), users can filter products by Category (Spices, Pottery, Pickles, Honey, etc.), search by keywords, and sort by price/newest.
3. **Calculating Proximity (`lib/utils/distance.ts`)**:
   - The browser requests geolocation access. If approved, the app calculates the geodesic distance in kilometers between the user's current coordinates and the seller's coordinates using the **Haversine formula**.
   - If geolocation is blocked or unavailable, the app hides distance claims (`DistanceBadge`) instead of guessing — no fallback coordinates ever pose as the visitor.
4. **Learning the Heritage (`app/(shop)/products/[id]/page.tsx` & `app/(sellers)/sellers/[id]/page.tsx`)**:
   - Rather than just focusing on listings, product details display a **"Meet the Maker"** section featuring the backstory of the producer.
   - Users can proceed with direct customer service by clicking **"Order via WhatsApp"**. This opens a pre-composed message targeted to the seller's WhatsApp number stating the product details and quantity desired.
5. **The Producer Upgrading Loop (`app/profile/page.tsx` & `app/dashboard/page.tsx`)**:
   - Any buyer can upgrade their account to a "Maker" profile by providing a business name, contact details, coordinates, and their story on the `/profile` page.
   - Once activated, they unlock access to the **Maker Dashboard** (`/dashboard`), where they can view their catalog and submit new products (which begin as `pending` status).
6. **Vetting and Moderating Catalog (`app/admin/page.tsx`)**:
   - Admin roles access `/admin` using dedicated credentials.
   - Administrators see a moderation queue split into *Pending Review*, *Approved*, and *Rejected*.
   - Approving a listing updates the product's status and releases it to the public shop catalogue immediately.

---

## 3. Authentication & Authorization Structure

Because the database layer is currently mocked to support offline and client-side testing, authentication and persistence are simulated using `localStorage` and `sessionStorage` APIs.

### A. Consumer Authentication (`lib/supabase/auth.ts` & `components/shared/AuthProvider.tsx`)
- **Storage Keys**:
  - `madetrue_users`: Holds an array of registered user accounts.
  - `madetrue_current_user`: Keeps the active user object (name, email, phone, role) for session persistence.
- **Rules**:
  - Accounts can register using an **Email Address** (validated with regex) or an **Indian Phone Number** (10-digit number starting with 6-9).
  - Users are registered with the `buyer` role by default.
  - **Public Gate**: Browsing is open. `AuthProvider` renders the sign-in wall only when the pathname is a protected route (`/checkout`, `/dashboard`, `/profile*`) and there is no active session (`madetrue_current_user` is null). `/admin` routes are exempt — they use the separate console login.

### B. Admin Authorization (`app/admin/login/page.tsx` & `app/admin/page.tsx`)
- **Vetting Route**: The admin console `/admin` sits outside the public gate entirely — administrators moderate through the dedicated console login instead of registering consumer profiles.
- **Storage Key**: `admin_logged_in` saved in `sessionStorage` (so it resets when closing the browser tab).
- **Credentials**:
  - Email: `admin@madetrue.local`
  - Passcode: `kerala_trust_2026`
- **Rules**:
  - The admin index (`/admin`) performs a `useEffect` verification checks. If `admin_logged_in !== "true"`, the user is immediately redirected to `/admin/login`.

### C. Role Escalation (Upgrading to Seller)
- A logged-in buyer can escalate their profile to a seller on the `/profile` page.
- Calling `upgradeToSeller()` updates the role in `madetrue_users` to `seller`, saves the updated session to `madetrue_current_user`, and adds a new record to the list of sellers inside the `madetrue_sellers` storage.
- The user is redirected to the `/dashboard` page and gains permissions to submit goods.

---

## 4. Product Badges & Design Guidelines

The application strictly adheres to the styling design tokens configured in `app/globals.css`:
- **Primary Color Palette**:
  - Primary Green: `#2D6A4F` (trust, freshness)
  - Warm Earth Brown: `#7D5A3C` (heritage, accents)
  - Cream Background: `#F9F5F0` (light background layouts)
  - Accent Gold: `#E9A84C` (warm highlights)
- **Typography**: Lora for display headings, Inter for body copy.
- **Smart Product Badging**: Product tags use a strict set of standardized strings styled with custom color palettes:
  - `Same Day Delivery` (Green pill: `bg-primary-green/10 text-primary-green`)
  - `Pickup Available` (Brown pill: `bg-warm-brown/10 text-warm-brown`)
  - `Fresh Today` (Gold pill: `bg-accent-gold/20 text-warm-brown`)
  - `Locally Made` (Emerald pill: `bg-emerald-100 text-emerald-800`)
  - `Eco-Friendly` (Blue pill: `bg-blue-50 text-blue-800`)
