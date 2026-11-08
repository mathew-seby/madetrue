// Identify the API caller from the @supabase/ssr cookie session (Phase 3).
// Service-role writes bypass RLS, so every privileged API route must establish
// the caller itself before touching shared data. Returns null for guests; the
// users.role read stays inside RLS (signed-in users may read their own row).
import { createSupabaseServerAuthClient } from "./supabase-server";

export interface ServerUser {
  id: string;
  role: "buyer" | "seller" | "admin";
}

export async function getServerUser(): Promise<ServerUser | null> {
  const auth = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return null;

  const { data: profile } = await auth
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { id: user.id, role: (profile?.role as ServerUser["role"]) ?? "buyer" };
}
