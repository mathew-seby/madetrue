// Server-side product writes for MADETRUE_DATA_SOURCE=supabase.
// Uses the service role (server jobs are the sanctioned path in
// 0002_rls.sql); the column guard triggers are bypassed for service
// role, so this route applies the same rules itself:
//   * submissions get status 'pending', base_price = price, commission 0
//     (mirrors the mock addProduct).
//   * edits go back to pending only when listing content changes; a
//     stock/is_available-only patch keeps its review status (the rule
//     guard_product_review documents in 0002_rls.sql).
// seller_id and status are never accepted from the client.

import { NextResponse } from "next/server";
import type { Product } from "@/types";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { mapProduct } from "@/lib/supabase/readSupabase";

const EDITABLE_COLUMNS = [
  "name",
  "description",
  "price",
  "base_price",
  "category",
  "images",
  "tags",
  "stock",
  "is_available",
  "origin_details",
  "documents",
  "lat",
  "lng",
  "address",
] as const;

const CONTENT_COLUMNS = [
  "name",
  "description",
  "price",
  "base_price",
  "category",
  "images",
  "tags",
  "origin_details",
  "documents",
  "lat",
  "lng",
  "address",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — product persistence is off." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, seller_id, name, description, price, category, images, tags, stock, is_available, origin_details, created_at, status, documents, lat, lng, address, base_price, commission"
    )
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: `Database read failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json((data ?? []).map((row) => mapProduct(row)));
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — product persistence is off." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The product submission could not be read." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const product = isRecord(body?.product) ? body.product : null;
  if (!product) {
    return NextResponse.json(
      { error: "The product submission is missing its details." },
      { status: 400 }
    );
  }

  const productIdValue = product.seller_id;
  const required = ["seller_id", "name", "description", "price", "category"];
  for (const field of required) {
    if (product[field] === undefined || product[field] === null) {
      return NextResponse.json(
        { error: "Please fill out all required product fields." },
        { status: 400 }
      );
    }
  }
  const price = Number(product.price);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "Price must be a valid amount." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // The maker store must be a real, seeded row: locally-created mock
  // sellers cannot exist in the database until Phase 3 wires identity.
  const { data: sellerRow, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .eq("id", String(productIdValue))
    .maybeSingle();

  if (sellerError) {
    return NextResponse.json(
      { error: `Database read failed: ${sellerError.message}` },
      { status: 500 }
    );
  }
  if (!sellerRow) {
    return NextResponse.json(
      {
        error:
          "This maker's store is not registered in the database yet. Sign-in for makers arrives with the next phase.",
      },
      { status: 400 }
    );
  }

  const stockValue = Number(product.stock ?? 0);
  const submitRow = {
    seller_id: String(productIdValue),
    name: String(product.name),
    description: String(product.description ?? ""),
    price,
    category: String(product.category),
    images: Array.isArray(product.images) ? (product.images as string[]) : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    stock: Number.isFinite(stockValue) ? Math.max(0, Math.trunc(stockValue)) : 0,
    is_available: product.is_available === undefined ? true : Boolean(product.is_available),
    origin_details: String(product.origin_details ?? ""),
    // Honest submission state: mirrors mock addProduct exactly.
    status: "pending" as const,
    base_price: price,
    commission: 0,
    lat: product.lat === null || product.lat === undefined ? null : Number(product.lat),
    lng: product.lng === null || product.lng === undefined ? null : Number(product.lng),
    address:
      product.address === null || product.address === undefined
        ? null
        : String(product.address),
    documents: Array.isArray(product.documents) ? product.documents : [],
  };

  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert(submitRow)
    .select(
      "id, seller_id, name, description, price, category, images, tags, stock, is_available, origin_details, created_at, status, documents, lat, lng, address, base_price, commission"
    )
    .single();

  if (insertError) {
    if (insertError.message.includes("enum")) {
      return NextResponse.json(
        { error: "One of the quality badges isn't valid." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Saving the product failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(mapProduct(inserted));
}

export async function PATCH(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — product persistence is off." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The product update could not be read." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const id = typeof body?.id === "string" ? body.id : null;
  const updates = isRecord(body?.updates) ? body.updates : null;
  if (!id || !updates) {
    return NextResponse.json(
      { error: "The product update is missing its details." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("products")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { error: `Database read failed: ${readError.message}` },
      { status: 500 }
    );
  }
  if (!existing) {
    return NextResponse.json(
      { error: "That product could not be found." },
      { status: 404 }
    );
  }

  // Only listing content sends a product back for review; a stock or
  // availability change (e.g. the sold-out switch) keeps its status.
  const touchedColumns = Object.keys(updates).filter((key) =>
    (EDITABLE_COLUMNS as readonly string[]).includes(key)
  );
  const contentChanged = touchedColumns.some((column) =>
    CONTENT_COLUMNS.includes(column)
  );

  const updateRow: Record<string, unknown> = {};
  for (const column of touchedColumns) {
    updateRow[column] = updates[column];
  }
  updateRow.status = contentChanged
    ? "pending"
    : (existing.status as Product["status"]);

  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update(updateRow)
    .eq("id", id)
    .select(
      "id, seller_id, name, description, price, category, images, tags, stock, is_available, origin_details, created_at, status, documents, lat, lng, address, base_price, commission"
    )
    .single();

  if (updateError) {
    if (updateError.message.includes("enum")) {
      return NextResponse.json(
        { error: "One of the quality badges isn't valid." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Updating the product failed: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(mapProduct(updated));
}
