-- ==============================================================================
-- CampusVenture Production Database Hardening & Row-Level Security (RLS)
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- 1. Enable Row-Level Security (RLS) on sensitive tables
alter table public.startups enable row level security;
alter table public.profiles enable row level security;

-- 2. Drop any legacy open or permissive policies
drop policy if exists "Public access startups" on public.startups;
drop policy if exists "Enable read access for all users" on public.startups;
drop policy if exists "Enable insert for authenticated users only" on public.startups;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Approved startups are viewable by everyone" on public.startups;
drop policy if exists "Founders can view their own startups" on public.startups;
drop policy if exists "Universities can view their campus startups" on public.startups;
drop policy if exists "Founders can insert startup" on public.startups;
drop policy if exists "Founders can update their own startup" on public.startups;
drop policy if exists "University reviewers can update review status" on public.startups;
drop policy if exists "Founders can delete their own startups" on public.startups;

-- ==============================================================================
-- 3. POLICIES FOR public.profiles
-- ==============================================================================

-- Public & Authenticated users can view profile cards (name, org, role)
create policy "Profiles are viewable by everyone" on public.profiles
  for select
  using (true);

-- Authenticated users can only insert their own profile matching auth.uid()
create policy "Users can insert their own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update their own profile" on public.profiles
  for update
  using (auth.uid() = id);

-- ==============================================================================
-- 4. POLICIES FOR public.startups
-- ==============================================================================

-- (A) SELECT / READ PERMISSIONS:
-- 1. Anyone (including accredited investors) can view approved, verified startups
create policy "Approved startups are viewable by everyone" on public.startups
  for select
  using (status = 'approved' or verified = true);

-- 2. Founders can view their own startups (including drafts & pending review)
create policy "Founders can view their own startups" on public.startups
  for select
  using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- 3. University reviewers can view all submissions belonging to their institution
create policy "Universities can view their campus startups" on public.startups
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and (
          lower(profiles.org) = lower(startups.university)
          or split_part(profiles.email, '@', 2) = split_part(startups.founder_email, '@', 2)
        )
    )
  );

-- (B) INSERT / CREATE PERMISSIONS:
-- Founders can insert their startup idea
create policy "Founders can insert startup" on public.startups
  for insert
  with check (
    auth.uid() = founder_id
    or founder_id is null
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- (C) UPDATE / EDIT PERMISSIONS:
-- 1. Founders can update their own startup details
create policy "Founders can update their own startup" on public.startups
  for update
  using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- 2. University incubation cells can review, approve, and record review notes
create policy "University reviewers can update review status" on public.startups
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'university'
        and (
          lower(profiles.org) = lower(startups.university)
          or split_part(profiles.email, '@', 2) = split_part(startups.founder_email, '@', 2)
        )
    )
  );

-- (D) DELETE PERMISSIONS:
-- Only founders can delete their own startups
create policy "Founders can delete their own startups" on public.startups
  for delete
  using (
    auth.uid() = founder_id
    or (auth.jwt()->>'email' is not null and lower(founder_email) = lower(auth.jwt()->>'email'))
  );

-- 5. Add Performance Indexes
create index if not exists idx_startups_status on public.startups(status);
create index if not exists idx_startups_university on public.startups(university);
create index if not exists idx_startups_founder_email on public.startups(founder_email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);
