-- MADETRUE — 0001_init.sql
-- Phase 2 Step 1. Schema only. No row level security (that is 0002_rls.sql).
-- No seed data. No grants beyond what a fresh public schema already has.
--
-- Primary keys are text and default to gen_random_uuid()::text.
-- The catalog and the public routes already use stable ids
-- (cat-1, seller-1, prod-1, user-seller-1, order-…). New rows still
-- receive a uuid. Passwords are not stored here; Supabase Auth owns
-- them from Phase 3.
--
-- Column set mirrors types/index.ts. Extras required by the payment
-- roadmap, and one field checkout already writes:
--   sellers.payment_vendor_ref, sellers.kyc_status
--   orders.gateway, orders.gateway_order_ref, orders.gateway_payment_ref,
--   orders.split_status, orders.delivery_fee
--   transactions (payment / refund / settlement / commission ledger)
--
-- Order status follows types/index.ts today:
--   pending | accepted | completed | cancelled
-- The ready → delivered machine is Phase 7 and is not invented here.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('buyer', 'seller', 'admin');

create type public.product_badge_tag as enum (
  'Same Day Delivery',
  'Pickup Available',
  'Fresh Today',
  'Locally Made',
  'Eco-Friendly'
);

create type public.product_review_status as enum ('pending', 'approved', 'rejected');

create type public.order_status as enum (
  'pending',
  'accepted',
  'completed',
  'cancelled'
);

create type public.delivery_type as enum ('delivery', 'pickup');

create type public.payment_method as enum ('upi', 'cod');

create type public.kyc_status as enum (
  'not_started',
  'pending',
  'verified',
  'failed'
);

create type public.payment_gateway as enum ('cashfree', 'razorpay', 'payu');

create type public.split_status as enum (
  'not_applicable',
  'pending',
  'completed',
  'failed'
);

create type public.transaction_type as enum (
  'payment',
  'refund',
  'settlement',
  'commission'
);

create type public.transaction_status as enum ('pending', 'completed', 'failed');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table public.users (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text not null default '',
  phone text not null default '',
  role public.user_role not null default 'buyer',
  location_lat double precision,
  location_lng double precision,
  region text,
  language_pref text,
  profile_photo_url text,
  created_at timestamptz not null default now(),
  constraint users_location_lat_range check (
    location_lat is null or (location_lat >= -90 and location_lat <= 90)
  ),
  constraint users_location_lng_range check (
    location_lng is null or (location_lng >= -180 and location_lng <= 180)
  ),
  constraint users_email_or_phone check (email <> '' or phone <> '')
);

create unique index users_email_lower_unique
  on public.users (lower(email))
  where email <> '';

create unique index users_phone_unique
  on public.users (phone)
  where phone <> '';

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  icon text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint categories_slug_unique unique (slug),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- ---------------------------------------------------------------------------
-- sellers
-- ---------------------------------------------------------------------------

create table public.sellers (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  business_name text not null,
  story text not null default '',
  profile_photo_url text not null default '',
  video_url text,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  whatsapp_number text not null,
  is_verified boolean not null default false,
  payment_vendor_ref text,
  kyc_status public.kyc_status not null default 'not_started',
  created_at timestamptz not null default now(),
  constraint sellers_user_id_fkey
    foreign key (user_id) references public.users (id) on delete restrict,
  constraint sellers_user_id_unique unique (user_id),
  constraint sellers_lat_range check (lat >= -90 and lat <= 90),
  constraint sellers_lng_range check (lng >= -180 and lng <= 180)
);

create index sellers_is_verified_idx on public.sellers (is_verified);
create index sellers_kyc_status_idx on public.sellers (kyc_status);

-- ---------------------------------------------------------------------------
-- products
-- category stores the category slug, matching Product.category in types.
-- ---------------------------------------------------------------------------

