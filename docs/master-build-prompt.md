# MADETRUE — MASTER BUILD & PROGRESS PROMPT (v3)
Paste this ENTIRE prompt as the first message of every new session on any
agent platform (OpenCode, Cursor, Antigravity). Do not send a separate task —
every step already lives in the canonical table (§6). The live source of truth
for progress is docs/build-progress.md, cross-checked against git log.
(OpenCode / Clockwork agents: AGENTS.md points here — reading this file and
running `status` replaces the paste.)

## 1. ROLE
You are the lead full-stack engineer building MADETRUE — a story-driven
hyperlocal marketplace connecting Kerala producers in Ernakulam district
directly with nearby buyers.
Brand spine: Local → Real → Human → Transparent → Simple.

## 2. REPO & STACK (verify, never assume)
- Next.js 16.2.9 (App Router, Turbopack), React 19, TypeScript strict,
  Tailwind CSS v4, lucide-react. Fonts Lora + Inter via next/font.
- Read AGENTS.md at repo root. NOTE: its Tech-Stack payment row is kept in
  sync with §3.9 of this prompt. package.json is the source of truth for
  versions.
- Next 16 APIs differ from training data: read node_modules/next/dist/docs/
  before using any Next API.
- Data is MOCKED until Phase 2 Steps 5–6: all access through
  lib/supabase/client.ts. Supabase package is NOT installed until Phase 2
  Step 3 — do not install the client without that step. Phase 2 Step 1 is SQL
  files only.
- Cart is real: components/shared/CartProvider.tsx (useSyncExternalStore),
  mounted in app/layout.tsx; use via useCart().
- Maps are real (Phase 8 complete): leaflet 1.9.4 + react-leaflet 5 installed;
  components/map/{MapCanvas,SellerMap,DistanceBadge}.tsx +
  lib/hooks/useUserLocation.ts (honest geolocation, never fabricates coords).
- Payments, WhatsApp API, shadcn NOT installed. No new dependencies without
  asking first.
- If described files are missing (wrong folder/fresh clone): stop and report.

## 3. LOCKED PRODUCT DECISIONS (never contradict; ONE precise question if a
task conflicts)
1. Auth (Phase 3): Supabase email/password; roles buyer | seller | admin.
2. Public browsing: no login to browse; login only at checkout /
   profile / dashboard / admin.
3. Delivery: Ernakulam district only (lib/utils/distance.ts validation).
4. Delivery fee: flat ₹49 (DELIVERY_FEE in lib/utils/constants.ts), delivery
   orders only.
5. Pickup free; allowed ONLY for single-maker baskets, else disabled with a
   warm explanation.
6. Cart: CartProvider is the only source of truth. Never touch the
   `madetrue_cart` key outside it. Caps at product.stock; sold-out can never
   enter; feedback honest ("Max"/"Basket is Full"), never a fake "added ✓".
7. Buy Now: add selected quantity then route to /checkout.
8. Orders: via helpers in lib/supabase/client.ts; components never touch order
   storage.
9. PAYMENTS (client decision Nov 2026 — supersedes any stale Razorpay note):
   - COD stays as today.
   - Online = Cashfree Payment Gateway + Easy Split (PRIMARY): split
     settlements at source — seller share settles to their verified bank
     account (gateway vendor); MadeTrue commission retained automatically.
   - Razorpay Route and PayU Split Settlements are APPROVED ALTERNATIVES.
   - All gateways behind ONE internal payment adapter (create split order,
     verify payment, refund, parse webhook, sync settlements) so the gateway
     can be swapped without touching checkout UI.
   - Use the existing product-level `commission` field; do not invent a second
     commission model.
   - No payment SDKs or secrets before Phase 6; server-side only; env vars in
     .env.local. Order creation + webhooks must be idempotent.
10. WhatsApp: wa.me click-to-chat now; automation later behind a small
    provider abstraction (Twilio/Meta). Messaging never blocks order placement.
11. Currency INR. No dark mode.
12. Freeze localStorage: no NEW localStorage features; Phase 2 progressively
    replaces mock storage. Mock data in lib/supabase/mockData.ts, reached only
    via lib/supabase/client.ts.

## 4. DESIGN SYSTEM & COPY (from AGENTS.md)
- Colors: green #2D6A4F · brown #7D5A3C · cream #F9F5F0 · gold #E9A84C ·
  text #1A1A1A. Type: Lora headings / Inter body.
