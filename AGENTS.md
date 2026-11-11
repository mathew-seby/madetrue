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

## Build Workflow — read first

Before any task, read `docs/master-build-prompt.md` and follow it literally.
Commands: `status` · `next` · `start phase X step Y` · `verify`.
Exactly one step per turn. Progress lives in `docs/build-progress.md` — update
it in the same turn as the step. Never commit, push, or rewrite history; never
start a server on port 3000 (the user keeps one running). This file is the
brand/product law; the master prompt is the build workflow; the tracker is the
truth about progress.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.9** (App Router, Turbopack) + TypeScript — requires Node ≥ 20.9.0 (team standard: **22**, pinned in `.nvmrc`) |
| Styling | **Tailwind CSS 4** (PostCSS plugin) · lucide-react icons |
| Backend / DB | Supabase (Postgres + Auth + Storage + Realtime) — *not wired yet* |
| Payments | **Cashfree Payment Gateway + Easy Split** (split settlements — primary) · Razorpay Route / PayU Split Settlements (approved alternates) — *not wired yet*; one internal payment adapter will abstract all three |
| Maps | Leaflet 1.9.4 + react-leaflet 5 · OSM tiles (no API keys) — **wired**: shared `MapCanvas` / `SellerMap` / `DistanceBadge` power the homepage nearby map and the maker maps on seller + product pages, with honest geolocation (`lib/hooks/useUserLocation.ts`) |
| Media | Supabase Storage (product images, seller photos, optional video) |
| WhatsApp | Twilio or WATI (order updates + seller onboarding) — order CTA is `wa.me` meanwhile |
| Hosting | Vercel (frontend) + Supabase (backend) |

> **Current build reality (mock era):** the app runs entirely on a **mock data layer** —
> `lib/supabase/client.ts` + `lib/supabase/auth.ts` persist to browser `localStorage`
> under `madetrue_*` keys. No Supabase or Cashfree keys exist yet (Leaflet runs
> on free OSM tiles — no keys at all) and no `.env.local` is needed. See
> `.env.example` for the variables each future phase will
> introduce. If you're hunting "missing data", wipe localStorage first.

---

## Locked Product Decisions (already built in — don't re-litigate)

1. **Public browsing, yes.** Anyone can browse products, maker stores, and the cart
   without an account. The login wall only appears for guests on `/checkout`,
   `/dashboard`, and `/profile*`. `/admin` keeps its own console login.
2. **Pickup is single-maker MVP:** pickup is offered only when the cart holds one
   seller's items; mixed carts are delivery-only, with a flat ₹49 delivery fee.
3. **Sign-in = identifier (email *or* phone) + password.** SMS verification is
   deferred until a provider is chosen; phone stays a profile field meanwhile.
4. **Payments = Cashfree Easy Split (primary).** COD stays as today. Online
   payments split at source: the seller's share settles to their verified bank
   account (gateway vendor — KYC + bank verification), MadeTrue's commission is
   retained automatically. Razorpay Route and PayU Split Settlements are
   approved alternates; all three sit behind ONE internal payment adapter so
   the gateway can be swapped without touching checkout UI. Secrets stay
   server-side (`.env.local`).

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
  /map/                            → MapCanvas, SellerMap, DistanceBadge
/lib
  /hooks/                          → useUserLocation (honest geolocation)
  /supabase/                       → client, server, types, mockData
  /utils/                          → distance, constants
/types/
/public/
/supabase
  /migrations/                     → SQL migrations (Phase 2+)
/docs
                                   → master-build-prompt.md, build-progress.md,
                                     team-issue-board.md
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
users ( id, name, email, phone,
  role: 'buyer' | 'seller' | 'admin',
  location_lat, location_lng, region, language_pref )

sellers ( id, user_id, business_name, story,
  profile_photo_url, video_url, address, lat, lng,
  whatsapp_number, is_verified,
  payment_vendor_ref,        -- gateway vendor id (Cashfree Easy Split)
  kyc_status                 -- not_started | pending | verified | failed
)

products ( id, seller_id, name, description,
  price, category, images[], tags[], stock, is_available,
  origin_details, created_at )

orders ( id, buyer_id, seller_id, product_id,
  quantity, status,          -- pending | accepted | ready | delivered | cancelled
  delivery_type: 'delivery' | 'pickup',
  address, payment_method, whatsapp_notified,
  buyer_name, buyer_phone, product_name,
  price, base_price, commission, delivery_fee, lat, lng, created_at,
  gateway,                   -- cashfree | razorpay | payu (null until Phase 6)
  gateway_order_ref, gateway_payment_ref,
  split_status               -- not_applicable | pending | completed | failed
)

transactions (               -- payment / refund / settlement ledger
  id, order_id, seller_id, gateway, gateway_event_id UNIQUE,
  type: 'payment' | 'refund' | 'settlement' | 'commission',
  amount, currency, status, created_at )

