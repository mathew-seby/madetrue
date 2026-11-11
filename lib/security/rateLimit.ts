/**
 * MADETRUE — Security & Rate Limiting Module
 *
 * Implements write throttling and rate limiting for API routes and edge middleware.
 * Uses a memory-safe sliding window counter with automatic stale record pruning.
 */

import { NextResponse } from "next/server";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp ms when window resets
  retryAfter: number; // Seconds until allowed again
}

// Built-in presets for common MadeTrue write operations
export const RATE_LIMIT_PRESETS = {
  // Edge middleware write throttle (all POST, PUT, PATCH, DELETE under /api/)
  apiWriteThrottle: {
    limit: 30, // 30 writes per minute per IP
    windowMs: 60 * 1000,
  },
  // Sensitive checkout & order writes
  checkout: {
    limit: 10, // 10 order placements / split sessions per minute
    windowMs: 60 * 1000,
  },
  // File uploads to Supabase storage
  upload: {
    limit: 20, // 20 file uploads per minute
    windowMs: 60 * 1000,
  },
  // Sensitive actions (WhatsApp sandbox sends, cancellations, refunds)
  sensitiveAction: {
    limit: 10, // 10 sensitive actions per minute
    windowMs: 60 * 1000,
  },
  // Payment webhooks ingress
  webhook: {
    limit: 60, // 60 events per minute
    windowMs: 60 * 1000,
  },
} as const;

interface WindowEntry {
  timestamps: number[];
}

// In-memory sliding window store
const memoryStore = new Map<string, WindowEntry>();

// Interval cleanup to prevent unbounded memory growth
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000;

function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, entry] of memoryStore.entries()) {
    // Keep entries that have timestamps within the last 5 minutes
    const valid = entry.timestamps.filter((ts) => now - ts < 5 * 60 * 1000);
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      entry.timestamps = valid;
    }
  }
}

/**
 * Checks whether an action for a given identifier is permitted under rate limit constraints.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanupStaleEntries();

  const now = Date.now();
  const windowStart = now - options.windowMs;

  let entry = memoryStore.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(identifier, entry);
  }

  // Filter timestamps within current sliding window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  const currentCount = entry.timestamps.length;
  const allowed = currentCount < options.limit;

  if (allowed) {
    entry.timestamps.push(now);
  }

  const remaining = Math.max(0, options.limit - (allowed ? currentCount + 1 : currentCount));
  const oldestTimestamp = entry.timestamps[0] ?? now;
  const reset = oldestTimestamp + options.windowMs;
  const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));

  return {
    allowed,
    limit: options.limit,
    remaining,
    reset,
    retryAfter,
  };
}

/**
 * Extracts client IP from request headers across standard reverse proxies.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Creates a standardized HTTP 429 Too Many Requests response.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const message =
    customMessage ||
    "Rate limit exceeded. Too many requests in a short time. Please wait a moment before trying again.";

  return NextResponse.json(
    {
      error: message,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": result.retryAfter.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": Math.ceil(result.reset / 1000).toString(),
      },
    }
  );
}

/**
 * Resets memory store (primarily for unit / integration tests).
 */
export function resetRateLimitStore(): void {
  memoryStore.clear();
}

