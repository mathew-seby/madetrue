"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { User } from "@/types";
import { ShieldAlert, Store, ArrowRight, ArrowLeft } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: Array<User["role"]>;
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallbackTitle,
  fallbackMessage,
}: RoleGuardProps) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-cream-bg flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 rounded-full border-4 border-primary-green/20 border-t-primary-green animate-spin" />
        <span className="mt-4 text-xs font-semibold text-warm-brown uppercase tracking-widest animate-pulse">
          Checking access permissions...
        </span>
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] bg-cream-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-warm-brown/10 text-warm-brown rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-text-dark mb-2">
          Sign In Required
        </h2>
        <p className="text-sm text-text-dark/70 max-w-md mb-6 leading-relaxed">
          Please sign in to access this area of the marketplace.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition"
        >
          <span>Sign In</span>
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </div>
    );
  }

  // Role unauthorized
  if (!allowedRoles.includes(currentUser.role)) {
    const isSellerTarget = allowedRoles.includes("seller");
    const isAdminTarget = allowedRoles.includes("admin");

    const defaultTitle = isSellerTarget
      ? "Maker Account Required"
      : isAdminTarget
      ? "Administrator Access Only"
      : "Access Restricted";

    const defaultMessage = isSellerTarget
      ? `You are currently signed in as a buyer (${currentUser.name}). The Maker Dashboard is where verified Kerala producers and artisans manage their harvest and orders.`
      : isAdminTarget
      ? `You are currently signed in as a ${currentUser.role} (${currentUser.name}). The moderation console is restricted to verified MADETRUE platform moderators.`
      : "Your current account role does not have permission to view this section.";

    return (
      <div className="min-h-[70vh] bg-cream-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-accent-gold/15 text-warm-brown rounded-full flex items-center justify-center mb-4">
          {isSellerTarget ? (
            <Store className="h-8 w-8 text-primary-green" />
          ) : (
            <ShieldAlert className="h-8 w-8 text-warm-brown" />
          )}
        </div>
        <h2 className="font-serif text-3xl font-bold text-text-dark mb-2">
          {fallbackTitle || defaultTitle}
        </h2>
        <p className="text-sm text-text-dark/70 max-w-lg mb-6 leading-relaxed">
          {fallbackMessage || defaultMessage}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {isSellerTarget && currentUser.role === "buyer" && (
            <Link
              href="/profile#become-maker"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition"
            >
              <span>Apply to Become a Maker</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          )}
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-warm-brown/20 text-warm-brown hover:bg-white text-sm font-semibold transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Return to Marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
}

