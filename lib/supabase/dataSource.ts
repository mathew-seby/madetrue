// Data-source switch for the app.
//
// "mock"     → the app serves localStorage/mockData exactly as in Phase 1
//              (lib/supabase/client.ts + lib/supabase/auth.ts).
// "supabase" → real clients (see supabase-browser.ts / supabase-server.ts)
//              may boot; reads move in Phase 2 Step 5, writes in Step 6.
//
// Anything missing, empty, or not exactly "supabase" resolves to "mock",
// so a mock boot never needs .env.local. This value is not a secret —
// it only names which source is live — but the browser bundle only
// inlines NEXT_PUBLIC_* vars, so keep both lines in .env.local in sync.

export type DataSource = "mock" | "supabase";

export function getDataSource(): DataSource {
  const value =
    process.env.NEXT_PUBLIC_MADETRUE_DATA_SOURCE ??
    process.env.MADETRUE_DATA_SOURCE;
  return value === "supabase" ? "supabase" : "mock";
}

export function isSupabaseEnabled(): boolean {
  return getDataSource() === "supabase";
}
