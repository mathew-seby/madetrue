/**
 * MADETRUE — Cashfree Easy Split Payment Adapter (Phase 6 Step 1)
 *
 * Implements the universal `PaymentAdapter` contract for Cashfree Payment Gateway
 * with Easy Split marketplace capabilities.
 *
 * Uses native `fetch` and Node's built-in `crypto` module (zero external dependencies).
 * Secrets (CASHFREE_SECRET_KEY, CASHFREE_WEBHOOK_SECRET) are server-only and
 * are NEVER sent to or imported by client components.
 */

import crypto from "crypto";
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
  SettlementItem,
  RegisterVendorInput,
  RegisterVendorResult,
} from "./types";

const CASHFREE_API_VERSION = "2023-08-01";

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  webhookSecret?: string;
  environment: "sandbox" | "production";
}

export class CashfreePaymentAdapter implements PaymentAdapter {
  readonly name = "cashfree" as const;

  private getConfig(): CashfreeConfig | null {
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    const envRaw = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();
    const environment = envRaw === "production" ? "production" : "sandbox";

    if (!appId || !secretKey) {
      return null;
    }

    return {
      appId,
      secretKey,
      webhookSecret,
      environment,
    };
  }

  isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  private getBaseUrl(environment: "sandbox" | "production"): string {
    return environment === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";
  }

