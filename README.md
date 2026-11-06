# MADETRUE 🌿

Connect Kerala's local makers — spice farmers, artisans, home kitchens — with the
neighbors who love them. Story-driven, trust-first, and mobile-first at heart.

## Tech (today)

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Tailwind CSS 4**
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
variables the future phases (Supabase, Razorpay, WhatsApp) will introduce.

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