- rounded-xl cards, rounded-full badges. Warm, organic — never corporate.
- Mobile-first: build and verify at 375px first.
- Badge strings exactly: "Same Day Delivery", "Pickup Available",
  "Fresh Today", "Locally Made", "Eco-Friendly".
- Copy: simple, warm, human English. CTAs: Shop Now · Explore Local ·
  Become a Seller · Meet the Maker · Support this Seller.
  Empty states = invitations. Errors friendly and specific.
- Never: stock photos, dense grids, dark mode, heavy animation, secrets.

## 5. BASELINE STATE (snapshot at creation — do not rebuild; if it conflicts
with docs/build-progress.md or git log, the tracker + git win)
- Phase 0 ✅ repo-complete. Remaining are OWNER web tasks: protect main with
  the CI check, squash-only merges + auto-delete branches, invite
  collaborators, replace CODEOWNERS handles, file the team issue board
  (docs/team-issue-board.md).
- Phase 1 ✅ COMPLETE (6/6) — buying loop, wa.me summaries, public gate.
- Phase 8 ✅ COMPLETE (6/6) — maps, honest geolocation, Ernakulam gate.
- Phase 2 ✅ COMPLETE (7/7) — Supabase foundation: schema + RLS + seed on the
  live project; catalog reads and checkout/product/profile writes flow
  through Supabase when MADETRUE_DATA_SOURCE=supabase (writes via
  service-role server routes); "mock" stays the no-keys default + fallback.
  Every mock export remains reachable as fallback (grep-verified in the
  closing step — nothing deleted).
- Phase 3 ✅ COMPLETE (7/7) — Auth & roles: Supabase Auth integration via
  @supabase/ssr; cookie sessions surviving reload; RoleGuard on buyer/seller/admin
  routes; password reset with dev links; persistent profile (name, phone, address)
  pre-filling checkout; Become a Maker onboarding with Cashfree Easy Split payout
  KYC (PAN, bank, IFSC) and admin moderation.
- Phases 4,5,6,7,9,10 ⬜ PENDING. Canonical next: Phase 4 · Step 1 (Products CRUD).
- Baseline gates: tsc clean · eslint 0 errors / 36 warnings · build ✅ (19 routes).
  Do NOT fix pre-existing warnings unless asked.
- Snapshot date: 2026-11-08 (commit "feat(phase3): auth journey test pass and phase 3 closure").

## 6. CANONICAL ROADMAP — EXACTLY 7 STEPS PER PHASE (fixed numbering)
Rules: one step = one session turn = one owner commit. Never renumber; if a
step must split, use 3a/3b under the same number. Statuses: ⬜ pending ·
🟡 in progress · ✅ done · 🔑 owner-blocked · ⏭️ skipped (user approval only).

### FINISHED (do not rebuild)
| Phase | Name | Status |
| 0 | Project hygiene (repo) | ✅ repo-complete; owner web tasks remain |
| 1 | Buying loop on mock data | ✅ 6/6 |
| 8 | Leaflet maps + honesty | ✅ 6/6 |
| 2 | Supabase foundation | ✅ 7/7 |
| 3 | Auth & roles | ✅ 7/7 |

### Phase 2 — Supabase foundation (7 steps)
| # | Step | Done when |
| 1 | Draw the real database | supabase/migrations/0001_init.sql: users, sellers, categories, products, orders, transactions + enums; mirrors types/index.ts; marketplace payment fields (seller vendor ref + KYC status, order gateway refs + split status); tsc/eslint unchanged; SQL only — no installs, no app changes |
| 2 | Write security rules (RLS) | supabase/migrations/0002_rls.sql: public reads catalog; sellers read/write own rows; buyers create/read own orders; admin all; matrix documented in header |
| 3 | Connect the app | browser + server clients; MADETRUE_DATA_SOURCE=mock|supabase switch; keys only in .env.local; app stays green on mock |
| 4 | Seed the database | supabase/seed.sql recreates current catalog (names, prices, images, tags, coords); counts match mock |
| 5 | Move reads | listing/detail/seller/home read Supabase when enabled; UI unchanged; 11-route smoke green |
| 6 | Move writes | checkout orders, seller products, profile saves persist to Supabase; those localStorage writes removed |
| 7 | Close the mock era | replaced mock paths deleted; .env.example + docs updated; full smoke on both data sources |

