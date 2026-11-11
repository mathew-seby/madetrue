/**
 * MADETRUE — Commission Reconciliation (Phase 10 Step 1)
 *
 * Pure math that ties three money sources together for a reporting window:
 *   1. Orders (price, base_price, commission, delivery_fee)
 *   2. The `transactions` ledger (payments, refunds, settlements, commissions)
 *   3. The payment gateway (Easy Split settlement batches)
 *
 * Used by THREE callers so the numbers can never drift apart:
 *   - app/api/settlements (Supabase mode, admin-guarded)
 *   - lib/supabase/client.ts getSettlementData (mock mode)
 *   - scripts/verifyReconciliation.ts (fixture-based verification)
 *
 * Honesty rules:
 *   - A source that has no data for a metric is reported as `unavailable`
 *     with a reason — never silently treated as zero to fake a match.
 *   - COD never passes through the gateway, so it is excluded from every
 *     gateway comparison by design (and said so in the notes).
 *   - Deltas are reported as they are; nothing is smoothed away.
 */

import type {
  PlatformReconciliationReport,
  ReconciliationLedgerTotals,
  ReconciliationMakerRow,
  ReconciliationOrderInput,
  ReconciliationOrdersTotals,
  ReconciliationTransactionInput,
  ReconciliationVariance,
  ReconciliationWindow,
} from "../../types";
import { DELIVERY_FEE } from "../utils/constants";
import type { SettlementItem } from "./types";

/** |delta| at or below this (₹0.01) counts as matched. */
export const RECONCILIATION_MATCH_TOLERANCE = 0.01;

export type { ReconciliationOrderInput, ReconciliationTransactionInput };

export interface ReconciliationMakerInput {
  id: string;
  businessName: string;
  vendorRef?: string | null;
}

export interface ReconciliationInput {
  orders: ReconciliationOrderInput[];
  transactions: ReconciliationTransactionInput[];
  settlements: SettlementItem[];
  /** Adapter-level pending settlement (clearance cycle allowance). */
  gatewayPending: number;
  window: ReconciliationWindow;
  gateway: string;
  makers: ReconciliationMakerInput[];
  /** When set, unattributed settlement batches count for this maker. */
  scopeSellerId?: string | null;
}

// ---------------------------------------------------------------------------
// Reporting window
// ---------------------------------------------------------------------------

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Resolves a period key (or an explicit from/to) into a half-open window.
 * Throws on an unknown period — silently meaning "all time" would be a trap.
 */
export function resolveReconciliationWindow(
  period?: string | null,
  from?: string | null,
  to?: string | null,
  now: Date = new Date()
): ReconciliationWindow {
  if (from && to) {
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Invalid reconciliation date range.");
    }
    return {
      from: start.toISOString(),
      to: end.toISOString(),
      label: `Custom range (${fmtDay(start)} – ${fmtDay(end)})`,
    };
  }

  switch (period) {
    case "30d": {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: start.toISOString(), to: null, label: "Last 30 days" };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: start.toISOString(),
        to: null,
        label: `This month (from ${fmtDay(start)})`,
      };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        label: `Last month (${fmtDay(start)} – ${fmtDay(end)})`,
      };
    }
    case "all":
    case null:
    case undefined:
    case "":
      return { from: null, to: null, label: "All time" };
    default:
      throw new Error(
        `Unknown reconciliation period "${period}". Use all, 30d, this_month or last_month.`
      );
  }
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

function inWindow(iso: string, w: ReconciliationWindow): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  if (w.from && t < Date.parse(w.from)) return false;
  if (w.to && t >= Date.parse(w.to)) return false;
  return true;
}

function round2(n: number): number {
  return Number((Math.round(n * 100) / 100).toFixed(2));
}

function withinTolerance(a: number, b: number): boolean {
  return Math.abs(round2(a) - round2(b)) <= RECONCILIATION_MATCH_TOLERANCE;
}

