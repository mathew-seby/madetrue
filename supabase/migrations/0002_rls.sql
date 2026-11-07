-- MADETRUE — 0002_rls.sql
-- Phase 2 Step 2. Row level security only. Run after 0001_init.sql.
--
-- Identity assumption: public.users.id = auth.uid()::text once Phase 3
-- wires Supabase Auth. Until someone is signed in, auth.uid() is null and
-- the anon key can only read the catalog below.
--
-- The SQL editor (postgres) and the service role bypass these row checks
-- for seed and server jobs. Triggers still fire for them, and the guards
-- below let those two roles through. A signed-in buyer or seller cannot.
--
-- Access matrix
--
-- | Table          | anon                         | buyer                                      | seller                                              | admin      |
-- |----------------|------------------------------|--------------------------------------------|-----------------------------------------------------|------------|
-- | categories     | read                         | read                                       | read                                                | read/write |
-- | sellers        | read                         | read                                       | read; insert/update own row                        | read/write |
-- | products       | read approved                | read approved                              | read approved + own; insert/update/delete own      | read/write |
-- | orders         | none                         | create + read own                          | read own; update status + WhatsApp flag on own     | read/write |
-- | transactions   | none                         | none                                       | read own                                            | read/write |
-- | users          | none                         | read/update own; insert own profile        | same as buyer                                       | read/write |
--
-- Writes the matrix does not trust to the client, enforced by triggers:
--   users.role stays buyer unless an admin (or postgres / service_role) sets it
--   sellers.is_verified, kyc_status, payment_vendor_ref, user_id are admin-owned
--   products.status is pending on create; a seller edit of the listing sends
--     it back to pending. Stock and is_available can change without that.
--   orders copy seller, name, and prices off the product; payment refs stay
--     empty on create. Sellers may change only status and whatsapp_notified.
--   transactions have no client insert/update/delete. Phase 6 writes them
--     with the service role. gateway_event_id is already unique.
--
-- Not in this file: order status transitions (Phase 7), stock locking
-- (Phase 4), and server-side pricing of the delivery fee (Phase 6).

-- ---------------------------------------------------------------------------
-- Helpers. security definer so policy checks do not recurse through RLS.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()::text
      and role = 'admin'
  );
$$;

create or replace function public.current_seller_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.sellers
  where user_id = auth.uid()::text;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_seller_id() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.current_seller_id() to anon, authenticated, service_role;

-- Trigger functions stay off the API. PostgREST would otherwise expose them.

-- ---------------------------------------------------------------------------
-- Column guards. security invoker so current_user is the real caller.
-- postgres / service_role are the seed path and the server, not a buyer.
-- ---------------------------------------------------------------------------

create or replace function public.guard_user_role()
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
    new.role := 'buyer';
    return new;
  end if;

  new.role := old.role;
  return new;
end;
$$;

create trigger users_guard_role
  before insert or update on public.users
  for each row
  execute function public.guard_user_role();

create or replace function public.guard_seller_trust_fields()
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
    new.is_verified := false;
    new.kyc_status := 'not_started';
    new.payment_vendor_ref := null;
    return new;
  end if;

  new.is_verified := old.is_verified;
  new.kyc_status := old.kyc_status;
  new.payment_vendor_ref := old.payment_vendor_ref;
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger sellers_guard_trust_fields
  before insert or update on public.sellers
  for each row
  execute function public.guard_seller_trust_fields();

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
  return new;
end;
$$;

create trigger products_guard_review
  before insert or update on public.products
  for each row
  execute function public.guard_product_review();

create or replace function public.guard_order_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  product_row public.products%rowtype;
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
     or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Sign in before placing an order.';
    end if;

    select *
    into product_row
    from public.products
    where id = new.product_id;

    if not found
       or product_row.status <> 'approved'
       or not product_row.is_available
       or product_row.stock < new.quantity then
      raise exception 'That product is not available to order.';
    end if;

    new.buyer_id := auth.uid()::text;
    new.seller_id := product_row.seller_id;
    new.product_name := product_row.name;
    new.price := product_row.price;
    new.base_price := coalesce(product_row.base_price, product_row.price);
    new.commission := coalesce(product_row.commission, 0);
    new.status := 'pending';
    new.whatsapp_notified := false;
    new.gateway := null;
    new.gateway_order_ref := null;
    new.gateway_payment_ref := null;
    new.split_status := 'not_applicable';
    return new;
  end if;

  -- Seller updates: status and the WhatsApp flag only.
  new.id := old.id;
  new.buyer_id := old.buyer_id;
  new.seller_id := old.seller_id;
  new.product_id := old.product_id;
  new.quantity := old.quantity;
  new.delivery_type := old.delivery_type;
  new.address := old.address;
  new.payment_method := old.payment_method;
  new.created_at := old.created_at;
  new.lat := old.lat;
  new.lng := old.lng;
  new.base_price := old.base_price;
  new.commission := old.commission;
  new.buyer_name := old.buyer_name;
  new.buyer_phone := old.buyer_phone;
  new.product_name := old.product_name;
  new.price := old.price;
  new.delivery_fee := old.delivery_fee;
  new.gateway := old.gateway;
  new.gateway_order_ref := old.gateway_order_ref;
  new.gateway_payment_ref := old.gateway_payment_ref;
  new.split_status := old.split_status;
  return new;
