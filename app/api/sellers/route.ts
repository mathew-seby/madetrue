import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";
import type { Seller } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
// Public catalog shape — mirrors SELLER_COLUMNS in readSupabase.ts.
// Payout secrets (pan, bank_account_number, bank_ifsc, bank_account_holder)
// are written by POST (the seller's own submission) and must never be returned
// by the public GET or verification PATCH of any seller row.
const PUBLIC_SELLER_COLUMNS =
  "id, user_id, business_name, story, profile_photo_url, video_url, address, lat, lng, whatsapp_number, is_verified, payment_vendor_ref, kyc_status";

// Storefront fields a maker may edit about their own store (Step 6).
// Verification (is_verified, kyc_status) stays admin-only: it is never
// accepted from a seller, from any route.
const OWNER_EDITABLE_FIELDS = [
  "business_name",
  "story",
  "whatsapp_number",
  "address",
  "lat",
  "lng",
] as const;

const KYC_STATUSES = ["not_started", "pending", "verified", "failed"] as const;

function maybeUpdateNumber(
  raw: unknown,
  name: string,
  min: number,
  max: number,
  errors: string[]
): number | undefined {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    errors.push(`${name} must be a number between ${min} and ${max}.`);
    return undefined;
  }
  return value;
}

export async function GET() {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — sellers API is off." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("sellers")
    .select(PUBLIC_SELLER_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Failed to load sellers: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — seller creation is off." },
      { status: 400 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The maker application details could not be read." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const seller = body && isRecord(body.seller) ? body.seller : null;
  if (!seller) {
    return NextResponse.json(
      { error: "Missing maker application payload." },
      { status: 400 }
    );
  }

  // Identity (Step 7): a maker application is always for the signed-in
  // account — the session user id wins, the payload's user_id is ignored.
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before applying as a maker." },
      { status: 401 }
    );
  }
  const userId = user.id;

  const businessName = typeof seller.business_name === "string" ? seller.business_name.trim() : "";
  const story = typeof seller.story === "string" ? seller.story.trim() : "";
  const whatsappNumber = typeof seller.whatsapp_number === "string" ? seller.whatsapp_number.trim() : "";
  const address = typeof seller.address === "string" ? seller.address.trim() : "";
  const profilePhotoUrl = typeof seller.profile_photo_url === "string" && seller.profile_photo_url.trim() ? seller.profile_photo_url.trim() : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80";
  const lat = typeof seller.lat === "number" ? seller.lat : 9.9312;
  const lng = typeof seller.lng === "number" ? seller.lng : 76.2673;

  // Payout KYC fields (Cashfree Easy Split)
  const pan = typeof seller.pan === "string" && seller.pan.trim() ? seller.pan.trim().toUpperCase() : undefined;
  const bankAccountNumber = typeof seller.bank_account_number === "string" && seller.bank_account_number.trim() ? seller.bank_account_number.trim() : undefined;
  const bankIfsc = typeof seller.bank_ifsc === "string" && seller.bank_ifsc.trim() ? seller.bank_ifsc.trim().toUpperCase() : undefined;
  const bankAccountHolder = typeof seller.bank_account_holder === "string" && seller.bank_account_holder.trim() ? seller.bank_account_holder.trim() : businessName;

  if (!businessName || !story || !address || !whatsappNumber) {
    return NextResponse.json(
      { error: "Please fill out all required maker and business details." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // 1. Upgrade the signed-in user's role to 'seller' in public.users
  //    (service role; the role guard trigger is bypassed here by design —
  //    the route decides the role, never the request).
  const { error: userRoleErr } = await supabase
    .from("users")
    .update({ role: "seller" })
    .eq("id", userId);

  if (userRoleErr) {
    console.warn("[madetrue] Failed to update user role to seller:", userRoleErr.message);
  }

  // 2. Upsert the seller profile. Payout secrets are NOT columns of this
  //    row since 0006_payout_privacy_and_stock_rpc.sql — they belong to
  //    the private seller_payout_kyc table.
  const sellerRow = {
    user_id: userId,
    business_name: businessName,
    story,
    profile_photo_url: profilePhotoUrl,
    address,
    lat,
    lng,
    whatsapp_number: whatsappNumber,
    is_verified: false,
    kyc_status: "pending" as const,
  };

  const { data: sellerData, error: sellerError } = await supabase
    .from("sellers")
    .upsert(sellerRow, { onConflict: "user_id" })
    .select("*")
    .single();

  if (sellerError) {
    return NextResponse.json(
      { error: `Saving maker profile failed: ${sellerError.message}` },
      { status: 500 }
    );
  }

  // 3. Payout KYC → private table (service_role only: no anon/authenticated
  //    grants, RLS enabled with no policies). If the migration has not
  //    reached this environment yet, onboarding still completes; the
  //    warning makes the gap visible in server logs.
  const sellerIdOut = (sellerData as { id?: string }).id;
  if (
    sellerIdOut &&
    (pan || bankAccountNumber || bankIfsc || bankAccountHolder)
  ) {
    const { error: payoutError } = await supabase
      .from("seller_payout_kyc")
      .upsert(
        {
          seller_id: sellerIdOut,
          pan: pan ?? null,
          bank_account_number: bankAccountNumber ?? null,
          bank_ifsc: bankIfsc ?? null,
          bank_account_holder: bankAccountHolder ?? null,
        },
        { onConflict: "seller_id" }
      );
    if (payoutError) {
      console.warn(
        "[madetrue] Payout KYC could not be stored (is 0006 applied?):",
        payoutError.message
      );
    }
  }

  // Echo only what the maker themselves just submitted (their own data).
  const responseSeller: Seller = {
    ...(sellerData as Seller),
    pan,
    bank_account_number: bankAccountNumber,
    bank_ifsc: bankIfsc,
    bank_account_holder: bankAccountHolder,
  };

  return NextResponse.json(responseSeller);
}

export async function PATCH(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — seller update is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in before updating a maker store." },
      { status: 401 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The seller update payload could not be read." },
      { status: 400 }
    );
  }

  const body = isRecord(payload) ? payload : null;
  const id = body && typeof body.id === "string" ? body.id : null;
  const updates = isRecord(body?.updates) ? body.updates : null;
  // The admin console still sends the older shape: { id, is_verified, kyc_status }.
  const verificationAdditive =
    !updates &&
    body &&
    (typeof body.is_verified === "boolean" ||
      typeof body.kyc_status === "string");

  if (!id || (!updates && !verificationAdditive)) {
    return NextResponse.json(
      { error: "Missing the seller ID or the changes to save." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (sellerError) {
    return NextResponse.json(
      { error: `Database read failed: ${sellerError.message}` },
      { status: 500 }
    );
  }
  if (!seller) {
    return NextResponse.json(
      { error: "That maker store could not be found." },
      { status: 404 }
    );
  }

  const isAdmin = user.role === "admin";
  const isOwner = seller.user_id === user.id;
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You can only edit your own maker store." },
      { status: 403 }
    );
  }

  const updateRow: Record<string, unknown> = {};
  const errors: string[] = [];

  if (updates) {
    // Verification can never ride in with profile fields for non-admins.
    if (
      !isAdmin &&
      ((("is_verified") in updates) || (("kyc_status") in updates))
    ) {
      errors.push(
        "Verification is handled by MADETRUE admins — write to us if something looks wrong."
      );
    }
    for (const field of OWNER_EDITABLE_FIELDS) {
      if (!(field in updates)) continue;
      const value = updates[field];
      if (field === "lat") {
        const parsed = maybeUpdateNumber(value, "Latitude", -90, 90, errors);
        if (parsed !== undefined) updateRow.lat = parsed;
      } else if (field === "lng") {
        const parsed = maybeUpdateNumber(value, "Longitude", -180, 180, errors);
        if (parsed !== undefined) updateRow.lng = parsed;
      } else if (typeof value === "string") {
        const trimmed = value.trim();
        if (field === "business_name" && trimmed === "") {
          errors.push("Give your store a name — buyers know you by it.");
          continue;
        }
        if (field === "whatsapp_number" && trimmed === "") {
          errors.push("Add a WhatsApp number so buyers can reach you.");
          continue;
        }
        updateRow[field] = trimmed;
      }
    }
    if (isAdmin) {
      // Admins may verify from the same route (used by the console toggle).
      if (typeof updates.is_verified === "boolean") {
        updateRow.is_verified = updates.is_verified;
      }
      if (
        typeof updates.kyc_status === "string" &&
        (KYC_STATUSES as readonly string[]).includes(updates.kyc_status)
      ) {
        updateRow.kyc_status = updates.kyc_status;
      }
    }
  } else if (isAdmin && body) {
    // Legacy admin console verification shape.
    if (typeof body.is_verified === "boolean") {
      updateRow.is_verified = body.is_verified;
      // Mark KYC verified/unverified unless an explicit status rides along.
      if (!body.kyc_status) {
        updateRow.kyc_status = body.is_verified ? "verified" : "pending";
      }
    }
    if (
      typeof body.kyc_status === "string" &&
      (KYC_STATUSES as readonly string[]).includes(body.kyc_status)
    ) {
      updateRow.kyc_status = body.kyc_status;
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors.join(" ") },
      { status: 400 }
    );
  }
  if (Object.keys(updateRow).length === 0) {
    return NextResponse.json(
      { error: "Nothing to change yet — edit a field first." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("sellers")
    .update(updateRow)
    .eq("id", id)
    .select(PUBLIC_SELLER_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Updating seller verification failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

