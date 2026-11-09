import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";

// Admin-only payout KYC reader.
//
// 0006_payout_privacy_and_stock_rpc.sql moved payout secrets (PAN, bank
// account, IFSC, holder) into the private `seller_payout_kyc` table —
// no anon/authenticated grants, service_role only, zero RLS policies.
// The console's KYC card therefore cannot read them from `sellers` rows
// anymore; GET here hydrates one maker's payout card from the private
// table on the admin's behalf (used by app/admin Makers section).
//
// Responses are deliberately trimmed to the four display fields and
// `{}` when the maker has not submitted payout details yet — the card
// then renders its "—" placeholders.

interface SellerPayoutResponse {
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_account_holder?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — payout lookup is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in as a MADETRUE moderator first." },
      { status: 401 }
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Payout details are visible to admins only." },
      { status: 403 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing the maker store ID." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("seller_payout_kyc")
    .select("pan, bank_account_number, bank_ifsc, bank_account_holder")
    .eq("seller_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: `Payout lookup failed: ${error.message} (is 0006 applied?)`,
      },
      { status: 500 }
    );
  }

  const payout = (data ?? {}) as SellerPayoutResponse;
  // Trim empty strings to undefined so the console falls back to "—".
  return NextResponse.json({
    pan: payout.pan?.trim() || undefined,
    bank_account_number: payout.bank_account_number?.trim() || undefined,
    bank_ifsc: payout.bank_ifsc?.trim() || undefined,
    bank_account_holder: payout.bank_account_holder?.trim() || undefined,
  });
}
