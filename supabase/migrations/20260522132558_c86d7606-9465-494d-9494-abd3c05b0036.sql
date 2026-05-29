
create table if not exists public.loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  min_lifetime_spend numeric(10,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  free_shipping boolean not null default false,
  perks jsonb not null default '[]'::jsonb,
  badge_color text not null default '#cd7f32',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier_id uuid references public.loyalty_tiers(id) on delete set null,
  lifetime_spend numeric(12,2) not null default 0,
  order_count int not null default 0,
  last_recalc_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loyalty_status_tier_idx on public.loyalty_status(tier_id);

alter table public.loyalty_tiers enable row level security;
alter table public.loyalty_status enable row level security;

create policy "anyone read tiers"
  on public.loyalty_tiers for select using (active = true or private.has_role(auth.uid(), 'admin'::app_role));

create policy "admin manage tiers"
  on public.loyalty_tiers for all
  using (private.has_role(auth.uid(), 'admin'::app_role))
  with check (private.has_role(auth.uid(), 'admin'::app_role));

create policy "user reads own loyalty status"
  on public.loyalty_status for select
  using (user_id = auth.uid() or private.has_role(auth.uid(), 'admin'::app_role));

create policy "admin manages loyalty status"
  on public.loyalty_status for all
  using (private.has_role(auth.uid(), 'admin'::app_role))
  with check (private.has_role(auth.uid(), 'admin'::app_role));

insert into public.loyalty_tiers (name, min_lifetime_spend, discount_percent, free_shipping, perks, badge_color, sort_order)
values
  ('Bronze', 0, 0, false, '["Member-only newsletter","Birthday wish"]'::jsonb, '#cd7f32', 1),
  ('Silver', 5000, 5, false, '["5% off every order","Early-access sales","Priority support"]'::jsonb, '#c0c0c0', 2),
  ('Gold',   15000, 10, true, '["10% off every order","Free shipping always","Early-access sales","Priority support","Free gift with annual order"]'::jsonb, '#d4af37', 3)
on conflict (name) do nothing;
