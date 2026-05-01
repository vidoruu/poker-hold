CREATE EXTENSION IF NOT EXISTS PGCRYPTO;

CREATE TABLE IF NOT EXISTS PUBLIC.POKER_TABLES (
  ROOM_CODE TEXT PRIMARY KEY,
  STATE JSONB NOT NULL,
  UPDATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE PUBLIC.POKER_TABLES ENABLE ROW LEVEL SECURITY;

DO $$

begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'poker_tables'
      and policyname = 'public_read_poker_tables'
  ) then
    create policy public_read_poker_tables
      on public.poker_tables
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Blackjack tables
create table if not exists public.blackjack_tables (
  room_code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.blackjack_tables enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'blackjack_tables'
      and policyname = 'public_read_blackjack_tables'
  ) then
    create policy public_read_blackjack_tables
      on public.blackjack_tables
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Player chip balances - universal system for poker and blackjack
create table if not exists public.player_chips (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  game_type text not null,
  room_code text not null,
  chip_balance integer not null default 1000,
  buy_in_amount integer not null default 1000,
  total_buy_ins integer not null default 1,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, room_code, game_type)
);

alter table public.player_chips enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_chips'
      and policyname = 'public_read_player_chips'
  ) then
    create policy public_read_player_chips
      on public.player_chips
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Lobbies view for faster querying
create table if not exists public.game_lobbies (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  game_type text not null,
  host_name text not null,
  player_count integer not null default 0,
  hand_number integer not null default 1,
  phase text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_lobbies enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'game_lobbies'
      and policyname = 'public_read_game_lobbies'
  ) then
    create policy public_read_game_lobbies
      on public.game_lobbies
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- User Wallets - persistent chip storage
create table if not exists public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  session_id text,
  display_name text not null,
  wallet_balance integer not null default 10000,
  total_deposited integer not null default 10000,
  total_withdrawn integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_wallets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_wallets'
      and policyname = 'public_read_user_wallets'
  ) then
    create policy public_read_user_wallets
      on public.user_wallets
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Wallet Transactions - audit log
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text,
  transaction_type text not null,
  game_type text not null,
  room_code text not null,
  amount integer not null,
  balance_before integer not null,
  balance_after integer not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'wallet_transactions'
      and policyname = 'public_read_wallet_transactions'
  ) then
    create policy public_read_wallet_transactions
      on public.wallet_transactions
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Writes are handled by Next.js API routes via service role key.