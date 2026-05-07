-- Sleep E-commerce Supabase schema
-- Run with: supabase db reset --file supabase/schema.sql

begin;

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- Enumerations ----------

create type public.product_status as enum ('draft', 'active', 'archived');
create type public.inventory_status as enum ('in_stock', 'low_stock', 'backorder', 'discontinued');
create type public.order_status as enum ('pending', 'confirmed', 'fulfilled', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'refunded', 'failed');
create type public.cart_status as enum ('active', 'converted', 'abandoned');

-- ---------- Helper functions & triggers ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'role') in ('service_role', 'admin')
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Core reference data ----------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  hero_image_url text,
  hero_copy text,
  seo_title text,
  seo_description text,
  sort_index int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_categories_updated
  before update on public.categories
  for each row execute procedure public.touch_updated_at();

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  merch_banner_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_collections_updated
  before update on public.collections
  for each row execute procedure public.touch_updated_at();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  sku_base text not null unique,
  name text not null,
  tagline text,
  short_description text,
  long_description text,
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  attributes jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_products_updated
  before update on public.products
  for each row execute procedure public.touch_updated_at();

create table if not exists public.product_collections (
  product_id uuid references public.products(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  sort_index int default 0,
  primary key (product_id, collection_id)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  title text not null,
  price_cents int not null check (price_cents >= 0),
  compare_at_price_cents int check (compare_at_price_cents >= 0),
  currency_code text not null default 'ARS',
  stock_quantity int not null default 0,
  inventory_status public.inventory_status not null default 'in_stock',
  dimensions jsonb default '{}'::jsonb,
  weight_kg numeric(10,2),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_product_variants_updated
  before update on public.product_variants
  for each row execute procedure public.touch_updated_at();

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  media_type text not null default 'image',
  url text not null,
  alt text,
  is_primary boolean default false,
  sort_index int default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists product_media_product_url_idx
  on public.product_media (product_id, url);

create table if not exists public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  value text not null,
  icon text,
  sort_index int default 0
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  amount numeric(10,2) not null,
  currency_code text default 'ARS',
  usage_limit int,
  usage_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_discount_codes_updated
  before update on public.discount_codes
  for each row execute procedure public.touch_updated_at();

-- ---------- Users & profiles ----------

create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  document_id text,
  phone text,
  avatar_url text,
  marketing_opt_in boolean not null default false,
  default_currency text default 'ARS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_customers_updated
  before update on public.customers
  for each row execute procedure public.touch_updated_at();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  full_name text,
  phone text,
  street text not null,
  number text,
  apartment text,
  city text not null,
  province text not null,
  postal_code text not null,
  country text not null default 'AR',
  is_default_shipping boolean default false,
  is_default_billing boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_addresses_updated
  before update on public.addresses
  for each row execute procedure public.touch_updated_at();

-- ---------- Commerce flow ----------

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  anonymous_key text,
  status public.cart_status not null default 'active',
  currency_code text not null default 'ARS',
  subtotal_cents int not null default 0,
  discount_cents int not null default 0,
  shipping_cents int not null default 0,
  total_cents int generated always as (greatest(subtotal_cents - discount_cents + shipping_cents, 0)) stored,
  discount_code_id uuid references public.discount_codes(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_carts_updated
  before update on public.carts
  for each row execute procedure public.touch_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  quantity int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  currency_code text not null default 'ARS',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(cart_id, variant_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigserial unique,
  customer_id uuid references public.customers(id) on delete set null,
  cart_id uuid references public.carts(id) on delete set null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  currency_code text not null default 'ARS',
  items_subtotal_cents int not null,
  shipping_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null,
  shipping_address jsonb not null,
  billing_address jsonb,
  notes text,
  mercado_pago_preference_id text,
  mercado_pago_payment_id text,
  placed_at timestamptz default now(),
  fulfilled_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  name text not null,
  variant_title text,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null,
  currency_code text not null default 'ARS',
  subtotal_cents int not null,
  metadata jsonb default '{}'::jsonb
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'mercado_pago',
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  amount_cents int not null,
  currency_code text not null default 'ARS',
  metadata jsonb default '{}'::jsonb,
  processed_at timestamptz default now()
);

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_delta int not null,
  reason text not null,
  related_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_users(user_id)
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_visible boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  raw_payload jsonb not null,
  processed boolean not null default false,
  related_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------- Row Level Security ----------

alter table public.categories enable row level security;
create policy categories_read_open on public.categories
  for select using (true);
create policy categories_admin_write on public.categories
  for all using (public.is_admin());

alter table public.collections enable row level security;
create policy collections_read_open on public.collections
  for select using (true);
create policy collections_admin_write on public.collections
  for all using (public.is_admin());

alter table public.products enable row level security;
create policy products_read_open on public.products
  for select using (status = 'active' or public.is_admin());
create policy products_admin_write on public.products
  for all using (public.is_admin());

alter table public.product_variants enable row level security;
create policy product_variants_read_open on public.product_variants
  for select using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_admin())));