export function computeReconciliation(input: ReconciliationInput): PlatformReconciliationReport {
  const { orders, transactions, settlements, window: w, gateway } = input;

  // ---- Orders (non-cancelled, created inside the window) ------------------
  const perMakerOrders = new Map<
    string,
    {
      orderCount: number;
      grossSales: number;
      makerShare: number;
      onlineMakerShare: number;
      commission: number;
      deliveryFees: number;
      onlineSubtotal: number;
      codSubtotal: number;
      feeAnomalies: string[];
    }
  >();
  const platformOrders = {
    orderCount: 0,
    grossSales: 0,
    makerShare: 0,
    onlineMakerShare: 0,
    commission: 0,
    deliveryFees: 0,
    onlineSubtotal: 0,
    codSubtotal: 0,
    feeAnomalies: [] as string[],
  };

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    if (!inWindow(order.created_at, w)) continue;

    const maker =
      perMakerOrders.get(order.seller_id) ??
      {
        orderCount: 0,
        grossSales: 0,
        makerShare: 0,
        onlineMakerShare: 0,
        commission: 0,
        deliveryFees: 0,
        onlineSubtotal: 0,
        codSubtotal: 0,
        feeAnomalies: [] as string[],
      };

    const qty = Number(order.quantity ?? 1) || 0;
    const linePrice = Number(order.price ?? 0);
    const lineBase = Number(order.base_price ?? linePrice);
    const lineComm = Number(order.commission ?? Math.max(0, linePrice - lineBase));
    const lineFee = Number(order.delivery_fee ?? 0);
    const isCod = order.payment_method === "cod";

    maker.orderCount += 1;
    maker.grossSales += linePrice * qty;
    maker.makerShare += lineBase * qty;
    maker.commission += lineComm * qty;
    maker.deliveryFees += lineFee;
    if (isCod) {
      maker.codSubtotal += linePrice * qty;
    } else {
      maker.onlineMakerShare += lineBase * qty;
      maker.onlineSubtotal += linePrice * qty;
    }

    // Fee rule: delivery orders charge exactly ₹49, pickup orders ₹0.
    if (order.delivery_type === "delivery" && !withinTolerance(lineFee, DELIVERY_FEE)) {
      const anomaly = `${order.id}: delivery order charged ₹${lineFee} (expected ₹${DELIVERY_FEE})`;
      if (maker.feeAnomalies.length < 5) maker.feeAnomalies.push(anomaly);
      if (platformOrders.feeAnomalies.length < 5) platformOrders.feeAnomalies.push(anomaly);
    } else if (order.delivery_type === "pickup" && !withinTolerance(lineFee, 0)) {
      const anomaly = `${order.id}: pickup order charged ₹${lineFee} (expected ₹0)`;
      if (maker.feeAnomalies.length < 5) maker.feeAnomalies.push(anomaly);
      if (platformOrders.feeAnomalies.length < 5) platformOrders.feeAnomalies.push(anomaly);
    }

    perMakerOrders.set(order.seller_id, maker);

    platformOrders.orderCount += 1;
    platformOrders.grossSales += linePrice * qty;
    platformOrders.makerShare += lineBase * qty;
    platformOrders.commission += lineComm * qty;
    platformOrders.deliveryFees += lineFee;
    if (isCod) {
      platformOrders.codSubtotal += linePrice * qty;
    } else {
      platformOrders.onlineMakerShare += lineBase * qty;
      platformOrders.onlineSubtotal += linePrice * qty;
    }
  }

  // ---- Ledger (entries created inside the window) -------------------------
  const perMakerLedger = new Map<
    string,
    { entries: number; payments: number; refunds: number; settlements: number; commissions: number }
  >();
  const platformLedger = {
    entries: 0,
    payments: 0,
    refunds: 0,
    settlementEntries: 0,
    commissionEntries: 0,
  };

  for (const tx of transactions) {
    if (!inWindow(tx.created_at, w)) continue;

    const row =
      perMakerLedger.get(tx.seller_id) ??
      { entries: 0, payments: 0, refunds: 0, settlements: 0, commissions: 0 };
    const amount = Number(tx.amount ?? 0);

    row.entries += 1;
    platformLedger.entries += 1;

    if (tx.status === "completed") {
      if (tx.type === "payment") {
        row.payments += amount;
        platformLedger.payments += amount;
      } else if (tx.type === "refund") {
        row.refunds += amount;
        platformLedger.refunds += amount;
      } else if (tx.type === "settlement") {
        row.settlements += amount;
        platformLedger.settlementEntries += amount;
      } else if (tx.type === "commission") {
        row.commissions += amount;
        platformLedger.commissionEntries += amount;
      }
    }

    perMakerLedger.set(tx.seller_id, row);
  }

  const ledgerTotals: ReconciliationLedgerTotals = {
    entries: platformLedger.entries,
    payments: round2(platformLedger.payments),
    refunds: round2(platformLedger.refunds),
    settlementEntries: round2(platformLedger.settlementEntries),
    commissionEntries: round2(platformLedger.commissionEntries),
    hasEntries: platformLedger.entries > 0,
  };

  // ---- Gateway (SETTLED batches with settledAt inside the window) ---------
  const windowSettlements = settlements.filter((s) => {
    if (s.status !== "SETTLED") return false;
    return s.settledAt ? inWindow(s.settledAt, w) : false;
  });

  const settledFor = (sellerId: string, vendorRef?: string | null): number =>
    windowSettlements
      .filter(
        (item) =>
          (item.vendorId && vendorRef && item.vendorId === vendorRef) ||
          (!item.vendorId && input.scopeSellerId === sellerId)
      )
      .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const gatewayTotals = {
    batches: windowSettlements.length,
    settled: round2(windowSettlements.reduce((sum, s) => sum + Number(s.amount ?? 0), 0)),
    pending: round2(Number(input.gatewayPending ?? 0)),
  };

  // ---- Variances (one row per reconciled metric) --------------------------
  const variances: ReconciliationVariance[] = [];

  // 1. Platform commission: order pricing vs ledger commission entries.
  if (ledgerTotals.commissionEntries > 0) {
    const delta = round2(platformOrders.commission - ledgerTotals.commissionEntries);
    variances.push({
      metric: "platform_commission",
      label: "Platform commission",
      state: withinTolerance(platformOrders.commission, ledgerTotals.commissionEntries)
        ? "matched"
        : "variance",
      ordersSays: round2(platformOrders.commission),
      ledgerSays: ledgerTotals.commissionEntries,
      delta,
      note:
        Math.abs(delta) <= RECONCILIATION_MATCH_TOLERANCE
          ? "Ledger commission entries match (list − sourcing price) × quantity."
          : `Commission mismatch of ₹${Math.abs(delta)} between order pricing and ledger entries — investigate before payout day.`,
    });
  } else {
    variances.push({
      metric: "platform_commission",
      label: "Platform commission",
      state: "unavailable",
      ordersSays: round2(platformOrders.commission),
      note: "The ledger holds no commission entries yet — commission here is derived from order pricing only.",
    });
  }

  // 2. Delivery fees: the flat-fee rule itself.
  const anomalies = platformOrders.feeAnomalies.length;
  variances.push({
    metric: "delivery_fees",
    label: "Delivery fees",
    state: anomalies === 0 ? "matched" : "variance",
    ordersSays: round2(platformOrders.deliveryFees),
    delta: anomalies,
    note:
      anomalies === 0
        ? `Every delivery order charged ₹${DELIVERY_FEE} and every pickup order ₹0. Fees ride inside the order, so they are not separate ledger rows.`
        : `${anomalies} fee-rule anomal${anomalies === 1 ? "y" : "ies"}: ${platformOrders.feeAnomalies.join("; ")}${anomalies >= 5 ? "; …" : ""}`,
  });

  // 3. Gateway payments: ledger payments vs online order subtotals.
  if (ledgerTotals.hasEntries) {
    const delta = round2(platformOrders.onlineSubtotal - ledgerTotals.payments);
    variances.push({
      metric: "gateway_payments",
      label: "Gateway payments",
      state: withinTolerance(platformOrders.onlineSubtotal, ledgerTotals.payments)
        ? "matched"
        : "variance",
      ordersSays: round2(platformOrders.onlineSubtotal),
      ledgerSays: ledgerTotals.payments,
      delta,
      note:
        Math.abs(delta) <= RECONCILIATION_MATCH_TOLERANCE
          ? "Completed ledger payments cover every online order's product subtotal (COD excluded — cash never passes the gateway)."
          : `Ledger payments are ₹${Math.abs(delta)} ${delta >= 0 ? "short of" : "above"} the online order subtotals — missing or extra gateway payment rows.`,
    });
  } else {
    variances.push({
      metric: "gateway_payments",
      label: "Gateway payments",
      state: "unavailable",
      ordersSays: round2(platformOrders.onlineSubtotal),
      note: "No ledger entries in this window — the ledger only records gateway events, so an all-COD (or quiet) period has none.",
    });
  }

  // 4. Settlements: ledger settlement entries vs gateway batches.
  if (ledgerTotals.settlementEntries > 0) {
    const delta = round2(gatewayTotals.settled - ledgerTotals.settlementEntries);
    variances.push({
      metric: "settlements",
      label: "Settlements",
      state: withinTolerance(gatewayTotals.settled, ledgerTotals.settlementEntries)
        ? "matched"
        : "variance",
      ledgerSays: ledgerTotals.settlementEntries,
      gatewaySays: gatewayTotals.settled,
      delta,
      note:
        Math.abs(delta) <= RECONCILIATION_MATCH_TOLERANCE
          ? "Ledger settlement entries agree with the gateway batches in this window."
          : `Gateway settled amount differs from ledger settlement entries by ₹${Math.abs(delta)}.`,
    });
  } else {
    variances.push({
      metric: "settlements",
      label: "Settlements",
      state: "unavailable",
      gatewaySays: gatewayTotals.settled,
      note: "No settlement entries in the ledger yet — Easy Split batches live in the gateway sync, not the ledger.",
    });
  }

  // 5. Gateway costs (processing fees): no source records them yet.
  variances.push({
    metric: "gateway_costs",
    label: "Gateway costs",
    state: "unavailable",
    note: "Gateway processing-fee statements are not imported yet — live Cashfree credentials (Phase 6 · Step 7) unlock this line.",
  });

  // ---- Per-maker reconciliation rows --------------------------------------
  const makerRows: ReconciliationMakerRow[] = input.makers.map((maker) => {
    const o = perMakerOrders.get(maker.id) ?? {
      orderCount: 0,
      grossSales: 0,
      makerShare: 0,
      onlineMakerShare: 0,
      commission: 0,
      deliveryFees: 0,
      onlineSubtotal: 0,
      codSubtotal: 0,
      feeAnomalies: [] as string[],
    };
    const l = perMakerLedger.get(maker.id) ?? {
      entries: 0,
      payments: 0,
      refunds: 0,
      settlements: 0,
      commissions: 0,
    };
    const settled = settledFor(maker.id, maker.vendorRef ?? undefined);

    const payDelta = round2(l.payments - o.onlineSubtotal);
    const settleDelta = round2(settled - o.onlineMakerShare);

    const issues: string[] = [];
    const paymentsMismatch =
      ledgerTotals.hasEntries && o.onlineSubtotal > 0 && !withinTolerance(l.payments, o.onlineSubtotal);
    if (paymentsMismatch) {
      issues.push(
        `ledger payments are ₹${Math.abs(payDelta)} ${payDelta >= 0 ? "above" : "short of"} the online order subtotals`
      );
    }
    const overSettled = settleDelta > RECONCILIATION_MATCH_TOLERANCE;
    if (overSettled) {
      issues.push(
        `gateway reports ₹${Math.abs(settleDelta)} more settled than the orders justify — synthetic mock settlements or a sync gap`
      );
    }

    let status: ReconciliationMakerRow["status"];
    let note: string;
    if (o.orderCount === 0 && l.entries === 0 && settled === 0) {
      status = "no_activity";
      note = "No orders, ledger entries or settlements for this maker in the window.";
    } else if (issues.length > 0) {
      status = "variance";
      note = issues.join("; ");
    } else if (settleDelta < -RECONCILIATION_MATCH_TOLERANCE) {
      status = "pending_gateway";
      note = `₹${round2(o.onlineMakerShare - settled)} of the online share is still inside the settlement cycle (T+1/T+2) or awaiting sync.`;
    } else {
      status = "matched";
      note = "Ledger payments cover the online subtotals and the gateway settled the online maker share.";
    }

    return {
      sellerId: maker.id,
      businessName: maker.businessName,
      orderCount: o.orderCount,
      grossSales: round2(o.grossSales),
      commission: round2(o.commission),
      deliveryFees: round2(o.deliveryFees),
      onlineMakerShare: round2(o.onlineMakerShare),
      ledgerPayments: round2(l.payments),
      ledgerRefunds: round2(l.refunds),
      gatewaySettled: round2(settled),
      status,
      note,
    };
  });

  // ---- Platform status + honest notes ------------------------------------
  const available = variances.filter((v) => v.state !== "unavailable");
  const hasVariance = available.some((v) => v.state === "variance");
  const hasUnavailable = variances.some((v) => v.state === "unavailable");
  const status: PlatformReconciliationReport["status"] = hasVariance
    ? "variance"
    : hasUnavailable
    ? "partial_data"
    : "matched";

  const notes: string[] = [];
  notes.push(
    "COD orders are excluded from every gateway comparison — cash never passes through the gateway."
  );
  if (ledgerTotals.refunds > 0) {
    notes.push(
      `₹${ledgerTotals.refunds} was refunded in this window (money out — net gateway money is payments minus refunds).`
    );
  }
  if (gateway === "mock") {
    notes.push(
      "The mock gateway reports synthetic settlement batches — variances here are expected until live Cashfree credentials land."
    );
  }
  const unavailableNotes = variances
    .filter((v) => v.state === "unavailable")
    .map((v) => `${v.label}: ${v.note}`);
  notes.push(...unavailableNotes);

  const ordersTotals: ReconciliationOrdersTotals = {
    orderCount: platformOrders.orderCount,
    grossSales: round2(platformOrders.grossSales),
    makerShare: round2(platformOrders.makerShare),
    onlineMakerShare: round2(platformOrders.onlineMakerShare),
    commission: round2(platformOrders.commission),
    deliveryFees: round2(platformOrders.deliveryFees),
    onlineSubtotal: round2(platformOrders.onlineSubtotal),
    codSubtotal: round2(platformOrders.codSubtotal),
    feeAnomalies: platformOrders.feeAnomalies,
  };

  return {
    window: w,
    currency: "INR",
    gateway,
    orders: ordersTotals,
    ledger: ledgerTotals,
    gatewayTotals,
    variances,
    makerRows,
    status,
    notes,
  };
}
