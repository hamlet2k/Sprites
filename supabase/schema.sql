-- Run this once in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Project → SQL → New query → paste → Run
-- Safe to re-run: uses IF NOT EXISTS / drop policy if exists.

-- ---------------------------------------------------------------------------
-- Live squad rooms (share by room code)
-- ---------------------------------------------------------------------------
create table if not exists public.squad_rooms (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

-- Optional display name / alias for the squad
alter table public.squad_rooms
  add column if not exists name text;

alter table public.squad_rooms
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.squad_rooms enable row level security;

drop policy if exists "squad_rooms_select" on public.squad_rooms;
drop policy if exists "squad_rooms_insert" on public.squad_rooms;
drop policy if exists "squad_rooms_update" on public.squad_rooms;

-- Open access by room code only (obscure codes are the "password").
-- Fine for a private Fortnite squad; not for sensitive data.
create policy "squad_rooms_select" on public.squad_rooms
  for select to anon, authenticated using (true);

create policy "squad_rooms_insert" on public.squad_rooms
  for insert to anon, authenticated with check (true);

create policy "squad_rooms_update" on public.squad_rooms
  for update to anon, authenticated using (true) with check (true);

-- Realtime so all devices update live
do $$
begin
  alter publication supabase_realtime add table public.squad_rooms;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Auth profiles (optional login)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Player'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Portable personal collection (follows the user across squads)
-- ---------------------------------------------------------------------------
create table if not exists public.user_collections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sprites jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_collections enable row level security;

drop policy if exists "user_collections_select_own" on public.user_collections;
drop policy if exists "user_collections_insert_own" on public.user_collections;
drop policy if exists "user_collections_update_own" on public.user_collections;

create policy "user_collections_select_own" on public.user_collections
  for select to authenticated using (auth.uid() = user_id);

create policy "user_collections_insert_own" on public.user_collections
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user_collections_update_own" on public.user_collections
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Recently joined squads (per logged-in user)
-- ---------------------------------------------------------------------------
create table if not exists public.user_squads (
  user_id uuid not null references auth.users (id) on delete cascade,
  room_code text not null,
  room_name text,
  last_joined_at timestamptz not null default now(),
  primary key (user_id, room_code)
);

create index if not exists user_squads_user_joined_idx
  on public.user_squads (user_id, last_joined_at desc);

alter table public.user_squads enable row level security;

drop policy if exists "user_squads_select_own" on public.user_squads;
drop policy if exists "user_squads_insert_own" on public.user_squads;
drop policy if exists "user_squads_update_own" on public.user_squads;
drop policy if exists "user_squads_delete_own" on public.user_squads;

create policy "user_squads_select_own" on public.user_squads
  for select to authenticated using (auth.uid() = user_id);

create policy "user_squads_insert_own" on public.user_squads
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user_squads_update_own" on public.user_squads
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_squads_delete_own" on public.user_squads
  for delete to authenticated using (auth.uid() = user_id);
