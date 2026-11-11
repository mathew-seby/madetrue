# MADETRUE — Refund & Cancellation Support Playbook

*Internal ops guide for the support desk, admin console and makers.*
*Last updated: 2026-11-11 (Phase 10 · Step 2). The law is the published*
*[Refund & Cancellation Policy](/refund-policy) — this playbook explains how
the platform enforces it, and the policy engine
(`lib/utils/refundPolicy.ts`) is the code that keeps both in step.*

> **The one rule to remember:** the platform does not decide refunds by
> mood. The policy engine decides. If a case feels special, escalate via
> WhatsApp support — never bypass the engine silently.

---

## 1. The cancellation windows at a glance

| Order status | Window | What happens | Money |
|---|---|---|---|
| `pending` (maker hasn't accepted) | **Auto-approved** | Platform cancels instantly. No maker review, no waiting. Stock is restored automatically. The maker gets a WhatsApp heads-up ("no action needed"). | Online: **full refund** — product lines **+ ₹49 delivery fee** if it was a delivery order. COD: ₹0 (nothing was collected). |
| `accepted` (maker is prepping) | **Maker review** | Buyer's request lands on the maker's dashboard. Approve → same execution path as above. Decline → order stays live; buyer sees the decline note. | Online: full policy amount on approval. COD: ₹0 — approving just cancels and returns stock. |
| `ready` (packed) | **Restricted** | Self-service cancellation is closed — fresh food can't be unsold. Buyer is pointed to WhatsApp support. | Support decides case by case (see §4). |
| `delivered` | **Damage claim** | Only the 24-hour damage/defect flow (§3). Self-service is never offered after delivery. | Support-approved: replacement or 100% refund. |
| `cancelled` | — | Terminal. Nothing to request. | — |

The engine exposes this same table as `REFUND_TIMELINE_COPY`
(“Refunds reach your original payment method within 5–7 working days via
Cashfree Payments.”) and `DAMAGE_CLAIM_COPY` — quote them verbatim in chat;
don't paraphrase the promise.

## 2. The money math (so you can answer "how much?")

**Online orders (UPI / any gateway):**

```
refundable total = (price × quantity) + delivery fee        (delivery orders)
refundable total = (price × quantity)                       (pickup orders)
current refund   = refundable total − prior completed refunds
```

- The **delivery fee comes back** when an order is cancelled before
  dispatch — the buyer never received the delivery.
- Every refund is **capped at what earlier partials left**. The approval
  path (`performCancellation` in the cancel route) reads the transactions
  ledger first, so an approve can never over-refund. The manual admin
  refund route enforces the same cap.
- Refunds move through the payment adapter (Easy Split reversal included),
  land as a `refund` row in the append-only `transactions` ledger, and the
  buyer is told to expect **5–7 working days** via Cashfree.

**COD orders:** no payment was collected through the platform, so there is
no monetary refund to issue. Approving a cancellation restores stock and
flips the order to `cancelled` — that's the whole transaction. If cash was
*already handed over* (e.g. delivery collected, then a damage claim), the
admin refund modal records the cash return as a `cod_…` ledger entry so the
order book shows money left the loop. That's an offline coordination with
the maker — say so plainly to the buyer.

## 3. The 24-hour damage/defect claim (delivered orders)

This is a **support flow, not a self-service button** — there is no
`delivered_at` column and self-service cancellation is never offered after
delivery. The flow:

1. Buyer sends a **photo of the item + Order ID** to WhatsApp support
   (the number on every order and the contact page) **within 24 hours of
   delivery**.
2. Support triages with the maker. Three outcomes:
   - **Replacement** — maker prepares a fresh batch; new dispatch.
   - **100% refund** — admin issues it from the console ("Issue Refund",
     reason preset *"Damaged in transit (24-hour policy)"*). Online money
     moves via the gateway; COD becomes an offline cash return per §2.
   - **Declined** — explain which §5 (below) condition applies, kindly.
3. After 24 hours, goodwill is still possible but it's a human judgement —
   use the *"Partial goodwill refund"* preset and record the reason.

**Never** fake a success: if the claim window has passed, say the window
has passed and offer the escalation path anyway.

## 4. What a cancellation actually triggers (so you can debug a ticket)

When `performCancellation` runs (maker/admin approval or auto-approval):

1. Prior `refund` rows are read from the ledger → refund cap computed by
   the policy engine.
2. Gateway refund (online, amount > 0 only) with Easy Split reversal
   proportional to the order total. **A gateway failure aborts everything**
   — the order is not cancelled, the buyer's money stays put, and the
   caller gets a 400 with the gateway's message.
3. A `refund` row is appended to `transactions` (idempotent by
   `gateway_event_id`).
4. Product stock is restored (`stock + quantity`, `is_available: true`).
5. Order flips to `cancelled`, `cancel_requested` clears, reason recorded.
6. Admin approvals write an audit entry (`order_cancellation_approved`).
7. Buyer gets the WhatsApp cancelled/refunded notice; auto-approvals also
   ping the maker ("items are back in stock, no action needed").

If a ticket says "I cancelled but the maker still cooked it" — check step 2
first: the maker was never notified of an *accepted* order's request until
they review it. For auto-approvals (`pending`), the maker never accepted in
the first place.

## 5. Where refunds do not apply (mirror of the published policy §5)

- Delays caused by an **incorrect delivery address** or unreachable phone
  number the buyer provided.
- **Refusal to accept** the delivery without a valid defect or tamper
  reason.
- Products **consumed, opened** (hygiene seals broken), or damaged by
  improper post-delivery storage (e.g. fresh items left unrefrigerated).

## 6. Escalation

- **Buyer → support:** WhatsApp number on the order, contact page, and
  footer. The support desk can approve any refund the engine suggests,
  including the restricted/damage-claim windows.
- **Maker disputes:** the maker can decline a request with a note, but the
  *auto-approval* window cannot be overridden by the maker (they never
  accepted the order). Disputes about auto-approvals go to the admin
  console's order view, which shows the policy window and money for every
  order.
- **System mismatch** (e.g. ledger says one thing, gateway another): use
  the admin **Analytics → Period Reconciliation** report (Phase 10 ·
  Step 1) — it names the metric, the delta and the offending order ids.

## 7. Changing the policy

The published legal page (`app/refund-policy/page.tsx`), the engine
(`lib/utils/refundPolicy.ts`) and this playbook **change together, in the
same commit, or not at all**. The verification script
(`npx tsx scripts/verifyRefundPolicy.ts`) fails if the engine drifts from
the windows and money rules this playbook describes.
