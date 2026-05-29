
-- ============================================================
-- ROLES + PROFILES
-- ============================================================

create type public.app_role as enum ('admin', 'customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  phone text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "profiles_self_select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles_admin_all"   on public.profiles for all    to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_self_select" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "user_roles_admin_all"   on public.user_roles for all    to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile + grant admin role to info@nutropact.com
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );

  if new.email = 'info@nutropact.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'customer')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id text primary key,
  name text not null,
  slug text not null unique,
  category text not null default '',
  description text default '',
  short_description text default '',
  price numeric(10,2) not null,
  compare_price numeric(10,2),
  images jsonb default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_new_arrival boolean not null default false,
  is_best_seller boolean not null default false,
  in_stock boolean not null default true,
  stock_count integer default 0,
  sku text default '',
  brand text default '',
  weight numeric(8,2),
  shipping_weight numeric(8,2),
  tags jsonb default '[]'::jsonb,
  certifications jsonb default '[]'::jsonb,
  benefits jsonb default '[]'::jsonb,
  variants jsonb default '[]'::jsonb,
  nutrition_facts jsonb default '[]'::jsonb,
  ingredients text default '',
  serving_size text default '',
  servings integer,
  warnings text default '',
  how_to_use text default '',
  faqs jsonb default '[]'::jsonb,
  dimensions jsonb,
  ratings numeric(3,2) default 0,
  review_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger products_updated before update on public.products for each row execute function public.tg_set_updated_at();
