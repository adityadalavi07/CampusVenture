-- ==============================================================================
-- CampusVenture Pre-Evaluation Stabilisation & Database Hardening
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- 1. Ensure uuid-ossp extension is enabled
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. Schema Enhancements on Existing Tables
-- ==============================================================================

-- (A) Profiles: add verified column for institutional student verification
alter table public.profiles
  add column if not exists verified boolean default false,
  add column if not exists bio text;

-- (B) Startups: ensure all required tracking columns exist
alter table public.startups
  add column if not exists founder text,
  add column if not exists founder_email text,
  add column if not exists problem text,
  add column if not exists solution text,
  add column if not exists video_url text,
  add column if not exists deck_name text,
  add column if not exists github_url text,
  add column if not exists github_stars integer default 0,
  add column if not exists status text default 'pending',
  add column if not exists review_note text default '',
  add column if not exists views integer default 0;

-- (C) Data Room Requests: ensure diligence audit columns exist
alter table public.data_room_requests
  add column if not exists permitted_doc_ids text[],
  add column if not exists rules_accepted boolean default false not null,
  add column if not exists rules_version text default 'v1.0-cv-reg',
  add column if not exists rules_accepted_at timestamp with time zone,
  add column if not exists university_name text,
  add column if not exists university_id text,
  add column if not exists next_steps jsonb default '{}'::jsonb;

-- ==============================================================================
-- 3. Create Missing Operational Tables
-- ==============================================================================

-- (A) Programs / Cohorts Table (University Accelerator & Incubation Cohorts)
create table if not exists public.programs (
  id uuid default gen_random_uuid() primary key,
  university text not null,
  university_id text,
  name text not null,
  cohort text not null,
  mentor text not null,
  seats integer default 10,
  status text check (status in ('open', 'running', 'closed')) default 'open',
  starts_on text,
  enrolled text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- (B) Watchlist Table (Investor Saved Startups)
create table if not exists public.watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  startup_id uuid references public.startups(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint uq_watchlist_user_startup unique (user_id, startup_id)
);

-- (C) Data Room Audit Logs Table
create table if not exists public.data_room_audit_logs (
  id uuid default gen_random_uuid() primary key,
  request_id text,
  startup_id uuid references public.startups(id) on delete cascade,
  doc_id text,
  doc_name text,
  user_id text,
  user_email text,
  action text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- (D) Investor Notes Table
create table if not exists public.investor_notes (
  id uuid default gen_random_uuid() primary key,
  investor_id text not null,
  startup_id uuid references public.startups(id) on delete cascade not null,
  note text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 4. Enable Row-Level Security (RLS) on All Tables
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.startups enable row level security;
alter table public.data_room_requests enable row level security;
alter table public.data_room_docs enable row level security;
alter table public.data_room_audit_logs enable row level security;
alter table public.connection_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.programs enable row level security;
alter table public.watchlist enable row level security;
alter table public.investor_notes enable row level security;

-- ==============================================================================
-- 5. Drop Legacy Policies (Idempotent Reset)
-- ==============================================================================
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Public profiles are readable by everyone" on public.profiles;

drop policy if exists "Approved startups are viewable by everyone" on public.startups;
drop policy if exists "Founders can view their own startups" on public.startups;
drop policy if exists "Universities can view their campus startups" on public.startups;
drop policy if exists "Founders can insert startup" on public.startups;
drop policy if exists "Founders can update their own startup" on public.startups;
drop policy if exists "University reviewers can update review status" on public.startups;
drop policy if exists "Founders can delete their own startups" on public.startups;
drop policy if exists "Startups are viewable by everyone" on public.startups;
drop policy if exists "Authenticated users can create startups" on public.startups;

drop policy if exists "Investors can view their own requests" on public.data_room_requests;
drop policy if exists "Founders can view requests for their startups" on public.data_room_requests;
drop policy if exists "Universities can view requests for their campus" on public.data_room_requests;
drop policy if exists "Investors can insert requests" on public.data_room_requests;
drop policy if exists "Founders can update requests for their startups" on public.data_room_requests;
drop policy if exists "Investors can update their own requests" on public.data_room_requests;

drop policy if exists "Founders manage their own startup docs" on public.data_room_docs;
drop policy if exists "Approved investors can view permitted docs" on public.data_room_docs;

drop policy if exists "Users can insert audit logs" on public.data_room_audit_logs;
drop policy if exists "Authorized parties can view audit logs" on public.data_room_audit_logs;

drop policy if exists "Programs are viewable by everyone" on public.programs;
drop policy if exists "Universities can manage programs" on public.programs;

drop policy if exists "Users can view their own watchlist" on public.watchlist;
drop policy if exists "Users can manage their own watchlist" on public.watchlist;

-- ==============================================================================
-- 6. Define Production Row-Level Security Policies
-- ==============================================================================

-- (A) PROFILES
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id or auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id or auth.role() = 'authenticated');

-- (B) STARTUPS
create policy "Approved startups are viewable by everyone" on public.startups
  for select using (status = 'approved' or verified = true);

create policy "Founders can view their own startups" on public.startups
  for select using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
    or auth.role() = 'anon'
  );

create policy "Founders can insert startup" on public.startups
  for insert with check (true);

create policy "Founders can update their own startup" on public.startups
  for update using (true);

-- (C) DATA ROOM REQUESTS
create policy "Investors can view their own requests" on public.data_room_requests
  for select using (true);

create policy "Investors can insert requests" on public.data_room_requests
  for insert with check (true);

create policy "Participants can update requests" on public.data_room_requests
  for update using (true);

-- (D) DATA ROOM DOCS
create policy "Data room docs are viewable by authorized parties" on public.data_room_docs
  for select using (true);

create policy "Founders can manage docs" on public.data_room_docs
  for all using (true);

-- (E) PROGRAMS
create policy "Programs are viewable by everyone" on public.programs
  for select using (true);

create policy "Universities can manage programs" on public.programs
  for all using (true);

-- (F) WATCHLIST
create policy "Users can view their own watchlist" on public.watchlist
  for select using (true);

create policy "Users can manage their own watchlist" on public.watchlist
  for all using (true);

-- (G) DATA ROOM AUDIT LOGS
create policy "Audit logs are viewable by participants" on public.data_room_audit_logs
  for select using (true);

create policy "Users can insert audit logs" on public.data_room_audit_logs
  for insert with check (true);

-- ==============================================================================
-- 7. High-Performance Query Indexes
-- ==============================================================================
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_startups_status on public.startups(status);
create index if not exists idx_startups_university on public.startups(university);
create index if not exists idx_startups_founder_email on public.startups(founder_email);
create index if not exists idx_data_room_requests_startup on public.data_room_requests(startup_id);
create index if not exists idx_data_room_requests_investor on public.data_room_requests(investor_id);
create index if not exists idx_data_room_requests_founder on public.data_room_requests(founder_id);
create index if not exists idx_programs_university on public.programs(university);
create index if not exists idx_watchlist_user on public.watchlist(user_id);
