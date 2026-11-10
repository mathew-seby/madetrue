/**
 * Order event sends (Phase 7 Step 3) — the only place order routes talk to
 * the WhatsApp provider.
 *
 * Rules:
 *   * Never throws — a send (or its absence) is reported, not raised, so an
 *     order state change can never fail because of WhatsApp.
 *   * With no provider configured, results say so honestly (provider
 *     "none") and the app keeps its wa.me click-to-chat fallback.
 *
 * Copy is intentionally minimal for now — Phase 7 Step 4 introduces real
 * templates with previews + sandbox sends, and Step 6 adds delivery
 * logging with retries.
 */
import type { Order } from "@/types";
import { getOrderBuyerStatusSummary } from "@/lib/utils/orderStatus";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp";
import { getWhatsAppProvider } from "./index";
import type { SendWhatsAppResult } from "./types";

const NO_RECIPIENT = "No WhatsApp number on file for this update.";

export async function sendOrderWhatsApp(params: {
  to?: string | null;
  body: string;
}): Promise<SendWhatsAppResult> {
  const to = normalizeWhatsAppPhone(params.to ?? "");
  if (!to) {
    return { sent: false, provider: "none", reason: NO_RECIPIENT };
  }
  try {
    return await getWhatsAppProvider().send({ to, body: params.body });
  } catch (err: unknown) {
    // Defensive: providers already guard internally, but an order must
    // never fail over WhatsApp no matter what happens here.
    return {
      sent: false,
      provider: "none",
      reason: err instanceof Error ? err.message : "WhatsApp send failed.",
    };
  }
}

/**
 * Buyer-facing update for accepted / ready / delivered / cancelled.
 * Reads the NEW status off the already-updated order row, so the line
 * always describes where the order stands now (delivery-aware via the
 * Step 2 status copy).
 */
export function buildBuyerStatusMessage(order: Order): string {
  const buyer = order.buyer_name ? `Hi ${order.buyer_name}` : "Hi";
  const item = order.product_name ?? "your order";
  const summary = getOrderBuyerStatusSummary(order.status, order.delivery_type);
  return `${buyer} — an update on your MADETRUE order #${order.id} (${item} × ${order.quantity}): ${summary}.`;
}

export async function sendBuyerStatusUpdate(
  order: Order
): Promise<SendWhatsAppResult> {
  return sendOrderWhatsApp({
    to: order.buyer_phone ?? null,
    body: buildBuyerStatusMessage(order),
  });
}

/** Maker alert for a fresh basket — one message per maker, not per line. */
export function buildMakerPlacedMessage(
  businessName: string,
  count: number
): string {
  const orders = `new MADETRUE order${count === 1 ? "" : "s"}`;
  return `Hello ${businessName}! You have ${count} ${orders} waiting. Open your maker dashboard to accept.`;
}
