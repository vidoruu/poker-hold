create extension if not exists pgcrypto;

create table if not exists public.poker_tables (
  room_code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.poker_tables enable row level security;

do $$
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

-- Writes are handled by Next.js API routes via service role key.
