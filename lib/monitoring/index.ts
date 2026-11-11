import * as Sentry from "@sentry/nextjs";

export interface ErrorContext {
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

/**
 * Safely captures an exception to Sentry (if configured) and logs to console.
 * Never throws, ensuring monitoring never breaks customer or maker journeys.
 */
export function captureException(error: unknown, context?: ErrorContext): void {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.error("[MADETRUE Monitor] Captured Exception:", error, context);
    }

    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (context?.tags) {
          scope.setTags(context.tags);
        }
        if (context?.extra) {
          scope.setExtras(context.extra);
        }
        if (context?.user) {
          scope.setUser(context.user);
        }
        Sentry.captureException(error);
      });
    }
  } catch (err) {
    // Fail-safe: monitoring must never crash the caller
    console.error("[MADETRUE Monitor] Failed to capture exception:", err);
  }
}

/**
 * Safely captures an informational or warning message to Sentry.
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: ErrorContext
): void {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[MADETRUE Monitor] [${level.toUpperCase()}] ${message}`, context);
    }

    if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (context?.tags) {
          scope.setTags(context.tags);
        }
        if (context?.extra) {
          scope.setExtras(context.extra);
        }
        if (context?.user) {
          scope.setUser(context.user);
        }
        Sentry.captureMessage(message, level);
      });
    }
  } catch (err) {
    console.error("[MADETRUE Monitor] Failed to capture message:", err);
  }
}

