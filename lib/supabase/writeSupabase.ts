// Supabase-backed writes for Phase 2 Step 6 (checkout orders, seller
// products, profile saves). Reached only when MADETRUE_DATA_SOURCE=supabase;
// the mock paths in client.ts / auth.ts stay the default and the fallback.
//
// These helpers are plain same-origin fetches to our server route
// handlers (app/api/*). The service-role key lives only on the server:
// the routes decide persistence honestly (derive prices and status from
// the DB product row, exactly what 0002_rls.sql trusts to a signed-in
// client once Phase 3 has real sessions).

import type {
  AuditEntry,
  Category,
  Order,
  Product,
  Seller,
  Transaction,
  PlatformCommissionReport,
  SettlementSummary,
} from "../../types";

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

export async function fetchOrdersForSellerSupabase(sellerId: string): Promise<Order[]> {
  return requestJson<Order[]>(`/api/orders?seller_id=${encodeURIComponent(sellerId)}`, {
    method: "GET",
  });
}

// Buyer history (Phase 7 Step 2): `mine=1` asks the route for the session
// user's own purchases, whatever their role — the isolation decision stays
// on the route, never on a client-supplied buyer id.
export async function fetchOrdersForBuyerSupabase(): Promise<Order[]> {
  return requestJson<Order[]>("/api/orders?mine=1", { method: "GET" });
}

// ---------------------------------------------------------------------------
// WhatsApp templates (Phase 7 Step 4): provider status + sandbox sends for
// the admin console. The route owns every honesty call — the browser only
// ever carries an event name and a phone number.
// ---------------------------------------------------------------------------

export interface WhatsAppProviderStatus {
  /** Resolved adapter name: "none" | "twilio" | "wati". */
  provider: string;
  /** What `.env.local` asked for, when it asked for anything. */
  envProvider: string | null;
  configured: boolean;
  mockMode: boolean;
}

export interface WhatsAppSandboxSendResult {
  sent: boolean;
  provider: string;
  providerRef?: string;
  reason?: string;
  /** The exact template text that went out (or would go out). */
  message: string;
}

export async function fetchWhatsAppProviderStatusSupabase(): Promise<WhatsAppProviderStatus> {
  return requestJson<WhatsAppProviderStatus>("/api/whatsapp", { method: "GET" });
}

export async function sendWhatsAppSandboxSendSupabase(
  event: string,
  to: string
): Promise<WhatsAppSandboxSendResult> {
  return requestJson<WhatsAppSandboxSendResult>("/api/whatsapp", {
    method: "POST",
    body: JSON.stringify({ event, to }),
  });
}

