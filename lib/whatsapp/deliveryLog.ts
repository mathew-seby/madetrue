/**
 * MADETRUE — Notification Delivery Logging & Retry Hub (Phase 7 Step 6)
 *
 * Records every automated WhatsApp alert, status update, and sandbox test.
 * Distinguishes three honest states:
 *   - "delivered": provider confirmed transmission (with provider message ref).
 *   - "fallback": no provider configured (honestly records wa.me click-to-chat fallback).
 *   - "failed": provider rejected transmission or encountered an error.
 *
 * Allows manual or automated retry of failed or fallback notifications.
 */

import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import type { SendWhatsAppResult } from "@/lib/whatsapp/types";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp";
import type { NotificationLog, NotificationDeliveryStatus } from "@/types";

export interface RecordNotificationLogInput {
  orderId?: string | null;
  recipientPhone: string;
  recipientRole?: "buyer" | "maker" | "admin" | "sandbox";
  event: string;
  body: string;
  result: SendWhatsAppResult;
}

export function determineDeliveryStatus(result: SendWhatsAppResult): NotificationDeliveryStatus {
  if (result.sent) return "delivered";
  if (result.provider === "none") return "fallback";
  return "failed";
}

export function determineErrorMessage(result: SendWhatsAppResult): string | null {
  if (result.sent) return null;
  if (result.reason) return result.reason;
  if (result.provider === "none") {
    return "No WhatsApp provider configured (WHATSAPP_PROVIDER is unset). Fell back to wa.me click-to-chat.";
  }
  return "Delivery rejected by messaging provider.";
}

/**
 * Server-side logger for notification delivery attempts.
 * Non-fatal: failures to record an attempt are safely caught and never fail an order.
 */
export async function recordNotificationLogServer(
  input: RecordNotificationLogInput
): Promise<NotificationLog | null> {
  const status = determineDeliveryStatus(input.result);
  const errorMessage = determineErrorMessage(input.result);

  const logPayload = {
    order_id: input.orderId || null,
    recipient_phone: input.recipientPhone,
    recipient_role: input.recipientRole || "buyer",
    event: input.event,
    channel: "whatsapp" as const,
    provider: input.result.provider,
    status,
    provider_ref: input.result.providerRef || null,
    error_message: errorMessage,
    retry_count: 0,
    last_attempt_at: new Date().toISOString(),
    body: input.body,
  };

  if (!isSupabaseEnabled()) {
    // In mock mode on the server, return an in-memory representation
    return {
      id: `log_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...logPayload,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notification_logs")
      .insert(logPayload)
      .select()
      .single();

    if (error || !data) {
      console.warn("Could not insert notification log row:", error?.message);
      return null;
    }

    return data as NotificationLog;
  } catch (err: unknown) {
    console.warn("Exception during notification logging:", err);
    return null;
  }
}

/**
 * Server-side retry execution for a delivery log entry.
 */
export async function retryNotificationLogServer(
  logId: string
): Promise<{ success: boolean; log?: NotificationLog; sendResult?: SendWhatsAppResult; error?: string }> {
  if (!isSupabaseEnabled()) {
    return {
      success: false,
      error: "Server-side retries run when MADETRUE_DATA_SOURCE=supabase.",
    };
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: existing, error: readError } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("id", logId)
      .maybeSingle();

    if (readError || !existing) {
      return { success: false, error: `Notification log "${logId}" not found.` };
    }

    const log = existing as NotificationLog;
    const cleanTo = normalizeWhatsAppPhone(log.recipient_phone);
    if (!cleanTo) {
      return { success: false, error: "Recipient phone number is invalid for retry." };
    }

    // Attempt re-send via active provider adapter
    const provider = getWhatsAppProvider();
    const sendResult = await provider.send({
      to: cleanTo,
      body: log.body,
    });

    const newStatus = determineDeliveryStatus(sendResult);
    const newErrorMessage = determineErrorMessage(sendResult);
    const newRetryCount = Number(log.retry_count ?? 0) + 1;
    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("notification_logs")
      .update({
        provider: sendResult.provider,
        status: newStatus,
        provider_ref: sendResult.providerRef || null,
        error_message: newErrorMessage,
        retry_count: newRetryCount,
        last_attempt_at: nowIso,
      })
      .eq("id", logId)
      .select()
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        error: `Failed to update delivery log after retry: ${updateError?.message}`,
      };
    }

    return {
      success: sendResult.sent,
      log: updated as NotificationLog,
      sendResult,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Notification retry failed.",
    };
  }
}

