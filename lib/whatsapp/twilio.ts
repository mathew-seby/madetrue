/**
 * Twilio WhatsApp adapter (Phase 7 Step 3) — Messages REST API against a
 * WhatsApp sandbox number or WABA sender. No SDK: one fetch, bounded by an
 * 8s timeout so a slow provider can never stall an order response.
 */
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp";
import type {
  SendWhatsAppInput,
  SendWhatsAppResult,
  WhatsAppProvider,
} from "./types";

const SEND_TIMEOUT_MS = 8000;

function twilioEnv(): { sid: string; token: string; from: string } {
  return {
    sid: (process.env.TWILIO_ACCOUNT_SID ?? "").trim(),
    token: (process.env.TWILIO_AUTH_TOKEN ?? "").trim(),
    from: (process.env.TWILIO_WHATSAPP_FROM ?? "").trim(),
  };
}

class TwilioWhatsAppAdapter implements WhatsAppProvider {
  readonly name = "twilio" as const;

  isConfigured(): boolean {
    const { sid, token, from } = twilioEnv();
    return Boolean(sid && token && from);
  }

  async send(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    if (!this.isConfigured()) {
      return {
        sent: false,
        provider: this.name,
        reason:
          "Twilio was selected but TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM are incomplete in the environment.",
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

    const { sid, token, from } = twilioEnv();
    const form = new URLSearchParams({
      From: `whatsapp:+${normalizeWhatsAppPhone(from)}`,
      To: `whatsapp:+${to}`,
      Body: input.body,
    });

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
          sid
        )}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString(
              "base64"
            )}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form,
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        }
      );

      const payload = (await res.json().catch(() => null)) as
        | { sid?: unknown; message?: unknown }
        | null;

      if (res.ok && typeof payload?.sid === "string") {
        return { sent: true, provider: this.name, providerRef: payload.sid };
      }
      return {
        sent: false,
        provider: this.name,
        reason: `Twilio responded ${res.status}: ${
          typeof payload?.message === "string" ? payload.message : "request rejected."
        }`,
      };
    } catch (err: unknown) {
      return {
        sent: false,
        provider: this.name,
        reason:
          err instanceof Error
            ? `Twilio send failed: ${err.message}`
            : "Twilio send failed.",
      };
    }
  }
}

export const twilioWhatsAppProvider = new TwilioWhatsAppAdapter();
