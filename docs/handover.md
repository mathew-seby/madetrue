# MADETRUE — Launch Handover Package

> **Phase 10 · Step 7** — the final artifact of the build roadmap. What
> was built, what is live vs sandbox vs pending, the pre-launch gate, the
> invite-only launch plan, and the index of every runbook. Read this top
> to bottom before announcing anything.

---

## 1. The system in one page

| Piece | What it is | Where |
|---|---|---|
| **Buyer journey** | browse → product story + map → cart → checkout (COD; pickup single-maker) → `/orders` live tracking | `/`, `/products`, `/products/[id]`, `/cart`, `/checkout`, `/orders` |
| **Maker journey** | Become a Maker (with payout KYC) → dashboard: products CRUD + Storage photos, stock, order inbox, cancellations, store settings | `/login`, `/dashboard` |
| **Admin console** | role-guarded: sellers + applications + payout KYC review, product moderation, global orders, categories, analytics + reconciliation, audit trail, WhatsApp delivery log + retry | `/admin` |
| **Data** | Supabase: 14 migrations, RLS matrix, private `seller_payout_kyc`, service-role server routes only | `supabase/migrations`, `lib/supabase` |
| **Payments** | one adapter: COD today; Cashfree Easy Split behind `sandbox` | `lib/payments` |
| **WhatsApp** | universal adapter; `wa.me` fallback that never blocks an order; 7-event template family + delivery log | `lib/whatsapp` |
| **Trust & scale** | legal pages, dynamic SEO (sitemap/robots/OG), RSC pages, pagination caps, a11y pass, Sentry + warm boundaries, DR runbook + suites, proxy write-throttle, `/api/health` | `app/*`, `lib/*`, `proxy.ts` |

## 2. Honest state: live / sandbox / pending

| Area | State |
|---|---|
| Catalog, auth, orders, profiles (Supabase) | **live** |
| COD checkout, 5-state lifecycle, cancellations, stock restore | **live** |
| Domain `madetrue.in` + HTTPS + SEO on the final URL | **live** (per Steps 3–4 runbooks) |
| Monitoring: Sentry capture + boundaries + `/api/health` | **wired** — alert rule + uptime monitors = owner task |
| Cashfree Easy Split | **sandbox** — production keys at Phase 6 · Step 7 🔑 |
| WhatsApp automation | **wa.me fallback** — `twilio`/`wati` when a provider is real |
| Email (Resend) | **reserved** — backlog revisit |
| Launch rehearsal (W1–W12 + restore drill) | **deferred by owner — the pre-launch gate** |

## 3. The pre-launch gate (before ANY public announcement)

- [ ] Launch rehearsal executed: `docs/launch-rehearsal.md` Parts B–C (first real maker through W1–W12) — the owner's chosen deferral; nothing ships public before this.
- [ ] Restore drill results table filled (Part D) — RPO/RTO observed, not assumed.
- [ ] Admin account exists with role `admin` (Supabase → Users → Add user → SQL promote).
- [ ] Sentry alert rule proven by a received test email + uptime monitors on `/` and `/api/health` receiving one alert each (`docs/monitoring-and-support.md` Part A).
- [ ] `npx tsx scripts/verifyMonitoring.ts` + `npx tsx scripts/verifyBackups.ts` green.
- [ ] Legal pages read once by a human (terms, privacy, refund, shipping, contact).
- [ ] Rollback path rehearsed in the head: Vercel → Deployments → promote previous.
- [ ] Payments reality stated everywhere it matters: **COD only** until Phase 6 · Step 7 — no page or promise may imply online payment is live.

## 4. Invite-only soft launch

**There is no invite-gate in the code, on purpose** — public browsing is a
locked product decision (#2). "Invite-only" means: you choose who receives
the link first; nothing is announced until the gate above is green.

1. **Invite list:** the launch makers (from `scripts/launch-makers.json`) and
   their circles + a handful of friendly buyers from Mathew/Joel's networks.
2. **Maker invite copy** (WhatsApp/email, keep it warm):
   > "We built a small marketplace for makers around Kochi — your own store
   > page with your story, your photos, a map pin, and orders that reach you
   > on WhatsApp. Cash on delivery for now; card/UPI with automatic payouts
   > is coming next. Want in? Sign up here: https://madetrue.in/login →
   > Become a Maker. We'll walk your first listing together."
3. **Buyer invite copy:**
   > "Our neighbours are going online — real Kerala makers, real stories,
   > everything from within Ernakulam. Take a look: https://madetrue.in
   > (cash on delivery; free pickup from the maker, ₹49 delivery)."
4. **First week, daily (15 min):** Sentry issues · delivery-log failures ·
   the day's orders read like a story (anything odd?) · maker queue answered
   · uptime monitors quiet.
5. **First 10 orders by hand:** personally confirm each one's lifecycle
   end-to-end with the maker — this is the rehearsal continuing in public,
   gently.
6. **Fixes:** anything found goes into the tracker log and a small PR
   through the normal gates — nothing is deferred silently.

## 5. After soft launch (what remains)

| Item | Status |
|---|---|
| **Phase 6 · Step 7 🔑** — production Cashfree keys, `CASHFREE_ENV=production`, go-live checklist | the only remaining canonical step (owner-blocked on merchant activation) |
| Post-Phase-10 backlog (tracker): phone signup under "Confirm email", phone-identifier binding, Resend verification revisit | after launch, owner-approved |
| Phase 0 web tasks: branch protection, collaborators, issue board | owner |
| Scale later: `ready`-state pickup scheduling, delivery partner, review system | not started — decide with real data |

## 6. The document index

| Doc | Read it when |
|---|---|
| `docs/production-deploy.md` | deploying, env scopes, domain wiring, rollback |
| `docs/identity-verification.md` | DNS/HTTPS checks, WhatsApp business profile |
| `docs/launch-rehearsal.md` | onboarding real makers, walkthrough, restore drill |
| `docs/monitoring-and-support.md` | alerts, failure playbooks, severity ladder, weekly rhythm |
| `docs/credentials-inventory.md` | where every secret lives, rotation, leak procedure |
| `docs/backup-and-disaster-recovery.md` | backups, PITR, restore drills |
| `docs/refund-support-playbook.md` | refund/cancellation tickets, macros, escalation |
| `docs/order-lifecycle.md` | the 5-state machine and its rules |
| `docs/cashfree-setup-guide.md` | Phase 6 · Step 7 go-live path |
| `docs/team-issue-board.md` | open team issues (Phase 0 artifact) |
| `docs/build-progress.md` | the live truth — tracker + log |
| `docs/master-build-prompt.md` | the workflow itself (§8 commands, §10b sync) |

**Handover complete when:** the pre-launch gate (§3) is green, the first
invites are out, and the tracker log records the launch date. 🌿
