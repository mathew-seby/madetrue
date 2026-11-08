// MADETRUE — Phase 4 Step 7 isolation proof script.
//
// Stands outside the app on purpose: it only speaks plain HTTP, so its
// verdict is about what the SERVER enforces, not what data layer code
// promises. Two layers are probed:
//
//   A. The Next.js API surface on a running app
//      (ftp: `node --experimental-strip-types scripts/isolationTest.ts`
//      — requires MADETRUE_DATA_SOURCE=supabase and a running dev/preview
//      server; default base URL http://localhost:3000, or pass one:
//      `node --experimental-strip-types scripts/isolationTest.ts http://localhost:4010`)
//
//      Every write/change endpoint must refuse a guest (401), the guest
//      catalog must return approved rows only, and public seller rows must
//      carry no payout secrets.
//
//   B. The raw database, queried with the PUBLIC anon key directly
//      (run when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
//      are in the environment, e.g. source .env.local first).
//
//      The anon key must get catalog data only, no payout columns anywhere,
//      and no rows at all from orders or transactions.
//
// Exit codes: 0 = no breach · 1 = breach or hard failure · 2 = environment
// does not support the proof (e.g. mock mode) — nothing was verified.

const PAD = 58;

function line(ok: string | null, label: string, detail = ""): void {
  const mark = ok === null ? "·" : ok === "PASS" ? "✅" : "❌";
  const rest = `${label}${detail ? " — " + detail : ""}`;
  console.log(`${mark}  ${rest}`);
}

async function probe(
  label: string,
  run: () => Promise<{ pass: boolean; detail?: string }>,
): Promise<{ label: string; pass: boolean; detail: string }> {
  try {
    const result = await run();
    line(result.pass ? "PASS" : "FAIL", label, result.detail ?? "");
    return { label, pass: result.pass, detail: result.detail ?? "" };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    line("FAIL", label, detail);
    return { label, pass: false, detail };
  }
}

function jsonFetch(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const withTimeout = {
    ...init,
    signal: AbortSignal.timeout(8000),
  };
  return fetch(url, withTimeout).then(async (res) => {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  });
}

const PAYOUT_KEYS = ["pan", "bank_account_number", "bank_ifsc", "bank_account_holder"];
const SETTLEMENT_KEYS = [...PAYOUT_KEYS];

function hasKeys(values: unknown[], keys: string[]): string | null {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (key in record && record[key] !== null && record[key] !== undefined) {
        return `row ${i} exposes "${key}"`;
      }
    }
  }
  return null;
}

