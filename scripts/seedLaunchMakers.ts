// MADETRUE — Phase 10 · Step 5: launch rehearsal seeding.
//
// Seeds the FIRST REAL MAKERS into the live Supabase project so the launch
// rehearsal (docs/launch-rehearsal.md) starts from genuine stores, not the
// demo catalog. The script mirrors exactly what the app's own routes write:
//
//   * auth user via the Auth admin API (email + password, email confirmed —
//     the 0014 trigger then guarantees the public.users profile row);
//   * public.users row updated to role 'seller' (service role — the only
//     sanctioned path, same as POST /api/sellers);
//   * sellers row with is_verified=false, kyc_status='not_started',
//     application_status='pending' — NOTHING self-approves. Verification,
//     application approval and product moderation stay admin-console work
//     (that is the walkthrough in Part C of the runbook);
//   * optional payout KYC into the private seller_payout_kyc table (0006);
//   * products with base_price = price and commission = 0 (mirrors
//     app/api/products POST). Listings without a photo are forced to
//     status 'pending' so the maker uploads a real photo first.
//
// Real maker details live in scripts/launch-makers.json — GIT-IGNORED on
// purpose (names, phones, addresses, passwords never enter the repo).
// A template ships next to it. The script refuses placeholder data.
//
// Run (from the repo root, .env.local present):
//   npx tsx scripts/seedLaunchMakers.ts --dry-run
//   npx tsx scripts/seedLaunchMakers.ts
// Optional: --input <path> to read a different sheet (used by CI/verification
// against a throwaway file).
//
// Exit codes: 0 = done · 1 = runtime failure · 2 = environment or input
// problem (nothing was written). The script never calls process.exit()
// mid-run: on Windows that races the Supabase client's closing keep-alive
// sockets (libuv assertion) — exitCode is set and the loop drains instead.

import fs from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Launch-maker sheet types (mirrors types/index.ts semantics, not imports —
// the script stands outside the app on purpose).
// ---------------------------------------------------------------------------

const BADGE_TAGS = [
  "Same Day Delivery",
  "Pickup Available",
  "Fresh Today",
  "Locally Made",
  "Eco-Friendly",
] as const;

interface LaunchProductInput {
  name: string;
  description: string;
  price: number;
  category: string;
  tags?: string[];
  stock: number;
  images?: string[];
  origin_details?: string;
  /** Approve straight away instead of waiting for the admin walkthrough. Default false. */
  approve_immediately?: boolean;
}

interface LaunchPayoutKycInput {
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_account_holder?: string;
}

interface LaunchMakerInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  business_name: string;
  story: string;
  whatsapp_number: string;
  address: string;
  lat: number;
  lng: number;
  /** Optional; empty falls back to the app's default avatar. */
  profile_photo_url?: string;
  /** Optional — only when the maker's KYC is already in hand (Phase 6 Step 7 registers the vendor). */
  payout_kyc?: LaunchPayoutKycInput;
  products?: LaunchProductInput[];
}

interface LaunchMakerSheet {
  makers: LaunchMakerInput[];
}

// ---------------------------------------------------------------------------
// Env loading (.env.local — no new dependencies, no shell sourcing needed).
// ---------------------------------------------------------------------------

function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Validation.
// ---------------------------------------------------------------------------

const PLACEHOLDER_PATTERN = /todo|replace|example|your[-_ ]|<.*>/i;
const CATEGORY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{7,17}$/;

// Ernakulam district, generously bounded (Kothamangalam to Aluva to
// Muvattupuzha to Fort Kochi). Outside this box is a warning, not a block —
// the locked delivery rule is enforced by lib/utils/distance.ts at checkout.
const ERNAKULAM = { latMin: 9.6, latMax: 10.45, lngMin: 75.95, lngMax: 76.95 };

