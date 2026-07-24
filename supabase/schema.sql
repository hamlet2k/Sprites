-- Run this once in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Project → SQL → New query → paste → Run

create table if not exists public.squad_rooms (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.squad_rooms enable row level security;

-- Open access by room code only (obscure 6-char codes are the "password").
-- Fine for a private Fortnite squad; not for sensitive data.
drop policy if exists "squad_rooms_select" on public.squad_rooms;
drop policy if exists "squad_rooms_insert" on public.squad_rooms;
drop policy if exists "squad_rooms_update" on public.squad_rooms;

create policy "squad_rooms_select" on public.squad_rooms
  for select to anon, authenticated using (true);

create policy "squad_rooms_insert" on public.squad_rooms
  for insert to anon, authenticated with check (true);

create policy "squad_rooms_update" on public.squad_rooms
  for update to anon, authenticated using (true) with check (true);

-- Realtime so all devices update live
alter publication supabase_realtime add table public.squad_rooms;
