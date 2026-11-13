# MADETRUE — Identity Verification Runbook (DNS/HTTPS + WhatsApp)

> Phase 10 · Step 4 — identity finalization. Everything here is an **owner
> web task** done in the Vercel dashboard, the GoDaddy DNS editor and the
> Meta Business suite. This document is the exact checklist — work top to
> bottom and tick as you go. Brand facts come from
> `lib/utils/constants.ts` (`COMPANY_DETAILS`): copy them **verbatim**
> into every form so MADETRUE reads identically everywhere.

## Part A — DNS & HTTPS (`madetrue.in`)

Prerequisite: §3 of `docs/production-deploy.md` is done (domain added in
Vercel, records entered in GoDaddy).

| # | Check | How | Pass when |
|---|---|---|---|
| A1 | Both hosts valid | Vercel → Settings → Domains | `madetrue.in` **and** `www.madetrue.in` show **"Valid Configuration"** |
| A2 | Certificate live | open `https://madetrue.in` | padlock shown; certificate issued for `madetrue.in` (auto-renewed by Vercel) |
| A3 | Canonical redirect | `curl -I https://www.madetrue.in` | 301/308 → `https://madetrue.in` (the canonical host chosen in Step 3) |
| A4 | Apex serves the app | `curl -I https://madetrue.in` | 200 with `server: Vercel` |
| A5 | Metadata on the final domain | open `/sitemap.xml` and `/robots.txt` | URLs read `https://madetrue.in` (requires `NEXT_PUBLIC_SITE_URL` set on Production + a redeploy *after* the domain went live) |
| A6 | OG card renders | share `https://madetrue.in` in WhatsApp or Slack | MADETRUE preview card appears (`opengraph-image`) |
| A7 | Real-world DNS | phone on **mobile data** (not Wi-Fi) | the site opens on `https://madetrue.in` — rules out local DNS caching |

Fix-ups: A3–A5 failing → confirm `NEXT_PUBLIC_SITE_URL=https://madetrue.in`
on Production and **Redeploy**. A1 showing "Invalid Configuration" →
re-check the A/CNAME values exactly as Vercel's Settings → Domains
displays. If the number `+91 8876789131` is currently your **personal**
WhatsApp and you prefer a dedicated business number instead, that choice
belongs here — see the note under B2 step 4 before registering.

## Part B — WhatsApp business profile verified

The app ships a universal WhatsApp adapter (`lib/whatsapp/`): `none`
(blank = honest `wa.me` click-to-chat fallback), `twilio`, `wati`.
"Verified" means: business verified with Meta, **display name approved**,
number registered, and an admin sandbox send returning `sent` with a
provider reference. (The optional Meta Verified green checkmark is a
paid extra — display-name approval is the requirement.)

### B1. Meta Business verification (one-time)

1. business.facebook.com → create/claim the business:
   - Legal name: **MADETRUE PRIVATE LIMITED COMPANY**
   - Address: **Kochi, Kerala, India - 682001**
   - Email: **madetrue.in@gmail.com** · Phone: **+91 8876789131**
   - Website: **https://madetrue.in**
2. Security Center → **Start Verification** → submit Indian company
   documents (company registration / GST as applicable). Business
   verification is required in India for WhatsApp Business Platform use.
3. Wait for Meta's approval (typically a few days) — it unlocks the WABA
   at scale.

### B2. WhatsApp Business Account (WABA) + profile

1. Create the WABA — directly in Meta (Cloud API), or through Twilio/WATI
   if that provider is chosen (B4).
2. **Display name submission:** `MADETRUE` — it must match the brand
   shown on the site and legal pages; approval can take a few days.
3. Profile fields (copy verbatim): category **Shopping / Retail** ·
   description (one warm line about hyperlocal Kerala makers) · address
   `Kochi, Kerala, India - 682001` · website `https://madetrue.in` ·
   hours **9:00 AM – 7:00 PM IST (Monday to Saturday)** · email
   `madetrue.in@gmail.com` · profile logo (the MADETRUE mark).
4. Register the number **+91 8876789131** (SMS/call verification). The
   number must **not** be actively registered on the consumer WhatsApp
   app — release it there first, or register a dedicated business number
   instead. If you switch numbers, update the three `wa.me` call sites in
   the app (`lib/utils/constants.ts` `whatsappUrl`, `app/error.tsx`,
   `components/contact/ContactForm.tsx`) in one commit so support links
   and the wa.me fallback stay truthful.

### B3. Templates for approval (the 7 lifecycle events)

Business-initiated messages outside the 24-hour service window need
**approved templates**. The Phase 7 family in `lib/whatsapp/templates.ts`
is the source of truth — the admin console's WhatsApp tab previews every
one. Submit each for approval, mapping the dynamic parts to WhatsApp
template variables (`{{1}}`, `{{2}}`, …):

| Event | Source | Purpose |
|---|---|---|
| `placed` | `buildTemplate("placed")` | buyer: order received |
| `accepted` | `buildTemplate("accepted")` | buyer: maker accepted |
| `ready` | `buildTemplate("ready")` | buyer: ready to deliver/pick up |
| `delivered` | `buildTemplate("delivered")` | buyer: delivered / picked up |
| `cancelled` | `buildTemplate("cancelled")` | buyer: cancellation + stock restore |
| `refunded` | `buildTemplate("refunded")` | buyer: refund receipt |
| `makerPlaced` | `buildMakerPlacedTemplate` | maker: new order alert |
| maker cancellation request | `buildMakerCancellationRequestTemplate` | maker: buyer asked to cancel (Phase 10) |
| maker auto-approval | `buildMakerCancellationAutoApprovedTemplate` | maker: pending orders self-cancel (Phase 10) |

Keep the approved template names and their variable maps in one place —
add them to the credentials inventory at Step 7 — and map them into the
provider when wiring B4.

### B4. Wire the provider + verify end-to-end

1. Choose `twilio` or `wati`; add its credentials to every Vercel scope
   (see `docs/production-deploy.md` §2) and to `.env.local` locally.
   Blank `WHATSAPP_PROVIDER` stays the honest wa.me fallback — set it
   only once the provider account is real.
2. Admin console → **WhatsApp** tab: provider status should read
   *configured* (not "wa.me fallback"); run one **sandbox test send** to
   your own phone.
3. Expect `sent` with a `providerRef`; the delivery log (admin console →
   WhatsApp tab, backed by migration `0013`) records `delivered` instead
   of `fallback` for that event.
4. If a send fails, the delivery log shows the honest reason (wrong FROM
   number, unverified/unapproved template, unregistered recipient).
   WhatsApp can never block an order — but honest delivery is the goal
   of this step.

## Green light — record before Phase 10 · Step 5

- A1–A7 all pass.
- Meta business verified · display name `MADETRUE` approved ·
  `+91 8876789131` (or the chosen business number) registered.
- Admin sandbox send returns `sent` with a provider reference.
- Anything red: log it in `docs/build-progress.md` — the launch
  rehearsal (Step 5) must not start with silent failures.
