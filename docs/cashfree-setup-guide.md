# Cashfree Easy Split Setup & Integration Guide

> **Phase 6: Payments** — Primary Gateway Integration Guide  
> **Model:** Hyperlocal Marketplace Split Settlements at Source  
> **Architecture:** Unified Payment Adapter (`PaymentAdapter` in `lib/payments/`)

---

## 1. Overview & Strategy

MADETRUE connects local makers (farmers, artisans, home businesses) directly with buyers.
Under our split-settlement payment architecture (**Cashfree Easy Split**):

1. **Buyer Checkout:** The buyer pays the complete order value (product price + ₹49 delivery fee where applicable) in a single online transaction via UPI, Debit/Credit Card, or Netbanking.
2. **Automatic Split at Source:**
   - **Seller Share:** Routed automatically to the verified seller's linked vendor account.
   - **Platform Commission & Delivery Fee:** Retained by MADETRUE.
3. **Internal Payment Adapter Abstraction:**
   All payment operations flow through `lib/payments/` (`getPaymentAdapter()`). If Cashfree credentials are not supplied, the app gracefully falls back to `MockPaymentAdapter` for zero-friction local development and CI testing.

---

## 2. Cashfree Account & Eligibility Checklist (Owner Actions 🔑)

To use Cashfree in Sandbox and Production, the business owner must complete the following:

### Step A: Merchant Account Registration
- [ ] Sign up at [Cashfree Payments](https://www.cashfree.com/).
- [ ] Submit standard business KYC:
  - Business PAN card
  - Certificate of Incorporation / Business Registration / MSME (Udyam)
  - Authorized signatory Aadhaar and PAN
  - Cancelled cheque or bank statement showing business name, account number, and IFSC

### Step B: Easy Split (Marketplace) Activation
- [ ] Log in to the **Cashfree Merchant Dashboard**.
- [ ] Navigate to **Easy Split / Marketplace Settings**.
- [ ] Request activation of the **Easy Split** product (Multi-vendor payout capability).
- [ ] Note down the Vendor settlement cycle options (Instant, T+1, or T+2).

### Step C: Generate Sandbox API Keys
- [ ] In the Cashfree dashboard, switch the toggle to **Test / Sandbox Mode**.
- [ ] Navigate to **Developers → API Keys**.
- [ ] Generate your **App ID** (`x-client-id`) and **Secret Key** (`x-client-secret`).
- [ ] Set your **Webhook Secret** under **Developers → Webhooks**.

---

## 3. Environment Configuration (`.env.local`)

Place these variables in `.env.local` (never commit this file):

```bash
# ── Cashfree Payment Gateway + Easy Split (Phase 6) ───────────────────
CASHFREE_APP_ID="your_sandbox_app_id_here"
CASHFREE_SECRET_KEY="your_sandbox_secret_key_here"
CASHFREE_WEBHOOK_SECRET="your_sandbox_webhook_secret_here"
CASHFREE_ENV="sandbox" # "sandbox" | "production"
```

> **Security Note:** `CASHFREE_SECRET_KEY` and `CASHFREE_WEBHOOK_SECRET` are strictly server-only. They are never exported or passed to client-side bundles.

---

## 4. Webhook Endpoint Configuration

Configure the Cashfree Webhook endpoint in the Cashfree Merchant Dashboard:

- **Webhook URL:** `https://your-domain.com/api/webhooks/cashfree` (or ngrok/tunnel URL during local development)
- **Events to Subscribe:**
  - `PAYMENT_SUCCESS_WEBHOOK`
  - `PAYMENT_FAILED_WEBHOOK`
  - `PAYMENT_USER_DROPPED_WEBHOOK`
  - `REFUND_STATUS_WEBHOOK`
  - `SETTLEMENT_SUCCESS_WEBHOOK`
- **Signature Algorithm:** `HMAC-SHA256` (verified natively by `CashfreePaymentAdapter.verifyWebhook()`)

---

## 5. Test Payment Instruments (Sandbox Testing)

When testing checkout in the sandbox environment, use Cashfree's sandbox instruments:

### UPI Testing
- **Success VPA:** `success@upi`
- **Failure VPA:** `failure@upi`

### Test Cards (Credit / Debit)
| Card Type | Card Number | Expiry | CVV | OTP Simulation | Result |
|---|---|---|---|---|---|
| Visa (Success) | `4012 0010 3714 1112` | 12/28 | 123 | `123456` | ✅ Payment Success |
| Mastercard (Success) | `5123 4567 8901 2346` | 12/28 | 123 | `123456` | ✅ Payment Success |
| RuPay (Success) | `5085 0500 0000 0015` | 12/28 | 123 | `123456` | ✅ Payment Success |
| Card (Declined) | `4000 0000 0000 0002` | 12/28 | 123 | `123456` | ❌ Payment Failed |

---

## 6. Adapter Architecture & Code Flow

```
                      ┌────────────────────────────────────┐
                      │        getPaymentAdapter()         │
                      └─────────────────┬──────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
    [Credentials in .env.local]                   [No Credentials / Dev]
                 │                                             │
                 ▼                                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │    CashfreePaymentAdapter     │             │      MockPaymentAdapter       │
  │  - Cashfree PG v2023-08-01    │             │  - Deterministic simulations  │
  │  - Easy Split payouts         │             │  - Instant test passes        │
  │  - HMAC-SHA256 verification   │             │  - Zero network dependencies  │
  └───────────────────────────────┘             └───────────────────────────────┘
```

All methods adhere strictly to the `PaymentAdapter` contract:
- `createSplitOrder(input)`: Generates session and specifies vendor splits.
- `verifyPayment(gatewayOrderId)`: Queries order & payment status.
- `createRefund(input)`: Issues split or full refunds.
- `verifyWebhook(input)`: Verifies signatures and parses event envelopes.
- `getSettlements(filter)`: Pulls vendor settlement reports.

