import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeoutMinutes = parseInt(searchParams.get("minutes") || "30", 10);
  const thresholdDate = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  if (!isSupabaseEnabled()) {
    return NextResponse.json({
      success: true,
      mode: "mock",
      message: `Simulated abandoned order expiration (threshold: ${timeoutMinutes} minutes).`,
      expired_count: 0,
    });
  }

  const supabase = createSupabaseServerClient();

  // Find online orders pending beyond threshold
  const { data: abandonedOrders, error: findError } = await supabase
    .from("orders")
    .select("id, product_id, seller_id, quantity, price, gateway, gateway_order_ref")
    .not("gateway", "is", null)
    .eq("status", "pending")
    .eq("split_status", "pending")
    .lt("created_at", thresholdDate);

  if (findError) {
    return NextResponse.json(
      { error: `Failed to query abandoned orders: ${findError.message}` },
      { status: 500 }
    );
  }

  if (!abandonedOrders || abandonedOrders.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No abandoned orders found beyond threshold.",
      expired_count: 0,
    });
  }

  let expiredCount = 0;

  for (const ord of abandonedOrders) {
    // 1. Mark order cancelled
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled",
        split_status: "not_applicable",
      })
      .eq("id", ord.id);

    if (!updateError) {
      expiredCount++;

      // 2. Restore product stock honestly
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

      // 3. Record failed/expired ledger transaction
      if (ord.gateway) {
        const eventId = `evt_abandoned_${ord.id}_${Date.now()}`;
        try {
          await supabase.from("transactions").insert({
            order_id: ord.id,
            seller_id: ord.seller_id,
            gateway: ord.gateway,
            gateway_event_id: eventId,
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
    message: `Expired ${expiredCount} abandoned orders and restored product stock.`,
    expired_count: expiredCount,
    threshold: thresholdDate,
  });
}
