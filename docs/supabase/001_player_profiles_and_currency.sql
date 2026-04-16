create extension if not exists pgcrypto;

create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text not null default 'Traveler',
  rank_tier int4 not null default 20,
  stars int4 not null default 0,
  hidden_mmr int4 not null default 1000,
  wins int4 not null default 0,
  losses int4 not null default 0,
  out_balance int4 not null default 0,
  out_earned_total int4 not null default 0,
  out_spent_total int4 not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.currency_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  currency_type text not null default 'OUT',
  amount int4 not null,
  reason text not null,
  balance_after int4 not null,
  created_at timestamptz not null default now()
);

alter table public.player_profiles enable row level security;
alter table public.currency_transactions enable row level security;

drop policy if exists "Users can view own profile" on public.player_profiles;
create policy "Users can view own profile"
on public.player_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.player_profiles;
create policy "Users can insert own profile"
on public.player_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.player_profiles;
create policy "Users can update own profile"
on public.player_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view own currency transactions" on public.currency_transactions;
create policy "Users can view own currency transactions"
on public.currency_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own currency transactions" on public.currency_transactions;
create policy "Users can insert own currency transactions"
on public.currency_transactions
for insert
to authenticated
with check (auth.uid() = user_id);

create or replace function public.award_out_currency(
  p_user_id uuid,
  p_amount int,
  p_reason text
)
returns table (
  out_balance int,
  out_earned_total int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance int;
  v_new_earned_total int;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'p_reason is required';
  end if;

  update public.player_profiles as pp
  set
    out_balance = coalesce(pp.out_balance, 0) + p_amount,
    out_earned_total = coalesce(pp.out_earned_total, 0) + p_amount,
    updated_at = now()
  where pp.user_id = p_user_id
  returning pp.out_balance, pp.out_earned_total
  into v_new_balance, v_new_earned_total;

  if not found then
    raise exception 'player_profiles row not found for user_id %', p_user_id;
  end if;

  insert into public.currency_transactions (
    user_id,
    currency_type,
    amount,
    reason,
    balance_after
  )
  values (
    p_user_id,
    'OUT',
    p_amount,
    p_reason,
    v_new_balance
  );

  return query
  select v_new_balance, v_new_earned_total;
end;
$$;

grant execute on function public.award_out_currency(uuid, int, text) to authenticated;
