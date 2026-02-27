-- =====================================================
-- SUPABASE DATABASE SETUP — Run this in your Supabase
-- SQL Editor (supabase.com → your project → SQL Editor)
-- =====================================================

-- 1. User profiles (auto-created on signup)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 2. Live game state (one row per user)
create table if not exists game_state (
  user_id uuid references auth.users on delete cascade primary key,
  state jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table game_state enable row level security;
create policy "Users manage own game_state" on game_state for all using (auth.uid() = user_id);

-- 3. Pro data (roster, stats, standings, history — keyed by data_key)
create table if not exists pro_data (
  user_id  uuid references auth.users on delete cascade,
  data_key text not null,
  data_value jsonb not null default '{}',
  updated_at timestamptz default now(),
  primary key (user_id, data_key)
);
alter table pro_data enable row level security;
create policy "Users manage own pro_data" on pro_data for all using (auth.uid() = user_id);

-- 4. Upcoming / scheduled games
create table if not exists upcoming_games (
  user_id uuid references auth.users on delete cascade primary key,
  games jsonb not null default '[]',
  updated_at timestamptz default now()
);
alter table upcoming_games enable row level security;
create policy "Users manage own upcoming_games" on upcoming_games for all using (auth.uid() = user_id);

-- =====================================================
-- DONE. All tables created with Row Level Security.
-- Each user only sees their own data.
-- =====================================================
