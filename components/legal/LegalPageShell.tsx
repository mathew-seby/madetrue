import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, Phone, MapPin, ExternalLink } from "lucide-react";
import { COMPANY_DETAILS } from "@/lib/utils/constants";

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  activePath: "/terms" | "/privacy" | "/refund-policy" | "/shipping-policy" | "/contact";
  children: React.ReactNode;
}

const POLICY_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellations" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/contact", label: "Contact Us" },
] as const;

export default function LegalPageShell({
  title,
  subtitle,
  lastUpdated,
  activePath,
  children,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-warm-brown hover:text-primary-green transition font-sans"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Marketplace
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-green/10 text-primary-green text-[11px] font-bold uppercase tracking-wider font-sans">
            <ShieldCheck className="h-3.5 w-3.5" />
            Official Legal Policy
          </div>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-warm-brown/10 shadow-sm space-y-4">
          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-text-dark tracking-tight">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-text-dark/70 font-sans leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-text-dark/60 font-sans border-t border-warm-brown/10">
            <span>
              <strong>Entity:</strong> {COMPANY_DETAILS.legalName}
            </span>
            <span>•</span>
            <span>
              <strong>Last Updated:</strong> {lastUpdated}
            </span>
            <span>•</span>
            <span>
              <strong>Jurisdiction:</strong> {COMPANY_DETAILS.city}, {COMPANY_DETAILS.state}
            </span>
          </div>

          {/* Quick Nav Pills */}
          <div className="pt-4 border-t border-warm-brown/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-brown mb-2 font-sans">
              Browse Policies & Trust
            </p>
            <div className="flex flex-wrap gap-2">
              {POLICY_LINKS.map((link) => {
                const isActive = link.href === activePath;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition font-sans ${
                      isActive
                        ? "bg-primary-green text-cream-bg shadow-sm"
                        : "bg-[#FAF7F2] text-text-dark/80 hover:bg-warm-brown/10 border border-warm-brown/15"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Policy Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-warm-brown/10 shadow-sm prose prose-stone max-w-none text-text-dark font-sans leading-relaxed space-y-8">
          {children}
        </div>

        {/* Contact / Help Card */}
        <div className="bg-gradient-to-br from-primary-green/5 via-[#FAF7F2] to-warm-brown/10 rounded-3xl p-6 sm:p-8 border border-primary-green/20 space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-primary-green">
              Need Help or Have Questions?
            </h3>
            <p className="text-xs sm:text-sm text-text-dark/70 font-sans leading-relaxed">
              We are a Kerala-first community platform. If you have any inquiries regarding this policy,
              an active order, or maker settlements, reach out to our team directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-sans">
            <a
              href={COMPANY_DETAILS.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white rounded-2xl border border-warm-brown/15 flex items-center gap-2.5 hover:border-primary-green hover:shadow-xs transition"
            >
              <div className="p-2 rounded-xl bg-primary-green/10 text-primary-green shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-text-dark">WhatsApp Support</span>
                <span className="block text-[11px] text-text-dark/60 truncate">{COMPANY_DETAILS.whatsappNumber}</span>
              </div>
            </a>

            <a
              href={`mailto:${COMPANY_DETAILS.email}`}
              className="p-3 bg-white rounded-2xl border border-warm-brown/15 flex items-center gap-2.5 hover:border-primary-green hover:shadow-xs transition"
            >
              <div className="p-2 rounded-xl bg-warm-brown/10 text-warm-brown shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-text-dark">Official Email</span>
                <span className="block text-[11px] text-text-dark/60 truncate">{COMPANY_DETAILS.email}</span>
              </div>
            </a>

            <div className="p-3 bg-white rounded-2xl border border-warm-brown/15 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-accent-gold/15 text-warm-brown shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-text-dark">Registered Office</span>
                <span className="block text-[11px] text-text-dark/60 truncate">{COMPANY_DETAILS.address}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center sm:text-right">
            <Link
              href="/contact"
              className="inline-flex items-center text-xs font-bold text-primary-green hover:underline gap-1 font-sans"
            >
              Visit Full Contact & Grievance Page
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

