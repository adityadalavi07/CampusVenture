-- ==============================================================================
-- CampusVenture Production Hardening, High-Scale Indexes & IDOR Prevention
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lirfkzpehmxtynjsjzib/sql/new
-- ==============================================================================

-- 1. High-Performance B-Tree Indexes for Fast Joins & Query Scaling (Prevents N+1 table scans)
CREATE INDEX IF NOT EXISTS idx_startups_founder_id ON public.startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startups_status ON public.startups(status);
CREATE INDEX IF NOT EXISTS idx_startups_verified ON public.startups(verified);
CREATE INDEX IF NOT EXISTS idx_startups_university ON public.startups(university);

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_venture_applications_venture_id ON public.venture_applications(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_applications_applicant_id ON public.venture_applications(applicant_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 2. Enforce Row-Level Security (RLS) across all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. IDOR Prevention Policies (Profiles)
DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. IDOR Prevention Policies (Startups)
DROP POLICY IF EXISTS "Approved startups are viewable by everyone" ON public.startups;
CREATE POLICY "Approved startups are viewable by everyone" ON public.startups
  FOR SELECT USING (status = 'approved' OR verified = true OR founder_id = auth.uid());

DROP POLICY IF EXISTS "Founders can update their own startups" ON public.startups;
CREATE POLICY "Founders can update their own startups" ON public.startups
  FOR UPDATE USING (auth.uid() = founder_id);

DROP POLICY IF EXISTS "Founders can delete their own startups" ON public.startups;
CREATE POLICY "Founders can delete their own startups" ON public.startups
  FOR DELETE USING (auth.uid() = founder_id);

-- 5. IDOR Prevention Policies (Messages)
DROP POLICY IF EXISTS "Users can view messages sent to or by them" ON public.messages;
CREATE POLICY "Users can view messages sent to or by them" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can insert messages as sender" ON public.messages;
CREATE POLICY "Users can insert messages as sender" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
