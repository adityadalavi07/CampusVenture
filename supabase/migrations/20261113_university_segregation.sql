-- ============================================================
-- CampusVenture: University-Student Segregation Schema
-- Creates universities table + auto-links students by email domain
-- ============================================================

-- 1. Universities registry table
CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  email_domain text NOT NULL,          -- e.g. "sguk.ac.in", "ritindia.edu"
  domain_base text NOT NULL,           -- e.g. "sguk", "ritindia" (for cross-suffix matching)
  city text DEFAULT '',
  state text DEFAULT '',
  type text DEFAULT 'Private',         -- Central, State, Private, Deemed, Autonomous
  ugc_approved boolean DEFAULT true,
  registered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(email_domain)
);

-- 2. Add university_id to profiles (links students to their university)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'university_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN university_id uuid REFERENCES universities(id);
  END IF;
END $$;

-- 3. Add domain_base column to profiles for fast lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_domain'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_domain text DEFAULT '';
  END IF;
END $$;

-- 4. Seed SGU and RIT India
INSERT INTO universities (name, short_name, email_domain, domain_base, city, state, type, ugc_approved)
VALUES
  ('Sanjay Ghodawat University (SGU), Kolhapur', 'SGU', 'sguk.ac.in', 'sguk', 'Kolhapur', 'Maharashtra', 'Private', true),
  ('Rajarambapu Institute of Technology (RIT), Rajaramnagar', 'RIT', 'ritindia.edu', 'ritindia', 'Islampur', 'Maharashtra', 'Autonomous', true)
ON CONFLICT (email_domain) DO NOTHING;

-- 5. Auto-link existing profiles to universities by email domain
UPDATE profiles p
SET
  email_domain = split_part(p.email, '@', 2),
  university_id = u.id
FROM universities u
WHERE split_part(p.email, '@', 2) = u.email_domain
  AND p.university_id IS NULL;

-- Also match by domain_base (e.g. ritindia.ac.in matches ritindia.edu)
UPDATE profiles p
SET university_id = u.id
FROM universities u
WHERE p.university_id IS NULL
  AND p.email LIKE '%@%'
  AND (
    -- Strip .ac.in / .edu.in / .edu / .res.in suffix and compare base
    regexp_replace(split_part(p.email, '@', 2), '\.(ac\.in|edu\.in|edu|res\.in|ernet\.in|ac\.uk)$', '') = u.domain_base
  );

-- 6. Function: auto-assign university on new profile insert/update
CREATE OR REPLACE FUNCTION fn_auto_assign_university()
RETURNS TRIGGER AS $$
DECLARE
  v_domain text;
  v_base text;
  v_uni_id uuid;
BEGIN
  v_domain := split_part(NEW.email, '@', 2);
  NEW.email_domain := v_domain;

  -- Try exact domain match first
  SELECT id INTO v_uni_id FROM universities WHERE email_domain = v_domain LIMIT 1;

  -- If no exact match, try base domain match
  IF v_uni_id IS NULL THEN
    v_base := regexp_replace(v_domain, '\.(ac\.in|edu\.in|edu|res\.in|ernet\.in|ac\.uk)$', '');
    SELECT id INTO v_uni_id FROM universities WHERE domain_base = v_base LIMIT 1;
  END IF;

  IF v_uni_id IS NOT NULL THEN
    NEW.university_id := v_uni_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS trg_auto_assign_university ON profiles;
CREATE TRIGGER trg_auto_assign_university
  BEFORE INSERT OR UPDATE OF email ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_assign_university();

-- 7. Handy view: students grouped by university
CREATE OR REPLACE VIEW university_students AS
SELECT
  u.id AS university_id,
  u.name AS university_name,
  u.short_name,
  u.email_domain AS university_domain,
  p.id AS student_id,
  p.name AS student_name,
  p.email AS student_email,
  p.org,
  p.role,
  p.created_at AS registered_at
FROM profiles p
JOIN universities u ON p.university_id = u.id
WHERE p.role = 'student'
ORDER BY u.name, p.name;

-- 8. RLS policies for universities table
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read universities"
  ON universities FOR SELECT
  USING (true);

CREATE POLICY "University admins can insert their own"
  ON universities FOR INSERT
  WITH CHECK (auth.uid() = registered_by);

-- 9. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_universities_domain_base ON universities(domain_base);
