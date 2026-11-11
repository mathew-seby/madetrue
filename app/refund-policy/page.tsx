import React from "react";
import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { COMPANY_DETAILS, DELIVERY_FEE } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | MADETRUE",
  description:
    "Refund and Cancellation Policy for MADETRUE: Clear, fair, and transparent guidelines for Kerala buyers and local makers.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell
      title="Refund & Cancellation Policy"
      subtitle="Honest, clear, and fair guidelines protecting both buyers and local Kerala producers."
      lastUpdated="November 10, 2026"
      activePath="/refund-policy"
    >
      {/* 1. Philosophy */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          1. Our Hyperlocal Philosophy
        </h2>
        <p className="text-sm text-text-dark/80">
          MADETRUE connects you directly with Kerala&apos;s small-scale spice farmers, home kitchens, and artisanal creators.
          Many of the products on our platform are freshly harvested, baked to order, or hand-crafted in small batches.
          Our cancellation and refund policies are crafted to protect your rights as a consumer while ensuring our
          hardworking local makers are treated with dignity and fairness.
        </p>
      </section>

      {/* 2. Order Cancellation Lifecycle */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          2. Order Cancellation Window
        </h2>
        <p className="text-sm text-text-dark/80">
          You can request an order cancellation directly from your{" "}
          <a href="/orders" className="text-primary-green underline font-semibold">
            My Orders
          </a>{" "}
          page based on the live progress of your order:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-primary-green/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-primary-green">
                Eligible for Cancellation
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-green text-cream-bg">
                Permitted
              </span>
            </div>
            <p className="text-xs text-text-dark/80">
              <strong>Order Placed (Pending) or Accepted:</strong> Before the maker starts specialized packaging or fresh cooking.
              You can submit a cancellation request with one click from the My Orders page.
            </p>
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-warm-brown">
                Not Eligible for Cancellation
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warm-brown text-cream-bg">
                Restricted
              </span>
            </div>
            <p className="text-xs text-text-dark/80">
              <strong>Ready for Delivery / Dispatched / Delivered:</strong> Once an order is prepared, packed, or out with the delivery partner, cancellations cannot be accepted to prevent perishable food waste.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Refund Timelines & Methods */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          3. Refund Processing & Timelines
        </h2>
        <p className="text-sm text-text-dark/80">
          When an eligible cancellation is approved or a refund is authorized, your money is returned transparently:
        </p>

        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-2 pl-2">
          <li>
            <strong>Online Prepaid Orders (UPI, Credit/Debit Card, Net Banking):</strong> Refunds are initiated automatically through our authorized payment gateway (Cashfree Payments). Funds are credited directly back to your original payment source within <strong>5 to 7 working days</strong>, depending on your bank or UPI app.
          </li>
          <li>
            <strong>Cash on Delivery (COD) Orders:</strong> If an order is cancelled prior to dispatch, no payment was collected, and no monetary refund is necessary.
          </li>
          <li>
            <strong>Delivery Fee Refund:</strong> If a delivery order is cancelled before dispatch, the ₹{DELIVERY_FEE} delivery fee is refunded in full alongside the product cost.
          </li>
        </ul>
      </section>

      {/* 4. Damaged, Defective or Incorrect Items */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          4. Damaged, Defective, or Incorrect Deliveries
        </h2>
        <p className="text-sm text-text-dark/80">
          We take immense pride in the quality of every item sent by our makers. However, in the rare event that:
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1 pl-2">
          <li>The product packaging is damaged or tampered with in transit;</li>
          <li>The delivered item is incorrect or missing from your basket;</li>
          <li>A perishable food item arrives spoiled or unfit for consumption;</li>
        </ul>
        <p className="text-sm text-text-dark/80">
          Please notify our team within <strong>24 hours of delivery</strong> by sending a clear photo of the item and your Order ID
          via WhatsApp to <strong>{COMPANY_DETAILS.phone}</strong> or email to <strong>{COMPANY_DETAILS.email}</strong>.
          We will arrange a swift replacement from the maker or issue a 100% refund without hassle.
        </p>
      </section>

      {/* 5. Non-Refundable Items & Conditions */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          5. Situations Where Refunds Do Not Apply
        </h2>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1.5 pl-2">
          <li>Delays resulting from an incorrect delivery address or unreachable phone number provided by the buyer.</li>
          <li>Refusal to accept the delivery without a valid defect or tamper reason.</li>
          <li>Products that have been consumed, opened (where hygiene seals are broken), or damaged due to improper post-delivery storage (e.g., failure to refrigerate fresh items).</li>
        </ul>
      </section>

      {/* 6. How to Reach Support */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          6. Need Help with a Refund?
        </h2>
        <p className="text-sm text-text-dark/80">
          Every order on MADETRUE features a direct click-to-chat WhatsApp link to the maker and our support desk.
          If you have any questions or require an update on a pending refund, we are here to assist:
        </p>
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/15 text-xs text-text-dark/80 space-y-1 font-sans">
          <p><strong>Customer Support Desk:</strong> {COMPANY_DETAILS.legalName}</p>
          <p><strong>WhatsApp Support:</strong> {COMPANY_DETAILS.phone}</p>
          <p><strong>Email:</strong> {COMPANY_DETAILS.email}</p>
          <p><strong>Operating Hours:</strong> {COMPANY_DETAILS.operatingHours}</p>
        </div>
      </section>
    </LegalPageShell>
  );
}

