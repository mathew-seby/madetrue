-- MADETRUE — 0013_notification_delivery_logs.sql
-- Phase 7 Step 6: Notification delivery log & retry audit
--
-- Logs every automated WhatsApp update, sandbox send, and status notification.
-- Tracks delivery states ('delivered' | 'failed' | 'fallback'), provider message
-- references, honest failure reasons, and retry attempts.

create table if not exists public.notification_logs (
  id text primary key default gen_random_uuid()::text,
  order_id text references public.orders(id) on delete set null,
  recipient_phone text not null,
  recipient_role text not null default 'buyer',
  event text not null,
  channel text not null default 'whatsapp',
  provider text not null default 'none',
  status text not null, -- 'delivered' | 'failed' | 'fallback'
  provider_ref text,
  error_message text,
  retry_count integer not null default 0,
  last_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  body text not null
);

create index if not exists notification_logs_order_id_idx on public.notification_logs(order_id);
create index if not exists notification_logs_created_at_idx on public.notification_logs(created_at desc);

-- RLS: Only admins (or server service_role) can query delivery logs.
alter table public.notification_logs enable row level security;

create policy notification_logs_read_admin
  on public.notification_logs
  for select
  to authenticated
  using (public.is_admin());

create policy notification_logs_all_admin
  on public.notification_logs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

