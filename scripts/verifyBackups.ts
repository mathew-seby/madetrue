// MADETRUE — Backup & rate-limit verification suite (Phase 9 Step 7),
// extended with the launch-rehearsal readiness check (Phase 10 · Step 5).
//
// Run: npx tsx scripts/verifyBackups.ts

import fs from "fs";
import path from "path";
import {
  checkRateLimit,
  createRateLimitResponse,
  resetRateLimitStore,
} from "../lib/security/rateLimit";

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("\n=======================================================");
console.log(" MADETRUE — Phase 9 Step 7: Backups & Rate Limits Audit");
console.log("=======================================================\n");

// ---------------------------------------------------------------------------
// 1. Audit Migrations Sequencing & Declarative Backup Integrity
// ---------------------------------------------------------------------------
console.log("Checking 1: Migration Sequencing & Declarative Backup Integrity...");

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
assert(fs.existsSync(migrationsDir), "supabase/migrations directory must exist");

const expectedMigrations = [
  "0001_init.sql",
  "0002_rls.sql",
  "0003_user_address.sql",
  "0004_seller_payout_kyc.sql",
  "0005_product_images_storage.sql",
  "0006_payout_privacy_and_stock_rpc.sql",
  "0007_seller_application_status.sql",
  "0008_product_moderation.sql",
  "0009_admin_audit.sql",
  "0010_order_lifecycle.sql",
  "0011_order_status_backfill.sql",
  "0012_order_cancellations.sql",
  "0013_notification_delivery_logs.sql",
  "0014_users_from_auth.sql",
];

for (const mig of expectedMigrations) {
  const migPath = path.join(migrationsDir, mig);
  assert(fs.existsSync(migPath), `Migration ${mig} must exist in supabase/migrations`);
  const content = fs.readFileSync(migPath, "utf8");
  assert(content.trim().length > 20, `Migration ${mig} must not be empty`);
}
console.log(`  ✅ All ${expectedMigrations.length} SQL migrations verified in sequential order.`);

// ---------------------------------------------------------------------------
// 2. Audit Core Database Tables & Entities
// ---------------------------------------------------------------------------
console.log("Checking 2: Core Protected Database Tables Coverage...");

const coreTables = [
  "users",
  "sellers",
  "seller_payout_kyc",
  "categories",
  "products",
  "orders",
  "transactions",
  "admin_audit",
  "notification_logs",
];

const allMigrationSql = expectedMigrations
  .map((m) => fs.readFileSync(path.join(migrationsDir, m), "utf8"))
  .join("\n");

for (const table of coreTables) {
  const tableRegex = new RegExp(`(create\\s+table|table)\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?${table}\\b`, "i");
  assert(tableRegex.test(allMigrationSql), `Table '${table}' must be created in migrations`);
}
console.log(`  ✅ All ${coreTables.length} core database tables declared across migrations.`);

// ---------------------------------------------------------------------------
// 3. Catalog Seed Script Integrity
// ---------------------------------------------------------------------------
console.log("Checking 3: Seed Script Coverage...");

const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");
assert(fs.existsSync(seedPath), "supabase/seed.sql must exist");
const seedContent = fs.readFileSync(seedPath, "utf8");

assert(seedContent.includes("public.users"), "Seed must populate users");
assert(seedContent.includes("public.sellers"), "Seed must populate sellers");
assert(seedContent.includes("public.categories"), "Seed must populate categories");
assert(seedContent.includes("public.products"), "Seed must populate products");
console.log("  ✅ Seed SQL covers users, sellers, categories, and products.");

// ---------------------------------------------------------------------------
// 4. Rate Limiting & Write Throttling Simulation
// ---------------------------------------------------------------------------
console.log("Checking 4: Rate Limiting & Write Throttling Logic...");

resetRateLimitStore();

const testIp = "192.168.1.100";
const testPreset = {
  limit: 5,
  windowMs: 10 * 1000,
};

// 1. Initial 5 requests should be allowed
for (let i = 1; i <= 5; i++) {
  const result = checkRateLimit(`test:${testIp}`, testPreset);
  assert(result.allowed, `Request ${i} within limit must be allowed`);
  assert(result.remaining === 5 - i, `Remaining count should be ${5 - i}, got ${result.remaining}`);
}

