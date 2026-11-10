export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin';
  location_lat?: number;
  location_lng?: number;
  region?: string;
  language_pref?: string;
  profile_photo_url?: string;
  address?: string;
}

export interface Seller {
  id: string;
  user_id: string;
  business_name: string;
  story: string;
  profile_photo_url: string;
  video_url?: string;
  address: string;
  lat: number;
  lng: number;
  whatsapp_number: string;
  is_verified: boolean;
  payment_vendor_ref?: string;
  kyc_status?: 'not_started' | 'pending' | 'verified' | 'failed';
  // Admin application lifecycle (Phase 5): pending → approved | rejected.
  // Marketplace verification — separate from gateway kyc_status above.
  application_status?: 'pending' | 'approved' | 'rejected';
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_account_holder?: string;
}

// The exact badge tag strings allowed on products (AGENTS.md badge list)
export type ProductBadgeTag = 'Same Day Delivery' | 'Pickup Available' | 'Fresh Today' | 'Locally Made' | 'Eco-Friendly';

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  category: string; // category slug
  images: string[];
  tags: ProductBadgeTag[];
  stock: number;
  is_available: boolean;
  origin_details: string;
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected';
  documents?: { name: string; url: string }[];
  // Admin moderation overlay (Phase 5): hidden products stay in the maker's
  // dashboard but vanish from every public catalog surface. Distinct from
  // is_available so maker visibility controls never undo admin concealment.
  is_hidden?: boolean;
  // Audit note the moderator attaches to a moderation action (also carries
  // rejection reasons so they're finally persisted, not only emailed).
  moderation_note?: string;
  lat?: number;
  lng?: number;
  address?: string;
  base_price?: number;
  commission?: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'ready' | 'delivered' | 'cancelled';
  delivery_type: 'delivery' | 'pickup';
  address: string;
  payment_method: 'upi' | 'cod';
  whatsapp_notified: boolean;
  created_at: string;
  lat?: number;
  lng?: number;
  base_price?: number;
  commission?: number;
  // Denormalized display fields carried on stored order records and used
  // directly by the admin console order cards.
  buyer_name?: string;
  buyer_phone?: string;
  product_name?: string;
  price?: number;
  // Recorded once per delivery basket on its first line (checkout rule).
  delivery_fee?: number;
  // Gateway & Split payment fields (Phase 6):
  gateway?: 'cashfree' | 'razorpay' | 'payu' | 'mock' | null;
  gateway_order_ref?: string | null;
  gateway_payment_ref?: string | null;
  split_status?: 'not_applicable' | 'pending' | 'completed' | 'failed';
}

export interface Category {
  id: string;
  name: string;
  icon: string; // React component or lucide icon name
  slug: string;
}

// Admin console audit trail (Phase 5 Step 7): one row per console
// moderation action — who did it, on what, and what changed (the
// before → after summary is written in plain human words so the trail
// reads like a story, not a diff).
export type AuditEntityType = "product" | "seller" | "order" | "category";

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  entity_type: AuditEntityType;
  entity_id: string;
  /** Human-readable name at action time (product name, store name...). */
  entity_label: string;
  /** Machine action, e.g. "approved", "hidden", "removed", "status_changed". */
  action: string;
  /** The before → after sentence shown in the console. */
  summary: string;
}

// Append-only transactions ledger (Phase 2 schema, Phase 6 payments & refunds)
export interface Transaction {
  id: string;
  order_id: string;
  seller_id: string;
  gateway: 'cashfree' | 'razorpay' | 'payu' | 'mock';
  gateway_event_id: string;
  type: 'payment' | 'refund' | 'settlement' | 'commission';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

// Settlement & Commission Reports (Phase 6 Step 6):
export interface MakerCommissionReportRow {
  sellerId: string;
  businessName: string;
  vendorRef?: string;
  orderCount: number;
  grossSales: number;
  makerShare: number;
  commission: number;
  deliveryFees: number;
  settledAmount: number;
  pendingSettlement: number;
  status: "settled" | "pending" | "no_sales";
}

export interface PlatformCommissionReport {
  period: string;
  currency: string;
  totalGrossSales: number;
  totalMakerPayouts: number;
  totalCommissionEarned: number;
  totalDeliveryFees: number;
  totalSettledToMakers: number;
  totalPendingSettlement: number;
  makerBreakdown: MakerCommissionReportRow[];
}

// Payment adapter and split settlements (Phase 6):
export type {
  PaymentGatewayName,
  PaymentAdapter,
  SplitRecipient,
  CustomerDetails,
  CreateSplitOrderInput,
  CreateSplitOrderResult,
  VerifyPaymentResult,
  RefundInput,
  RefundResult,
  WebhookVerificationInput,
  WebhookEvent,
  WebhookVerificationResult,
  SettlementFilter,
  SettlementItem,
  SettlementSummary,
  RegisterVendorInput,
  RegisterVendorResult,
} from "@/lib/payments/types";