create table public.products (
  id text primary key default gen_random_uuid()::text,
  seller_id text not null,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null,
  category text not null,
  images text[] not null default '{}',
  tags public.product_badge_tag[] not null default '{}',
  stock integer not null default 0,
  is_available boolean not null default true,
  origin_details text not null default '',
  created_at timestamptz not null default now(),
  status public.product_review_status not null default 'pending',
  documents jsonb not null default '[]'::jsonb,
  lat double precision,
  lng double precision,
  address text,
  base_price numeric(10, 2),
  commission numeric(10, 2),
  constraint products_seller_id_fkey
    foreign key (seller_id) references public.sellers (id) on delete restrict,
  constraint products_category_fkey
    foreign key (category) references public.categories (slug) on update cascade,
  constraint products_price_nonnegative check (price >= 0),
  constraint products_stock_nonnegative check (stock >= 0),
  constraint products_base_price_nonnegative check (
    base_price is null or base_price >= 0
  ),
  constraint products_commission_nonnegative check (
    commission is null or commission >= 0
  ),
  constraint products_lat_range check (
    lat is null or (lat >= -90 and lat <= 90)
  ),
  constraint products_lng_range check (
    lng is null or (lng >= -180 and lng <= 180)
  ),
  constraint products_documents_array check (jsonb_typeof(documents) = 'array')
);

create index products_seller_id_idx on public.products (seller_id);
create index products_category_idx on public.products (category);
create index products_status_idx on public.products (status);
create index products_is_available_idx on public.products (is_available);

-- ---------------------------------------------------------------------------
-- orders
-- One row per product line, matching how checkout stores a basket today.
-- delivery_fee is recorded on the first line of a delivery basket (0 elsewhere).
-- buyer_id is not a foreign key: checkout still records a guest id until
-- Phase 3 puts a real account on every order.
-- ---------------------------------------------------------------------------

create table public.orders (
  id text primary key default gen_random_uuid()::text,
  buyer_id text not null,
  seller_id text not null,
  product_id text not null,
  quantity integer not null,
  status public.order_status not null default 'pending',
  delivery_type public.delivery_type not null,
  address text not null default '',
  payment_method public.payment_method not null,
  whatsapp_notified boolean not null default false,
  created_at timestamptz not null default now(),
  lat double precision,
  lng double precision,
  base_price numeric(10, 2),
  commission numeric(10, 2),
  buyer_name text,
  buyer_phone text,
  product_name text,
  price numeric(10, 2),
  delivery_fee numeric(10, 2) not null default 0,
  gateway public.payment_gateway,
  gateway_order_ref text,
  gateway_payment_ref text,
  split_status public.split_status not null default 'not_applicable',
  constraint orders_seller_id_fkey
    foreign key (seller_id) references public.sellers (id) on delete restrict,
  constraint orders_product_id_fkey
    foreign key (product_id) references public.products (id) on delete restrict,
  constraint orders_quantity_positive check (quantity > 0),
  constraint orders_base_price_nonnegative check (
    base_price is null or base_price >= 0
  ),
  constraint orders_commission_nonnegative check (
    commission is null or commission >= 0
  ),
  constraint orders_price_nonnegative check (price is null or price >= 0),
  constraint orders_delivery_fee_nonnegative check (delivery_fee >= 0),
  constraint orders_lat_range check (
    lat is null or (lat >= -90 and lat <= 90)
  ),
  constraint orders_lng_range check (
    lng is null or (lng >= -180 and lng <= 180)
  )
);

create index orders_buyer_id_idx on public.orders (buyer_id);
create index orders_seller_id_idx on public.orders (seller_id);
create index orders_product_id_idx on public.orders (product_id);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_split_status_idx on public.orders (split_status);

-- ---------------------------------------------------------------------------
-- transactions
-- Append-only ledger. gateway_event_id is unique so webhook retries
-- cannot insert the same gateway event twice (Phase 6).
-- ---------------------------------------------------------------------------

create table public.transactions (
  id text primary key default gen_random_uuid()::text,
  order_id text not null,
  seller_id text not null,
  gateway public.payment_gateway not null,
  gateway_event_id text not null,
  type public.transaction_type not null,
  amount numeric(10, 2) not null,
  currency text not null default 'INR',
  status public.transaction_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint transactions_order_id_fkey
    foreign key (order_id) references public.orders (id) on delete restrict,
  constraint transactions_seller_id_fkey
    foreign key (seller_id) references public.sellers (id) on delete restrict,
  constraint transactions_gateway_event_id_unique unique (gateway_event_id),
  constraint transactions_amount_nonnegative check (amount >= 0),
  constraint transactions_currency_inr check (currency = 'INR')
);

create index transactions_order_id_idx on public.transactions (order_id);
create index transactions_seller_id_idx on public.transactions (seller_id);
create index transactions_status_idx on public.transactions (status);
