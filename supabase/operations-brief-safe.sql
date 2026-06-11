-- ============================================================
-- Operations Brief Migration (Safe Version)
-- Creates operations brief tables without dependencies
-- ============================================================

-- Storage buckets (safe to re-run)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('operations-briefs', 'operations-briefs', false),
  ('operations-brief-public', 'operations-brief-public', true)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- OPERATIONS BRIEF ISSUES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operations_brief_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  issue_month     DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  prepared_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  archive_enabled BOOLEAN NOT NULL DEFAULT false,
  website_url     TEXT,
  pdf_url         TEXT,
  pdf_storage_path TEXT,
  summary_data    JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if table was created previously without them
ALTER TABLE public.operations_brief_issues 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS summary_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ────────────────────────────────────────────────────────────
-- OPERATIONS BRIEF SECTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operations_brief_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id        UUID NOT NULL REFERENCES public.operations_brief_issues(id) ON DELETE CASCADE,
  section_key     TEXT NOT NULL,
  section_order   INT NOT NULL DEFAULT 0,
  title           TEXT NOT NULL,
  content         TEXT DEFAULT '',
  content_json    JSONB DEFAULT '[]',
  is_custom       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, section_key)
);

-- ────────────────────────────────────────────────────────────
-- OPERATIONS BRIEF ASSETS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operations_brief_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id        UUID NOT NULL REFERENCES public.operations_brief_issues(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL CHECK (asset_type IN ('image', 'pdf', 'chart', 'attachment')),
  file_name       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  public_url      TEXT,
  uploaded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_operations_brief_issues_month ON public.operations_brief_issues (issue_month DESC);
CREATE INDEX IF NOT EXISTS idx_operations_brief_issues_status ON public.operations_brief_issues (status);
CREATE INDEX IF NOT EXISTS idx_operations_brief_issues_slug ON public.operations_brief_issues (slug);
CREATE INDEX IF NOT EXISTS idx_operations_brief_sections_issue ON public.operations_brief_sections (issue_id);
CREATE INDEX IF NOT EXISTS idx_operations_brief_assets_issue ON public.operations_brief_assets (issue_id);

-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.operations_brief_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_brief_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_brief_assets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS operations_brief_issues_select ON public.operations_brief_issues;
DROP POLICY IF EXISTS operations_brief_issues_insert_manager ON public.operations_brief_issues;
DROP POLICY IF EXISTS operations_brief_issues_update_manager ON public.operations_brief_issues;
DROP POLICY IF EXISTS operations_brief_sections_select ON public.operations_brief_sections;
DROP POLICY IF EXISTS operations_brief_sections_insert_manager ON public.operations_brief_sections;
DROP POLICY IF EXISTS operations_brief_sections_update_manager ON public.operations_brief_sections;
DROP POLICY IF EXISTS operations_brief_assets_select ON public.operations_brief_assets;
DROP POLICY IF EXISTS operations_brief_assets_insert_manager ON public.operations_brief_assets;
DROP POLICY IF EXISTS operations_brief_assets_delete_manager ON public.operations_brief_assets;

-- Create policies
CREATE POLICY operations_brief_issues_select ON public.operations_brief_issues
  FOR SELECT TO authenticated USING (status = 'published' OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

CREATE POLICY operations_brief_issues_insert_manager ON public.operations_brief_issues
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

CREATE POLICY operations_brief_issues_update_manager ON public.operations_brief_issues
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

CREATE POLICY operations_brief_sections_select ON public.operations_brief_sections
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.operations_brief_issues WHERE id = issue_id AND (
      status = 'published' OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
      )
    )
  ));

CREATE POLICY operations_brief_sections_insert_manager ON public.operations_brief_sections
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

CREATE POLICY operations_brief_sections_update_manager ON public.operations_brief_sections
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

CREATE POLICY operations_brief_assets_select ON public.operations_brief_assets
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.operations_brief_issues WHERE id = issue_id AND (
      status = 'published' OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
      )
    )
  ));

