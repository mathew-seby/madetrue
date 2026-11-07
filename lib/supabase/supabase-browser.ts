// Browser Supabase client — anon key only, safe in the public bundle.
//
// SERVER ROLE KEY MUST NEVER BE IMPORTED HERE (only supabase-server.ts,
// and only from server code).
//
// The client refuses to construct while the data source is "mock" or a
// key is missing, so a mock boot never needs .env.local. Nothing calls
// this until Phase 2 Step 5 moves reads to Supabase.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDataSource } from "./dataSource";

export function createSupabaseBrowserClient(): SupabaseClient {
  if (getDataSource() !== "supabase") {
    throw new Error(
      "[madetrue] MADETRUE_DATA_SOURCE is 'mock' — the Supabase browser client is not booted."
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[madetrue] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  return createBrowserClient(url, anonKey);
}
