# MADETRUE — Backup and Disaster Recovery Runbook

> **Document Version:** 1.0.0  
> **Target Environment:** Supabase Postgres + Storage (Production & Staging)  
> **Recovery Targets:** Recovery Point Objective (RPO) < 1 Hour · Recovery Time Objective (RTO) < 30 Minutes  

---

## 1. Executive Summary & Strategy

MADETRUE operates a hyperlocal marketplace connecting independent Kerala producers with consumers. Protecting order histories, transactions, seller store listings, and payout KYC information against data corruption, hardware failure, or human error is vital to community trust and regulatory compliance (DPDP Act, Indian financial guidelines).

The disaster recovery architecture relies on a **three-tier redundancy strategy**:
1. **Automated Continuous Physical Backups (Managed Tier):** Supabase continuous WAL (Write-Ahead Logging) archiving with Point-in-Time Recovery (PITR) and daily full snapshots.
2. **Deterministic Declarative Schema Backups (Code Tier):** Sequential versioned SQL migrations (`supabase/migrations/0001_init.sql` through `0013_notification_delivery_logs.sql`) and catalog seed scripts (`supabase/seed.sql`) version-controlled directly in Git.
3. **On-Demand Logical Snapshots (Operator Tier):** Periodic manual or pre-migration logical dumps via `pg_dump` / Supabase CLI storing schema and table data off-site.

---

## 2. Protected Data Assets

| Data Asset | Storage Engine | Sensitivity | Backup Mechanism |
|---|---|---|---|
| **Users & Authentication** | Supabase Auth (`auth.users`) + `public.users` | High (PII) | Continuous WAL + Daily Snapshot |
| **Seller Profiles & Stores** | `public.sellers` | Public / Medium | Continuous WAL + Code Seed |
| **Private Payout KYC** | `public.seller_payout_kyc` (private isolated table) | Critical (Financial) | Continuous WAL + Daily Snapshot (Service Role Only) |
| **Catalog & Categories** | `public.products`, `public.categories` | Medium | Continuous WAL + Seed SQL |
| **Orders & Fulfillment** | `public.orders` (5-state lifecycle + cancellation flags) | Critical (Operations) | Continuous WAL + Daily Snapshot |
| **Financial Ledger** | `public.transactions` (payments, refunds, splits) | Critical (Financial) | Continuous WAL + Daily Snapshot |
| **Audit Trails** | `public.admin_audit` | High (Compliance) | Continuous WAL + Daily Snapshot |
| **Notification Logs** | `public.notification_logs` | Medium | Continuous WAL + Daily Snapshot |
| **Product Media** | Supabase Storage (`product-images` bucket) | Low / Medium | S3-compatible multi-zone redundancy |

---

## 3. Automated Backup Configuration (Supabase Managed Tier)

### 3.1 Point-in-Time Recovery (PITR)
- **Status:** Enabled on Production Database.
- **Granularity:** Second-by-second rollbacks up to 7 days (or 30 days on Pro/Team tier).
- **Use Case:** Recovery from accidental mass updates, bad migrations, or database corruption.
- **Procedure:**
  1. Open the [Supabase Dashboard](https://supabase.com/dashboard) → Project `Settings` → `Database` → `Backups`.
  2. Select **Point in Time**.
  3. Specify the exact timestamp (UTC) immediately preceding the incident.
  4. Confirm the restore target. Supabase provisions a restored clone or rolls back the active instance.

### 3.2 Scheduled Daily Snapshots
- Supabase automatically takes full physical backups every 24 hours.
- Retained for minimum 7 days on standard projects.
- One-click restore available directly in the Supabase management console.

---

## 4. Operator Runbook: On-Demand Logical Backups (`pg_dump`)

Before applying major database migrations or infrastructure changes, operators should generate a full logical dump.

### 4.1 Full Database Logical Dump
Run using the standard PostgreSQL connection string from `.env.local`:

```bash
# Set your Supabase database connection string
# (Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres)
export DB_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# Timestamped schema + data backup
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
pg_dump "$DB_URL" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --exclude-schema "extensions" \
  --no-owner \
  --no-privileges \
  -F p -f "backup_madetrue_${BACKUP_TIMESTAMP}.sql"

echo "✅ Backup written to backup_madetrue_${BACKUP_TIMESTAMP}.sql"
```

### 4.2 Schema-Only Export (Verification / Staging)
```bash
pg_dump "$DB_URL" --schema-only -F p -f "schema_snapshot_${BACKUP_TIMESTAMP}.sql"
```

### 4.3 Data-Only Export of Critical Financial Tables
```bash
pg_dump "$DB_URL" \
  --data-only \
  -t "public.orders" \
  -t "public.transactions" \
  -t "public.seller_payout_kyc" \
  -t "public.admin_audit" \
  -F p -f "critical_financial_data_${BACKUP_TIMESTAMP}.sql"
```

---

## 5. Media & Storage Backup (Product Images)

Product images uploaded to the `product-images` bucket are stored in Supabase Storage with automatic object replication.

To create an off-site mirror:
```bash
# Using AWS CLI with Supabase S3-compatible credentials
aws s3 sync \
  s3://product-images \
  ./backup_product_images/ \
  --endpoint-url "https://[PROJECT-REF].supabase.co/storage/v1/s3"
```

---

## 6. Disaster Recovery Procedures

### Scenario A: Accidental Data Deletion (Single Table / Row)
1. **Assess:** Identify the exact time of deletion and affected table(s).
2. **Execute PITR Clone:** In Supabase Dashboard, create a temporary restored clone at timestamp `T - 2 minutes`.
3. **Extract Missing Rows:** Query the clone for the missing records and export as SQL insert statements.
4. **Apply to Production:** Execute the exported SQL insert on production database via SQL Editor.
5. **Verify:** Check application UI and run `scripts/verifyBackups.ts`.

### Scenario B: Complete Project Outage or Project Recreation
If the entire Supabase project must be rebuilt from scratch:
1. **Provision New Project:** Create a fresh Supabase project in the nearest region (e.g., `ap-south-1` Mumbai for Kerala).
2. **Apply Migrations in Strict Sequence:**
   Execute all migrations sequentially in the SQL Editor or via Supabase CLI:
   - `0001_init.sql` (Schema, Enums, Transactions)
   - `0002_rls.sql` (Security rules)
   - `0003_user_address.sql`
   - `0004_seller_payout_kyc.sql`
   - `0005_product_images_storage.sql`
   - `0006_payout_privacy_and_stock_rpc.sql`
   - `0007_seller_application_status.sql`
   - `0008_product_moderation.sql`
   - `0009_admin_audit.sql`
   - `0010_order_lifecycle.sql`
   - `0011_order_status_backfill.sql`
   - `0012_order_cancellations.sql`
   - `0013_notification_delivery_logs.sql`
3. **Restore Data:** Import the latest logical dump or PITR export.
4. **Update Credentials:** Update `.env.local` / Vercel Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. **Redeploy & Smoke Test:** Run `scripts/verifyBackups.ts` and verify site checkout and dashboard flows.

---

## 7. Automated Verification Script

Run the automated verification suite to audit migration sequencing, table existence, and backup readiness:

```bash
npx tsx scripts/verifyBackups.ts
```

Output checks:
- All 13 migrations sequentially present and valid SQL.
- `supabase/seed.sql` integrity and table coverage.
- Rate-limiting rules and throttles active.
- Disaster recovery checklist verification.

