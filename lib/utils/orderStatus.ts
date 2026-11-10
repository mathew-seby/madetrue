import type { Order } from "@/types";

export type OrderStatus = Order["status"];
export type OrderDeliveryType = Order["delivery_type"];

/**
 * The live order lifecycle (Phase 7 Step 1):
 *
 *   pending → accepted → ready → delivered
 *      └──────────┴─────────┴────→ cancelled
 *
 * `completed` is retired. Old rows may still carry it in the database
 * (Postgres enum values cannot be dropped cleanly); every read path runs
 * it through `normalizeOrderStatus()` so the app only ever sees
 * `delivered`, and nothing writes `completed` again.
 */
export const ORDER_STATUSES = [
  "pending",
  "accepted",
  "ready",
  "delivered",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export type OrderFilter = "all" | OrderStatus;

/** Statuses a full refund may still cancel — once delivered, it stays delivered. */
export const CANCELLABLE_ORDER_STATUSES = [
  "pending",
  "accepted",
  "ready",
] as const satisfies readonly OrderStatus[];

/**
 * Allowed status transitions for orders in MADETRUE:
 * - pending: newly placed order. Maker can accept or cancel.
 * - accepted: order accepted and in preparation. Maker can mark it ready or cancel.
 * - ready: packed / ready for pickup. Maker can mark it delivered (or picked up) or cancel.
 * - delivered: fulfilled order (delivered to address or picked up). Terminal state.
 * - cancelled: order was cancelled. Terminal state.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["accepted", "cancelled"],
  accepted: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
} as const;

export function isValidOrderTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  if (currentStatus === targetStatus) return false;
  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus];
  return Boolean(allowed && (allowed as readonly string[]).includes(targetStatus));
}

export function getInvalidTransitionMessage(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): string {
  if (currentStatus === targetStatus) {
    return `Order is already in "${currentStatus}" status.`;
  }
  const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus];
  if (!allowed || allowed.length === 0) {
    return `Orders in "${currentStatus}" status cannot be changed further (terminal state).`;
  }
  return `Cannot transition order from "${currentStatus}" to "${targetStatus}". Allowed next steps: ${allowed.join(", ")}.`;
}

/** Reads legacy `completed` rows as `delivered`; everything else is unchanged. */
export function normalizeOrderStatus(status: string): OrderStatus {
  if (status === "completed") return "delivered";
  return status as OrderStatus;
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ALLOWED_ORDER_TRANSITIONS[status].length === 0;
}

export function canCancelOrder(status: OrderStatus): boolean {
  return (CANCELLABLE_ORDER_STATUSES as readonly string[]).includes(status);
}

/** Human status line for the maker dashboard / admin order book. */
export function getOrderStatusSummary(
  status: OrderStatus,
  deliveryType?: OrderDeliveryType
): string {
  switch (status) {
    case "pending":
      return "New order — awaiting maker acceptance";
    case "accepted":
      return `Accepted — in preparation for ${
        deliveryType === "pickup" ? "pickup" : "local delivery"
      }`;
    case "ready":
      return deliveryType === "pickup"
        ? "Ready — waiting for the buyer to collect"
        : "Packed and ready for local delivery";
    case "delivered":
      return deliveryType === "pickup"
        ? "Picked up — fulfillment finished"
        : "Delivered — fulfillment finished";
    case "cancelled":
      return "Order cancelled";
  }
}

/** Warm buyer-facing summary for the my-orders page (Phase 7 Step 2). */
export function getOrderBuyerStatusSummary(
  status: OrderStatus,
  deliveryType?: OrderDeliveryType
): string {
  switch (status) {
    case "pending":
      return "Waiting for the maker to accept";
    case "accepted":
      return "The maker is preparing your order";
    case "ready":
      return deliveryType === "pickup"
        ? "Ready — collect it from the maker"
        : "Ready — on its way soon";
    case "delivered":
      return deliveryType === "pickup" ? "Picked up — enjoy!" : "Delivered — enjoy!";
    case "cancelled":
      return "Cancelled";
  }
}

/** Short, human label for badges, tabs and toasts. */
export function getOrderStatusLabel(
  status: OrderStatus,
  deliveryType?: OrderDeliveryType
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "ready":
      return deliveryType === "pickup" ? "Ready for pickup" : "Ready for delivery";
    case "delivered":
      return deliveryType === "pickup" ? "Picked up" : "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

/** Warm, delivery-aware label for the action that moves the order forward. */
export function getOrderActionLabel(
  target: OrderStatus,
  deliveryType?: OrderDeliveryType
): string {
  switch (target) {
    case "accepted":
      return "Accept Order";
    case "ready":
      return deliveryType === "pickup"
        ? "Mark Ready for Pickup"
        : "Mark Ready to Deliver";
    case "delivered":
      return deliveryType === "pickup" ? "Mark Picked Up" : "Mark Delivered";
    case "cancelled":
      return "Cancel Order";
    default:
      return "Update Order";
  }
}

/** Friendly confirmation after a successful maker/admin status move. */
export function getOrderSuccessMessage(
  target: OrderStatus,
  deliveryType: OrderDeliveryType | undefined,
  isOnlinePaid: boolean
): string {
  switch (target) {
    case "accepted":
      return "Order accepted! The customer knows you are preparing their items.";
    case "ready":
      return deliveryType === "pickup"
        ? "Marked ready! The buyer can collect it whenever suits them."
        : "Marked ready! The basket is packed and waiting for local delivery.";
    case "delivered":
      return deliveryType === "pickup"
        ? "Order picked up — fulfillment finished."
        : "Order delivered — fulfillment finished.";
    case "cancelled":
      return isOnlinePaid
        ? "Order cancelled, customer refunded via gateway, and stock restored."
        : "Order cancelled and stock restored to inventory.";
    default:
      return `Order status updated to ${target}.`;
  }
}
