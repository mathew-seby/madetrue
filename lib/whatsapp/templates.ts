/**
 * MADETRUE — WhatsApp template builder (Phase 7 Step 4)
 *
 * Every automated order message lives here as a pure string builder over a
 * small context, so previews and sandbox sends show EXACTLY what real
 * transitions will say — the notify layer (Step 3) calls the same functions.
 *
 * Copy rules: warm and human, no corporate jargon, one short cue per
 * message ("Track it on My Orders" instead of raw links), delivery-aware
 * wording for pickup baskets.
 */

/** Honest warm refund copy already ships in the click-to-chat helper —
 *  the refunded template reuses it so the wording never forks. */
import type { OrderStatus } from "@/lib/utils/orderStatus";

/** Honest warm refund copy already ships in the click-to-chat helper —
 *  the refunded template reuses it so the wording never forks. */
import { buildRefundWhatsAppMessage } from "@/lib/utils/whatsapp";

export type TemplateEvent =
  | "placed"
  | "accepted"
  | "ready"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "makerPlaced";

/** The full template set, in lifecycle order. */
export const TEMPLATE_EVENTS: readonly TemplateEvent[] = [
  "placed",
  "accepted",
  "ready",
  "delivered",
  "cancelled",
  "refunded",
  "makerPlaced",
];

export const TEMPLATE_LABELS: Record<TemplateEvent, string> = {
  placed: "Order placed",
  accepted: "Accepted",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  makerPlaced: "Maker alert",
};

export interface OrderTemplateContext {
  orderId: string;
  buyerName?: string | null;
  productName?: string | null;
  quantity: number;
  /** Maker's business name — templates degrade warmly when absent. */
  storeName?: string | null;
  deliveryType?: "delivery" | "pickup";
  refundedAmount?: number;
  refundReason?: string;
  gateway?: string | null;
}

export const SAMPLE_TEMPLATE_CONTEXT: OrderTemplateContext = {
  orderId: "MT-8B3F21C9",
  buyerName: "Ananya",
  productName: "Wild Forest Honey, 350g jar",
  quantity: 1,
  storeName: "Meenachil Apiaries",
  deliveryType: "delivery",
  refundedAmount: 620,
  refundReason: "Order cancellation",
  gateway: "cashfree",
};

/** Builder the sandbox-send route uses: one template, real copy. */
export function buildTemplate(
  event: Exclude<TemplateEvent, "makerPlaced">,
  ctx: OrderTemplateContext
): string {
  const buyer = ctx.buyerName ? `Hi ${ctx.buyerName}` : "Hi there";
  const item = ctx.productName ?? "your order";
  const store = ctx.storeName || "the maker";

  switch (event) {
    case "placed":
      return `${buyer} — your MADETRUE order #${ctx.orderId} (${item} × ${ctx.quantity}) is with ${store}. We'll nudge you the moment ${store} accepts it.`;
    case "accepted":
      return `${buyer} — good news! ${store} accepted your order #${ctx.orderId} and is preparing it now. Track updates on My Orders.`;
    case "ready":
      return ctx.deliveryType === "pickup"
        ? `${buyer} — order #${ctx.orderId} is packed and ready. You can pick it up from ${store} — drop by and say hello.`
        : `${buyer} — order #${ctx.orderId} is packed and ready. It will be on its way to you shortly. Track it on My Orders.`;
    case "delivered":
      return ctx.deliveryType === "pickup"
        ? `${buyer} — order #${ctx.orderId} was picked up. Enjoy, and thank you for supporting ${store}!`
        : `${buyer} — order #${ctx.orderId} was delivered. Enjoy, and thank you for supporting ${store}!`;
    case "cancelled":
      return `${buyer} — order #${ctx.orderId} (${item}) was cancelled. If any money was involved, MADETRUE support is just a message away.`;
    case "refunded":
      return buildRefundWhatsAppMessage({
        buyerName: ctx.buyerName ?? undefined,
        orderId: ctx.orderId,
        productName: ctx.productName ?? undefined,
        refundAmount: ctx.refundedAmount ?? 0,
        reason: ctx.refundReason,
        gateway: ctx.gateway ?? null,
      });
  }
}

/** Maker alert for a fresh basket — one message per maker, not per line. */
export function buildMakerPlacedTemplate(
  storeName: string,
  count: number
): string {
  const orders = `new MADETRUE order${count === 1 ? "" : "s"}`;
  return `Hello ${storeName}! You have ${count} ${orders} waiting. Open your maker dashboard to accept.`;
}

/** Preview helper: the sample context, rendered for any event. */
export function buildSampleTemplate(event: TemplateEvent): string {
  if (event === "makerPlaced") {
    return buildMakerPlacedTemplate(SAMPLE_TEMPLATE_CONTEXT.storeName ?? "maker", 2);
  }
  return buildTemplate(event, SAMPLE_TEMPLATE_CONTEXT);
}

/** Lifecycle status → template event (the notify layer's bridge). */
export type TemplateEventByStatus = Exclude<TemplateEvent, "makerPlaced">;

export const STATUS_TO_TEMPLATE: Record<OrderStatus, TemplateEventByStatus> = {
  pending: "placed",
  accepted: "accepted",
  ready: "ready",
  delivered: "delivered",
  cancelled: "cancelled",
};
