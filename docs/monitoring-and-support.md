# MADETRUE — Monitoring & Support Runbook

> **Phase 10 · Step 6** — how MADETRUE watches itself and how the team
> responds when something breaks. Pairs with
> `docs/backup-and-disaster-recovery.md` (data incidents),
> `docs/refund-support-playbook.md` (money tickets) and
> `docs/production-deploy.md` §6 (rollback). Nothing here invents
> infrastructure: every check names what actually exists today.

---

## Part A — What is wired right now

| Signal | Where it lives | What it catches |
|---|---|---|
| Exception capture (client, server, edge) | `sentry.*.config.ts` + `instrumentation.ts` (`onRequestError`) | every unhandled render/API error on production |
| Warm error boundaries | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` | user-visible crashes are reported **and** the user gets a warm page, not a white screen |
| Fail-safe capture helpers | `lib/monitoring/index.ts` (`captureException`, `captureMessage`) | app code reports errors without ever breaking an order |
| Health ping | **`GET /api/health`** | `200` `{ ok, dataSource, database }` when serving + data reachable; `503` when the database is unreachable (mock mode reports `database: "mock-mode"`) |
| Notification delivery log | admin console → **WhatsApp** tab (migration `0013`) | silent WhatsApp failures with honest reasons + a retry hub |
| Money truth | admin **Analytics** → period reconciliation (Phase 10 · Step 1) | commission/fee/gateway variances with the offending order ids |
| Audit trail | admin → **Audit** | who changed what (moderation, verification, refunds) |
| Automated suites | `scripts/verifyMonitoring.ts` · `scripts/verifyBackups.ts` · `scripts/verifyReconciliation.ts` · `scripts/verifyRefundPolicy.ts` · `scripts/verifyPhase7Journey.ts` | wiring/policy drift before launch |

### A1. Owner task — turn the signals into alerts (Sentry dashboard)

Sentry only emails when a rule says so. Once (≈ 10 minutes):

1. sentry.io → the MADETRUE project → **Alerts → Create alert**.
2. Type **"Issue"** · environment **production** · conditions:
   *a new issue is created* AND *the issue affects ≥ 1 user* (skip the
   user condition only if project is new and user counts stay low).
3. Frequency **once per hour** (a Kerala marketplace does not need
   minute-level pages; it needs "by the time you open your laptop, it's there").
4. **Connect notifications** → email `madetrue.in@gmail.com`
   (+ the team's Slack/Discord webhook if the team prefers chat).
5. Save, then prove it: deploy a known test error on a **preview** deploy
   (or use the Sentry "Send test event" in project settings) and confirm
   the email arrives. Record the confirmation in the tracker log.

### A2. Owner task — uptime monitor (free tier is enough)

`/` alone can be cached and lie. Watch **two** endpoints:

| Monitor | URL | Interval | Alert on |
|---|---|---|---|
| Site | `https://madetrue.in` | 5 min | non-200 |
| Health | `https://madetrue.in/api/health` | 5 min | non-200 (the `503` case = Supabase unreachable) |

UptimeRobot or BetterStack free tiers both do this. Point the
notifications at the same inbox as the Sentry alerts. No paid SMS paging
exists — that is an honest gap for launch week, not a blocker: the team
is two people who see their email.

---

## Part B — The four realistic failures (playbooks)

### B1. Site down
1. `https://madetrue.in/api/health` — 200 + `database: "up"`? The app is
   fine; the report is DNS (→ `docs/identity-verification.md` A1–A7).
2. 503 or timeout → check **Supabase status** (status.supabase.com) first;
   data incidents follow the DR runbook, outages resolve with Supabase.
3. Vercel: **Deployments** — did the latest production deploy break it?
   → **Promote the previous deployment** (§6 of `docs/production-deploy.md`),
   instant, no rebuild. Debug the bad commit on a branch/preview afterwards.
4. Buyers waiting: post a short, honest note via the support WhatsApp
   status/message — "we're on it, orders are safe". Never silence.

