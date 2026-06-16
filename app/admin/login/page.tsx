"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Mail, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Mock Admin Credentials checking
    if (email === "admin@madetrue.local" && password === "kerala_trust_2026") {
      // Simulate network response latency
      setTimeout(() => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("admin_logged_in", "true");
        }
        setLoading(false);
        router.push("/admin");
      }, 800);
    } else {
      setTimeout(() => {
        setError("Invalid email address or passcode. Please try again.");
        setLoading(false);
      }, 500);
    }
  };

  return (
    <div className="bg-cream-bg min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Navigation Link */}
        <div className="text-center sm:text-left">
          <Link href="/" className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Marketplace
          </Link>
        </div>

        {/* Card Panel */}
        <div className="bg-[#FAF7F2] py-8 px-6 sm:px-10 rounded-3xl border border-warm-brown/10 shadow-sm space-y-6">
          
          {/* Logo / Title Area */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary-green/10 text-primary-green rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-text-dark">Admin Login</h2>
            <p className="text-xs text-text-dark/60 leading-relaxed max-w-xs mx-auto">
              Vetting dashboard for MADETRUE moderators to verify organic produce and local handicrafts.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200 flex items-start space-x-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/60" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@madetrue.local"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Passcode</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-warm-brown/60" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In to Admin Panel"}
            </button>
          </form>

          {/* Test Account Helper */}
          <div className="p-3.5 rounded-xl bg-primary-green/5 border border-primary-green/10 space-y-1">
            <span className="text-[10px] font-bold text-primary-green uppercase tracking-wider">Demo / Testing Credentials</span>
            <div className="text-[11px] text-text-dark/70 font-semibold space-y-0.5">
              <div>Email: <code className="text-primary-green bg-cream-bg px-1 rounded">admin@madetrue.local</code></div>
              <div>Passcode: <code className="text-primary-green bg-cream-bg px-1 rounded">kerala_trust_2026</code></div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
