import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser, getOwnSellerId } from "@/lib/supabase/server-auth";
import { getPaymentAdapter } from "@/lib/payments";
import type {
  MakerCommissionReportRow,
  PlatformCommissionReport,
  SettlementSummary,
} from "@/types";

export async function GET(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — use client.ts in mock mode." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to view settlement and commission reports." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedSellerId = searchParams.get("seller_id");
  const supabase = createSupabaseServerClient();

  let targetSellerId: string | null = null;
  if (user.role === "seller") {
    const ownId = await getOwnSellerId(supabase, user.id);
    if (!ownId) {
      return NextResponse.json(
        { error: "Seller profile not found for this account." },
        { status: 404 }
      );
    }
    // Strict isolation: sellers can never view another maker's settlement data
    if (requestedSellerId && requestedSellerId !== ownId) {
      return NextResponse.json(
        { error: "Access denied. You may only view your own settlement reports." },
        { status: 403 }
      );
    }
    targetSellerId = ownId;
  } else if (user.role === "admin") {
    targetSellerId = requestedSellerId;
  } else {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // 1. Fetch sellers
  let sellersQuery = supabase
    .from("sellers")
    .select("id, business_name, payment_vendor_ref");
  if (targetSellerId) {
    sellersQuery = sellersQuery.eq("id", targetSellerId);
  }
  const { data: sellers } = await sellersQuery;
  const sellerList = sellers ?? [];

  // 2. Fetch orders (excluding cancelled)
  let ordersQuery = supabase
    .from("orders")
    .select(
      "id, seller_id, quantity, price, base_price, commission, delivery_fee, status, split_status, payment_method, gateway, created_at"
    )
    .neq("status", "cancelled");

  if (targetSellerId) {
    ordersQuery = ordersQuery.eq("seller_id", targetSellerId);
  }
  const { data: orders } = await ordersQuery;
  const orderList = orders ?? [];

  // 3. Adapter settlements query
  const adapter = getPaymentAdapter();
  const primaryVendorRef =
    targetSellerId && sellerList[0]?.payment_vendor_ref
      ? sellerList[0].payment_vendor_ref
      : undefined;

  let settlementSummary: SettlementSummary;
  try {
    settlementSummary = await adapter.getSettlements({
      vendorId: primaryVendorRef,
    });
  } catch {
    settlementSummary = {
      gateway: adapter.name,
      vendorId: primaryVendorRef,
      totalSettled: 0,
      pendingSettlement: 0,
      currency: "INR",
      settlements: [],
    };
  }

  // 4. Build maker-by-maker commission rows
  const makerRows: MakerCommissionReportRow[] = sellerList.map((seller) => {
    const makerOrders = orderList.filter((o) => o.seller_id === seller.id);
    const orderCount = makerOrders.length;

    let grossSales = 0;
    let makerShare = 0;
    let commission = 0;
    let deliveryFees = 0;

    for (const order of makerOrders) {
      const qty = Number(order.quantity ?? 1);
      const linePrice = Number(order.price ?? 0);
      const lineBase = Number(order.base_price ?? linePrice);
      const lineComm = Number(order.commission ?? Math.max(0, linePrice - lineBase));
      const lineFee = Number(order.delivery_fee ?? 0);

      grossSales += linePrice * qty;
      makerShare += lineBase * qty;
      commission += lineComm * qty;
      deliveryFees += lineFee;
    }

    // Settled amount from adapter settlements or completed splits
    const makerSettlements = settlementSummary.settlements.filter(
      (s) => !s.vendorId || s.vendorId === seller.payment_vendor_ref
    );
    const settledAmount = makerSettlements
      .filter((s) => s.status === "SETTLED")
      .reduce((sum, s) => sum + s.amount, 0);

    const pendingSettlement = Math.max(0, makerShare - settledAmount);
    const status: MakerCommissionReportRow["status"] =
      orderCount === 0
        ? "no_sales"
        : pendingSettlement > 0
        ? "pending"
        : "settled";

    return {
      sellerId: seller.id,
      businessName: seller.business_name,
      vendorRef: seller.payment_vendor_ref || undefined,
      orderCount,
      grossSales: Number(grossSales.toFixed(2)),
      makerShare: Number(makerShare.toFixed(2)),
      commission: Number(commission.toFixed(2)),
      deliveryFees: Number(deliveryFees.toFixed(2)),
      settledAmount: Number(settledAmount.toFixed(2)),
      pendingSettlement: Number(pendingSettlement.toFixed(2)),
      status,
    };
  });

  const totalGrossSales = makerRows.reduce((acc, r) => acc + r.grossSales, 0);
  const totalMakerPayouts = makerRows.reduce((acc, r) => acc + r.makerShare, 0);
  const totalCommissionEarned = makerRows.reduce((acc, r) => acc + r.commission, 0);
  const totalDeliveryFees = makerRows.reduce((acc, r) => acc + r.deliveryFees, 0);
  const totalSettledToMakers = makerRows.reduce((acc, r) => acc + r.settledAmount, 0);
  const totalPendingSettlement = makerRows.reduce((acc, r) => acc + r.pendingSettlement, 0);

  const commissionReport: PlatformCommissionReport = {
    period: "All-time (Real-time Synced)",
    currency: "INR",
    totalGrossSales: Number(totalGrossSales.toFixed(2)),
    totalMakerPayouts: Number(totalMakerPayouts.toFixed(2)),
    totalCommissionEarned: Number(totalCommissionEarned.toFixed(2)),
    totalDeliveryFees: Number(totalDeliveryFees.toFixed(2)),
    totalSettledToMakers: Number(totalSettledToMakers.toFixed(2)),
    totalPendingSettlement: Number(totalPendingSettlement.toFixed(2)),
    makerBreakdown: makerRows,
  };

  return NextResponse.json({
    gateway: adapter.name,
    summary: settlementSummary,
    commissionReport,
  });
}

export async function POST() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — use client.ts in mock mode." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user || (user.role !== "admin" && user.role !== "seller")) {
    return NextResponse.json(
      { error: "Sign in as maker or administrator required to sync settlements." },
      { status: 401 }
    );
  }

  const supabase = createSupabaseServerClient();
  let vendorRef: string | undefined;

  if (user.role === "seller") {
    const ownId = await getOwnSellerId(supabase, user.id);
    if (!ownId) {
      return NextResponse.json({ error: "Seller profile not found." }, { status: 404 });
    }
    const { data: seller } = await supabase
      .from("sellers")
      .select("payment_vendor_ref")
      .eq("id", ownId)
      .maybeSingle();
    vendorRef = seller?.payment_vendor_ref || undefined;
  }

  const adapter = getPaymentAdapter();
  const summary = await adapter.getSettlements({ vendorId: vendorRef });

  // Record audit entry
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
      entity_type: "seller",
      entity_id: user.id,
      entity_label: vendorRef || "Platform Settlements",
      action: "settlements_synced",
      summary: `Settlement reports synced from ${adapter.name.toUpperCase()} (${summary.settlements.length} settlement batches verified, ₹${summary.totalSettled} settled).`,
    });
  } catch {
    // Non-fatal if audit insert fails
  }

  return NextResponse.json({
    success: true,
    gateway: adapter.name,
    count: summary.settlements.length,
    summary,
  });
}
