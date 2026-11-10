import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";
import { getPaymentAdapter } from "@/lib/payments";
import type { SplitRecipient } from "@/lib/payments/types";

interface BasketItemInput {
  productId: string;
  sellerId: string;
  quantity: number;
  price: number;
  basePrice?: number;
  commission?: number;
}

interface SplitCheckoutRequest {
  items: BasketItemInput[];
  deliveryFee: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
}

export async function POST(request: Request) {
  let body: SplitCheckoutRequest;
  try {
    body = (await request.json()) as SplitCheckoutRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid split checkout payload." },
      { status: 400 }
    );
  }

  const { items, deliveryFee = 0, customer } = body;
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Basket is empty." },
      { status: 400 }
    );
  }

  if (!customer?.name || !customer?.phone) {
    return NextResponse.json(
      { error: "Customer name and phone number are required." },
      { status: 400 }
    );
  }

  let customerId = "guest_buyer";
  if (isSupabaseEnabled()) {
    try {
      const user = await getServerUser();
      if (user?.id) {
        customerId = user.id;
      }
    } catch {
      // Safe fallback if server auth client fails
    }
  } else if (customer.phone) {
    customerId = `mock_user_${customer.phone.replace(/\D/g, "").slice(-10) || "guest"}`;
  }

  // Calculate totals and group seller shares
  let subtotal = 0;
  const sellerShares = new Map<string, number>();

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const basePrice = item.basePrice !== undefined && item.basePrice !== null ? Number(item.basePrice) : price;

    subtotal += price * qty;
    const itemMakerShare = basePrice * qty;
    const current = sellerShares.get(item.sellerId) || 0;
    sellerShares.set(item.sellerId, current + itemMakerShare);
  }

  const fee = Number(deliveryFee) || 0;
  const totalAmount = Number((subtotal + fee).toFixed(2));

  // Lookup vendor IDs for sellers if Supabase is enabled
  const splits: SplitRecipient[] = [];
  let totalMakerShare = 0;

  if (isSupabaseEnabled()) {
    const supabase = createSupabaseServerClient();
    const sellerIds = Array.from(sellerShares.keys());

    const { data: sellers } = await supabase
      .from("sellers")
      .select("id, payment_vendor_ref")
      .in("id", sellerIds);

    const vendorRefMap = new Map<string, string>();
    (sellers ?? []).forEach((s) => {
      if (s.payment_vendor_ref) {
        vendorRefMap.set(s.id, s.payment_vendor_ref);
      }
    });

    for (const [sellerId, shareAmount] of sellerShares.entries()) {
      const roundedShare = Number(shareAmount.toFixed(2));
      totalMakerShare += roundedShare;
      splits.push({
        vendorId: vendorRefMap.get(sellerId) || `vendor_${sellerId}`,
        amount: roundedShare,
      });
    }
  } else {
    // Mock mode: derive vendor references
    for (const [sellerId, shareAmount] of sellerShares.entries()) {
      const roundedShare = Number(shareAmount.toFixed(2));
      totalMakerShare += roundedShare;
      splits.push({
        vendorId: `vendor_${sellerId}`,
        amount: roundedShare,
      });
    }
  }

  const platformShare = Number((totalAmount - totalMakerShare).toFixed(2));
  const adapter = getPaymentAdapter();
  const generatedOrderId = `mt_order_${Date.now()}`;

  const result = await adapter.createSplitOrder({
    orderId: generatedOrderId,
    orderAmount: totalAmount,
    currency: "INR",
    customer: {
      id: customerId,
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email?.trim(),
    },
    splits,
    notes: {
      platform: "MADETRUE",
      source: isSupabaseEnabled() ? "supabase" : "mock",
    },
  });

  return NextResponse.json({
    success: result.success,
    gateway: result.gateway,
    gatewayOrderId: result.gatewayOrderId,
    paymentSessionId: result.paymentSessionId,
    paymentUrl: result.paymentUrl,
    splits,
    breakdown: {
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee: fee,
      totalAmount,
      makersShare: Number(totalMakerShare.toFixed(2)),
      platformShare,
    },
    error: result.error,
  });
}

