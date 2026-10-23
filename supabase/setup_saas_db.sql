-- ==============================================================================
-- CampusVenture Real-Time Production Database Setup & Migration
-- Paste and Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- 1. Create or Upgrade the public.startups table
create table if not exists public.startups (
  id text primary key,
  founder_id text,
  founder text,
  founder_email text,
  name text not null,
  tagline text not null default '',
  sector text not null default 'AI',
  stage text not null default 'Idea',
  location text not null default 'India',
  university text not null default '',
  team_size integer default 1,
  funding_required numeric(12, 2) default 0.00,
  revenue boolean default false,
  monthly_users integer default 0,
  readiness integer default 50,
  verified boolean default false,
  traction text default '',
  business_model text default '',
  problem text default '',
  solution text default '',
  video_url text default '',
  deck_name text default '',
  github_url text default '',
  github_stars integer default 0,
  status text not null default 'pending',
  review_note text default '',
  views integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure all columns exist if the table was previously created with fewer columns
alter table public.startups add column if not exists founder text;
alter table public.startups add column if not exists founder_email text;
alter table public.startups add column if not exists problem text default '';
alter table public.startups add column if not exists solution text default '';
alter table public.startups add column if not exists video_url text default '';
alter table public.startups add column if not exists deck_name text default '';
alter table public.startups add column if not exists github_url text default '';
alter table public.startups add column if not exists github_stars integer default 0;
alter table public.startups add column if not exists status text default 'pending';
alter table public.startups add column if not exists review_note text default '';
alter table public.startups add column if not exists views integer default 0;

-- 2. Disable Row-Level Security on startups to allow real-time cross-role sync
alter table public.startups disable row level security;

-- 3. Also disable RLS on profiles to enable cross-device profile saving
alter table public.profiles disable row level security;

-- 4. Enable Supabase Realtime publication for startups
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'startups'
  ) then
    alter publication supabase_realtime add table public.startups;
  end if;
end $$;
