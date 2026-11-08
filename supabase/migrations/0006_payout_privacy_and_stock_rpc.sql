-- MADETRUE — 0006_payout_privacy_and_stock_rpc.sql
-- Phase 4 Step 7 — isolation close-out.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRIVATE PAYOUT PATH (closes the residual from the Step 5 hotfix)
--
-- Residual being closed: 0002_rls.sql:282 grants `anon` select on
-- public.sellers, and `sellers_public_read` (0002_rls.sql:345) lets every
-- authenticated user select any seller row. Rows therefore expose the
-- payout columns added by 0004 (pan, bank_account_number, bank_ifsc,
-- bank_account_holder) to anyone with the anon key — the service-side
-- PUBLIC_SELLER_COLUMNS hardfix cannot help a client that queries the raw
-- table.
--
-- Fix: payout secrets are NOT catalog data. They move into a dedicated
-- private table (public.seller_payout_kyc) with no grants to anon or
-- authenticated, no RLS policy, and RLS enabled — service_role alone
-- holds access (Supabase service_role carries BYPASSRLS plus the explicit
-- grants below). The API routes (app/api/sellers) write there server-side.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ATOMIC STOCK RPC (locks the checkout stock decrement)
--
-- Checkout previously decremented stock with read-then-guarded-update
-- (app/api/orders: two statements, lock-free bookkeeping between them).
-- Under two concurrent online buyers, both could pass the stock guard and
-- oversell. public.decrement_product_stock() performs the check and the
-- decrement inside one locked statement block (SELECT ... FOR UPDATE),
-- raising distinct SQLSTATEs the order route maps to friendly errors.
-- Only service_role may EXECUTE it.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Isolation matrix after this migration (combined with 0002_rls.sql):
--   anon:                catalog approved rows only (products, sellers,
--                        categories minus payout columns — none remain),
--                        never orders/transactions/payout secrets
--   authenticated buyer: own user row, catalog, own orders
--   authenticated seller: own seller row, own product rows (all statuses),
--                        own orders (seller side), never payout secrets of
--                        others
--   service_role:        sanctioned server paths only (API routes)
-- ─────────────────────────────────────────────────────────────────────────────

-- ---------------------------------------------------------------------------
-- 1a. Private payout table
-- ---------------------------------------------------------------------------

create table public.seller_payout_kyc (
  seller_id text primary key
    references public.sellers (id)
    on delete cascade,
  pan text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_holder text,
  updated_at timestamptz not null default now()
);

-- No policies, no grants for anon/authenticated: the table exists only for
-- the service role (Supabase service_role bypasses RLS and is granted below).
alter table public.seller_payout_kyc enable row level security;

revoke all on public.seller_payout_kyc from public, anon, authenticated;

grant select, insert, update, delete on public.seller_payout_kyc to service_role;

-- 1b. Carry any existing payout secrets into the private table
insert into public.seller_payout_kyc
  (seller_id, pan, bank_account_number, bank_ifsc, bank_account_holder, updated_at)
select
  id,
  pan,
  bank_account_number,
  bank_ifsc,
  bank_account_holder,
  now()
from public.sellers
where pan is not null
   or bank_account_number is not null
   or bank_ifsc is not null
   or bank_account_holder is not null
on conflict (seller_id) do nothing;

-- 1c. The secrets are no longer columns anywhere public
alter table public.sellers
  drop column if exists pan,
  drop column if exists bank_account_number,
  drop column if exists bank_ifsc,
  drop column if exists bank_account_holder;

-- ---------------------------------------------------------------------------
-- 2. Atomic stock decrement (checkout ordering path)
-- ---------------------------------------------------------------------------

create or replace function public.decrement_product_stock(
  p_product_id text,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status     public.products.status%type;
  v_available  boolean;
  v_stock      integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception
      'Order quantity must be a whole number above zero.'
      using errcode = 'MT001';
  end if;

  -- One locked statement block: FOR UPDATE serializes concurrent buyers.
  select status, is_available, stock
    into v_status, v_available, v_stock
  from public.products
  where id = p_product_id
  for update;

  if not found
     or v_status <> 'approved'
     or v_available is not true
     or v_stock < p_quantity
  then
    raise exception
      'That product is not available to order.'
      using errcode = 'MT002';
  end if;

  update public.products
    set stock = v_stock - p_quantity,
        is_available = (v_stock - p_quantity) > 0
  where id = p_product_id
  returning stock into v_stock;

  return v_stock;
end;
$$;

revoke all on function public.decrement_product_stock(text, integer)
  from public, anon, authenticated;

grant execute on function public.decrement_product_stock(text, integer)
  to service_role;
