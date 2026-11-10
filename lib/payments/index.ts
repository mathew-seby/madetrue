/**
 * MADETRUE — Unified Payment Gateway Entrypoint (Phase 6 Step 1)
 *
 * Exposes the universal payment adapter interface and adapter factory.
 * Resolves to Cashfree Easy Split when sandbox/live credentials exist in
 * the server environment, or deterministically falls back to the Mock adapter.
 */

import { cashfreePaymentAdapter } from "./cashfree";
import { mockPaymentAdapter } from "./mock";
import type { PaymentAdapter } from "./types";

export * from "./types";
export { CashfreePaymentAdapter, cashfreePaymentAdapter } from "./cashfree";
export { MockPaymentAdapter, mockPaymentAdapter } from "./mock";

/**
 * Returns the active payment adapter.
 *
 * If CASHFREE_APP_ID and CASHFREE_SECRET_KEY are set in the environment,
 * returns CashfreePaymentAdapter. Otherwise, returns MockPaymentAdapter.
 */
export function getPaymentAdapter(): PaymentAdapter {
  if (cashfreePaymentAdapter.isConfigured()) {
    return cashfreePaymentAdapter;
  }

  return mockPaymentAdapter;
}
