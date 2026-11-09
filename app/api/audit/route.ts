// Admin audit trail (Phase 5 Step 7) — server-side, mock-honest.
//
// GET:  an admin session reads the trail, newest first, capped at the
//       200 most recent rows (the console labels that cap).
// POST: the console appends one row per moderation action. The actor_id
//       is stamped here from the session — never taken from the request
//       — so a forged page can't attribute actions to someone else.
//       Everything else the page supplies: entity, action, and the
//       human "before → after" summary.
//
// Mock mode has no server persistence: the console records into its
// madetrue_audit localStorage store directly, so the route answers an
// honest 400 like the other write routes.
//
// The table is server-only by migration (0009_admin_audit.sql: RLS
// enabled, no anon/authenticated grants) — service-role writes/reads
// below are the only path in.

import { NextResponse } from "next/server";
import type { AuditEntityType } from "@/types";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";

const ENTITY_TYPES: AuditEntityType[] = ["product", "seller", "order", "category"];

const LIMITS = {
  entity_id: 120,
  entity_label: 200,
  action: 60,
  summary: 600,
  actor_name: 120,
  actor_email: 160,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampString(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

export async function GET() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — the server audit trail is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to read the audit trail." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "The audit trail belongs to MADETRUE moderators." },
      { status: 403 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: `Could not read the audit trail: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — the server audit trail is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to record an audit entry." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only MADETRUE moderators record audit entries." },
      { status: 403 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The audit entry could not be read." },
      { status: 400 }
    );
  }
  if (!isRecord(payload)) {
    return NextResponse.json(
      { error: "The audit entry could not be read." },
      { status: 400 }
    );
  }

  const entity_type = payload.entity_type as AuditEntityType;
  if (!ENTITY_TYPES.includes(entity_type)) {
    return NextResponse.json(
      { error: "The audited thing must be a product, seller, order, or category." },
      { status: 400 }
    );
  }

  const entity_id = clampString(payload.entity_id, LIMITS.entity_id);
  const summary = clampString(payload.summary, LIMITS.summary);
  if (!entity_id) {
    return NextResponse.json(
      { error: "The audit entry is missing the thing it refers to." },
      { status: 400 }
    );
  }
  if (!summary) {
    return NextResponse.json(
      { error: "The audit entry needs a before → after summary." },
      { status: 400 }
    );
  }

  const row = {
    actor_id: user.id,
    actor_name: clampString(payload.actor_name, LIMITS.actor_name),
    actor_email: clampString(payload.actor_email, LIMITS.actor_email),
    entity_type,
    entity_id,
    entity_label: clampString(payload.entity_label, LIMITS.entity_label),
    action: clampString(payload.action, LIMITS.action) || "updated",
    summary,
  };

  const supabase = createSupabaseServerClient();
  const { error: insertError } = await supabase
    .from("admin_audit")
    .insert(row);

  if (insertError) {
    return NextResponse.json(
      { error: `Could not record the audit entry: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
