# MADETRUE — Launch Rehearsal Runbook

> **Phase 10 · Step 5** — the first real makers are onboarded, the full
> admin walkthrough passes, and a backup/restore drill is executed with
> evidence. Two inputs belong to the **owner**: the real maker details
> (Part B) and the Supabase/Vercel consoles (Parts C–D). Everything is
> written down so the step is executable top-to-bottom — tick as you go.
>
> The rehearsal runs against the **live project** (`madetrue.in`, Vercel +
> Supabase). Demo seed rows (`seller-1`…`prod-6`) stay in place; real
> launch makers are added beside them.

---

## Part A — Pre-flight (everything green before touching data)

| # | Check | Where | Pass when |
|---|---|---|---|
| A1 | Migrations applied | Supabase → SQL Editor history / Table Editor | `0009_admin_audit`, `0010_order_lifecycle`, `0011_order_status_backfill`, `0012_order_cancellations`, `0013_notification_delivery_logs`, `0014_users_from_auth` all present (0010 then 0011 ran in **separate** executions) |
| A2 | Identity green light | `docs/identity-verification.md` | A1–A7 pass; Meta business verified; display name approved; number registered; admin sandbox send returned `sent` (or the honest wa.me fallback is consciously accepted for launch) |
| A3 | Production smoke | `docs/production-deploy.md` §5 | The 11-check post-deploy smoke is green on `https://madetrue.in` |
| A4 | Local tooling ready | repo root | `.env.local` carries `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; `npx tsx scripts/verifyBackups.ts` exits 0 |
| A5 | Money boundaries | `docs/production-deploy.md` §2 | `CASHFREE_ENV` is still `sandbox` — the rehearsal places **COD** orders only; nothing touches real settlements until Phase 6 · Step 7 🔑 |

Anything red → fix it first and log it in `docs/build-progress.md`. The
rehearsal must not start with silent failures (same rule as Step 4).

---

## Part B — The launch-maker sheet (real data, never committed)

1. Copy the template:
   `cp scripts/launch-makers.template.json scripts/launch-makers.json`
2. Fill it with the **first real makers** — actual names, the story in the
   maker's own words, a WhatsApp number that answers, a real street address
   inside **Ernakulam district**, real coordinates (Google Maps → right-click
   → copy lat/lng), and listings with honest prices and stock.
3. **Photos:** every product carries at least one `https://` image of the
   real item — photos the maker sent (host them anywhere reachable, or leave
   the array empty and let the maker upload via their dashboard, which keeps
   the listing `pending` until it is photographed and approved). No stock
   photography standing in for someone's produce — that is the brand rule,
   not a preference.
4. **Passwords:** the sheet holds the makers' starting passwords because the
   script provisions their auth accounts. `scripts/launch-makers.json` is
   git-ignored — **never commit it, never paste it into chat**. Share each
   password privately with the maker and have them change it later.
5. `payout_kyc` is optional: fill PAN/bank only when already in hand. The
   Cashfree vendor registration itself waits for Phase 6 · Step 7.
6. The script refuses placeholder values (`REPLACE…`, `TODO`, `<…>`), unknown
   category slugs, non-badge tags, weak passwords and coordinates outside the
   Ernakulam box (warning) — a bad sheet fails **before** anything is written.

Field reference:

