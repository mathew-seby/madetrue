import type { Order } from "@/types";

export type OrderStatus = Order["status"];

/**
 * Allowed status transitions for orders in MADETRUE:
 * - pending: newly placed order. Maker can accept or cancel.
 * - accepted: order accepted by maker and in preparation. Maker can complete (delivered/picked up) or cancel.
 * - completed: fulfilled order (delivered to address or picked up). Terminal state.
 * - cancelled: order was cancelled. Terminal state.
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["completed", "cancelled"],
  completed: [],
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
