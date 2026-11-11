"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCcw, Home } from "lucide-react";
import { captureException } from "@/lib/monitoring";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureException(error, {
      extra: {
        digest: error.digest,
        message: error.message,
      },
      tags: {
        boundary: "global-error-boundary",
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-4 bg-[#F9F5F0] text-[#1A1A1A] font-sans antialiased">
        <div className="max-w-md w-full bg-[#FAF7F2] border border-[#7D5A3C]/20 rounded-3xl p-8 sm:p-10 text-center shadow-md space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shadow-inner">
            <AlertOctagon className="h-7 w-7 text-amber-900" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#7D5A3C] uppercase tracking-wider">
              MADETRUE • System Interruption
            </span>
            <h1 className="font-serif text-2xl font-bold text-[#1A1A1A]">
              We hit an unexpected snag
            </h1>
            <p className="text-xs text-[#1A1A1A]/70 leading-relaxed">
              The application layout experienced an error. Our engineering team has been notified.
              Please try refreshing the page or navigating back to our home base.
            </p>
          </div>

          {error.digest && (
            <div className="inline-block px-3 py-1 rounded-full bg-[#7D5A3C]/5 border border-[#7D5A3C]/10 text-[10px] font-mono text-[#7D5A3C]">
              Digest: {error.digest}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#2D6A4F] text-[#F9F5F0] text-xs font-bold uppercase tracking-wider hover:bg-[#224f3b] transition duration-200 cursor-pointer shadow-sm"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white border border-[#7D5A3C]/20 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider hover:bg-[#7D5A3C]/5 transition duration-200"
            >
              <Home className="mr-2 h-4 w-4 text-[#7D5A3C]" />
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
