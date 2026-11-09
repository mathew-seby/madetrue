-- MADETRUE — 0008_product_moderation.sql
-- Phase 5 Step 3 — Admin console: product moderation.
--
-- ▸ What this adds
--   public.products gains two admin-facing moderation fields:
--     is_hidden        — a moderation overlay: the row still exists, the
--                        maker keeps it in their dashboard, but every
--                        public catalog surface drops it (listing grid,
--                        maker store pages, detail page, public API).
--                        Distinct from is_available ("paused/sold out",
--                        a maker's own switch) so admin concealment can
--                        never be undone by the maker and never conflates
--                        with marketplace semantics.
--     moderation_note  — the audit note a moderator attaches to the
--                        action (hide/unhide reason, rejection reason).
--                        Stored on the row so the maker sees WHY their
--                        listing disappeared (trust-first, transparent).
--                        Durable cross-action audit trail stays Step 7.
--
-- ▸ Public catalog reset
--   0002's products_public_or_own_read policy is recreated so the public
--   branch selects approved rows that are NOT hidden:
--     (status = 'approved' and not is_hidden) or own rows or admin.
--
-- ▸ Guard trigger extension
--   guard_product_review (0002) pins seller_id/status from clients — it
--   learns the two new columns: non-admin INSERTs get is_hidden=false /
--   note=null; non-admin UPDATEs have both pinned to old values, so a
--   maker cannot self-unhide (column-blind RLS closes at the trigger,
--   same pattern as sellers_guard_trust_fields).
--
-- ▸ Idempotency — guarded ADD COLUMN + guarded policy recreation; safe
--   to re-run.

-- ---------------------------------------------------------------------------
-- 1a. Columns (guarded)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'products'
       and column_name = 'is_hidden'
  ) then
    alter table public.products
      add column is_hidden boolean not null default false;
  end if;

  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'products'
       and column_name = 'moderation_note'
  ) then
    alter table public.products
      add column moderation_note text;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1b. Public catalog policy: hide respects moderation concealment
-- ---------------------------------------------------------------------------
drop policy if exists products_public_or_own_read
  on public.products;

create policy products_public_or_own_read
  on public.products
  for select
  to anon, authenticated
  using (
    (status = 'approved' and not is_hidden)
    or seller_id = public.current_seller_id()
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 1c. Review guard learns the moderation fields (recreate-or-replace keeps
--     the documented rules): submissions arrive moderated-by-default while
--     later maker edits can never touch the moderation overlay.
-- ---------------------------------------------------------------------------
create or replace function public.guard_product_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.is_hidden := false;
    new.moderation_note := null;
    return new;
  end if;

  if new.name is distinct from old.name
     or new.description is distinct from old.description
     or new.price is distinct from old.price
     or new.category is distinct from old.category
     or new.images is distinct from old.images
     or new.tags is distinct from old.tags
     or new.origin_details is distinct from old.origin_details
     or new.documents is distinct from old.documents
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.address is distinct from old.address
     or new.base_price is distinct from old.base_price
     or new.commission is distinct from old.commission
     or new.seller_id is distinct from old.seller_id then
    new.status := 'pending';
  else
    new.status := old.status;
  end if;

  new.seller_id := old.seller_id;
  new.is_hidden := old.is_hidden;
  new.moderation_note := old.moderation_note;
  return new;
end;
$$;
