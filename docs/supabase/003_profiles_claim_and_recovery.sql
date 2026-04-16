create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null,
  display_name_lc text generated always as (lower(display_name)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len_chk check (char_length(btrim(display_name)) between 3 and 16),
  constraint profiles_display_name_chars_chk check (display_name ~ '^[A-Za-z0-9 _-]+$')
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists display_name text;

update public.profiles
set display_name = 'Traveler'
where display_name is null or btrim(display_name) = '';

update public.profiles
set display_name = left(regexp_replace(display_name, '[^A-Za-z0-9 _-]', '', 'g'), 16)
where display_name !~ '^[A-Za-z0-9 _-]+$';

update public.profiles
set display_name = 'Traveler'
where btrim(display_name) = '' or char_length(btrim(display_name)) < 3;

update public.profiles
set display_name = left(display_name, 16)
where char_length(display_name) > 16;

alter table public.profiles alter column display_name set not null;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name_lc'
  ) then
    alter table public.profiles
      add column display_name_lc text generated always as (lower(display_name)) stored;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_len_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_len_chk
      check (char_length(btrim(display_name)) between 3 and 16);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_chars_chk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_chars_chk
      check (display_name ~ '^[A-Za-z0-9 _-]+$');
  end if;
end;
$$;

create unique index if not exists profiles_display_name_lc_key
  on public.profiles (display_name_lc);

create index if not exists profiles_updated_at_desc_idx
  on public.profiles (updated_at desc);

create unique index if not exists profiles_email_lc_key
  on public.profiles ((lower(email)))
  where email is not null and btrim(email) <> '';

grant select, insert, update on table public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile row" on public.profiles;
create policy "Users can view own profile row"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile row" on public.profiles;
create policy "Users can insert own profile row"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile row" on public.profiles;
create policy "Users can update own profile row"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop function if exists public.is_profile_display_name_available(text, uuid);
create or replace function public.is_profile_display_name_available(
  p_display_name text,
  p_exclude_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := left(coalesce(trim(p_display_name), ''), 16);

  if v_name = '' then
    return false;
  end if;

  if char_length(v_name) < 3 then
    return false;
  end if;

  if v_name !~ '^[A-Za-z0-9 _-]+$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where p.display_name_lc = lower(v_name)
      and (p_exclude_user_id is null or p.id <> p_exclude_user_id)
  );
end;
$$;

grant execute on function public.is_profile_display_name_available(text, uuid) to authenticated;

drop function if exists public.is_profile_email_available(text, uuid);
create or replace function public.is_profile_email_available(
  p_email text,
  p_exclude_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(trim(coalesce(p_email, '')));

  if v_email = '' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where lower(coalesce(p.email, '')) = v_email
      and (p_exclude_user_id is null or p.id <> p_exclude_user_id)
  );
end;
$$;

grant execute on function public.is_profile_email_available(text, uuid) to authenticated;

drop function if exists public.is_auth_email_available(text, uuid);
create or replace function public.is_auth_email_available(
  p_email text,
  p_exclude_user_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  v_email := lower(trim(coalesce(p_email, '')));

  if v_email = '' then
    return false;
  end if;

  return not exists (
    select 1
    from auth.users u
    where lower(coalesce(u.email, '')) = v_email
      and (p_exclude_user_id is null or u.id <> p_exclude_user_id)
  );
end;
$$;

grant execute on function public.is_auth_email_available(text, uuid) to authenticated;
