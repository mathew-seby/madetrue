// MADETRUE — Phase 10 Step 2: Refund Policy & Automation Verification
//
// Verifies the pure refund policy engine (lib/utils/refundPolicy.ts)
// against the published Refund & Cancellation Policy:
// 1. Auto-approval window — a pending order cancels + refunds instantly
//    (online: full incl. delivery fee; COD: nothing collected)
// 2. Maker-review window — accepted orders need a human, with honest money
//    copy on both sides
// 3. Restricted + damage-claim windows — ready/delivered never self-serve
// 4. Terminal state — a cancelled order has nothing left to request
// 5. Partial-refund caps — prior completed refunds cap every suggestion
// 6. Money math — fee rule (delivery ₹49 / pickup ₹0) and online detection
// 7. Copy promises — timeline quote, damage-claim quote, maker templates
// 8. Admin presets — the modal's quick-set reasons match the policy
//
// Run: npx tsx scripts/verifyRefundPolicy.ts

import {
  resolveRefundPolicy,
  orderRefundTotal,
  isOnlinePaidOrder,
  REFUND_TIMELINE_COPY,
  DAMAGE_CLAIM_COPY,
  REFUND_REASON_PRESETS,
  type RefundPolicyOrderInput,
} from "../lib/utils/refundPolicy";
import {
  buildMakerCancellationAutoApprovedTemplate,
  buildMakerCancellationRequestTemplate,
  TEMPLATE_EVENTS,
} from "../lib/whatsapp/templates";

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
}

function order(partial: Partial<RefundPolicyOrderInput>): RefundPolicyOrderInput {
  return {
    status: "pending",
    payment_method: "upi",
    gateway: "cashfree",
    delivery_type: "delivery",
    price: 100,
    quantity: 2,
    delivery_fee: 49,
    ...partial,
  };
}

console.log("\n=======================================================");
console.log(" MADETRUE — Phase 10 Step 2: Refund Policy Audit");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Auto-approval window (pending)
// ---------------------------------------------------------------------------
console.log("Checking 1: Pending orders auto-approve and refund instantly...");

const pendingDelivery = resolveRefundPolicy(order({}));
assert(pendingDelivery.window === "auto_approved", `pending must be auto_approved, got "${pendingDelivery.window}"`);
assert(pendingDelivery.autoApprove === true, "pending must auto-approve");
assert(pendingDelivery.eligible === true, "pending must be buyer-eligible");
assert(
  pendingDelivery.suggestedAmount === 249,
  `pending online delivery refund must be price×qty + fee = 249, got ₹${pendingDelivery.suggestedAmount}`
);
assert(
  pendingDelivery.reason.includes("instantly") && pendingDelivery.reason.includes("249"),
  "the buyer reason must say 'instantly' and name the money"
);
assert(
  pendingDelivery.reason.includes("5–7 working days"),
  "the buyer reason must quote the published refund timeline"
);

const pendingPickup = resolveRefundPolicy(order({ delivery_type: "pickup", delivery_fee: 0 }));
assert(
  pendingPickup.suggestedAmount === 200,
  `pending pickup refund must be price×qty with no fee = 200, got ₹${pendingPickup.suggestedAmount}`
);

const pendingCod = resolveRefundPolicy(order({ payment_method: "cod", gateway: null }));
assert(pendingCod.autoApprove === true, "a pending COD order must still auto-approve");
assert(pendingCod.suggestedAmount === 0, "a pending COD refund must be ₹0 — nothing was collected");
assert(
  pendingCod.reason.includes("no payment was collected"),
  "the COD reason must say no payment was collected"
);

console.log("  ✅ Auto-approval verified: online full incl. fee, COD ₹0, pickup fee-free.");

// ---------------------------------------------------------------------------
// 2. Maker-review window (accepted)
// ---------------------------------------------------------------------------
console.log("Checking 2: Accepted orders go to maker review with honest money copy...");

const accepted = resolveRefundPolicy(order({ status: "accepted" }));
assert(accepted.window === "maker_review", `accepted must be maker_review, got "${accepted.window}"`);
assert(accepted.autoApprove === false, "accepted must NOT auto-approve");
assert(accepted.eligible === true, "accepted must still be buyer-eligible");
assert(accepted.suggestedAmount === 249, `accepted online suggestion must be 249, got ₹${accepted.suggestedAmount}`);
assert(
  accepted.makerNote.includes("249") && accepted.makerNote.includes("stock"),
  "the maker note must name the money and the stock return"
);
assert(
  accepted.makerNote.includes("Declining keeps the order live"),
  "the maker note must explain what declining does"
);

const acceptedCod = resolveRefundPolicy(order({ status: "accepted", payment_method: "cod", gateway: null }));
assert(acceptedCod.suggestedAmount === 0, "accepted COD suggestion must be ₹0");
assert(
  acceptedCod.makerNote.includes("no money moves"),
  "the COD maker note must say no money moves"
);

console.log("  ✅ Maker-review window verified with human decision + honest copy.");

// ---------------------------------------------------------------------------
// 3. Restricted + damage-claim windows
// ---------------------------------------------------------------------------
console.log("Checking 3: Ready and delivered orders never self-serve...");

const ready = resolveRefundPolicy(order({ status: "ready" }));
assert(ready.window === "restricted", `ready must be restricted, got "${ready.window}"`);
assert(ready.eligible === false && ready.autoApprove === false, "ready must be closed to self-service");
assert(
  ready.reason.includes("packed") && ready.reason.includes("support"),
  "the ready reason must explain the closure and point at support"
);

