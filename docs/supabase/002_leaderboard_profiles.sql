create extension if not exists pgcrypto;

create table if not exists public.leaderboard_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null,
  leaderboard_points int4 not null default 0,
  wins int4 not null default 0,
  losses int4 not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_profiles_points_desc_idx
  on public.leaderboard_profiles (leaderboard_points desc);

create index if not exists leaderboard_profiles_updated_desc_idx
  on public.leaderboard_profiles (updated_at desc);

grant select, insert, update on table public.leaderboard_profiles to authenticated;

alter table public.leaderboard_profiles enable row level security;

drop policy if exists "Leaderboard rows readable by authenticated users" on public.leaderboard_profiles;
create policy "Leaderboard rows readable by authenticated users"
on public.leaderboard_profiles
for select
to authenticated
using (true);

drop policy if exists "Users can insert own leaderboard row" on public.leaderboard_profiles;
create policy "Users can insert own leaderboard row"
on public.leaderboard_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own leaderboard row" on public.leaderboard_profiles;
create policy "Users can update own leaderboard row"
on public.leaderboard_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop function if exists public.apply_leaderboard_match_result(uuid, text, text);
create or replace function public.apply_leaderboard_match_result(
  p_user_id uuid,
  p_display_name text,
  p_result text
)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  leaderboard_points int,
  wins int,
  losses int,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result text;
  v_display_name text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  v_result := lower(trim(coalesce(p_result, '')));
  if v_result not in ('win', 'loss') then
    raise exception 'p_result must be win or loss';
  end if;

  v_display_name := left(coalesce(nullif(trim(p_display_name), ''), 'Traveler'), 16);

  insert into public.leaderboard_profiles (user_id, display_name)
  values (p_user_id, v_display_name)
  on conflict (user_id)
  do update set
    display_name = excluded.display_name,
    updated_at = now();

  if v_result = 'win' then
    update public.leaderboard_profiles lp
    set
      display_name = v_display_name,
      wins = coalesce(lp.wins, 0) + 1,
      leaderboard_points = coalesce(lp.leaderboard_points, 0) + 3,
      updated_at = now()
    where lp.user_id = p_user_id;
  else
    update public.leaderboard_profiles lp
    set
      display_name = v_display_name,
      losses = coalesce(lp.losses, 0) + 1,
      leaderboard_points = greatest(0, coalesce(lp.leaderboard_points, 0) - 3),
      updated_at = now()
    where lp.user_id = p_user_id;
  end if;

  return query
  select
    lp.id,
    lp.user_id,
    lp.display_name,
    lp.leaderboard_points,
    lp.wins,
    lp.losses,
    lp.created_at,
    lp.updated_at
  from public.leaderboard_profiles lp
  where lp.user_id = p_user_id
  limit 1;
end;
$$;

grant execute on function public.apply_leaderboard_match_result(uuid, text, text) to authenticated;
