"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import {
  Mail,
  Phone,
  Lock,
  User as UserIcon,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { isEmail, validateEmail, validatePhone, normalizePhone } from "@/lib/supabase/auth";

interface AuthScreenProps {
  initialTab?: "signin" | "signup";
  redirectUrl?: string;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function AuthScreen({
  initialTab = "signin",
  redirectUrl,
  onSuccess,
  title,
  subtitle,
}: AuthScreenProps) {
  const router = useRouter();
  const { login, signup, requestPasswordReset } = useAuth();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Forgot password sub-flow
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState("");
  const [forgotErrorMsg, setForgotErrorMsg] = useState("");
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const validateInputs = (): boolean => {
    setErrorMsg("");

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setErrorMsg("Please enter an email address or a phone number.");
      return false;
    }

    const isEmailInput = isEmail(trimmedId);
    if (isEmailInput) {
      if (!validateEmail(trimmedId)) {
        setErrorMsg("Please enter a valid email address (e.g. user@example.com).");
        return false;
      }
    } else {
      if (!validatePhone(trimmedId)) {
        setErrorMsg("Please enter a valid 10-digit Indian phone number (starting with 6-9).");
        return false;
      }
    }

    if (!password) {
      setErrorMsg("Please enter your password.");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return false;
    }

    if (activeTab === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setErrorMsg("Please enter your name.");
        return false;
      }
      if (trimmedName.length < 2) {
        setErrorMsg("Name must be at least 2 characters long.");
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match. Please re-enter them carefully.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!validateInputs()) return;

    setFormLoading(true);
    try {
      const trimmedId = identifier.trim();
      const finalId = isEmail(trimmedId) ? trimmedId.toLowerCase() : normalizePhone(trimmedId);

      if (activeTab === "signup") {
        await signup(name.trim(), finalId, password);
        setSuccessMsg("Account created! Please sign in with your credentials below.");
        setName("");
        setPassword("");
        setConfirmPassword("");
        setActiveTab("signin");
      } else {
        await login(finalId, password);
        if (onSuccess) {
          onSuccess();
        } else if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.push("/profile");
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg("");
    setForgotSuccessMsg("");
    setDevResetLink(null);

    const trimmed = forgotIdentifier.trim();
    if (!trimmed) {
      setForgotErrorMsg("Please enter your account email address or phone number.");
      return;
    }

    setForgotLoading(true);
    try {
      const result = await requestPasswordReset(trimmed);
      if (result) {
        setForgotSuccessMsg(result.message);
        if (result.devResetLink) {
          setDevResetLink(result.devResetLink);
        }
      } else {
        setForgotSuccessMsg("A password reset link has been sent to your email.");
      }
    } catch (err) {
      setForgotErrorMsg(err instanceof Error ? err.message : "Failed to send reset link.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-bg flex flex-col md:flex-row">
      {/* Left pane: Story & Vibe (Desktop only) */}
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
            Rooted in Trust.<br />Handcrafted with Love.
          </h2>
          <p className="text-sm text-cream-bg/90 leading-relaxed font-sans font-light">
            Connect directly with local spice farmers, organic cultivators, and community artisans across Ernakulam. Transparent sourcing, honest origins, and fair prices.
          </p>
          <div className="flex items-center space-x-3 text-xs bg-cream-bg/10 p-3.5 rounded-xl border border-cream-bg/15">
            <Sparkles className="h-5 w-5 text-accent-gold shrink-0 animate-pulse" />
            <span>Support independent makers from Kochi to Kothamangalam.</span>
          </div>
        </div>

        <div className="z-10 text-[10px] text-cream-bg/60 font-semibold tracking-wider uppercase">
          © 2026 MADETRUE. Supporting local livelihoods.
        </div>
      </div>

      {/* Right pane: Auth Form Container */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 bg-cream-bg">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Header */}
          <div className="text-center md:text-left space-y-2">
            <div className="md:hidden mb-4">
              <Link href="/" className="inline-block">
                <span className="font-serif text-2xl font-bold text-primary-green tracking-wide">
                  MADETRUE
                </span>
              </Link>
            </div>
            <h2 className="font-serif text-3xl font-bold text-text-dark">
              {isForgotPasswordView
                ? "Reset Your Password"
                : title || (activeTab === "signup" ? "Create Your Account" : "Welcome Back")}
            </h2>
            <p className="text-xs text-text-dark/60 max-w-sm">
              {isForgotPasswordView
                ? "Enter your account email or phone number to receive instructions to reset your password."
                : subtitle ||
                  (activeTab === "signup"
                    ? "Join our story-first, trust-driven community as a buyer or become a local maker."
                    : "Sign in to access your local cart, support local makers, and manage your orders.")}
            </p>
          </div>

          {isForgotPasswordView ? (
            /* Forgot Password Flow */
            <div className="space-y-6">
              {forgotErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                  {forgotErrorMsg}
                </div>
              )}

              {forgotSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-primary-green/10 text-primary-green text-xs font-semibold border border-primary-green/20 flex items-start space-x-2">
                  <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{forgotSuccessMsg}</span>
                </div>
              )}

              {devResetLink && (
                <div className="p-3.5 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800">
                    🛠 Dev Mode Reset Link
                  </span>
                  <p className="text-[11px] text-amber-800/90">
                    Click directly below to open the password reset page:
                  </p>
                  <Link
                    href={devResetLink}
                    className="font-bold underline text-primary-green block pt-1 hover:text-[#224f3b]"
                  >
                    Set New Password Now →
                  </Link>
                </div>
              )}

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="forgot-identifier" className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    {isEmail(forgotIdentifier) ? (
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                    ) : (
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                    )}
                    <input
                      id="forgot-identifier"
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="email@example.com or 10-digit phone"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                    />
                  </div>
                  <span className="text-[10px] text-warm-brown/60 block leading-tight font-medium">
                    We will send a secure link to choose a new password.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3.5 mt-2 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{forgotLoading ? "Sending Link..." : "Send Reset Link"}</span>
                  {!forgotLoading && <ArrowRight className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordView(false);
                    setForgotErrorMsg("");
                    setForgotSuccessMsg("");
                    setDevResetLink(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-warm-brown hover:text-primary-green text-xs font-semibold transition cursor-pointer text-center block"
                >
                  ← Return to Sign In
                </button>
              </form>
            </div>
          ) : (
            /* Standard Sign In / Sign Up Flow */
            <>
              {/* Tab Switcher */}
              <div className="flex border-b border-warm-brown/10">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signin");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition duration-200 cursor-pointer ${
                    activeTab === "signin"
                      ? "border-primary-green text-primary-green"
                      : "border-transparent text-text-dark/40 hover:text-text-dark/80"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition duration-200 cursor-pointer ${
                    activeTab === "signup"
                      ? "border-primary-green text-primary-green"
                      : "border-transparent text-text-dark/40 hover:text-text-dark/80"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Feedback alerts */}
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

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === "signup" && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-name" className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Mathew Seby"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="auth-identifier" className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    {isEmail(identifier) ? (
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                    ) : (
                      <Phone className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                    )}
                    <input
                      id="auth-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="email@example.com or 10-digit phone"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                    />
                  </div>
                  <span className="text-[10px] text-warm-brown/60 block leading-tight font-medium">
                    Enter your email address or Indian mobile number (+91 or 10 digits).
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                      Password
                    </label>
                    {activeTab === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPasswordView(true);
                          setForgotErrorMsg("");
                          setForgotSuccessMsg("");
                          setForgotIdentifier(identifier);
                        }}
                        className="text-[11px] text-primary-green hover:underline font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                </div>

                {activeTab === "signup" && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-confirm-password" className="text-xs font-bold text-warm-brown uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                      <input
                        id="auth-confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 mt-2 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {formLoading
                      ? "Checking details..."
                      : activeTab === "signup"
                      ? "Create Account"
                      : "Sign In to Marketplace"}
                  </span>
                  {!formLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              {/* Demo Helpers Info Panel */}
              <div className="p-4 rounded-2xl bg-warm-brown/5 border border-warm-brown/10 text-xs space-y-2">
                <span className="font-bold text-warm-brown uppercase tracking-wider text-[10px] flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-1 text-primary-green" /> Seeded Testing Credentials
                </span>
                <p className="text-[11px] text-text-dark/70 leading-relaxed font-medium">
                  Create a new account with email or phone, or sign in as one of the pre-seeded local makers:
                </p>
                <div className="space-y-1 text-[11px] font-mono text-primary-green bg-white/60 p-2 rounded-xl border border-warm-brown/5">
                  <div>Email: <code className="font-bold">sreedevi@madetrue.local</code></div>
                  <div>Phone: <code className="font-bold">9876543210</code></div>
                  <div>Password: <code className="font-bold">password123</code></div>
                </div>
              </div>
            </>
          )}

          {/* Public browsing return link */}
          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-warm-brown/80 hover:text-primary-green transition font-medium"
            >
              ← Return to marketplace browsing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

