// WhatsApp template sandbox (Phase 7 Step 4) — admin-console support for
// the template previews:
//   * GET  — provider status: what the Step 3 factory resolves right now,
//            honestly ("none" + what `.env.local` asked for), so the UI can
//            say exactly whether messages are going out or wa.me covers.
//   * POST — sandbox send: renders ONE template against the sample order
//            context and sends it to any number through the same adapter
//            real transitions use. Results are honest data, never errors:
//            with no provider configured the payload explains the wa.me
//            fallback. Moderators only; every attempt is audit-logged.

import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";
import { getWhatsAppProvider } from "@/lib/whatsapp";
import { sendOrderWhatsApp } from "@/lib/whatsapp/notify";
import {
  TEMPLATE_EVENTS,
  TEMPLATE_LABELS,
  buildSampleTemplate,
  type TemplateEvent,
} from "@/lib/whatsapp/templates";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTemplateEvent(value: unknown): value is TemplateEvent {
  return (
    typeof value === "string" &&
    (TEMPLATE_EVENTS as readonly string[]).includes(value)
  );
}

export async function GET() {
  if (!isSupabaseEnabled()) {
    // Mock mode: honest answer, no session needed — nothing here is secret.
    return NextResponse.json({
      provider: "none",
      envProvider: null,
      configured: false,
      mockMode: true,
    });
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to view the WhatsApp provider status." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only MADETRUE moderators can view the WhatsApp provider status." },
      { status: 403 }
    );
  }

  const provider = getWhatsAppProvider();
  return NextResponse.json({
    provider: provider.name,
    envProvider:
      (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase() || null,
    configured: provider.isConfigured(),
    mockMode: false,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      {
        error:
          "Sandbox sends run in Supabase mode. In mock mode the app keeps its wa.me click-to-chat fallback.",
      },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to send a sandbox message." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only MADETRUE moderators can send sandbox messages." },
      { status: 403 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The sandbox request could not be read." },
      { status: 400 }
    );
  }
  const body = isRecord(payload) ? payload : null;
  if (!body) {
    return NextResponse.json(
      { error: "The sandbox request could not be read." },
      { status: 400 }
    );
  }

  if (!isTemplateEvent(body.event)) {
    return NextResponse.json(
      {
        error: `Unknown template. Choose one of: ${TEMPLATE_EVENTS.join(", ")}.`,
      },
      { status: 400 }
    );
  }
  const event = body.event;

  const to = normalizeWhatsAppPhone(String(body.to ?? ""));
  if (to.length < 10 || to.length > 15) {
    return NextResponse.json(
      {
        error:
          "Enter the destination WhatsApp number with country code, digits only (e.g. 919876543210).",
      },
      { status: 400 }
    );
  }

  // Render the exact copy the previews show — one source of truth.
  const message = buildSampleTemplate(event);

  // The Step 3 notify layer never throws; every outcome is data.
  const result = await sendOrderWhatsApp({ to, body: message });

  // Audit the attempt (honest, non-fatal — server-side inserts only).
  try {
    const supabase = createSupabaseServerClient();
    const { data: callerUser } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("admin_audit").insert({
      actor_id: user.id,
      actor_name: (callerUser?.name as string | null) ?? null,
      actor_email: (callerUser?.email as string | null) ?? null,
      entity_type: "whatsapp_template",
      entity_id: event,
      entity_label: TEMPLATE_LABELS[event],
      action: "whatsapp_sandbox_send",
      summary: `Sandbox-tested the "${TEMPLATE_LABELS[event]}" template to ${to}: ${
        result.sent ? "message queued" : `not sent — ${result.reason ?? "no reason given"}`
      }.`,
    });
  } catch {
    // Non-fatal — the send result is still returned.
  }

  // Always 200: the send result is data for the console, not an HTTP error.
  return NextResponse.json({
    sent: result.sent,
    provider: result.provider,
    providerRef: result.providerRef,
    reason: result.reason,
    message,
  });
}
