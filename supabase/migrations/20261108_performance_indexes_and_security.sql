-- ==============================================================================
-- CampusVenture Production Hardening, High-Scale Indexes & IDOR Prevention
-- SAFE / IDEMPOTENT: Can be re-run any number of times without errors.
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- ============================================================
-- 1. High-Performance B-Tree Indexes (Prevents N+1 table scans)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_startups_founder_id    ON public.startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startups_status        ON public.startups(status);
CREATE INDEX IF NOT EXISTS idx_startups_verified      ON public.startups(verified);
CREATE INDEX IF NOT EXISTS idx_startups_university    ON public.startups(university);

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower   ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_venture_applications_venture_id   ON public.venture_applications(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_applications_applicant_id ON public.venture_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id    ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at   ON public.messages(created_at DESC);

-- ============================================================
-- 2. Enable Row-Level Security (RLS) on all core tables
-- ============================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. PROFILES — Safe idempotent policy creation
--    Drops ALL known name variants first, then creates fresh.
-- ============================================================

-- Drop every possible name variant for the SELECT policy on profiles
DROP POLICY IF EXISTS "Public profiles are readable by everyone"   ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all"                        ON public.profiles;

-- Drop every possible name variant for the UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile"         ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile"               ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"                        ON public.profiles;

-- Drop every possible name variant for the INSERT policy on profiles
DROP POLICY IF EXISTS "Users can insert their own profile"         ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile"               ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"                        ON public.profiles;

-- (Re)create profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 4. STARTUPS — Safe idempotent policy creation
-- ============================================================

DROP POLICY IF EXISTS "Approved startups are viewable by everyone" ON public.startups;
DROP POLICY IF EXISTS "startups_select_approved"                    ON public.startups;
DROP POLICY IF EXISTS "Anyone can view approved startups"           ON public.startups;

DROP POLICY IF EXISTS "Founders can update their own startups"     ON public.startups;
DROP POLICY IF EXISTS "founders_update_own_startups"               ON public.startups;

DROP POLICY IF EXISTS "Founders can delete their own startups"     ON public.startups;
DROP POLICY IF EXISTS "founders_delete_own_startups"               ON public.startups;

DROP POLICY IF EXISTS "Founders can insert startups"               ON public.startups;
DROP POLICY IF EXISTS "founders_insert_startups"                   ON public.startups;

-- (Re)create startups policies
CREATE POLICY "Approved startups are viewable by everyone" ON public.startups
  FOR SELECT USING (status = 'approved' OR verified = true OR founder_id = auth.uid());

CREATE POLICY "Founders can update their own startups" ON public.startups
  FOR UPDATE USING (auth.uid() = founder_id);

CREATE POLICY "Founders can delete their own startups" ON public.startups
  FOR DELETE USING (auth.uid() = founder_id);

-- ============================================================
-- 5. MESSAGES — Safe idempotent policy creation
-- ============================================================

DROP POLICY IF EXISTS "Users can view messages sent to or by them" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own"                         ON public.messages;
DROP POLICY IF EXISTS "Users can see their own messages"            ON public.messages;

DROP POLICY IF EXISTS "Users can insert messages as sender"        ON public.messages;
DROP POLICY IF EXISTS "messages_insert_as_sender"                  ON public.messages;
DROP POLICY IF EXISTS "Users can send messages"                    ON public.messages;

-- (Re)create messages policies
CREATE POLICY "Users can view messages sent to or by them" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can insert messages as sender" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- 6. VENTURE APPLICATIONS — Safe idempotent policy creation
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own applications"      ON public.venture_applications;
DROP POLICY IF EXISTS "venture_applications_select_own"            ON public.venture_applications;
DROP POLICY IF EXISTS "Applicants can view their applications"     ON public.venture_applications;

DROP POLICY IF EXISTS "Users can apply to ventures"               ON public.venture_applications;
DROP POLICY IF EXISTS "venture_applications_insert"               ON public.venture_applications;
DROP POLICY IF EXISTS "Users can submit applications"             ON public.venture_applications;

-- Venture owners can also view applications for their venture
DROP POLICY IF EXISTS "Founders can view applications to their venture" ON public.venture_applications;
DROP POLICY IF EXISTS "founders_view_applications"                      ON public.venture_applications;

-- (Re)create venture_applications policies
CREATE POLICY "Users can view their own applications" ON public.venture_applications
  FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Founders can view applications to their venture" ON public.venture_applications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT founder_id FROM public.startups WHERE id = venture_id
    )
  );

CREATE POLICY "Users can apply to ventures" ON public.venture_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- ==============================================================================
-- Migration complete. All policies are idempotent — safe to re-run at any time.
-- ==============================================================================
