import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, getClientIp, RATE_LIMIT_PRESETS } from "@/lib/security/rateLimit";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply write throttling to all API mutation endpoints
  if (pathname.startsWith("/api") && WRITE_METHODS.has(request.method)) {
    const ip = getClientIp(request);
    const key = `proxy-write:${ip}`;
    const result = checkRateLimit(key, RATE_LIMIT_PRESETS.apiWriteThrottle);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Too many write requests. Please wait a moment before trying again.",
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

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(result.reset / 1000).toString());
    return response;
  }

  return NextResponse.next();
}

// Backward compatibility alias
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all /api request paths
     */
    "/api/:path*",
  ],
};
