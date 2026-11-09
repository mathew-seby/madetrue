// Server-side category writes for MADETRUE_DATA_SOURCE=supabase
// (Phase 5 Step 5 — admin console CRUD).
//
// Reads stay public (0002_rls.sql: categories_public_read, reached with
// the anon/browser client from client.ts); writes are guarded twice:
//   * this route requires an admin session (getServerUser) before the
//     service-role client touches anything, and
//   * the database's categories_admin_write policy allows admin rows only
//     over the raw REST path too.
// Mock mode has no server persistence (the console edits the client-side
// madetrue_categories store directly) — an honest 400 explains that.
//
// Slug rules mirror the database: categories_slug_format
// (^[a-z0-9]+(-[a-z0-9]+)*$) and categories_slug_unique (0001_init.sql).
// Renaming a slug cascades into products (products_category_fkey ON
// UPDATE CASCADE), so existing product rows follow the rename; deleting a
// slug that still holds products is refused FIRST by this route with a
// warm, specific message (the FK would refuse it anyway).

import { NextResponse } from "next/server";
import type { Category } from "@/types";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, slugifyName, isValidSlug } from "@/lib/utils/categories";

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    slug: row.slug as string,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Returns null when the caller is a signed-in admin; otherwise the
// NextResponse to send straight back.
async function requireAdmin(): Promise<NextResponse | null> {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — category persistence is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to manage categories." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Only MADETRUE moderators can manage categories." },
      { status: 403 }
    );
  }
  return null;
}

// Normalized slug from the request (explicit slug wins, else the name).
// An empty result fails the DB format constraint, so reject it here with
// copy that says what to fix.
function normalizeSlug(input: unknown, fallbackName: string): string | null {
  const slug = slugifyName(
    typeof input === "string" && input.trim() !== "" ? input.trim() : fallbackName
  );
  return isValidSlug(slug) ? slug : null;
}

function normalizeIcon(input: unknown): string {
  return typeof input === "string" && (CATEGORY_ICONS as readonly string[]).includes(input)
    ? input
    : DEFAULT_CATEGORY_ICON;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }
  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Give the category a name first." },
      { status: 400 }
    );
  }

  const slug = normalizeSlug(payload.slug, name);
  if (!slug) {
    return NextResponse.json(
      { error: "The category address needs at least one letter or number." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // Friendly uniqueness message before the DB's unique constraint answers
  // with a bare 23505.
  const { data: clash } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) {
    return NextResponse.json(
      {
        error: `"${(clash as { name: string }).name}" already uses the address "${slug}" — pick another name or slug.`,
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      icon: normalizeIcon(payload.icon),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Could not create the category: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(mapCategory(data));
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.id !== "string" || !payload.id) {
    return NextResponse.json({ error: "Which category should be updated? (missing id)" }, { status: 400 });
  }

  const updates: { name?: string; slug?: string; icon?: string } = {};
  if (typeof payload.name === "string") {
    const name = payload.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Give the category a name first." }, { status: 400 });
    }
    updates.name = name;
  }
  if (typeof payload.slug === "string" || typeof payload.name === "string") {
    const fallBackName = typeof payload.name === "string" ? payload.name.trim() : "";
    const slug = normalizeSlug(payload.slug, fallBackName);
    if (!slug) {
      return NextResponse.json(
        { error: "The category address needs at least one letter or number." },
        { status: 400 }
      );
    }
    updates.slug = slug;
  }
  if ("icon" in payload) {
    updates.icon = normalizeIcon(payload.icon);
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("id", payload.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "That category could not be found." }, { status: 404 });
  }

  if (updates.slug && updates.slug !== (existing as { slug: string }).slug) {
    const { data: clash } = await supabase
      .from("categories")
      .select("id, name")
      .eq("slug", updates.slug)
      .neq("id", payload.id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json(
        {
          error: `"${(clash as { name: string }).name}" already uses the address "${updates.slug}" — pick another slug.`,
        },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", payload.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Could not update the category: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(mapCategory(data));
}

export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that request." }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.id !== "string" || !payload.id) {
    return NextResponse.json({ error: "Which category should be removed? (missing id)" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("*")
    .eq("id", payload.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "That category could not be found." }, { status: 404 });
  }

  // The products.foreign key (products_category_fkey) is ON UPDATE
  // CASCADE but has no ON DELETE action — deleting a used slug is a
  // guaranteed 23503. Answer first, with copy that says what to do.
  const { count: inUse, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category", (existing as { slug: string }).slug);

  if (countError) {
    return NextResponse.json(
      { error: `Could not check product usage: ${countError.message}` },
      { status: 500 }
    );
  }
  if ((inUse ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `This category still holds ${inUse} product${(inUse ?? 0) === 1 ? "" : "s"} — move or remove them first.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", payload.id);
  if (error) {
    return NextResponse.json(
      { error: `Could not remove the category: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(mapCategory(existing));
}