alter table public.products enable row level security;
create policy "products_public_read" on public.products for select using (true);
create policy "products_admin_write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.product_reviews (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  name text not null,
  avatar text default '',
  rating integer not null default 5,
  title text default '',
  comment text not null,
  images jsonb default '[]'::jsonb,
  video text default '',
  verified boolean not null default false,
  source text default 'customer',
  helpful integer not null default 0,
  pinned boolean not null default false,
  variant text default '',
  created_at timestamptz not null default now()
);
alter table public.product_reviews enable row level security;
create policy "reviews_public_read" on public.product_reviews for select using (true);
create policy "reviews_public_insert" on public.product_reviews for insert with check (true);
create policy "reviews_admin_all"   on public.product_reviews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.product_waitlist (
  id text primary key,
  product_id text not null,
  product_name text not null default '',
  email text not null,
  name text default '',
  notified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.product_waitlist enable row level security;
create policy "waitlist_public_insert" on public.product_waitlist for insert with check (true);
create policy "waitlist_admin_read"    on public.product_waitlist for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "waitlist_admin_update"  on public.product_waitlist for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "waitlist_admin_delete"  on public.product_waitlist for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- ORDERS
-- ============================================================
create table public.orders (
  id text primary key,
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2),
  shipping_cost numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  total numeric(10,2) not null,
  coupon_code text default '',
  customer_name text default '',
  customer_email text default '',
  customer_phone text default '',
  shipping_address jsonb not null default '{}'::jsonb,
  order_status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_method text default 'cod',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated before update on public.orders for each row execute function public.tg_set_updated_at();
alter table public.orders enable row level security;
create policy "orders_public_insert" on public.orders for insert with check (true);
create policy "orders_owner_read"    on public.orders for select to authenticated using (user_id = auth.uid());
create policy "orders_admin_all"     on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- BLOG
-- ============================================================
create table public.blog_posts (
  id text primary key,
  title text not null,
  slug text not null unique,
  category text not null default 'General',
  excerpt text default '',
  content text default '',
  image text default '',
  author text not null default 'NutroPact Team',
  author_avatar text default '',
  tags jsonb default '[]'::jsonb,
  read_time integer default 3,
  published boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger blog_updated before update on public.blog_posts for each row execute function public.tg_set_updated_at();
alter table public.blog_posts enable row level security;
create policy "blog_public_read" on public.blog_posts for select using (published = true or public.has_role(auth.uid(),'admin'));
create policy "blog_admin_write" on public.blog_posts for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- COUPONS
-- ============================================================
create table public.coupons (
  code text primary key,
  type text not null default 'percent',
  value numeric(10,2) not null,
  label text not null default '',
  active boolean not null default true,
  min_order_value numeric(10,2) default 0,
  max_discount numeric(10,2),
  usage_limit integer,
  usage_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
create policy "coupons_public_read" on public.coupons for select using (active = true or public.has_role(auth.uid(),'admin'));
create policy "coupons_admin_write" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- FAQS
-- ============================================================
create table public.faqs (
  id text primary key,
  category text not null default 'General',
  question text not null,
  answer text not null,
  enabled boolean not null default true,
  "order" integer not null default 0
);
alter table public.faqs enable row level security;
create policy "faqs_public_read" on public.faqs for select using (enabled = true or public.has_role(auth.uid(),'admin'));
create policy "faqs_admin_write" on public.faqs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- GLOBAL REVIEWS (homepage testimonials)
-- ============================================================
create table public.global_reviews (
  id text primary key,
  product_id text default '',
  name text not null,
  avatar text default '',
  rating integer not null default 5,
  title text default '',
  comment text not null,
  images jsonb default '[]'::jsonb,
  video text default '',
  verified boolean not null default true,
  source text default 'admin',
  helpful integer not null default 0,
  pinned boolean not null default false,
  variant text default '',
  created_at timestamptz not null default now()
);
alter table public.global_reviews enable row level security;
create policy "global_reviews_public_read" on public.global_reviews for select using (true);
create policy "global_reviews_admin_write" on public.global_reviews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- CONTACT SUBMISSIONS
-- ============================================================
create table public.contact_submissions (
  id text primary key,
  name text not null,
  email text not null,
  phone text default '',
  subject text not null default 'General Inquiry',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.contact_submissions enable row level security;
create policy "contact_public_insert" on public.contact_submissions for insert with check (true);
create policy "contact_admin_all"     on public.contact_submissions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- DIMENSIONS + PACKAGING
-- ============================================================
create table public.dimensions (
  id text primary key,
  name text not null,
  length numeric(8,2) not null default 0,
  width  numeric(8,2) not null default 0,
  height numeric(8,2) not null default 0,
  unit text not null default 'cm'
);
alter table public.dimensions enable row level security;
create policy "dimensions_admin_all" on public.dimensions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.packaging_boxes (
  id text primary key,
  name text not null,
  length numeric(8,2) not null default 0,
  width  numeric(8,2) not null default 0,
  height numeric(8,2) not null default 0,
  weight numeric(8,2) not null default 0,
  max_weight numeric(8,2) not null default 0,
  unit text not null default 'cm'
);
alter table public.packaging_boxes enable row level security;
create policy "packaging_admin_all" on public.packaging_boxes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.notification_log (
  id text primary key,
  order_number text not null,
  customer_name text not null,
  total numeric(10,2) not null,
  items text not null default '',
  message text not null default '',
  whatsapp_link text default '',
  email text default '',
  sent_at timestamptz not null default now()
);
alter table public.notification_log enable row level security;
create policy "notification_log_admin_all" on public.notification_log for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============================================================
-- SETTINGS / HOMEPAGE CONFIG
-- ============================================================
create table public.site_settings (
  key text primary key default 'default',
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated before update on public.site_settings for each row execute function public.tg_set_updated_at();
alter table public.site_settings enable row level security;
create policy "site_settings_public_read" on public.site_settings for select using (true);
create policy "site_settings_admin_write" on public.site_settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.homepage_config (
  key text primary key default 'default',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger homepage_config_updated before update on public.homepage_config for each row execute function public.tg_set_updated_at();
alter table public.homepage_config enable row level security;
create policy "homepage_public_read" on public.homepage_config for select using (true);
create policy "homepage_admin_write" on public.homepage_config for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.site_settings (key, settings) values ('default', '{}'::jsonb) on conflict do nothing;
insert into public.homepage_config (key, config) values ('default', '{}'::jsonb) on conflict do nothing;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true), ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product_images_admin_write" on storage.objects for all to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin')) with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "blog_images_public_read" on storage.objects for select using (bucket_id = 'blog-images');
create policy "blog_images_admin_write" on storage.objects for all to authenticated using (bucket_id = 'blog-images' and public.has_role(auth.uid(),'admin')) with check (bucket_id = 'blog-images' and public.has_role(auth.uid(),'admin'));
