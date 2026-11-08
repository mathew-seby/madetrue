// Supabase-backed reads for the six catalog functions moved in Phase 2
// Step 5 (listing / detail / seller / home). Reached only when
// MADETRUE_DATA_SOURCE=supabase; the mock paths in client.ts stay the
// default and the fallback.
//
// Row mapping is explicit: DB nullable columns become undefined so the
// rows satisfy types/index.ts (null is never assigned where the app
// expects string | undefined). Queries FILTER in SQL — no client-side
// post-filtering — so results match what RLS would return to the anon
// key: approved products, public catalog rows.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Product, Seller } from "../../types";
import type { ProductFilters } from "./client";
import { createSupabaseBrowserClient } from "./supabase-browser";

export async function getReadClient(): Promise<SupabaseClient> {
  if (typeof window === "undefined") {
    // Server component / prerender: dynamically imported so the
    // service-role module never enters a client bundle.
    const { createSupabaseServerClient } = await import("./supabase-server");
    return createSupabaseServerClient();
  }
  return createSupabaseBrowserClient();
}

function fail(action: string, message: string): Error {
  return new Error(`[madetrue] Supabase read failed (${action}): ${message}`);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function fetchCategoriesSupabase(): Promise<Category[]> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, slug")
    .order("id", { ascending: true });

  if (error) throw fail("categories", error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    slug: row.slug as string,
  }));
}

// ---------------------------------------------------------------------------
// Sellers
// ---------------------------------------------------------------------------

const SELLER_COLUMNS =
  "id, user_id, business_name, story, profile_photo_url, video_url, address, lat, lng, whatsapp_number, is_verified, payment_vendor_ref, kyc_status, application_status";

function mapSeller(row: Record<string, unknown>): Seller {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    business_name: row.business_name as string,
    story: row.story as string,
    profile_photo_url: row.profile_photo_url as string,
    video_url: (row.video_url as string | null) ?? undefined,
    address: row.address as string,
    lat: row.lat as number,
    lng: row.lng as number,
    whatsapp_number: row.whatsapp_number as string,
    is_verified: row.is_verified as boolean,
    payment_vendor_ref: (row.payment_vendor_ref as string | null) ?? undefined,
    kyc_status: (row.kyc_status as Seller["kyc_status"]) ?? undefined,
    application_status:
      (row.application_status as Seller["application_status"]) ?? undefined,
    pan: (row.pan as string | null) ?? undefined,
    bank_account_number: (row.bank_account_number as string | null) ?? undefined,
    bank_ifsc: (row.bank_ifsc as string | null) ?? undefined,
    bank_account_holder: (row.bank_account_holder as string | null) ?? undefined,
  };
}

export async function fetchSellersSupabase(): Promise<Seller[]> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_COLUMNS)
    .order("id", { ascending: true });

  if (error) throw fail("sellers", error.message);

  return (data ?? []).map((row) => mapSeller(row));
}

export async function fetchSellerByIdSupabase(
  id: string
): Promise<Seller | null> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("sellers")
    .select(SELLER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fail("seller by id", error.message);

  return data ? mapSeller(data) : null;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS =
  "id, seller_id, name, description, price, category, images, tags, stock, is_available, origin_details, created_at, status, documents, lat, lng, address, base_price, commission";

export function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    seller_id: row.seller_id as string,
    name: row.name as string,
    description: row.description as string,
    price: row.price as number,
    category: row.category as string,
    images: (row.images ?? []) as string[],
    tags: (row.tags ?? []) as Product["tags"],
    stock: row.stock as number,
    is_available: row.is_available as boolean,
    origin_details: row.origin_details as string,
    created_at: row.created_at as string,
    status: (row.status as Product["status"]) ?? undefined,
    documents: (row.documents as Product["documents"]) ?? undefined,
    lat: (row.lat as number | null) ?? undefined,
    lng: (row.lng as number | null) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    base_price: (row.base_price as number | null) ?? undefined,
    commission: (row.commission as number | null) ?? undefined,
  };
}

const FILTER_SORT_COLUMNS: Record<
  NonNullable<ProductFilters["sortBy"]>,
  { column: string; ascending: boolean }
> = {
  "price-asc": { column: "price", ascending: true },
  "price-desc": { column: "price", ascending: false },
  newest: { column: "created_at", ascending: false },
};

export async function fetchProductsSupabase(
  filters?: ProductFilters
): Promise<Product[]> {
  const supabase = await getReadClient();

  // Public listing = approved only, exactly like the mock filter in
  // client.ts (and like what RLS grants the anon key).
  let query = supabase.from("products").select(PRODUCT_COLUMNS).eq("status", "approved");

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.search) {
    const search = filters.search.replace(/[%_,()]/g, " ").trim();
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
  }

  if (filters?.sortBy) {
    const sort = FILTER_SORT_COLUMNS[filters.sortBy];
    query = query.order(sort.column, { ascending: sort.ascending });
  }

  // Stable tiebreaker so the grid never shuffles between visits.
  query = query.order("id", { ascending: true });

  const { data, error } = await query;

  if (error) throw fail("products", error.message);

  return (data ?? []).map((row) => mapProduct(row));
}

export async function fetchProductByIdSupabase(
  id: string
): Promise<Product | null> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fail("product by id", error.message);

  return data ? mapProduct(data) : null;
}

export async function fetchProductsBySellerIdSupabase(
  sellerId: string
): Promise<Product[]> {
  const supabase = await getReadClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("seller_id", sellerId)
    .eq("status", "approved")
    .order("id", { ascending: true });

  if (error) throw fail("products by seller", error.message);

  return (data ?? []).map((row) => mapProduct(row));
}
