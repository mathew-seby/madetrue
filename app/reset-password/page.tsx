"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { performPasswordReset } = useAuth();

  const identifier = searchParams.get("id") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!newPassword) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter them carefully.");
      return;
    }

    setLoading(true);
    try {
      await performPasswordReset(newPassword, identifier || undefined);
      setSuccessMsg("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col md:flex-row">
      {/* Left Story Pane (Desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-primary-green p-12 flex-col justify-between text-cream-bg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F9F5F0_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="z-10">
          <Link href="/" className="inline-block">
            <h1 className="font-serif text-3xl font-bold tracking-wide hover:opacity-90 transition">
              MADETRUE
            </h1>
          </Link>
          <p className="text-xs text-cream-bg/75 mt-1 font-semibold uppercase tracking-widest">
            Hyperlocal Kerala Marketplace
          </p>
        </div>

        <div className="z-10 space-y-6 max-w-md my-auto">
          <h2 className="font-serif text-4xl leading-tight font-semibold">
            Protecting Your Trust.
          </h2>
          <p className="text-sm text-cream-bg/90 leading-relaxed font-sans font-light">
            Choose a strong, secure password to protect your account and support Kerala&apos;s independent makers with peace of mind.
          </p>
          <div className="flex items-center space-x-3 text-xs bg-cream-bg/10 p-3.5 rounded-xl border border-cream-bg/15">
            <Sparkles className="h-5 w-5 text-accent-gold shrink-0 animate-pulse" />
            <span>Encrypted and verified for your protection.</span>
          </div>
        </div>

        <div className="z-10 text-[10px] text-cream-bg/60 font-semibold tracking-wider uppercase">
          © 2026 MADETRUE. Supporting local livelihoods.
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 bg-cream-bg">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="text-center md:text-left space-y-2">
            <div className="md:hidden mb-4">
              <Link href="/" className="inline-block">
                <span className="font-serif text-2xl font-bold text-primary-green tracking-wide">
                  MADETRUE
                </span>
              </Link>
            </div>
            <h2 className="font-serif text-3xl font-bold text-text-dark">
              Set New Password
            </h2>
            <p className="text-xs text-text-dark/60 max-w-sm">
              Please enter and confirm your new password below.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-primary-green/10 text-primary-green text-xs font-semibold border border-primary-green/20 flex items-start space-x-2">
              <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-warm-brown/50 hover:text-warm-brown cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-[10px] text-warm-brown/60 block leading-tight font-medium">
                Must be at least 6 characters.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Updating Password..." : "Update Password & Sign In"}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center text-xs text-warm-brown/80 hover:text-primary-green transition font-medium"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-bg flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary-green/20 border-t-primary-green animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

