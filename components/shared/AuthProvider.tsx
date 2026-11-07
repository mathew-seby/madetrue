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
  forgotPassword
} from "@/lib/supabase/auth";
import { AuthScreen } from "./AuthScreen";

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

  // Initialize and check current user session
  useEffect(() => {
    // One-time read of the session after hydration
    const user = getCurrentUser();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time mount sync */
    setCurrentUser(user);
    setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const login = async (idVal: string, passVal: string) => {
    const user = await loginUser(idVal, passVal);
    setCurrentUser(user);
    return user;
  };

  const signup = async (nameVal: string, idVal: string, passVal: string) => {
    const user = await registerUser(nameVal, idVal, passVal);
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

  const updateUser = async (
    nameVal: string,
    passwordVal?: string,
    oldPasswordVal?: string,
    languagePrefVal?: string,
    profilePhotoUrlVal?: string
  ) => {
    if (!currentUser) throw new Error("No active user session.");
    const updated = await updateUserProfile(
      currentUser.id,
      nameVal,
      passwordVal,
      oldPasswordVal,
      languagePrefVal,
      profilePhotoUrlVal
    );
    setCurrentUser(updated);
  };

  const requestPasswordReset = async (identifierVal: string) => {
    await forgotPassword(identifierVal);
  };

  // Public browsing: anyone can explore the marketplace without an account.
  // The login wall appears only where an account is truly needed — placing an
  // order, managing a maker store, or your profile. /admin keeps its own
  // bespoke console login.
  const isAdminRoute = pathname?.startsWith("/admin");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isProtectedRoute =
    pathname === "/checkout" ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/profile");

  // If page is loading active session, show loader
  if (loading) {
    return (
      <div className="min-h-screen bg-cream-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary-green/20 border-t-primary-green animate-spin" />
        <span className="mt-4 text-xs font-semibold text-warm-brown uppercase tracking-widest animate-pulse">
          Loading MADETRUE...
        </span>
      </div>
    );
  }

  // Serve the app for admin routes (own login flow), dedicated auth routes,
  // all public browsing, and any signed-in visitor. Guests only hit the in-place
  // wall on protected routes.
  if (isAdminRoute || isAuthRoute || !isProtectedRoute || currentUser) {
    return (
      <AuthContext.Provider
        value={{
          currentUser,
          loading,
          login,
          signup,
          logout,
          upgradeCurrentUserToSeller,
          updateUser,
          requestPasswordReset,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  // Guest on a protected route: render the in-place AuthScreen.
  // Sign-in happens in place, so the visitor continues exactly where they
  // were headed (checkout, dashboard, profile) the moment they're signed in.
  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        signup,
        logout,
        upgradeCurrentUserToSeller,
        updateUser,
        requestPasswordReset,
      }}
    >
      <AuthScreen
        initialTab="signin"
        title={
          pathname === "/checkout"
            ? "Sign In to Checkout"
            : pathname?.startsWith("/dashboard")
            ? "Sign In to Maker Dashboard"
            : "Sign In to Your Account"
        }
        subtitle={
          pathname === "/checkout"
            ? "Please sign in or create an account to place and track your order."
            : pathname?.startsWith("/dashboard")
            ? "Sign in with your maker account to manage your listings and incoming orders."
            : "Sign in to manage your profile, saved addresses, and order history."
        }
      />
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
