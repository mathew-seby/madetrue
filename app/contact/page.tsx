"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Send,
  CheckCircle2,
  ArrowLeft,
  Building2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { COMPANY_DETAILS } from "@/lib/utils/constants";

const POLICY_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund & Cancellations" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/contact", label: "Contact Us" },
] as const;

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("order");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCategory("order");
    setMessage("");
    setSubmitted(false);
  };

  const whatsappInquiryUrl = `https://wa.me/918876789131?text=${encodeURIComponent(
    `Hello MADETRUE Team! My name is ${name || "a customer"}. I am inquiring regarding ${category}: ${message || "Hello!"}`
  )}`;

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-warm-brown hover:text-primary-green transition font-sans"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Marketplace
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-green/10 text-primary-green text-[11px] font-bold uppercase tracking-wider font-sans">
            <Building2 className="h-3.5 w-3.5" />
            Kerala Support Desk
          </div>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-warm-brown/10 shadow-sm space-y-4">
          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-text-dark tracking-tight">
              Get in Touch with MADETRUE
            </h1>
            <p className="text-sm sm:text-base text-text-dark/70 font-sans leading-relaxed">
              We are rooted right here in Kochi, Kerala. Whether you have questions regarding an order,
              need help with a maker settlement, or want to suggest a local producer, we are just a message away.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-text-dark/60 font-sans border-t border-warm-brown/10">
            <span>
              <strong>Entity:</strong> {COMPANY_DETAILS.legalName}
            </span>
            <span>•</span>
            <span>
              <strong>Location:</strong> {COMPANY_DETAILS.city}, {COMPANY_DETAILS.state}
            </span>
            <span>•</span>
            <span>
              <strong>PIN:</strong> {COMPANY_DETAILS.pinCode}
            </span>
          </div>

          {/* Quick Nav Pills */}
          <div className="pt-4 border-t border-warm-brown/5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warm-brown mb-2 font-sans">
              Browse Policies & Trust
            </p>
            <div className="flex flex-wrap gap-2">
              {POLICY_LINKS.map((link) => {
                const isActive = link.href === "/contact";
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

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Channel 1: WhatsApp */}
          <a
            href={COMPANY_DETAILS.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 bg-white rounded-2xl border border-warm-brown/15 hover:border-primary-green hover:shadow-xs transition space-y-2 group block"
          >
            <div className="p-2.5 rounded-xl bg-primary-green/10 text-primary-green w-fit group-hover:scale-105 transition">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-text-dark font-serif">WhatsApp Support</h3>
            <p className="text-xs text-text-dark/60 font-sans leading-relaxed">
              Fastest response for order questions & live updates.
            </p>
            <span className="block text-xs font-bold text-primary-green font-sans pt-1">
              {COMPANY_DETAILS.whatsappNumber}
            </span>
          </a>

          {/* Channel 2: Email */}
          <a
            href={`mailto:${COMPANY_DETAILS.email}`}
            className="p-5 bg-white rounded-2xl border border-warm-brown/15 hover:border-primary-green hover:shadow-xs transition space-y-2 group block"
          >
            <div className="p-2.5 rounded-xl bg-warm-brown/10 text-warm-brown w-fit group-hover:scale-105 transition">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-text-dark font-serif">Official Email</h3>
            <p className="text-xs text-text-dark/60 font-sans leading-relaxed">
              For business inquiries, maker KYC, or grievances.
            </p>
            <span className="block text-xs font-bold text-warm-brown font-sans pt-1 truncate">
              {COMPANY_DETAILS.email}
            </span>
          </a>

          {/* Channel 3: Registered Office */}
          <div className="p-5 bg-white rounded-2xl border border-warm-brown/15 space-y-2">
            <div className="p-2.5 rounded-xl bg-accent-gold/15 text-warm-brown w-fit">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-text-dark font-serif">Registered Office</h3>
            <p className="text-xs text-text-dark/60 font-sans leading-relaxed">
              {COMPANY_DETAILS.address}
            </p>
            <span className="block text-[11px] font-semibold text-text-dark/70 font-sans pt-1">
              Ernakulam, Kerala
            </span>
          </div>

          {/* Channel 4: Support Hours */}
          <div className="p-5 bg-white rounded-2xl border border-warm-brown/15 space-y-2">
            <div className="p-2.5 rounded-xl bg-primary-green/10 text-primary-green w-fit">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-text-dark font-serif">Support Hours</h3>
            <p className="text-xs text-text-dark/60 font-sans leading-relaxed">
              {COMPANY_DETAILS.operatingHours}
            </p>
            <span className="block text-[11px] font-semibold text-primary-green font-sans pt-1">
              IST (Kerala Time)
            </span>
          </div>
        </div>

        {/* Message Form & Direct Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-warm-brown/10 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-text-dark">
                Send Us a Direct Message
              </h2>
              <p className="text-xs sm:text-sm text-text-dark/70 font-sans">
                Fill in your details below and our team will get back to you within 24 hours.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-primary-green/10 border border-primary-green/20 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary-green text-cream-bg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-primary-green">
                    Message Received, {name}!
                  </h3>
                  <p className="text-xs sm:text-sm text-text-dark/80 font-sans max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out to MADETRUE. Our Kochi support team will review your inquiry
                    and respond to <strong>{email || phone || "your contact"}</strong> shortly.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={whatsappInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary-green text-cream-bg text-xs font-bold font-sans hover:bg-[#224f3b] transition flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Also Send via WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-warm-brown/20 text-text-dark text-xs font-semibold font-sans hover:bg-warm-brown/5 transition cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Anjali Menon"
                      className="w-full px-4 py-2.5 rounded-xl border border-warm-brown/20 bg-[#FAF7F2]/50 text-xs text-text-dark focus:outline-hidden focus:ring-1 focus:ring-primary-green focus:border-primary-green"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., anjali@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-warm-brown/20 bg-[#FAF7F2]/50 text-xs text-text-dark focus:outline-hidden focus:ring-1 focus:ring-primary-green focus:border-primary-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., +91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-warm-brown/20 bg-[#FAF7F2]/50 text-xs text-text-dark focus:outline-hidden focus:ring-1 focus:ring-primary-green focus:border-primary-green"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                      Inquiry Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-warm-brown/20 bg-[#FAF7F2]/50 text-xs text-text-dark focus:outline-hidden focus:ring-1 focus:ring-primary-green focus:border-primary-green cursor-pointer"
                    >
                      <option value="order">Order Status & Delivery</option>
                      <option value="cancellation">Cancellation & Refund</option>
                      <option value="maker">Become a Maker / Onboarding</option>
                      <option value="grievance">Grievance & Legal Compliance</option>
                      <option value="general">General Feedback / Inquiry</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                    Your Message *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what you need help with. Include your Order ID if applicable..."
                    className="w-full px-4 py-2.5 rounded-xl border border-warm-brown/20 bg-[#FAF7F2]/50 text-xs text-text-dark focus:outline-hidden focus:ring-1 focus:ring-primary-green focus:border-primary-green leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-green text-cream-bg text-xs font-bold uppercase tracking-wider hover:bg-[#224f3b] transition duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit Message
                  </button>

                  <a
                    href={COMPANY_DETAILS.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-green hover:underline font-semibold flex items-center gap-1"
                  >
                    Prefer WhatsApp directly? Chat with us
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* Quick Help Column */}
          <div className="space-y-4 font-sans">
            <div className="bg-white rounded-3xl p-6 border border-warm-brown/10 shadow-sm space-y-3">
              <h3 className="font-serif text-base font-bold text-text-dark">
                Are you an existing buyer?
              </h3>
              <p className="text-xs text-text-dark/70 leading-relaxed">
                You can track your orders, see maker contacts, or request eligible order cancellations
                anytime without waiting for support.
              </p>
              <Link
                href="/orders"
                className="inline-flex items-center text-xs font-bold text-primary-green hover:underline gap-1 pt-1"
              >
                Go to My Orders
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-warm-brown/10 shadow-sm space-y-3">
              <h3 className="font-serif text-base font-bold text-text-dark">
                Are you a local producer?
              </h3>
              <p className="text-xs text-text-dark/70 leading-relaxed">
                We invite spice farmers, artisans, and traditional home-cooks from across Kerala to share their stories
                and sell directly to conscious consumers.
              </p>
              <Link
                href="/profile#become-maker"
                className="inline-flex items-center text-xs font-bold text-warm-brown hover:underline gap-1 pt-1"
              >
                Join as a Maker
                <ArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>

            <div className="bg-gradient-to-br from-warm-brown/10 to-[#FAF7F2] rounded-3xl p-6 border border-warm-brown/15 space-y-2">
              <div className="flex items-center gap-2 text-warm-brown">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Consumer Grievance
                </h4>
              </div>
              <p className="text-[11px] text-text-dark/70 leading-relaxed">
                Under the Consumer Protection (E-Commerce) Rules, 2020, every grievance received is acknowledged
                within 48 hours and resolved within one month of receipt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

