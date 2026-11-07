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
      // written.
      getAll: () => [],
      setAll: () => {},
    },
  });
}

// Server client tied to the caller's cookie session (anon key).
// Reads and updates the user session cookies on the server.
export async function createSupabaseServerAuthClient(): Promise<SupabaseClient> {
  if (typeof window !== "undefined") {
    throw new Error(
      "[madetrue] createSupabaseServerAuthClient must only run on the server."
    );
  }

  if (getDataSource() !== "supabase") {
    throw new Error(
      "[madetrue] MADETRUE_DATA_SOURCE is 'mock' — the Supabase server client is not booted."
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[madetrue] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be called from a Server Component where setting cookies is not permitted;
          // middleware or client session refresh handles update.
        }
      },
    },
  });
}
