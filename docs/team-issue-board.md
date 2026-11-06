# MADETRUE — Team Issue Board (Phase 0 close-out)

_How to use: create one GitHub Issue per member (one card = one branch = one PR that
closes the issue). Copy each card body below into the issue description. Assign the
real `@handle` once each teammate accepts their invite, and tell me the handles so
the CODEOWNERS placeholders get filled._



---

## Card 1 — Repo governance close-out

**Owner:** Mathew Seby (@mathew-seby) · **Branch:** none (GitHub UI + settings)

### Body

Everything builds green in CI. What's left is locking down the grown-up workflow.

- [ ] **Settings → Collaborators:** invite the other 6 members; collect their GitHub handles in a comment here
- [ ] **Settings → Branches → protect `main`:** require a pull request, require status check **"Install, type-check, build"** (our CI job), no force pushes
- [ ] **Settings → General → Pull Requests:** allow **squash merge only**, enable **auto-delete head branches**
- [ ] Once CODEOWNERS handles are in: tick **"Require review from Code Owners"** in protection rules
- [ ] Optional (only before others clone): reword mislabeled commit `708ed25` (it's the CODEOWNERS file wearing the CI-workflow message)
- [ ] 375px visual QA pass of the whole app — homepage → products → detail → seller → cart → checkout (as guest) → login wall → dashboard → admin — note any layout break in new issues, not this one

**Definition of done:** protection + merge settings active, 7 collaborators joined, CODEOWNERS placeholders replaced, QA findings filed as separate issues.



---

## Card 2 — Team environment setup (assign ALL members)

**Owner:** everyone · **Branch:** none (local setup only) · everyone ticks their line

### Body

Welcome aboard. Do this before your first card — ~15 minutes.

- [ ] Install **Node.js ≥ 20.9.0** (22 preferred — same as CI, see `.nvmrc`)
- [ ] Clone into a **plain local folder — NOT OneDrive/Desktop-synced** (sync tools lock `.git` and `node_modules`)
- [ ] `npm ci`
- [ ] `npm run dev` → smoke test all 11 routes on :3000 and paste the status codes as a comment:
      `/` · `/products?category=spices` · `/products/prod-1` · `/sellers/seller-1` · `/cart` · `/checkout` · `/profile` · `/profile/settings` · `/dashboard` · `/admin/login` · `/admin` — all should be **200**
- [ ] `npx tsc --noEmit` clean · `npx eslint .` 0 errors
- [ ] Comment your **GitHub handle** on this issue (goes into CODEOWNERS)
- [ ] Read `AGENTS.md` top to bottom — it is the law of this repo (palette, copy tone, badges, 375px rule)

**Definition of done:** your name below turns into a checklist tick + handle comment.



---

## Card 3 — Navbar, Footer & CTA: hunt the dead ends

**Owner:** Joel Punnen (@joelpunnen) + @team-member-1 (shared UI + homepage)
**Suggested branch:** `feat/nav-footer-audit`

### Body

The frame of every page — make it so nothing on it lies or leads nowhere.

- [ ] Walk every link and CTA in **Navbar** (logo, links, cart badge, admin entry when logged in as admin, mobile menu at 375px), **Footer**, and the homepage **CTA** cards ("Support this Seller" / "Become a Seller" paths)
- [ ] Fix anything that goes nowhere or lies about where it goes (the EN/ML toggle persisting its choice in localStorage is enough for now — full Malayalam i18n is a later phase, note it in this issue, don't build it here)
- [ ] Mobile-first: design the fixes at 375px, no horizontal scroll, thumb-sized targets
- [ ] Warm copy rules apply — empty states are invitations, not errors

**Definition of done:** every visible control does something real; PR passes CI gates (`tsc`, `eslint` 0 errors, `build`) + 375px check per the PR template.



---

## Card 4 — Retire the dead wishlist hearts

**Owner:** @team-member-2 (shop surfaces) · coordinate with @joelpunnen for homepage Trending
**Suggested branch:** `fix/remove-dead-hearts`

### Body

Clicking some hearts does absolutely nothing — a trust product cannot afford fake buttons.

- [ ] Remove (or hide) the heart/wishlist buttons on the **product detail** page and the **seller profile** page — they render but have no handler
- [ ] Check **products listing** and homepage **TrendingProducts** for the same pattern (coordinate with joelpunnen — his area)
- [ ] Do NOT remove hearts that are purely decorative (e.g. the footer "made with ♥") — only fake *interactive* ones
- [ ] Leave the layout intact afterward: no holes, no orphaned padding — screenshot at 375px in the PR

**Definition of done:** zero interactive elements that do nothing; PR passes CI gates + 375px check.



---

## Card 5 — Checkout success: copy that tells the truth

**Owner:** @team-member-3 (+ @mathew-seby reviewing) · 
**Suggested branch:** `fix/checkout-success-copy`

### Body

The success screen currently says *"Your order has been registered in the database."*
That's not true — the mock data layer saves to localStorage on this device. Never let the
UI overclaim; buyers must be able to trust every word.

- [ ] Find the copy in `app/checkout/page.tsx` success state (Ctrl-F "registered")
- [ ] Rewrite it for the mock era, keeping it warm and specific. Suggested direction:
      *"Your order is saved on this device for now, and each maker has been pinged on
      WhatsApp below. We'll move this to a real account for you in the next release."*
- [ ] Scan the rest of cart/checkout for other over-claims (promises of receipts, emails, tracking that don't exist yet) and file separate issues for anything found
- [ ] 375px check of both states (form + success)

**Definition of done:** zero over-claims on the buying loop; PR passes CI gates.



---

## Card 6 — Profile & dashboard: no “Loading” as a lifestyle

**Owner:** @team-member-4 (dashboard + profile) · with @joelpunnen on dashboard
**Suggested branch:** `fix/inviting-empty-states`

### Body

Empty states should feel like an invitation, not an error (AGENTS.md, copywriting rules).

- [ ] `app/profile/page.tsx` "Your Story" block shows placeholder quotes around a literal `"Loading story..."` fallback — that never resolves for missing stories; replace with a warm "no story yet" state that nudges the maker to write one
- [ ] Sweep the profile and dashboard pages for other silent fallbacks (blank strings, dash-only placeholders, "…") and give them invitation-style copy in the same tone
- [ ] Keep typography/palette untouched; this is a copy + small-JSX card
- [ ] 375px check on both pages

**Definition of done:** no eternal "loading" fallback text on your pages; PR passes CI gates.



---

## Card 7 — Mock data integrity sweep

**Owner:** @team-member-5 (lib + types co-ownership) · **Suggested branch:** `chore/mock-data-integrity`

### Body

Everything on screen is fed by `lib/supabase/mockData.ts` until the Supabase phase. Bad
mock data = fake bugs and fake trust issues. Audit it completely.

- [ ] Every product `tags` array contains **only** the 5 official badge strings:
      `Same Day Delivery` · `Pickup Available` · `Fresh Today` · `Locally Made` · `Eco-Friendly`
- [ ] Every seller has a 10-digit Indian `whatsapp_number` and `lat`/`lng` inside Ernakulam
      district bounds (cross-check against `isInErnakulam` in `lib/utils/distance.ts`)
- [ ] Every product has ≥ 1 image URL, a price > 0, and stock as a whole number
- [ ] Post your findings as a comment first (even all-clear), then fix violations in `mockData.ts`
- [ ] Note: when handles arrive, the lead adds your github handle to the `/lib/` and `/types/` lines in `.github/CODEOWNERS`

**Definition of done:** findings posted; violations fixed; `npx tsc --noEmit` still clean; PR passes CI gates.
