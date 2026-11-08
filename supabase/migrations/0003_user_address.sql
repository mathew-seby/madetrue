-- MADETRUE — 0003_user_address.sql
-- Phase 3 Step 5: Add address column to public.users table for persistent user profile delivery addresses.

alter table public.users add column if not exists address text;