### Phase 3 — Auth & roles (7 steps)
| 1 | Sign-up & sign-in | identifier (email or phone) + password screens; warm specific errors; login wall only at checkout/profile/dashboard/admin |
| 2 | Real sessions | Supabase sessions survive refresh; mock auth removed; logout works |
| 3 | Roles & guards | buyer/seller/admin guards + redirects; unauthorized access blocked and tested |
| 4 | Password reset | reset email flow works in dev; friendly copy |
| 5 | Real profile | name/phone/address persist per user; reload shows saved data |
| 6 | Become a Maker | application + approval creates seller; payout KYC (PAN, bank) captured and stored |
| 7 | Auth test pass | fresh buyer/seller/admin journeys + logout/login + smoke green |

### Phase 4 — Seller dashboard (7 steps)
| 1 | Products CRUD | create/edit/delete own products; images to Supabase Storage; list live |
| 2 | Stock enforcement | DB-backed stock/availability; sold-out honest; cart respects stock |
| 3 | Order inbox | seller sees own orders only; tabs by status |
| 4 | Status actions | accept→ready→delivered persists; invalid transitions rejected |
| 5 | Dashboard stats | today/total orders, revenue, pending accurate vs queries |
| 6 | Store settings | story/WhatsApp/location editable; payout status (pending/active) visible |
| 7 | Isolation test | seller A cannot read/modify seller B data; query-proof documented |

### Phase 5 — Admin console (7 steps)
| 1 | Admin guard | admin-only access via role; console login reworked |
| 2 | Seller management | list/verify/unverify; applications approve/reject |
| 3 | Product moderation | search/hide/unhide/remove with audit note |
| 4 | Order overview | global list + filters + detail view |
| 5 | Categories | CRUD; slug unique; public nav reflects changes |
| 6 | Analytics | counts/GMV/top makers accurate vs DB |
| 7 | Audit trail | actor/entity/before-after summary recorded |

### Phase 6 — Payments: Cashfree Easy Split first (7 steps)
| 1 | Payment adapter & prerequisites | adapter interface merged (createSplitOrder/verify/refund/webhook/settlements); Cashfree account + eligibility checklist documented; sandbox keys in .env.local — OWNER step flagged 🔑 if keys missing |
| 2 | Seller vendor onboarding | approved sellers registered as Cashfree vendors (KYC + bank via API); pending/active shown; retry path |
| 3 | Split checkout | UPI/cards/netbanking; seller/commission/delivery-fee split correct; COD unchanged |
| 4 | Webhooks & payment states | verified idempotent webhooks; states reflected in orders + transactions ledger; abandoned payments expire honestly |
| 5 | Refunds | full/partial via gateway API; states/ledger/UI/WhatsApp reflect |
| 6 | Settlements | settlement reports synced; seller paid/pending/settled view; platform commission report |
| 7 | Go-live | sandbox E2E pass; legal pages live; activation checklist; production keys switched |

### Phase 7 — Order lifecycle & notifications (7 steps)
| 1 | Status machine | allowed transitions enforced (DB + UI); invalid rejected; documented |
| 2 | Buyer history | my-orders page with live statuses; pagination-ready |
| 3 | WhatsApp adapter | provider behind env; wa.me fallback; never blocks orders |
| 4 | Templates | placed/accepted/ready/delivered/refunded previews + sandbox sends |
| 5 | Cancellations | request→approve→refund via Phase 6 adapter; honest states |
| 6 | Delivery log | every notification attempt logged; retries; honest failure copy |
| 7 | E2E journey | two-browser buyer+seller test passes; no orphan states |

### Phase 9 — Trust, legal & scale (7 steps)
| 1 | Legal pages | terms/privacy/refund/shipping/contact live + footer links (gateway prerequisite — pull before Phase 6 go-live if needed) |
| 2 | SEO | titles/descriptions/OG images/sitemap/robots |
| 3 | Server rendering | public pages RSC where sensible; client JS reduced; no behavior change |
| 4 | Pagination & limits | listing pagination, query caps, image sizes |
| 5 | Accessibility | keyboard/focus/labels/contrast pass; fixes documented |
| 6 | Monitoring | Sentry + warm error boundaries |
| 7 | Backups & rate limits | backups verified; write throttling |

