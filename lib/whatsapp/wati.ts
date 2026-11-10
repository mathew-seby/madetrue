/**
 * WATI adapter (Phase 7 Step 3) — free-form session messages via
 * POST {endpoint}/api/v1/sendSessionMessage/{number}. Bounded by an 8s
 * timeout so a slow provider can never stall an order response.
 */
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp";
import type {
  SendWhatsAppInput,
  SendWhatsAppResult,
  WhatsAppProvider,
} from "./types";

const SEND_TIMEOUT_MS = 8000;

function watiEnv(): { endpoint: string; token: string } {
  return {
    endpoint: (process.env.WATI_ENDPOINT ?? "")
      .trim()
      .replace(/\/+$/, ""),
    token: (process.env.WATI_API_TOKEN ?? "").trim(),
  };
}

class WatiWhatsAppAdapter implements WhatsAppProvider {
  readonly name = "wati" as const;

  isConfigured(): boolean {
    const { endpoint, token } = watiEnv();
    return Boolean(endpoint && token);
  }

  async send(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    if (!this.isConfigured()) {
      return {
        sent: false,
        provider: this.name,
        reason: "WATI was selected but WATI_ENDPOINT / WATI_API_TOKEN are incomplete in the environment.",
      };
    }

    const to = normalizeWhatsAppPhone(input.to);
    if (!to) {
      return {
        sent: false,
        provider: this.name,
        reason: "No WhatsApp number on file for this recipient.",
      };
    }

    const { endpoint, token } = watiEnv();
    try {
      const res = await fetch(
        `${endpoint}/api/v1/sendSessionMessage/${encodeURIComponent(
          to
        )}?messageText=${encodeURIComponent(input.body)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        }
      );

      const payload = (await res.json().catch(() => null)) as
        | { messageId?: unknown; id?: unknown; message?: unknown }
        | null;

      if (res.ok) {
        const ref =
          typeof payload?.messageId === "string"
            ? payload.messageId
            : typeof payload?.id === "string"
            ? payload.id
            : undefined;
        return { sent: true, provider: this.name, providerRef: ref };
      }
      return {
        sent: false,
        provider: this.name,
        reason: `WATI responded ${res.status}: ${
          typeof payload?.message === "string" ? payload.message : "request rejected."
        }`,
      };
    } catch (err: unknown) {
      return {
        sent: false,
        provider: this.name,
        reason:
          err instanceof Error
            ? `WATI send failed: ${err.message}`
            : "WATI send failed.",
      };
    }
  }
}

export const watiWhatsAppProvider = new WatiWhatsAppAdapter();
