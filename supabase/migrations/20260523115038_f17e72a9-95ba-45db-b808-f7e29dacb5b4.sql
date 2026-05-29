create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null, key text not null,
  hits integer not null default 0,
  window_start timestamptz not null default now(),
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, key)
);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
alter table public.rate_limits enable row level security;
drop policy if exists "rate_limits admin read" on public.rate_limits;
create policy "rate_limits admin read" on public.rate_limits
  for select to authenticated using (private.has_role(auth.uid(),'admin'::public.app_role));

create or replace function public.check_rate_limit(
  _bucket text, _key text, _limit int, _window_seconds int, _block_seconds int default null
) returns table (allowed boolean, hits int, blocked_until timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  now_ts timestamptz := now();
  win_start timestamptz := now_ts - make_interval(secs => _window_seconds);
begin
  insert into rate_limits (bucket, key, hits, window_start)
  values (_bucket, _key, 0, now_ts) on conflict (bucket, key) do nothing;
  select * into r from rate_limits where bucket=_bucket and key=_key for update;
  if r.blocked_until is not null and r.blocked_until > now_ts then
    return query select false, r.hits, r.blocked_until; return;
  end if;
  if r.window_start < win_start then
    update rate_limits set hits=1, window_start=now_ts, blocked_until=null, updated_at=now_ts
      where bucket=_bucket and key=_key;
    return query select true, 1, null::timestamptz; return;
  end if;
  if r.hits + 1 > _limit then
    update rate_limits
       set hits = r.hits + 1,
           blocked_until = case when _block_seconds is null then null
                                else now_ts + make_interval(secs => _block_seconds) end,
           updated_at = now_ts
     where bucket=_bucket and key=_key returning blocked_until into r.blocked_until;
    return query select false, r.hits + 1, r.blocked_until; return;
  end if;
  update rate_limits set hits = r.hits + 1, updated_at = now_ts
    where bucket=_bucket and key=_key;
  return query select true, r.hits + 1, null::timestamptz;
end $$;
revoke all on function public.check_rate_limit(text,text,int,int,int) from public;
grant execute on function public.check_rate_limit(text,text,int,int,int) to service_role;

create table if not exists public.login_lockouts (
  id uuid primary key default gen_random_uuid(),
  email text, ip text,
  fails int not null default 0,
  locked_until timestamptz,
  last_attempt timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists login_lockouts_email_ip_idx
  on public.login_lockouts (coalesce(email,''), coalesce(ip,''));
alter table public.login_lockouts enable row level security;
drop policy if exists "lockouts admin read" on public.login_lockouts;
create policy "lockouts admin read" on public.login_lockouts
  for select to authenticated using (private.has_role(auth.uid(),'admin'::public.app_role));

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  severity text not null default 'info',
  source_ip text, user_id uuid, route text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_created_idx on public.security_events (created_at desc);
create index if not exists security_events_kind_idx on public.security_events (kind, created_at desc);
alter table public.security_events enable row level security;
drop policy if exists "events admin read" on public.security_events;
create policy "events admin read" on public.security_events
  for select to authenticated using (private.has_role(auth.uid(),'admin'::public.app_role));

create or replace function public.get_cron_health()
returns table (
  jobid bigint, jobname text, schedule text, active boolean,
  last_start timestamptz, last_end timestamptz, last_status text, last_error text,
  runs_24h int, failures_24h int
)
language sql security definer set search_path = public, cron
as $$
  with last_run as (
    select distinct on (jobid) jobid, start_time, end_time, status, return_message
    from cron.job_run_details order by jobid, start_time desc
  ),
  agg as (
    select jobid,
           count(*)::int as runs_24h,
           count(*) filter (where status <> 'succeeded')::int as failures_24h
      from cron.job_run_details
     where start_time > now() - interval '24 hours'
     group by jobid
  )
  select j.jobid, j.jobname, j.schedule, j.active,
         l.start_time, l.end_time, l.status, l.return_message,
         coalesce(a.runs_24h, 0), coalesce(a.failures_24h, 0)
    from cron.job j
    left join last_run l on l.jobid = j.jobid
    left join agg a on a.jobid = j.jobid
   order by j.jobname;
$$;
revoke all on function public.get_cron_health() from public;
grant execute on function public.get_cron_health() to authenticated;