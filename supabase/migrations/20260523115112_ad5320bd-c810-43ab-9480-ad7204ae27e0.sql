-- Lock check_rate_limit to service_role only (called from server fns with admin client)
revoke execute on function public.check_rate_limit(text,text,int,int,int) from anon, authenticated, public;

-- get_cron_health: gate by admin role inside the function and revoke broad EXECUTE
create or replace function public.get_cron_health()
returns table (
  jobid bigint, jobname text, schedule text, active boolean,
  last_start timestamptz, last_end timestamptz, last_status text, last_error text,
  runs_24h int, failures_24h int
)
language plpgsql security definer set search_path = public, cron
as $$
begin
  if not private.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
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
end $$;
revoke execute on function public.get_cron_health() from anon, public;
grant execute on function public.get_cron_health() to authenticated;