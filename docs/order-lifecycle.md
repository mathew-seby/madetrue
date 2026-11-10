# MADETRUE — Order Lifecycle

> Phase 7 Step 1. This is the canonical state machine for orders. The code,
> the database trigger, and this document must always agree.

## The machine

```
                    accept                 mark ready             mark delivered
  pending ────────────────→ accepted ────────────────→ ready ────────────────→ delivered
     │                         │                         │
     │ cancel                  │ cancel                  │ cancel
     └────────────┬────────────┴────────────┬────────────┘
                  ▼                         ▼
               cancelled                 cancelled
```

`delivered` and `cancelled` are terminal. A delivered order can still take a
refund (the ledger records it), but its status never moves again.

## Allowed transitions

| From | To | Everyday meaning |
|---|---|---|
| `pending` | `accepted` | Maker accepts the order |
| `pending` | `cancelled` | Maker cancels / payment abandoned |
| `accepted` | `ready` | Basket packed — pickup-ready or ready to deliver |
| `accepted` | `cancelled` | Maker cancels before packing |
| `ready` | `delivered` | Handed over (delivered or picked up) |
| `ready` | `cancelled` | Maker cancels before handover |
| `delivered` | — | Terminal |
| `cancelled` | — | Terminal |

Who may move an order: the maker who owns it, or a MADETRUE admin. Buyers
never move status directly; buyer-initiated cancellation requests arrive in
Phase 7 Step 5.

## Delivery-aware copy

The state is the same for delivery and pickup; the words differ.

| Status | Delivery | Pickup |
|---|---|---|
| `pending` | New order — awaiting maker acceptance | same |
| `accepted` | Accepted — in preparation for local delivery | Accepted — in preparation for pickup |
| `ready` | Packed and ready for local delivery | Ready — waiting for the buyer to collect |
| `delivered` | Delivered — fulfillment finished | Picked up — fulfillment finished |

Action labels (`getOrderActionLabel`): "Mark Ready to Deliver" / "Mark Ready
for Pickup", then "Mark Delivered" / "Mark Picked Up".

## Where it is enforced

1. **Shared helper** — `lib/utils/orderStatus.ts` owns `ORDER_STATUSES`,
   `ALLOWED_ORDER_TRANSITIONS`, `isValidOrderTransition()`, the labels, and
   `normalizeOrderStatus()`.
2. **Server route** — `PATCH /api/orders` rejects unknown statuses and invalid
   moves with a friendly 400 before writing (the reader/writer used by both
   the maker dashboard and the admin console).
3. **Database** — migration `0010_order_lifecycle.sql` adds a
   `before update of status` trigger (`guard_order_status_transition`) that
   raises on any move outside the table above. This closes the raw-REST gap:
   0002's `guard_order_write` pins maker-editable fields but intentionally
   leaves `status` to the app.
4. **Mock mode** — `updateOrderStatus()` in `lib/supabase/client.ts` runs the
   same helper, so localStorage behaves exactly like Supabase.

## Money & stock rules

- **Cancel before delivery** restores stock and, for online-paid orders,
  triggers a full refund through the Phase 6 payment adapter.
- **Cancel after delivery is not a state move.** A full refund on a
  `delivered` order is recorded in the ledger, but the order stays
  `delivered` and stock is not restored again — the goods already left the
  shop (`POST /api/orders/[id]/refund`, mock `refundOrder`).
- Delivered money counts as GMV in the admin analytics; cancelled money does
  not.

## The retired `completed` status

Older rows may still say `completed` in the database. Postgres cannot drop an
enum value cleanly, so it stays in `public.order_status` but is **never
written again**:

- every read normalises it to `delivered` (`normalizeOrderStatus`);
- the trigger refuses moves into `completed`;
- migration `0011_order_status_backfill.sql` rewrites existing rows.

Owner action: run `0010_order_lifecycle.sql` in the Supabase SQL editor, then
run `0011_order_status_backfill.sql` in a **second** execution (Postgres will
not use a new enum value in the transaction that added it).

## What builds on this

- **Step 2** — buyer order history reads the same statuses and labels.
- **Step 4** — WhatsApp templates are keyed to placed / accepted / ready /
  delivered / refunded.
- **Step 5** — buyer cancellation requests enter at `pending`, `accepted`, or
  `ready`, then refund through the Phase 6 adapter.
- **Step 7** — the two-browser journey must leave no order outside the five
  states above.
