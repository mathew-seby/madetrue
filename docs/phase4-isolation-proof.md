# Phase 4 — Isolation Proof (Step 7)

**Scope:** seller A cannot read or modify seller B's data, and nobody can
reach payout secrets. Three layers carry this: the raw database (RLS +
column privacy), the API routes (session-derived identity), and the
checkout stock path (atomic RPC).

**Artifacts**
- Migration: `supabase/migrations/0006_payout_privacy_and_stock_rpc.sql`
- Proof script: `scripts/isolationTest.ts` (plain HTTP — runs against a
  live server and, with env keys set, against the raw database)
- Hardened routes: `app/api/{orders,products,profile,sellers,upload}/route.ts`,
  `app/api/sellers` (Step 6), identity helpers in `lib/supabase/server-auth.ts`
- Public debug route deleted: `app/api/isolation-test` (it leaked an
  unauthenticated 200/SUCCESS oracle of internal reader calls)

## How identity is decided

Every route that touches non-public data resolves the caller from the
**`@supabase/ssr` cookie session** (`getServerUser()` → `{id, role}`),
then derives ownership server-side (`getOwnSellerId()` →
`sellers.id where sellers.user_id = session user`). Nothing from the
request body or query string can name a seller, a buyer id, or a role —
supplying those values is harmless:

| Route | Method | Guest | Buyer | Seller | Admin |
|---|---|---|---|---|---|
| `/api/products` GET | read catalog | approved only | approved only | **own rows, all statuses** | all rows |
| `/api/products` POST | create | 401 | 403 | own store (id derived) | acting-as store |
| `/api/products` PATCH | edit | 401 | 403 | own only (403 otherwise) | allowed |
| `/api/products` DELETE | delete | 401 | 403 | own only (403 otherwise) | allowed |
| `/api/orders` GET | inbox/history | 401 | own orders | own orders | filtered view |
| `/api/orders` POST | checkout | 401 | allowed (buyer = session) | allowed | allowed |
| `/api/orders` PATCH | status moves | 401 | 403 | own orders only | allowed |
| `/api/upload` POST | storage | 401 | 403 | allowed | allowed |
| `/api/profile` POST | own profile | 401 | own (id = session) | own | own |
| `/api/sellers` PATCH | store settings | 401 | 403 | own store | allowed (verify too) |
| `/api/sellers` POST | maker application | 401 | own account role | own | own |

`role` is never accepted from a payload: `/api/profile` writes the
session's own role, so a buyer cannot become admin through their profile
save (the service-role client bypasses the 0002 role-guard trigger, which
makes the server the only thing that can set a role).

## Payout detail privacy (closes the hotfix residual)

The Step 5 hotfix stopped API responses from carrying payout columns, but
`0002_rls.sql:282` still granted `anon` direct `select` on raw
`public.sellers`, and the `sellers_public_read` policy allowed any
authenticated user to select any row — a direct Supabase query could still
fetch `pan` / `bank_*`. **0006 removes the secret columns from the public
table entirely:** they now live in `public.seller_payout_kyc`, which has
RLS enabled, zero policies, and grants for `service_role` only. The anon
key can no longer observe what no longer exists there; payout writes
happen server-side in `/api/sellers` POST.

## Atomic stock (locked decrement)

Checkout used read-stock-then-guarded-update; two concurrent buyers could
both pass the guard and oversell. `0006` adds
`public.decrement_product_stock(product_id, quantity)` — a security
definer function holding a `SELECT … FOR UPDATE` row lock whose check and
decrement are one statement block, raising `MT001` (bad quantity) and
`MT002` (not orderable) which the route maps to friendly errors.
`EXECUTE` is granted to `service_role` only; the route falls back to the
older guarded update if the function is not yet applied, so deploys never
break checkout.

## Query proof

Run against a reality-supabase app (owner step, needs `.env.local`):

```powershell
$env:MADETRUE_DATA_SOURCE = "supabase"   # app must be running on Supabase mode
node --experimental-strip-types scripts/isolationTest.ts http://localhost:3000
```

With raw-database layer (source `.env.local` first so
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` load):

```powershell
Get-Content .env.local | { $_ | ForEach-Object { if ($_ -match '^\s*([A-Z_]+)=(.*)$') { Set-Item -Path "env:$($Matches[1])" -Value $Matches[2].Trim('"') } } }
node --experimental-strip-types scripts/isolationTest.ts http://localhost:3000
```

**Layer A — API surface (guest, via the running app):** every mutating
route returns **401** — orders GET, orders POST (checkout), products
POST/PATCH/DELETE, orders PATCH, upload POST, profile POST, sellers
POST/PATCH; the guest catalog returns **approved rows only**; public
seller rows expose **no payout fields**.

**Layer B — raw database (anon key):** `sellers` rows contain **no
payout columns**; sellers column probe (`select=pan,bank_account_number`)
fails with *column does not exist* (42703); `orders` and `transactions`
are **unreadable** for anon (no select grant + RLS); visible product rows
are **approved only**.

Exit codes: `0` no breach · `1` breach (CI should fail) · `2` environment
unsupported (mock mode / keys missing — nothing was verified; the script
says so explicitly).

**Live run — 2026-11-08, against the real Supabase project (owner step executed):**
Migration `0006` applied via the project's SQL Editor, then the proof ran
against a Supabase-mode build of the Step 7 code: **17/17 checks passed —
12/12 API surface + 5/5 raw anon-key database, exit 0, no breaches.**
Highlights: every guest write refused with 401; guest and anon catalogs
return approved products only (6 rows); seller rows carry no payout
secrets at both layers; `seller_payout_kyc` and `decrement_product_stock`
verified live (anon blocked by permission — `42501`/401 — not by absence);
`select pan` on `sellers` now fails with `42703 column does not exist`,
closing the residual the Step 5 hotfix documented. The private table
started empty (no KYC rows existed to migrate).

## Cross-seller sessions (why the script "only" proves guest refusals)

A scripted seller-A session needs real credentials; proving A→B 403s
manually once per release is the owner journey step. The guarantee is
identical to the guest case because the ownership decision does not read
any request value: `getServerUser()` + `getOwnSellerId()` look the
allowed seller id up from the session, so a logged-in A **is** still
restricted to A's store. The RLS layer backs this up independently:
`orders_select_buyer_seller_admin` and `products_public_or_own_read` scope
every read, service-role routes being the sanctioned exception.

## Residual risks (accepted, tracked)

- RLS remains **not forced** for the `postgres` seed path (0002 remains
  deliberate here); application code must never use the anon key for
  anything besides catalog reads.
- Storage `product-images` is public-by-design (catalog visibility).
  Uploads are authenticated; filename predictability is not treated as a
  privacy risk at Phase 4.
- Order rows keep `buyer_id` opaque ids; an admin can read all orders by
  design (Phase 5 console).
