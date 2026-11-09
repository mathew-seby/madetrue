-- MADETRUE — 0007_seller_application_status.sql
-- Phase 5 Step 2 — Admin console: seller management / application review.
--
-- ▸ What this adds
--   public.sellers gains an explicit admin-facing application lifecycle:
--     pending   = submitted, waiting in the moderation queue
--     approved  = vetted by a MADETRUE moderator (store is open)
--     rejected  = application declined (the maker may be contacted on
--                 WhatsApp and can re-apply)
--
--   Until now the marketplace only had `is_verified` (a boolean flip),
--   which could not express "declined, reapply later" or "reopened for
--   another look". `kyc_status` stays the PAYMENT gateway field
--   (Cashfree Easy Split, Phase 6) — marketplace verification and
--   gateway KYC remain separate concerns, exactly as seeded in 0001.
--
-- ▸ Honest derivation
--   Existing rows are backfilled from the only truth they carry:
--   `is_verified = true` → 'approved', else 'pending'. New maker
--   applications (app/api/sellers POST) insert 'pending' explicitly so
--   the default and the row always agree.
--
-- ▸ Write path
--   Only app/api/sellers PATCH (admin-checked, service role) and the
--   POST onboarding route change this column. RLS already lets a seller
--   update their own row, so column-level hardening (masking
--   application_status / is_verified / kyc_status from the owner-update
--   policy) remains a Phase-tier hardening item — the application layer
--   stays the enforcement point for now.
--
-- ▸ Idempotency
--   Safe to re-run: guarded ADD COLUMN, guarded constraint creation, and
--   a backfill that only touches rows still sitting on the default.

-- ---------------------------------------------------------------------------
-- 1a. Column (guarded for re-runs)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'sellers'
       and column_name = 'application_status'
  ) then
    alter table public.sellers
      add column application_status text not null default 'pending';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1b. Backfill: verification granted so far means the application was
--     approved.
-- ---------------------------------------------------------------------------
update public.sellers
   set application_status = 'approved'
 where is_verified = true
   and application_status = 'pending';

-- ---------------------------------------------------------------------------
-- 1c. Whitespace + case safety before the constraint: normalize stray
--     values to the closest legal state (nothing writes beforehand, but
--     hand-edits in the SQL editor would otherwise trip 1d).
-- ---------------------------------------------------------------------------
update public.sellers
   set application_status = lower(trim(application_status))
 where application_status is distinct from lower(trim(application_status));

-- ---------------------------------------------------------------------------
-- 1d. Constraint (guarded for re-runs)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'sellers_application_status_check'
       and conrelid = 'public.sellers'::regclass
  ) then
    alter table public.sellers
      add constraint sellers_application_status_check
      check (application_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;
