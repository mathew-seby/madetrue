-- ============================================================================
-- 0014 — Profile rows guaranteed from auth signup (Phase 10 hotfix)
-- ============================================================================
-- Problem: sign-up created the Supabase Auth account, but the matching
-- public.users row was written by the app (POST /api/profile) immediately
-- after supabase.auth.signUp(). When "Confirm email" is enabled the signup
-- returns without a session, that call answers 401, and the profile row is
-- never created — sign-in then still works (login falls back to auth
-- metadata), but public.users stays empty and /profile/settings loses
-- address persistence.
--
-- Fix: a trigger on auth.users insert creates the profile row atomically
-- from raw_user_meta_data, so an account and its profile row always exist
-- together regardless of session/confirmation timing. A one-time backfill
-- repairs accounts that already exist without a row.
--
-- Notes:
-- - The SQL editor runs as `postgres`, which is required to attach a
--   trigger to auth.users and which guard_user_role (0002_rls.sql:85)
--   explicitly allows for role-pinned inserts. Inside this security
--   definer function current_user is postgres, so the guard passes.
-- - `on conflict do nothing` (no target) tolerates the id primary key and
--   the partial unique indexes on lower(email) / phone (0001_init.sql:99).
-- - Role is pinned to 'buyer' — never read from client metadata.
-- - Apply ONCE in the Supabase SQL editor (safe to re-run: idempotent).
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role)
  values (
    new.id::text,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Neighbour'),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'buyer'
  )
  on conflict do nothing;

  return new;
end;
$$;

-- Trigger functions stay off the API (PostgREST would otherwise expose them).
revoke all on function public.handle_new_auth_user() from public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- One-time backfill: create profile rows for auth accounts that predate
-- this trigger (idempotent on re-run thanks to on conflict do nothing).
insert into public.users (id, name, email, phone, role)
select
  u.id::text,
  coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), 'Neighbour'),
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  'buyer'
from auth.users u
on conflict do nothing;
