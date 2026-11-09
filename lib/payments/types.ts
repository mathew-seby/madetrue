/**
 * MADETRUE — Unified Payment Adapter Types (Phase 6 Step 1)
 *
 * All payment gateways (Cashfree Easy Split primary, Razorpay Route / PayU alternates,
 * and the Mock fallback) implement the single `PaymentAdapter` interface defined here.
 *
 * This guarantees checkout UI, webhook listeners, refund APIs, and settlement reports
 * never import gateway-specific SDKs directly.
 */

export type PaymentGatewayName = "cashfree" | "razorpay" | "payu" | "mock";

export interface SplitRecipient {
  /** Gateway vendor reference id (e.g., Cashfree vendor_id, seller.payment_vendor_ref) */
  vendorId: string;
  /** Amount to settle to this vendor in INR */
  amount: number;
  /** Optional percentage for split records that track fee calculation */
  percentage?: number;
}

export interface CustomerDetails {
  id: string;
  name: string;
  email?: string;
  phone: string;
}

export interface CreateSplitOrderInput {
  orderId: string;
  orderAmount: number;
  currency?: string; // defaults to 'INR'
  customer: CustomerDetails;
  /** Splits for Easy Split marketplace payout: seller share vs platform */
  splits: SplitRecipient[];
  returnUrl?: string;
  notifyUrl?: string;
  notes?: Record<string, string>;
}

export interface CreateSplitOrderResult {
  success: boolean;
  gateway: PaymentGatewayName;
  gatewayOrderId: string;
  paymentSessionId?: string;
  paymentUrl?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  success: boolean;
  gateway: PaymentGatewayName;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  paymentStatus: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED" | "CANCELLED";
  paymentAmount?: number;
  paymentMethod?: string;
  bankReference?: string;
  splits?: SplitRecipient[];
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface RefundInput {
  orderId: string;
  gatewayOrderId: string;
  refundId: string;
  refundAmount: number;
  reason?: string;
  /** If the gateway supports split refunds, attribute which vendor shares are reversed */
  splits?: SplitRecipient[];
}

export interface RefundResult {
  success: boolean;
  gateway: PaymentGatewayName;
  refundId: string;
  gatewayRefundId?: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
  amount?: number;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface WebhookVerificationInput {
  rawBody: string;
  signature: string;
  timestamp: string;
}

export interface WebhookEvent<T = unknown> {
  gateway: PaymentGatewayName;
  eventType: string;
  eventId: string;
  eventTime: string;
  data: T;
}

export interface WebhookVerificationResult {
  valid: boolean;
  event?: WebhookEvent;
  error?: string;
}

export interface SettlementFilter {
  startDate?: string;
  endDate?: string;
  vendorId?: string;
  limit?: number;
}

export interface SettlementItem {
  settlementId: string;
  vendorId: string;
  amount: number;
  currency: string;
  status: "SETTLED" | "PENDING" | "FAILED";
  utr?: string;
  settledAt?: string;
}

export interface SettlementSummary {
  gateway: PaymentGatewayName;
  vendorId?: string;
  totalSettled: number;
  pendingSettlement: number;
  currency: string;
  settlements: SettlementItem[];
}

export interface RegisterVendorInput {
  vendorId: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  bankAccount: {
    accountNumber: string;
    ifsc: string;
    accountHolder: string;
  };
  pan?: string;
}

export interface RegisterVendorResult {
  success: boolean;
  gateway: PaymentGatewayName;
  vendorId: string;
  status: "ACTIVE" | "PENDING" | "FAILED";
  message?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Universal Payment Adapter Interface
 * All payment operations must pass through this contract.
 */
export interface PaymentAdapter {
  readonly name: PaymentGatewayName;

  /** Whether the gateway has active server-side credentials */
  isConfigured(): boolean;

  /**
   * Registers a seller as a vendor on the split settlement platform (Easy Split).
   */
  registerVendor(input: RegisterVendorInput): Promise<RegisterVendorResult>;

  /**
   * Retrieves the current vendor status from the gateway.
   */
  getVendorStatus(vendorId: string): Promise<RegisterVendorResult>;

  /**
   * Creates an order with automated split allocations (Easy Split).
   * Generates a payment session ID or hosted checkout URL.
   */
  createSplitOrder(input: CreateSplitOrderInput): Promise<CreateSplitOrderResult>;

  /**
   * Verifies the status of a payment by its gateway order reference.
   */
  verifyPayment(gatewayOrderId: string): Promise<VerifyPaymentResult>;

  /**
   * Issues a full or partial refund for an order, reversing splits where supported.
   */
  createRefund(input: RefundInput): Promise<RefundResult>;

  /**
   * Validates cryptographic webhook signatures (HMAC-SHA256) and parses the event payload.
   */
  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult> | WebhookVerificationResult;

  /**
   * Retrieves payout settlement details for a vendor or overall platform.
   */
  getSettlements(filter?: SettlementFilter): Promise<SettlementSummary>;
}