| Field | Required | Notes |
|---|---|---|
| `name`, `email`, `password`, `phone` | ✅ | The maker's login identity (`email_confirm` is set true — no confirmation round-trip) |
| `business_name`, `story`, `whatsapp_number`, `address`, `lat`, `lng` | ✅ | The public storefront; story is what buyers read first |
| `profile_photo_url` | — | Empty → the app's default avatar until the maker uploads a real one |
| `payout_kyc.*` | — | Private `seller_payout_kyc` table only (0006); never on the public seller row |
| `products[]` | — | `category` must be an existing slug (add new ones in the console's Categories tab first); `tags` only the exact badge strings; `approve_immediately` defaults **false** so the walkthrough approves them |

---

## Part C — Seed + admin walkthrough

### C1. Run the seed

```bash
npx tsx scripts/seedLaunchMakers.ts --dry-run   # validates against the live project, writes nothing
npx tsx scripts/seedLaunchMakers.ts             # real run
```

What the live run does per maker:

1. Creates the Supabase Auth account (email + password, confirmed).
2. The `0014` trigger guarantees the `public.users` profile row; the script
   then aligns name/phone and sets `role = 'seller'` (the same service-role
   update `POST /api/sellers` performs).
3. Inserts the `sellers` row with `is_verified: false`,
   `kyc_status: 'not_started'`, `application_status: 'pending'` — **nothing
   self-approves**; the console work below is the point.
4. Optional payout KYC → the private `seller_payout_kyc` table.
5. Inserts listings with `base_price = price`, `commission = 0`; unphotographed
   listings are forced `status: 'pending'`.

Re-run safety: existing auth users are reused, store details refresh while
**verification/application state is untouched**, and listings are matched by
(seller + name) so nothing duplicates.

### C2. Admin walkthrough (console by console)

Do this on production (`https://madetrue.in/admin`). Record ✓/✗ per row —
failures are logged, never smoothed over.

| # | Walk | Console path | Pass when |
|---|---|---|---|
| W1 | Guard holds | open `/admin` signed out | redirected to `/admin/login` |
| W2 | Application arrives | console → **Sellers** → tab *Pending* | each launch maker listed with their real story and address |
| W3 | Approve application | Sellers → the maker's card → **Approve** | `application_status` → `approved`; maker moves to the approved list |
| W4 | Verify the store | Sellers → **Verify** toggle | `is_verified` → true, `kyc_status` → `verified`; store is publicly visible |
| W5 | Audit trail wrote it down | console → **Audit** | one entry per action (application approved, store verified) with actor, entity, before → after |
| W6 | Approve listings | console → **Products** → tab *Pending Approval* | each seeded listing visible; approve it (and hide/reject nothing by accident) |
| W7 | Catalog truth | `https://madetrue.in/products` + `/sellers/{maker}` | the maker's goods and story render; map pin sits in Ernakulam; badges exactly as tagged |
| W8 | Maker lands home | sign the maker in with their sheet credentials → `/dashboard` | maker dashboard shows their store, listings (pending + approved), accurate stats; Store Settings editable |
| W9 | First real order | a buyer account orders one of the maker's goods (COD) → maker accepts → marks ready → delivered | status machine holds end-to-end; `/orders` reflects each hop; the maker inbox kept up |
| W10 | Notifications honest | console → **WhatsApp** tab → delivery log | every attempt logged (`fallback` while the provider is unconfigured — honest, never blocking); retry works |
| W11 | Cancellation lifecycle | buyer requests cancellation on a *second* pending order → maker approves | stock restored, status `cancelled`, refund copy honest (COD → no gateway refund) |
| W12 | Reconciliation sees it | console → **Analytics** + `/api/settlements?period=30d` | GMV/order counts moved; the rehearsal order appears in the maker row; status `partial_data` is expected while gateway costs stay untracked (Phase 6 · Step 7) |

The rehearsal orders **stay in the order book** — they are the platform's
first real activity and the reconciliation baseline. Mark their context
(buyer name "Rehearsal") so the story is readable later.

### C3. Green light (record in the tracker log)

W1–W12 pass · the makers are publicly live with real photos · zero silent
failures. Anything failed: fix, re-walk that row, and note it in
`docs/build-progress.md`.

---

## Part D — Backup / restore drill (evidence, not trust)

Execute the procedures of `docs/backup-and-disaster-recovery.md` and **write
down what actually happened**:

1. **Dump (§4 of the DR runbook):** full logical dump + the critical
   financial data-only dump. Store them **outside the repo** (e.g.
   `../madetrue-backups/`), timestamped.
2. **Read the dump back:** open it, confirm `CREATE TABLE public.orders`,
   `public.transactions`, `public.seller_payout_kyc`, `public.admin_audit`,
   `public.notification_logs` and `auth.users`'s dump section exist; row
   counts match the live Table Editor for the launch tables.
3. **Restore path (the actual drill):** provision a **scratch Supabase
   project** (free tier is fine), apply all 14 migrations in sequence
   (`0001` → `0014`), then import the dump. Verify: row counts, a signed-in
   launch maker (auth survives the import), and one product visible.
   *If a scratch project is genuinely unavailable this rehearsal, run the
   schema-only restore (§4.2) into the scratch DB and say so honestly in the
   results table — do not tick "restore verified".*
4. **Automated suite:** `npx tsx scripts/verifyBackups.ts` exits 0 on the
   restored project's repo checkout (or on the main one, with the restore
   evidence recorded here).
5. **Record the drill:**

| Measure | Target | Observed | Notes |
|---|---|---|---|
| Dump duration (full) | — | ___ | |
| Restore duration (migrations + import) | RTO < 30 min | ___ | |
| Data loss window in the drill | RPO < 1 h | ___ | last dump → incident timestamp |
| Payout KYC present in restore | yes | ___ | private table imported intact |

---

## Part E — Done when

- [ ] Launch-makers sheet filled with real data; seed ran live; re-run proven idempotent.
- [ ] W1–W12 all ✓ with the audit trail + delivery log as witnesses.
- [ ] Restore drill executed with the results table filled.
- [ ] Tracker log carries the rehearsal record; failures (if any) listed there.
- [ ] Owner tasks left for later steps are named in `docs/build-progress.md`.

Then Phase 10 · Step 6 (alerts + support runbook) can start.