function collectErrors(
  sheet: LaunchMakerSheet,
  knownCategories: Set<string>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(sheet.makers) || sheet.makers.length === 0) {
    return { errors: ["The sheet needs at least one maker under \"makers\"."], warnings };
  }

  sheet.makers.forEach((maker, index) => {
    const label = `maker #${index + 1}`;

    const requiredStrings: Array<[keyof LaunchMakerInput, string]> = [
      ["name", "contact name"],
      ["email", "email"],
      ["password", "password"],
      ["phone", "phone"],
      ["business_name", "business name"],
      ["story", "story"],
      ["whatsapp_number", "WhatsApp number"],
      ["address", "address"],
    ];
    for (const [key, human] of requiredStrings) {
      const value = maker[key];
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(`${label}: "${human}" is missing.`);
      } else if (PLACEHOLDER_PATTERN.test(value) && key !== "address") {
        errors.push(
          `${label}: "${human}" still looks like placeholder text ("${value}") — the sheet must hold real maker details.`,
        );
      }
    }

    if (typeof maker.address === "string" && maker.address.trim().length > 0) {
      if (PLACEHOLDER_PATTERN.test(maker.address)) {
        errors.push(
          `${label}: "address" still looks like placeholder text ("${maker.address}").`,
        );
      }
      if (!maker.address.includes("Ernakulam") && !maker.address.includes("Kochi")) {
        warnings.push(
          `${label}: address does not mention Ernakulam/Kochi — delivery covers Ernakulam district only (locked decision #3).`,
        );
      }
    }

    if (typeof maker.email === "string" && maker.email.trim() && !EMAIL_PATTERN.test(maker.email.trim())) {
      errors.push(`${label}: email "${maker.email}" does not look valid.`);
    }
    if (typeof maker.password === "string" && maker.password.length > 0 && maker.password.length < 8) {
      errors.push(`${label}: password must be at least 8 characters.`);
    }
    for (const phoneField of ["phone", "whatsapp_number"] as const) {
      const value = maker[phoneField];
      if (typeof value === "string" && value.trim() && !PHONE_PATTERN.test(value.trim())) {
        errors.push(`${label}: ${phoneField} "${value}" does not look like a phone number.`);
      }
    }

    if (
      typeof maker.lat !== "number" ||
      typeof maker.lng !== "number" ||
      maker.lat < -90 || maker.lat > 90 || maker.lng < -180 || maker.lng > 180
    ) {
      errors.push(`${label}: lat/lng must be real numbers inside their valid ranges.`);
    } else if (
      maker.lat < ERNAKULAM.latMin || maker.lat > ERNAKULAM.latMax ||
      maker.lng < ERNAKULAM.lngMin || maker.lng > ERNAKULAM.lngMax
    ) {
      warnings.push(
        `${label}: coordinates (${maker.lat}, ${maker.lng}) sit outside the Ernakulam bounding box — check them.`,
      );
    }

    if (maker.profile_photo_url !== undefined && maker.profile_photo_url !== "" &&
        !/^https:\/\//.test(maker.profile_photo_url)) {
      errors.push(`${label}: profile_photo_url must be an https:// URL (or left empty).`);
    }

    const kyc = maker.payout_kyc;
    if (kyc) {
      if (kyc.pan !== undefined && kyc.pan !== "" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(kyc.pan.trim().toUpperCase())) {
        errors.push(`${label}: payout_kyc.pan "${kyc.pan}" is not a valid PAN (AAAAA0000A).`);
      }
      if (kyc.bank_ifsc !== undefined && kyc.bank_ifsc !== "" && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(kyc.bank_ifsc.trim().toUpperCase())) {
        errors.push(`${label}: payout_kyc.bank_ifsc "${kyc.bank_ifsc}" is not a valid IFSC (XXXX0######).`);
      }
    }

    (maker.products ?? []).forEach((product, pIndex) => {
      const pLabel = `${label} product #${pIndex + 1}`;
      if (typeof product.name !== "string" || product.name.trim().length === 0 || PLACEHOLDER_PATTERN.test(product.name)) {
        errors.push(`${pLabel}: "name" is missing or placeholder.`);
      }
      if (typeof product.description !== "string" || product.description.trim().length === 0) {
        errors.push(`${pLabel}: "description" is missing.`);
      }
      if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price <= 0 || product.price > 1_000_000) {
        errors.push(`${pLabel}: price must be a positive number in rupees.`);
      }
      if (!Number.isInteger(product.stock) || product.stock < 0) {
        errors.push(`${pLabel}: stock must be a whole number >= 0.`);
      }
      if (typeof product.category !== "string" || !CATEGORY_PATTERN.test(product.category)) {
        errors.push(`${pLabel}: category "${product.category}" is not a slug like "spices".`);
      } else if (!knownCategories.has(product.category)) {
        errors.push(
          `${pLabel}: category slug "${product.category}" does not exist yet — add it in the admin console (Categories) first.`,
        );
      }
      for (const tag of product.tags ?? []) {
        if (!(BADGE_TAGS as readonly string[]).includes(tag)) {
          errors.push(`${pLabel}: tag "${tag}" is not one of the exact badge strings (${BADGE_TAGS.join(" · ")}).`);
        }
      }
      const images = product.images ?? [];
      if (images.some((url) => !/^https:\/\//.test(url))) {
        errors.push(`${pLabel}: every image must be an https:// URL.`);
      }
      if (images.length === 0 && product.approve_immediately) {
        errors.push(
          `${pLabel}: approve_immediately needs at least one photo — listings ship with real pictures, not blanks.`,
        );
      }
    });
  });

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Live helpers.
// ---------------------------------------------------------------------------

