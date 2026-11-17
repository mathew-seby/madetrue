/**
 * MADETRUE — Refund policy engine (Phase 10 Step 2)
 *
 * Pure, dependency-light encoding of the published Refund & Cancellation
 * Policy (app/refund-policy/page.tsx) so code and the legal page can never
 * drift apart:
 *
 *   - Cancellation window: `pending`/`accepted` are cancellable;
 *     `ready`/`delivered` are restricted (perishable-waste prevention).
 *   - Orders the maker has NOT yet accepted are auto-approved: the platform
 *     cancels and refunds instantly — nothing was cooked or packed yet.
 *   - Online refunds: full amount INCLUDING the flat delivery fee, capped at
 *     what is still refundable after any prior partial refunds.
 *   - COD: no payment was collected, so no monetary refund exists.
 *   - Delivered orders: 24-hour damage/defect claim via WhatsApp support —
 *     self-service cancellation is never offered after delivery.
 *
 * Used by the cancellation route (auto-approval), the admin refund modal
 * (policy prefill), the maker dashboard (review guidance) and the buyer
 * My Orders page (window copy). Pure functions only — no fetches, no storage.
 */

import { DELIVERY_FEE } from "./constants";
import { normalizeOrderStatus } from "./orderStatus";

export type RefundPolicyWindow =
  /** Not yet accepted — platform cancels + refunds instantly. */
  | "auto_approved"
  /** Accepted — maker reviews (prep may have started). */
  | "maker_review"
  /** Packed/ready — self-service closed (perishable-waste prevention). */
  | "restricted"
  /** Delivered — 24-hour damage/defect claim via support. */
  | "damage_claim"
  /** Already cancelled — nothing left to request. */
  | "none";

export interface RefundPolicyOrderInput {
  status: string;
  payment_method?: string | null;
  gateway?: string | null;
  delivery_type?: string | null;
  price?: number | null;
  quantity?: number | null;
  delivery_fee?: number | null;
  cancel_requested?: boolean | null;
  created_at?: string | null;
}

export interface RefundPolicyDecision {
  window: RefundPolicyWindow;
  /** Can the buyer self-serve a cancellation request right now? */
  eligible: boolean;
  /** True when the platform approves + refunds without maker review. */
  autoApprove: boolean;
  /** Policy-correct refund if money moves now (₹, 2dp). 0 for COD. */
  suggestedAmount: number;
  /** Buyer-safe explanation of the window and the money. */
  reason: string;
  /** Maker-facing guidance shown on the review card. */
  makerNote: string;
}

/** Published refund timeline — quoted verbatim wherever policy is shown. */
export const REFUND_TIMELINE_COPY =
  "Refunds reach your original payment method within 5–7 working days via Cashfree Payments.";

/** The 24-hour transit-damage promise from the published policy. */
export const DAMAGE_CLAIM_COPY =
  "Delivered but something's wrong? Send a photo of the item and your Order ID to our WhatsApp support within 24 hours of delivery — we'll arrange a replacement or a 100% refund.";

/** True when money actually passed through the gateway for this order. */
export function isOnlinePaidOrder(order: RefundPolicyOrderInput): boolean {
  return order.payment_method === "upi" || Boolean(order.gateway);
}

/**
 * Order total as the policy sees it: product lines plus the flat delivery
 * fee (delivery orders only — pickup carries no fee). A delivery order
 * cancelled before dispatch gets the fee back in full, per the published
 * policy.
 */
export function orderRefundTotal(order: RefundPolicyOrderInput): number {
  const subtotal = Number(order.price ?? 0) * Number(order.quantity ?? 1);
  const fee = order.delivery_type === "pickup" ? 0 : Number(order.delivery_fee ?? 0);
  return Number((subtotal + fee).toFixed(2));
}

/**
 * Resolves the refund window and the policy-correct amount for an order.
 * `options.priorRefunded` caps the suggestion at what is still refundable
 * after earlier partial refunds — an approve action can never over-refund.
 */
export function resolveRefundPolicy(
  order: RefundPolicyOrderInput,
  options?: { priorRefunded?: number }
): RefundPolicyDecision {
  const status = normalizeOrderStatus(String(order.status ?? ""));
  const online = isOnlinePaidOrder(order);
  const total = orderRefundTotal(order);
  const priorRefunded = Number(options?.priorRefunded ?? 0);
  const remaining = Math.max(0, Number((total - priorRefunded).toFixed(2)));

  // Already cancelled — terminal, nothing to request.
  if (status === "cancelled") {
    return {
      window: "none",
      eligible: false,
      autoApprove: false,
      suggestedAmount: 0,
      reason: "This order is already cancelled.",
      makerNote: "Order is already cancelled.",
    };
  }

  // Packed / ready — self-service window is closed.
  if (status === "ready") {
    return {
      window: "restricted",
      eligible: false,
      autoApprove: false,
      suggestedAmount: 0,
      reason:
        "This order is already packed, so it can't be cancelled online — food prepared fresh can't be unsold. If there's a problem, our support desk is one WhatsApp message away.",
      makerNote: "Order is packed — cancellations are restricted to protect fresh goods.",
    };
  }

  // Delivered — the 24-hour damage/defect claim flow takes over.
  if (status === "delivered") {
    return {
      window: "damage_claim",
      eligible: false,
      autoApprove: false,
      suggestedAmount: online ? remaining : 0,
      reason: DAMAGE_CLAIM_COPY,
      makerNote:
        "Delivered — only support-approved damage claims (within 24 hours) can refund this order.",
    };
  }

  // Accepted — the maker may have started prep; a human decides.
  if (status === "accepted") {
    return {
      window: "maker_review",
      eligible: true,
      autoApprove: false,
      suggestedAmount: online ? remaining : 0,
      reason:
        online
          ? `The maker will review your request. When approved, ₹${remaining} (item${Number(order.quantity ?? 1) > 1 ? "s" : ""}${order.delivery_type !== "pickup" ? ` + ₹${DELIVERY_FEE} delivery fee` : ""}) is refunded via the payment gateway. ${REFUND_TIMELINE_COPY}`
          : "The maker will review your request. This order was cash on delivery — nothing was collected, so approving simply cancels it and returns the items to stock.",
      makerNote: `Buyer requested cancellation. Approving returns the items to your stock${
        online ? ` and refunds ₹${remaining} to the buyer via the gateway` : " (cash on delivery — no money moves)"
      }. Declining keeps the order live — please tell the buyer why.`,
    };
  }

  // Pending — nothing cooked, nothing packed: approve + refund instantly.
  return {
    window: "auto_approved",
    eligible: true,
    autoApprove: true,
    suggestedAmount: online ? remaining : 0,
    reason: online
      ? `Your order was cancelled instantly — the maker hadn't accepted it yet. ₹${remaining} is on its way back. ${REFUND_TIMELINE_COPY}`
      : "Your order was cancelled instantly — the maker hadn't accepted it yet, and no payment was collected.",
    makerNote:
      "Cancelled automatically before acceptance — the items are back in stock. No action needed.",
  };
}

/**
 * Reason quick-sets for the admin refund modal, matching the published
 * policy's refund situations (full/partial/damage/no-refund triage).
 */
export const REFUND_REASON_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Buyer cancellation", value: "Order cancellation & refund" },
  { label: "Damaged in transit (24-hour policy)", value: "Damaged in transit — 24-hour damage policy" },
  { label: "Item unavailable after acceptance", value: "Item unavailable after acceptance" },
  { label: "Partial goodwill refund", value: "Partial goodwill refund" },
];