  private getHeaders(config: CashfreeConfig): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      Accept: "application/json",
    };
  }

  /**
   * Registers a seller as a vendor on Cashfree Easy Split using their bank & KYC details.
   */
  async registerVendor(input: RegisterVendorInput): Promise<RegisterVendorResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        gateway: this.name,
        vendorId: input.vendorId,
        status: "FAILED",
        message: "Cashfree credentials missing in environment (.env.local)",
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.environment);
      const url = `${baseUrl}/easy-split/vendors`;

      const phone = input.phone.replace(/\D/g, "").slice(-10);

      const payload = {
        vendor_id: input.vendorId,
        name: input.businessName || input.name,
        email: input.email,
        phone: phone.length === 10 ? phone : "9999999999",
        verify_account: true,
        dashboard_access: false,
        schedule_option: 1,
        bank_details: {
          account_number: input.bankAccount.accountNumber,
          ifsc: input.bankAccount.ifsc,
          account_holder: input.bankAccount.accountHolder || input.name,
        },
        ...(input.pan ? { kyc_details: { pan: input.pan } } : {}),
      };

      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify(payload),
      });

      const responseData = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        if (res.status === 409 || String(responseData.message).includes("already exists")) {
          return this.getVendorStatus(input.vendorId);
        }

        const errorMsg =
          (responseData.message as string) ||
          (responseData.error as string) ||
          `Cashfree vendor onboarding failed with status ${res.status}`;
        return {
          success: false,
          gateway: this.name,
          vendorId: input.vendorId,
          status: "FAILED",
          message: errorMsg,
          rawResponse: responseData,
        };
      }

      const statusRaw = String(responseData.status ?? "ACTIVE").toUpperCase();
      const status: RegisterVendorResult["status"] =
        statusRaw === "ACTIVE"
          ? "ACTIVE"
          : statusRaw === "PENDING"
          ? "PENDING"
          : "FAILED";

      return {
        success: status !== "FAILED",
        gateway: this.name,
        vendorId: input.vendorId,
        status,
        message: (responseData.message as string) || "Vendor registered successfully on Cashfree.",
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during vendor registration";
      return {
        success: false,
        gateway: this.name,
        vendorId: input.vendorId,
        status: "FAILED",
        message,
      };
    }
  }

  /**
   * Queries existing vendor status on Cashfree Easy Split.
   */
  async getVendorStatus(vendorId: string): Promise<RegisterVendorResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        gateway: this.name,
        vendorId,
        status: "FAILED",
        message: "Cashfree credentials missing in environment (.env.local)",
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.environment);
      const url = `${baseUrl}/easy-split/vendors/${encodeURIComponent(vendorId)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(config),
      });

      const responseData = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        return {
          success: false,
          gateway: this.name,
          vendorId,
          status: "FAILED",
          message: (responseData.message as string) || `Failed to fetch vendor: ${res.status}`,
          rawResponse: responseData,
        };
      }

      const statusRaw = String(responseData.status ?? "ACTIVE").toUpperCase();
      const status: RegisterVendorResult["status"] =
        statusRaw === "ACTIVE"
          ? "ACTIVE"
          : statusRaw === "PENDING"
          ? "PENDING"
          : "FAILED";

      return {
        success: status !== "FAILED",
        gateway: this.name,
        vendorId,
        status,
        message: (responseData.message as string) || "Vendor status retrieved.",
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during vendor lookup";
      return {
        success: false,
        gateway: this.name,
        vendorId,
        status: "FAILED",
        message,
      };
    }
  }

  /**
   * Creates an order on Cashfree with Easy Split configuration.
   * If splits are supplied, sets up vendor payouts.
   */
  async createSplitOrder(input: CreateSplitOrderInput): Promise<CreateSplitOrderResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        gateway: this.name,
        gatewayOrderId: input.orderId,
        error: "Cashfree credentials missing in environment (.env.local)",
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.environment);
      const url = `${baseUrl}/orders`;

      // Map splits to Cashfree order_splits format
      const orderSplits = input.splits
        .filter((s) => s.vendorId && s.amount > 0)
        .map((s) => ({
          vendor_id: s.vendorId,
          amount: Number(s.amount.toFixed(2)),
          ...(s.percentage !== undefined ? { percentage: s.percentage } : {}),
        }));

      // Customer details payload
      const customerPhone = input.customer.phone.replace(/[^0-9]/g, "").slice(-10);
      const customerPayload = {
        customer_id: input.customer.id.slice(0, 50),
        customer_phone: customerPhone.length === 10 ? customerPhone : "9999999999",
        customer_name: input.customer.name.slice(0, 100),
        ...(input.customer.email ? { customer_email: input.customer.email } : {}),
      };

      const payload: Record<string, unknown> = {
        order_id: input.orderId,
        order_amount: Number(input.orderAmount.toFixed(2)),
        order_currency: input.currency ?? "INR",
        customer_details: customerPayload,
        order_meta: {
          ...(input.returnUrl ? { return_url: input.returnUrl } : {}),
          ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}),
        },
        ...(input.notes ? { order_tags: input.notes } : {}),
      };

      if (orderSplits.length > 0) {
        payload.order_splits = orderSplits;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify(payload),
      });

      const responseData = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const errorMsg =
          (responseData.message as string) ||
          (responseData.error as string) ||
          `Cashfree order creation failed with status ${res.status}`;
        return {
          success: false,
          gateway: this.name,
          gatewayOrderId: input.orderId,
          error: errorMsg,
          rawResponse: responseData,
        };
      }

      return {
        success: true,
        gateway: this.name,
        gatewayOrderId: (responseData.order_id as string) || input.orderId,
        paymentSessionId: responseData.payment_session_id as string | undefined,
        paymentUrl:
          (responseData.payment_link as string) ||
          (responseData.payment_session_id
            ? `${baseUrl}/view/sessions/${responseData.payment_session_id}`
            : undefined),
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Unknown Cashfree network error";
      return {
        success: false,
        gateway: this.name,
        gatewayOrderId: input.orderId,
        error,
      };
    }
  }

  /**
   * Verifies an order's status and its payment attempts directly from Cashfree.
   */
  async verifyPayment(gatewayOrderId: string): Promise<VerifyPaymentResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        gateway: this.name,
        gatewayOrderId,
        paymentStatus: "FAILED",
        error: "Cashfree credentials missing in environment (.env.local)",
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.environment);
      const orderRes = await fetch(`${baseUrl}/orders/${encodeURIComponent(gatewayOrderId)}`, {
        method: "GET",
        headers: this.getHeaders(config),
      });

      const orderData = (await orderRes.json().catch(() => ({}))) as Record<string, unknown>;

      if (!orderRes.ok) {
        return {
          success: false,
          gateway: this.name,
          gatewayOrderId,
          paymentStatus: "FAILED",
          error: (orderData.message as string) || `Failed to fetch order: ${orderRes.status}`,
          rawResponse: orderData,
        };
      }

      const orderStatus = ((orderData.order_status as string) || "").toUpperCase();

      // Also query payment attempts for transaction reference and method
      let gatewayPaymentId: string | undefined;
      let paymentMethod: string | undefined;
      let bankReference: string | undefined;

      const paymentsRes = await fetch(
        `${baseUrl}/orders/${encodeURIComponent(gatewayOrderId)}/payments`,
        {
          method: "GET",
          headers: this.getHeaders(config),
        }
      ).catch(() => null);

      if (paymentsRes && paymentsRes.ok) {
        const paymentsList = (await paymentsRes.json().catch(() => [])) as Array<
          Record<string, unknown>
        >;
        const successful = paymentsList.find(
          (p) => String(p.payment_status).toUpperCase() === "SUCCESS"
        );
        const latest = successful || paymentsList[0];
        if (latest) {
          gatewayPaymentId = String(latest.cf_payment_id ?? latest.payment_id ?? "");
          paymentMethod = String(latest.payment_group ?? latest.payment_method ?? "");
          bankReference = String(latest.bank_reference ?? "");
        }
      }

      let paymentStatus: VerifyPaymentResult["paymentStatus"] = "PENDING";
      if (orderStatus === "PAID") {
        paymentStatus = "SUCCESS";
      } else if (orderStatus === "EXPIRED") {
        paymentStatus = "CANCELLED";
      } else if (orderStatus === "ACTIVE") {
        paymentStatus = "PENDING";
      } else if (orderStatus === "TERMINATED") {
        paymentStatus = "FAILED";
      }

      return {
        success: orderStatus === "PAID",
        gateway: this.name,
        gatewayOrderId,
        gatewayPaymentId,
        paymentStatus,
        paymentAmount: Number(orderData.order_amount ?? 0),
        paymentMethod,
        bankReference,
        rawResponse: orderData,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Verification network error";
      return {
        success: false,
        gateway: this.name,
        gatewayOrderId,
        paymentStatus: "FAILED",
        error,
      };
    }
  }

  /**
   * Initiates a refund for an order.
   */
  async createRefund(input: RefundInput): Promise<RefundResult> {
    const config = this.getConfig();
    if (!config) {
      return {
        success: false,
        gateway: this.name,
        refundId: input.refundId,
        status: "FAILED",
        error: "Cashfree credentials missing in environment (.env.local)",
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.environment);
      const url = `${baseUrl}/orders/${encodeURIComponent(input.gatewayOrderId)}/refunds`;

      const payload: Record<string, unknown> = {
        refund_id: input.refundId,
        refund_amount: Number(input.refundAmount.toFixed(2)),
        refund_note: input.reason ?? "MADETRUE Order Refund",
      };

      if (input.splits && input.splits.length > 0) {
        payload.refund_splits = input.splits.map((s) => ({
          vendor_id: s.vendorId,
          amount: Number(s.amount.toFixed(2)),
        }));
      }

      const res = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify(payload),
      });

      const responseData = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        return {
          success: false,
          gateway: this.name,
          refundId: input.refundId,
          status: "FAILED",
          error: (responseData.message as string) || `Refund failed: status ${res.status}`,
          rawResponse: responseData,
        };
      }

      const refundStatusRaw = String(responseData.refund_status ?? "").toUpperCase();
      const status: RefundResult["status"] =
        refundStatusRaw === "SUCCESS"
          ? "SUCCESS"
          : refundStatusRaw === "PENDING"
          ? "PENDING"
          : "FAILED";

      return {
        success: status !== "FAILED",
        gateway: this.name,
        refundId: input.refundId,
        gatewayRefundId: String(responseData.cf_refund_id ?? ""),
        status,
        amount: Number(responseData.refund_amount ?? input.refundAmount),
        rawResponse: responseData,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Refund network error";
      return {
        success: false,
        gateway: this.name,
        refundId: input.refundId,
        status: "FAILED",
        error,
      };
    }
  }

  /**
   * Verifies Cashfree HMAC-SHA256 webhook signatures.
   * Signature calculation: Base64(HMAC-SHA256(timestamp + rawBody, secret))
   */
  verifyWebhook(input: WebhookVerificationInput): WebhookVerificationResult {
    const config = this.getConfig();
    const secret = config?.webhookSecret || config?.secretKey;

    if (!secret) {
      return {
        valid: false,
        error: "Missing webhook secret for signature verification",
      };
    }

    try {
      const dataToSign = `${input.timestamp}${input.rawBody}`;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(dataToSign)
        .digest("base64");

      // Constant-time comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(input.signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      const isValid =
        signatureBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

      if (!isValid) {
        // Fallback for body-only signature variation
        const altSignature = crypto
          .createHmac("sha256", secret)
          .update(input.rawBody)
          .digest("base64");
        const altBuffer = Buffer.from(altSignature);
        const isAltValid =
          signatureBuffer.length === altBuffer.length &&
          crypto.timingSafeEqual(signatureBuffer, altBuffer);

        if (!isAltValid) {
          return {
            valid: false,
            error: "Webhook signature mismatch",
          };
        }
      }

      const parsed = JSON.parse(input.rawBody) as Record<string, unknown>;

      return {
        valid: true,
        event: {
          gateway: this.name,
          eventType: (parsed.type as string) || "UNKNOWN_EVENT",
          eventId: (parsed.event_id as string) || `evt_${Date.now()}`,
          eventTime: (parsed.event_time as string) || new Date().toISOString(),
          data: parsed.data ?? parsed,
        },
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "Webhook parsing error";
      return {
        valid: false,
        error,
      };
    }
  }

  /**
   * Retrieves vendor or platform settlement reports.
   */
  async getSettlements(filter?: SettlementFilter): Promise<SettlementSummary> {
    const config = this.getConfig();
    if (!config) {
      return {
        gateway: this.name,
        vendorId: filter?.vendorId,
        totalSettled: 0,
        pendingSettlement: 0,
        currency: "INR",
        settlements: [],
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.environment);
      const path = filter?.vendorId
        ? `/easy-split/vendors/${encodeURIComponent(filter.vendorId)}/settlements`
        : `/settlements`;

      const res = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: this.getHeaders(config),
      });

      if (!res.ok) {
        return {
          gateway: this.name,
          vendorId: filter?.vendorId,
          totalSettled: 0,
          pendingSettlement: 0,
          currency: "INR",
          settlements: [],
        };
      }

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const rawSettlements = Array.isArray(data.data) ? data.data : [];

      const settlements: SettlementItem[] = rawSettlements.map((s: Record<string, unknown>) => ({
        settlementId: String(s.settlement_id ?? s.cf_settlement_id ?? ""),
        vendorId: String(s.vendor_id ?? filter?.vendorId ?? ""),
        amount: Number(s.settlement_amount ?? s.amount ?? 0),
        currency: String(s.currency ?? "INR"),
        status:
          String(s.status).toUpperCase() === "SUCCESS"
            ? "SETTLED"
            : String(s.status).toUpperCase() === "PENDING"
            ? "PENDING"
            : "FAILED",
        utr: s.utr as string | undefined,
        settledAt: (s.settlement_date ?? s.created_at) as string | undefined,
      }));

      const totalSettled = settlements
        .filter((s) => s.status === "SETTLED")
        .reduce((sum, s) => sum + s.amount, 0);

      const pendingSettlement = settlements
        .filter((s) => s.status === "PENDING")
        .reduce((sum, s) => sum + s.amount, 0);

      return {
        gateway: this.name,
        vendorId: filter?.vendorId,
        totalSettled,
        pendingSettlement,
        currency: "INR",
        settlements,
      };
    } catch {
      return {
        gateway: this.name,
        vendorId: filter?.vendorId,
        totalSettled: 0,
        pendingSettlement: 0,
        currency: "INR",
        settlements: [],
      };
    }
  }
}

export const cashfreePaymentAdapter = new CashfreePaymentAdapter();

