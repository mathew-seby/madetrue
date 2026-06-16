<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MADETRUE — Project Master Context

## What This Project Is

MADETRUE is a hyperlocal e-commerce platform that directly connects local producers
(farmers, artisans, home businesses) in Kerala, India with nearby consumers.

This is NOT a typical marketplace. It is a story-driven, trust-first, community-based
platform. Every design and code decision must reflect:

> **Local → Real → Human → Transparent → Simple**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (Postgres + Auth + Storage + Realtime) |
| Payments | Razorpay (UPI + Cash on Delivery) |
| Maps | Leaflet.js (nearby sellers, distance display) |
| Media | Supabase Storage (product images, seller photos, optional video) |
| WhatsApp | Twilio or WATI (order updates + seller onboarding) |
| Hosting | Vercel (frontend) + Supabase (backend) |

---

## Folder Structure

Follow this strictly:

```
/app
  /page.tsx                        → Homepage
  /(shop)
    /products/page.tsx             → Product Listing
    /products/[id]/page.tsx        → Product Detail
  /(sellers)
    /sellers/[id]/page.tsx         → Seller Profile
  /cart/page.tsx
  /checkout/page.tsx
  /dashboard/                      → Seller Dashboard (protected)
  /admin/                          → Admin Panel (protected)
/components
  /ui/                             → shadcn base components
  /shared/                         → Navbar, Footer, etc.
  /home/                           → Hero, FeaturedCategories, MeetMakers, etc.
  /product/                        → ProductCard, ProductGrid, StorySection, etc.
  /seller/                         → SellerCard, SellerProfile, etc.
  /map/                            → NearbyMap, DistanceBadge, etc.
/lib
  /supabase/                       → client, server, types
  /utils/
/types/
/public/
```

---

## Design System

### Color Palette

| Name | Hex | Usage |
|---|---|---|
| Primary Green | `#2D6A4F` | Freshness, trust, primary actions |
| Warm Brown | `#7D5A3C` | Authenticity, earth, accents |
| Cream / Off-white | `#F9F5F0` | Background, soft sections |
| Accent Gold | `#E9A84C` | Highlights, warmth, badges |
| Text Dark | `#1A1A1A` | Body text, headings |

### Typography

| Role | Font | Notes |
|---|---|---|
| Display | Lora (serif) | Emotional, storytelling, headings |
| Body | Inter | Clean, readable, mobile-first |

### General Rules

- Border radius: `rounded-xl` for cards, `rounded-full` for badges
- **Mobile-first.** Always design for 375px width first
- No stock photo look — real, organic, slightly raw aesthetic
- Avoid corporate / Amazon-style UI at all costs
- No dark mode (not in scope)

---

## Database Schema (Supabase)

```sql
users (
  id, name, email, phone,
  role: 'buyer' | 'seller' | 'admin',
  location_lat, location_lng,
  region, language_pref
)

sellers (
  id, user_id, business_name, story,
  profile_photo_url, video_url,
  address, lat, lng,
  whatsapp_number, is_verified
)

products (
  id, seller_id, name, description,
  price, category, images[],
  tags[], stock, is_available,
  origin_details, created_at
)

orders (
  id, buyer_id, seller_id, product_id,
  quantity, status,
  delivery_type: 'delivery' | 'pickup',
  address, payment_method,
  whatsapp_notified
)

categories (
  id, name, icon, slug
)
```

---

## Product Badge Tags

Use exactly these strings — no variations:

- `Same Day Delivery`
- `Pickup Available`
- `Fresh Today`
- `Locally Made`
- `Eco-Friendly`

---

## Pages to Build (in this order)

1. **Homepage** — Hero, Featured Categories, Meet the Makers, Nearby Sellers, Trending, CTAs
2. **Product Listing Page** — Grid, Filters (category / price / distance), Badges, Sorting
3. **Product Detail Page** — Images, Description, Price, Delivery options, "Meet the Maker" story section, Seller info, Location map, Origin details
4. **Seller Profile Page** — Photo, Name, Location, Story, Products, "Support this seller" vibe
5. **Cart & Checkout** — Simple, UPI / COD, address, delivery / pickup toggle
6. **Seller Dashboard** — Add / edit products, view orders, track payments
7. **Admin Panel** — Manage products / sellers, order tracking, analytics

---

## Key Features

- **Nearby sellers** — Leaflet.js map, distance shown in km from user's location
- **"Meet the Maker" story section** — on every product page (text + optional video)
- **WhatsApp integration** — order updates and seller onboarding
- **Regional language detection** — Malayalam default for Kerala, manual override available
- **Smart badge system** — on all product cards
- **Mobile-first** — throughout the entire platform

---

## Tone & Copy Rules

- Write all UI copy in simple, warm, human English
- No corporate jargon
- CTAs to use: `Shop Now` · `Explore Local` · `Become a Seller` · `Meet the Maker` · `Support this Seller`
- Empty states should feel like an invitation, not an error
- Error messages: friendly and specific, never vague

---

## What to NEVER Do

- No stock photo placeholders in UI
- No Amazon / Flipkart-style dense product grids
- No dark mode
- No over-engineered animations
- No hardcoded API keys or secrets — always use `.env.local`
- Never skip mobile responsiveness
- Never use default shadcn styling without customizing to this palette

---

## Model Usage in Antigravity

| Model | When to Use |
|---|---|
| **Gemini 3.5 Flash** (default) | Scaffolding, UI components, boilerplate, repetitive pages — 80% of the build |
| **Claude Sonnet 4.6** (switch when needed) | Complex logic, auth flows, payment integration, story UX, architecture decisions |

Switch to Claude Sonnet 4.6 when Gemini hits its compute budget limit or when the task
requires deeper reasoning.

---

## How to Use This Prompt in Antigravity

**Step 1 — Project init:** Paste this entire file into Antigravity's project-level context or save it as `AGENTS.md` at the root of the repo.

**Step 2 — Per-task directives:** Send short, focused task prompts per feature. Example:

```
Build the Homepage following the master context.
Start with the Hero section and Featured Categories.
Use Lora for headings, Inter for body.
Primary color #2D6A4F. Mobile-first at 375px.
```

**Step 3 — Parallel agents:** Once the Homepage is running, spawn a second agent for the Product Listing Page simultaneously.

**Step 4 — Visual verify:** Use Antigravity's built-in browser after each page to check the mobile view at 375px.

---

## Current Status

> Project is in initial setup phase. Stack is decided. No code written yet.

## Team

| Name | Handle |
|---|---|
| Mathew Seby | `mathew-seby` / `mathew-cs` |
| Joel Punnen | `joelpunnen` |
