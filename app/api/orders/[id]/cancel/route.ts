// Order cancellation lifecycle (Phase 7 Step 5):
// Buyer request → Maker/Admin review & approve → Phase 6 adapter refund + inventory restore.
//
// Identity & authorization:
// - "request": only the buyer who owns the order (or admin). Only allowed on 'pending' or 'accepted' orders.
// - "approve" / "cancel": maker who owns the store (derived from session) or admin.
//   Restores product stock atomically, triggers payment gateway refund if online paid,
//   logs to append-only transactions ledger, updates status to 'cancelled', and notifies buyer.
// - "reject": maker or admin. Clears cancel_requested and records explanation note.

import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser, getOwnSellerId } from "@/lib/supabase/server-auth";
import { getPaymentAdapter } from "@/lib/payments";
import { canCancelOrder, normalizeOrderStatus } from "@/lib/utils/orderStatus";
import { sendBuyerStatusUpdate, sendOrderWhatsApp } from "@/lib/whatsapp/notify";
import { buildMakerCancellationRequestTemplate } from "@/lib/whatsapp/templates";
import type { Order, SplitRecipient } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapOrderRow(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    buyer_id: row.buyer_id as string,
    seller_id: row.seller_id as string,
    product_id: row.product_id as string,
    quantity: row.quantity as number,
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
    cancel_requested: (row.cancel_requested as boolean | null) ?? false,
    cancel_reason: (row.cancel_reason as string | null) ?? undefined,
    cancel_requested_at: (row.cancel_requested_at as string | null) ?? undefined,
    cancel_rejected_reason: (row.cancel_rejected_reason as string | null) ?? undefined,
  };
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
      { error: "Sign in required to manage order cancellations." },
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

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  const body = isRecord(payload) ? payload : {};
  const action = typeof body.action === "string" ? body.action.trim() : "request";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  // -------------------------------------------------------------------------
  // 1. ACTION: REQUEST (Buyer requests cancellation on pending/accepted order)
  // -------------------------------------------------------------------------
  if (action === "request") {
    // Ownership check: must be the buyer or admin
    if (order.buyer_id !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "You can only request cancellation for your own orders." },
        { status: 403 }
      );
    }

    const currentStatus = normalizeOrderStatus(order.status as string);
    if (currentStatus === "cancelled") {
      return NextResponse.json(
        { error: "This order is already cancelled." },
        { status: 400 }
      );
    }
    if (currentStatus === "ready" || currentStatus === "delivered") {
      return NextResponse.json(
        {
          error:
            "Orders that are already packed or delivered cannot be cancelled online. Please contact the maker directly.",
        },
        { status: 400 }
      );
    }
    if (order.cancel_requested) {
      return NextResponse.json(
        { error: "A cancellation request is already pending review with the maker." },
        { status: 400 }
      );
    }

    const cancelReason = reason || "Customer requested cancellation";
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({
        cancel_requested: true,
        cancel_reason: cancelReason,
        cancel_requested_at: new Date().toISOString(),
        cancel_rejected_reason: null,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { error: `Failed to record cancellation request: ${updateErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Alert the maker via WhatsApp (best-effort, never throws)
    const { data: maker } = await supabase
      .from("sellers")
      .select("business_name, whatsapp_number")
      .eq("id", order.seller_id)
      .maybeSingle();

    if (maker?.whatsapp_number) {
      await sendOrderWhatsApp({
        to: maker.whatsapp_number,
        body: buildMakerCancellationRequestTemplate(
          maker.business_name ?? "Maker",
          order.id,
          order.product_name ?? "ordered item",
          cancelReason
        ),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cancellation request submitted. The maker has been notified.",
      order: mapOrderRow(updated),
    });
  }

  // -------------------------------------------------------------------------
  // 2. ACTION: APPROVE / CANCEL (Maker or Admin approves request or cancels directly)
  // -------------------------------------------------------------------------
  if (action === "approve" || action === "cancel") {
    // Authorization: only the seller who owns the order or admin
    if (user.role === "seller") {
      const ownSellerId = await getOwnSellerId(supabase, user.id);
      if (!ownSellerId || order.seller_id !== ownSellerId) {
        return NextResponse.json(
          { error: "You may only manage orders belonging to your maker store." },
          { status: 403 }
        );
      }
    } else if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only the maker or an administrator can approve cancellations." },
        { status: 403 }
      );
    }

    const currentStatus = normalizeOrderStatus(order.status as string);
    if (currentStatus === "cancelled") {
      return NextResponse.json(
        { error: "This order is already cancelled." },
        { status: 400 }
      );
    }
    if (!canCancelOrder(currentStatus)) {
      return NextResponse.json(
        { error: `Orders in "${currentStatus}" status cannot be cancelled.` },
        { status: 400 }
      );
    }

    const cancellationReason =
      reason || order.cancel_reason || (action === "approve" ? "Cancellation approved by maker" : "Cancelled by maker");

    // Process refund if order was paid online
    const isOnlinePaid = order.payment_method === "upi" || Boolean(order.gateway);
    const orderTotal =
      Number(order.price ?? 0) * Number(order.quantity ?? 1) +
      Number(order.delivery_fee ?? 0);

    let refundResult = null;
    let gatewayRefundId: string | undefined;

    if (isOnlinePaid && orderTotal > 0) {
      const adapter = getPaymentAdapter();
      const refundId = `ref_cancel_${order.id}_${Date.now()}`;

      // Calculate split reversal if seller had a vendor reference
      const splits: SplitRecipient[] = [];
      if (order.seller_id) {
        const { data: sellerData } = await supabase
          .from("sellers")
          .select("payment_vendor_ref")
          .eq("id", order.seller_id)
          .maybeSingle();

        if (sellerData?.payment_vendor_ref) {
          const baseSellerShare =
            Number(order.base_price ?? order.price ?? 0) * Number(order.quantity ?? 1);
          if (baseSellerShare > 0) {
            splits.push({
              vendorId: sellerData.payment_vendor_ref,
              amount: baseSellerShare,
            });
          }
        }
      }

      refundResult = await adapter.createRefund({
        orderId: order.id,
        gatewayOrderId: order.gateway_order_ref || order.id,
        refundId,
        refundAmount: orderTotal,
        reason: cancellationReason,
        splits: splits.length > 0 ? splits : undefined,
      });

      if (!refundResult.success) {
        return NextResponse.json(
          {
            error:
              refundResult.error ||
              "The payment gateway rejected the refund. Order was not cancelled.",
          },
          { status: 400 }
        );
      }

      gatewayRefundId = refundResult.gatewayRefundId || refundId;

      // Insert append-only transaction ledger row
      try {
        await supabase.from("transactions").insert({
          order_id: order.id,
          seller_id: order.seller_id,
          gateway: order.gateway || (adapter.name === "cashfree" ? "cashfree" : "mock"),
          gateway_event_id: gatewayRefundId,
          type: "refund",
          amount: orderTotal,
          currency: "INR",
          status: refundResult.status === "FAILED" ? "failed" : refundResult.status === "PENDING" ? "pending" : "completed",
        });
      } catch {
        // Non-fatal if transactions insert fails
      }
    }

    // Restore product inventory
    const { data: product } = await supabase
      .from("products")
      .select("stock")
      .eq("id", order.product_id)
      .maybeSingle();

    if (product) {
      const restored = Math.max(0, Number(product.stock) + Number(order.quantity));
      await supabase
        .from("products")
        .update({ stock: restored, is_available: true })
        .eq("id", order.product_id);
    }

    // Update order status to 'cancelled' and clear cancel_requested
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        cancel_requested: false,
        cancel_reason: cancellationReason,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { error: `Updating order status failed: ${updateErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Record audit entry if admin was the actor
    if (user.role === "admin") {
      try {
        const { data: userProfile } = await supabase
          .from("users")
          .select("name, email")
          .eq("id", user.id)
          .maybeSingle();

        await supabase.from("audit_entries").insert({
          actor_id: user.id,
          actor_name: userProfile?.name || "Administrator",
          actor_email: userProfile?.email || "",
          entity_type: "order",
          entity_id: order.id,
          entity_label: order.product_name ?? order.id,
          action: "order_cancellation_approved",
          summary: `Order cancelled by admin. Refund of ₹${orderTotal} processed. Reason: ${cancellationReason}`,
        });
      } catch {
        // Non-fatal
      }
    }

    // Dispatch WhatsApp update to buyer informing them of cancellation and refund
    const mapped = mapOrderRow(updated);
    const { data: sellerRow } = await supabase
      .from("sellers")
      .select("business_name")
      .eq("id", order.seller_id)
      .maybeSingle();

    const whatsappNotice = await sendBuyerStatusUpdate(
      mapped,
      sellerRow?.business_name ?? null
    );

    return NextResponse.json({
      success: true,
      message: isOnlinePaid
        ? "Cancellation approved, refund processed via payment gateway, and inventory restored."
        : "Order cancelled and inventory restored to stock.",
      order: mapped,
      refund: refundResult,
      whatsappNotice,
    });
  }

  // -------------------------------------------------------------------------
  // 3. ACTION: REJECT (Maker or Admin declines buyer cancellation request)
  // -------------------------------------------------------------------------
  if (action === "reject") {
    if (user.role === "seller") {
      const ownSellerId = await getOwnSellerId(supabase, user.id);
      if (!ownSellerId || order.seller_id !== ownSellerId) {
        return NextResponse.json(
          { error: "You may only manage orders belonging to your maker store." },
          { status: 403 }
        );
      }
    } else if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only the maker or an administrator can decline cancellation requests." },
        { status: 403 }
      );
    }

    const rejectReason = reason || "Order is already in progress and cannot be cancelled.";
    const { data: updated, error: updateErr } = await supabase
      .from("orders")
      .update({
        cancel_requested: false,
        cancel_rejected_reason: rejectReason,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { error: `Failed to decline cancellation request: ${updateErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cancellation request declined. Order remains active for fulfillment.",
      order: mapOrderRow(updated),
    });
  }

  return NextResponse.json(
    { error: `Unknown cancellation action: "${action}". Must be "request", "approve", "cancel", or "reject".` },
    { status: 400 }
  );
}