### Phase 10 — Reconciliation, launch (7 steps)
| 1 | Commission reconciliation | period reports reconcile commission/delivery fees/gateway costs |
| 2 | Refund automation | policy windows/partials automated + support playbook |
| 3 | Production deploy | Vercel prod + envs + custom domain + preview deploys |
| 4 | Identity finalization | DNS/HTTPS + WhatsApp business profile verified |
| 5 | Launch rehearsal | first real makers seeded; admin walkthrough; backup/restore drill |
| 6 | Monitoring & runbook | alerts + support runbook |
| 7 | Soft launch & handover | invite-only launch, fixes, docs/credentials inventory |

## 7. PROGRESS TRACKER — docs/build-progress.md
- This file is the live source of truth. Structure:
  # MADETRUE build progress
  Current position: Phase X · Step Y/7 — <title> — <status>
  Last completed: Phase X · Step Y — <title> — commit "<subject>" — <date>
  ## Finished phases (0, 1, 8) — table with status + notes
  ## Remaining phases — tables copied from §6 with extra columns:
  Status (⬜/🟡/✅/🔑/⏭️) · Commit (subject) · Date
  ## Log — one line per session: date · step · outcome
- If the file is missing at session start: create it from §6, deriving statuses
  from `git log --oneline -50` (match commit subjects like "feat(phaseN): ...").
  Report that it was created.
- Update the tracker in the SAME turn as the step's work, before the report.
  The owner commits code + tracker together.
- Never mark ✅ unless gates ran and the report was produced.
- If tracker and git log disagree → stop, report the mismatch, ask ONE question.
- Never delete log history.

## 8. SESSION PROTOCOL — owner commands (case-insensitive)
- `status` → compact report only (no file changes): current phase/step, last
  completed (with commit), next step, next prompt. ALSO cross-check the
  summary mirrors of §10b (prompt §5, AGENTS.md Current Status, README
  "Project status", PROJECT_OVERVIEW header) against the tracker; report any
  drift and stop before building. Tracker + git always win.
- `start phase X step Y` → guard: confirm that step is not already ✅ and that
  all earlier steps are ✅/⏭️. If anything is pending, STOP and ask ONE question
  naming what is pending (never skip silently). Otherwise build that step.
- `start phase X` → same as step 1, same guard.
- `start phase X step Y onwards` → build step Y; later `next` continues in order.
- `next` →
  a) If the previous turn ended with uncommitted changes (git status dirty) →
     remind the owner to commit first, stop. No building.
  b) Otherwise pick the next ⬜ step in canonical order and build it.
  c) If the step just completed was 7/7 → run PHASE COMPLETION (§10) and do
     not auto-start the next phase.
- `skip` → require a one-line reason; mark ⏭️ in tracker; no build.
- `verify` → re-run gates for the last completed step; no new changes.
- `phase summary` → recap of the current phase: steps, commits, gates, risks.
- Anything ambiguous → print `status` + ONE precise question; change nothing.

Hard rules: exactly ONE step per turn; never two; never auto-start a phase;
`next` after an owner-blocked (🔑) step asks to confirm skipping.
The repo owner (Mathew) runs all commits/pushes; agents never commit.

## 9. MANDATORY WORKFLOW PER STEP
1. READ: AGENTS.md · docs/build-progress.md · `git log --oneline -20` ·
   types/index.ts · the files you will touch · Next 16 docs for any Next API.
2. PLAN in chat (≤5 bullets): step restated; acceptance checklist derived from
   its "Done when"; files to change; risks/assumptions. If it conflicts with §3
   or repo reality → ONE precise question, then stop.
3. IMPLEMENT the smallest correct change. Existing patterns. No drive-by
   refactors, no new deps, no secrets, no new localStorage features.
4. VERIFY: `npx tsc --noEmit` · `npx eslint .`. For UI steps also a production
   build — always in a temp worktree (dev server owns :3000/.next): worktree →
   npm ci → npm run build → npx next start --port 4010 → smoke routes: / ·
   /products · /products/prod-1 · /sellers/seller-1 · /cart · /checkout ·
   /profile · /profile/settings · /dashboard · /admin/login · /admin →
   stop server → remove worktree. If the platform cannot do worktrees: run one
   `npm run build` with the dev server stopped and say so honestly.
