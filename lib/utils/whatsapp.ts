// WhatsApp click-to-chat helpers (wa.me deep links — no API required).
// Automated order updates via a provider (Twilio/Meta) come in a later phase;
// until then these links must never block order placement.

/** Strip formatting so the number is wa.me-ready (e.g. "+91 98765 43210" → "919876543210"). */
export function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Build a wa.me URL that opens WhatsApp with a prefilled message.
 * Returns an empty string when the number is missing so callers can
 * hide the link instead of rendering a broken one.
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Build a human, warm WhatsApp notification when an order is refunded.
 */
export function buildRefundWhatsAppMessage(params: {
  buyerName?: string;
  orderId: string;
  productName?: string;
  refundAmount: number;
  reason?: string;
  gateway?: string | null;
}): string {
  const greeting = params.buyerName ? `Hello ${params.buyerName}` : "Hello";
  const itemNote = params.productName ? ` for "${params.productName}"` : "";
  const reasonText = params.reason ? `\nReason: ${params.reason}` : "";
  const gatewayText =
    params.gateway && params.gateway !== "mock"
      ? ` through ${params.gateway === "cashfree" ? "Cashfree" : params.gateway}`
      : "";

  return `${greeting}, a refund of ₹${params.refundAmount}${itemNote} (Order #${params.orderId}) has been processed${gatewayText}.${reasonText}\n\nIt will reflect in your source account within 2-5 business days. Please feel free to reach out if you need any assistance!`;
}

/**
 * Returns a wa.me URL for the refund notice.
 */
export function buildRefundWhatsAppUrl(
  phone: string,
  params: {
    buyerName?: string;
    orderId: string;
    productName?: string;
    refundAmount: number;
    reason?: string;
    gateway?: string | null;
  }
): string {
  const message = buildRefundWhatsAppMessage(params);
  return buildWhatsAppUrl(phone, message);
}

