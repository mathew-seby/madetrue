import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";
import { getPaymentAdapter } from "@/lib/payments";
import type { Seller } from "@/types";

const PUBLIC_SELLER_COLUMNS =
  "id, user_id, business_name, story, profile_photo_url, video_url, address, lat, lng, whatsapp_number, is_verified, payment_vendor_ref, kyc_status, application_status";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — vendor registration route is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in required to manage gateway vendor registration." },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing seller ID." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // 1. Fetch seller row
  const { data: sellerData, error: sellerError } = await supabase
    .from("sellers")
    .select(PUBLIC_SELLER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (sellerError || !sellerData) {
    return NextResponse.json(
      { error: "Seller store not found." },
      { status: 404 }
    );
  }

  const seller = sellerData as Seller;

  // 2. Authorization: caller must be admin or the owner of this seller profile
  if (user.role !== "admin" && seller.user_id !== user.id) {
    return NextResponse.json(
      { error: "Only admins or the store owner can trigger vendor registration." },
      { status: 403 }
    );
  }

  // 3. Read payout KYC from private seller_payout_kyc table
  const { data: kycData, error: kycError } = await supabase
    .from("seller_payout_kyc")
    .select("pan, bank_account_number, bank_ifsc, bank_account_holder")
    .eq("seller_id", id)
    .maybeSingle();

  if (kycError) {
    return NextResponse.json(
      { error: `Failed to load payout KYC: ${kycError.message}` },
      { status: 500 }
    );
  }

  const accountNumber = kycData?.bank_account_number?.trim();
  const ifsc = kycData?.bank_ifsc?.trim();

  if (!accountNumber || !ifsc) {
    return NextResponse.json(
      {
        error:
          "Bank account number and IFSC are missing. The maker must submit valid bank details before vendor registration.",
      },
      { status: 400 }
    );
  }

  // 4. Call payment adapter
  const adapter = getPaymentAdapter();
  const vendorId = seller.payment_vendor_ref?.trim() || `vendor_${seller.id}`;

  // Fetch caller details for email/name
  const { data: callerUser } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .maybeSingle();

  const callerEmail = callerUser?.email || `${seller.id}@madetrue.local`;
  const callerName = callerUser?.name || user.role;

  const result = await adapter.registerVendor({
    vendorId,
    name: kycData?.bank_account_holder?.trim() || seller.business_name,
    businessName: seller.business_name,
    email: callerEmail,
    phone: seller.whatsapp_number,
    bankAccount: {
      accountNumber,
      ifsc,
      accountHolder: kycData?.bank_account_holder?.trim() || seller.business_name,
    },
    pan: kycData?.pan?.trim() || undefined,
  });

  const kycStatus =
    result.status === "ACTIVE"
      ? "verified"
      : result.status === "FAILED"
      ? "failed"
      : "pending";

  // 5. Update seller row with vendor reference and updated kyc_status
  const { data: updatedSeller, error: updateError } = await supabase
    .from("sellers")
    .update({
      payment_vendor_ref: result.vendorId,
      kyc_status: kycStatus,
    })
    .eq("id", id)
    .select(PUBLIC_SELLER_COLUMNS)
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: `Vendor registration succeeded at gateway, but failed to save in database: ${updateError.message}` },
      { status: 500 }
    );
  }

  // 6. Record audit entry if initiated by admin
  if (user.role === "admin") {
    try {
      await supabase.from("admin_audit").insert({
        actor_id: user.id,
        actor_name: callerName,
        actor_email: callerEmail,
        entity_type: "seller",
        entity_id: id,
        entity_label: seller.business_name,
        action: "vendor_registered",
        summary: `Onboarded as ${result.gateway} Easy Split vendor: "${result.vendorId}" (${result.status}).`,
      });
    } catch {
      // Non-fatal if audit insert fails
    }
  }

  return NextResponse.json({
    success: result.success,
    seller: updatedSeller,
    vendorId: result.vendorId,
    status: result.status,
    kyc_status: kycStatus,
    message: result.message,
  });
}