create policy product_variants_admin_write on public.product_variants
  for all using (public.is_admin());

alter table public.product_media enable row level security;
create policy product_media_read_open on public.product_media
  for select using (true);
create policy product_media_admin_write on public.product_media
  for all using (public.is_admin());

alter table public.product_attributes enable row level security;
create policy product_attributes_read_open on public.product_attributes for select using (true);
create policy product_attributes_admin_write on public.product_attributes for all using (public.is_admin());

alter table public.product_collections enable row level security;
create policy product_collections_admin_only
  on public.product_collections for all
  using (public.is_admin());

alter table public.discount_codes enable row level security;
create policy discount_codes_read_open on public.discount_codes for select using (true);
create policy discount_codes_admin_write on public.discount_codes for all using (public.is_admin());

alter table public.customers enable row level security;
create policy customers_select_self on public.customers
  for select using (auth.uid() = id or public.is_admin());
create policy customers_update_self on public.customers
  for update using (auth.uid() = id);
create policy customers_insert_self on public.customers
  for insert with check (auth.uid() = id);

alter table public.admin_users enable row level security;
create policy admin_users_manage on public.admin_users
  for all using (public.is_admin());

alter table public.addresses enable row level security;
create policy addresses_select_self on public.addresses
  for select using (auth.uid() = customer_id or public.is_admin());
create policy addresses_mutate_self on public.addresses
  for insert with check (auth.uid() = customer_id);
create policy addresses_update_self on public.addresses
  for update using (auth.uid() = customer_id);
create policy addresses_delete_self on public.addresses
  for delete using (auth.uid() = customer_id or public.is_admin());

alter table public.carts enable row level security;
create policy carts_select_owner on public.carts
  for select using (
    public.is_admin()
    or (auth.uid() is not null and auth.uid() = customer_id)
  );
create policy carts_mutate_owner on public.carts
  for insert with check (auth.uid() = customer_id or customer_id is null);
create policy carts_update_owner on public.carts
  for update using (auth.uid() = customer_id or public.is_admin());

alter table public.cart_items enable row level security;
create policy cart_items_select_owner on public.cart_items
  for select using (
    public.is_admin()
    or exists(select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid())
  );
create policy cart_items_mutate_owner on public.cart_items
  for all using (
    public.is_admin()
    or exists(select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid())
  );

alter table public.orders enable row level security;
create policy orders_select_owner on public.orders
  for select using (
    public.is_admin()
    or (auth.uid() is not null and auth.uid() = customer_id)
  );
create policy orders_insert_owner on public.orders
  for insert with check (auth.uid() = customer_id or public.is_admin());
create policy orders_update_owner on public.orders
  for update using (auth.uid() = customer_id or public.is_admin());

alter table public.order_items enable row level security;
create policy order_items_select_owner on public.order_items
  for select using (
    public.is_admin()
    or exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy order_items_admin_write on public.order_items
  for all using (public.is_admin());

alter table public.payments enable row level security;
create policy payments_select_owner on public.payments
  for select using (
    public.is_admin()
    or exists(select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy payments_admin_write on public.payments
  for all using (public.is_admin());

alter table public.inventory_events enable row level security;
create policy inventory_events_admin_only on public.inventory_events
  for all using (public.is_admin());

alter table public.product_reviews enable row level security;
create policy product_reviews_select_published on public.product_reviews
  for select using (is_visible or public.is_admin());
create policy product_reviews_insert_owner on public.product_reviews
  for insert with check (auth.uid() = customer_id);
create policy product_reviews_update_owner on public.product_reviews
  for update using (auth.uid() = customer_id or public.is_admin());

alter table public.webhook_events enable row level security;
create policy webhook_events_admin_only on public.webhook_events
  for all using (public.is_admin());

commit;
