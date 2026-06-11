-- ============================================================
-- Recognition / Gamification — MISSING TABLES ONLY
--
-- This is a STRIPPED migration that ONLY creates the tables and
-- views that don't exist yet in your DB. It does NOT touch
-- existing tables (recognition_badges, gamification_point_rules,
-- gamification_point_events, employee_badge_awards,
-- leaderboard_periods, leaderboard_snapshots).
--
-- Tables created here:
--   badge_level_definitions, badge_nominations,
--   point_deductions, point_redemptions
--
-- Views created here:
--   v_employee_badge_progress, v_pending_nominations,
--   v_active_badge_catalog
--
-- (v_current_month_leaderboard and v_employee_of_month_candidates
-- already exist in your DB.)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- BADGE LEVEL DEFINITIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_level_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id        UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
  level_name      TEXT NOT NULL,
  level_number    INT NOT NULL,
  times_required  INT NOT NULL DEFAULT 1,
  point_value     INT NOT NULL DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (badge_id, level_number)
);

-- ────────────────────────────────────────────────────────────
-- BADGE NOMINATIONS (manager nominations for badges)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badge_nominations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id      UUID NOT NULL REFERENCES public.recognition_badges(id) ON DELETE CASCADE,
  nominated_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  reviewed_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- POINT DEDUCTIONS (penalty events)
-- ────────────────────────────────────────────────────────────
-- Note: references gamification_point_rules.event_type (your existing column)
CREATE TABLE IF NOT EXISTS public.point_deductions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points        INT NOT NULL,
  reason        TEXT NOT NULL,
  event_type    TEXT NOT NULL REFERENCES public.gamification_point_rules(event_type),
  source_id     TEXT,
  source_table  TEXT,
  noted_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deduction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- POINT REDEMPTIONS (employees spending points on rewards)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.point_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_spent  INT NOT NULL,
  reward_type   TEXT NOT NULL CHECK (reward_type IN (
    'gift_card','preferred_shift','lunch_reward','certificate','public_recognition',
    'paid_meal_break','small_bonus','uniform_upgrade','parking_stipend','pto_hour',
    'recognition_wall','team_reward'
  )),
  reward_detail TEXT,
  approved_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_badge_levels_badge ON public.badge_level_definitions (badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_employee ON public.badge_nominations (employee_id);
CREATE INDEX IF NOT EXISTS idx_badge_nominations_status ON public.badge_nominations (status);
CREATE INDEX IF NOT EXISTS idx_point_deductions_employee ON public.point_deductions (employee_id);
CREATE INDEX IF NOT EXISTS idx_point_deductions_date ON public.point_deductions (deduction_date DESC);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_employee ON public.point_redemptions (employee_id);

-- ────────────────────────────────────────────────────────────
-- VIEW: v_employee_badge_progress
-- Note: uses your DB's actual columns (no point_value, badge_tier, max_level, sort_order)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_employee_badge_progress AS
SELECT
  eba.employee_id,
  p.full_name AS display_name,
  rb.id AS badge_id,
  rb.name AS badge_name,
  rb.category,
  rb.icon_url,
  COUNT(eba.id) AS times_earned,
  MAX(eba.awarded_at) AS last_earned_at
FROM public.employee_badge_awards eba
JOIN public.recognition_badges rb ON rb.id = eba.badge_id
LEFT JOIN public.profiles p ON p.id = eba.employee_id
GROUP BY eba.employee_id, p.full_name, rb.id, rb.name, rb.category, rb.icon_url;

-- ────────────────────────────────────────────────────────────
-- VIEW: v_active_badge_catalog
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_active_badge_catalog AS
SELECT
  rb.id,
  rb.name,
  rb.slug,
  rb.category,
  rb.description,
  rb.earning_criteria,
  rb.icon_url,
  rb.active,
  COUNT(DISTINCT eba.id) AS total_awards
FROM public.recognition_badges rb
LEFT JOIN public.employee_badge_awards eba ON eba.badge_id = rb.id
WHERE rb.active = true
GROUP BY rb.id, rb.name, rb.slug, rb.category, rb.description, rb.earning_criteria, rb.icon_url, rb.active
ORDER BY rb.name;

-- ────────────────────────────────────────────────────────────
-- VIEW: v_pending_nominations
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_pending_nominations AS
SELECT
  bn.id,
  bn.employee_id,
  emp.full_name AS employee_name,
  bn.badge_id,
  rb.name AS badge_name,
  rb.icon_url,
  bn.nominated_by,
  nom.full_name AS nominator_name,
  bn.reason,
  bn.status,
  bn.created_at
FROM public.badge_nominations bn
JOIN public.recognition_badges rb ON rb.id = bn.badge_id
LEFT JOIN public.profiles emp ON emp.id = bn.employee_id
LEFT JOIN public.profiles nom ON nom.id = bn.nominated_by
WHERE bn.status = 'pending'
ORDER BY bn.created_at DESC;

-- ────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.badge_level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_redemptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'badge_levels_select' AND tablename = 'badge_level_definitions') THEN
    CREATE POLICY badge_levels_select ON public.badge_level_definitions FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominations_select_self_or_manager' AND tablename = 'badge_nominations') THEN
    CREATE POLICY nominations_select_self_or_manager ON public.badge_nominations FOR SELECT TO authenticated
      USING (
        employee_id = auth.uid()
        OR nominated_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominations_insert_manager' AND tablename = 'badge_nominations') THEN
    CREATE POLICY nominations_insert_manager ON public.badge_nominations FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'nominations_update_manager' AND tablename = 'badge_nominations') THEN
    CREATE POLICY nominations_update_manager ON public.badge_nominations FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deductions_select_self_or_manager' AND tablename = 'point_deductions') THEN
    CREATE POLICY deductions_select_self_or_manager ON public.point_deductions FOR SELECT TO authenticated
      USING (
        employee_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deductions_insert_manager' AND tablename = 'point_deductions') THEN
    CREATE POLICY deductions_insert_manager ON public.point_deductions FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'redemptions_select_self_or_manager' AND tablename = 'point_redemptions') THEN
    CREATE POLICY redemptions_select_self_or_manager ON public.point_redemptions FOR SELECT TO authenticated
      USING (
        employee_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'redemptions_insert_self' AND tablename = 'point_redemptions') THEN
    CREATE POLICY redemptions_insert_self ON public.point_redemptions FOR INSERT TO authenticated
      WITH CHECK (employee_id = auth.uid());
  END IF;
END $$;

SELECT 'Recognition missing tables/views applied successfully.' as status;
