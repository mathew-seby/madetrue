# MADETRUE — Production Deploy Runbook (Vercel + madetrue.in)

> Phase 10 · Step 3 — production deploy readiness. The domain **`madetrue.in`**
> is registered (GoDaddy). Everything in §1–§3 is an **owner web task** done in
> the Vercel dashboard and the GoDaddy DNS editor — no code changes. This
> document is the exact sequence; follow it top to bottom once. When done,
> tick the §5 smoke list. HTTPS verification itself + WhatsApp business
> profile belong to Step 4.

## 0. Prerequisites (already in place)

- GitHub repo (`mathew-seby/madetrue`) with `main` protected and squash
  merges (Phase 0 convention). Node 22 is pinned in `.nvmrc` — Vercel reads
  it automatically; nothing to configure.
- Supabase project keys (Phase 2), Cashfree **sandbox** keys (Phase 6 —
  production keys stay 🔑 blocked until Step 7 unblocks), Sentry org +
  project (Phase 9).
- GoDaddy account access for `madetrue.in` DNS.

## 1. Import the project into Vercel (one-time)

1. vercel.com → **Add New → Project → Import** `mathew-seby/madetrue`.
2. Framework preset: **Next.js** (auto-detected, 16.2.9). Build command and
   output stay default (`next build`, Turbopack). Do not override.
3. Root directory: repo root. Install command: default (`npm ci`).
4. Project name: `madetrue`.
5. Add the environment variables from §2 **before** the first production
   deploy, then hit **Deploy**. The first build may take a few minutes.

## 2. Environment variables (Settings → Environment Variables)

Set each variable in the scopes marked — **Production / Preview /
Development**. Values come from the team's `.env.local` (which mirrors
`.env.example`). Never commit secrets; add them in the dashboard only.

| Variable | Scope | Value | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Prod · Prev · Dev | Supabase → Settings → API | Public — safe in the browser bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod · Prev · Dev | Supabase → Settings → API | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod · Prev · Dev | Supabase → Settings → API | **Server-only secret** — never `NEXT_PUBLIC_` |
| `MADETRUE_DATA_SOURCE` | Prod · Prev · Dev | `supabase` | Server switch |
| `NEXT_PUBLIC_MADETRUE_DATA_SOURCE` | Prod · Prev · Dev | `supabase` | Public copy of the switch |
| `NEXT_PUBLIC_SITE_URL` | **Production only** | `https://madetrue.in` | Leave unset on Preview — `lib/utils/constants.ts` falls back to the deployment's `VERCEL_URL`, so OG/sitemap links stay honest per preview |
| `CASHFREE_APP_ID` | Prod · Prev · Dev | sandbox app id | Stays sandbox until Phase 6 · Step 7 |
| `CASHFREE_SECRET_KEY` | Prod · Prev · Dev | sandbox secret | Server-only |
| `CASHFREE_WEBHOOK_SECRET` | Prod · Prev · Dev | sandbox webhook secret | Server-only |
| `CASHFREE_ENV` | Prod · Prev · Dev | `sandbox` | Flip to `production` only at Step 7 |
| `WHATSAPP_PROVIDER` | Prod · Prev · Dev | *(blank for now)* | Blank = honest `wa.me` click-to-chat fallback; set `twilio`/`wati` + credentials only when a provider is chosen |
| `SENTRY_DSN` | Prod · Prev · Dev | Sentry project DSN | Server-side error capture |
| `NEXT_PUBLIC_SENTRY_DSN` | Prod · Prev · Dev | same DSN | Browser error capture |
| `SENTRY_ORG` | Prod · Prev · Dev | Sentry org slug | Lets the build upload source maps |
| `SENTRY_PROJECT` | Prod · Prev · Dev | Sentry project slug | ↑ |
| `SENTRY_AUTH_TOKEN` | Prod · Prev · Dev | Sentry auth token | ↑ — without it builds warn and skip source maps |
| `RESEND_API_KEY` | — | *(skip for now)* | Only when an email phase consumes it |

