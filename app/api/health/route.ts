import { NextResponse } from "next/server";
import { getDataSource, isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/health — the ping that uptime monitors and the site-down playbook
// (docs/monitoring-and-support.md) rely on. Deliberately tiny: it answers
// "is the app serving, and can it reach its data" and nothing else. No user
// data, no secrets, no writes. 200 = app up (+ data reachable in Supabase
// mode); 503 = app up but the database is unreachable — so a status-code
// monitor catches a Supabase outage even though Vercel itself is fine.
export async function GET() {
  const dataSource = getDataSource();

  if (!isSupabaseEnabled()) {
    // Mock mode (no keys wired — local dev): the app is serving; there is
    // no database to reach.
    return NextResponse.json({
      ok: true,
      dataSource,
      database: "mock-mode",
      timestamp: new Date().toISOString(),
    });
  }

  let database: "up" | "down" = "down";
  let probeTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    const supabase = createSupabaseServerClient();
    const raceResult = await Promise.race([
      supabase.from("categories").select("id").limit(1),
      new Promise<"timeout">((resolve) => {
        probeTimer = setTimeout(() => resolve("timeout"), 4000);
      }),
    ]);
    if (raceResult !== "timeout") {
      const { error } = raceResult as { error: { message: string } | null };
      if (!error) database = "up";
    }
  } catch {
    database = "down";
  } finally {
    if (probeTimer) clearTimeout(probeTimer);
  }

  return NextResponse.json(
    {
      ok: database === "up",
      dataSource,
      database,
      timestamp: new Date().toISOString(),
    },
    { status: database === "up" ? 200 : 503 }
  );
}
