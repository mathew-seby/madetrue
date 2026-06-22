"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { User } from "@/types";
import { 
  getCurrentUser, 
  loginUser, 
  registerUser, 
  logoutUser, 
  upgradeToSeller,
  updateUserProfile,
  validateEmail,
  validatePhone,
  isEmail,
  forgotPassword
} from "@/lib/supabase/auth";
import { Mail, Phone, Lock, User as UserIcon, ShieldCheck, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle } from "lucide-react";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  signup: (name: string, identifier: string, password: string) => Promise<User>;
  logout: () => void;
  upgradeCurrentUserToSeller: (
    businessName: string,
    story: string,
    whatsappNumber: string,
    address: string,
    lat?: number,
    lng?: number
  ) => Promise<void>;
  updateUser: (name: string, password?: string, oldPassword?: string, languagePref?: string, profilePhotoUrl?: string) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tab control: "signup" or "signin" (defaults to signup per "first sign up then sign in")
  const [activeTab, setActiveTab] = useState<"signup" | "signin">("signup");
  
  // Form Fields
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Show / Hide Password
  const [showPassword, setShowPassword] = useState(false);
  
  // Feedback States
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Initialize and check current user session
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);

  const login = async (idVal: string, passVal: string) => {
    const user = await loginUser(idVal, passVal);
    setCurrentUser(user);
    return user;
  };

  const signup = async (nameVal: string, idVal: string, passVal: string) => {
    const user = await registerUser(nameVal, idVal, passVal);
    // Do not auto-login right away per "first sign up then sign in" instruction.
    // Instead, prompt them to sign in! This guides them through the flow.
    return user;
  };

  const logout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const upgradeCurrentUserToSeller = async (
    businessName: string,
    story: string,
    whatsappNumber: string,
    address: string,
    lat?: number,
    lng?: number
  ) => {
    if (!currentUser) throw new Error("No active user session.");
    const result = await upgradeToSeller(
      currentUser.id,
      businessName,
      story,
      whatsappNumber,
      address,
      lat,
      lng
    );
    setCurrentUser(result.user);
  };

  const updateUser = async (nameVal: string, passwordVal?: string, oldPasswordVal?: string, languagePrefVal?: string, profilePhotoUrlVal?: string) => {
    if (!currentUser) throw new Error("No active user session.");
    const updated = await updateUserProfile(currentUser.id, nameVal, passwordVal, oldPasswordVal, languagePrefVal, profilePhotoUrlVal);
    setCurrentUser(updated);
  };

  const requestPasswordReset = async (identifierVal: string) => {
    await forgotPassword(identifierVal);
  };


  const validateInputs = (): boolean => {
    setErrorMsg("");
    
    // Identifier check
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
        setErrorMsg("Please enter a valid 10-digit Indian phone number (e.g. 9876543210).");
        return false;
      }
    }

    // Password check
    if (!password) {
      setErrorMsg("Password is required.");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return false;
    }

    // Signup specific check
    if (activeTab === "signup") {
      if (!name.trim()) {
        setErrorMsg("Please enter your name.");
        return false;
      }
      if (name.trim().length < 2) {
        setErrorMsg("Name must be at least 2 characters long.");
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
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
      if (activeTab === "signup") {
        await signup(name.trim(), identifier.trim(), password);
        setSuccessMsg("Account created successfully! Please sign in using your credentials.");
        // Clear fields except identifier to make sign in convenient
        setName("");
        setPassword("");
        setConfirmPassword("");
        // Move to sign-in tab
        setActiveTab("signin");
      } else {
        await login(identifier.trim(), password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setFormLoading(false);
    }
  };

  const isAdminRoute = pathname?.startsWith("/admin");

  // If page is loading active session, show loader
  if (loading) {
    return (
      <div className="min-h-screen bg-cream-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary-green/20 border-t-primary-green animate-spin" />
        <span className="mt-4 text-xs font-semibold text-warm-brown uppercase tracking-widest animate-pulse">Loading MADETRUE...</span>
      </div>
    );
  }

  // If path is admin route or user is authenticated, serve main app
  if (isAdminRoute || currentUser) {
    return (
      <AuthContext.Provider value={{ currentUser, loading, login, signup, logout, upgradeCurrentUserToSeller, updateUser, requestPasswordReset }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Otherwise, render full screen gorgeous Login / Registration Page (first interface)
  return (
    <AuthContext.Provider value={{ currentUser, loading, login, signup, logout, upgradeCurrentUserToSeller, updateUser, requestPasswordReset }}>
      <div className="min-h-screen bg-cream-bg flex flex-col md:flex-row">
        
        {/* Left pane: Story & Vibe (Desktop only) */}
        <div className="hidden md:flex md:w-1/2 bg-primary-green p-12 flex-col justify-between text-cream-bg relative overflow-hidden">
          {/* Background pattern details */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#F9F5F0_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="z-10">
            <h1 className="font-serif text-3xl font-bold tracking-wide">MADETRUE</h1>
            <p className="text-xs text-cream-bg/75 mt-1 font-semibold uppercase tracking-widest">Hyperlocal Kerala Marketplace</p>
          </div>

          <div className="z-10 space-y-6 max-w-md my-auto">
            <h2 className="font-serif text-4xl leading-tight font-semibold">
              Rooted in Trust.<br />Handcrafted with Love.
            </h2>
            <p className="text-sm text-cream-bg/90 leading-relaxed font-sans font-light">
              Connect directly with local spice farmers, organic cultivators, and community artisans in Kerala. Experience transparent sourcing, raw authenticity, and fair prices.
            </p>
            <div className="flex items-center space-x-3 text-xs bg-cream-bg/10 p-3.5 rounded-xl border border-cream-bg/15">
              <Sparkles className="h-5 w-5 text-accent-gold shrink-0 animate-pulse" />
              <span>Support independent makers from Munnar to Kuttanad.</span>
            </div>
          </div>

          <div className="z-10 text-[10px] text-cream-bg/60 font-semibold tracking-wider uppercase">
            © 2026 MADETRUE. Supporting local livelihoods.
          </div>
        </div>

        {/* Right pane: Auth Form Form Container */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 bg-cream-bg">
          <div className="max-w-md w-full mx-auto space-y-8">
            
            {/* Header for Mobile/All */}
            <div className="text-center md:text-left space-y-2">
              <h2 className="font-serif text-3xl font-bold text-text-dark">
                {activeTab === "signup" ? "Create Your Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-text-dark/60 max-w-sm">
                {activeTab === "signup" 
                  ? "Join our story-first, trust-driven community as a buyer or become a local seller." 
                  : "Sign in to access your local cart, support local makers, and manage your orders."}
              </p>
            </div>

            {/* Tab Switched */}
            <div className="flex border-b border-warm-brown/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition duration-200 ${
                  activeTab === "signup"
                    ? "border-primary-green text-primary-green"
                    : "border-transparent text-text-dark/40 hover:text-text-dark/80"
                }`}
              >
                Sign Up First
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition duration-200 ${
                  activeTab === "signin"
                    ? "border-primary-green text-primary-green"
                    : "border-transparent text-text-dark/40 hover:text-text-dark/80"
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Notifications */}
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
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                    <input
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
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Email or Phone Number</label>
                <div className="relative">
                  {isEmail(identifier) ? (
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                  ) : (
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                  )}
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="email@example.com or 10-digit mobile number"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                  />
                </div>
                <span className="text-[10px] text-warm-brown/60 block leading-tight font-medium">
                  Use email format (contains @) or Indian phone (10 digits starting 6-9).
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/50" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-warm-brown/50 hover:text-warm-brown"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {activeTab === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Confirm Password</label>
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
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3.5 mt-2 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <span>{formLoading ? "Validating..." : activeTab === "signup" ? "Register & Sign Up" : "Sign In to Marketplace"}</span>
                {!formLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            {/* Demo Helpers Info Panel */}
            <div className="p-4 rounded-2xl bg-warm-brown/5 border border-warm-brown/10 text-xs space-y-2">
              <span className="font-bold text-warm-brown uppercase tracking-wider text-[10px] flex items-center">
                <ShieldCheck className="h-4 w-4 mr-1 text-primary-green" /> Demo / Testing Information
              </span>
              <p className="text-[11px] text-text-dark/70 leading-relaxed font-medium">
                You can register a new account, or log in with one of the pre-seeded makers:
              </p>
              <div className="space-y-1 text-[11px] font-mono text-primary-green bg-white/60 p-2 rounded-xl border border-warm-brown/5">
                <div>Email: <code className="font-bold">sreedevi@madetrue.local</code></div>
                <div>Phone: <code className="font-bold">9876543210</code></div>
                <div>Password: <code className="font-bold">password123</code></div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
