-- ==============================================================================
-- CampusVenture Production Hardening, High-Scale Indexes & IDOR Prevention
-- SAFE / IDEMPOTENT: Can be re-run any number of times without errors.
-- Only targets tables that exist: profiles, startups
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- ============================================================
-- 1. High-Performance B-Tree Indexes (Prevents N+1 table scans)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_startups_founder_id  ON public.startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startups_status      ON public.startups(status);
CREATE INDEX IF NOT EXISTS idx_startups_verified    ON public.startups(verified);
CREATE INDEX IF NOT EXISTS idx_startups_university  ON public.startups(university);

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);

-- ============================================================
-- 2. Enable Row-Level Security (RLS) on all core tables
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. PROFILES — Drop ALL known name variants, then recreate
-- ============================================================
DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all"                      ON public.profiles;

DROP POLICY IF EXISTS "Users can update their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"                      ON public.profiles;

DROP POLICY IF EXISTS "Users can insert their own profile"       ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"                      ON public.profiles;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 4. STARTUPS — Drop ALL known name variants, then recreate
-- ============================================================
DROP POLICY IF EXISTS "Approved startups are viewable by everyone" ON public.startups;
DROP POLICY IF EXISTS "startups_select_approved"                   ON public.startups;
DROP POLICY IF EXISTS "Anyone can view approved startups"          ON public.startups;

DROP POLICY IF EXISTS "Founders can update their own startups"     ON public.startups;
DROP POLICY IF EXISTS "founders_update_own_startups"               ON public.startups;

DROP POLICY IF EXISTS "Founders can delete their own startups"     ON public.startups;
DROP POLICY IF EXISTS "founders_delete_own_startups"               ON public.startups;

DROP POLICY IF EXISTS "Founders can insert startups"               ON public.startups;
DROP POLICY IF EXISTS "founders_insert_startups"                   ON public.startups;

CREATE POLICY "Approved startups are viewable by everyone" ON public.startups
  FOR SELECT USING (status = 'approved' OR verified = true OR founder_id = auth.uid());

CREATE POLICY "Founders can update their own startups" ON public.startups
  FOR UPDATE USING (auth.uid() = founder_id);

CREATE POLICY "Founders can delete their own startups" ON public.startups
  FOR DELETE USING (auth.uid() = founder_id);

-- ==============================================================================
-- Migration complete. All policies are idempotent — safe to re-run at any time.
-- ==============================================================================
