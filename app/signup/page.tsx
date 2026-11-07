"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthScreen } from "@/components/shared/AuthScreen";
import { useAuth } from "@/components/shared/AuthProvider";

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const redirectUrl = searchParams.get("redirect") || "/profile";

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace(redirectUrl);
    }
  }, [currentUser, loading, redirectUrl, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary-green/20 border-t-primary-green animate-spin" />
      </div>
    );
  }

  return <AuthScreen initialTab="signup" redirectUrl={redirectUrl} />;
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-bg flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary-green/20 border-t-primary-green animate-spin" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

