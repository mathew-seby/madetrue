/**
 * MADETRUE — Deterministic Mock Payment Adapter (Phase 6 Step 1)
 *
 * Implements the universal `PaymentAdapter` contract for local development,
 * CI/CD verification, and environments where live Cashfree credentials
 * are not yet supplied.
 *
 * Simulates Easy Split calculations, order creation, payment verification,
 * split refunds, webhook signatures, and settlement reports.
 */

import type {
  PaymentAdapter,
  CreateSplitOrderInput,
  CreateSplitOrderResult,
  VerifyPaymentResult,
  RefundInput,
  RefundResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
  SettlementFilter,
  SettlementSummary,
  RegisterVendorInput,
  RegisterVendorResult,
} from "./types";

export class MockPaymentAdapter implements PaymentAdapter {
  readonly name = "mock" as const;

  isConfigured(): boolean {
    return true;
  }

  async registerVendor(input: RegisterVendorInput): Promise<RegisterVendorResult> {
    const acct = input.bankAccount.accountNumber?.trim() || "";
    const ifsc = input.bankAccount.ifsc?.trim() || "";

    if (!acct || acct.length < 6 || !ifsc) {
      return {
        success: false,
        gateway: this.name,
        vendorId: input.vendorId,
        status: "FAILED",
        message: "Bank account number must be at least 6 digits and valid IFSC is required.",
      };
    }

    return {
      success: true,
      gateway: this.name,
      vendorId: input.vendorId,
      status: "ACTIVE",
      message: "Maker successfully onboarded as Easy Split vendor in mock mode.",
      rawResponse: {
        vendor_id: input.vendorId,
        status: "ACTIVE",
        verified: true,
        account_holder: input.bankAccount.accountHolder,
        mock_mode: true,
      },
    };
  }

  async getVendorStatus(vendorId: string): Promise<RegisterVendorResult> {
    return {
      success: true,
      gateway: this.name,
      vendorId,
      status: "ACTIVE",
      message: "Vendor is active on mock gateway.",
      rawResponse: { vendor_id: vendorId, status: "ACTIVE", mock_mode: true },
    };
  }

  async createSplitOrder(input: CreateSplitOrderInput): Promise<CreateSplitOrderResult> {
    const timestamp = Date.now();
    const gatewayOrderId = `cf_mock_order_${input.orderId}_${timestamp}`;
    const paymentSessionId = `cf_mock_session_${timestamp}`;

    return {
      success: true,
      gateway: this.name,
      gatewayOrderId,
      paymentSessionId,
      paymentUrl: `https://mock.madetrue.local/checkout/${paymentSessionId}`,
      rawResponse: {
        order_id: gatewayOrderId,
        order_amount: input.orderAmount,
        order_currency: input.currency ?? "INR",
        order_splits: input.splits,
        customer_details: input.customer,
        mock_mode: true,
      },
    };
  }

  async verifyPayment(gatewayOrderId: string): Promise<VerifyPaymentResult> {
    const timestamp = Date.now();
    return {
      success: true,
      gateway: this.name,
      gatewayOrderId,
      gatewayPaymentId: `cf_mock_pay_${timestamp}`,
      paymentStatus: "SUCCESS",
      paymentAmount: 100,
      paymentMethod: "upi",
      bankReference: `UTR_MOCK_${timestamp}`,
      rawResponse: {
        order_id: gatewayOrderId,
        order_status: "PAID",
        mock_mode: true,
      },
    };
  }

  async createRefund(input: RefundInput): Promise<RefundResult> {
    const timestamp = Date.now();
    const gatewayRefundId = `cf_mock_ref_${input.refundId}_${timestamp}`;

    return {
      success: true,
      gateway: this.name,
      refundId: input.refundId,
      gatewayRefundId,
      status: "SUCCESS",
      amount: input.refundAmount,
      rawResponse: {
        refund_id: gatewayRefundId,
        refund_amount: input.refundAmount,
        refund_status: "SUCCESS",
        mock_mode: true,
      },
    };
  }

  verifyWebhook(input: WebhookVerificationInput): WebhookVerificationResult {
    try {
      const parsed = JSON.parse(input.rawBody || "{}") as Record<string, unknown>;
      return {
        valid: true,
        event: {
          gateway: this.name,
          eventType: (parsed.type as string) || "PAYMENT_SUCCESS_WEBHOOK",
          eventId: (parsed.event_id as string) || `evt_mock_${Date.now()}`,
          eventTime: (parsed.event_time as string) || new Date().toISOString(),
          data: parsed.data ?? parsed,
        },
      };
    } catch {
      return {
        valid: false,
        error: "Invalid mock webhook payload JSON",
      };
    }
  }

  async getSettlements(filter?: SettlementFilter): Promise<SettlementSummary> {
    return {
      gateway: this.name,
      vendorId: filter?.vendorId,
      totalSettled: 4850.0,
      pendingSettlement: 350.0,
      currency: "INR",
      settlements: [
        {
          settlementId: "settle_mock_001",
          vendorId: filter?.vendorId ?? "vendor_seller_1",
          amount: 2400.0,
          currency: "INR",
          status: "SETTLED",
          utr: "UTR_MOCK_112233",
          settledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          settlementId: "settle_mock_002",
          vendorId: filter?.vendorId ?? "vendor_seller_1",
          amount: 2450.0,
          currency: "INR",
          status: "SETTLED",
          utr: "UTR_MOCK_445566",
          settledAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    };
  }
}

export const mockPaymentAdapter = new MockPaymentAdapter();

