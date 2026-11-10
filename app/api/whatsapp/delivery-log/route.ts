// Notification delivery log & retry API (Phase 7 Step 6)
// Moderator access only. Reads recent notification logs and allows retrying failed attempts.

import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";
import { retryNotificationLogServer } from "@/lib/whatsapp/deliveryLog";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "Delivery logs are persisted on the server in Supabase mode." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to view notification logs." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only administrators can view notification delivery logs." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: `Failed to load notification logs: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "Delivery retries run on the server in Supabase mode." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to retry notifications." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only administrators can trigger notification retries." },
      { status: 403 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const logId = typeof body?.logId === "string" ? body.logId.trim() : null;

  if (!logId) {
    return NextResponse.json(
      { error: "logId is required for retry." },
      { status: 400 }
    );
  }

  const result = await retryNotificationLogServer(logId);
  if (!result.success && !result.log) {
    return NextResponse.json(
      { error: result.error || "Retry failed." },
      { status: 400 }
    );
  }

  // Audit entry for retry action
  try {
    const supabase = createSupabaseServerClient();
    const { data: callerUser } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("admin_audit").insert({
      actor_id: user.id,
      actor_name: (callerUser?.name as string | null) ?? "Administrator",
      actor_email: (callerUser?.email as string | null) ?? "",
      entity_type: "order",
      entity_id: result.log?.order_id || logId,
      entity_label: `Notification ${result.log?.event || "update"}`,
      action: "notification_retry",
      summary: `Retried notification (attempt #${result.log?.retry_count}) to ${result.log?.recipient_phone}: ${
        result.sendResult?.sent
          ? `delivered via ${result.sendResult.provider}`
          : `not delivered (${result.sendResult?.reason || "reason unavailable"})`
      }`,
    });
  } catch {
    // Non-fatal
  }

  return NextResponse.json(result);
}

