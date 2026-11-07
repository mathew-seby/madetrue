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

**Current position:** Phase 2 · Step 5/7 — Move reads — ⬜ pending
**Last completed:** Phase 2 · Step 4/7 — Seed the database — commit "feat(phase2): seed the catalog" — 2026-11-07
**Baseline gates (last session):** tsc ✅ · eslint ✅ (0 errors / 48 warnings) · 11-route production smoke ✅

---

## Finished phases

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Project hygiene (repo) | ✅ repo-complete | Owner web tasks remain: protect `main` with the CI check, squash-only merges + auto-delete branches, invite collaborators, CODEOWNERS handles, file the issue board (`docs/team-issue-board.md`) |
| 1 | Buying loop on mock data | ✅ 6/6 | CartProvider + honest caps, checkout delivery/pickup rules + ₹49 fee, wa.me order summaries, public browsing gate |
| 8 | Leaflet maps + honesty | ✅ 6/6 | `MapCanvas`/`SellerMap`/`DistanceBadge` · maps on home/seller/product · `useUserLocation` honest geolocation · Ernakulam gate. Commits `a672e25` → `db04a3b` |

---

## Remaining phases — one commit per step

### Phase 2 — Supabase foundation

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Draw the real database | `0001_init.sql` mirrors types + payment fields + transactions ledger | ✅ done | feat(phase2): draw the real database schema | 2026-11-07 |
| 2 | Write security rules (RLS) | `0002_rls.sql` with documented access matrix | ✅ done | feat(phase2): add row level security | 2026-11-07 |
| 3 | Connect the app | real clients + `MADETRUE_DATA_SOURCE` switch, keys in `.env.local` | ✅ done | feat(phase2): connect Supabase behind a mock switch | 2026-11-07 |
| 4 | Seed the database | `seed.sql` recreates the mock catalog | ✅ done | feat(phase2): seed the catalog | 2026-11-07 |
| 5 | Move reads | listing/detail/seller/home via Supabase; UI unchanged | ⬜ pending | — | — |
| 6 | Move writes | orders/products/profile persist; localStorage writes removed | ⬜ pending | — | — |
| 7 | Close the mock era | dead mock paths deleted; docs + `.env.example` updated | ⬜ pending | — | — |

**Phase done when:** a cold start with empty localStorage serves catalog, sellers, orders and profiles from Supabase — with the mock switch kept as fallback.

### Phase 3 — Auth & roles

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Sign-up & sign-in | identifier + password screens; warm specific errors | ⬜ pending | — | — |
| 2 | Real sessions | Supabase sessions survive refresh; mock auth removed | ⬜ pending | — | — |
| 3 | Roles & guards | buyer/seller/admin guards + redirects tested | ⬜ pending | — | — |
| 4 | Password reset | email flow works in dev; friendly copy | ⬜ pending | — | — |
| 5 | Real profile | name/phone/address persist per user | ⬜ pending | — | — |
| 6 | Become a Maker | application + approval; payout KYC (PAN, bank) captured | ⬜ pending | — | — |
| 7 | Auth test pass | buyer/seller/admin journeys + logout/login green | ⬜ pending | — | — |

**Phase done when:** fresh buyer, seller and admin accounts each land on the right pages; sessions survive refresh; the onboarding form stores payout KYC for gateway vendor registration.

### Phase 4 — Seller dashboard

| # | Step | Milestone (short) | Status | Commit | Date |
|---|---|---|---|---|---|
| 1 | Products CRUD | create/edit/delete own products; images to Storage | ⬜ pending | — | — |
| 2 | Stock enforcement | DB-backed stock/availability; honest sold-out | ⬜ pending | — | — |
| 3 | Order inbox | seller sees own orders only; tabs by status | ⬜ pending | — | — |
| 4 | Status actions | accept→ready→delivered persists; invalid rejected | ⬜ pending | — | — |
| 5 | Dashboard stats | today/total orders, revenue, pending — accurate | ⬜ pending | — | — |
| 6 | Store settings | story/WhatsApp/location editable; payout status visible | ⬜ pending | — | — |
| 7 | Isolation test | seller A cannot read/modify seller B; proof documented | ⬜ pending | — | — |

**Phase done when:** a seller creates an image product, an order moves through real statuses, and two-seller isolation is proven with a query test.

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
| 2026-11-07 | Phase 2 Step 4 ✔ | `supabase/seed.sql` — 4 maker users → 5 categories → 4 sellers → 6 products with stable ids (`cat-1…`/`seller-1…`/`prod-1…`), verbatim mock values, `status='approved'`, base_price=price, commission=0, kyc left `not_started`, upsert-by-id (re-run safe). SQL only; tsc clean, eslint 0 errors / 48 warnings. Owner: paste into Supabase SQL editor. Commit pending. |
| 2026-11-07 | Phase 2 Step 3 ✔ | `@supabase/supabase-js` + `@supabase/ssr` installed; new `lib/supabase/{dataSource,supabase-browser,supabase-server}.ts` — switch defaults to mock, clients refuse to boot on mock/missing keys; mock paths + pages untouched; `.env.example` documents the switch. tsc clean, eslint 0 errors / 48 warnings; worktree build + smoke 11/11 on :4010 with NO `.env.local`. Owner commit pending. |
| 2026-11-07 | Phase 2 Step 2 ✔ | `supabase/migrations/0002_rls.sql` — catalog public read, sellers own rows, buyers create/read own orders, admin all, client-write guards. SQL only. tsc clean, eslint 0 errors / 48 warnings. Owner commit pending. |
| 2026-11-07 | Phase 2 Step 1 ✔ | `supabase/migrations/0001_init.sql` — tables, enums, payment fields, transactions ledger. SQL only. tsc clean, eslint 0 errors / 48 warnings. Owner commit pending. |
| 2026-11-06 | Phase 8 Step 6 ✔ (pre-tracker phase closure) | honest-geo sweep (listing/checkout/onboarding) + AGENTS.md docs closure — commit `db04a3b` |
| 2026-11-06 | Setup | master prompt v3 + this tracker created; AGENTS.md pointers added |
| 2026-11-07 | Setup | §10b status-sync protocol added (tracker, prompt §5, AGENTS, README, overview); README + PROJECT_OVERVIEW modernized |