categories ( id, name, icon, slug )
```

> From Phase 2 onward, `supabase/migrations/0001_init.sql` + `types/index.ts`
> are the source of truth; this sketch is a summary. The gateway field carries
> `cashfree` (primary) or the approved alternates `razorpay` / `payu`.

---

## Product Badge Tags

Use exactly these strings — no variations:

- `Same Day Delivery`
- `Pickup Available`
- `Fresh Today`
- `Locally Made`
- `Eco-Friendly`

---

## Core Pages — all built (Phase 1)

1. **Homepage** — Hero, Featured Categories, Meet the Makers, Nearby Sellers, Trending, CTAs
2. **Product Listing Page** — Grid, Filters (category / price / distance), Badges, Sorting
3. **Product Detail Page** — Images, Description, Price, Delivery options, "Meet the Maker" story section, Seller info, Location map, Origin details
4. **Seller Profile Page** — Photo, Name, Location, Story, Products, "Support this seller" vibe
5. **Cart & Checkout** — Simple, online payment (Cashfree from Phase 6) / COD, address, delivery / pickup toggle
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

## Agent Platforms

- OpenCode, Cursor, Antigravity, Claude Code and Codex all follow the same
  protocol: read `docs/master-build-prompt.md` at session start, then drive
  work with `status` / `next` / `start phase X step Y` (per-tool setup notes
  live in the master prompt, §12).
- Run agents in Agent/Execute mode, never Plan/Ask mode. Approve terminal
  commands — verification gates (`tsc`, `eslint`, build) need to run.
- One step per turn; the owner commits; the tracker (`docs/build-progress.md`)
  is updated in the same turn as the step it describes.

---

## Current Status

> The full skeleton runs end-to-end on mock data and Supabase: homepage, product listing +
> detail, seller profiles, cart, checkout (plain-text WhatsApp order summaries
> via `wa.me`), profile, maker dashboard, and the admin console. **Phase 1
> (buying loop) is complete.** **Phase 8 (Leaflet maps) is complete:** shared
> `MapCanvas`/`SellerMap`/`DistanceBadge`, honest geolocation via
> `lib/hooks/useUserLocation.ts` (a refusal hides distances — nothing poses a
> Kochi default as the visitor), and an Ernakulam honesty gate on badges.
> Phase 0 (repo hygiene) is in final stretches — remaining: GitHub-side
> settings (branch protection, squash merges, collaborators, code-owner
> handles) and the team issue list.
> **Phase 2 (Supabase foundation) is complete:** schema + RLS + seed live in
> the Supabase project; catalog reads and checkout/product/profile writes flow
> through Supabase when `MADETRUE_DATA_SOURCE=supabase` (writes via service-role
> server routes), and the mock layer stays as the no-keys default + fallback.
> **Phase 3 (Auth & roles) is complete:** Supabase Auth integration via
> `@supabase/ssr` cookies; sessions survive refresh; RoleGuard enforces buyer,
> maker, and admin boundaries; password reset works in dev and Supabase;
> persistent profile (name, phone, address) auto-prefills checkout; Become a
> Maker captures Cashfree Easy Split payout KYC (PAN, bank, IFSC) with admin
> moderation.
> **Phase 4 (Seller dashboard) is complete:** maker products CRUD with
> Supabase Storage uploads; DB-backed stock with honest sold-out states;
> session-scoped maker order inbox; accept→complete/cancel status machine
> (`ready`/`delivered` deferred to Phase 7); accurate dashboard stats; store
> settings tab (story, WhatsApp, location, payout status); isolation closed —
> every write route derives identity from the session
> (`getServerUser`/`getOwnSellerId`), payout KYC moved to a private
> `seller_payout_kyc` table (migration 0006, applied live), checkout stock
> decremented atomically, and a 17/17 live isolation proof recorded in
> `docs/phase4-isolation-proof.md`.
> **Phase 5 (Admin console) is complete:** real session guard via role
> (`admin`); seller management & application approval/rejection with private payout
> KYC reviews; product moderation (search, hide/unhide, permanent removal, and audit notes);
> global order overview with status/fulfillment/payment filters and detail view;
> category CRUD with unique slugs and live public navigation; platform analytics
> (GMV, platform commissions, fees, top makers leaderboard); durable moderation audit
> trail (migration 0009_admin_audit.sql, admin-guarded `/api/audit`, and console feed).
> **Phase 7 (Order lifecycle & notifications) is complete:** 5-state status machine
> (`pending → accepted → ready → delivered`, `cancelled` from pre-delivery states,
> legacy `completed` normalized to `delivered`); buyer history at `/orders` with live
> polling and deep links; universal WhatsApp adapter (`twilio`/`wati`/`none` with
> honest wa.me fallback); pure template family for all 7 lifecycle events; full
> cancellation lifecycle (request→approve→refund) with universal payment adapter
> refunding and inventory restoration; durable notification delivery log (`0013`) and
> retry hub in admin console; automated E2E journey test (`scripts/verifyPhase7Journey.ts`).
> **Phase 9 (Trust, legal & scale) is complete:** legal pages (terms, privacy,
> refund, shipping, contact) live with footer and checkout consent; dynamic SEO
> (metadata, sitemap.xml, robots.txt, OG image card); server-rendered public pages
> (home, products, sellers, contact) with client islands; catalog pagination with safe query caps;
> keyboard accessibility pass with skip links, visible focus rings, and aria-labels;
> Sentry monitoring integration with warm error boundaries (root, global, 404);
> disaster recovery runbook (`docs/backup-and-disaster-recovery.md`) with automated
> verification suite (`scripts/verifyBackups.ts`); edge proxy write throttling (`lib/security/rateLimit.ts` & `proxy.ts`).
> Phase 6 is 6/7 (Step 7 🔑 owner-blocked pending live Cashfree credentials).
> Next build phase: **Phase 10 — Reconciliation & launch (Step 1: Commission reconciliation).**
> Payment strategy remains locked: **Cashfree Easy Split** primary (see Locked
> Decisions #4), with Razorpay Route / PayU Split Settlements as
> adapter-backed alternates.
> Work is driven by `docs/master-build-prompt.md` and tracked in
> `docs/build-progress.md` (finished phases + 7-step remaining phases).
> When a phase closes, the agent refreshes this block automatically
> (master prompt §10b) — together with prompt §5, the README "Project status"
> block and the PROJECT_OVERVIEW status header.

## Team

| Name | Handle |
|---|---|
| Mathew Seby | `mathew-seby` / `mathew-cs` |
| Joel Punnen | `joelpunnen` |
