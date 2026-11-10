/**
 * MADETRUE — Unified WhatsApp Entrypoint (Phase 7 Step 3)
 *
 * Resolves the message provider from the environment. With nothing (or
 * something unsupported) configured it resolves to the honest "none"
 * provider: nothing sends, wa.me click-to-chat remains the fallback, and
 * every send result carries a human reason for the delivery log (Step 6).
 *
 * Note: order-route send helpers live in `./notify` (imported directly by
 * the routes) to keep this module free of import cycles.
 */

import { nullWhatsAppProvider, createUnconfiguredProvider } from "./none";
import { twilioWhatsAppProvider } from "./twilio";
import { watiWhatsAppProvider } from "./wati";
import type { WhatsAppProvider } from "./types";

export * from "./types";
export { nullWhatsAppProvider, createUnconfiguredProvider } from "./none";
export { twilioWhatsAppProvider } from "./twilio";
export { watiWhatsAppProvider } from "./wati";

const SUPPORTED_PROVIDERS = ["twilio", "wati"] as const;

export function getWhatsAppProvider(): WhatsAppProvider {
  const raw = (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();

  if (!raw) {
    return nullWhatsAppProvider;
  }

  if (raw === "twilio") {
    if (twilioWhatsAppProvider.isConfigured()) {
      return twilioWhatsAppProvider;
    }
    return createUnconfiguredProvider(
      "WHATSAPP_PROVIDER is \"twilio\" but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM are incomplete in the environment."
    );
  }

  if (raw === "wati") {
    if (watiWhatsAppProvider.isConfigured()) {
      return watiWhatsAppProvider;
    }
    return createUnconfiguredProvider(
      "WHATSAPP_PROVIDER is \"wati\" but WATI_ENDPOINT / WATI_API_TOKEN are incomplete in the environment."
    );
  }

  return createUnconfiguredProvider(
    `WHATSAPP_PROVIDER="${raw}" is not one of: ${SUPPORTED_PROVIDERS.join(", ")}.`
  );
}
