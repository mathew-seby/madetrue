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
// Stock is decremented after insertion with an on-server guard
// (stock >= qty). Phase 4 hardens this into a single locked transaction.

import { NextResponse } from "next/server";
import type { Order } from "@/types";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

const PRODUCT_COLUMNS =
  "id, seller_id, name, price, base_price, commission, status, is_available, stock";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
      buyer_id: String(incoming.buyer_id ?? "guest-user"),
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
      gateway: null,
      gateway_order_ref: null,
      gateway_payment_ref: null,
      split_status: "not_applicable" as const,
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

    inserted.push(mapOrderRow(data));
  }

  // 3) Decrement stock with a server-side guard.
  for (const { incoming, product } of validated) {
    const newStock = Math.max(0, Number(product.stock) - Number(incoming.quantity));
    const { data: decremented, error: updateError } = await supabase
      .from("products")
      .update({
        stock: newStock,
        is_available: newStock > 0,
      })
      .eq("id", String(product.id))
      .gte("stock", Number(incoming.quantity))
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
  }

  return NextResponse.json(inserted);
}

function mapOrderRow(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    buyer_id: row.buyer_id as string,
    seller_id: row.seller_id as string,
    product_id: row.product_id as string,
    quantity: row.quantity as number,
    status: row.status as Order["status"],
    delivery_type: row.delivery_type as Order["delivery_type"],
    address: row.address as string,
    payment_method: row.payment_method as Order["payment_method"],
    whatsapp_notified: row.whatsapp_notified as boolean,
    created_at: row.created_at as string,
    lat: (row.lat as number | null) ?? undefined,
    lng: (row.lng as number | null) ?? undefined,
    base_price: (row.base_price as number | null) ?? undefined,
    commission: (row.commission as number | null) ?? undefined,
    buyer_name: (row.buyer_name as string | null) ?? undefined,
    buyer_phone: (row.buyer_phone as string | null) ?? undefined,
    product_name: (row.product_name as string | null) ?? undefined,
    price: (row.price as number | null) ?? undefined,
  };
}