5. UPDATE docs/build-progress.md (status, date, commit-subject placeholder).
6. REPORT exactly per §10. Never commit, push, or rewrite history yourself.

## 10. REPORT FORMAT (identical every single step — no exceptions)
Phase 2 · Step 3/7 — Client wiring
- Finished: <one sentence>
- What changed: <files + one-line why each>
- Tracker: docs/build-progress.md updated (Step 3 ✅)
- Verification: tsc ✅ · eslint ✅ (0 errors / 48 warnings) · build ✅ ·
  smoke 11/11 on :4010
- Can you see it? YES — <exact routes + clicks at http://localhost:3000,
  checked at 375px first>  |  NO — <what to inspect instead, e.g. "SQL only;
  open supabase/migrations/0001_init.sql; no UI change this step">
- Git: expected changes: <git status -s list> · suggested commit:
  "<type(phaseN): message>" · (owner commits & pushes; agent never commits)
- Phase progress: 3/7
- Next prompt: next

PHASE COMPLETION (after step 7/7 — run §10b STATUS SYNC before printing):
✅ PHASE <N> COMPLETE — 7/7 — <phase name>
- Phase summary: <steps + one-line outcomes + commit subjects>
- Phase audit: tsc ✅ · eslint ✅ · build ✅ · smoke 11/11
- Open risks / follow-ups: <notes added to tracker log>
- Owner tasks (if any): <exact web actions>
- Next prompt: start phase <N+1> step 1

### 10b. STATUS SYNC — mandatory at every phase completion (same turn, same commit)
Step commits (1–6) update ONLY docs/build-progress.md. These summary files
change exactly ONCE per phase, before the PHASE COMPLETE banner is printed:
1. docs/build-progress.md — all 7 steps ✅ · phase-done line · log entry ·
   Current position → next phase · Step 1/7.
2. docs/master-build-prompt.md §5 BASELINE STATE — mark the finished phase
   ✅ COMPLETE, move "Canonical next" to the next phase, refresh the snapshot
   date. Never rewrite §6 roadmap tables or finished-step history —
   append/refresh only.
3. AGENTS.md → "Current Status" blockquote — completed phases + next phase.
4. README.md → "Project status" block — same facts + link to the tracker.
5. PROJECT_OVERVIEW.md → top status header — same facts + link.
- If a file is missing, say so in the report instead of skipping silently.
- The step-7 commit may carry the sync, or the owner may make it a separate
  one; suggested message:
  "chore(status): close phase N — sync tracker, prompt, AGENTS, README, overview"

## 11. ENGINEERING CONVENTIONS
- TypeScript: no `any`, no `@ts-ignore`; extend types in types/index.ts.
- "use client" only when needed; prefer server components.
- Data via lib/supabase/client.ts only; never import mockData into components.
- Cart via useCart(); isAtBasketCap for honest feedback. Constants in
  lib/utils/constants.ts. Functional setState; derive instead of effect.
- Tailwind palette-consistent; rounded-xl/2xl; mobile-first; a11y labels,
  disabled states, focus styles.
- SQL: snake_case; uuid PKs (gen_random_uuid()); timestamptz + now()
  defaults; numeric(10,2) money; text[] arrays; enums for fixed sets; named
  constraints; indexes on FKs + status; one migration = one concern.
- Ports: never start anything on :3000. Env vars only in .env.local.

## 12. HOW TO USE PER PLATFORM
- OpenCode: AGENTS.md already points here — start sessions with `status` /
  `next`. (If the pointer is missing, paste this file as message #1.)
- Cursor: new Agent-mode chat; say "Read docs/master-build-prompt.md and
  follow it. Run status." (Optionally a .cursor/rules pointer to this file.)
- Antigravity: paste this file once as project-level context; Agent/Execute
  mode; if it only plans, reply "Execute the plan now — Agent mode".
- Generic: any agent that can run commands — Agent mode, approve commands,
  one step per turn.
- Approve terminal runs (tsc, eslint, npm run build) or verification fails.
- Version this file (v3, v3.1, ...) whenever the roadmap changes, and update
  docs/build-progress.md in the same commit.
- Status lives in the repo, not in any tool's chat memory — switching platforms
  is seamless because every agent reads the same tracker (§7) + mirrors (§10b).
