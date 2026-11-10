"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Lock,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  MessageCircle,
  MapPin,
  Store,
  ChevronDown,
  AlertCircle,
  X,
  RotateCcw,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";
import {
  getOrdersForBuyer,
  getSellers,
  requestOrderCancellation,
} from "@/lib/supabase/client";
import { Order, Seller } from "@/types";
import {
  getOrderBuyerStatusSummary,
  getOrderStatusLabel,
  canBuyerRequestCancellation,
} from "@/lib/utils/orderStatus";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";

// History loads five at a time ("Show more") — the query stays capped and the
// page stays honest about how many more exist. SQL-side pagination lands if
// the book ever outgrows this.
const PAGE_SIZE = 5;

const STATUS_CHIP: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-accent-gold/15 text-[#8a5a12] border-accent-gold/30",
  delivered: "bg-primary-green/15 text-primary-green border-primary-green/20",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LINE: Record<string, string> = {
  pending: "text-amber-800",
  accepted: "text-blue-800",
  ready: "text-[#8a5a12]",
  delivered: "text-primary-green",
  cancelled: "text-red-700",
};

export default function OrdersPage() {
  const { currentUser } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [sellersMap, setSellersMap] = useState<
    Record<string, { name: string; whatsapp: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Counts from the previous successful read — the "Show more" state only
  // restarts when the order book actually changed (login switches, a new
  // basket), never because a poll returned the same list.
  const prevOrderCount = useRef<number | null>(null);

  // Cancellation request state (Phase 7 Step 5)
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState("Ordered by mistake");
  const [cancelCustomReason, setCancelCustomReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelActionNotice, setCancelActionNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const handleRequestCancellation = async () => {
    if (!cancelModalOrder) return;
    const finalReason =
      cancelReasonPreset === "Other"
        ? cancelCustomReason.trim() || "Customer requested cancellation"
        : cancelReasonPreset;

    setCancelSubmitting(true);
    setCancelActionNotice(null);
    try {
      const updated = await requestOrderCancellation(cancelModalOrder.id, finalReason);
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelModalOrder.id ? updated : o))
      );
      setCancelActionNotice({
        kind: "success",
        text: `Cancellation requested for order #${cancelModalOrder.id}. The maker has been notified.`,
      });
      setCancelModalOrder(null);
      setCancelCustomReason("");
      setTimeout(() => setCancelActionNotice(null), 5000);
    } catch (err: unknown) {
      setCancelActionNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to submit cancellation request.",
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Latest loader behind a ref so the mount effect and the poll interval can
  // call it without the React-compiler lint rule tracing a synchronous
  // setState into effect execution (the writes all sit after awaits).
  const loadRef = useRef<(silent?: boolean) => Promise<void>>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!currentUser) return;
      if (!silent) {
        setError(null);
        setLoading(true);
      }
      try {
        const [list, sellers] = await Promise.all([
          getOrdersForBuyer(currentUser.id),
          getSellers().catch(() => [] as Seller[]),
        ]);
        setOrders(list);
        const map: Record<string, { name: string; whatsapp: string }> = {};
        for (const s of sellers) {
          map[s.id] = {
            name: s.business_name,
            whatsapp: s.whatsapp_number || "",
          };
        }
        setSellersMap(map);
        // Pagination restarts only when the book itself changed — a quiet
        // poll never collapses what the reader already expanded.
        if (prevOrderCount.current !== null && prevOrderCount.current !== list.length) {
          setVisibleCount(PAGE_SIZE);
        }
        prevOrderCount.current = list.length;
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your orders. Please try again."
        );
      } finally {
        if (!silent) setLoading(false);
      }
      return;
    },
    [currentUser]
  );

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Fresh data whenever the signed-in session changes — auth hydrates after
  // mount in both data modes, so the session itself must trigger the first
  // load. (The loadRef indirection keeps React-compiler lint from tracing a
  // synchronous setState into effect execution.) A quiet 20s poll then keeps
  // statuses moving without a reload; a failed poll never blocks the page.
  useEffect(() => {
    if (!currentUser?.id) return;
    void loadRef.current?.(false);
    const timer = setInterval(() => {
      void loadRef.current?.(true);
    }, 20000);
    return () => clearInterval(timer);
  }, [currentUser?.id]);

  const visibleOrders = useMemo(
    () => orders.slice(0, visibleCount),
    [orders, visibleCount]
  );
  const hiddenCount = orders.length - visibleOrders.length;

  // Guests read nothing — the warm wall is the whole screen.
  if (!currentUser) {
    return (
      <div className="bg-cream-bg min-h-screen py-16 px-4">
        <div className="max-w-md mx-auto text-center space-y-5">
          <div className="w-14 h-14 bg-primary-green/10 text-primary-green rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-text-dark">
            Sign in to see your orders
          </h1>
          <p className="text-sm text-text-dark/70 leading-relaxed">
            Your basket, your makers, one page. Sign in and everything you have
            ordered — and where each item stands — is right here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?redirect=/orders"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-green hover:bg-[#224f3b] text-cream-bg rounded-xl text-sm font-bold transition"
            >
              Sign In
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-warm-brown/20 hover:bg-warm-brown/5 text-warm-brown rounded-xl text-sm font-bold transition"
            >
              Explore Local
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream-bg min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider mb-2 sm:hidden"
            >
              Back to Home
            </Link>
            <h1 className="font-serif text-3xl font-bold text-text-dark">
              My Orders
            </h1>
            <p className="text-xs text-text-dark/60">
              Every jar, bramble and handful you have ordered — with where each
              one stands.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-dark/50 font-semibold hidden sm:inline">
              Updates itself every 20s
            </span>
            <button
              type="button"
              onClick={() => void load(false)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF7F2] border border-warm-brown/10 hover:border-primary-green/30 hover:text-primary-green text-warm-brown rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Refresh my orders"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Cancellation action toast / notice (Phase 7 Step 5) */}
        {cancelActionNotice && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold ${
              cancelActionNotice.kind === "success"
                ? "bg-primary-green/10 border border-primary-green/20 text-primary-green"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {cancelActionNotice.kind === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{cancelActionNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setCancelActionNotice(null)}
              className="text-text-dark/40 hover:text-text-dark transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && orders.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 text-warm-brown/50 mx-auto animate-spin" />
            <p className="text-sm text-warm-brown font-semibold">
              Loading your orders…
            </p>
          </div>
        )}

        {/* Error state — friendly, specific, with a way out */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => void load(false)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state — an invitation, not an error */}
        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-16 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl space-y-4">
            <ShoppingBag className="h-10 w-10 text-warm-brown/40 mx-auto" />
            <h2 className="font-serif text-lg font-bold text-text-dark">
              No orders yet
            </h2>
            <p className="text-xs text-text-dark/60 max-w-sm mx-auto leading-relaxed">
              Your story with local makers starts with a first order. Nearby
              farmers and home kitchens are a tap away.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-5 py-2.5 bg-primary-green hover:bg-[#224f3b] text-cream-bg rounded-xl text-sm font-bold transition"
            >
              Explore Local
            </Link>
          </div>
        )}

        {/* Order cards */}
        {visibleOrders.length > 0 && (
          <div className="space-y-4">
            {visibleOrders.map((order) => {
              const maker = sellersMap[order.seller_id];
              const placedAt = order.created_at ? new Date(order.created_at) : null;
              const placedLabel =
                placedAt && !Number.isNaN(placedAt.getTime())
                  ? placedAt.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null;
              const lineTotal =
                (order.price ?? 0) * order.quantity +
                (order.delivery_fee && order.delivery_type === "delivery"
                  ? order.delivery_fee
                  : 0);
              const carriedFee =
                order.delivery_type === "delivery"
                  ? order.delivery_fee ?? 0
                  : 0;
              const isOnlinePaid =
                order.payment_method === "upi" || Boolean(order.gateway);
              const message = buildWhatsAppUrl(
                maker?.whatsapp ?? "",
                order.status === "cancelled" && isOnlinePaid
                  ? `Hello ${maker?.name ?? "_maker"}, I placed MADETRUE order #${order.id} ("${
                      order.product_name ?? "item"
                    }" × ${order.quantity}) which was cancelled. Could you help me check my refund status?`
                  : `Hello ${maker?.name ?? "maker"}! This is ${currentUser.name} about my MADETRUE order #${order.id} (${
                      order.product_name ?? "item"
                    } × ${order.quantity}).`
              );

              return (
                <div
                  key={order.id}
                  className="bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 p-5 sm:p-6 shadow-sm hover:border-primary-green/20 transition space-y-4"
                >
                  {/* Header row: maker + status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3.5 border-b border-warm-brown/5">
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-mono text-[10px] text-text-dark/40 block truncate" title={order.id}>
                        {order.id}
                      </span>
                      <span className="text-[10px] text-text-dark/60 font-semibold flex items-center">
                        <Store className="h-3 w-3 mr-1 text-warm-brown" />
                        {maker?.name ?? order.seller_id}
                      </span>
                      {placedLabel && (
                        <span className="text-[10px] text-text-dark/50 font-semibold block">
                          Placed {placedLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {message && (
                        <a
                          href={message}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${
                            order.status === "cancelled" && isOnlinePaid
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
                              : "bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E]"
                          }`}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {order.status === "cancelled" && isOnlinePaid
                            ? "Ask about refund"
                            : "Message maker"}
                        </a>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          STATUS_CHIP[order.status] ??
                          "bg-warm-brown/5 text-warm-brown"
                        }`}
                      >
                        {getOrderStatusLabel(order.status, order.delivery_type)}
                      </span>
                    </div>
                  </div>

                  {/* Item + money */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-serif font-bold text-sm text-text-dark">
                        {order.product_name ?? "Handcrafted item"}
                      </p>
                      <p className="text-[11px] text-text-dark/60">
                        ₹{order.price ?? 0} × {order.quantity}
                        {carriedFee > 0 && (
                          <span className="text-text-dark/50">
                            {" "}
                            + ₹{carriedFee} delivery fee (this basket)
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-primary-green text-sm shrink-0">
                      ₹{lineTotal}
                    </span>
                  </div>

                  {/* Fulfillment details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-warm-brown/5 text-[11px] font-semibold text-text-dark/70">
                    <span className="inline-flex items-start gap-1.5 min-w-0">
                      {order.delivery_type === "pickup" ? (
                        <>
                          <Package className="h-3.5 w-3.5 text-primary-green shrink-0 mt-0.5" />
                          Maker pickup (free)
                        </>
                      ) : (
                        <>
                          <MapPin className="h-3.5 w-3.5 text-warm-brown shrink-0 mt-0.5" />
                          <span className="line-clamp-1" title={order.address}>
                            {order.address || "Delivery address on file"}
                          </span>
                        </>
                      )}
                    </span>
                    <span>
                      Payment:{" "}
                      {order.payment_method === "upi" ? "UPI" : "Cash on Delivery"}
                    </span>
                  </div>

                  {/* Live status line */}
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold ${
                      STATUS_LINE[order.status] ?? "text-text-dark/70"
                    }`}
                  >
                    {order.status === "pending" && <Clock className="h-3.5 w-3.5" />}
                    {order.status === "ready" && (
                      <Package className="h-3.5 w-3.5" />
                    )}
                    {order.status === "delivered" && (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    {order.status === "cancelled" && (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {getOrderBuyerStatusSummary(order.status, order.delivery_type)}
                  </div>

                  {/* Cancellation state displays (Phase 7 Step 5) */}
                  {order.cancel_requested && order.status !== "cancelled" && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span>Cancellation requested · Waiting for maker to review</span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 pl-5">
                        Reason: &ldquo;{order.cancel_reason || "Customer requested cancellation"}&rdquo;
                      </p>
                    </div>
                  )}

                  {order.cancel_rejected_reason && order.status !== "cancelled" && (
                    <div className="p-2.5 bg-warm-brown/5 border border-warm-brown/15 rounded-xl flex items-start gap-2 text-[11px] text-text-dark/80">
                      <Info className="h-3.5 w-3.5 text-warm-brown shrink-0 mt-0.5" />
                      <span>
                        <strong>Maker update:</strong> &ldquo;{order.cancel_rejected_reason}&rdquo; — Fulfillment is continuing.
                      </span>
                    </div>
                  )}

                  {order.status === "cancelled" && (
                    <div className="p-3 bg-red-50/70 border border-red-200/60 rounded-xl space-y-1 text-xs">
                      <p className="font-bold text-red-800">
                        Order Cancelled{order.cancel_reason ? ` · ${order.cancel_reason}` : ""}
                      </p>
                      {isOnlinePaid ? (
                        <p className="text-[11px] text-red-700/90 font-medium">
                          Full refund of ₹{lineTotal} processed via {order.gateway || "payment gateway"} to your original payment method.
                        </p>
                      ) : (
                        <p className="text-[11px] text-red-700/80 font-medium">
                          Cash on Delivery order — no payment was collected.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Buyer action: Request cancellation if eligible */}
                  {canBuyerRequestCancellation(order.status, order.cancel_requested) && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setCancelModalOrder(order);
                          setCancelReasonPreset("Ordered by mistake");
                          setCancelCustomReason("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-warm-brown/20 hover:border-red-300 hover:bg-red-50 hover:text-red-700 text-warm-brown rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Request Cancellation
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination-ready: five at a time, honest count below */}
            {hiddenCount > 0 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#FAF7F2] border border-warm-brown/10 hover:border-primary-green/30 hover:text-primary-green text-warm-brown rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Show {Math.min(PAGE_SIZE, hiddenCount)} more orders
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <p className="text-[10px] text-text-dark/40 mt-2 font-semibold">
                  {hiddenCount} older {hiddenCount === 1 ? "order" : "orders"} still here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Request Cancellation Modal (Phase 7 Step 5) */}
        {cancelModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-[#FAF7F2] rounded-2xl border border-warm-brown/20 p-6 max-w-md w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-warm-brown/10">
                <div className="space-y-0.5">
                  <h3 className="font-serif text-lg font-bold text-text-dark">
                    Request Cancellation
                  </h3>
                  <p className="text-xs text-text-dark/60">
                    Order #{cancelModalOrder.id} ({cancelModalOrder.product_name ?? "item"} × {cancelModalOrder.quantity})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  disabled={cancelSubmitting}
                  className="text-text-dark/40 hover:text-text-dark transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-text-dark/80 leading-relaxed">
                  Let the maker know why you need to cancel. When the maker approves, any online payment is automatically refunded back to your original payment method.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-warm-brown block">
                    Reason for cancellation
                  </label>
                  <div className="space-y-2">
                    {[
                      "Ordered by mistake",
                      "Need to change delivery address or details",
                      "Change of plans / no longer needed",
                      "Found an alternative",
                      "Other",
                    ].map((preset) => (
                      <label
                        key={preset}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          cancelReasonPreset === preset
                            ? "bg-primary-green/10 border-primary-green text-primary-green"
                            : "bg-white/60 border-warm-brown/10 text-text-dark hover:border-warm-brown/25"
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={preset}
                          checked={cancelReasonPreset === preset}
                          onChange={(e) => setCancelReasonPreset(e.target.value)}
                          className="text-primary-green focus:ring-primary-green"
                        />
                        <span>{preset}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {cancelReasonPreset === "Other" && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-warm-brown block">
                      Specific details
                    </label>
                    <textarea
                      value={cancelCustomReason}
                      onChange={(e) => setCancelCustomReason(e.target.value)}
                      placeholder="Please share any helpful details for the maker…"
                      rows={3}
                      className="w-full text-xs p-2.5 bg-white border border-warm-brown/20 rounded-xl focus:outline-none focus:border-primary-green"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-brown/10">
                <button
                  type="button"
                  onClick={() => setCancelModalOrder(null)}
                  disabled={cancelSubmitting}
                  className="px-4 py-2 border border-warm-brown/20 hover:bg-warm-brown/5 text-warm-brown rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleRequestCancellation}
                  disabled={cancelSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60"
                >
                  {cancelSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
