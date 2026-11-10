-- MADETRUE — 0012_order_cancellations.sql
-- Phase 7 Step 5: Order cancellations workflow (request → approve → refund)
--
-- Adds columns to public.orders for tracking buyer cancellation requests,
-- reasons, timestamps, and maker/admin rejection notes.

alter table public.orders
  add column if not exists cancel_requested boolean not null default false,
  add column if not exists cancel_reason text,
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists cancel_rejected_reason text;

-- Index for maker dashboard and admin console to quickly surface pending cancellation requests
create index if not exists orders_cancel_requested_idx
  on public.orders (cancel_requested)
  where cancel_requested = true;

