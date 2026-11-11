"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home, MessageSquare } from "lucide-react";
import { captureException } from "@/lib/monitoring";
import { COMPANY_DETAILS } from "@/lib/utils/constants";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log exception to Sentry and monitoring
    captureException(error, {
      extra: {
        digest: error.digest,
        message: error.message,
        stack: error.stack,
      },
      tags: {
        boundary: "root-error-boundary",
      },
    });
  }, [error]);

  const whatsappHelpUrl = `https://wa.me/918876789131?text=${encodeURIComponent(
    `Hello MADETRUE Support! I encountered an unexpected error on the website${
      error.digest ? ` (Code: ${error.digest})` : ""
    }. Could you please assist me?`
  )}`;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-cream-bg">
      <div className="max-w-md w-full bg-[#FAF7F2] border border-warm-brown/15 rounded-3xl p-8 sm:p-10 text-center shadow-sm space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100/80 border border-amber-300 text-amber-800 flex items-center justify-center shadow-inner">
          <AlertTriangle className="h-7 w-7 text-amber-800" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-warm-brown uppercase tracking-wider font-sans">
            A Momentary Stumble
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-text-dark">
            Something tripped on our end
          </h1>
          <p className="text-xs sm:text-sm text-text-dark/70 font-sans leading-relaxed">
            Don&apos;t worry — your basket and account details are safe. Our Kochi technical team
            has been automatically notified so we can smooth this path out.
          </p>
        </div>

        {error.digest && (
          <div className="inline-block px-3 py-1 rounded-full bg-warm-brown/5 border border-warm-brown/10 text-[10px] font-mono text-warm-brown">
            Incident Reference: <span className="font-bold">{error.digest}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center font-sans">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-green text-cream-bg text-xs font-bold uppercase tracking-wider hover:bg-[#224f3b] transition duration-200 cursor-pointer shadow-sm"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-white border border-warm-brown/20 text-text-dark text-xs font-bold uppercase tracking-wider hover:bg-warm-brown/5 transition duration-200"
          >
            <Home className="mr-2 h-4 w-4 text-warm-brown" />
            Return Home
          </Link>
        </div>

        <div className="pt-4 border-t border-warm-brown/10 space-y-2">
          <p className="text-[11px] text-text-dark/60 font-sans">
            Need urgent assistance with an active order?
          </p>
          <a
            href={whatsappHelpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs font-semibold text-primary-green hover:underline gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat with {COMPANY_DETAILS.brandName} Support on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
