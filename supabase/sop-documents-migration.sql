-- ============================================================
-- SOP Documents: create table + backfill from existing bucket
-- Run this in: https://supabase.com/dashboard/project/eqgikumohnvgdkwlzkus/sql/new
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS sop_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  description   TEXT,
  source_type   TEXT NOT NULL DEFAULT 'supabase' CHECK (source_type IN ('supabase', 'external')),
  file_path     TEXT,
  external_link TEXT,
  file_name     TEXT,
  file_size     INT,
  file_type     TEXT DEFAULT 'application/pdf',
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_source CHECK (
    (source_type = 'supabase' AND file_path IS NOT NULL) OR
    (source_type = 'external' AND external_link IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_sop_category ON sop_documents (category);
CREATE INDEX IF NOT EXISTS idx_sop_uploaded_by ON sop_documents (uploaded_by);

-- 2. Enable RLS
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to re-run)
DROP POLICY IF EXISTS "sop_select_operations" ON sop_documents;
DROP POLICY IF EXISTS "sop_insert_manager" ON sop_documents;
DROP POLICY IF EXISTS "sop_delete_manager" ON sop_documents;

CREATE POLICY "sop_select_operations" ON sop_documents FOR SELECT TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('operations', 'manager', 'security', 'greeter'));

CREATE POLICY "sop_insert_manager" ON sop_documents FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

CREATE POLICY "sop_delete_manager" ON sop_documents FOR DELETE TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'manager');

-- 3. Backfill records from existing bucket files
-- Derives a clean title from the filename, assigns 'Operations' as default category.
-- Uses the first manager account found as the uploader.
INSERT INTO sop_documents (title, category, source_type, file_path, file_name, file_size, file_type, uploaded_by)
SELECT
  -- Clean up filename to make a readable title
  regexp_replace(
    regexp_replace(
      regexp_replace(so.name, '\.(pdf|PDF)$', ''),  -- strip .pdf
      '[_-]', ' ', 'g'                               -- underscores/dashes → spaces
    ),
    '\s+', ' ', 'g'                                  -- collapse multiple spaces
  ) AS title,

  -- Auto-assign category based on filename keywords (adjust as needed)
  CASE
    WHEN lower(so.name) LIKE '%electric%' OR lower(so.name) LIKE '%electr%' THEN 'Electrical'
    WHEN lower(so.name) LIKE '%instrument%' OR lower(so.name) LIKE '%control%' OR lower(so.name) LIKE '%dmx%' OR lower(so.name) LIKE '%network%' OR lower(so.name) LIKE '%troubleshoot%' THEN 'Technical'
    WHEN lower(so.name) LIKE '%grout%' OR lower(so.name) LIKE '%clean%' OR lower(so.name) LIKE '%dust%' OR lower(so.name) LIKE '%sanitiz%' OR lower(so.name) LIKE '%staircase%' OR lower(so.name) LIKE '%polish%' THEN 'Mechanical'
    ELSE 'Operations'
  END AS category,

  'supabase'       AS source_type,
  so.name          AS file_path,
  so.name          AS file_name,
  (so.metadata->>'size')::INT AS file_size,
  'application/pdf' AS file_type,

  -- Use the manager profile as uploader
  (SELECT id FROM profiles WHERE role = 'manager' ORDER BY created_at LIMIT 1) AS uploaded_by

FROM storage.objects so
WHERE so.bucket_id = 'operations-sops'
  -- Skip files that already have a record
  AND NOT EXISTS (
    SELECT 1 FROM sop_documents sd WHERE sd.file_path = so.name
  )
  -- Only process pdf files
  AND (lower(so.name) LIKE '%.pdf' OR so.metadata->>'mimetype' = 'application/pdf');
