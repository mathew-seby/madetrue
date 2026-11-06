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
