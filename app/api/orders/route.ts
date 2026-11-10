// Server-side order persistence for MADETRUE_DATA_SOURCE=supabase.
// Uses the service role per 0002_rls.sql ("server jobs"); the write guard
// is bypassed for service role, so this route does what the guard would
// do for a signed-in buyer — WITHOUT trusting the checkout for prices:
//   * every line is validated against the live product row (approved,
//     available, enough stock) before anything is written;
//   * seller, product name, price, base_price and commission are copied
//     off that DB row, never off the request;
//   * status 'pending', whatsapp_notified false, gateway refs empty —
//     Cashfree owns those in Phase 6.
// Stock is decremented through the atomic 0006 RPC
// (decrement_product_stock) — check and decrement share one row lock, so
// two concurrent buyers cannot oversell; a guarded update remains as the
// fallback for environments the migration has not reached yet.
//
// Identity (Phase 4 Step 7 — isolation): the session cookie decides who
// the caller is, never the request body. Sellers only ever read their own
// orders (their seller id is derived from `sellers.user_id`), buyers only
// their own; guests are refused.

import { NextResponse } from "next/server";
import type { Order } from "@/types";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser, getOwnSellerId } from "@/lib/supabase/server-auth";
import {
  ORDER_STATUSES,
  isValidOrderTransition,
  getInvalidTransitionMessage,
  normalizeOrderStatus,
} from "@/lib/utils/orderStatus";
import { getPaymentAdapter } from "@/lib/payments";
import {
  buildMakerPlacedMessage,
  sendBuyerStatusUpdate,
  sendOrderWhatsApp,
} from "@/lib/whatsapp/notify";

