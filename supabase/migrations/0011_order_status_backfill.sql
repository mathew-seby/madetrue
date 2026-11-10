-- MADETRUE — 0011_order_status_backfill.sql
-- Phase 7 Step 1. Run AFTER 0010_order_lifecycle.sql, in a separate
-- execution (Postgres cannot use the new `delivered` value in the same
-- transaction that adds it).
--
-- Moves every legacy `completed` order to `delivered`. The transition guard
-- created in 0010 explicitly allows this one-way move. Re-running is safe:
-- once the table has no `completed` rows, the update touches nothing.

update public.orders
   set status = 'delivered'
 where status = 'completed';

-- Verification (run separately if you want a receipt; should return 0):
-- select count(*) from public.orders where status = 'completed';
