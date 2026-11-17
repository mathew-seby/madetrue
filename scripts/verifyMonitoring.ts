// MADETRUE — Phase 10 · Step 6: monitoring & support readiness suite.
//
// Run: npx tsx scripts/verifyMonitoring.ts
// Optional live probe of a running server (dev, preview or the worktree's
// next start on :4010):
//   npx tsx scripts/verifyMonitoring.ts http://localhost:4010
//
// Verifies the monitoring wiring that the runbook
// (docs/monitoring-and-support.md) documents, and — when a base URL is
// passed — that the live /api/health ping answers honestly and leaks
// nothing. Exit codes: 0 = all green · 1 = failure.

import fs from "fs";
import path from "path";

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  console.log("\n=======================================================");
  console.log(" MADETRUE — Phase 10 Step 6: Monitoring & Support Audit");
  console.log("=======================================================\n");

  // ---------------------------------------------------------------------------
  // 1. Sentry instrumentation across all three runtimes
  // ---------------------------------------------------------------------------
  console.log("Checking 1: Sentry Instrumentation (client · server · edge)...");

  for (const file of [
    "sentry.client.config.ts",
    "sentry.server.config.ts",
    "sentry.edge.config.ts",
  ]) {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    assert(content.includes("Sentry.init"), `${file} must initialize Sentry`);
    assert(content.includes("dsn:"), `${file} must read a DSN env var`);
    assert(content.includes("tracesSampleRate"), `${file} must carry a traces sample rate`);
  }

  const instrumentation = fs.readFileSync(
    path.resolve(process.cwd(), "instrumentation.ts"),
    "utf8"
  );
  assert(
    instrumentation.includes("captureRequestError"),
    "instrumentation.ts must route request errors to Sentry (onRequestError)"
  );
  assert(
    instrumentation.includes("sentry.server.config") && instrumentation.includes("sentry.edge.config"),
    "instrumentation.ts must boot server and edge Sentry per runtime"
  );

  const nextConfig = fs.readFileSync(path.resolve(process.cwd(), "next.config.ts"), "utf8");
  assert(
    nextConfig.includes("withSentryConfig"),
    "next.config.ts must wrap the build with withSentryConfig (source maps)"
  );

  console.log("  ✅ Sentry initialized on all runtimes with request-error routing.");

  // ---------------------------------------------------------------------------
  // 2. Warm error boundaries + fail-safe capture helpers
  // ---------------------------------------------------------------------------
  console.log("Checking 2: Warm Error Boundaries & Fail-safe Capture...");

  // The two error boundaries are client components with reset/capture;
  // not-found is deliberately a warm server-rendered 404 (a missing page is
  // not an exception — capturing every bad URL would be alert spam).
  for (const file of ["app/error.tsx", "app/global-error.tsx"]) {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    assert(content.includes('"use client"'), `${file} must be a client component`);
  }
  const notFound = fs.readFileSync(path.resolve(process.cwd(), "app/not-found.tsx"), "utf8");
  assert(notFound.includes("404"), "app/not-found.tsx must render the warm 404 page");
  const rootError = fs.readFileSync(path.resolve(process.cwd(), "app/error.tsx"), "utf8");
  assert(rootError.includes("reset()"), "app/error.tsx must offer a Try Again (reset) action");
  assert(
    rootError.includes("captureException"),
    "app/error.tsx must record the exception to monitoring"
  );

  const monitoring = fs.readFileSync(path.resolve(process.cwd(), "lib/monitoring/index.ts"), "utf8");
  assert(
    monitoring.includes("export function captureException") &&
      monitoring.includes("export function captureMessage"),
    "lib/monitoring/index.ts must export the fail-safe capture helpers"
  );

  // The helper must genuinely never throw — even with garbage input.
  const { captureException } = await import("../lib/monitoring");
  let threw = false;
  try {
    captureException(new Error("monitoring self-test"), {
      tags: { suite: "verifyMonitoring" },
      extra: { note: "deliberate no-DSN test" },
    });
    captureException(undefined as unknown as Error);
  } catch {
    threw = true;
  }
  assert(!threw, "captureException must be fail-safe (never throw to the caller)");

  console.log("  ✅ Error boundaries and fail-safe capture verified (self-test passed).");

  // ---------------------------------------------------------------------------
  // 3. The health ping uptime monitors depend on
  // ---------------------------------------------------------------------------
  console.log("Checking 3: Health Endpoint...");

  const healthPath = path.resolve(process.cwd(), "app/api/health/route.ts");
  assert(fs.existsSync(healthPath), "app/api/health/route.ts must exist");
  const health = fs.readFileSync(healthPath, "utf8");
  assert(health.includes("force-dynamic"), "Health route must be dynamic (never cached)");
  assert(health.includes("dataSource"), "Health route must report the data source");
  assert(health.includes("503"), "Health route must answer 503 when the database is unreachable");

  console.log("  ✅ Health endpoint wired (static check).");

  // ---------------------------------------------------------------------------
  // 4. The monitoring & support runbook
  // ---------------------------------------------------------------------------
  console.log("Checking 4: Monitoring & Support Runbook...");

  const runbookPath = path.resolve(process.cwd(), "docs/monitoring-and-support.md");
  assert(fs.existsSync(runbookPath), "docs/monitoring-and-support.md must exist");
  const runbook = fs.readFileSync(runbookPath, "utf8");
  for (const needle of [
    "/api/health",
    "Sentry",
    "uptime",
    "Severity",
    "site down",
    "payments",
    "WhatsApp",
    "reconciliation",
    "severity ladder",
    "weekly rhythm",
    "Grievance",
  ]) {
    assert(
      runbook.toLowerCase().includes(needle.toLowerCase()),
      `Runbook must cover "${needle}"`
    );
  }
  assert(
    fs.existsSync(path.resolve(process.cwd(), "docs/backup-and-disaster-recovery.md")) &&
      fs.existsSync(path.resolve(process.cwd(), "docs/refund-support-playbook.md")),
    "The runbook's companion docs (DR + refund playbook) must exist"
  );

  console.log("  ✅ Runbook covers alerts, the four failure playbooks, severity ladder and rhythm.");

  // ---------------------------------------------------------------------------
  // 5. Env documentation
  // ---------------------------------------------------------------------------
  console.log("Checking 5: Environment Variable Documentation...");

  const envExample = fs.readFileSync(path.resolve(process.cwd(), ".env.example"), "utf8");
  for (const variable of [
    "NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    "SENTRY_AUTH_TOKEN",
  ]) {
    assert(envExample.includes(variable), `.env.example must document ${variable}`);
  }

  console.log("  ✅ Sentry variables documented in .env.example.");

  // ---------------------------------------------------------------------------
  // 6. Live probe of a running server (optional)
  // ---------------------------------------------------------------------------
  const base = process.argv[2] ?? process.env.MADETRUE_TEST_URL;
  if (base) {
    console.log(`Checking 6: Live Health Probe (${base})...`);
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/health`, {
        signal: AbortSignal.timeout(8000),
      });
      const body = (await res.json()) as { ok?: boolean; dataSource?: string; database?: string };
      assert(res.status === 200, `Health probe must answer 200, got ${res.status}`);
      assert(body.ok === true, "Health probe body must carry ok: true");
      assert(typeof body.dataSource === "string", "Health probe must name the data source");
      assert(typeof body.database === "string", "Health probe must name the database state");
      const serialized = JSON.stringify(body).toLowerCase();
      for (const secret of ["service", "anon", "key", "pan", "bank"]) {
        assert(
          !serialized.includes(secret),
          `Health probe must not leak "${secret}"`
        );
      }
      console.log(`  ✅ /api/health answered: dataSource=${body.dataSource}, database=${body.database}`);
    } catch (err) {
      assert(false, `Health probe failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    console.log("Checking 6: Live Health Probe — skipped (pass a base URL to run it).");
  }

  console.log("\n=======================================================");
  if (process.exitCode === 1) {
    console.log("❌ MONITORING AUDIT FOUND FAILURES — see the ❌ lines above.");
  } else {
    console.log("🎉 ALL MONITORING & SUPPORT CHECKS PASSED!");
  }
  console.log("=======================================================\n");
  process.exitCode = process.exitCode ?? 0;
}

// The health route is server-only (it imports the service-role client), so
// it is exercised by the live probe (check 6), not imported here.

main().catch((err) => {
  console.error(`\n❌ Unexpected failure: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
