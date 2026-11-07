// Server-side Supabase client — SERVICE ROLE key. Server code only.
//
// service role bypasses Row Level Security (RLS), so this module must
// never be imported from client components or leak into the browser
// bundle. It runtime-guards on `window` as belt-and-braces; the real
// protection is that non-public env vars are never inlined client-side.
//
// The client refuses to construct while the data source is "mock" or a
// key is missing, so a mock boot never needs .env.local. Write helpers
// arrive in Phase 2 Step 6; Phase 3 will thread real cookie sessions.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDataSource } from "./dataSource";

export function createSupabaseServerClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "[madetrue] supabase-server.ts must only run on the server."
    );
  }

  if (getDataSource() !== "supabase") {
    throw new Error(
      "[madetrue] MADETRUE_DATA_SOURCE is 'mock' — the Supabase server client is not booted."
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "[madetrue] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return createServerClient(url, serviceRoleKey, {
    cookies: {
      // Service role work has no user session, so no cookies are read or
      // written. Phase 3 will swap this adapter for a real cookie store.
      getAll: () => [],
      setAll: () => {},
    },
  });
}
