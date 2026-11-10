/**
 * MADETRUE — Unified WhatsApp Adapter Types (Phase 7 Step 3)
 *
 * All message providers (Twilio, WATI) implement the single `WhatsAppProvider`
 * interface defined here. The honest default is "none": with no provider
 * configured nothing sends, and the app's wa.me click-to-chat links stay the
 * fallback. A provider problem can never block an order.
 */

export type WhatsAppProviderName = "none" | "twilio" | "wati";

export interface SendWhatsAppInput {
  /** Destination as plain digits (e.g. "919876543210"). */
  to: string;
  /** Human message text (plain text — real templates arrive in Step 4). */
  body: string;
}

export interface SendWhatsAppResult {
  /** true only when the provider actually accepted the message. */
  sent: boolean;
  provider: WhatsAppProviderName;
  /** Provider message id — feeds the delivery log (Phase 7 Step 6). */
  providerRef?: string;
  /** Honest reason when sent === false. Reported, never swallowed. */
  reason?: string;
}

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  /** Cheap credential check — no network calls. */
  isConfigured(): boolean;
  send(input: SendWhatsAppInput): Promise<SendWhatsAppResult>;
}