// Admin console: the unfiltered global order book. GET /api/orders with no
// query filters returns every order when the session role is admin —
// isolation guards live on the route, not here.
export async function fetchOrdersAdminSupabase(): Promise<Order[]> {
  return requestJson<Order[]>("/api/orders", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Categories — admin console CRUD (Phase 5 Step 5).
// ---------------------------------------------------------------------------

export async function submitCategorySupabase(
  category: { name: string; slug: string; icon: string }
): Promise<Category> {
  return requestJson<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export async function updateCategorySupabase(
  id: string,
  updates: Pick<Category, "name" | "slug" | "icon">
): Promise<Category> {
  return requestJson<Category>("/api/categories", {
    method: "PATCH",
    body: JSON.stringify({ id, ...updates }),
  });
}

export async function deleteCategorySupabase(id: string): Promise<Category> {
  return requestJson<Category>("/api/categories", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

// ---------------------------------------------------------------------------
// Admin audit trail (Phase 5 Step 7). POST appends, GET reads — both go
// through the admin-guarded /api/audit route; actor_id is stamped
// server-side from the session, never from the request body.
// ---------------------------------------------------------------------------

export async function appendAuditSupabase(
  entry: {
    actor_name: string;
    actor_email: string;
    entity_type: AuditEntry["entity_type"];
    entity_id: string;
    entity_label: string;
    action: string;
    summary: string;
  }
): Promise<boolean> {
  await requestJson<{ ok: boolean }>("/api/audit", {
    method: "POST",
    body: JSON.stringify(entry),
  });
  return true;
}

export async function fetchAuditLogSupabase(): Promise<AuditEntry[]> {
  return requestJson<AuditEntry[]>("/api/audit", { method: "GET" });
}

export async function updateOrderStatusSupabase(
  id: string,
  status: Order["status"],
  sellerId?: string
): Promise<Order | null> {
  return requestJson<Order>("/api/orders", {
    method: "PATCH",
    body: JSON.stringify({ id, status, seller_id: sellerId }),
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

export async function fetchProductsForSellerSupabase(sellerId: string): Promise<Product[]> {
  return requestJson<Product[]>(`/api/products?seller_id=${encodeURIComponent(sellerId)}`, {
    method: "GET",
  });
}

export async function deleteProductSupabase(id: string, sellerId?: string): Promise<boolean> {
  const query = sellerId
    ? `?id=${encodeURIComponent(id)}&seller_id=${encodeURIComponent(sellerId)}`
    : `?id=${encodeURIComponent(id)}`;
  const res = await requestJson<{ success: boolean }>(`/api/products${query}`, {
    method: "DELETE",
  });
  return Boolean(res.success);
}

// Phase 5 Step 3 — admin product moderation. The review decision
// (status + commission, recomputed server-side from base_price) and the
// visibility overlay (is_hidden + moderation_note) ride the admin-only
// keys of PATCH /api/products.
export async function updateProductStatusSupabase(
  id: string,
  status: Product["status"],
  reason?: string,
  commission?: number
): Promise<Product | null> {
  const updates: Record<string, unknown> = { status };
  if (commission !== undefined) updates.commission = commission;
  if (reason !== undefined && reason.trim()) updates.moderation_note = reason.trim();
  return requestJson<Product | null>("/api/products", {
    method: "PATCH",
    body: JSON.stringify({ id, updates }),
  });
}

export async function setProductHiddenSupabase(
  id: string,
  is_hidden: boolean,
  note?: string
): Promise<Product | null> {
  const updates: Record<string, unknown> = { is_hidden };
  // An explicitly provided (possibly empty) note always lands — the route
  // maps "" to null so a reinstated listing's stale note is cleared.
  if (note !== undefined) updates.moderation_note = note.trim();
  return requestJson<Product | null>("/api/products", {
    method: "PATCH",
    body: JSON.stringify({ id, updates }),
  });
}

export async function uploadProductImageSupabase(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data !== null &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Failed to upload image.";
    throw new Error(`[madetrue] ${message}`);
  }

  return (data as { url: string }).url;
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
  address?: string;
}

export async function persistProfileSupabase(
  profile: PersistProfile
): Promise<void> {
  await requestJson<PersistProfile>("/api/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

// ---------------------------------------------------------------------------
// Sellers — maker onboarding and admin moderation.
// ---------------------------------------------------------------------------

export async function submitSellerSupabase(
  sellerData: Omit<Seller, "id">
): Promise<Seller> {
  return requestJson<Seller>("/api/sellers", {
    method: "POST",
    body: JSON.stringify({ seller: sellerData }),
  });
}

export async function updateSellerVerificationSupabase(
  id: string,
  is_verified: boolean,
  kyc_status?: Seller["kyc_status"]
): Promise<Seller | null> {
  return requestJson<Seller | null>("/api/sellers", {
    method: "PATCH",
    body: JSON.stringify({ id, is_verified, kyc_status }),
  });
}

// Phase 5 Step 2 — admin moderation of a maker application. One action =
// one consistent state: approve opens the store (verified + approved +
// gateway-KYC marked verified for Cashfree Easy Split onboarding), reject
// parks the application as declined, reopen/revoke return it to the
// pending queue.
export type SellerApplicationAction = "approve" | "reject" | "reopen" | "revoke";

export async function updateSellerApplicationSupabase(
  id: string,
  action: SellerApplicationAction
): Promise<Seller | null> {
  return requestJson<Seller | null>("/api/sellers", {
    method: "PATCH",
    // Legacy admin shape of PATCH /api/sellers (admin-only fields).
    body: JSON.stringify({
      id,
      is_verified: action === "approve",
      kyc_status: action === "approve" ? "verified" : "pending",
      application_status:
        action === "approve"
          ? "approved"
          : action === "reject"
            ? "rejected"
            : "pending",
    }),
  });
}

// The four payout-display fields of the private seller_payout_kyc table
// (0006) — served by the admin-only /api/sellers/[id]/payout route.
export interface SellerPayoutDetails {
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_account_holder?: string;
}

export async function fetchSellerPayoutSupabase(
  id: string
): Promise<SellerPayoutDetails> {
  return requestJson<SellerPayoutDetails>(
    `/api/sellers/${encodeURIComponent(id)}/payout`,
    { method: "GET" }
  );
}

// Step 6 — a maker edits their own storefront (name, story, WhatsApp,
// address, coordinates). Sends the structured { id, updates } shape the
// PATCH route expects; the route re-derives ownership from the cookie
// session and accepts only its owner-editable fields, and never
// verification fields. The route returns the updated row trimmed to
// public columns, or throws with a friendly message on 4xx.
export type SellerProfileUpdates = Partial<
  Pick<
    Seller,
    "business_name" | "story" | "whatsapp_number" | "address" | "lat" | "lng"
  >
>;

export async function updateSellerProfileSupabase(
  id: string,
  updates: SellerProfileUpdates
): Promise<Seller | null> {
  return requestJson<Seller | null>("/api/sellers", {
    method: "PATCH",
    body: JSON.stringify({ id, updates }),
  });
}

export interface RegisterVendorResponse {
  success: boolean;
  seller?: Seller;
  vendorId?: string;
  status?: string;
  kyc_status?: string;
  message?: string;
}

export async function registerSellerVendorSupabase(
  id: string
): Promise<Seller | null> {
  const res = await requestJson<RegisterVendorResponse>(
    `/api/sellers/${encodeURIComponent(id)}/vendor`,
    { method: "POST" }
  );
  return res.seller ?? null;
}

// ---------------------------------------------------------------------------
// Refunds (Phase 6 Step 5) — full & partial refunds via Gateway API
// ---------------------------------------------------------------------------

export interface RefundOrderResponse {
  success: boolean;
  refundId?: string;
  refundAmount?: number;
  isFullRefund?: boolean;
  status?: string;
  order?: Order;
  error?: string;
}

export async function refundOrderSupabase(
  orderId: string,
  options?: { amount?: number; reason?: string }
): Promise<RefundOrderResponse> {
  return requestJson<RefundOrderResponse>(
    `/api/orders/${encodeURIComponent(orderId)}/refund`,
    {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    }
  );
}

export interface OrderRefundDetailsResponse {
  order_id: string;
  order_total: number;
  refunded_total: number;
  refundable_amount: number;
  is_fully_refunded: boolean;
  transactions: Transaction[];
}

export async function fetchOrderRefundDetailsSupabase(
  orderId: string
): Promise<OrderRefundDetailsResponse> {
  return requestJson<OrderRefundDetailsResponse>(
    `/api/orders/${encodeURIComponent(orderId)}/refund`,
    { method: "GET" }
  );
}

// ---------------------------------------------------------------------------
// Settlements & Commission Reports (Phase 6 Step 6)
// ---------------------------------------------------------------------------

export interface SettlementsResponse {
  gateway: string;
  summary: SettlementSummary;
  commissionReport: PlatformCommissionReport;
}

export async function fetchSettlementsSupabase(
  sellerId?: string
): Promise<SettlementsResponse> {
  const query = sellerId ? `?seller_id=${encodeURIComponent(sellerId)}` : "";
  return requestJson<SettlementsResponse>(`/api/settlements${query}`, {
    method: "GET",
  });
}

export async function syncSettlementsSupabase(
  sellerId?: string
): Promise<{ success: boolean; count: number; summary: SettlementSummary }> {
  const query = sellerId ? `?seller_id=${encodeURIComponent(sellerId)}` : "";
  return requestJson<{
    success: boolean;
    count: number;
    summary: SettlementSummary;
  }>(`/api/settlements${query}`, {
    method: "POST",
  });
}