System variables `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` and the
Vercel URL envs are injected automatically — never set them by hand.

## 3. Custom domain — `madetrue.in` (GoDaddy → Vercel)

1. Vercel project → **Settings → Domains** → add `madetrue.in`, then
   `www.madetrue.in`. Choose **Redirect www → apex** (or apex → www — one
   canonical host keeps SEO clean; pick apex).
2. Vercel shows the exact DNS values required — **always use what
   Settings → Domains displays** (Vercel assigns per-project addresses; do
   not copy IPs from other projects or old blog posts). Typically:
   - Apex `@` → **A** record → the displayed Vercel IP
     (historically `76.76.21.21`).
   - `www` → **CNAME** → the displayed target
     (historically `cname.vercel-dns.com`).
3. In GoDaddy: **My Products → DNS → DNS Records**. Delete GoDaddy's
   parking A/CNAME records, add the two records above. Leave GoDaddy
   nameservers as they are — this keeps email/DNS control with GoDaddy.
   *(Optional alternative: point nameservers at Vercel and it manages all
   records automatically; only do this if the team prefers Vercel DNS.)*
4. Wait for propagation (minutes up to 48 h; usually fast). Vercel issues
   the SSL certificate automatically — the domain status turns
   **"Valid Configuration"** with HTTPS.
5. If `NEXT_PUBLIC_SITE_URL` was not set before the first deploy, set it
   now (§2) and trigger a **Redeploy** (Deployments → latest → Redeploy)
   so metadataBase/sitemap/robots/OG emit `https://madetrue.in`.

## 4. Preview deploys (automatic)

- Every push to any branch and every pull request gets its own preview URL
  and a Vercel check on the PR — this pairs with the Phase 0 squash-merge
  convention: branch → preview review → squash to `main` → production
  deploy on merge (the default "Production Branch" is `main`).
- Previews use the same env table above (with `NEXT_PUBLIC_SITE_URL`
  unset). Cashfree stays sandbox on previews — test payments never touch
  real money.
- Gate merges on the Vercel check alongside the repo CI check (owner
  setting; pairs with the Phase 0 branch-protection task).

## 5. Post-deploy smoke — run once on `https://madetrue.in`

| # | Check | Expect |
|---|---|---|
| 1 | `/` home | Makers + categories load from Supabase (`MADETRUE_DATA_SOURCE=supabase`) |
| 2 | `/products` → `/products/{id}` | Catalog, story section, maker map render |
| 3 | `/sellers/{id}` | Maker profile + store catalog |
| 4 | `/cart` → `/checkout` (signed-in buyer) | COD order places; row lands in Supabase `orders` |
| 5 | `/orders` | Order visible with live status |
| 6 | Maker dashboard | New order in the maker inbox |
| 7 | `/sitemap.xml`, `/robots.txt` | URLs read `https://madetrue.in` |
| 8 | Auth | Sign in / out; session survives refresh (HTTPS cookies) |
| 9 | Sentry | A forced test error appears in the Sentry dashboard |
| 10 | Rate limit | 6 rapid writes to an API route → HTTP 429 (Phase 9 throttle live) |
| 11 | Cashfree sandbox | A sandbox UPI payment completes (optional until Step 7 unblocks production keys) |

## 6. Rollback

- Vercel → **Deployments** → pick the previous production deployment →
  **⋯ → Promote to Production**. Instant, no rebuild.
- Data lives in Supabase and is untouched by rollbacks — see
  `docs/backup-and-disaster-recovery.md` for backup/restore drills.

## 7. Items deliberately left to later steps

- **Step 4:** verify HTTPS certificate status end-to-end + WhatsApp
  business profile verification (needs the live domain + provider).
- **Phase 6 · Step 7 🔑:** switch `CASHFREE_ENV` + keys to production
  after merchant activation, then redeploy.
- **Step 7 (handover):** copy the final credentials inventory from §2 into
  the handover package.
