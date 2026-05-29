
create table if not exists public.phone_otps (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count_hour int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists phone_otps_phone_idx on public.phone_otps(phone);
create index if not exists phone_otps_expires_idx on public.phone_otps(expires_at);

alter table public.phone_otps enable row level security;

-- Lock down: no client access. Server uses service role which bypasses RLS.
create policy "no client access to phone_otps"
  on public.phone_otps for all
  to authenticated, anon
  using (false) with check (false);
