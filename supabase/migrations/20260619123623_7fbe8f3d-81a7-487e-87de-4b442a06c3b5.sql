-- WIR-001: atomic helpful-vote increment
create or replace function public.increment_review_helpful(_review_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _new_count integer;
begin
  if _review_id is null then
    raise exception 'review_id required';
  end if;

  update public.product_reviews
     set helpful_count = coalesce(helpful_count, 0) + 1
   where id = _review_id
     and coalesce(is_approved, true) = true
  returning helpful_count into _new_count;

  if _new_count is null then
    raise exception 'Review not found or not approved' using errcode = 'P0002';
  end if;

  return _new_count;
end;
$$;

revoke all on function public.increment_review_helpful(uuid) from public;
grant execute on function public.increment_review_helpful(uuid) to anon, authenticated;

-- WIR-004: per-user cart + wishlist persistence
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cart jsonb not null default '[]'::jsonb,
  wishlist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.user_state to authenticated;
grant all on public.user_state to service_role;

alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own" on public.user_state
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own" on public.user_state
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own" on public.user_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own" on public.user_state
  for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists trg_user_state_set_updated_at on public.user_state;
create trigger trg_user_state_set_updated_at
  before update on public.user_state
  for each row execute function public.set_updated_at();