CREATE POLICY operations_brief_assets_insert_manager ON public.operations_brief_assets
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

CREATE POLICY operations_brief_assets_delete_manager ON public.operations_brief_assets
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'
  ));

-- ────────────────────────────────────────────────────────────
-- ARCHIVE VIEW
-- ────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.v_operations_brief_archive;

CREATE VIEW public.v_operations_brief_archive AS
SELECT
  obi.id,
  obi.title,
  obi.slug,
  obi.issue_month,
  EXTRACT(YEAR FROM obi.issue_month) AS issue_year,
  obi.status,
  obi.prepared_by,
  p.full_name AS prepared_by_name,
  obi.approved_by,
  obi.approved_at,
  obi.published_at,
  obi.archived_at,
  obi.archive_enabled,
  obi.website_url,
  obi.pdf_url,
  obi.created_at,
  obi.updated_at
FROM public.operations_brief_issues obi
LEFT JOIN public.profiles p ON p.id = obi.prepared_by
WHERE obi.archive_enabled = true OR obi.status = 'archived'
ORDER BY obi.issue_month DESC;

-- ────────────────────────────────────────────────────────────
-- FUNCTIONS (simplified - no complex dependencies)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_operations_brief_draft(
  p_month DATE DEFAULT CURRENT_DATE
) RETURNS UUID AS $$
DECLARE
  v_issue_id UUID;
  v_year INT := EXTRACT(YEAR FROM p_month);
  v_month_int INT := EXTRACT(MONTH FROM p_month);
  v_slug TEXT := 'ops-brief-' || v_year || '-' || LPAD(v_month_int::TEXT, 2, '0');
BEGIN
  -- Check if issue already exists
  SELECT id INTO v_issue_id
  FROM public.operations_brief_issues
  WHERE slug = v_slug;
  
  IF v_issue_id IS NOT NULL THEN
    RETURN v_issue_id;
  END IF;
  
  -- Create new issue
  INSERT INTO public.operations_brief_issues (
    title, slug, issue_month, status, summary_data
  ) VALUES (
    'Operations Brief - ' || TO_CHAR(p_month, 'Month YYYY'),
    v_slug,
    DATE_TRUNC('month', p_month),
    'draft',
    '{}'::JSONB
  )
  RETURNING id INTO v_issue_id;
  
  -- Create default sections
  INSERT INTO public.operations_brief_sections (issue_id, section_key, section_order, title, content)
  VALUES
    (v_issue_id, 'executive_summary', 1, 'Executive Summary', 'Monthly operations overview and key highlights.'),
    (v_issue_id, 'incident_summary', 2, 'Incident Summary', 'Safety and security incidents this month.'),
    (v_issue_id, 'facility_updates', 3, 'Facility Updates', 'Maintenance, improvements, and infrastructure updates.'),
    (v_issue_id, 'team_recognition', 4, 'Team Recognition', 'Badge awards and recognition highlights.'),
    (v_issue_id, 'visitor_analytics', 5, 'Visitor Analytics', 'Attendance and visitor volume trends.'),
    (v_issue_id, 'upcoming_events', 6, 'Upcoming Events', 'Major events and staffing requirements.'),
    (v_issue_id, 'action_items', 7, 'Action Items', 'Outstanding tasks and follow-up items.'),
    (v_issue_id, 'next_month_preview', 8, 'Next Month Preview', 'Upcoming priorities and initiatives.');
  
  RETURN v_issue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.publish_operations_brief(
  p_issue_id UUID,
  p_prepared_by UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.operations_brief_issues
  SET 
    status = 'published',
    published_at = COALESCE(published_at, NOW()),
    prepared_by = COALESCE(prepared_by, p_prepared_by),
    updated_at = NOW()
  WHERE id = p_issue_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Operations Brief schema applied successfully.' as status;
