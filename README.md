# MADETRUE 🌿

Connect Kerala's local makers — spice farmers, artisans, home kitchens — with the
neighbors who love them. Story-driven, trust-first, and mobile-first at heart.

## Project status

- ✅ **Phase 0** — repo hygiene · ✅ **Phase 1** — buying loop on mock data ·
  ✅ **Phase 8** — Leaflet maps + honest geolocation ·
  ✅ **Phase 2** — Supabase foundation (schema, RLS, seed; catalog reads and
  checkout/product/profile writes behind the `MADETRUE_DATA_SOURCE` switch,
  with mock kept as the no-keys fallback) ·
  ✅ **Phase 3** — Auth & roles (real Supabase Auth sessions, RoleGuard,
  password reset, persistent profile prefilling checkout, Become a Maker
  onboarding with Cashfree Easy Split payout KYC and admin moderation) ·
  ✅ **Phase 4** — Seller dashboard (products CRUD + Storage uploads, DB-backed
  stock, session-scoped order inbox, dashboard stats, store settings, and the
  isolation close-out: payout KYC behind a private table, atomic stock RPC,
  session-derived identity on every write route, 17/17 live proof) ·
  ✅ **Phase 5** — Admin console (real admin session guard via role, seller
  verification with private payout KYC review, product moderation with search/hide/unhide
  and audit notes, global order overview, categories CRUD with live public nav,
  platform analytics, and durable moderation audit trail)
- ▶️ **Now: Phase 6 — Payments: Cashfree Easy Split first** (payment adapter & prerequisites,
  seller vendor onboarding, split checkout, webhooks & states, refunds, settlements, go-live)
- Live tracker: [`docs/build-progress.md`](./docs/build-progress.md). The
  workflow and phase-completion status-sync rules live in
  [`docs/master-build-prompt.md`](./docs/master-build-prompt.md) (§10b).
- This block is refreshed by the agent at every phase completion — no manual upkeep.

## Tech (today)

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS 4**
- **Leaflet 1.9.4 + react-leaflet 5** — nearby-seller and maker maps on free
  OSM tiles (no API keys, no `.env` entries needed for maps)
- **Mock data layer** — the app persists everything to browser `localStorage`
  (`madetrue_*` keys) until the Supabase phase wires real data. No `.env` needed yet.

## Requirements

- [Node.js](https://nodejs.org) **≥ 20.9.0** — the team standard is **22**, pinned in `.nvmrc`

## Getting started

```bash
git clone https://github.com/mathew-seby/madetrue.git
cd madetrue
npm ci        # exact install from package-lock.json (run npm install if no lockfile yet)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and browse like a buyer: products,
maker stores, the basket — no login wall until checkout. See `.env.example` for the
variables the future phases (Supabase, Cashfree, WhatsApp) will introduce.

## Handy commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build (Turbopack) |
| `npx tsc --noEmit` | Type-check only |
| `npx eslint .` | Lint — CI fails on errors, tolerates warnings |

## Team workflow (the short version)

- Small PRs that each close one issue; CI gates lint + type-check + build on every push
- Build UI at **375px first**, then scale up — palette, badge strings, and copy rules
  live in [`AGENTS.md`](./AGENTS.md), the project's master context. Read it before shipping.
- If data "went missing", clear localStorage: DevTools → Application → Local Storage →
  delete the `madetrue_*` keys and reload.

## Deploy

Frontend deploys to Vercel; the backend lands with the Supabase phase. No deploy
configuration is needed yet.
