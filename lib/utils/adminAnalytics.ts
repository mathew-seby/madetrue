// Platform-wide figures for the admin console's analytics section
// (Phase 5 Step 6). Pure derivation from the data the console already
// loads — no extra fetches — so every number re-counts against exactly
// the order book / maker list / moderation queues shown beside it
// (accurate vs the queries, same rule as the maker dashboard's
// computeDashboardStats).
//
// Money rules follow that convention: price × quantity plus the basket's
// delivery fee (recorded once on the basket's first line, so summing the
// column never double-counts a basket), with cancelled orders excluded.
// "Today" follows the viewer's local day. Leaderboard revenue is the
// seller-share basis: base_price × quantity (falling back to the line
// price when base_price is missing on legacy rows) plus the delivery fee
// the line carries.

import type { Category, Order, Product, Seller } from "@/types";

export type ApplicationStatusOf = (
  seller: Pick<Seller, "application_status" | "is_verified">
) => NonNullable<Seller["application_status"]>;

export interface MakerLeaderRow {
  sellerId: string;
  name: string;
  /** All orders recorded for the maker, cancelled included. */
  orders: number;
  /** Cancels excluded — the money the maker actually keeps flowing. */
  revenue: number;
  /** The platform's commission inside that revenue (cancels excluded). */
  commission: number;
  /** Every listing the maker has registered, any review status. */
  products: number;
}

export interface AdminAnalytics {
  totalOrders: number;
  deliveredOrders: number;
  readyOrders: number;
  acceptedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  todayOrders: number;
  /** Gross money through the platform — cancels excluded, delivery fees in. */
  gmv: number;
  /** The platform cut of that money. */
  commission: number;
  /** Delivery fees collected inside it. */
  deliveryRevenue: number;
  approvedMakers: number;
  pendingApplications: number;
  rejectedApplications: number;
  approvedListings: number;
  pendingListings: number;
  rejectedListings: number;
  hiddenListings: number;
  totalListings: number;
  categories: number;
  leaders: MakerLeaderRow[];
}

export function computeAdminAnalytics(
  orders: Order[],
  products: Product[],
  sellers: Seller[],
  categories: Category[],
  applicationStatusOf: ApplicationStatusOf
): AdminAnalytics {
  const todayKey = new Date().toDateString();

  let deliveredOrders = 0;
  let readyOrders = 0;
  let acceptedOrders = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;
  let todayOrders = 0;
  let gmv = 0;
  let commission = 0;
  let deliveryRevenue = 0;

  for (const order of orders) {
    if (
      order.created_at &&
      new Date(order.created_at).toDateString() === todayKey
    ) {
      todayOrders += 1;
    }
    switch (order.status) {
      case "delivered":
        deliveredOrders += 1;
        break;
      case "ready":
        readyOrders += 1;
        break;
      case "accepted":
        acceptedOrders += 1;
        break;
      case "pending":
        pendingOrders += 1;
        break;
      case "cancelled":
        cancelledOrders += 1;
        break;
    }
    if (order.status === "cancelled") continue;
    gmv += Number(order.price ?? 0) * Number(order.quantity ?? 0);
    gmv += Number(order.delivery_fee ?? 0);
    deliveryRevenue += Number(order.delivery_fee ?? 0);
    commission += Number(order.commission ?? 0) * Number(order.quantity ?? 0);
  }

  let approvedListings = 0;
  let pendingListings = 0;
  let rejectedListings = 0;
  let hiddenListings = 0;
  for (const product of products) {
    if (product.is_hidden) hiddenListings += 1;
    switch (product.status) {
      case "pending":
        pendingListings += 1;
        break;
      case "rejected":
        rejectedListings += 1;
        break;
      default:
        approvedListings += 1;
    }
  }

  let approvedMakers = 0;
  let pendingApplications = 0;
  let rejectedApplications = 0;
  for (const seller of sellers) {
    switch (applicationStatusOf(seller)) {
      case "approved":
        approvedMakers += 1;
        break;
      case "rejected":
        rejectedApplications += 1;
        break;
      default:
        pendingApplications += 1;
    }
  }

  // Top makers: roll the delivery-fee-carrying line into its maker's
  // revenue, the way the buyer actually paid. Leaders keep honest rows
  // even when the maker has no orders yet (revenue 0), so the shelf never
  // looks emptier than the truth.
  const roll = new Map<string, MakerLeaderRow>();
  for (const seed of sellers) {
    roll.set(seed.id, {
      sellerId: seed.id,
      name: seed.business_name,
      orders: 0,
      revenue: 0,
      commission: 0,
      products: products.filter((p) => p.seller_id === seed.id).length,
    });
  }

  for (const order of orders) {
    const row = roll.get(order.seller_id);
    if (!row) {
      // An order pointing at a maker who is missing from the list still
      // gets counted — rendered honestly rather than dropped.
      roll.set(order.seller_id, {
        sellerId: order.seller_id,
        name: "Unregistered maker",
        orders: 0,
        revenue: 0,
        commission: 0,
        products: 0,
      });
    }
    const target = roll.get(order.seller_id)!;
    target.orders += 1;
    if (order.status !== "cancelled") {
      const unit = Number(order.base_price ?? order.price ?? 0);
      target.revenue += unit * Number(order.quantity ?? 0);
      target.revenue += Number(order.delivery_fee ?? 0);
      target.commission += Number(order.commission ?? 0) * Number(order.quantity ?? 0);
    }
  }

  const leaders = [...roll.values()]
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.orders - a.orders ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 5);

  return {
    totalOrders: orders.length,
    deliveredOrders,
    readyOrders,
    acceptedOrders,
    pendingOrders,
    cancelledOrders,
    todayOrders,
    gmv,
    commission,
    deliveryRevenue,
    approvedMakers,
    pendingApplications,
    rejectedApplications,
    approvedListings,
    pendingListings,
    rejectedListings,
    hiddenListings,
    totalListings: products.length,
    categories: categories.length,
    leaders,
  };
}
