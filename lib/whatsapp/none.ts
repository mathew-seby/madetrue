/**
 * The honest default provider (Phase 7 Step 3): sends nothing and says so.
 * wa.me click-to-chat links remain the user-visible fallback, so no order
 * path depends on WhatsApp automation being configured.
 */
import type { SendWhatsAppResult, WhatsAppProvider } from "./types";

const DEFAULT_REASON =
  "No WhatsApp provider is configured — wa.me links stay the fallback.";

export const nullWhatsAppProvider: WhatsAppProvider = {
  name: "none",
  isConfigured: () => false,
  async send(): Promise<SendWhatsAppResult> {
    return { sent: false, provider: "none", reason: DEFAULT_REASON };
  },
};

/**
 * For env misconfigurations — the reason carries the exact fix, so the
 * delivery log (Step 6) can explain honestly why an update never went out.
 */
export function createUnconfiguredProvider(detail: string): WhatsAppProvider {
  return {
    name: "none",
    isConfigured: () => false,
    async send(): Promise<SendWhatsAppResult> {
      return {
        sent: false,
        provider: "none",
        reason: `WhatsApp updates are off. ${detail}`,
      };
    },
  };
}