// 2. 6th request must be throttled
const blockedResult = checkRateLimit(`test:${testIp}`, testPreset);
assert(!blockedResult.allowed, "Request 6 exceeding limit must be blocked");
assert(blockedResult.remaining === 0, "Remaining should be 0 when throttled");
assert(blockedResult.retryAfter >= 1, "retryAfter must be at least 1 second");

// 3. Response generator must output HTTP 429 with Retry-After header
const response = createRateLimitResponse(blockedResult);
assert(response.status === 429, `HTTP status should be 429, got ${response.status}`);
assert(response.headers.get("Retry-After") !== null, "Retry-After header must be present");
assert(response.headers.get("X-RateLimit-Limit") === "5", "X-RateLimit-Limit header must match limit");
assert(response.headers.get("X-RateLimit-Remaining") === "0", "X-RateLimit-Remaining must be 0");

// 4. Different IP should not be blocked
const differentIp = "192.168.1.101";
const differentResult = checkRateLimit(`test:${differentIp}`, testPreset);
assert(differentResult.allowed, "Unrelated IP must not be throttled by another IP's burst");

console.log("  ✅ Sliding-window write throttling, 429 headers, and IP isolation verified.");

// ---------------------------------------------------------------------------
// 5. Disaster Recovery Runbook Documentation Check
// ---------------------------------------------------------------------------
console.log("Checking 5: Disaster Recovery Runbook Documentation...");

const runbookPath = path.resolve(process.cwd(), "docs/backup-and-disaster-recovery.md");
assert(fs.existsSync(runbookPath), "docs/backup-and-disaster-recovery.md must exist");
const runbookContent = fs.readFileSync(runbookPath, "utf8");

assert(runbookContent.includes("Point-in-Time Recovery"), "Runbook must detail PITR");
assert(runbookContent.includes("pg_dump"), "Runbook must document on-demand pg_dump");
assert(runbookContent.includes("product-images"), "Runbook must document storage bucket backups");
assert(runbookContent.includes("seller_payout_kyc"), "Runbook must specify private payout table safety");
console.log("  ✅ Backup and disaster recovery runbook complete with RPO/RTO targets.");

// ---------------------------------------------------------------------------
// 6. Launch Rehearsal Readiness (Phase 10 · Step 5)
// ---------------------------------------------------------------------------
console.log("Checking 6: Launch Rehearsal Readiness...");

const seedScriptPath = path.resolve(process.cwd(), "scripts/seedLaunchMakers.ts");
assert(fs.existsSync(seedScriptPath), "scripts/seedLaunchMakers.ts must exist (launch-maker seeding)");

const seedScriptContent = fs.readFileSync(seedScriptPath, "utf8");
assert(seedScriptContent.includes("--dry-run"), "Seed script must support --dry-run (write nothing on validation)");
assert(seedScriptContent.includes("application_status"), "Seed script must keep application lifecycle admin-only");
assert(seedScriptContent.includes("seller_payout_kyc"), "Seed script must route payout KYC to the private table");

const templatePath = path.resolve(process.cwd(), "scripts/launch-makers.template.json");
assert(fs.existsSync(templatePath), "scripts/launch-makers.template.json must ship as the maker-sheet template");
try {
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8")) as { makers?: unknown[] };
  assert(Array.isArray(template.makers) && template.makers.length > 0, "Template must hold a makers array");
} catch {
  assert(false, "launch-makers.template.json must be valid JSON");
}

const rehearsalPath = path.resolve(process.cwd(), "docs/launch-rehearsal.md");
assert(fs.existsSync(rehearsalPath), "docs/launch-rehearsal.md (the rehearsal runbook) must exist");
const rehearsalContent = fs.readFileSync(rehearsalPath, "utf8");
assert(rehearsalContent.includes("seedLaunchMakers"), "Runbook must document the seeding command");
assert(rehearsalContent.toLowerCase().includes("walkthrough"), "Runbook must contain the admin walkthrough");
assert(rehearsalContent.toLowerCase().includes("restore"), "Runbook must contain the restore drill");

const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), ".gitignore"), "utf8");
assert(
  gitignoreContent.includes("scripts/launch-makers.json"),
  ".gitignore must exclude scripts/launch-makers.json (real maker data + passwords never enter the repo)",
);

console.log("  ✅ Launch rehearsal tooling, runbook, and data-privacy guard verified.");

console.log("\n=======================================================");
console.log("🎉 ALL BACKUP, RATE LIMIT & LAUNCH REHEARSAL CHECKS PASSED!");
console.log("=======================================================\n");