const delivered = resolveRefundPolicy(order({ status: "delivered" }));
assert(delivered.window === "damage_claim", `delivered must be damage_claim, got "${delivered.window}"`);
assert(delivered.eligible === false, "delivered must not self-serve");
assert(delivered.reason === DAMAGE_CLAIM_COPY, "delivered must quote the published damage-claim promise verbatim");
assert(
  delivered.reason.includes("24 hours") && delivered.reason.includes("WhatsApp"),
  "the damage-claim copy must carry the 24-hour WhatsApp flow"
);

console.log("  ✅ Restricted + damage-claim windows verified (perishables protected).");

// ---------------------------------------------------------------------------
// 4. Terminal state
// ---------------------------------------------------------------------------
console.log("Checking 4: Cancelled orders are terminal...");

const cancelled = resolveRefundPolicy(order({ status: "cancelled" }));
assert(cancelled.window === "none", `cancelled must be window "none", got "${cancelled.window}"`);
assert(cancelled.eligible === false && cancelled.autoApprove === false, "cancelled must be fully closed");
assert(cancelled.suggestedAmount === 0, "cancelled must suggest ₹0");

console.log("  ✅ Terminal state verified.");

// ---------------------------------------------------------------------------
// 5. Partial-refund caps
// ---------------------------------------------------------------------------
console.log("Checking 5: Prior refunds cap every suggestion (no over-refund)...");

const prior49 = resolveRefundPolicy(order({ status: "accepted" }), { priorRefunded: 49 });
assert(
  prior49.suggestedAmount === 200,
  `with ₹49 already refunded, the suggestion must drop to 200, got ₹${prior49.suggestedAmount}`
);

const priorFull = resolveRefundPolicy(order({ status: "accepted" }), { priorRefunded: 400 });
assert(
  priorFull.suggestedAmount === 0,
  `fully-refunded orders must suggest ₹0, got ₹${priorFull.suggestedAmount}`
);

const priorPartialOdd = resolveRefundPolicy(order({ status: "accepted" }), { priorRefunded: 100.5 });
assert(
  priorPartialOdd.suggestedAmount === 148.5,
  `fractional priors must compute exactly (249 − 100.5 = 148.5), got ₹${priorPartialOdd.suggestedAmount}`
);

const cappedAuto = resolveRefundPolicy(order({}), { priorRefunded: 200 });
assert(
  cappedAuto.autoApprove === true && cappedAuto.suggestedAmount === 49,
  `auto-window with ₹200 prior must still approve and refund the remaining ₹49, got ₹${cappedAuto.suggestedAmount}`
);

console.log("  ✅ Caps verified: ₹49 prior → 200, full prior → 0, fractional exact.");

// ---------------------------------------------------------------------------
// 6. Money math + online detection
// ---------------------------------------------------------------------------
console.log("Checking 6: orderRefundTotal and isOnlinePaidOrder rules...");

assert(orderRefundTotal(order({})) === 249, "delivery order total must include the ₹49 fee");
assert(orderRefundTotal(order({ delivery_type: "pickup", delivery_fee: 49 })) === 200, "pickup orders must never carry a fee even if a stray fee is stored");
assert(orderRefundTotal(order({ price: null, quantity: null, delivery_fee: null })) === 0, "missing numbers must degrade to ₹0, not NaN");
assert(isOnlinePaidOrder(order({})) === true, "upi counts as online");
assert(isOnlinePaidOrder(order({ payment_method: "cod", gateway: "cashfree" })) === true, "a gateway record makes it online even if method says cod");
assert(isOnlinePaidOrder(order({ payment_method: "cod", gateway: null })) === false, "pure COD is not online");

console.log("  ✅ Money math verified: fee rule, pickup guard, online detection.");

// ---------------------------------------------------------------------------
// 7. Copy promises + templates
// ---------------------------------------------------------------------------
console.log("Checking 7: Published copy and maker templates stay in lockstep...");

assert(
  REFUND_TIMELINE_COPY.includes("5–7 working days") && REFUND_TIMELINE_COPY.includes("Cashfree"),
  "the timeline copy must promise 5–7 working days via Cashfree"
);

const autoTemplate = buildMakerCancellationAutoApprovedTemplate("Amma's Pickles", "ord-1", "Mango pickle", "Change of plans");
assert(autoTemplate.includes("Amma's Pickles"), "the auto template must greet the store by name");
assert(autoTemplate.includes("#ord-1") && autoTemplate.includes("Mango pickle"), "the auto template must name the order and item");
assert(autoTemplate.includes("back in your stock"), "the auto template must say stock is restored");
assert(autoTemplate.includes("No action is needed"), "the auto template must tell the maker no action is needed");
assert(autoTemplate.includes("Change of plans"), "the auto template must carry the buyer's reason");

const requestTemplate = buildMakerCancellationRequestTemplate("Amma's Pickles", "ord-2", "Banana chips");
assert(
  requestTemplate.includes("review and approve or decline"),
  "the request template must ask the maker to review"
);

assert(TEMPLATE_EVENTS.length > 0, "the template family must still export its event list");

console.log("  ✅ Copy promises verified: timeline, damage claim, maker templates.");

// ---------------------------------------------------------------------------
// 8. Admin presets
// ---------------------------------------------------------------------------
console.log("Checking 8: Admin refund modal quick-sets match the policy...");

assert(REFUND_REASON_PRESETS.length === 4, `there must be exactly 4 presets, got ${REFUND_REASON_PRESETS.length}`);
assert(
  REFUND_REASON_PRESETS.some((p) => p.label.includes("24-hour")),
  "the presets must include the 24-hour damage preset"
);
assert(
  REFUND_REASON_PRESETS.every((p) => p.value.trim().length > 0 && p.label.trim().length > 0),
  "every preset must carry a label and a value"
);

console.log("  ✅ Presets verified.");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(" ✅ 8/8 refund policy checks passed — windows and money");
console.log("    match the published policy exactly.");
console.log("=======================================================\n");
