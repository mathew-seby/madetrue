# MADETRUE — Credentials Inventory

> **Phase 10 · Step 7** — where every secret lives, what it does, its
> launch status, and how to rotate it. **This file never contains secret
> values** — only names, locations and owners. Secrets live in Vercel's
> Environment Variables dashboard, the Supabase/Sentry/Cashfree dashboards
> and the git-ignored `.env.local`. If a value isn't in those places, it
> shouldn't exist.

---

## 1. The rules (unchanged since Phase 2, restated once)

- **Never commit** `.env.local` (git-ignored since day one) and never paste
  a key into chat, tickets or screenshots.
- Values are added **only** in dashboards (Vercel per-scope, Supabase,
  Sentry, Cashfree, GoDaddy) or locally by the owner into `.env.local`.
- If a secret leaks: **rotate first**, then investigate, then explain.
  Rotation paths per row below. A leaked service-role key means the
  Supabase keys are regenerated **and** the Vercel scopes are updated in
  the same sitting, followed by a redeploy.
- Every row has one **rotation owner** (the person whose dashboard it is).

## 2. Environment variables

| Variable | Purpose | Lives in | Launch status | Rotate | Owner |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (public) | Vercel (Prod·Prev·Dev) + `.env.local`; Supabase → Settings → API | **live** | Rarely; new project = new URL | Mathew |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key (RLS-limited) | same | **live** | Rotate with service key | Mathew |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** write key (bypasses RLS) | Vercel (all scopes) + `.env.local` only | **live** | Supabase → Settings → API → *Regenerate*; then update Vercel + redeploy | Mathew |
| `MADETRUE_DATA_SOURCE` / `NEXT_PUBLIC_MADETRUE_DATA_SOURCE` | `mock \| supabase` switch (both, in sync) | Vercel (all scopes) + `.env.local` | **live** (`supabase`) | Config change, not a secret | Mathew |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (`https://madetrue.in`) for sitemap/robots/OG | Vercel **Production only** | **live** | Only if the domain ever changes | Mathew |
| `CASHFREE_APP_ID` | Easy Split app id (client-safe) | Vercel (all scopes) + `.env.local` | **sandbox** | Rotate at go-live | Mathew |
| `CASHFREE_SECRET_KEY` | **Server-only** gateway secret | Vercel (all scopes) + `.env.local` | **sandbox** | Cashfree dashboard → regenerate | Mathew |
| `CASHFREE_WEBHOOK_SECRET` | Verifies webhook signatures (idempotent route) | Vercel (all scopes) + `.env.local` | **sandbox** | same | Mathew |
| `CASHFREE_ENV` | `sandbox` \| `production` | Vercel (all scopes) | **sandbox** — flip to `production` only at Phase 6 · Step 7 🔑 | go-live event | Mathew |
| `WHATSAPP_PROVIDER` | blank = honest `wa.me` fallback; `twilio`/`wati` when chosen | Vercel (all scopes) + `.env.local` | **blank (by design)** | set when a provider is real | Mathew |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp adapter | Vercel + `.env.local` | **blank** — Twilio console when chosen | Twilio dashboard | Mathew |
| `WATI_ENDPOINT` / `WATI_API_TOKEN` | WATI WhatsApp adapter | Vercel + `.env.local` | **blank** — WATI console when chosen | WATI dashboard | Mathew |
| `RESEND_API_KEY` | Email delivery (reserved — verification revisit, tracker backlog #3) | `.env.local` when used | **reserved** | Resend dashboard | Mathew |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Error reporting (browser + server) | Vercel (all scopes) + `.env.local` | **live** (per `docs/production-deploy.md` §2) | Sentry → new DSN on project change | Mathew |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Source-map upload targeting | Vercel (all scopes) | **live** | config | Mathew |
| `SENTRY_AUTH_TOKEN` | Sentry build token (**server-only**) | Vercel (all scopes) + `.env.local` | **live** | Sentry → Settings → Auth Tokens → revoke/create | Mathew |

DB connection string for `pg_dump` backups (DR runbook §4): Supabase →
Project Settings → Database → Connection string — **owner secret**, used
from the owner's machine only, rotated via Supabase → Database →
reset database password.

## 3. Accounts & domains (not env vars, still credentials)

| Account | Purpose | Where | Notes |
|---|---|---|---|
| GitHub `mathew-seby/madetrue` | Source + CI + PR previews | github.com | branch protection/squash settings = Phase 0 owner task; collaborators: Mathew, Joel |
| Vercel project `madetrue` | Hosting, prod + preview deploys | vercel.com | env scopes per §2; rollback = promote previous deploy |
| Supabase project | Postgres + Auth + Storage + PITR | supabase.com/dashboard | 14 migrations applied; backups per DR runbook |
| GoDaddy `madetrue.in` | Domain + DNS | godaddy.com | apex A + www CNAME → Vercel (values from Vercel's Settings → Domains) |
| Sentry org/project | Error alerts | sentry.io | alert rule + uptime monitors = Step 6 owner tasks |
| Cashfree merchant | Easy Split payments | dashboard.cashfree.com | **sandbox until Phase 6 · Step 7**; production keys there |
| Meta Business + WABA | WhatsApp business identity | business.facebook.com | verification/display-name path = `docs/identity-verification.md` Part B |
| Support WhatsApp `+91 8876789131` + `madetrue.in@gmail.com` | The public desk | — | `COMPANY_DETAILS`; number registration per identity runbook B2 |
| Admin account (Supabase Auth) | Console access | Supabase → Authentication → Users | **create + promote role `admin`** before launch (tracker owner note) |

## 4. Leak/emergency procedure

1. Rotate the leaked key in its own dashboard (row above).
2. Update every Vercel scope → **Redeploy** (envs are baked at build).
3. Update `.env.local` locally (never chat).
4. Check for abuse while rotating (Supabase logs, Cashfree dashboard,
   Sentry for odd error spikes, admin audit trail for odd console actions).
5. Record the incident in `docs/build-progress.md` — honestly, with dates.

## 5. Handover state

- New joiners get: repo access (GitHub), Vercel **Preview** scope, Sentry
  read access, and this document. Production secrets stay with the owners
  until the team grows beyond two.
- Review this inventory at every rotation event and at each phase close —
  the next natural review is Phase 6 · Step 7 (production Cashfree keys).
