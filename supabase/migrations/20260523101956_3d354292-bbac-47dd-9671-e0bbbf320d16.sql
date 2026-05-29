
create table if not exists public.shipment_charges (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  courier text not null default '',
  awb_number text default '',
  expected_weight_g integer not null default 0,
  expected_charge numeric(10,2) not null default 0,
  expected_box_id text default '',
  actual_weight_g integer,
  actual_charge numeric(10,2),
  variance numeric(10,2) generated always as (coalesce(actual_charge, 0) - coalesce(expected_charge, 0)) stored,
  variance_pct numeric(8,2) generated always as (
    case when expected_charge > 0 and actual_charge is not null
      then ((actual_charge - expected_charge) / expected_charge) * 100
      else null
    end
  ) stored,
  status text not null default 'pending',
  reconciled_at timestamptz,
  notes text default '',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipment_charges_status_idx on public.shipment_charges (status);
create index if not exists shipment_charges_courier_idx on public.shipment_charges (courier);
create index if not exists shipment_charges_created_idx on public.shipment_charges (created_at desc);

alter table public.shipment_charges enable row level security;

drop policy if exists shipment_charges_admin_all on public.shipment_charges;
create policy shipment_charges_admin_all on public.shipment_charges
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role))
  with check (private.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.shipment_charges_set_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.actual_charge is null then
    new.status := 'pending';
  else
    if abs(coalesce(new.variance, 0)) <= greatest(2, new.expected_charge * 0.02) then
      new.status := 'matched';
    elsif new.variance > 0 then
      new.status := 'overcharge';
    else
      new.status := 'undercharge';
    end if;
    if new.reconciled_at is null then
      new.reconciled_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_shipment_charges_status on public.shipment_charges;
create trigger trg_shipment_charges_status
before insert or update on public.shipment_charges
for each row execute function public.shipment_charges_set_status();