end;
$$;

create trigger orders_guard_write
  before insert or update on public.orders
  for each row
  execute function public.guard_order_write();

revoke all on function public.guard_user_role() from public, anon, authenticated;
revoke all on function public.guard_seller_trust_fields() from public, anon, authenticated;
revoke all on function public.guard_product_review() from public, anon, authenticated;
revoke all on function public.guard_order_write() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS. Not forced: postgres keeps the seed path used in later steps.
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;

-- ---------------------------------------------------------------------------
-- Grants. RLS is the real gate. These make the API roles able to try.
-- ---------------------------------------------------------------------------

revoke all on public.users, public.categories, public.sellers,
  public.products, public.orders, public.transactions
  from public, anon, authenticated;

grant select on public.categories, public.sellers, public.products to anon;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.sellers to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select on public.transactions to authenticated;

grant all on public.users, public.categories, public.sellers,
  public.products, public.orders, public.transactions
  to service_role;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create policy users_select_own_or_admin
  on public.users
  for select
  to authenticated
  using (id = auth.uid()::text or public.is_admin());

create policy users_insert_self_or_admin
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid()::text or public.is_admin());

create policy users_update_own_or_admin
  on public.users
  for update
  to authenticated
  using (id = auth.uid()::text or public.is_admin())
  with check (id = auth.uid()::text or public.is_admin());

create policy users_delete_admin
  on public.users
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create policy categories_public_read
  on public.categories
  for select
  to anon, authenticated
  using (true);

create policy categories_admin_write
  on public.categories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- sellers
-- ---------------------------------------------------------------------------

create policy sellers_public_read
  on public.sellers
  for select
  to anon, authenticated
  using (true);

create policy sellers_insert_own_or_admin
  on public.sellers
  for insert
  to authenticated
  with check (user_id = auth.uid()::text or public.is_admin());

create policy sellers_update_own_or_admin
  on public.sellers
  for update
  to authenticated
  using (user_id = auth.uid()::text or public.is_admin())
  with check (user_id = auth.uid()::text or public.is_admin());

create policy sellers_delete_admin
  on public.sellers
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- products
-- Approved rows are the public catalog, including sold-out ones.
-- The owning seller also sees pending and rejected rows.
-- ---------------------------------------------------------------------------

create policy products_public_or_own_read
  on public.products
  for select
  to anon, authenticated
  using (
    status = 'approved'
    or seller_id = public.current_seller_id()
    or public.is_admin()
  );

create policy products_insert_own_or_admin
  on public.products
  for insert
  to authenticated
  with check (seller_id = public.current_seller_id() or public.is_admin());

create policy products_update_own_or_admin
  on public.products
  for update
  to authenticated
  using (seller_id = public.current_seller_id() or public.is_admin())
  with check (seller_id = public.current_seller_id() or public.is_admin());

create policy products_delete_own_or_admin
  on public.products
  for delete
  to authenticated
  using (seller_id = public.current_seller_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create policy orders_select_buyer_seller_admin
  on public.orders
  for select
  to authenticated
  using (
    buyer_id = auth.uid()::text
    or seller_id = public.current_seller_id()
    or public.is_admin()
  );

create policy orders_insert_buyer
  on public.orders
  for insert
  to authenticated
  with check (buyer_id = auth.uid()::text or public.is_admin());

create policy orders_update_seller_or_admin
  on public.orders
  for update
  to authenticated
  using (seller_id = public.current_seller_id() or public.is_admin())
  with check (seller_id = public.current_seller_id() or public.is_admin());

create policy orders_delete_admin
  on public.orders
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- transactions — read own ledger. No client writes.
-- ---------------------------------------------------------------------------

create policy transactions_select_seller_or_admin
  on public.transactions
  for select
  to authenticated
  using (seller_id = public.current_seller_id() or public.is_admin());
