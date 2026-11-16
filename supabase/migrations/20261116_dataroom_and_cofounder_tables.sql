-- ============================================================================
-- CampusVenture: Data Room + Co-Founder + Audit Tables
-- Run this ONCE in Supabase SQL Editor
-- ============================================================================

-- 1. DATA ROOM DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS data_room_docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id  TEXT NOT NULL,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Other',
  size        TEXT,
  mime_type   TEXT DEFAULT 'application/pdf',
  storage_path TEXT,
  file_url    TEXT,
  confidential BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_data_room_docs_startup ON data_room_docs(startup_id);
CREATE INDEX IF NOT EXISTS idx_data_room_docs_owner   ON data_room_docs(owner_id);

-- RLS
ALTER TABLE data_room_docs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert docs' AND tablename = 'data_room_docs') THEN
    CREATE POLICY "Authenticated users can insert docs" ON data_room_docs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read docs' AND tablename = 'data_room_docs') THEN
    CREATE POLICY "Authenticated users can read docs" ON data_room_docs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can update their docs' AND tablename = 'data_room_docs') THEN
    CREATE POLICY "Owners can update their docs" ON data_room_docs FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can delete their docs' AND tablename = 'data_room_docs') THEN
    CREATE POLICY "Owners can delete their docs" ON data_room_docs FOR DELETE TO authenticated USING (owner_id = auth.uid());
  END IF;
END $$;

-- Enable realtime for data_room_docs
ALTER PUBLICATION supabase_realtime ADD TABLE data_room_docs;


-- 2. CO-FOUNDER INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS cofounder_invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id       TEXT NOT NULL,
  startup_name     TEXT,
  founder_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  founder_name     TEXT,
  founder_email    TEXT,
  cofounder_name   TEXT NOT NULL,
  cofounder_email  TEXT NOT NULL,
  cofounder_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role             TEXT DEFAULT 'Co-Founder',
  equity           TEXT,
  notes            TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cofounder_inv_startup ON cofounder_invitations(startup_id);
CREATE INDEX IF NOT EXISTS idx_cofounder_inv_email   ON cofounder_invitations(cofounder_email);

ALTER TABLE cofounder_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can insert invitations' AND tablename = 'cofounder_invitations') THEN
    CREATE POLICY "Auth users can insert invitations" ON cofounder_invitations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can read invitations' AND tablename = 'cofounder_invitations') THEN
    CREATE POLICY "Auth users can read invitations" ON cofounder_invitations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Founders can update their invitations' AND tablename = 'cofounder_invitations') THEN
    CREATE POLICY "Founders can update their invitations" ON cofounder_invitations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- 3. DATA ROOM AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS data_room_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  TEXT,
  startup_id  TEXT NOT NULL,
  doc_id      TEXT,
  doc_name    TEXT,
  user_id     UUID,
  user_email  TEXT,
  action      TEXT NOT NULL CHECK (action IN ('requested','granted','rejected','revoked','nda_signed','viewed','downloaded')),
  details     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_startup ON data_room_audit_logs(startup_id);

ALTER TABLE data_room_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can insert audit logs' AND tablename = 'data_room_audit_logs') THEN
    CREATE POLICY "Auth users can insert audit logs" ON data_room_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can read audit logs' AND tablename = 'data_room_audit_logs') THEN
    CREATE POLICY "Auth users can read audit logs" ON data_room_audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;


-- 4. CREATE STORAGE BUCKET FOR DOCUMENT FILES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dataroom-documents',
  'dataroom-documents',
  false,
  52428800, -- 50MB max file size
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg','image/gif','image/webp','text/plain','text/csv','application/zip','application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can upload to dataroom' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Auth users can upload to dataroom" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dataroom-documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can read dataroom files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Auth users can read dataroom files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dataroom-documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can update dataroom files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Auth users can update dataroom files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dataroom-documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can delete dataroom files' AND tablename = 'objects' AND schemaname = 'storage') THEN
    CREATE POLICY "Auth users can delete dataroom files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dataroom-documents');
  END IF;
END $$;


-- ============================================================================
-- DONE! All tables, indexes, RLS policies, storage bucket created.
-- ============================================================================
