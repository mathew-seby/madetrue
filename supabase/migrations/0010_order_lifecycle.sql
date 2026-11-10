-- MADETRUE — 0010_order_lifecycle.sql
-- Phase 7 Step 1. The order lifecycle:
--
--   pending → accepted → ready → delivered
--      └──────────┴─────────┴────→ cancelled
--
-- Run this file, then run 0011_order_status_backfill.sql in a SECOND
-- execution. Postgres will not let a new enum value be used in the same
-- transaction that adds it, and the Supabase SQL editor may run a whole
-- script as one transaction.
--
-- `completed` is retired but stays in the enum: Postgres has no clean
-- "drop enum value". Every read path normalises it to `delivered`
-- (normalizeOrderStatus in lib/utils/orderStatus.ts), and the trigger below
-- refuses any write that moves an order INTO `completed`.
--
-- Why a trigger: 0002's guard_order_write pins the fields a maker may not
-- touch but deliberately leaves `status` to the app. That was fine while the
-- API was the only writer; from Phase 7 the database enforces the machine
-- itself, so a raw REST call cannot skip `ready` or un-deliver an order.

-- ---------------------------------------------------------------------------
-- 1. New enum values
-- ---------------------------------------------------------------------------
alter type public.order_status add value if not exists 'ready';
alter type public.order_status add value if not exists 'delivered';

-- ---------------------------------------------------------------------------
-- 2. Transition guard
-- ---------------------------------------------------------------------------
create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed text[];
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- One-way door for legacy rows: 0011 backfills completed → delivered.
  if old.status::text = 'completed' then
    if new.status::text = 'delivered' then
      return new;
    end if;
    raise exception
      'Order % is in the retired "completed" state; only "delivered" is allowed.',
      old.id;
  end if;

  if new.status::text = 'completed' then
    raise exception '"completed" is retired — use "delivered".';
  end if;

  allowed := case old.status::text
    when 'pending'  then array['accepted', 'cancelled']
    when 'accepted' then array['ready', 'cancelled']
    when 'ready'    then array['delivered', 'cancelled']
    else null
  end;

  if allowed is null or not (new.status::text = any(allowed)) then
    raise exception
      'Order % cannot move from "%" to "%". Allowed next steps: %.',
      old.id,
      old.status::text,
      new.status::text,
      coalesce(array_to_string(allowed, ', '), 'none — terminal state');
  end if;

  return new;
end;
$$;

drop trigger if exists orders_status_transition_guard on public.orders;

create trigger orders_status_transition_guard
  before update of status on public.orders
  for each row
  execute function public.guard_order_status_transition();

revoke all on function public.guard_order_status_transition()
  from public, anon, authenticated;
