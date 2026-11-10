import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getPaymentAdapter } from "@/lib/payments";

export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature") || "";
  const timestamp = request.headers.get("x-webhook-timestamp") || "";
  const rawBody = await request.text();

  if (!rawBody) {
    return NextResponse.json({ error: "Empty webhook body" }, { status: 400 });
  }

  // 1. Cryptographic signature verification via PaymentAdapter
  const adapter = getPaymentAdapter();
  const verification = await adapter.verifyWebhook({ rawBody, signature, timestamp });

  if (!verification.valid || !verification.event) {
    return NextResponse.json(
      { error: verification.error || "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const event = verification.event;
  const eventType = (event.eventType || "").toUpperCase();
  const eventData = (event.data || {}) as Record<string, unknown>;
  const orderData = (eventData.order || {}) as Record<string, unknown>;
  const paymentData = (eventData.payment || {}) as Record<string, unknown>;

  const orderRef = String(orderData.order_id || eventData.order_id || "");
  const paymentId = String(paymentData.cf_payment_id || paymentData.payment_id || event.eventId || "");
  const gatewayEventId = String(event.eventId || `evt_${orderRef}_${paymentId}`);

  // In Mock mode, acknowledge receipt cleanly
  if (!isSupabaseEnabled()) {
    return NextResponse.json({
      success: true,
      gateway: adapter.name,
      event_id: gatewayEventId,
      event_type: eventType,
      order_id: orderRef,
      message: "Webhook processed in mock mode",
    });
  }

  const supabase = createSupabaseServerClient();

  // 2. Idempotency Check: check if event was already recorded in transactions
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("gateway_event_id", gatewayEventId)
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json(
      { message: "Event already processed (idempotent)", event_id: gatewayEventId },
      { status: 200 }
    );
  }

  if (!orderRef) {
    return NextResponse.json(
      { error: "Webhook event contains no order reference" },
      { status: 400 }
    );
  }

  // 3. Find matching orders by gateway_order_ref
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, seller_id, product_id, quantity, price, status, split_status")
    .eq("gateway_order_ref", orderRef);

  if (ordersError) {
    return NextResponse.json(
      { error: `Database lookup failed: ${ordersError.message}` },
      { status: 500 }
    );
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json(
      { message: "No matching orders found for gateway_order_ref", order_ref: orderRef },
      { status: 200 }
    );
  }

  // 4. Handle Event Types
  const isPaymentSuccess =
    eventType === "PAYMENT_SUCCESS_WEBHOOK" ||
    eventType === "PAYMENT_SUCCESS" ||
    String(paymentData.payment_status).toUpperCase() === "SUCCESS";

  const isPaymentFailed =
    eventType === "PAYMENT_FAILED_WEBHOOK" ||
    eventType === "PAYMENT_FAILED" ||
    String(paymentData.payment_status).toUpperCase() === "FAILED";

  const isUserDroppedOrExpired =
    eventType === "PAYMENT_USER_DROPPED_WEBHOOK" ||
    eventType === "ORDER_EXPIRED_WEBHOOK" ||
    String(paymentData.payment_status).toUpperCase() === "USER_DROPPED";

  for (const ord of orders) {
    if (isPaymentSuccess) {
      // Payment Succeeded: mark split_status completed, set gateway_payment_ref
      await supabase
        .from("orders")
        .update({
          gateway_payment_ref: paymentId || undefined,
          split_status: "completed",
        })
        .eq("id", ord.id);

      // Record transaction ledger row
      const lineTxEventId = `${gatewayEventId}_${ord.id}`;
      try {
        await supabase.from("transactions").insert({
          order_id: ord.id,
          seller_id: ord.seller_id,
          gateway: adapter.name,
          gateway_event_id: lineTxEventId,
          type: "payment",
          amount: Number(ord.price) * Number(ord.quantity),
          currency: "INR",
          status: "completed",
        });
      } catch {
        // Idempotency: duplicate transactions skipped safely
      }
    } else if (isPaymentFailed || isUserDroppedOrExpired) {
      // Payment Failed / User Dropped: cancel order, restore stock
      if (ord.status === "pending") {
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            split_status: isPaymentFailed ? "failed" : "not_applicable",
          })
          .eq("id", ord.id);

        // Restore product stock
        const { data: prod } = await supabase
          .from("products")
          .select("stock")
          .eq("id", ord.product_id)
          .maybeSingle();

        if (prod) {
          await supabase
            .from("products")
            .update({
              stock: Number(prod.stock) + Number(ord.quantity),
              is_available: true,
            })
            .eq("id", ord.product_id);
        }

        // Record failed transaction in ledger
        const lineTxEventId = `${gatewayEventId}_${ord.id}`;
        try {
          await supabase.from("transactions").insert({
            order_id: ord.id,
            seller_id: ord.seller_id,
            gateway: adapter.name,
            gateway_event_id: lineTxEventId,
            type: "payment",
            amount: Number(ord.price) * Number(ord.quantity),
            currency: "INR",
            status: "failed",
          });
        } catch {
          // Idempotency: duplicate transactions skipped safely
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    gateway: adapter.name,
    event_id: gatewayEventId,
    event_type: eventType,
    processed_orders: orders.length,
  });
}
