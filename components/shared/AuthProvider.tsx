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
  forgotPassword,
  resetPassword,
  PasswordResetResult
} from "@/lib/supabase/auth";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase-browser";
import { AuthScreen } from "./AuthScreen";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  signup: (name: string, identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void> | void;
  upgradeCurrentUserToSeller: (
    businessName: string,
    story: string,
    whatsappNumber: string,
    address: string,
    lat?: number,
    lng?: number
  ) => Promise<void>;
  updateUser: (
    name: string,
    password?: string,
    oldPassword?: string,
    languagePref?: string,
    profilePhotoUrl?: string,
    phone?: string,
    address?: string
  ) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<PasswordResetResult>;
  performPasswordReset: (newPassword: string, identifier?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and synchronize user session
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseEnabled()) {
      // Mock mode: one-time read of the session from localStorage after hydration
      const user = getCurrentUser();
      /* eslint-disable react-hooks/set-state-in-effect -- one-time mount sync from localStorage */
      setCurrentUser(user);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    // Supabase mode: real session via @supabase/ssr cookies/storage
    try {
      const supabase = createSupabaseBrowserClient();

      const syncProfile = async (authUser: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      }) => {
        try {
          const meta = authUser.user_metadata || {};
          let profile: Record<string, unknown> | null = null;

          try {
            const { data } = await supabase
              .from("users")
              .select(
                "id, name, email, phone, role, location_lat, location_lng, region, language_pref, profile_photo_url, address"
              )
              .eq("id", authUser.id)
              .maybeSingle();
            profile = data as Record<string, unknown> | null;
          } catch {
            const { data } = await supabase
              .from("users")
              .select(
                "id, name, email, phone, role, location_lat, location_lng, region, language_pref, profile_photo_url"
              )
              .eq("id", authUser.id)
              .maybeSingle();
            profile = data as Record<string, unknown> | null;
          }

          if (!mounted) return;

          const emailVal =
            authUser.email && !authUser.email.endsWith("@phone.madetrue.in")
              ? authUser.email
              : (profile?.email as string) || "";

          const phoneVal = (profile?.phone as string) || (meta.phone as string) || "";
          const addressVal = (profile?.address as string) || (profile?.region as string) || (meta.address as string) || "";
          const nameVal = (profile?.name as string) || (meta.name as string) || "User";
          const roleVal = (profile?.role as User["role"]) || (meta.role as User["role"]) || "buyer";

          setCurrentUser({
            id: authUser.id,
            name: nameVal,
            email: emailVal,
            phone: phoneVal,
            role: roleVal,
            address: addressVal || undefined,
            language_pref: (profile?.language_pref as string) || (meta.language_pref as string) || undefined,
            profile_photo_url: (profile?.profile_photo_url as string) || (meta.profile_photo_url as string) || undefined,
            location_lat: (profile?.location_lat as number) ?? undefined,
            location_lng: (profile?.location_lng as number) ?? undefined,
            region: (profile?.region as string) ?? undefined,
          });
        } catch (err) {
          console.error("[madetrue] Failed to sync user profile", err);
          if (mounted) setCurrentUser(null);
        } finally {
          if (mounted) setLoading(false);
        }
      };

      // Check current session from cookies on mount (survives browser refresh)
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (!mounted) return;
          if (session?.user) {
            void syncProfile(session.user);
          } else {
            setCurrentUser(null);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("[madetrue] getSession error", err);
          if (mounted) {
            setCurrentUser(null);
            setLoading(false);
          }
        });

      // Listen for auth state transitions (sign in, sign out, token refresh)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT" || !session?.user) {
          setCurrentUser(null);
          setLoading(false);
        } else if (session?.user) {
          await syncProfile(session.user);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error("[madetrue] Supabase auth client initialization failed", err);
      if (mounted) {
        setCurrentUser(null);
        setLoading(false);
      }
    }
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

  const logout = async () => {
    if (isSupabaseEnabled()) {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch (err) {
        console.error("[madetrue] signOut error", err);
      }
    } else {
      logoutUser();
    }
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
    profilePhotoUrlVal?: string,
    phoneVal?: string,
    addressVal?: string
  ) => {
    if (!currentUser) throw new Error("No active user session.");
    const updated = await updateUserProfile(
      currentUser.id,
      nameVal,
      passwordVal,
      oldPasswordVal,
      languagePrefVal,
      profilePhotoUrlVal,
      phoneVal,
      addressVal
    );
    setCurrentUser(updated);
  };

  const requestPasswordReset = async (identifierVal: string): Promise<PasswordResetResult> => {
    return await forgotPassword(identifierVal);
  };

  const performPasswordReset = async (newPasswordVal: string, identifierVal?: string): Promise<void> => {
    await resetPassword(newPasswordVal, identifierVal);
  };

  // Public browsing: anyone can explore the marketplace without an account.
  // The login wall appears only where an account is truly needed — placing an
  // order, managing a maker store, or your profile. /admin keeps its own
  // bespoke console login.
  const isAdminRoute = pathname?.startsWith("/admin");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password";
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
          performPasswordReset,
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
        performPasswordReset,
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
