import React from "react";
import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { COMPANY_DETAILS, DELIVERY_FEE } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | MADETRUE",
  description:
    "Shipping and Delivery Policy for MADETRUE: Hyperlocal fulfillment, flat delivery fee, and free maker self-pickup across Kerala.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalPageShell
      title="Shipping & Delivery Policy"
      subtitle="Connecting you to local Kerala makers through transparent doorstep delivery and maker self-pickup."
      lastUpdated="November 10, 2026"
      activePath="/shipping-policy"
    >
      {/* 1. Hyperlocal Model */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          1. Our Hyperlocal Delivery Model
        </h2>
        <p className="text-sm text-text-dark/80">
          MADETRUE operates differently from conventional, cross-country e-commerce marketplaces.
          We connect consumers directly with local producers in Kerala. Because items travel directly
          from farm or workshop to your home, products remain fresh, food miles remain minimal,
          and community relationships stay strong.
        </p>
      </section>

      {/* 2. Service Area & Delivery Radius */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          2. Operational Coverage
        </h2>
        <p className="text-sm text-text-dark/80">
          Our active fulfillment network currently serves <strong>Ernakulam district, Kerala</strong>, including:
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1 pl-2">
          <li>Central Kochi, Fort Kochi, and Mattancherry</li>
          <li>Kakkanad (Infopark region) and Edappally</li>
          <li>Aluva, Angamaly, and Kalamassery</li>
          <li>Tripunithura, Maradu, and surrounding panchayats</li>
        </ul>
        <p className="text-sm text-text-dark/80">
          Our checkout system verifies delivery coordinates to ensure your destination falls within our delivery boundary.
          We are actively working to expand to neighboring districts across Kerala.
        </p>
      </section>

      {/* 3. Fulfillment Options & Fees */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          3. Fulfillment Options & Pricing
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Option A */}
          <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/15 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-dark">Doorstep Delivery</h3>
              <span className="text-xs font-bold text-primary-green bg-primary-green/10 px-2.5 py-1 rounded-full font-sans">
                ₹{DELIVERY_FEE} Flat Fee
              </span>
            </div>
            <p className="text-xs text-text-dark/80 leading-relaxed">
              Items are picked up directly from the producer and dispatched to your specified address.
              The ₹{DELIVERY_FEE} fee applies once per basket, regardless of the number of items ordered.
            </p>
            <div className="pt-2 text-[11px] text-text-dark/60 font-sans border-t border-warm-brown/10">
              <strong>Estimated Timeframe:</strong> Same-day or 24 to 48 hours depending on product preparation time.
            </div>
          </div>

          {/* Option B */}
          <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/15 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-text-dark">Maker Self-Pickup</h3>
              <span className="text-xs font-bold text-warm-brown bg-warm-brown/10 px-2.5 py-1 rounded-full font-sans">
                Free (₹0 Fee)
              </span>
            </div>
            <p className="text-xs text-text-dark/80 leading-relaxed">
              Available when your shopping basket contains products from a single maker. You can visit the maker&apos;s
              store, home, or farm in person to collect your order, meet the creator, and avoid delivery fees.
            </p>
            <div className="pt-2 text-[11px] text-text-dark/60 font-sans border-t border-warm-brown/10">
              <strong>Pickup Address:</strong> Full maker address and Google Maps coordinates are shown at checkout and on your order receipt.
            </div>
          </div>
        </div>
      </section>

      {/* 4. Order Tracking & Lifecycle */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          4. Live Order Tracking
        </h2>
        <p className="text-sm text-text-dark/80">
          Every order on MADETRUE follows our transparent 5-stage lifecycle:
        </p>
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/10 text-xs sm:text-sm text-text-dark/80 space-y-2 font-sans">
          <p>
            <strong className="text-text-dark">1. Order Placed (Pending):</strong> Your order is recorded in the maker&apos;s dashboard.
          </p>
          <p>
            <strong className="text-text-dark">2. Accepted:</strong> The maker confirms availability and begins preparation or packing.
          </p>
          <p>
            <strong className="text-text-dark">3. Ready:</strong> The basket is ready for courier dispatch or customer pickup.
          </p>
          <p>
            <strong className="text-text-dark">4. Delivered / Picked Up:</strong> The order has safely reached your hands.
          </p>
        </div>
        <p className="text-sm text-text-dark/80">
          You can track this progress in real time via{" "}
          <a href="/orders" className="text-primary-green underline font-semibold">
            My Orders
          </a>{" "}
          or through transactional updates sent to your registered WhatsApp number.
        </p>
      </section>

      {/* 5. Weather & Monsoon Considerations */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          5. Weather & Local Conditions
        </h2>
        <p className="text-sm text-text-dark/80">
          During intense Kerala monsoon spells, local water-logging, or regional road restrictions, deliveries may
          experience minor delays. In such events, our makers and support team will proactively communicate with you via WhatsApp
          to keep you updated.
        </p>
      </section>

      {/* 6. Questions Regarding Delivery */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          6. Delivery Assistance & Queries
        </h2>
        <p className="text-sm text-text-dark/80">
          Need special delivery instructions or want to verify whether your specific pincode is reachable? Contact us:
        </p>
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/15 text-xs text-text-dark/80 space-y-1 font-sans">
          <p><strong>Entity:</strong> {COMPANY_DETAILS.legalName}</p>
          <p><strong>Delivery Desk:</strong> {COMPANY_DETAILS.address}</p>
          <p><strong>WhatsApp Support:</strong> {COMPANY_DETAILS.phone}</p>
          <p><strong>Email:</strong> {COMPANY_DETAILS.email}</p>
          <p><strong>Support Hours:</strong> {COMPANY_DETAILS.operatingHours}</p>
        </div>
      </section>
    </LegalPageShell>
  );
}

