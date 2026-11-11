import React from "react";
import type { Metadata } from "next";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { COMPANY_DETAILS } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Privacy Policy | MADETRUE",
  description:
    "Privacy Policy for MADETRUE: How we collect, use, and protect your personal data with transparency, privacy, and honesty.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      subtitle="How we respect and protect your personal information on our hyperlocal marketplace."
      lastUpdated="November 10, 2026"
      activePath="/privacy"
    >
      {/* 1. Introduction & Trust Commitment */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          1. Our Commitment to Privacy
        </h2>
        <p className="text-sm text-text-dark/80">
          At <strong>{COMPANY_DETAILS.legalName}</strong> (&quot;MADETRUE&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
          we treat your personal data with the same authenticity, respect, and care that our makers pour into their craft.
          This Privacy Policy explains what information we collect, why we collect it, how it is safeguarded,
          and how you can exercise your privacy rights under Indian law, including the Digital Personal Data Protection (DPDP) Act.
        </p>
      </section>

      {/* 2. Information We Collect */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          2. Information We Collect
        </h2>
        <p className="text-sm text-text-dark/80">
          We practice data minimization: we only request the information required to connect you with local makers and fulfill your orders.
        </p>

        <div className="space-y-3 pt-1">
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/10 space-y-1.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-warm-brown">
              A. Information You Provide Directly
            </h4>
            <ul className="list-disc list-inside text-xs sm:text-sm text-text-dark/80 space-y-1 pl-1">
              <li>
                <strong>Contact Information:</strong> Full name, phone number, and email address when you sign in or place an order.
              </li>
              <li>
                <strong>Delivery Address:</strong> Physical address in Kerala used by delivery partners to bring items to your doorstep.
              </li>
              <li>
                <strong>Maker Onboarding (KYC):</strong> If you register as a seller, we collect business name, workshop address, contact WhatsApp number, and required payout KYC (PAN, Bank Account Number, and IFSC code) exclusively for direct split settlements.
              </li>
            </ul>
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/10 space-y-1.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-warm-brown">
              B. Honest Geolocation Data
            </h4>
            <p className="text-xs sm:text-sm text-text-dark/80">
              When you permit location access on our website, we access your device&apos;s coordinates solely to calculate
              approximate distances (in kilometers) to nearby makers. If you decline location access, we respect that refusal:
              distances remain hidden and no artificial default location is tracked. We never track your location in the background.
            </p>
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/10 space-y-1.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-warm-brown">
              C. Transaction & Order Information
            </h4>
            <p className="text-xs sm:text-sm text-text-dark/80">
              Order line items, quantities, chosen fulfillment method (doorstep delivery or maker pickup), order notes,
              and gateway transaction references.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How We Use Your Data */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          3. How We Use Your Information
        </h2>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-2 pl-2">
          <li>
            <strong>Order Fulfillment:</strong> To notify makers of incoming orders, prepare your basket, and dispatch items to your address.
          </li>
          <li>
            <strong>Transparent Communication:</strong> To dispatch order status notifications (Order Placed, Maker Preparing, Ready for Delivery, Delivered, or Cancelled) via WhatsApp or SMS.
          </li>
          <li>
            <strong>Maker Payouts:</strong> To settle maker earnings directly into their verified bank accounts via authorized payment gateway split-transfer channels.
          </li>
          <li>
            <strong>Platform Security:</strong> To detect, investigate, and prevent fraudulent transactions or policy violations.
          </li>
          <li>
            <strong>Zero Ad Tracking:</strong> We do NOT sell, rent, or trade your personal data to third-party advertisers or data brokers.
          </li>
        </ul>
      </section>

      {/* 4. Payment Security & Third-Party Processing */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          4. Payment Processing & Data Security
        </h2>
        <p className="text-sm text-text-dark/80">
          When you make an online payment via UPI, debit/credit cards, or net banking, your financial credentials are encrypted
          and transmitted directly to our Reserve Bank of India (RBI) authorized payment gateway partner (Cashfree Payments).
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1 pl-2">
          <li>MADETRUE servers never see, collect, or store your debit/credit card numbers or UPI PINs.</li>
          <li>Maker KYC details are stored in isolated, access-restricted database tables, accessible only to authenticated administrators and automated payout split engines.</li>
        </ul>
      </section>

      {/* 5. Communication Preferences & WhatsApp */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          5. WhatsApp & Operational Messages
        </h2>
        <p className="text-sm text-text-dark/80">
          We use WhatsApp strictly for transactional order messages and essential customer support interactions.
          We do not spam promotional broadcasts. If you prefer not to receive WhatsApp updates, you can check your live order status
          anytime directly at{" "}
          <a href="/orders" className="text-primary-green underline font-semibold">
            My Orders
          </a>{" "}
          or reach out to our support team.
        </p>
      </section>

      {/* 6. Cookies & Local Storage */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          6. Cookies & Browser Storage
        </h2>
        <p className="text-sm text-text-dark/80">
          We use essential cookies and browser storage (such as localStorage) solely to:
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1 pl-2">
          <li>Remember items in your shopping basket as you browse different maker stores.</li>
          <li>Keep you safely signed into your session so you don&apos;t have to re-enter your password on every page.</li>
        </ul>
        <p className="text-sm text-text-dark/80">
          We do not use invasive third-party cross-site tracking cookies.
        </p>
      </section>

      {/* 7. Data Retention & Your Rights */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          7. Your Rights & Data Retention
        </h2>
        <p className="text-sm text-text-dark/80">
          You have full ownership and control over your personal information:
        </p>
        <ul className="list-disc list-inside text-sm text-text-dark/80 space-y-1 pl-2">
          <li>
            <strong>Review & Update:</strong> You can edit your profile details, delivery addresses, and phone number anytime in your{" "}
            <a href="/profile/settings" className="text-primary-green underline font-semibold">
              Profile Settings
            </a>
            .
          </li>
          <li>
            <strong>Data Deletion Request:</strong> You may request the deletion of your account and personal details by contacting our Grievance Desk, subject to statutory retention requirements for financial and tax records under Indian law.
          </li>
        </ul>
      </section>

      {/* 8. Grievance Redressal & Contact */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark border-b border-warm-brown/10 pb-2">
          8. Grievance Officer & Contact
        </h2>
        <p className="text-sm text-text-dark/80">
          If you have any questions or concerns regarding this Privacy Policy or how your personal data is handled,
          please contact our Grievance Officer:
        </p>
        <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/15 text-xs text-text-dark/80 space-y-1 font-sans">
          <p><strong>Entity:</strong> {COMPANY_DETAILS.legalName}</p>
          <p><strong>Attention:</strong> Privacy & Data Protection Desk</p>
          <p><strong>Address:</strong> {COMPANY_DETAILS.address}</p>
          <p><strong>Email:</strong> {COMPANY_DETAILS.email}</p>
          <p><strong>Phone:</strong> {COMPANY_DETAILS.phone}</p>
        </div>
      </section>
    </LegalPageShell>
  );
}

