import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
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

  const userId = typeof seller.user_id === "string" ? seller.user_id.trim() : "";
  const businessName = typeof seller.business_name === "string" ? seller.business_name.trim() : "";
  const story = typeof seller.story === "string" ? seller.story.trim() : "";
  const whatsappNumber = typeof seller.whatsapp_number === "string" ? seller.whatsapp_number.trim() : "";
  const address = typeof seller.address === "string" ? seller.address.trim() : "";
  const profilePhotoUrl = typeof seller.profile_photo_url === "string" ? seller.profile_photo_url.trim() : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80";
  const lat = typeof seller.lat === "number" ? seller.lat : 9.9312;
  const lng = typeof seller.lng === "number" ? seller.lng : 76.2673;

  // Payout KYC fields (Cashfree Easy Split)
  const pan = typeof seller.pan === "string" && seller.pan.trim() ? seller.pan.trim().toUpperCase() : undefined;
  const bankAccountNumber = typeof seller.bank_account_number === "string" && seller.bank_account_number.trim() ? seller.bank_account_number.trim() : undefined;
  const bankIfsc = typeof seller.bank_ifsc === "string" && seller.bank_ifsc.trim() ? seller.bank_ifsc.trim().toUpperCase() : undefined;
  const bankAccountHolder = typeof seller.bank_account_holder === "string" && seller.bank_account_holder.trim() ? seller.bank_account_holder.trim() : businessName;

  if (!userId || !businessName || !story || !address || !whatsappNumber) {
    return NextResponse.json(
      { error: "Please fill out all required maker and business details." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // 1. Upgrade user role to 'seller' in public.users table using service_role client
  const { error: userRoleErr } = await supabase
    .from("users")
    .update({ role: "seller" })
    .eq("id", userId);

  if (userRoleErr) {
    console.warn("[madetrue] Failed to update user role to seller:", userRoleErr.message);
  }

  // 2. Insert or upsert seller profile in public.sellers
  const baseSellerRow = {
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

  const fullSellerRow = {
    ...baseSellerRow,
    pan,
    bank_account_number: bankAccountNumber,
    bank_ifsc: bankIfsc,
    bank_account_holder: bankAccountHolder,
  };

  // Attempt insert with KYC columns
  let result = await supabase
    .from("sellers")
    .upsert(fullSellerRow, { onConflict: "user_id" })
    .select("*")
    .single();

  // If KYC columns do not exist yet (code 42703), fallback to base row
  if (result.error && (result.error.code === "42703" || result.error.message.includes("pan") || result.error.message.includes("bank"))) {
    result = await supabase
      .from("sellers")
      .upsert(baseSellerRow, { onConflict: "user_id" })
      .select("*")
      .single();
  }

  if (result.error) {
    return NextResponse.json(
      { error: `Saving maker profile failed: ${result.error.message}` },
      { status: 500 }
    );
  }

  const responseSeller: Seller = {
    ...(result.data as Seller),
    pan: (result.data as Record<string, unknown>).pan as string || pan,
    bank_account_number: (result.data as Record<string, unknown>).bank_account_number as string || bankAccountNumber,
    bank_ifsc: (result.data as Record<string, unknown>).bank_ifsc as string || bankIfsc,
    bank_account_holder: (result.data as Record<string, unknown>).bank_account_holder as string || bankAccountHolder,
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
  if (!id) {
    return NextResponse.json(
      { error: "Missing seller ID." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const updates: Record<string, unknown> = {};

  if (body && typeof body.is_verified === "boolean") {
    updates.is_verified = body.is_verified;
    // When verified, mark kyc_status as verified unless explicitly specified
    if (body.is_verified && !body.kyc_status) {
      updates.kyc_status = "verified";
    } else if (!body.is_verified && !body.kyc_status) {
      updates.kyc_status = "pending";
    }
  }

  if (body && typeof body.kyc_status === "string") {
    updates.kyc_status = body.kyc_status;
  }

  const { data, error } = await supabase
    .from("sellers")
    .update(updates)
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

