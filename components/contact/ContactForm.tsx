"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, MessageSquare, ExternalLink } from "lucide-react";
import { COMPANY_DETAILS } from "@/lib/utils/constants";

export default function ContactForm() {
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
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-brown/10 shadow-sm space-y-6">
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
  );
}

