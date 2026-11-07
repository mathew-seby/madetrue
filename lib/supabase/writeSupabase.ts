// Supabase-backed writes for Phase 2 Step 6 (checkout orders, seller
// products, profile saves). Reached only when MADETRUE_DATA_SOURCE=supabase;
// the mock paths in client.ts / auth.ts stay the default and the fallback.
//
// These helpers are plain same-origin fetches to our server route
// handlers (app/api/*). The service-role key lives only on the server:
// the routes decide persistence honestly (derive prices and status from
// the DB product row, exactly what 0002_rls.sql trusts to a signed-in
// client once Phase 3 has real sessions).

import type { Order, Product } from "../../types";

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      body !== null &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Something went wrong on our side. Please try again.";
    throw new Error(`[madetrue] ${message}`);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Orders — called by checkout with the full basket (one Order per line).
// ---------------------------------------------------------------------------

export async function saveOrdersSupabase(orders: Order[]): Promise<Order[]> {
  return requestJson<Order[]>("/api/orders", {
    method: "POST",
    body: JSON.stringify({ orders }),
  });
}

// ---------------------------------------------------------------------------
// Products — dashboard submissions and edits.
// ---------------------------------------------------------------------------

export async function submitProductSupabase(
  productData: Omit<Product, "id" | "created_at">
): Promise<Product> {
  return requestJson<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify({ product: productData }),
  });
}

export async function editProductSupabase(
  id: string,
  updates: Partial<Product>
): Promise<Product | null> {
  return requestJson<Product | null>("/api/products", {
    method: "PATCH",
    body: JSON.stringify({ id, updates }),
  });
}

export async function fetchAllProductsSupabase(): Promise<Product[]> {
  return requestJson<Product[]>("/api/products", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Profile — the fields Supabase can own pre-auth (name, phone, email,
// language, photo). Mock-era passwords stay local; Phase 3 migrates them
// to Supabase Auth.
// ---------------------------------------------------------------------------

export interface PersistProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "buyer" | "seller" | "admin";
  language_pref?: string;
  profile_photo_url?: string;
}

export async function persistProfileSupabase(
  profile: PersistProfile
): Promise<void> {
  await requestJson<PersistProfile>("/api/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}
