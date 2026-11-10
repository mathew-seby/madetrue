/**
 * Order event sends (Phase 7 Step 3, copy upgraded in Step 4) — the only
 * interpreter order routes may use, and it never throws.
 *
 * Rules:
 *   * Never throws — a send (or its absence) is reported, not raised, so an
 *     order state change can never fail because of WhatsApp.
 *   * With no provider configured, results say so honestly (provider
 *     "none") and the app keeps its wa.me click-to-chat fallback.
 *
 * All message copy comes from `./templates` (Step 4) — the same builders
 * the admin previews and sandbox sends render, so there is exactly one
 * wording. Delivery logging + retries arrive in Step 6.
 */
import type { Order } from "@/types";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp";
import {
  buildMakerPlacedTemplate,
  buildTemplate,
  STATUS_TO_TEMPLATE,
  type TemplateEventByStatus,
} from "./templates";
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
 * Buyer-facing update for a live status change. Reads the NEW status off
 * the already-updated order row and renders the SAME template the admin
 * previews show (Step 4). `storeName` (the maker's business name, fetched
 * by the route) personalises the line; templates degrade warmly without.
 */
export function buildBuyerStatusMessage(
  order: Order,
  storeName?: string | null
): string {
  const event: TemplateEventByStatus = STATUS_TO_TEMPLATE[order.status];
  const isOnlinePaid =
    order.payment_method === "upi" || Boolean(order.gateway);
  const total =
    Number(order.price ?? 0) * Number(order.quantity ?? 1) +
    Number(order.delivery_fee ?? 0);

  return buildTemplate(event, {
    orderId: order.id,
    buyerName: order.buyer_name ?? null,
    productName: order.product_name ?? null,
    quantity: order.quantity,
    storeName: storeName ?? null,
    deliveryType: order.delivery_type,
    refundedAmount: order.status === "cancelled" && isOnlinePaid ? total : undefined,
    gateway: order.gateway ?? null,
  });
}

export async function sendBuyerStatusUpdate(
  order: Order,
  storeName?: string | null
): Promise<SendWhatsAppResult> {
  return sendOrderWhatsApp({
    to: order.buyer_phone ?? null,
    body: buildBuyerStatusMessage(order, storeName),
  });
}

/**
 * Maker alert for a fresh basket — one message per maker, not per line.
 * Delegates to the Step 4 template so previews and real sends agree.
 */
export function buildMakerPlacedMessage(
  businessName: string,
  count: number
): string {
  return buildMakerPlacedTemplate(businessName, count);
}
