-- MADETRUE — 0004_seller_payout_kyc.sql
-- Phase 3 Step 6: Payout KYC columns on public.sellers for gateway vendor split settlements (Cashfree Easy Split).

alter table public.sellers
  add column if not exists pan text,
  add column if not exists bank_account_number text,
  add column if not exists bank_ifsc text,
  add column if not exists bank_account_holder text;