### B2. Checkout / payments failing
1. Reproduce with a **COD** order first — COD bypasses the gateway; if COD
   fails too it is app/DB, not Cashfree.
2. Online failing: check the admin order book + `transactions` ledger for
   the attempt. The adapter surfaces typed errors; the order stays honest
   (`split_status`, `pending`).
3. **`CASHFREE_ENV` stays `sandbox` until Phase 6 · Step 7 🔑** — never
   "temporarily" flip to production keys to fix a checkout incident.
4. If the gateway itself is degraded, say so to the buyer and offer COD —
   the checkout UI already treats online as optional, never blocking.

### B3. WhatsApp silent
1. Admin console → **WhatsApp** tab → delivery log: filter *Failed*.
2. Read the honest reason (unapproved template, unregistered recipient,
   wrong FROM number) → fix the cause → **Retry Send**.
3. `fallback` entries are **not failures** — no provider is wired yet
   (`wa.me` click-to-chat is carrying launch). They only become failures
   once `WHATSAPP_PROVIDER` is set.
4. Standing rule, still true in an incident: WhatsApp never blocks an
   order. A silent WhatsApp is an S2, not an S1.

### B4. Data mistake
1. Follow `docs/backup-and-disaster-recovery.md` §6 — PITR for "deleted the
   wrong rows", Scenario B only for a full rebuild.
2. State the incident time **before** restoring; restore to `T − 2 minutes`.
3. After any restore: `npx tsx scripts/verifyBackups.ts` + a manual look at
   the order book and the maker queue. Log what was lost (if anything) in
   the tracker — honesty over tidiness.

---

## Part C — Severity ladder & the support desk

| Level | Meaning | Examples | Response |
|---|---|---|---|
| **S1** | money, data, or the whole site | site down, double-charged buyer, payout KYC leaked, DB restore needed | **immediately**, both of you (Mathew + Joel), fix first, post-mortem after |
| **S2** | a feature is broken; orders still flow | WhatsApp silent, one page erroring, maker inbox glitch | same day |
| **S3** | cosmetic / copy | typo, badge looks off | weekly batch |

- **Desk:** WhatsApp `+91 8876789131` + `madetrue.in@gmail.com` — the
  channels on every order card, the contact page and the footer
  (`COMPANY_DETAILS`). Hours **9:00 AM – 7:00 PM IST, Mon–Sat**; outside
  hours an auto-reply sets the expectation ("we answer in the morning").
- **Ticket macros:** the refund/cancellation answers live in
  `docs/refund-support-playbook.md` — quote `REFUND_TIMELINE_COPY`
  ("5–7 working days via Cashfree") and the 24-hour damage copy
  **verbatim**; the policy engine already decided the money.
- **Escalation paths:** buyer refunds → the playbook's §3 flow; maker
  disputes → admin console order view (shows the policy window and money
  per order); system mismatch → Analytics reconciliation report.
- **Grievance route** (terms page): the Grievance Officer is the contact
  above; complaints about moderation carry the audit trail as evidence.

## Part D — The weekly rhythm (15 minutes, Monday)

1. **Sentry:** open issues triaged (acknowledge / fix / dismiss with reason).
2. **Delivery log:** any *Failed* rows → retried with the cause fixed.
3. **Reconciliation:** run the period report (`/api/settlements?period=30d`);
   any new `variance` gets an explanation or a ticket.
4. **Audit skim:** last week's moderation actions read like a story — if a
   row surprises you, that is the finding.
5. **Suites:** `npx tsx scripts/verifyMonitoring.ts` + `npx tsx scripts/verifyBackups.ts` green.
6. **Maker queue:** pending applications answered (a maker waiting > 2 days
   is a churned maker).

## Part E — Green light for Step 7

- [ ] Sentry alert rule live and **proven** by a received test email.
- [ ] Uptime monitors on `/` + `/api/health` created and notifications received once.
- [ ] `npx tsx scripts/verifyMonitoring.ts` exits 0.
- [ ] Support desk knows the severity ladder and where the macros live.
- [ ] The rehearsal gate from Step 5 still applies before any public announcement.
