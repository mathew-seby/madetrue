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
import {
  resolveRefundPolicy,
  type RefundPolicyDecision,
} from "@/lib/utils/refundPolicy";
import { sendBuyerStatusUpdate, sendOrderWhatsApp } from "@/lib/whatsapp/notify";
import {
  buildMakerCancellationRequestTemplate,
  buildMakerCancellationAutoApprovedTemplate,
} from "@/lib/whatsapp/templates";
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

// ---------------------------------------------------------------------------
// Shared cancellation execution (Phase 10 Step 2)
//
// One code path for both approval kinds — a maker/admin approving a request,
// and the policy window auto-approving a not-yet-accepted order. The refund
// amount always comes from the published policy engine, capped at what is
// still refundable after any prior partial refunds (an approve can never
// over-refund), and money movement, ledger, stock and buyer notice all stay
// in lockstep.
// ---------------------------------------------------------------------------

interface PerformCancellationArgs {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  order: Record<string, unknown>;
  reason: string;
  actor: { id: string; role: string };
  /** True when the policy window approved without a human maker review. */
  viaAutoPolicy: boolean;
}

interface PerformCancellationResult {
  order: Order;
  refundAmount: number;
  isOnlinePaid: boolean;
  whatsappNotice: unknown;
}

async function performCancellation(
  args: PerformCancellationArgs
): Promise<PerformCancellationResult> {
  const { supabase, order, reason, actor, viaAutoPolicy } = args;

  // Prior completed refunds cap what may still be refunded (Phase 10 Step 2).
  const { data: priorTx } = await supabase
    .from("transactions")
    .select("amount, type, status")
    .eq("order_id", String(order.id));

  const priorRefunded = (priorTx ?? [])
    .filter((tx) => tx.type === "refund" && tx.status !== "failed")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const policy: RefundPolicyDecision = resolveRefundPolicy(
    {
      status: String(order.status ?? ""),
      payment_method: (order.payment_method as string | null) ?? null,
      gateway: (order.gateway as string | null) ?? null,
      delivery_type: (order.delivery_type as string | null) ?? null,
      price: (order.price as number | null) ?? null,
      quantity: (order.quantity as number | null) ?? null,
      delivery_fee: (order.delivery_fee as number | null) ?? null,
    },
    { priorRefunded }
  );

  const isOnlinePaid = order.payment_method === "upi" || Boolean(order.gateway);
  const refundAmount = isOnlinePaid ? policy.suggestedAmount : 0;

  let refundResult = null;
  let gatewayRefundId: string | undefined;

  if (isOnlinePaid && refundAmount > 0) {
    const adapter = getPaymentAdapter();
    const refundId = `ref_cancel_${String(order.id)}_${Date.now()}`;

    // Split reversal if the maker had a vendor reference
    const splits: SplitRecipient[] = [];
    if (order.seller_id) {
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("payment_vendor_ref")
        .eq("id", String(order.seller_id))
        .maybeSingle();

      if (sellerData?.payment_vendor_ref) {
        const orderTotal =
          Number(order.price ?? 0) * Number(order.quantity ?? 1) +
          Number(order.delivery_fee ?? 0);
        const ratio = orderTotal > 0 ? refundAmount / orderTotal : 1;
        const baseSellerShare =
          Number(order.base_price ?? order.price ?? 0) * Number(order.quantity ?? 1);
        const vendorRefundShare = Number((baseSellerShare * ratio).toFixed(2));
        if (vendorRefundShare > 0) {
          splits.push({
            vendorId: sellerData.payment_vendor_ref,
            amount: vendorRefundShare,
          });
        }
      }
    }

    refundResult = await adapter.createRefund({
      orderId: String(order.id),
      gatewayOrderId: String(order.gateway_order_ref || order.id),
      refundId,
      refundAmount,
      reason,
      splits: splits.length > 0 ? splits : undefined,
    });

    if (!refundResult.success) {
      throw Object.assign(
        new Error(
          refundResult.error ||
            "The payment gateway rejected the refund. Order was not cancelled."
        ),
        { statusCode: 400 }
      );
    }

    gatewayRefundId = refundResult.gatewayRefundId || refundId;

    // Append-only ledger row
    try {
      await supabase.from("transactions").insert({
        order_id: String(order.id),
        seller_id: String(order.seller_id),
        gateway: order.gateway || (adapter.name === "cashfree" ? "cashfree" : "mock"),
        gateway_event_id: gatewayRefundId,
        type: "refund",
        amount: refundAmount,
        currency: "INR",
        status:
          refundResult.status === "FAILED"
            ? "failed"
            : refundResult.status === "PENDING"
            ? "pending"
            : "completed",
      });
    } catch {
      // Non-fatal if transactions insert fails
    }
  }

  // Restore product inventory
  const { data: product } = await supabase
    .from("products")
    .select("stock")
    .eq("id", String(order.product_id))
    .maybeSingle();

  if (product) {
    const restored = Math.max(0, Number(product.stock) + Number(order.quantity));
    await supabase
      .from("products")
      .update({ stock: restored, is_available: true })
      .eq("id", String(order.product_id));
  }

  // Update order status to 'cancelled' and clear the request flag
  const { data: updated, error: updateErr } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancel_requested: false,
      cancel_reason: reason,
    })
    .eq("id", String(order.id))
    .select()
    .single();

  if (updateErr || !updated) {
    throw Object.assign(
      new Error(`Updating order status failed: ${updateErr?.message || "Unknown error"}`),
      { statusCode: 500 }
    );
  }

  // Audit entry when an admin acted (auto-approval is the policy itself)
  if (actor.role === "admin" && !viaAutoPolicy) {
    try {
      const { data: userProfile } = await supabase
        .from("users")
        .select("name, email")
        .eq("id", actor.id)
        .maybeSingle();

      await supabase.from("audit_entries").insert({
        actor_id: actor.id,
        actor_name: userProfile?.name || "Administrator",
        actor_email: userProfile?.email || "",
        entity_type: "order",
        entity_id: String(order.id),
        entity_label: order.product_name ?? String(order.id),
        action: "order_cancellation_approved",
        summary: `Order cancelled by admin. Refund of ₹${refundAmount} processed. Reason: ${reason}`,
      });
    } catch {
      // Non-fatal
    }
  }

  // Buyer notice — the cancelled/refunded template family covers both.
  const mapped = mapOrderRow(updated);
  const { data: sellerRow } = await supabase
    .from("sellers")
    .select("business_name")
    .eq("id", String(order.seller_id))
    .maybeSingle();

  const whatsappNotice = await sendBuyerStatusUpdate(
    mapped,
    sellerRow?.business_name ?? null
  );

  return {
    order: mapped,
    refundAmount,
    isOnlinePaid,
    whatsappNotice,
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
    const cancelReason = reason || "Customer requested cancellation";

    // Policy window (Phase 10 Step 2): a not-yet-accepted order is
    // auto-approved — the platform cancels and refunds instantly. Nothing
    // was cooked or packed, so no maker review and no waiting.
    const policy = resolveRefundPolicy({
      status: currentStatus,
      payment_method: (order.payment_method as string | null) ?? null,
      gateway: (order.gateway as string | null) ?? null,
      delivery_type: (order.delivery_type as string | null) ?? null,
      price: (order.price as number | null) ?? null,
      quantity: (order.quantity as number | null) ?? null,
      delivery_fee: (order.delivery_fee as number | null) ?? null,
    });

    if (policy.autoApprove) {
      try {
        const result = await performCancellation({
          supabase,
          order,
          reason: cancelReason,
          actor: { id: user.id, role: user.role },
          viaAutoPolicy: true,
        });

        // Maker heads-up (best-effort, never throws) — honest note that
        // nothing is owed and stock is already restored.
        const { data: maker } = await supabase
          .from("sellers")
          .select("business_name, whatsapp_number")
          .eq("id", order.seller_id)
          .maybeSingle();

        if (maker?.whatsapp_number) {
          await sendOrderWhatsApp({
            to: maker.whatsapp_number,
            body: buildMakerCancellationAutoApprovedTemplate(
              maker.business_name ?? "Maker",
              order.id,
              order.product_name ?? "ordered item",
              cancelReason
            ),
            orderId: order.id,
            recipientRole: "maker",
            event: "cancellation_auto_approved",
          });
        }

        return NextResponse.json({
          success: true,
          message: policy.reason,
          order: result.order,
          refund: { success: true, amount: result.refundAmount },
          autoApproved: true,
          policyWindow: policy.window,
          whatsappNotice: result.whatsappNotice,
        });
      } catch (e) {
        const status =
          (e as { statusCode?: number }).statusCode ?? 500;
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? e.message
                : "Cancellation could not be completed.",
          },
          { status }
        );
      }
    }

    // A request is already with the maker — review path only.
    if (order.cancel_requested) {
      return NextResponse.json(
        { error: "A cancellation request is already pending review with the maker." },
        { status: 400 }
      );
    }

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
        orderId: order.id,
        recipientRole: "maker",
        event: "cancellation_requested",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cancellation request submitted. The maker has been notified.",
      order: mapOrderRow(updated),
      policyWindow: policy.window,
      policyReason: policy.reason,
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

    // One shared execution path (Phase 10 Step 2): policy-derived refund
    // amount capped at what earlier partials left, gateway reversal, ledger
    // row, stock restore, status flip and buyer notice — all in lockstep.
    try {
      const result = await performCancellation({
        supabase,
        order,
        reason: cancellationReason,
        actor: { id: user.id, role: user.role },
        viaAutoPolicy: false,
      });

      return NextResponse.json({
        success: true,
        message:
          result.isOnlinePaid && result.refundAmount > 0
            ? `Cancellation approved — ₹${result.refundAmount} refund processed via the payment gateway and the items are back in stock.`
            : result.isOnlinePaid
            ? "Cancellation approved — the remaining refundable amount was already fully refunded in earlier partials; the items are back in stock."
            : "Order cancelled and inventory restored to stock. Cash on delivery — no money moves.",
        order: result.order,
        refund: { success: true, amount: result.refundAmount },
        whatsappNotice: result.whatsappNotice,
      });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode ?? 500;
      return NextResponse.json(
        {
          error:
            e instanceof Error
              ? e.message
              : "Cancellation could not be completed.",
        },
        { status }
      );
    }
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

