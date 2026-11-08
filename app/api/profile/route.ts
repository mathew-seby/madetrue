// Server-side profile persistence for MADETRUE_DATA_SOURCE=supabase.
// Upserts the mock-era user into public.users by id. Supabase Auth owns
// passwords from Phase 3, so passwords are never accepted here — name,
// email, phone, language and photo are the fields that can persist today.
// The service role bypasses the role guard trigger, so role is validated
// server-side against the exact enum values.

import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { PersistProfile } from "@/lib/supabase/writeSupabase";

const ROLES: PersistProfile["role"][] = ["buyer", "seller", "admin"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — profile persistence is off." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The profile update could not be read." },
      { status: 400 }
    );
  }

  const profile = isRecord(payload) ? payload : null;
  if (!profile) {
    return NextResponse.json(
      { error: "The profile update is missing its details." },
      { status: 400 }
    );
  }

  const id = typeof profile.id === "string" && profile.id ? profile.id : null;
  const name = typeof profile.name === "string" ? profile.name : "";
  const email = typeof profile.email === "string" ? profile.email : "";
  const phone = typeof profile.phone === "string" ? profile.phone : "";
  const role = ROLES.includes(profile.role as PersistProfile["role"])
    ? (profile.role as PersistProfile["role"])
    : ("buyer" as const);

  if (!id || !name.trim()) {
    return NextResponse.json(
      { error: "Your profile needs a name before it can be saved." },
      { status: 400 }
    );
  }
  if (email.trim() === "" && phone.trim() === "") {
    return NextResponse.json(
      { error: "Save at least an email address or a phone number with your profile." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  const address =
    typeof profile.address === "string" && profile.address.trim()
      ? profile.address.trim()
      : null;

  const baseRow = {
    id,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    role,
    language_pref:
      typeof profile.language_pref === "string" && profile.language_pref.trim()
        ? profile.language_pref.trim()
        : null,
    profile_photo_url:
      typeof profile.profile_photo_url === "string" && profile.profile_photo_url.trim()
        ? profile.profile_photo_url.trim()
        : null,
    region: address,
  };

  // Attempt upsert with address column (0003_user_address.sql)
  let result = await supabase
    .from("users")
    .upsert({ ...baseRow, address }, { onConflict: "id" })
    .select("id, name, email, phone, role, language_pref, profile_photo_url, address, region")
    .single();

  // If address column does not exist yet (Postgres code 42703), retry without it
  if (result.error && (result.error.code === "42703" || result.error.message.includes("address"))) {
    result = await supabase
      .from("users")
      .upsert(baseRow, { onConflict: "id" })
      .select("id, name, email, phone, role, language_pref, profile_photo_url, region")
      .single();
  }

  if (result.error) {
    if (result.error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "That email address or phone number already belongs to another account.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: `Saving your profile failed: ${result.error.message}` },
      { status: 500 }
    );
  }

  const savedRecord = result.data as Record<string, unknown>;
  const resolvedAddress =
    typeof savedRecord.address === "string" && savedRecord.address
      ? savedRecord.address
      : typeof savedRecord.region === "string" && savedRecord.region
      ? savedRecord.region
      : address || undefined;

  const responsePayload = {
    ...result.data,
    address: resolvedAddress,
  };

  return NextResponse.json(responsePayload);
}
