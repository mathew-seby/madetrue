// MADETRUE — Phase 10 Step 1: Commission Reconciliation Verification
//
// Verifies the pure reconciliation math (lib/payments/reconciliation.ts)
// against controlled fixtures:
// 1. Reporting window resolution (presets, explicit ranges, unknown period)
// 2. Fully matched period — orders, ledger and gateway agree; every rupee ties
// 3. Drift detection — missing/extra ledger rows and over-settlement surface
//    as honest variances (never smoothed away)
// 4. Window filtering — out-of-window orders/ledger/batches excluded
// 5. Delivery-fee rule — anomalies detected against the flat ₹49 / ₹0 rule
// 6. Honest unavailability — sparse sources report "unavailable", not fake
//    matches; COD is excluded from gateway comparisons by design
//
// Run: npx tsx scripts/verifyReconciliation.ts

import {
  computeReconciliation,
  resolveReconciliationWindow,
  type ReconciliationInput,
  type ReconciliationOrderInput,
  type ReconciliationTransactionInput,
} from "../lib/payments/reconciliation";
import type { SettlementItem } from "../lib/payments/types";

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
}

function money(n: number): string {
  return `₹${n}`;
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

const MAKERS = [
  { id: "seller-1", businessName: "Sreedevi's Spices", vendorRef: "vendor_seller_1" },
  { id: "seller-2", businessName: "Karthik's Pickles", vendorRef: "vendor_seller_2" },
];

// November 2026 window (fixed, no clock dependence).
const WINDOW = {
  from: "2026-11-01T00:00:00.000Z",
  to: "2026-12-01T00:00:00.000Z",
  label: "Fixture window",
};

function order(partial: Partial<ReconciliationOrderInput> & { id: string; seller_id: string }): ReconciliationOrderInput {
  return {
    quantity: 1,
    price: 100,
    base_price: 80,
    commission: 20,
    delivery_fee: 0,
    status: "delivered",
    payment_method: "upi",
    delivery_type: "pickup",
    created_at: "2026-11-05T10:00:00.000Z",
    ...partial,
  };
}

function tx(partial: Partial<ReconciliationTransactionInput> & { id?: string }): ReconciliationTransactionInput {
  return {
    order_id: "order-x",
    seller_id: "seller-1",
    type: "payment",
    amount: 100,
    status: "completed",
    created_at: "2026-11-05T11:00:00.000Z",
    ...partial,
  } as ReconciliationTransactionInput;
}

function settlement(partial: Partial<SettlementItem> & { settlementId: string }): SettlementItem {
  return {
    vendorId: "vendor_seller_1",
    amount: 100,
    currency: "INR",
    status: "SETTLED",
    settledAt: "2026-11-07T09:00:00.000Z",
    ...partial,
  };
}

function buildInput(overrides: Partial<ReconciliationInput> = {}): ReconciliationInput {
  return {
    orders: [
      // seller-1: UPI delivery order — gross 380, share 320, commission 60, fee 49
      order({
        id: "order-a1",
        seller_id: "seller-1",
        quantity: 2,
        price: 190,
        base_price: 160,
        commission: 30,
        delivery_fee: 49,
        delivery_type: "delivery",
        payment_method: "upi",
      }),
      // seller-1: COD pickup order — gross 120, share 100, commission 20, fee 0
      order({
        id: "order-a2",
        seller_id: "seller-1",
        quantity: 1,
        price: 120,
        base_price: 100,
        commission: 20,
        delivery_fee: 0,
        delivery_type: "pickup",
        payment_method: "cod",
      }),
      // seller-2: UPI delivery order — gross 240, share 195, commission 45, fee 49
      order({
        id: "order-a3",
        seller_id: "seller-2",
        quantity: 3,
        price: 80,
        base_price: 65,
        commission: 15,
        delivery_fee: 49,
        delivery_type: "delivery",
        payment_method: "upi",
      }),
    ],
    transactions: [
      tx({ order_id: "order-a1", seller_id: "seller-1", amount: 380 }),
      tx({ order_id: "order-a3", seller_id: "seller-2", amount: 240 }),
      tx({ order_id: "commission-batch-1", seller_id: "seller-1", type: "commission", amount: 125 }),
      tx({ order_id: "settlement-batch-1", seller_id: "seller-1", type: "settlement", amount: 515 }),
    ],
    settlements: [
      settlement({ settlementId: "settle-1", vendorId: "vendor_seller_1", amount: 320, settledAt: "2026-11-07T09:00:00.000Z" }),
      settlement({ settlementId: "settle-2", vendorId: "vendor_seller_2", amount: 195, settledAt: "2026-11-08T09:00:00.000Z" }),
    ],
    gatewayPending: 0,
    window: WINDOW,
    gateway: "cashfree",
    makers: MAKERS,
    ...overrides,
  };
}

console.log("\n=======================================================");
console.log(" MADETRUE — Phase 10 Step 1: Reconciliation Audit");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Reporting window resolution
// ---------------------------------------------------------------------------
console.log("Checking 1: Reporting window resolution...");

const allTime = resolveReconciliationWindow("all", null, null, new Date("2026-11-11T00:00:00.000Z"));
assert(allTime.from === null && allTime.to === null, "period 'all' must open both bounds");
assert(allTime.label.length > 0, "period 'all' must carry a human label");

const last30 = resolveReconciliationWindow("30d", null, null, new Date("2026-11-11T00:00:00.000Z"));
assert(last30.from !== null, "period '30d' must set a lower bound");
assert(last30.to === null, "period '30d' must leave the upper bound open");
assert(Date.parse(last30.from!) < Date.parse("2026-11-11T00:00:00.000Z"), "period '30d' lower bound must sit in the past");

const thisMonth = resolveReconciliationWindow("this_month", null, null, new Date("2026-11-11T00:00:00.000Z"));
// Month boundaries are LOCAL midnights (the platform is Kerala/IST first),
// so the expected instant is constructed the same way rather than hardcoded UTC.
assert(thisMonth.from !== null, "'this_month' must set a lower bound");
assert(thisMonth.from === new Date(2026, 10, 1).toISOString(), "'this_month' must start on the 1st of the current month (local midnight)");

const lastMonth = resolveReconciliationWindow("last_month", null, null, new Date("2026-11-11T00:00:00.000Z"));
assert(lastMonth.from === new Date(2026, 9, 1).toISOString(), "'last_month' must start on the 1st of the previous month (local midnight)");
assert(lastMonth.to === new Date(2026, 10, 1).toISOString(), "'last_month' must end on the 1st of the current month (local midnight)");

const custom = resolveReconciliationWindow(null, "2026-11-01T00:00:00.000Z", "2026-11-30T00:00:00.000Z");
assert(custom.from !== null && custom.to !== null, "an explicit range must be honoured over any period key");

let threwOnUnknown = false;
try {
  resolveReconciliationWindow("fortnight");
} catch {
  threwOnUnknown = true;
}
assert(threwOnUnknown, "an unknown period key must throw instead of silently meaning all-time");

console.log("  ✅ Window resolution verified (all/30d/this_month/last_month/custom/unknown).");

// ---------------------------------------------------------------------------
// 2. Fully matched period
// ---------------------------------------------------------------------------
console.log("Checking 2: Fully matched period ties out on every rupee...");

const matched = computeReconciliation(buildInput());

// Orders: gross 740 (380 + 120 + 240), commission 125, fees 98, online subtotal 620
assert(matched.orders.grossSales === 740, `orders gross must be 740, got ${money(matched.orders.grossSales)}`);
assert(matched.orders.commission === 125, `commission must be 125, got ${money(matched.orders.commission)}`);
assert(matched.orders.deliveryFees === 98, `delivery fees must be 98, got ${money(matched.orders.deliveryFees)}`);
assert(matched.orders.onlineSubtotal === 620, `online subtotal must be 620, got ${money(matched.orders.onlineSubtotal)}`);
assert(matched.orders.codSubtotal === 120, `COD subtotal must be 120, got ${money(matched.orders.codSubtotal)}`);
assert(matched.orders.onlineMakerShare === 515, `online maker share must be 515, got ${money(matched.orders.onlineMakerShare)}`);

// Ledger: payments 620, commission entries 125, settlement entries 515
assert(matched.ledger.payments === 620, `ledger payments must be 620, got ${money(matched.ledger.payments)}`);
assert(matched.ledger.commissionEntries === 125, `ledger commission entries must be 125`);
assert(matched.ledger.settlementEntries === 515, `ledger settlement entries must be 515`);
assert(matched.ledger.hasEntries === true, "ledger must report entries present");

// Gateway: two settled batches, 515 total
assert(matched.gatewayTotals.batches === 2, `gateway batch count must be 2, got ${matched.gatewayTotals.batches}`);
assert(matched.gatewayTotals.settled === 515, `gateway settled must be 515, got ${money(matched.gatewayTotals.settled)}`);

// Every available metric matches
for (const v of matched.variances) {
  if (v.metric === "gateway_costs") continue; // no source records fees yet
  assert(v.state !== "variance", `${v.metric} must not report variance in a matched fixture (note: ${v.note})`);
}
assert(
  matched.variances.find((v) => v.metric === "gateway_payments")?.state === "matched",
  "gateway payments must match when ledger covers online subtotals"
);
assert(
  matched.variances.find((v) => v.metric === "settlements")?.state === "matched",
  "settlements must match when ledger entries equal gateway batches"
);
assert(
  matched.variances.find((v) => v.metric === "platform_commission")?.state === "matched",
  "commission must match when ledger entries equal order-derived commission"
);
assert(
  matched.variances.find((v) => v.metric === "delivery_fees")?.state === "matched",
  "delivery fees must match when the flat-fee rule holds"
);

assert(matched.status === "partial_data", `platform status must be "partial_data" while gateway costs have no source yet, got "${matched.status}"`);

// Maker rows: both makers matched
const m1 = matched.makerRows.find((r) => r.sellerId === "seller-1");
const m2 = matched.makerRows.find((r) => r.sellerId === "seller-2");
assert(m1?.status === "matched", `seller-1 must be matched, got "${m1?.status}" (${m1?.note})`);
assert(m2?.status === "matched", `seller-2 must be matched, got "${m2?.status}" (${m2?.note})`);

// COD exclusion note present
assert(
  matched.notes.some((n) => n.includes("COD")),
  "the report must say COD is excluded from gateway comparisons"
);

console.log("  ✅ Matched fixture ties out: orders, ledger and gateway agree.");

// ---------------------------------------------------------------------------
// 3. Drift detection
// ---------------------------------------------------------------------------
console.log("Checking 3: Drift surfaces as honest variance...");

// Missing seller-2 payment (−240), short commission (−15), over-settled seller-2 (+305)
const drifted = computeReconciliation(
  buildInput({
    transactions: [
      tx({ order_id: "order-a1", seller_id: "seller-1", amount: 380 }),
      tx({ order_id: "commission-batch-1", seller_id: "seller-1", type: "commission", amount: 110 }),
      tx({ order_id: "settlement-batch-1", seller_id: "seller-1", type: "settlement", amount: 515 }),
    ],
    settlements: [
      settlement({ settlementId: "settle-1", vendorId: "vendor_seller_1", amount: 320, settledAt: "2026-11-07T09:00:00.000Z" }),
      settlement({ settlementId: "settle-2", vendorId: "vendor_seller_2", amount: 500, settledAt: "2026-11-08T09:00:00.000Z" }),
    ],
  })
);

const payVariance = drifted.variances.find((v) => v.metric === "gateway_payments");
assert(payVariance?.state === "variance", "a missing ledger payment must surface as gateway_payments variance");
assert(payVariance?.delta === 240, `gateway_payments delta must be 240, got ${payVariance?.delta}`);

const commVariance = drifted.variances.find((v) => v.metric === "platform_commission");
assert(commVariance?.state === "variance", "short commission entries must surface as platform_commission variance");
assert(commVariance?.delta === 15, `commission delta must be 15, got ${commVariance?.delta}`);

const s2 = drifted.makerRows.find((r) => r.sellerId === "seller-2");
assert(s2?.status === "variance", `seller-2 must be flagged variance, got "${s2?.status}"`);
assert(
  (s2?.note ?? "").includes("more settled"),
  "over-settlement must be called out in the maker note"
);

assert(drifted.status === "variance", `platform status must be "variance", got "${drifted.status}"`);

console.log("  ✅ Drift detected: missing payments, short commission and over-settlement all flagged.");

// ---------------------------------------------------------------------------
// 4. Window filtering
// ---------------------------------------------------------------------------
console.log("Checking 4: Out-of-window activity is excluded...");

const filtered = computeReconciliation(
  buildInput({
    orders: [
      order({ id: "old-1", seller_id: "seller-1", created_at: "2026-10-20T10:00:00.000Z" }),
    ],
    transactions: [
      tx({ created_at: "2026-10-21T10:00:00.000Z", amount: 100 }),
    ],
    settlements: [
      settlement({ settlementId: "old-settle", settledAt: "2026-10-25T09:00:00.000Z" }),
    ],
  })
);

assert(filtered.orders.orderCount === 0, "out-of-window orders must be excluded");
assert(filtered.orders.grossSales === 0, "out-of-window gross must not leak in");
assert(filtered.ledger.entries === 0, "out-of-window ledger rows must be excluded");
assert(filtered.ledger.hasEntries === false, "an empty window must report hasEntries=false");
assert(filtered.gatewayTotals.batches === 0, "out-of-window settlement batches must be excluded");

const filteredPayments = filtered.variances.find((v) => v.metric === "gateway_payments");
assert(filteredPayments?.state === "unavailable", "an empty ledger must report gateway_payments as unavailable, not matched");

const noActivityRows = filtered.makerRows.filter((r) => r.status === "no_activity");
assert(noActivityRows.length === 2, "both makers must be no_activity in an empty window");

console.log("  ✅ Window filtering verified: orders, ledger and gateway all respect the bounds.");

// ---------------------------------------------------------------------------
// 5. Delivery-fee rule
// ---------------------------------------------------------------------------
console.log("Checking 5: Delivery-fee rule anomalies...");

const feeDrift = computeReconciliation(
  buildInput({
    orders: [
      order({ id: "fee-bad-1", seller_id: "seller-1", delivery_type: "delivery", delivery_fee: 30 }),
      order({ id: "fee-bad-2", seller_id: "seller-2", delivery_type: "pickup", delivery_fee: 49 }),
    ],
  })
);

const feeMetric = feeDrift.variances.find((v) => v.metric === "delivery_fees");
assert(feeMetric?.state === "variance", "fee-rule violations must surface as delivery_fees variance");
assert(
  (feeMetric?.note ?? "").includes("fee-bad-1") && (feeMetric?.note ?? "").includes("fee-bad-2"),
  "the fee note must name the offending orders"
);
assert(feeMetric?.ordersSays === 79, `fee total must be 79 (30 + 49), got ${money(feeMetric?.ordersSays ?? 0)}`);
assert(feeDrift.status === "variance", "a fee anomaly must push platform status to variance");

console.log("  ✅ Fee-rule anomalies detected with the offending order ids named.");

// ---------------------------------------------------------------------------
// 6. Honest unavailability + settlement pending cycle
// ---------------------------------------------------------------------------
console.log("Checking 6: Sparse sources stay honest; clearance cycle is respected...");

// No commission or settlement entries in the ledger; gateway still settling.
const sparse = computeReconciliation(
  buildInput({
    transactions: [
      tx({ order_id: "order-a1", seller_id: "seller-1", amount: 380 }),
      tx({ order_id: "order-a3", seller_id: "seller-2", amount: 240 }),
    ],
    settlements: [],
    gatewayPending: 515,
  })
);

const sparseCommission = sparse.variances.find((v) => v.metric === "platform_commission");
assert(sparseCommission?.state === "unavailable", "commission without ledger entries must be unavailable, not matched");
assert((sparseCommission?.note ?? "").length > 10, "unavailable commission must carry a reason");

const sparseSettlements = sparse.variances.find((v) => v.metric === "settlements");
assert(sparseSettlements?.state === "unavailable", "settlements without ledger entries must be unavailable");
assert(sparse.status === "partial_data", `sparse platform status must be partial_data, got "${sparse.status}"`);

// Under-settled but fully covered by pending (normal T+1/T+2 cycle) → matched
const s1 = sparse.makerRows.find((r) => r.sellerId === "seller-1");
assert(s1?.status === "pending_gateway", `under-settled maker must be pending_gateway, got "${s1?.status}"`);

// Under-settled with NO pending cover → variance (money unaccounted)
const unaccounted = computeReconciliation(
  buildInput({
    settlements: [],
    gatewayPending: 0,
  })
);
const unaccountedPayments = unaccounted.variances.find((v) => v.metric === "gateway_payments");
assert(unaccountedPayments?.state === "matched", "ledger payments still cover online subtotals");
assert(unaccounted.status === "variance", `ledger settlement entries with no gateway batches must drive status to variance, got "${unaccounted.status}"`);

const gatewayCosts = unaccounted.variances.find((v) => v.metric === "gateway_costs");
assert(gatewayCosts?.state === "unavailable", "gateway costs have no source yet and must say so");
assert(
  (gatewayCosts?.note ?? "").includes("Cashfree"),
  "gateway-cost note must point at the live-credentials prerequisite"
);

console.log("  ✅ Sparse sources report unavailable with reasons; clearance cycle respected.");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(" ✅ 6/6 reconciliation checks passed — money math is honest.");
console.log("=======================================================\n");
