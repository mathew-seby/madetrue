-- admin_audit (Phase 5 Step 7): durable console moderation trail.
-- One row per admin action: actor (session-stamped), entity, and a
-- human "before → after" summary. The console appends through the
-- admin-guarded /api/audit route under the service role; the table
-- itself stays server-only — the same posture 0006 gave
-- seller_payout_kyc: RLS enabled, no anon/authenticated policies or
-- grants, so no raw REST caller can read or forge rows.

create table public.admin_audit (
  id text primary key default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  actor_id text not null,
  actor_name text not null default '',
  actor_email text not null default '',
  entity_type text not null
    check (entity_type in ('product', 'seller', 'order', 'category')),
  entity_id text not null,
  entity_label text not null default '',
  action text not null,
  summary text not null
);

create index admin_audit_created_at_idx
  on public.admin_audit (created_at desc);

alter table public.admin_audit enable row level security;

revoke all on public.admin_audit from anon, authenticated, service_role;
grant all on public.admin_audit to service_role;

-- No RLS policies on purpose: without one, only the service role (the
-- server routes) reaches the table at all. Console reads and appends
-- stay behind the admin session guard in /api/audit.
