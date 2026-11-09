import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser, getOwnSellerId } from "@/lib/supabase/server-auth";
import { getPaymentAdapter } from "@/lib/payments";
import type { Order, SplitRecipient } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — use client.ts in mock mode." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to view order refund details." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const orderId = id.trim();
  const supabase = createSupabaseServerClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { error: `Order "${orderId}" not found.` },
      { status: 404 }
    );
  }

  // Authorization: buyer, seller, or admin
  if (user.role === "buyer" && order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }
  if (user.role === "seller") {
    const ownSellerId = await getOwnSellerId(supabase, user.id);
    if (!ownSellerId || order.seller_id !== ownSellerId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  }

  // Query transactions for this order
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const txList = transactions ?? [];
  const orderTotal =
    Number(order.price ?? 0) * Number(order.quantity ?? 1) +
    Number(order.delivery_fee ?? 0);

  const refundedTotal = txList
    .filter((tx) => tx.type === "refund" && tx.status !== "failed")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const refundableAmount = Math.max(0, orderTotal - refundedTotal);

  return NextResponse.json({
    order_id: orderId,
    order_total: orderTotal,
    refunded_total: refundedTotal,
    refundable_amount: refundableAmount,
    is_fully_refunded: refundableAmount <= 0,
    transactions: txList,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — use client.ts in mock mode." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to issue order refunds." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const orderId = id.trim();
  const supabase = createSupabaseServerClient();

  // 1. Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json(
      { error: `Order "${orderId}" not found.` },
      { status: 404 }
    );
  }

  // 2. Authorization: only Admin or the seller who owns this order
  if (user.role === "seller") {
    const ownSellerId = await getOwnSellerId(supabase, user.id);
    if (!ownSellerId || order.seller_id !== ownSellerId) {
      return NextResponse.json(
        { error: "You may only issue refunds for orders belonging to your store." },
        { status: 403 }
      );
    }
  } else if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Refund authorization is restricted to sellers and administrators." },
      { status: 403 }
    );
  }

  // 3. Read payload
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  const body = isRecord(payload) ? payload : {};
  const requestedAmount = typeof body.amount === "number" ? body.amount : null;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "Customer order refund";

  // 4. Calculate total & refundable limits
  const orderTotal =
    Number(order.price ?? 0) * Number(order.quantity ?? 1) +
    Number(order.delivery_fee ?? 0);

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("amount, type, status")
    .eq("order_id", orderId);

  const priorRefunded = (existingTx ?? [])
    .filter((tx) => tx.type === "refund" && tx.status !== "failed")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const maxRefundable = Math.max(0, orderTotal - priorRefunded);

  if (maxRefundable <= 0) {
    return NextResponse.json(
      { error: `Order #${orderId} has already been fully refunded.` },
      { status: 400 }
    );
  }

  const refundAmount = requestedAmount
    ? Number(Math.min(requestedAmount, maxRefundable).toFixed(2))
    : Number(maxRefundable.toFixed(2));

  if (refundAmount <= 0) {
    return NextResponse.json(
      { error: "Refund amount must be greater than zero." },
      { status: 400 }
    );
  }

  // 5. Split calculation if gateway online payment
  const isOnlinePayment = order.payment_method === "upi" || Boolean(order.gateway);
  const splits: SplitRecipient[] = [];

  if (isOnlinePayment && order.seller_id) {
    const { data: seller } = await supabase
      .from("sellers")
      .select("payment_vendor_ref")
      .eq("id", order.seller_id)
      .maybeSingle();

    if (seller?.payment_vendor_ref) {
      // Attribute proportional reversal of maker share
      const ratio = refundAmount / orderTotal;
      const baseSellerShare =
        Number(order.base_price ?? order.price ?? 0) * Number(order.quantity ?? 1);
      const vendorRefundShare = Number((baseSellerShare * ratio).toFixed(2));

      if (vendorRefundShare > 0) {
        splits.push({
          vendorId: seller.payment_vendor_ref,
          amount: vendorRefundShare,
        });
      }
    }
  }

  // 6. Invoke Payment Adapter
  const adapter = getPaymentAdapter();
  const refundId = `ref_${order.id}_${Date.now()}`;
  let gatewayRefundId: string | undefined;
  let refundStatus: "SUCCESS" | "PENDING" | "FAILED" = "SUCCESS";

  if (isOnlinePayment) {
    const refundResult = await adapter.createRefund({
      orderId: order.id,
      gatewayOrderId: order.gateway_order_ref || order.id,
      refundId,
      refundAmount,
      reason,
      splits: splits.length > 0 ? splits : undefined,
    });

    if (!refundResult.success) {
      return NextResponse.json(
        {
          error:
            refundResult.error ||
            "The payment gateway rejected the refund. Please check your credentials or balance.",
        },
        { status: 400 }
      );
    }

    gatewayRefundId = refundResult.gatewayRefundId || refundId;
    refundStatus = refundResult.status;
  } else {
    // COD refund
    gatewayRefundId = `cod_${refundId}`;
    refundStatus = "SUCCESS";
  }

  // 7. Write to transactions ledger (append-only)
  try {
    await supabase.from("transactions").insert({
      order_id: order.id,
      seller_id: order.seller_id,
      gateway: order.gateway || (adapter.name === "cashfree" ? "cashfree" : "mock"),
      gateway_event_id: gatewayRefundId,
      type: "refund",
      amount: refundAmount,
      currency: "INR",
      status: refundStatus === "FAILED" ? "failed" : refundStatus === "PENDING" ? "pending" : "completed",
    });
  } catch {
    // Non-fatal if table constraint error or duplicate
  }

  const isFullRefund = priorRefunded + refundAmount >= orderTotal;

  // 8. If full refund, cancel order and restore stock
  let updatedOrder: Order = order as unknown as Order;
  if (isFullRefund && order.status !== "cancelled") {
    const { data: updated } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .select()
      .maybeSingle();

    if (updated) {
      updatedOrder = updated as unknown as Order;
    }

    // Restore stock
    const { data: prod } = await supabase
      .from("products")
      .select("stock")
      .eq("id", order.product_id)
      .maybeSingle();

    if (prod) {
      const restored = Math.max(0, Number(prod.stock) + Number(order.quantity));
      await supabase
        .from("products")
        .update({ stock: restored, is_available: true })
        .eq("id", order.product_id);
    }
  }

  // 9. Record audit entry
  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("audit_entries").insert({
      actor_id: user.id,
      actor_name: userProfile?.name || (user.role === "admin" ? "Administrator" : "Maker"),
      actor_email: userProfile?.email || "",
      entity_type: "order",
      entity_id: order.id,
      entity_label: order.product_name ?? order.id,
      action: "order_refunded",
      summary: `Refund of ₹${refundAmount} (${isFullRefund ? "full" : "partial"}) processed via ${
        order.gateway || "mock"
      }. Reason: ${reason}`,
    });
  } catch {
    // Non-fatal if audit insert fails
  }

  return NextResponse.json({
    success: true,
    refundId: gatewayRefundId,
    refundAmount,
    isFullRefund,
    status: refundStatus,
    order: updatedOrder,
  });
}