async function findAuthUserIdByEmail(
  client: SupabaseClient,
  email: string,
): Promise<string | null> {
  const needle = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Auth user lookup failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((user) => (user.email ?? "").toLowerCase() === needle);
    if (hit) return hit.id;
    if (users.length < 200) return null;
  }
  return null;
}

interface MakerSeedResult {
  businessName: string;
  email: string;
  sellerId: string | null;
  productsPlanned: number;
  productsInserted: number;
  productsSkipped: number;
  pendingListings: number;
  dryRun: boolean;
}

async function seedMaker(
  client: SupabaseClient,
  maker: LaunchMakerInput,
  dryRun: boolean,
): Promise<MakerSeedResult> {
  const result: MakerSeedResult = {
    businessName: maker.business_name.trim(),
    email: maker.email.trim(),
    sellerId: null,
    productsPlanned: (maker.products ?? []).length,
    productsInserted: 0,
    productsSkipped: 0,
    pendingListings: 0,
    dryRun,
  };

  const name = maker.name.trim();
  const phone = maker.phone.trim();

  // 1. Auth account (email confirmed — no confirmation email round-trip).
  let authUserId = await findAuthUserIdByEmail(client, maker.email);
  if (!authUserId && !dryRun) {
    const { data, error } = await client.auth.admin.createUser({
      email: maker.email.trim(),
      password: maker.password,
      email_confirm: true,
      user_metadata: { name, phone },
    });
    if (error) {
      if (!/already|registered|exists/i.test(error.message)) {
        throw new Error(`Auth account for ${maker.email} failed: ${error.message}`);
      }
      authUserId = await findAuthUserIdByEmail(client, maker.email);
      if (!authUserId) throw new Error(`Auth account for ${maker.email} could not be created or found.`);
    } else {
      authUserId = data.user?.id ?? null;
    }
  }
  if (!authUserId) {
    // Dry-run on a fresh email: report the plan and stop here.
    console.log(`  · would create the auth account for ${maker.email}`);
    return result;
  }

  // 2. Profile row (0014 already created it on insert — align role/phone now,
  //    the same service-role update POST /api/sellers performs).
  const existingProfile = await client
    .from("users")
    .select("id, role, email, phone")
    .eq("id", authUserId)
    .maybeSingle();
  if (!existingProfile.error && existingProfile.data) {
    const profile = existingProfile.data as { id: string; role: string; email: string; phone: string };
    if (profile.role === "buyer") {
      console.log(
        `  · note: ${maker.email} existed as a buyer — promoting the account to maker (rehearsal sheet owns this email).`,
      );
    }
  }
  if (!dryRun) {
    const { error } = await client
      .from("users")
      .upsert({ id: authUserId, name, email: maker.email.trim(), phone, role: "seller" }, { onConflict: "id" });
    if (error) throw new Error(`Profile row for ${maker.email} failed: ${error.message}`);
  }

  // 3. Seller store — lifecycle columns never self-approve.
  const existingSeller = await client
    .from("sellers")
    .select("id, business_name")
    .eq("user_id", authUserId)
    .maybeSingle();
  if (existingSeller.error) throw new Error(`Seller lookup for ${maker.email} failed: ${existingSeller.error.message}`);

  const sellerFields = {
    business_name: maker.business_name.trim(),
    story: maker.story.trim(),
    profile_photo_url: maker.profile_photo_url?.trim() ?? "",
    address: maker.address.trim(),
    lat: maker.lat,
    lng: maker.lng,
    whatsapp_number: maker.whatsapp_number.trim(),
  };

  if (existingSeller.data) {
    result.sellerId = (existingSeller.data as { id: string }).id;
    if (!dryRun) {
      const { error } = await client.from("sellers").update(sellerFields).eq("id", result.sellerId);
      if (error) throw new Error(`Seller update for ${maker.email} failed: ${error.message}`);
    }
    console.log(
      `  · store already existed${dryRun ? " (would refresh store details" : " — store details refreshed"}; verification state untouched`,
    );
  } else if (dryRun) {
    console.log("  · would create the maker store as PENDING (admin console approves it)");
  } else {
    const { data, error } = await client
      .from("sellers")
      .insert({
        user_id: authUserId,
        ...sellerFields,
        is_verified: false,
        kyc_status: "not_started",
        application_status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(`Seller insert for ${maker.email} failed: ${error.message}`);
    result.sellerId = (data as { id: string }).id;
  }

  // In a dry run over an existing auth account the store row may not exist
  // yet — look it up so the optional steps below still read the right row.
  let sellerId: string | null = result.sellerId;
  if (!sellerId && authUserId) {
    const { data } = await client.from("sellers").select("id").eq("user_id", authUserId).maybeSingle();
    sellerId = data ? (data as { id: string }).id : null;
    result.sellerId = sellerId;
  }

  // 4. Optional payout KYC into the private table (0006).
  const kyc = maker.payout_kyc;
  if (sellerId && kyc) {
    const kycRow = {
      seller_id: sellerId,
      pan: kyc.pan?.trim().toUpperCase() || null,
      bank_account_number: kyc.bank_account_number?.trim() || null,
      bank_ifsc: kyc.bank_ifsc?.trim().toUpperCase() || null,
      bank_account_holder: kyc.bank_account_holder?.trim() || maker.business_name.trim(),
    };
    if (dryRun) {
      console.log("  · would upsert the payout KYC row (private seller_payout_kyc table)");
    } else {
      const { error } = await client.from("seller_payout_kyc").upsert(kycRow, { onConflict: "seller_id" });
      if (error) console.warn(`  · payout KYC could not be stored (is 0006 applied?): ${error.message}`);
    }
  }

  // 5. Products — pending unless explicitly approved AND photographed.
  if (sellerId) {
    const existingProducts = await client
      .from("products")
      .select("id, name")
      .eq("seller_id", sellerId);
    if (existingProducts.error) throw new Error(`Product lookup for ${maker.email} failed: ${existingProducts.error.message}`);
    const knownNames = new Set(
      (existingProducts.data ?? []).map((row) => (row as { name: string }).name.trim().toLowerCase()),
    );

    for (const product of maker.products ?? []) {
      const productName = product.name.trim();
      if (knownNames.has(productName.toLowerCase())) {
        result.productsSkipped += 1;
        console.log(`  · listing "${productName}" already exists — skipped`);
        continue;
      }
      const images = product.images ?? [];
      const status =
        images.length === 0
          ? "pending" // no photo yet — the maker uploads one via their dashboard first
          : product.approve_immediately
            ? "approved"
            : "pending";
      if (status === "pending") result.pendingListings += 1;

      if (dryRun) {
        console.log(`  · would add listing "${productName}" (${status}) — ₹${product.price}`);
        continue;
      }

      const { error } = await client.from("products").insert({
        seller_id: sellerId,
        name: productName,
        description: product.description.trim(),
        price: product.price,
        category: product.category,
        images,
        tags: product.tags ?? [],
        stock: product.stock,
        is_available: true,
        origin_details: product.origin_details?.trim() ?? "",
        status,
        base_price: product.price,
        commission: 0,
        lat: maker.lat,
        lng: maker.lng,
        address: maker.address.trim(),
      });
      if (error) throw new Error(`Listing "${productName}" failed: ${error.message}`);
      result.productsInserted += 1;
      console.log(`  · listing "${productName}" added (${status})`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputFlagIndex = args.indexOf("--input");
  const inputPath =
    inputFlagIndex >= 0 && args[inputFlagIndex + 1]
      ? path.resolve(args[inputFlagIndex + 1])
      : path.resolve(process.cwd(), "scripts", "launch-makers.json");

  console.log("\nMADETRUE — launch rehearsal seeding (Phase 10 · Step 5)");
  console.log("=".repeat(58));
  console.log(`Mode: ${dryRun ? "DRY RUN (nothing is written)" : "LIVE — writes to the Supabase project"}`);
  console.log(`Sheet: ${inputPath}`);

  loadEnvFile(path.resolve(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "\n⏭️  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — add them to .env.local (see .env.example).",
    );
    process.exitCode = 2;
    return;
  }
  if (process.env.MADETRUE_DATA_SOURCE === "mock") {
    console.warn(
      "\n⚠️  MADETRUE_DATA_SOURCE is 'mock' — the app will not show seeded rows until the switch is 'supabase'.",
    );
  }

  if (!fs.existsSync(inputPath)) {
    console.error(
      `\n⏭️  No launch-maker sheet at ${inputPath}.\n` +
        "    Copy scripts/launch-makers.template.json, fill in REAL maker details, then re-run.\n" +
        "    Field-by-field guidance: docs/launch-rehearsal.md (Part B).",
    );
    process.exitCode = 2;
    return;
  }

  let sheet: LaunchMakerSheet;
  try {
    sheet = JSON.parse(fs.readFileSync(inputPath, "utf8")) as LaunchMakerSheet;
  } catch (err) {
    console.error(`\n❌ The sheet is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
    return;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Live category slugs so bad FK references fail here, not mid-insert.
  const { data: categoryRows, error: categoryError } = await client.from("categories").select("slug");
  if (categoryError) {
    console.error(`\n❌ Category lookup failed: ${categoryError.message}`);
    process.exitCode = 1;
    return;
  }
  const knownCategories = new Set((categoryRows ?? []).map((row) => (row as { slug: string }).slug));
  console.log(`Categories live: ${[...knownCategories].sort().join(", ") || "(none)"}\n`);

  const { errors, warnings } = collectErrors(sheet, knownCategories);
  for (const warning of warnings) console.warn(`⚠️  ${warning}`);
  if (errors.length > 0) {
    console.error(`\n❌ The sheet failed validation — nothing was written:\n`);
    for (const error of errors) console.error(`  · ${error}`);
    console.error("\n   Fix the sheet (template + rules: docs/launch-rehearsal.md Part B) and re-run.");
    process.exitCode = 2;
    return;
  }
  if (warnings.length === 0) console.log("Sheet validation: clean.\n");

  const results: MakerSeedResult[] = [];
  for (const maker of sheet.makers) {
    console.log(`\n▶ ${maker.business_name.trim()} <${maker.email.trim()}>`);
    try {
      results.push(await seedMaker(client, maker, dryRun));
    } catch (err) {
      console.error(`\n❌ ${err instanceof Error ? err.message : String(err)}`);
      console.error("   Stopping before the remaining makers — fix and re-run (already-seeded rows are reused).");
      process.exitCode = 1;
      return;
    }
  }

  console.log("\n" + "=".repeat(58));
  console.log(`${dryRun ? "Dry run complete — nothing written." : "Seeding complete."} Summary:\n`);
  for (const result of results) {
    console.log(
      `  ${result.businessName} <${result.email}> — ` +
        `store ${result.sellerId ?? "(pending creation)"}, listings ` +
        `${result.dryRun ? `${result.productsPlanned} planned` : `${result.productsInserted} added, ${result.productsSkipped} skipped`}` +
        (result.pendingListings > 0 ? `, ${result.pendingListings} awaiting photos/approval` : ""),
    );
  }
  console.log(
    "\nNext: Part C of docs/launch-rehearsal.md — approve the applications in the admin console,\n" +
      "walk the full order lifecycle, then record the restore drill (Part D).",
  );
  if (!dryRun) {
    console.log(
      "\nCredentials: passwords live only in the git-ignored sheet — never commit it, never paste it into chat.",
    );
  }
  console.log("");
  process.exitCode = 0;
}

// Safety net: if a keep-alive socket ever keeps the loop ref'd, bail after
// five seconds with the code already set. Unref'd, so a clean drain exits
// sooner and the timer never fires.
main()
  .then(() => {
    const bail = setTimeout(() => process.exit(process.exitCode ?? 0), 5000);
    bail.unref();
  })
  .catch((err) => {
    console.error(`\n❌ Unexpected failure: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
    process.exit(1);
  });
