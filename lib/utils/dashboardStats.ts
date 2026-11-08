import type { Order } from "@/types";

export interface DashboardStats {
  todayOrders: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

// Pure derivation from the maker's loaded orders — no extra fetch, so the
// figures can always be re-counted against the same Inbox list shown on the
// dashboard. Revenue is the money a maker is actually owed: price × quantity
// plus the basket's delivery fee (recorded once on the basket's first line),
// with cancelled orders excluded. "Today" follows the viewer's local day.
export function computeDashboardStats(orders: Order[]): DashboardStats {
  const todayKey = new Date().toDateString();
  let todayOrders = 0;
  let totalOrders = 0;
  let totalRevenue = 0;
  let pendingOrders = 0;

  for (const order of orders) {
    totalOrders += 1;
    if (order.status !== "cancelled") {
      totalRevenue += Number(order.price ?? 0) * Number(order.quantity ?? 0);
      totalRevenue += Number(order.delivery_fee ?? 0);
    }
    if (order.status === "pending") pendingOrders += 1;
    if (
      order.created_at &&
      new Date(order.created_at).toDateString() === todayKey
    ) {
      todayOrders += 1;
    }
  }

  return { todayOrders, totalOrders, totalRevenue, pendingOrders };
}
