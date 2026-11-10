import React from "react";
import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { COMPANY_DETAILS, DELIVERY_FEE } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Terms and Conditions | MADETRUE",
  description:
    "Terms and Conditions governing the use of MADETRUE, a hyperlocal marketplace connecting Kerala's local producers with nearby consumers.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      subtitle="The principles, rights, and responsibilities governing our community marketplace."
      lastUpdated="November 10, 2026"
      activePath="/terms"
    >
      {/* 1. Introduction & Acceptance */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          1. Welcome to MADETRUE
        </h2>
        <p className="text-sm text-text-dark/80">
          These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you
          (as a buyer, maker, or visitor) and <strong>{COMPANY_DETAILS.legalName}</strong> (&quot;MADETRUE&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
          having its registered office at {COMPANY_DETAILS.address}.
        </p>
        <p className="text-sm text-text-dark/80">
          MADETRUE operates a curated hyperlocal e-commerce platform that connects local producers
          (farmers, artisans, traditional home businesses, and culinary makers in Kerala) directly with nearby consumers.
          By accessing or using our website, mobile application, or any associated services, you acknowledge that
          you have read, understood, and agree to be bound by these Terms. If you do not agree, please do not use our services.
        </p>
      </section>

      {/* 2. Platform Role & Marketplace Model */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          2. Platform Role & Intermediary Status
        </h2>
        <p className="text-sm text-text-dark/80">
          MADETRUE functions as a hyperlocal marketplace intermediary under the Indian Information Technology Act, 2000.
          We provide the technology platform to enable registered independent makers (&quot;Sellers&quot;) to showcase
          their crafts and products to buyers (&quot;Buyers&quot;).
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1.5 pl-2">
          <li>
            <strong>Direct Maker Sale:</strong> The contract of sale for any product is strictly between the independent Seller and the Buyer.
          </li>
          <li>
            <strong>Hyperlocal Focus:</strong> Products are harvested, prepared, or handcrafted locally within Kerala (currently serving the Ernakulam district).
          </li>
          <li>
            <strong>Authenticity & Trust:</strong> Every maker undergoes onboarding review and identity verification before their store is published.
          </li>
        </ul>
      </section>

      {/* 3. Account Registration & User Conduct */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          3. Account Registration & Security
        </h2>
        <p className="text-sm text-text-dark/80">
          Public browsing of maker stores and catalogs is open to everyone without requiring an account.
          However, to finalize an order, manage order tracking, or register as a maker, you must provide valid credentials
          (phone number or email).
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1.5 pl-2">
          <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You agree to provide true, accurate, current, and complete information during registration and checkout.</li>
          <li>Accounts engaging in fraudulent transactions, abusive communications, or unauthorized scraping will be terminated immediately.</li>
        </ul>
      </section>

      {/* 4. Maker Onboarding, Verification & Settlements */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          4. Maker (Seller) Terms & Payouts
        </h2>
        <p className="text-sm text-text-dark/80">
          Producers who join MADETRUE (&quot;Makers&quot;) agree to the following standards:
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1.5 pl-2">
          <li>
            <strong>KYC & Payout Details:</strong> Makers must submit valid Know Your Customer (KYC) documentation (including PAN and bank account verification) for split settlements through our authorized payment partner.
          </li>
          <li>
            <strong>Product Freshness & Honesty:</strong> Makers warrant that listed goods (e.g., spices, prepared food, baked goods) comply with all applicable local health, safety, and Food Safety and Standards Authority of India (FSSAI) standards where applicable.
          </li>
          <li>
            <strong>Split Settlement & Commission:</strong> Online payments are split at source. The maker receives their agreed base price directly to their verified bank account, and MADETRUE retains the agreed platform facilitation fee (10% platform commission).
          </li>
        </ul>
      </section>

      {/* 5. Pricing, Delivery & Fulfilment */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          5. Pricing, Delivery & Fees
        </h2>
        <p className="text-sm text-text-dark/80">
          All product prices are displayed in Indian Rupees (INR) and are set by the individual makers.
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1.5 pl-2">
          <li>
            <strong>Delivery Fee:</strong> A flat delivery fee of ₹{DELIVERY_FEE} is charged per basket for doorstep delivery within our active service area (Ernakulam district).
          </li>
          <li>
            <strong>Maker Self-Pickup:</strong> When purchasing items from a single maker, buyers may choose self-pickup from the maker&apos;s workshop or farm at no extra cost (₹0 delivery fee).
          </li>
          <li>
            <strong>No Hidden Charges:</strong> What you see at checkout is the final total. There are no surprise processing fees.
          </li>
        </ul>
      </section>

      {/* 6. Payments & Gateway Terms */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          6. Payment Methods & Security
        </h2>
        <p className="text-sm text-text-dark/80">
          MADETRUE supports both Cash on Delivery (COD) and secure digital online payments (UPI, Credit/Debit Cards, Net Banking)
          facilitated through Reserve Bank of India (RBI) authorized payment aggregators (e.g., Cashfree Payments).
        </p>
        <p className="text-sm text-text-dark/80">
          Payment processing occurs securely on the gateway&apos;s PCI-DSS compliant infrastructure.
          MADETRUE does not store your card numbers, CVVs, or UPI PINs on our servers.
        </p>
      </section>

      {/* 7. Cancellations, Refunds & Returns */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          7. Cancellations & Refunds
        </h2>
        <p className="text-sm text-text-dark/80">
          Our cancellation and refund lifecycle is designed to be fair to both buyers and hardworking local producers.
          Buyers may request order cancellations through their account while an order is in <em>pending</em> or <em>accepted</em> status.
          Once prepared or marked ready for delivery, cancellations are restricted to prevent food and perishable waste.
        </p>
        <p className="text-sm text-text-dark/80">
          Approved refunds for online payments are credited back to the original payment method within 5 to 7 business days.
          For complete specifics, please review our comprehensive{" "}
          <a href="/refund-policy" className="text-primary-green underline font-semibold">
            Refund & Cancellation Policy
          </a>
          .
        </p>
      </section>

      {/* 8. Intellectual Property & Stories */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          8. Intellectual Property & Maker Content
        </h2>
        <p className="text-sm text-text-dark/80">
          All brand assets, software code, graphic design, and platform trademarks belong to {COMPANY_DETAILS.legalName}.
          Maker stories, photos, and cultural craft representations are published with permission from the respective makers
          to celebrate their work and heritage. Users may not copy, scrape, or commercially exploit platform media without written consent.
        </p>
      </section>

      {/* 9. Limitation of Liability */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          9. Limitation of Liability
        </h2>
        <p className="text-sm text-text-dark/80">
          To the maximum extent permitted by Indian law, MADETRUE shall not be liable for any indirect, incidental,
          or consequential damages arising out of the use or inability to use the platform, or any defects in products sold
          by independent sellers. Our aggregate liability in connection with any transaction shall not exceed the amount paid
          for the specific order in question.
        </p>
      </section>

      {/* 10. Governing Law & Dispute Resolution */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          10. Governing Law & Jurisdiction
        </h2>
        <p className="text-sm text-text-dark/80">
          These Terms are governed by and construed in accordance with the laws of the Republic of India.
          Any dispute, controversy, or claim arising under these Terms shall be subject to the exclusive jurisdiction
          of the competent courts situated in <strong>Kochi, Kerala, India</strong>.
        </p>
      </section>

      {/* 11. Grievance Redressal */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          11. Grievance Officer & Contact
        </h2>
        <p className="text-sm text-text-dark/80">
          In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020,
          the details of the designated Grievance Officer are provided below:
        </p>
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/15 text-xs text-text-dark/80 space-y-1 font-sans">
          <p><strong>Entity:</strong> {COMPANY_DETAILS.legalName}</p>
          <p><strong>Grievance Officer:</strong> Customer Support Desk</p>
          <p><strong>Address:</strong> {COMPANY_DETAILS.address}</p>
          <p><strong>Email:</strong> {COMPANY_DETAILS.email}</p>
          <p><strong>Phone / WhatsApp:</strong> {COMPANY_DETAILS.phone}</p>
          <p><strong>Operating Hours:</strong> {COMPANY_DETAILS.operatingHours}</p>
        </div>
      </section>
    </LegalPageShell>
  );
}

