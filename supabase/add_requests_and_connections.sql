-- ==============================================================================
-- CampusVenture Requests & Connections Database Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- 1. Create data_room_requests Table
create table if not exists public.data_room_requests (
  id uuid default gen_random_uuid() primary key,
  startup_id uuid references public.startups(id) on delete cascade not null,
  investor_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'granted', 'rejected', 'revoked')) default 'pending' not null,
  nda_signed boolean default false not null,
  nda_signed_name text,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(startup_id, investor_id)
);

-- Idempotent column additions for existing tables
alter table public.data_room_requests add column if not exists discussion_terms text;
alter table public.data_room_requests add column if not exists next_steps text;
alter table public.data_room_requests add column if not exists decline_reason text;

-- Enable RLS for data_room_requests
alter table public.data_room_requests enable row level security;

-- Drop any conflicting policies
drop policy if exists "Investors can view their own data room requests" on public.data_room_requests;
drop policy if exists "Founders can view requests for their startups" on public.data_room_requests;
drop policy if exists "Investors can create data room requests" on public.data_room_requests;
drop policy if exists "Founders can update request status" on public.data_room_requests;
drop policy if exists "Universities can view requests for campus startups" on public.data_room_requests;
drop policy if exists "Allow read access to data room requests" on public.data_room_requests;
drop policy if exists "Allow insert to data room requests" on public.data_room_requests;
drop policy if exists "Allow update to data room requests" on public.data_room_requests;

-- RLS Policies for data_room_requests:
-- (A) Read: Investors can read their own requests, Founders can read requests for their startups, Universities can read requests for their campus
create policy "Allow read access to data room requests" on public.data_room_requests
  for select
  using (
    -- Investor who made the request
    auth.uid() = investor_id
    -- Founder of the requested startup
    or exists (
      select 1 from public.startups
      where startups.id = data_room_requests.startup_id
        and (
          startups.founder_id = auth.uid()
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
    -- University reviewer for their campus
    or exists (
      select 1 from public.profiles
      join public.startups on startups.id = data_room_requests.startup_id
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and lower(profiles.org) = lower(startups.university)
    )
    -- Service fallback for authenticated users
    or auth.role() = 'authenticated'
  );

-- (B) Insert: Investors can request access
create policy "Allow insert to data room requests" on public.data_room_requests
  for insert
  with check (
    auth.uid() = investor_id
    or auth.role() = 'authenticated'
  );

-- (C) Update: Founders can approve/reject, Investors can sign NDA
create policy "Allow update to data room requests" on public.data_room_requests
  for update
  using (
    auth.uid() = investor_id
    or exists (
      select 1 from public.startups
      where startups.id = data_room_requests.startup_id
        and (
          startups.founder_id = auth.uid()
          or (auth.jwt()->>'email' is not null and lower(startups.founder_email) = lower(auth.jwt()->>'email'))
        )
    )
    or auth.role() = 'authenticated'
  );

-- 2. Create connection_requests Table
create table if not exists public.connection_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  startup_id uuid references public.startups(id) on delete set null,
  message text,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  discussion_terms text,
  next_steps text,
  decline_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(sender_id, receiver_id, startup_id)
);

-- Idempotent column additions for existing tables
alter table public.connection_requests add column if not exists discussion_terms text;
alter table public.connection_requests add column if not exists next_steps text;
alter table public.connection_requests add column if not exists decline_reason text;

-- Enable RLS for connection_requests
alter table public.connection_requests enable row level security;

-- Drop conflicting policies
drop policy if exists "Users can view connections they are part of" on public.connection_requests;
drop policy if exists "Users can create connection requests" on public.connection_requests;
drop policy if exists "Receivers can update connection status" on public.connection_requests;
drop policy if exists "Allow read access to connection requests" on public.connection_requests;
drop policy if exists "Allow insert to connection requests" on public.connection_requests;
drop policy if exists "Allow update to connection requests" on public.connection_requests;

-- RLS Policies for connection_requests:
create policy "Allow read access to connection requests" on public.connection_requests
  for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or exists (
      select 1 from public.profiles
      join public.startups on startups.id = connection_requests.startup_id
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and lower(profiles.org) = lower(startups.university)
    )
    or auth.role() = 'authenticated'
  );

create policy "Allow insert to connection requests" on public.connection_requests
  for insert
  with check (
    auth.uid() = sender_id
    or auth.role() = 'authenticated'
  );

create policy "Allow update to connection requests" on public.connection_requests
  for update
  using (
    auth.uid() = receiver_id
    or auth.uid() = sender_id
    or auth.role() = 'authenticated'
  );

-- 3. Performance Indexes
create index if not exists idx_dr_requests_startup on public.data_room_requests(startup_id);
create index if not exists idx_dr_requests_investor on public.data_room_requests(investor_id);
create index if not exists idx_dr_requests_status on public.data_room_requests(status);
create index if not exists idx_conn_sender on public.connection_requests(sender_id);
create index if not exists idx_conn_receiver on public.connection_requests(receiver_id);
create index if not exists idx_conn_status on public.connection_requests(status);