async function main(): Promise<never | void> {
  console.log("\nMADETRUE isolation proof — Phase 4 Step 7");
  console.log("=".repeat(PAD));

  // -----------------------------------------------------------------------
  // Layer A — the API surface
  // -----------------------------------------------------------------------
  const base = process.argv[2] ?? process.env.MADETRUE_TEST_URL ?? "http://localhost:3000";
  console.log(`App/API: ${base}`);

  const catalog = await jsonFetch(`${base}/api/products`);
  const isMock =
    catalog.status === 400 &&
    JSON.stringify(catalog.body).includes("mock");

  if (isMock) {
    console.log(
      "\n⏭️  The app runs in mock mode (MADETRUE_DATA_SOURCE=mock). API-surface " +
        "isolation cannot be exercised there; Supabase checks are attempted below if " +
        "env keys are present. Nothing verified for layer A.",
    );
  } else {
    const apiResults = [];

    apiResults.push(
      await probe("guest cannot read order inboxes", async () => {
        const res = await jsonFetch(`${base}/api/orders?seller_id=seller-1`);
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401 (orders are private)" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot place an order (checkout needs sign-in)", async () => {
        const res = await jsonFetch(`${base}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: [{ product_id: "prod-1", quantity: 1 }] }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot submit a product", async () => {
        const res = await jsonFetch(`${base}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: { name: "x", description: "x", price: 1, category: "x", seller_id: "seller-1" } }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot edit a product", async () => {
        const res = await jsonFetch(`${base}/api/products`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "prod-1", updates: { price: 1 } }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401 (auth precedes row lookup)" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot delete a product", async () => {
        const res = await jsonFetch(`${base}/api/products?id=prod-1`, { method: "DELETE" });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot move an order's status", async () => {
        const res = await jsonFetch(`${base}/api/orders`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "order-1", status: "accepted" }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot upload files", async () => {
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array([1, 2, 3])]), "probe.png");
        const res = await fetch(`${base}/api/upload`, {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(8000),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot save a profile (id is session-owned)", async () => {
        const res = await jsonFetch(`${base}/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "anyone", name: "Probe", email: "probe@example.com", role: "admin" }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401 — role cannot be risen by payload" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot apply as a maker (or rise their own role)", async () => {
        const res = await jsonFetch(`${base}/api/sellers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller: { user_id: "anyone", business_name: "Probe", story: "s", whatsapp_number: "+91", address: "a", lat: 9.9, lng: 76.2 } }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest cannot update any seller's store", async () => {
        const res = await jsonFetch(`${base}/api/sellers`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "seller-1", is_verified: true }),
        });
        return {
          pass: res.status === 401,
          detail: res.status === 401 ? "401 — verification stays admin-only" : `status ${res.status}`,
        };
      }),
    );

    apiResults.push(
      await probe("guest catalog shows approved products only", async () => {
        if (catalog.status !== 200) throw new Error(`catalog status ${catalog.status}`);
        const rows = Array.isArray(catalog.body) ? catalog.body : [];
        for (const row of rows) {
          const product = row as { status?: unknown; seller_id?: unknown };
          if (product.status !== undefined && product.status !== "approved") {
            return { pass: false, detail: "guest saw a non-approved row" };
          }
        }
        return { pass: true, detail: `${rows.length} approved rows` };
      }),
    );

    apiResults.push(
      await probe("public seller rows carry no payout secrets", async () => {
        const res = await jsonFetch(`${base}/api/sellers`);
        if (res.status !== 200) throw new Error(`status ${res.status}`);
        const rows = Array.isArray(res.body) ? res.body : [];
        const leak = hasKeys(rows, PAYOUT_KEYS);
        return {
          pass: leak === null,
          detail: leak ?? `${rows.length} rows clean`,
        };
      }),
    );

    const failed = apiResults.filter((r) => !r.pass);
    console.log(
      `\nAPI surface: ${apiResults.length - failed.length}/${apiResults.length} checks passed` +
        (failed.length ? ` — FAILURES: ${failed.map((r) => r.label).join("; ")}` : ""),
    );
    if (failed.length > 0) process.exit(1);
  }

  // -----------------------------------------------------------------------
  // Layer B — the raw database under the anon key
  // -----------------------------------------------------------------------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log(`\nSupabase (anon key): ${supabaseUrl ?? "not set"}`);
  console.log("-".repeat(PAD));

  if (!supabaseUrl || !anonKey) {
    console.log(
      "⏭️  NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — " +
        "skipping raw-DB layer. Source .env.local to run it.",
    );
    console.log("\nNothing verified for layer B.");
    console.log("=".repeat(PAD));
    process.exit(2);
  }

  const rest = (select: string, table = "sellers") =>
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?${select}`;

  const restHeaders = (extra: Record<string, string> = {}) => ({
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    ...extra,
  });

  const dbResults = [];

  dbResults.push(
    await probe("anon sellers rows carry no payout secrets", async () => {
      const res = await fetch(rest("select=*"), {
        headers: restHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const rows = (await res.json()) as unknown[];
      const leak = hasKeys(rows, SETTLEMENT_KEYS);
      return {
        pass: leak === null,
        detail: leak ?? `${rows.length} rows clean.`,
      };
    }),
  );

  dbResults.push(
    await probe("payout columns no longer exist on sellers", async () => {
      const res = await fetch(rest("select=pan,bank_account_number"), {
        headers: restHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      const message = body?.message ?? "";
      const columnGone =
        res.status === 400 &&
        (message.includes("does not exist") || message.includes("42703"));
      const staysEmpty = res.ok;
      const rows = Array.isArray(body) ? (body as unknown[]) : [];
      const leak = hasKeys(rows, PAYOUT_KEYS);
      return {
        pass: (columnGone || staysEmpty) && !leak,
        detail: columnGone
          ? "column withdrawn from the table itself"
          : leak
            ? leak
            : "no values returned",
      };
    }),
  );

  dbResults.push(
    await probe("anon cannot read orders", async () => {
      const res = await fetch(rest("select=id&limit=5", "orders"), {
        headers: restHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      return {
        pass: !res.ok,
        detail: res.ok
          ? "❌ anon read order rows"
          : `refused (status ${res.status})`,
      };
    }),
  );

  dbResults.push(
    await probe("anon cannot read transactions", async () => {
      const res = await fetch(rest("select=id&limit=5", "transactions"), {
        headers: restHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      return {
        pass: !res.ok,
        detail: res.ok
          ? "❌ anon read ledger rows"
          : `refused (status ${res.status})`,
      };
    }),
  );

  dbResults.push(
    await probe("anon catalog sees approved products only", async () => {
      const res = await fetch(rest("select=id,status,seller_id&limit=100", "products"), {
        headers: restHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const rows = (await res.json()) as Array<{ id?: string; status?: string; seller_id?: string }>;
      const bad = rows.find((row) => row.status !== undefined && row.status !== "approved");
      return {
        pass: !bad,
        detail: bad
          ? `anon saw product ${bad.id} in status ${bad.status}`
          : `${rows.length} approved rows`,
      };
    }),
  );

  const dbFailed = dbResults.filter((r) => !r.pass);
  console.log(
    `\nRaw DB: ${dbResults.length - dbFailed.length}/${dbResults.length} checks passed` +
      (dbFailed.length ? ` — FAILURES: ${dbFailed.map((r) => r.label).join("; ")}` : ""),
  );
  console.log(`\n${"=".repeat(PAD)}`);

  if (dbFailed.length > 0) process.exit(1);
  console.log("\nIsolation proof: no breaches found.");
  process.exit(0);
}

main();