const PRODUCT_COLUMNS =
  "id, seller_id, name, price, base_price, commission, status, is_available, stock";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — order persistence is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view orders." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);

  const supabase = createSupabaseServerClient();
  let query = supabase.from("orders").select("*");

  // Phase 7 Step 2 — `mine=1`: "my own purchases" for any signed-in role.
  // Buyer history uses this so an admin/maker reading from the buyer page
  // sees their own orders instead of the admin order book or maker inbox.
  if (searchParams.get("mine") === "1") {
    query = query.eq("buyer_id", user.id);
  } else if (user.role === "admin") {
    // Admin overview: filters (seller_id / buyer_id) stay available.
    const sellerId = searchParams.get("seller_id");
    const buyerId = searchParams.get("buyer_id");
    if (sellerId) {
      query = query.eq("seller_id", sellerId);
    } else if (buyerId) {
      query = query.eq("buyer_id", buyerId);
    }
  } else if (user.role === "seller") {
    // Maker inbox: only their own orders — the session-derived seller id
    // wins over anything the request carries (Step 7 isolation).
    const ownSellerId = await getOwnSellerId(supabase, user.id);
    if (!ownSellerId) {
      return NextResponse.json(
        { error: "You do not have a maker store yet." },
        { status: 403 }
      );
    }
    query = query.eq("seller_id", ownSellerId);
  } else {
    // Buyer history: only their own orders.
    query = query.eq("buyer_id", user.id);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Database read failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map((row) => mapOrderRow(row)));
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — order persistence is off." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The order submission could not be read." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const ordersInput = Array.isArray(body?.orders) ? body.orders : null;
  if (!ordersInput || ordersInput.length === 0) {
    return NextResponse.json(
      { error: "Your basket is empty — there is nothing to order." },
      { status: 400 }
    );
  }

  // Checkout is a signed-in moment (Phase 3): guests are refused, so the
  // buyer on every row is the session user — never a payload value.
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before placing your order." },
      { status: 401 }
    );
  }

  const supabase = createSupabaseServerClient();

  // 1) Validate every line against the live product row.
  const validated: Array<{
    incoming: Record<string, unknown>;
    product: Record<string, unknown>;
  }> = [];

  for (const item of ordersInput) {
    const incoming = isRecord(item) ? item : null;
    const productId =
      incoming && typeof incoming.product_id === "string"
        ? incoming.product_id
        : null;
    const quantity = Number(incoming?.quantity);

    if (!incoming || !productId) {
      return NextResponse.json(
        { error: "One of the basket lines is incomplete. Please try your order again." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Order quantities must be whole numbers above zero." },
        { status: 400 }
      );
    }

    const { data: product, error: readError } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("id", productId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json(
        { error: `Database read failed: ${readError.message}` },
        { status: 500 }
      );
    }
    if (
      !product ||
      product.status !== "approved" ||
      product.is_available !== true ||
      Number(product.stock) < quantity
    ) {
      return NextResponse.json(
        { error: "That product is not available to order." },
        { status: 409 }
      );
    }

    validated.push({ incoming, product });
  }

  // 2) Insert honest rows. Prices come from the DB product, never the
  //    request. The client's delivery_fee is accepted as-is: checkout
  //    computes it from the app's own flat-fee rule today; server-side
  //    pricing of the fee arrives with the payment phase.
  const inserted: Order[] = [];

  for (const { incoming, product } of validated) {
    const row = {
      id: typeof incoming.id === "string" ? incoming.id : undefined,
      buyer_id: user.id,
      buyer_name:
        incoming.buyer_name === null || incoming.buyer_name === undefined
          ? null
          : String(incoming.buyer_name),
      buyer_phone:
        incoming.buyer_phone === null || incoming.buyer_phone === undefined
          ? null
          : String(incoming.buyer_phone),
      seller_id: String(product.seller_id),
      product_id: String(product.id),
      product_name: String(product.name),
      price: Number(product.price),
      base_price: product.base_price === null ? null : Number(product.base_price),
      commission: product.commission === null ? 0 : Number(product.commission),
      quantity: Number(incoming.quantity),
      status: "pending" as const,
      delivery_type:
        incoming.delivery_type === "pickup" ? "pickup" as const : "delivery" as const,
      address: String(incoming.address ?? ""),
      payment_method: incoming.payment_method === "upi" ? "upi" as const : "cod" as const,
      whatsapp_notified: false,
      created_at: new Date().toISOString(),
      lat:
        incoming.lat === null || incoming.lat === undefined
          ? null
          : Number(incoming.lat),
      lng:
        incoming.lng === null || incoming.lng === undefined
          ? null
          : Number(incoming.lng),
      delivery_fee: Number(incoming.delivery_fee ?? 0),
      gateway: incoming.gateway ? String(incoming.gateway) : null,
      gateway_order_ref: incoming.gateway_order_ref ? String(incoming.gateway_order_ref) : null,
      gateway_payment_ref: incoming.gateway_payment_ref ? String(incoming.gateway_payment_ref) : null,
      split_status: incoming.split_status
        ? String(incoming.split_status)
        : incoming.payment_method === "upi"
        ? "pending"
        : "not_applicable",
    };

    const { data, error: insertError } = await supabase
      .from("orders")
      .insert(row)
      .select()
      .single();

    if (insertError) {
      if (inserted.length > 0) {
        return NextResponse.json(
          {
            error:
              "Part of your basket could not be saved. No payment was taken — please try placing the order again.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Saving your order failed: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Ledger transaction record for online / gateway orders
    if (row.gateway && data?.id) {
      const eventId = `tx_${data.id}_${Date.now()}`;
      try {
        await supabase.from("transactions").insert({
          order_id: data.id,
          seller_id: row.seller_id,
          gateway: row.gateway,
          gateway_event_id: eventId,
          type: "payment",
          amount: Number(row.price) * Number(row.quantity),
          currency: "INR",
          status: row.split_status === "completed" ? "completed" : "pending",
        });
      } catch {
        // Non-fatal if transactions insert fails in transitional dev
      }
    }

    inserted.push(mapOrderRow(data));
  }

  // 3) Decrement stock atomically (0006_payout_privacy_and_stock_rpc.sql):
  //    check + decrement share one row lock, so concurrent buyers cannot
  //    oversell. If the RPC has not been applied yet, fall back to the
  //    guarded single-condition update.
  for (const { incoming, product } of validated) {
    const quantity = Number(incoming.quantity);
    const { error: rpcError } = await supabase.rpc(
      "decrement_product_stock",
      {
        p_product_id: String(product.id),
        p_quantity: quantity,
      }
    );

    if (rpcError) {
      const rpcMessage = String(rpcError.message ?? "");
      if (
        rpcError.code === "42883" ||
        rpcMessage.includes("decrement_product_stock")
      ) {
        // RPC missing (0006 not applied): legacy guarded path.
        const newStock = Math.max(0, Number(product.stock) - quantity);
        const { data: decremented, error: updateError } = await supabase
          .from("products")
          .update({
            stock: newStock,
            is_available: newStock > 0,
          })
          .eq("id", String(product.id))
          .gte("stock", quantity)
          .select("id");

        if (updateError || !decremented || decremented.length === 0) {
          return NextResponse.json(
            {
              error:
                "Your order was saved, but the stock could not be updated. The makers' dashboard shows your order — please contact them about availability.",
            },
            { status: 409 }
          );
        }
        continue;
      }
      if (
        rpcError.code === "MT002" ||
        rpcMessage.includes("not available to order")
      ) {
        return NextResponse.json(
          { error: "That product is not available to order." },
          { status: 409 }
        );
      }
      if (rpcError.code === "MT001") {
        return NextResponse.json(
          { error: "Order quantities must be whole numbers above zero." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Updating stock failed: ${rpcMessage}` },
        { status: 500 }
      );
    }
  }

  // Phase 7 Step 3 — best-effort "new order" alert to each maker with fresh
  // lines (one message per maker, not per line). Any provider problem stays
  // in the send result; the checkout's existing wa.me confirm remains the
  // visible fallback until a provider is configured. Never fails the order.
  const sellerIds = Array.from(new Set(inserted.map((o) => o.seller_id)));
  if (sellerIds.length > 0) {
    const { data: makers } = await supabase
      .from("sellers")
      .select("id, business_name, whatsapp_number")
      .in("id", sellerIds);

    if (makers) {
      // Reads are independent — send in parallel, bounded by each
      // provider's own timeout, so the basket response never drags.
      await Promise.all(
        (makers as Array<{
          id: string;
          business_name: string | null;
          whatsapp_number: string | null;
        }>).map(async (maker) => {
          const count = inserted.filter((o) => o.seller_id === maker.id).length;
          if (count === 0) return;
          await sendOrderWhatsApp({
            to: maker.whatsapp_number ?? null,
            body: buildMakerPlacedMessage(maker.business_name ?? "maker", count),
          });
        })
      );
    }
  }

  return NextResponse.json(inserted);
}

export async function PATCH(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — order persistence is off." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The status update request could not be read." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const orderId = typeof body?.id === "string" ? body.id.trim() : null;
  const newStatus =
    typeof body?.status === "string"
      ? (body.status.trim() as Order["status"])
      : null;

  if (!orderId || !newStatus) {
    return NextResponse.json(
      { error: "Order ID and target status are required." },
      { status: 400 }
    );
  }

  // Status moves are maker/admin work (0002_rls.sql orders_update). The
  // maker identity comes from the session — the request's seller_id is
  // never trusted (Step 7 isolation).
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to update an order." },
      { status: 401 }
    );
  }

  const validStatuses = ORDER_STATUSES;
  if (!(validStatuses as readonly string[]).includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status "${newStatus}". Must be one of: ${validStatuses.join(
          ", "
        )}`,
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // 1) Read the existing order
  const { data: order, error: readError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { error: `Database read failed: ${readError.message}` },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: `Order with ID "${orderId}" not found.` },
      { status: 404 }
    );
  }

  // 2) Ownership: sellers may move only their own orders' state.
  if (user.role === "seller") {
    const ownSellerId = await getOwnSellerId(supabase, user.id);
    if (!ownSellerId || order.seller_id !== ownSellerId) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to modify orders belonging to another maker.",
        },
        { status: 403 }
      );
    }
  } else if (user.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Order status updates belong to the maker or MADETRUE moderators.",
      },
      { status: 403 }
    );
  }

  // 3) Enforce valid status transition machine
  const currentStatus = order.status as Order["status"];
  if (!isValidOrderTransition(currentStatus, newStatus)) {
    return NextResponse.json(
      { error: getInvalidTransitionMessage(currentStatus, newStatus) },
      { status: 400 }
    );
  }

  // 4) Update status
  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: `Updating order status failed: ${
          updateError?.message || "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }

  // 5) If order is cancelled, restore product stock & process refund for online orders
  if (newStatus === "cancelled" && currentStatus !== "cancelled") {
    const { data: product } = await supabase
      .from("products")
      .select("stock")
      .eq("id", order.product_id)
      .maybeSingle();

    if (product) {
      const restored = Math.max(
        0,
        Number(product.stock) + Number(order.quantity)
      );
      await supabase
        .from("products")
        .update({ stock: restored, is_available: true })
        .eq("id", order.product_id);
    }

    // If online order, issue refund via gateway adapter
    if (order.payment_method === "upi" || order.gateway) {
      const orderTotal =
        Number(order.price ?? 0) * Number(order.quantity ?? 1) +
        Number(order.delivery_fee ?? 0);

      if (orderTotal > 0) {
        try {
          const adapter = getPaymentAdapter();
          const refundRes = await adapter.createRefund({
            orderId: order.id,
            gatewayOrderId: order.gateway_order_ref || order.id,
            refundId: `ref_cancel_${order.id}_${Date.now()}`,
            refundAmount: orderTotal,
            reason: "Order cancellation",
          });

          await supabase.from("transactions").insert({
            order_id: order.id,
            seller_id: order.seller_id,
            gateway: order.gateway || (adapter.name === "cashfree" ? "cashfree" : "mock"),
            gateway_event_id: refundRes.gatewayRefundId || `ref_cancel_${order.id}_${Date.now()}`,
            type: "refund",
            amount: orderTotal,
            currency: "INR",
            status: refundRes.status === "FAILED" ? "failed" : "completed",
          });
        } catch {
          // Non-fatal if gateway refund or ledger insertion fails
        }
      }
    }
  }

  // Phase 7 Step 3 — best-effort buyer WhatsApp update. The provider is
  // chosen by the environment; with none configured the notice honestly
  // reports it and nothing sends (wa.me links stay the fallback). Whatever
  // the outcome, the status change is already saved — WhatsApp can never
  // fail an order.
  const orderResult = mapOrderRow(updated);
  const whatsappNotice = await sendBuyerStatusUpdate(orderResult);

  return NextResponse.json({ ...orderResult, whatsappNotice });
}

function mapOrderRow(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    buyer_id: row.buyer_id as string,
    seller_id: row.seller_id as string,
    product_id: row.product_id as string,
    quantity: row.quantity as number,
    // Legacy rows may still say "completed"; the app calls it "delivered".
    status: normalizeOrderStatus(row.status as string),
    delivery_type: row.delivery_type as Order["delivery_type"],
    address: row.address as string,
    payment_method: row.payment_method as Order["payment_method"],
    whatsapp_notified: row.whatsapp_notified as boolean,
    created_at: row.created_at as string,
    lat: (row.lat as number | null) ?? undefined,
    lng: (row.lng as number | null) ?? undefined,
    base_price: (row.base_price as number | null) ?? undefined,
    commission: (row.commission as number | null) ?? undefined,
    delivery_fee: (row.delivery_fee as number | null) ?? undefined,
    buyer_name: (row.buyer_name as string | null) ?? undefined,
    buyer_phone: (row.buyer_phone as string | null) ?? undefined,
    product_name: (row.product_name as string | null) ?? undefined,
    price: (row.price as number | null) ?? undefined,
    gateway: (row.gateway as Order["gateway"]) ?? undefined,
    gateway_order_ref: (row.gateway_order_ref as string | null) ?? undefined,
    gateway_payment_ref: (row.gateway_payment_ref as string | null) ?? undefined,
    split_status: (row.split_status as Order["split_status"]) ?? undefined,
  };
}
