-- ────────────────────────────────────────────────────────────
-- Daily Brief + Payroll tables
-- ────────────────────────────────────────────────────────────
-- These four tables are required by the app (lib/actions/payroll.ts,
-- lib/actions/daily-brief.ts) but were previously ONLY defined inside the
-- legacy schema.sql (which conflicts with schema-canonical.sql and must NOT
-- be run wholesale). This standalone migration closes that fresh-deploy gap.
--
-- Run AFTER schema-canonical.sql. Idempotent / safe to re-run.
-- RLS uses public.get_user_role() (defined in schema-canonical.sql) because
-- role is stored in the profiles table, NOT in the JWT.

-- ── Staff Pay Rates (hourly wages by role/person) ──────────────
CREATE TABLE IF NOT EXISTS staff_pay_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID NOT NULL,
  hourly_rate     NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  role            TEXT NOT NULL DEFAULT 'operations',
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- staff_id may reference either staff_directory.id OR a profiles.id (auth user)
-- depending on how the rate was created, so no hard FK is enforced here.
CREATE INDEX IF NOT EXISTS idx_pay_rates_staff ON staff_pay_rates (staff_id);
CREATE INDEX IF NOT EXISTS idx_pay_rates_effective ON staff_pay_rates (effective_date DESC);

-- ── Payroll Reports (archived biweekly payroll summaries) ──────
CREATE TABLE IF NOT EXISTS payroll_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content          JSONB NOT NULL DEFAULT '{}',
  pdf_url          TEXT,
  website_url      TEXT,
  prepared_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_by_name TEXT,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_reports_period ON payroll_reports (period_start DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_reports_slug ON payroll_reports (slug);

-- ── Daily Manager Brief ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_brief_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date      DATE NOT NULL,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  opening_message TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  visibility      TEXT NOT NULL DEFAULT 'staff',
  prepared_by     UUID REFERENCES profiles(id),
  published_at    TIMESTAMPTZ,
  pdf_url         TEXT,
  website_url     TEXT,
  archive_enabled BOOLEAN DEFAULT true,
  content         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brief_date)
);

CREATE TABLE IF NOT EXISTS daily_brief_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id        UUID REFERENCES daily_brief_issues(id) ON DELETE CASCADE,
  section_key     TEXT NOT NULL,
  section_title   TEXT NOT NULL,
  section_order   INTEGER NOT NULL,
  content         JSONB DEFAULT '{}',
  markdown_body   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(issue_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_daily_brief_issues_date ON daily_brief_issues (brief_date);
CREATE INDEX IF NOT EXISTS idx_daily_brief_issues_status ON daily_brief_issues (status);
CREATE INDEX IF NOT EXISTS idx_daily_brief_sections_issue_id ON daily_brief_sections (issue_id);

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE staff_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_brief_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_brief_sections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Staff Pay Rates (manager only — sensitive wage data)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pay_rates_select_manager' AND tablename = 'staff_pay_rates') THEN
    CREATE POLICY pay_rates_select_manager ON staff_pay_rates FOR SELECT TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pay_rates_insert_manager' AND tablename = 'staff_pay_rates') THEN
    CREATE POLICY pay_rates_insert_manager ON staff_pay_rates FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pay_rates_update_manager' AND tablename = 'staff_pay_rates') THEN
    CREATE POLICY pay_rates_update_manager ON staff_pay_rates FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pay_rates_delete_manager' AND tablename = 'staff_pay_rates') THEN
    CREATE POLICY pay_rates_delete_manager ON staff_pay_rates FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;

  -- Payroll Reports (manager only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_reports_select_manager' AND tablename = 'payroll_reports') THEN
    CREATE POLICY payroll_reports_select_manager ON payroll_reports FOR SELECT TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_reports_insert_manager' AND tablename = 'payroll_reports') THEN
    CREATE POLICY payroll_reports_insert_manager ON payroll_reports FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_reports_update_manager' AND tablename = 'payroll_reports') THEN
    CREATE POLICY payroll_reports_update_manager ON payroll_reports FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payroll_reports_delete_manager' AND tablename = 'payroll_reports') THEN
    CREATE POLICY payroll_reports_delete_manager ON payroll_reports FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;

  -- Daily Brief Issues (all staff read published; managers write)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_select_auth' AND tablename = 'daily_brief_issues') THEN
    CREATE POLICY daily_brief_select_auth ON daily_brief_issues FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_insert_manager' AND tablename = 'daily_brief_issues') THEN
    CREATE POLICY daily_brief_insert_manager ON daily_brief_issues FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_update_manager' AND tablename = 'daily_brief_issues') THEN
    CREATE POLICY daily_brief_update_manager ON daily_brief_issues FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_delete_manager' AND tablename = 'daily_brief_issues') THEN
    CREATE POLICY daily_brief_delete_manager ON daily_brief_issues FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;

  -- Daily Brief Sections
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_sections_select_auth' AND tablename = 'daily_brief_sections') THEN
    CREATE POLICY daily_brief_sections_select_auth ON daily_brief_sections FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_sections_insert_manager' AND tablename = 'daily_brief_sections') THEN
    CREATE POLICY daily_brief_sections_insert_manager ON daily_brief_sections FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_sections_update_manager' AND tablename = 'daily_brief_sections') THEN
    CREATE POLICY daily_brief_sections_update_manager ON daily_brief_sections FOR UPDATE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_brief_sections_delete_manager' AND tablename = 'daily_brief_sections') THEN
    CREATE POLICY daily_brief_sections_delete_manager ON daily_brief_sections FOR DELETE TO authenticated USING (public.get_user_role() = 'manager');
  END IF;
END $$;

-- Auto-update updated_at (function defined in schema-canonical.sql)
DROP TRIGGER IF EXISTS set_pay_rates_updated_at ON staff_pay_rates;
CREATE TRIGGER set_pay_rates_updated_at BEFORE UPDATE ON staff_pay_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_payroll_reports_updated_at ON payroll_reports;
CREATE TRIGGER set_payroll_reports_updated_at BEFORE UPDATE ON payroll_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_daily_brief_issues_updated_at ON daily_brief_issues;
CREATE TRIGGER set_daily_brief_issues_updated_at BEFORE UPDATE ON daily_brief_issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_daily_brief_sections_updated_at ON daily_brief_sections;
CREATE TRIGGER set_daily_brief_sections_updated_at BEFORE UPDATE ON daily_brief_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Daily brief + payroll migration applied successfully.' as status;
