# MADETRUE — Build Progress Tracker

> How to use: the build workflow lives in `docs/master-build-prompt.md` (§6 is
> this table's canonical source). Agents run **one step per turn**, update this
> file in the same turn, then report. The owner commits code + tracker together
> and says **`next`**. Statuses: ⬜ pending · 🟡 in progress · ✅ done ·
> 🔑 owner-blocked · ⏭️ skipped.
>
> Summary mirrors (master prompt §5 · AGENTS.md "Current Status" · README
> "Project status" · PROJECT_OVERVIEW header) are refreshed ONLY at phase
> completion, per master prompt §10b. If they disagree with this tracker,
> tracker + git win.

**Current position:** Phase 5 · Step 1/7 — Admin guard — ⬜ pending (Phase 4 closed 2026-11-08)
**Last completed:** Phase 4 · Step 7/7 — Isolation test — commit "feat(phase4): isolation proof and payout privacy" — 2026-11-08
**Baseline gates (this step):** tsc ✅ · eslint ✅ (0 errors / 33 warnings) · build ✅ (20 routes — isolation-test deleted) · smoke 11/11 on :4010 · proof script boots (mock skip exit 2)

---

## Finished phases

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Project hygiene (repo) | ✅ repo-complete | Owner web tasks remain: protect `main` with the CI check, squash-only merges + auto-delete branches, invite collaborators, CODEOWNERS handles, file the issue board (`docs/team-issue-board.md`) |
| 1 | Buying loop on mock data | ✅ 6/6 | CartProvider + honest caps, checkout delivery/pickup rules + ₹49 fee, wa.me order summaries, public browsing gate |
| 8 | Leaflet maps + honesty | ✅ 6/6 | `MapCanvas`/`SellerMap`/`DistanceBadge` · maps on home/seller/product · `useUserLocation` honest geolocation · Ernakulam gate. Commits `a672e25` → `db04a3b` |
| 2 | Supabase foundation | ✅ 7/7 | Schema + RLS + seed on live project; catalog reads and checkout/product/profile writes flow through Supabase via server routes; mock fallback preserved |
| 3 | Auth & roles | ✅ 7/7 | Real Supabase Auth (@supabase/ssr); cookie sessions surviving reload; RoleGuard on buyer/seller/admin; password reset; persistent profile; Become a Maker with Cashfree Easy Split payout KYC; admin moderation |
| 4 | Seller dashboard | ✅ 7/7 | Products CRUD + Storage uploads; DB-backed stock; session-scoped order inbox; 4-state status machine (`ready`/`delivered` → Phase 7); dashboard stats; store settings + payout status; isolation closed — identity from the session on every write route, payout KYC in a private table (0006 applied live), atomic stock RPC, 17/17 live isolation proof |

---

## Remaining phases — one commit per step

### Phase 2 — Supabase foundation

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Draw the real database | `0001_init.sql` mirrors types + payment fields + transactions ledger | ✅ done | feat(phase2): draw the real database schema | 2026-11-07 |
| 2 | Write security rules (RLS) | `0002_rls.sql` with documented access matrix | ✅ done | feat(phase2): add row level security | 2026-11-07 |
| 3 | Connect the app | real clients + `MADETRUE_DATA_SOURCE` switch, keys in `.env.local` | ✅ done | feat(phase2): connect Supabase behind a mock switch | 2026-11-07 |
| 4 | Seed the database | `seed.sql` recreates the mock catalog | ✅ done | feat(phase2): seed the catalog | 2026-11-07 |
| 5 | Move reads | listing/detail/seller/home via Supabase; UI unchanged | ✅ done | feat(phase2): move catalog reads to Supabase | 2026-11-07 |
| 6 | Move writes | orders/products/profile persist; localStorage writes removed | ✅ done | feat(phase2): move writes to Supabase through server routes | 2026-11-07 |
| 7 | Close the mock era | dead mock paths deleted; docs + `.env.example` updated | ✅ done | feat(phase2): close the mock era | 2026-11-07 |

**Phase done when:** a cold start with empty localStorage serves catalog, sellers, orders and profiles from Supabase — with the mock switch kept as fallback. **Met in closing step:** both data sources smoke green 11/11 on :4010; every mock export remains reachable as fallback (grep-verified); status mirrors synced (§10b).

### Phase 3 — Auth & roles

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Sign-up & sign-in | identifier + password screens; warm specific errors | ✅ done | feat(phase3): sign-up and sign-in screens | 2026-11-07 |
| 2 | Real sessions | Supabase sessions survive refresh; mock auth removed | ✅ done | feat(phase3): wire real Supabase Auth sessions | 2026-11-07 |
| 3 | Roles & guards | buyer/seller/admin guards + redirects tested | ✅ done | feat(phase3): role guards and unauthorized access blocks | 2026-11-07 |
| 4 | Password reset | email flow works in dev; friendly copy | ✅ done | feat(phase3): password reset flow and screens | 2026-11-08 |
| 5 | Real profile | name/phone/address persist per user | ✅ done | feat(phase3): real profile persistence for name phone and address | 2026-11-08 |
| 6 | Become a Maker | application + approval; payout KYC (PAN, bank) captured | ✅ done | feat(phase3): become a maker application and payout kyc | 2026-11-08 |
| 7 | Auth test pass | buyer/seller/admin journeys + logout/login green | ✅ done | feat(phase3): auth journey test pass and phase 3 closure | 2026-11-08 |

**Phase done when:** fresh buyer, seller and admin accounts each land on the right pages; sessions survive refresh; the onboarding form stores payout KYC for gateway vendor registration. **Met in closing step:** buyer, seller, and admin journeys verified across Supabase and mock modes; RoleGuard enforces boundaries; sessions survive refresh; KYC captured and visible in Admin console; §10b status mirrors synced.

### Phase 4 — Seller dashboard

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Products CRUD | create/edit/delete own products; images to Storage | ✅ done | feat(phase4): products crud and storage uploads | 2026-11-08 |
| 2 | Stock enforcement | DB-backed stock/availability; honest sold-out | ✅ done | feat(phase4): stock enforcement and honest sold-out states | 2026-11-08 |
| 3 | Order inbox | seller sees own orders only; tabs by status | ✅ done | feat(phase4): seller order inbox and status tabs | 2026-11-08 |
| 4 | Status actions | accept→ready→delivered persists; invalid rejected | ✅ done | feat(phase4): order status actions and transition enforcement | 2026-11-08 |
| 5 | Dashboard stats | today/total orders, revenue, pending — accurate | ✅ done | feat(phase4): wire dashboard stats | 2026-11-08 |
| 6 | Store settings | story/WhatsApp/location editable; payout status visible | ✅ done | feat(phase4): store settings and payout status | 2026-11-08 |
| 7 | Isolation test | seller A cannot read/modify seller B; proof documented | ✅ done | feat(phase4): isolation proof and payout privacy | 2026-11-08 |

**Phase done when:** a seller creates an image product, an order moves through real statuses, and two-seller isolation is proven with a query test. **Met in closing step:** isolation proven against the live project — 17/17 checks (12/12 API surface + 5/5 raw anon-key DB) green on a Supabase-mode build; migration 0006 applied via the Dashboard SQL Editor; full record in `docs/phase4-isolation-proof.md`; §10b mirrors synced.
**Step 4 scope note (owner decision, 2026-11-08):** the shipped 4-state machine (`pending → accepted → completed/cancelled`) is accepted as final for Phase 4; `ready`/`delivered` states are deferred to Phase 7 Step 1, as `0001_init.sql` states.
**Hotfix note (owner decision, 2026-11-08):** `GET`/`PATCH /api/sellers` return an explicit public column list — no `pan`/`bank_account_number`/`bank_ifsc`/`bank_account_holder`. Residual risk until Step 7's migration: the anon key can still read the `sellers` table directly (RLS grants `anon` select, `0002_rls.sql:282`), so Phase 4 Step 7 must move payout columns behind a private path (table or view + grant changes).

### Phase 5 — Admin console

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Admin guard | admin-only access via role; console login reworked | ⬜ pending | — | — |
| 2 | Seller management | list/verify/unverify; applications approve/reject | ⬜ pending | — | — |
| 3 | Product moderation | search/hide/unhide/remove with audit note | ⬜ pending | — | — |
| 4 | Order overview | global list + filters + detail view | ⬜ pending | — | — |
| 5 | Categories | CRUD; unique slugs; public nav reflects changes | ⬜ pending | — | — |
| 6 | Analytics | counts/GMV/top makers accurate vs queries | ⬜ pending | — | — |
| 7 | Audit trail | actor/entity/before-after summary recorded | ⬜ pending | — | — |

**Phase done when:** an admin can verify a seller, moderate a listing, trace any order, and see who changed what.

### Phase 6 — Payments: Cashfree Easy Split first

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Payment adapter & prerequisites | adapter interface merged; Cashfree account checklist; sandbox keys in `.env.local` (🔑 owner step if keys missing) | ⬜ pending | — | — |
| 2 | Seller vendor onboarding | sellers registered as Cashfree vendors (KYC + bank); pending/active shown; retry path | ⬜ pending | — | — |
| 3 | Split checkout | UPI/cards/netbanking; seller/commission/delivery-fee split correct; COD unchanged | ⬜ pending | — | — |
| 4 | Webhooks & payment states | verified idempotent webhooks; orders + ledger reflect states; abandoned payments expire | ⬜ pending | — | — |
| 5 | Refunds | full/partial via gateway API; states/ledger/UI/WhatsApp reflect | ⬜ pending | — | — |
| 6 | Settlements | settlement reports synced; seller paid/pending/settled view; commission report | ⬜ pending | — | — |
| 7 | Go-live | sandbox E2E pass; legal pages live; activation checklist; production keys | ⬜ pending | — | — |

**Phase done when:** a sandbox split order (UPI + card), a refund, and a vendor onboarding all pass end-to-end — and the owner has written pricing quotes + activation approval.

### Phase 7 — Order lifecycle & notifications

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Status machine | allowed transitions enforced; invalid rejected; documented | ⬜ pending | — | — |
| 2 | Buyer history | my-orders page with live statuses; pagination-ready | ⬜ pending | — | — |
| 3 | WhatsApp adapter | provider behind env; `wa.me` fallback; never blocks orders | ⬜ pending | — | — |
| 4 | Templates | placed/accepted/ready/delivered/refunded previews + sandbox sends | ⬜ pending | — | — |
| 5 | Cancellations | request→approve→refund via Phase 6 adapter; honest states | ⬜ pending | — | — |
| 6 | Delivery log | notification attempts logged; retries; honest failure copy | ⬜ pending | — | — |
| 7 | E2E journey | two-browser buyer+seller journey passes; no orphan states | ⬜ pending | — | — |

**Phase done when:** a full buyer→seller→delivery journey runs in two browsers with notifications firing (or honestly falling back to `wa.me`).

### Phase 9 — Trust, legal & scale

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Legal pages | terms/privacy/refund/shipping/contact live + footer links | ⬜ pending | — | — |
| 2 | SEO | titles/descriptions/OG images/sitemap/robots | ⬜ pending | — | — |
| 3 | Server rendering | public pages RSC where sensible; client JS reduced | ⬜ pending | — | — |
| 4 | Pagination & limits | listing pagination, query caps, image sizes | ⬜ pending | — | — |
| 5 | Accessibility | keyboard/focus/labels/contrast pass; fixes documented | ⬜ pending | — | — |
| 6 | Monitoring | Sentry + warm error boundaries | ⬜ pending | — | — |
| 7 | Backups & rate limits | backups verified; write throttling | ⬜ pending | — | — |

**Phase done when:** legal pages are gateway-ready, public pages are server-rendered, and monitoring/backup/limit wiring is live.

### Phase 10 — Reconciliation & launch

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Commission reconciliation | period reports reconcile commission/delivery fees/gateway costs | ⬜ pending | — | — |
| 2 | Refund automation | policy windows/partials automated + support playbook | ⬜ pending | — | — |
| 3 | Production deploy | Vercel prod + envs + custom domain + preview deploys | ⬜ pending | — | — |
| 4 | Identity finalization | DNS/HTTPS + WhatsApp business profile verified | ⬜ pending | — | — |
| 5 | Launch rehearsal | first real makers seeded; admin walkthrough; restore drill | ⬜ pending | — | — |
| 6 | Monitoring & runbook | alerts + support runbook | ⬜ pending | — | — |
| 7 | Soft launch & handover | invite-only launch, fixes, docs/credentials inventory | ⬜ pending | — | — |

**Phase done when:** real makers are onboarded, money reconciles, and the handover package (docs + runbook + credentials inventory) exists.

---

## Log

| Date | Step | Outcome |
|---|---|---|
| 2026-11-08 | Phase 4 closure ✔ | §10b status sync: Phase 4 added to Finished phases (✅ 7/7 — commits d154a85 → 0271e56, hotfix f45b2f9, merge 8925dc1); Current position moved to Phase 5 · Step 1/7 — Admin guard; mirrors refreshed in docs/master-build-prompt.md §5 + §6 FINISHED table, AGENTS.md "Current Status", README "Project status", PROJECT_OVERVIEW status header. Books-only turn — app untouched. |
| 2026-11-08 | Phase 4 owner actions ✔ | Migration 0006 applied to the live Supabase project via the Dashboard SQL Editor (verified with the API's own probes: `sellers.pan` now 42703 column-does-not-exist; `seller_payout_kyc` live and anon-blocked 42501, service-role-only; `decrement_product_stock` live, anon execute denied — was 404 missing before). Live isolation proof run against a Supabase-mode build of the Step 7 code: 17/17 checks passed (12/12 API surface: every guest write 401, approved-only catalog, no payout keys in seller rows; 5/5 raw anon-key DB: payout columns gone, orders/transactions unreadable) — exit 0, **no breaches found**. Private payout table started empty (no KYC rows to migrate). Proof documented with the live-run record in `docs/phase4-isolation-proof.md`; `.env.local` flipped to supabase for the run and restored to mock after. |
| 2026-11-08 | Phase 4 Step 7 ✔ | Isolation proof + payout privacy: session identity (`getServerUser`/`getOwnSellerId` in lib/supabase/server-auth.ts) now decides every API caller — orders (guest 401; seller/buyer receive only their own rows; payload buyer_id/`seller_id` ignored), products (guest catalog = approved-only, makers see own full rows, POST/PATCH/DELETE ownership-checked), upload (seller/admin only), profile (id+role forced from session — payload can no longer raise a role), sellers POST (user_id from session; payout fields now upserted to the private `seller_payout_kyc` table). Migration `0006_payout_privacy_and_stock_rpc.sql`: payout columns moved OUT of raw `sellers` (private table, RLS on, no policies, service_role-only grants — closes the 0002_rls.sql:282 anon residual for both anon and authenticated), plus atomic stock RPC `decrement_product_stock` (SELECT…FOR UPDATE; MT001/MT002) wired into checkout with guarded-update fallback; public debug route `/api/isolation-test` deleted; `scripts/isolationTest.ts` rewritten as a standalone HTTP proof (guest-401 matrix, approved-only catalog, no payout keys; layer B probes raw anon-key REST — orders/transactions unreadable); proof documented in `docs/phase4-isolation-proof.md`. tsc ✅ · eslint 0 errors / 33 warnings (−1 deleted route) · worktree build ✅ (20 routes) · smoke 11/11 on :4010 · proof script dry-run OK (mock skip, exit 2). OWNER ACTIONS: apply 0006 to the live Supabase project; run the proof in Supabase mode (commands in the doc). |
| 2026-11-08 | Phase 4 Step 6 ✔ | Store settings: dashboard gains a fourth tab — store name, WhatsApp, address, maker story and coordinates editable in place, with paste-a-Maps-link parsing (`parseGoogleMapsUrl`), honest geolocation detection, Reset Changes guard, and friendly error surfacing through `updateSellerProfile`'s thrown messages; payout state surfaced as a dedicated card (verified+`kyc_status=verified` → "Payouts Active" green, `failed` → red blocked, otherwise amber "Under Review"). Data layer: `updateSellerProfile` added to client.ts (mock path mirrors route validation — trims strings, requires name/WhatsApp, lat/lng finite + range-guarded) + `updateSellerProfileSupabase` in writeSupabase.ts (structured `{id, updates}` PATCH); `PATCH /api/sellers` rewritten around `getServerUser()` cookie session (new `lib/supabase/server-auth.ts`) — owner-or-admin only, `OWNER_EDITABLE_FIELDS` allow-list (business_name/story/whatsapp_number/address/lat/lng), verification fields admin-only, legacy admin console `{id, is_verified, kyc_status}` shape preserved. tsc ✅ · eslint 0 errors / 34 warnings (no new) · worktree build ✅ (21 routes) · smoke 11/11 on :4010. Owner commit pending. |
| 2026-11-08 | Phase 4 Step 5 ✔ | Dashboard stats: lib/utils/dashboardStats rewritten as pure computeDashboardStats (revenue = price × quantity + delivery_fee, cancelled excluded; "today" in the viewer's local day); dashboard derives the numbers with useMemo from the same myOrders the inbox shows and renders four palette StatsCards above the tabs (hidden while loading); StatsCard restyled to MADETRUE palette (was default slate); dead getDashboardStats/stats/setStats state removed; tsc ✅ · eslint 0 errors / 34 warnings (−4 unused) · worktree build ✅ (21 routes) · smoke 11/11 on :4010. Owner commit pending. |
| 2026-11-08 | Phase 4 hotfix ✔ | Security: `GET`/`PATCH /api/sellers` now select an explicit public column list (mirrors `SELLER_COLUMNS` in readSupabase.ts) — `pan`, `bank_account_number`, `bank_ifsc`, `bank_account_holder` no longer leave the service role via these routes. Verified consumers: Supabase-mode `getSellers()` reads directly with the same tight columns; the API GET had no in-app caller; admin PATCH response is only used for `business_name`/`is_verified`. Residual (queued for Step 7 migration): the anon key can still query the raw `sellers` table since RLS grants `anon` select (`0002_rls.sql:282`) — payout columns need a private path (dedicated table or barrier view + grant changes). Also recorded: Step 4's 4-state machine accepted as final for Phase 4; `ready`/`delivered` deferred to Phase 7 Step 1. |
| 2026-11-08 | Phase 4 Step 4 ✔ | Status actions: lib/utils/orderStatus defines state machine (pending → accepted → completed, plus cancelled; terminal states guarded); PATCH /api/orders validates seller ownership, enforces transition matrix with 400 errors, and restores product stock upon cancellation; writeSupabase & client.ts updated with updateOrderStatus; dashboard Order Inbox equipped with action controls (Accept Order, Mark Delivered / Ready & Picked Up, Cancel Order with confirmation) and feedback banners; in-place state and product stock updates; tsc ✅ · eslint 0 errors / 33 warnings · build ✅ (20/20 routes) · smoke 11/11 on :4010. Owner commit pending. |
| 2026-11-08 | Phase 4 Step 3 ✔ | Order inbox: seller order inbox scoped strictly to seller_id in both mock & Supabase paths (/api/orders?seller_id=...); dashboard navigation with order counter badge; status filter tabs (all, pending, accepted, completed, cancelled) with live counts; rich order cards with delivery details, item breakdown, and direct WhatsApp / Call actions; empty states for clean or zero matches; tsc ✅ · eslint 0 errors / 33 warnings · build ✅ (20/20 routes) · smoke 11/11 on :4010. Owner commit pending. |
| 2026-11-08 | Phase 4 Step 2 ✔ | Stock enforcement: app/api/orders updates is_available=false when stock hits 0; dashboard cards equipped with quick Restock (+10), Pause, and Resume controls keeping review status; honest Sold Out overlays & low-stock warnings wired across TrendingProducts, seller store, and product pages; cart flags sold-out items & gates checkout; checkout validates stock before dispatch; tsc ✅ · eslint 0 errors / 33 warnings · build ✅ (20/20 routes) · smoke 11/11 on :4010. Owner commit pending. |
| 2026-11-08 | Phase 4 Step 1 ✔ | Products CRUD: DELETE method on /api/products with owner validation & order constraint guard; GET filtering by seller_id; /api/upload route storing images in Supabase Storage product-images bucket with public URL; 0005_product_images_storage.sql migration; client & writeSupabase routers for deleteProduct, uploadProductImage, getProductsForSeller; dashboard wired with image uploading, live product list, delete confirmation, and cancel edit; tsc ✅ · eslint 0 errors / 33 warnings · build ✅ (20/20 routes) · smoke 11/11 on :4010. Owner commit pending. |
| 2026-11-08 | Phase 3 Step 7 ✔ + PHASE CLOSED | Auth test pass & Phase 3 closure: buyer/seller/admin journeys verified; sessions survive reload via cookies/storage; RoleGuard protects dashboard & admin console; password reset operational; real profile persists name/phone/address; Become a Maker captures Cashfree payout KYC; §10b status mirrors synced. Gates: tsc ✅ · eslint 0 errors / 36 warnings · build ✅ (19/19 routes). Owner commit pending. |
| 2026-11-08 | Phase 3 Step 6 ✔ | Become a Maker: Payout KYC fields on Seller & 0004_seller_payout_kyc.sql; /api/sellers route with user role elevation & column fallback; writeSupabase & client router for sellers; upgradeToSeller with Cashfree Easy Split KYC (PAN, bank, IFSC); Profile onboarding form & active status view; Admin panel KYC review & verification; Dashboard review banner; tsc ✅ · eslint 0 errors / 45 warnings · build ✅ (19/19 routes). Owner commit pending. |
| 2026-11-08 | Phase 3 Step 5 ✔ | Real profile: User & PersistProfile address field; 0003_user_address.sql; app/api/profile upsert with address/region fallback; updateUserProfile & AuthProvider support for name, phone, address with reload sync; Profile and Settings updated; Checkout auto-prefills saved address; tsc ✅ · eslint 0 errors / 45 warnings · build ✅ (18/18 routes). Owner commit pending. |
| 2026-11-08 | Phase 3 Step 4 ✔ | Password reset: AuthScreen forgot-password request view; Supabase Auth resetPasswordForEmail & dev mode mock links; dedicated /reset-password page with token recovery and new password reset; AuthProvider performPasswordReset & requestPasswordReset; tsc ✅ · eslint 0 errors / 45 warnings · build ✅ (18/18 routes). Owner commit pending. |
| 2026-11-07 | Phase 3 Step 3 ✔ | Roles & guards: RoleGuard component added; buyer access to /dashboard blocked with warm Maker Required screen & application CTA (unauthorized admin fetches prevented); non-admin access to /admin blocked with Administrator Access Only screen; admin login auto-routes admin users and provides context; tsc ✅ · eslint 0 errors / 45 warnings · build ✅ (17/17 routes). Owner commit pending. |
| 2026-11-07 | Phase 3 Step 2 ✔ | Real sessions: Supabase Auth integration via @supabase/ssr (onAuthStateChange, getSession, signOut, signInWithPassword, signUp with public.users sync); sessions survive refresh via cookies/storage; mock auth removed from live Supabase path and preserved as fallback; server-side cookie auth client created; tsc ✅ · eslint 0 errors / 46 warnings · build ✅ (17/17 routes). Owner commit pending. |
| 2026-11-07 | Phase 3 Step 1 ✔ | Sign-up & sign-in screens: identifier (email or phone with normalization) + password; warm specific validation and error messages; in-place login wall on checkout/dashboard/profile; dedicated /login and /signup routes with ?redirect= support; Navbar Sign In link on desktop & mobile drawer. tsc ✅ · eslint 0 errors / 46 warnings · build ✅ (17/17 routes). Owner commit pending. |
| 2026-11-07 | Phase 2 Step 7 ✔ + PHASE CLOSED | Step-code audit: zero dead mock paths (every mock export has a live caller — admin writes = Phase 5, upgrade-to-seller = Phase 3); `.env.example` switch docs finalized; §10b sync: prompt §5, AGENTS.md, README, PROJECT_OVERVIEW refreshed. Phase audit: tsc ✅ · eslint 0 errors / 47 warnings · worktree smokes on :4010: mock (no .env.local) 11/11 + supabase mode (real .env.local copied in, key wiped with worktree) 11/11. Owner commit pending. |
| 2026-11-07 | Phase 2 Step 6 ✔ | Writes via service-role server routes: `app/api/{orders,products,profile}` (order rows priced from the DB product w/ availability+stock checks, submissions pending, edit→pending only on content change, stock decremented with server guard; profile upserts users by id; dashboard list read-back moved). `saveOrders` router added to client.ts; checkout's inline localStorage write removed (warm errors now surface); profile saves persist via auth.ts router. `Order.delivery_fee` added to types. tsc OK, eslint 0 errors / 47 warnings (-1: checkout `err` now consumed); worktree smoke 11/11 on :4010, no `.env.local` (3 API routes present as ƒ). Commit pending. |
| 2026-11-07 | Phase 2 Step 5 ✔ | New `lib/supabase/readSupabase.ts` + routers in `client.ts`: 6 catalog reads (categories/sellers/products + by-id/by-seller, filters/sort in SQL, explicit nullable→undefined mapping) go to Supabase when `MADETRUE_DATA_SOURCE=supabase`; browser client for client components, server client via dynamic import only. Mock bodies untouched, zero page edits. tsc clean, eslint 0 errors / 48 warnings; worktree smoke 11/11 on :4010, no `.env.local`. Commit pending. |
| 2026-11-07 | Phase 2 Step 4 ✔ | `supabase/seed.sql` — 4 maker users → 5 categories → 4 sellers → 6 products with stable ids (`cat-1…`/`seller-1…`/`prod-1…`), verbatim mock values, `status='approved'`, base_price=price, commission=0, kyc left `not_started`, upsert-by-id (re-run safe). SQL only; tsc clean, eslint 0 errors / 48 warnings. Owner: paste into Supabase SQL editor. Commit pending. |
| 2026-11-07 | Phase 2 Step 3 ✔ | `@supabase/supabase-js` + `@supabase/ssr` installed; new `lib/supabase/{dataSource,supabase-browser,supabase-server}.ts` — switch defaults to mock, clients refuse to boot on mock/missing keys; mock paths + pages untouched; `.env.example` documents the switch. tsc clean, eslint 0 errors / 48 warnings; worktree build + smoke 11/11 on :4010 with NO `.env.local`. Owner commit pending. |
| 2026-11-07 | Phase 2 Step 2 ✔ | `supabase/migrations/0002_rls.sql` — catalog public read, sellers own rows, buyers create/read own orders, admin all, client-write guards. SQL only. tsc clean, eslint 0 errors / 48 warnings. Owner commit pending. |
| 2026-11-07 | Phase 2 Step 1 ✔ | `supabase/migrations/0001_init.sql` — tables, enums, payment fields, transactions ledger. SQL only. tsc clean, eslint 0 errors / 48 warnings. Owner commit pending. |
| 2026-11-06 | Phase 8 Step 6 ✔ (pre-tracker phase closure) | honest-geo sweep (listing/checkout/onboarding) + AGENTS.md docs closure — commit `db04a3b` |
| 2026-11-06 | Setup | master prompt v3 + this tracker created; AGENTS.md pointers added |
| 2026-11-07 | Setup | §10b status-sync protocol added (tracker, prompt §5, AGENTS, README, overview); README + PROJECT_OVERVIEW modernized |
